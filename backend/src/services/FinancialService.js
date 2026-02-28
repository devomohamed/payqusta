const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } = require('date-fns');
const mongoose = require('mongoose');

/**
 * Financial Service — Core Accounting Logic
 * Handles General Ledger, P&L, and Cash Flow
 */
class FinancialService {
    /**
     * Get General Ledger entries
     * Aggregates Sales, Purchases, Expenses, and Payments
     */
    async getGeneralLedger(tenantId, { startDate, endDate, branchId }) {
        const start = startDate ? new Date(startDate) : startOfMonth(new Date());
        const end = endDate ? new Date(endDate) : endOfMonth(new Date());

        const filter = { tenant: tenantId, createdAt: { $gte: start, $lte: end } };
        if (branchId) filter.branch = branchId;

        // 1. Fetch Sales (Invoices)
        const invoices = await Invoice.find({ ...filter, status: { $ne: 'cancelled' } })
            .select('invoiceNumber totalAmount paidAmount remainingAmount createdAt customer')
            .populate('customer', 'name');

        // 2. Fetch Expenses
        const expenses = await Expense.find({ ...filter, isActive: true })
            .select('title amount category date branch')
            .populate('branch', 'name');

        // 3. Fetch Purchases (PurchaseOrders)
        const purchases = await PurchaseOrder.find({ ...filter, status: { $ne: 'cancelled' } })
            .select('orderNumber totalAmount paidAmount status supplier createdAt')
            .populate('supplier', 'name');

        // Transform into unified ledger structure
        const ledger = [];

        invoices.forEach(inv => {
            ledger.push({
                type: 'sale',
                id: inv._id,
                reference: inv.invoiceNumber,
                title: `فاتورة مبيعات - ${inv.customer?.name || 'عميل نقدي'}`,
                debit: inv.totalAmount, // What we are owed
                credit: 0,
                date: inv.createdAt,
                status: inv.remainingAmount === 0 ? 'paid' : 'pending'
            });

            // If there's a payment recorded at creation, or via invoice payments
            // Note: In this system, payments are often sub-documents in the invoice
            if (inv.paidAmount > 0) {
                ledger.push({
                    type: 'payment_in',
                    id: inv._id,
                    reference: inv.invoiceNumber,
                    title: `دفعة من عميل - ${inv.customer?.name || 'عميل نقدي'}`,
                    debit: 0,
                    credit: inv.paidAmount, // Cash coming in
                    date: inv.createdAt, // Ideally we'd use payment date, but using creation for ledger simplified view
                    status: 'completed'
                });
            }
        });

        expenses.forEach(exp => {
            ledger.push({
                type: 'expense',
                id: exp._id,
                reference: exp.category,
                title: `مصروف: ${exp.title}`,
                debit: 0,
                credit: exp.amount, // Cash going out
                date: exp.date || exp.createdAt,
                status: 'completed'
            });
        });

        purchases.forEach(pur => {
            ledger.push({
                type: 'purchase',
                id: pur._id,
                reference: pur.orderNumber,
                title: `فاتورة مشتريات - ${pur.supplier?.name || 'مورد'}`,
                debit: 0,
                credit: pur.totalAmount, // Debt incurred
                date: pur.createdAt,
                status: pur.status
            });

            if (pur.paidAmount > 0) {
                ledger.push({
                    type: 'payment_out',
                    id: pur._id,
                    reference: pur.orderNumber,
                    title: `سداد للمورد - ${pur.supplier?.name || 'مورد'}`,
                    debit: pur.paidAmount, // Reducing debt
                    credit: 0,
                    date: pur.createdAt,
                    status: 'completed'
                });
            }
        });

        // Sort by date desc
        return ledger.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get detailed P&L (Profit & Loss)
     */
    async getProfitAndLoss(tenantId, { startDate, endDate, branchId }) {
        const start = startDate ? new Date(startDate) : startOfMonth(new Date());
        const end = endDate ? new Date(endDate) : endOfMonth(new Date());

        const filter = { tenant: tenantId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } };
        if (branchId) filter.branch = branchId;

        // 1. Gross Revenue & COGS
        const invoices = await Invoice.find(filter).select('totalAmount profit items').lean();

        let grossRevenue = 0;
        let totalCogs = 0;

        invoices.forEach(inv => {
            grossRevenue += inv.totalAmount || 0;
            // If invoice has pre-calculated profit, COGS = Revenue - Profit
            if (inv.profit !== undefined) {
                totalCogs += (inv.totalAmount - inv.profit);
            } else {
                // Fallback or manual calc if needed
            }
        });

        // 2. Operating Expenses
        const expenseFilter = { tenant: tenantId, date: { $gte: start, $lte: end }, isActive: true };
        if (branchId) expenseFilter.branch = branchId;

        const expenses = await Expense.find(expenseFilter).select('amount category');
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const expensesByCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});

        const grossProfit = grossRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;

        return {
            period: { start, end },
            revenue: {
                gross: grossRevenue,
                discounts: 0, // Need to track discounts separately in future
                net: grossRevenue
            },
            cogs: {
                total: totalCogs,
                margin: grossRevenue > 0 ? ((grossProfit / grossRevenue) * 100).toFixed(2) : 0
            },
            operatingExpenses: {
                total: totalExpenses,
                breakdown: expensesByCategory
            },
            netProfit,
            netMargin: grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(2) : 0
        };
    }

    /**
     * Forecast Cash Flow for next 30 days
     */
    async getCashFlowForecast(tenantId) {
        // This uses due dates from Invoices (installments) and recurring expenses
        const today = new Date();
        const next30 = new Date();
        next30.setDate(today.getDate() + 30);

        // 1. Expected Inflows (Installments)
        const invoices = await Invoice.find({
            tenant: tenantId,
            status: { $in: ['pending', 'partially_paid'] },
            'installments.dueDate': { $gte: today, $lte: next30 },
            'installments.status': 'pending'
        });

        let expectedInflow = 0;
        invoices.forEach(inv => {
            inv.installments.forEach(inst => {
                if (inst.status === 'pending' && inst.dueDate >= today && inst.dueDate <= next30) {
                    expectedInflow += inst.amount;
                }
            });
        });

        // 2. Expected Outflows (Recurring Expenses)
        const recurringExpenses = await Expense.find({
            tenant: tenantId,
            isRecurring: true,
            nextDueDate: { $gte: today, $lte: next30 },
            isActive: true
        });

        const expectedOutflow = recurringExpenses.reduce((sum, e) => sum + e.amount, 0);

        return {
            next30Days: {
                inflow: expectedInflow,
                outflow: expectedOutflow,
                net: expectedInflow - expectedOutflow
            }
        };
    }
}

module.exports = new FinancialService();
