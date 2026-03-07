/**
 * Business Intelligence Controller — Advanced Analytics & AI Features
 * Health Score, Cash Flow Forecast, Command Center, What-If Simulator, Achievements
 */

const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const SupplierPurchaseInvoice = require('../models/SupplierPurchaseInvoice');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/ApiResponse');
const AnalyticsService = require('../services/AnalyticsService');
const catchAsync = require('../utils/catchAsync');

class BusinessIntelligenceController {
  /**
   * GET /api/v1/bi/stock-forecast
   * AI-driven stock prediction
   */
  getStockForecast = catchAsync(async (req, res, next) => {
    const forecast = await AnalyticsService.getStockForecast(req.tenantId);
    ApiResponse.success(res, forecast);
  });

  /**
   * GET /api/v1/bi/health-score
   * Calculate overall business health score (0-100)
   */
  getHealthScore = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Get all required data
    const [invoices, customers, products, expenses] = await Promise.all([
      Invoice.find({ tenant: tenantId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
      Customer.find({ tenant: tenantId, isActive: true }).lean(),
      Product.find({ tenant: tenantId, isActive: true }).lean(),
      Expense.find({ tenant: tenantId, isActive: true, date: { $gte: thirtyDaysAgo } }).lean(),
    ]);

    // === 1. Collection Health (25 points) ===
    const totalSales = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const collectionRate = totalSales > 0 ? (totalCollected / totalSales) * 100 : 100;
    const collectionScore = Math.round((collectionRate / 100) * 25);

    // === 2. Customer Health (25 points) ===
    const activeCustomers = customers.filter(c => c.lastPurchaseDate && new Date(c.lastPurchaseDate) >= thirtyDaysAgo).length;
    const totalCustomers = customers.length || 1;
    const highRiskCustomers = customers.filter(c => c.creditEngine?.riskLevel === 'high' || c.creditEngine?.riskLevel === 'blocked').length;
    const customerHealthRatio = ((activeCustomers / totalCustomers) * 0.6) + ((1 - highRiskCustomers / totalCustomers) * 0.4);
    const customerScore = Math.round(customerHealthRatio * 25);

    // === 3. Inventory Health (25 points) ===
    const inStock = products.filter(p => p.stockStatus === 'in_stock').length;
    const lowStock = products.filter(p => p.stockStatus === 'low_stock').length;
    const outOfStock = products.filter(p => p.stockStatus === 'out_of_stock').length;
    const totalProducts = products.length || 1;
    const inventoryRatio = (inStock / totalProducts) * 0.7 + (lowStock / totalProducts) * 0.2;
    const inventoryScore = Math.round(inventoryRatio * 25);

    // === 4. Profitability (25 points) ===
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = invoices.reduce((s, i) => {
      return s + i.items.reduce((is, item) => is + (item.unitPrice - (item.cost || item.unitPrice * 0.7)) * item.quantity, 0);
    }, 0);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const profitScore = Math.min(25, Math.max(0, Math.round((profitMargin / 30) * 25))); // 30% margin = full score

    // === Total Score ===
    const totalScore = collectionScore + customerScore + inventoryScore + profitScore;

    // === Health Level ===
    let healthLevel = 'critical';
    let healthEmoji = '🔴';
    if (totalScore >= 80) { healthLevel = 'excellent'; healthEmoji = '🟢'; }
    else if (totalScore >= 60) { healthLevel = 'good'; healthEmoji = '🟡'; }
    else if (totalScore >= 40) { healthLevel = 'fair'; healthEmoji = '🟠'; }

    // === Recommendations ===
    const recommendations = [];
    if (collectionRate < 70) recommendations.push({ type: 'collection', text: 'نسبة التحصيل منخفضة — ركز على متابعة الأقساط المتأخرة', priority: 'high' });
    if (outOfStock > 0) recommendations.push({ type: 'inventory', text: `${outOfStock} منتج نفذ من المخزون — اطلب من الموردين`, priority: 'high' });
    if (highRiskCustomers > 3) recommendations.push({ type: 'risk', text: `${highRiskCustomers} عميل عالي المخاطر — راجع سياسة الائتمان`, priority: 'medium' });
    if (profitMargin < 15) recommendations.push({ type: 'profit', text: 'هامش الربح منخفض — راجع التسعير أو قلل المصروفات', priority: 'medium' });

    ApiResponse.success(res, {
      score: totalScore,
      level: healthLevel,
      emoji: healthEmoji,
      breakdown: {
        collection: { score: collectionScore, max: 25, rate: Math.round(collectionRate) },
        customers: { score: customerScore, max: 25, active: activeCustomers, total: totalCustomers, highRisk: highRiskCustomers },
        inventory: { score: inventoryScore, max: 25, inStock, lowStock, outOfStock },
        profit: { score: profitScore, max: 25, margin: Math.round(profitMargin), netProfit: Math.round(netProfit) },
      },
      recommendations,
      period: { from: thirtyDaysAgo, to: now },
    });
  });

  /**
   * GET /api/v1/bi/cash-flow-forecast
   * Predict cash flow for the next 30 days
   */
  getCashFlowForecast = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const today = new Date();
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    // Expected Income: upcoming installments
    const invoicesWithInstallments = await Invoice.find({
      tenant: tenantId,
      status: { $in: ['pending', 'partially_paid'] },
      'installments.dueDate': { $gte: today, $lte: next30Days },
    }).lean();

    const expectedIncome = [];
    invoicesWithInstallments.forEach(inv => {
      (inv.installments || []).forEach(inst => {
        if (inst.status !== 'paid' && new Date(inst.dueDate) >= today && new Date(inst.dueDate) <= next30Days) {
          expectedIncome.push({
            date: inst.dueDate,
            amount: inst.amount - (inst.paidAmount || 0),
            type: 'installment',
            description: `قسط ${inst.installmentNumber} - فاتورة ${inv.invoiceNumber}`,
            invoiceId: inv._id,
          });
        }
      });
    });

    // Expected Expenses: recurring expenses + supplier purchase invoice installments
    const recurringExpenses = await Expense.find({
      tenant: tenantId,
      isActive: true,
      isRecurring: true,
      nextDueDate: { $lte: next30Days },
    }).lean();

    const supplierInvoicesForForecast = await SupplierPurchaseInvoice.find({
      tenant: tenantId,
      status: { $in: ['open', 'partial_paid'] },
      installmentsSchedule: {
        $elemMatch: {
          status: { $in: ['pending', 'partially_paid', 'overdue'] },
          dueDate: { $gte: today, $lte: next30Days },
        },
      },
    })
      .populate('supplier', 'name')
      .select('invoiceNumber supplier installmentsSchedule')
      .lean();

    const expectedExpenses = [];
    recurringExpenses.forEach(exp => {
      expectedExpenses.push({
        date: exp.nextDueDate || today,
        amount: exp.amount,
        type: 'recurring',
        category: exp.category,
        description: exp.title,
      });
    });

    supplierInvoicesForForecast.forEach((invoice) => {
      (invoice.installmentsSchedule || []).forEach((installment) => {
        const dueDate = new Date(installment.dueDate);
        if (
          ['pending', 'partially_paid', 'overdue'].includes(String(installment.status || ''))
          && dueDate >= today
          && dueDate <= next30Days
        ) {
          const remainingAmount = Number(installment.amount || 0) - Number(installment.paidAmount || 0);
          if (remainingAmount <= 0) return;

          expectedExpenses.push({
            date: dueDate,
            amount: remainingAmount,
            type: 'supplier',
            description: `قسط مورد ${invoice.supplier?.name || '—'} - ${invoice.invoiceNumber || ''}`.trim(),
            supplierId: invoice.supplier?._id || invoice.supplier,
            supplierInvoiceId: invoice._id,
          });
        }
      });
    });

    // Calculate daily forecast
    const dailyForecast = [];
    let runningBalance = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayIncome = expectedIncome.filter(e => new Date(e.date).toISOString().split('T')[0] === dateStr).reduce((s, e) => s + e.amount, 0);
      const dayExpense = expectedExpenses.filter(e => new Date(e.date).toISOString().split('T')[0] === dateStr).reduce((s, e) => s + e.amount, 0);

      runningBalance += dayIncome - dayExpense;
      dailyForecast.push({
        date: dateStr,
        income: dayIncome,
        expense: dayExpense,
        net: dayIncome - dayExpense,
        runningBalance,
      });
    }

    const totalExpectedIncome = expectedIncome.reduce((s, e) => s + e.amount, 0);
    const totalExpectedExpenses = expectedExpenses.reduce((s, e) => s + e.amount, 0);
    const netCashFlow = totalExpectedIncome - totalExpectedExpenses;

    // Warnings
    const warnings = [];
    if (netCashFlow < 0) warnings.push({ type: 'negative_flow', text: 'التدفق النقدي سلبي — قد تحتاج سيولة إضافية' });
    const negativeDays = dailyForecast.filter(d => d.runningBalance < -5000).length;
    if (negativeDays > 5) warnings.push({ type: 'liquidity', text: `${negativeDays} يوم متوقع فيها نقص سيولة` });

    ApiResponse.success(res, {
      summary: {
        totalExpectedIncome,
        totalExpectedExpenses,
        netCashFlow,
        installmentsCount: expectedIncome.length,
        expensesCount: expectedExpenses.length,
      },
      dailyForecast,
      expectedIncome: expectedIncome.sort((a, b) => new Date(a.date) - new Date(b.date)),
      expectedExpenses: expectedExpenses.sort((a, b) => new Date(a.date) - new Date(b.date)),
      warnings,
      period: { from: today, to: next30Days },
    });
  });

  /**
   * GET /api/v1/bi/command-center
   * Daily tasks and priorities for the merchant
   */
  getCommandCenter = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // === 1. Collections due today ===
    const invoicesToday = await Invoice.find({
      tenant: tenantId,
      'installments.dueDate': { $gte: today, $lt: tomorrow },
      'installments.status': { $in: ['pending', 'partially_paid'] },
    }).populate('customer', 'name phone tier creditEngine').lean();

    const collectionsToday = [];
    let collectionsTodayTotal = 0;
    invoicesToday.forEach(inv => {
      (inv.installments || []).forEach(inst => {
        if (new Date(inst.dueDate) >= today && new Date(inst.dueDate) < tomorrow && inst.status !== 'paid') {
          const remaining = inst.amount - (inst.paidAmount || 0);
          collectionsToday.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer,
            installmentNumber: inst.installmentNumber,
            amount: remaining,
            dueDate: inst.dueDate,
          });
          collectionsTodayTotal += remaining;
        }
      });
    });

    // === 2. Overdue collections ===
    const invoicesOverdue = await Invoice.find({
      tenant: tenantId,
      'installments.dueDate': { $lt: today },
      'installments.status': { $in: ['pending', 'partially_paid', 'overdue'] },
    }).populate('customer', 'name phone tier creditEngine').lean();

    const collectionsOverdue = [];
    let overdueTotal = 0;
    invoicesOverdue.forEach(inv => {
      (inv.installments || []).forEach(inst => {
        if (new Date(inst.dueDate) < today && inst.status !== 'paid') {
          const remaining = inst.amount - (inst.paidAmount || 0);
          collectionsOverdue.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer,
            installmentNumber: inst.installmentNumber,
            amount: remaining,
            dueDate: inst.dueDate,
            daysOverdue: Math.floor((today - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24)),
          });
          overdueTotal += remaining;
        }
      });
    });
    collectionsOverdue.sort((a, b) => b.amount - a.amount);

    // === 3. Low stock alerts (Per Branch) ===
    const products = await Product.find({
      tenant: tenantId,
      isActive: true,
    }).populate('supplier', 'name phone').select('name sku inventory supplier stockStatus').lean();

    const lowStockProducts = [];
    products.forEach(p => {
      if (p.inventory && p.inventory.length > 0) {
        p.inventory.forEach(inv => {
          if (inv.quantity <= inv.minQuantity) {
            lowStockProducts.push({
              _id: p._id,
              name: p.name,
              sku: p.sku,
              branchId: inv.branch, // We'll need to populate this name ideally, or fetch branches
              quantity: inv.quantity,
              minQuantity: inv.minQuantity,
              status: inv.quantity <= 0 ? 'out_of_stock' : 'low_stock',
              supplier: p.supplier
            });
          }
        });
      }
    });

    // Populate Branch Names for Low Stock
    if (lowStockProducts.length > 0) {
      const Branch = require('../models/Branch');
      const branches = await Branch.find({ tenant: tenantId }).select('name').lean();
      const branchMap = {};
      branches.forEach(b => branchMap[b._id.toString()] = b.name);

      lowStockProducts.forEach(item => {
        item.branchName = branchMap[item.branchId?.toString()] || 'الفرع الرئيسي';
      });
    }

    // === 4. Supplier payments due (from supplier purchase invoices) ===
    const supplierInvoicesDue = await SupplierPurchaseInvoice.find({
      tenant: tenantId,
      status: { $in: ['open', 'partial_paid'] },
      installmentsSchedule: {
        $elemMatch: {
          status: { $in: ['pending', 'partially_paid', 'overdue'] },
          dueDate: { $lte: tomorrowEnd },
        },
      },
    })
      .populate('supplier', 'name')
      .select('supplier invoiceNumber installmentsSchedule outstandingAmount')
      .lean();

    const supplierPaymentsDue = [];
    supplierInvoicesDue.forEach((invoice) => {
      (invoice.installmentsSchedule || []).forEach((installment) => {
        const dueDate = new Date(installment.dueDate);
        const remainingAmount = Number(installment.amount || 0) - Number(installment.paidAmount || 0);

        if (
          ['pending', 'partially_paid', 'overdue'].includes(String(installment.status || ''))
          && dueDate <= tomorrowEnd
          && remainingAmount > 0
        ) {
          supplierPaymentsDue.push({
            supplierId: invoice.supplier?._id || invoice.supplier,
            supplierName: invoice.supplier?.name || '—',
            supplierInvoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: remainingAmount,
            dueDate,
            isOverdue: dueDate < today,
          });
        }
      });
    });

    // === 5. High-risk customers to contact ===
    const highRiskCustomers = await Customer.find({
      tenant: tenantId,
      isActive: true,
      'financials.outstandingBalance': { $gt: 0 },
      $or: [
        { 'creditEngine.riskLevel': 'high' },
        { 'creditEngine.riskLevel': 'blocked' },
      ],
    }).select('name phone financials creditEngine').limit(10).lean();

    // === 6. Branch Performance (Sales Today) ===
    const salesTodayByBranch = await Invoice.aggregate([
      {
        $match: {
          tenant: tenantId,
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$branch',
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branchInfo'
        }
      },
      { $unwind: { path: '$branchInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          branchName: { $ifNull: ['$branchInfo.name', 'الفرع الرئيسي'] },
          totalSales: 1,
          count: 1
        }
      }
    ]);

    // === 7. Smart suggestions ===
    const suggestions = [];
    if (collectionsOverdue.length > 0) {
      suggestions.push({
        priority: 'high',
        icon: '🔴',
        text: `لديك ${collectionsOverdue.length} قسط متأخر بإجمالي ${Math.round(overdueTotal).toLocaleString()} ج.م — ابدأ بالتحصيل`,
        action: 'collection',
      });
    }
    if (collectionsToday.length > 0) {
      suggestions.push({
        priority: 'high',
        icon: '📅',
        text: `${collectionsToday.length} قسط مستحق اليوم بإجمالي ${Math.round(collectionsTodayTotal).toLocaleString()} ج.م`,
        action: 'collection',
      });
    }
    if (lowStockProducts.filter(p => p.status === 'out_of_stock').length > 0) {
      // Group by branch
      const outStockCount = lowStockProducts.filter(p => p.status === 'out_of_stock').length;
      suggestions.push({
        priority: 'high',
        icon: '📦',
        text: `${outStockCount} منتج نفذ في الفروع — اطلب من الموردين`,
        action: 'restock',
      });
    }
    if (supplierPaymentsDue.filter(p => p.isOverdue).length > 0) {
      suggestions.push({
        priority: 'medium',
        icon: '🚛',
        text: `${supplierPaymentsDue.filter(p => p.isOverdue).length} دفعة متأخرة للموردين`,
        action: 'supplier_payment',
      });
    }
    if (highRiskCustomers.length > 0) {
      suggestions.push({
        priority: 'medium',
        icon: '⚠️',
        text: `${highRiskCustomers.length} عميل عالي المخاطر — راجع حساباتهم`,
        action: 'risk_review',
      });
    }

    // Sort suggestions by priority
    suggestions.sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));

    ApiResponse.success(res, {
      date: today,
      summary: {
        collectionsTodayCount: collectionsToday.length,
        collectionsTodayTotal,
        overdueCount: collectionsOverdue.length,
        overdueTotal,
        lowStockCount: lowStockProducts.length,
        supplierPaymentsCount: supplierPaymentsDue.length,
        highRiskCustomersCount: highRiskCustomers.length,
      },
      suggestions,
      collectionsToday: collectionsToday.slice(0, 10),
      collectionsOverdue: collectionsOverdue.slice(0, 10),
      lowStockProducts: lowStockProducts.slice(0, 10),
      supplierPaymentsDue: supplierPaymentsDue.slice(0, 5),
      highRiskCustomers: highRiskCustomers.slice(0, 5),
      branchPerformance: salesTodayByBranch
    });
  });

  /**
   * POST /api/v1/bi/what-if
   * Simulate scenarios: pricing changes, installment adjustments
   */
  whatIfSimulator = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const { scenario, params } = req.body;

    let result = {};

    if (scenario === 'price_change') {
      // Simulate price change impact
      const { productId, newPrice, percentChange } = params;
      const product = await Product.findOne({ _id: productId, tenant: tenantId }).lean();
      if (!product) throw new Error('المنتج غير موجود');

      const currentPrice = product.price;
      const targetPrice = newPrice || currentPrice * (1 + percentChange / 100);
      const currentProfit = currentPrice - (product.cost || currentPrice * 0.7);
      const newProfit = targetPrice - (product.cost || currentPrice * 0.7);

      // Get last 30 days sales for this product
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const salesData = await Invoice.aggregate([
        { $match: { tenant: tenantId, createdAt: { $gte: thirtyDaysAgo }, 'items.product': product._id } },
        { $unwind: '$items' },
        { $match: { 'items.product': product._id } },
        { $group: { _id: null, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.totalPrice' } } },
      ]);

      const avgMonthlySales = salesData[0]?.totalQty || 0;
      // Estimate demand change: 10% price increase = ~5% demand decrease (simplified)
      const priceChangePercent = ((targetPrice - currentPrice) / currentPrice) * 100;
      const estimatedDemandChange = -priceChangePercent * 0.5;
      const estimatedNewSales = Math.max(0, avgMonthlySales * (1 + estimatedDemandChange / 100));

      result = {
        scenario: 'price_change',
        product: { name: product.name, currentPrice, newPrice: targetPrice },
        impact: {
          priceChangePercent: Math.round(priceChangePercent * 10) / 10,
          currentProfitPerUnit: Math.round(currentProfit),
          newProfitPerUnit: Math.round(newProfit),
          profitChangePercent: Math.round(((newProfit - currentProfit) / currentProfit) * 100),
          estimatedMonthlySalesChange: Math.round(estimatedDemandChange * 10) / 10,
          currentMonthlyProfit: Math.round(currentProfit * avgMonthlySales),
          estimatedNewMonthlyProfit: Math.round(newProfit * estimatedNewSales),
        },
        recommendation: newProfit * estimatedNewSales > currentProfit * avgMonthlySales
          ? '✅ التغيير مفيد — الربح الشهري سيزيد'
          : '⚠️ التغيير قد يقلل الربح — راجع القرار',
      };
    } else if (scenario === 'installment_change') {
      // Simulate changing default installment count
      const { currentInstallments = 6, newInstallments } = params;

      // Get collection rate by installment count
      const collectionData = await Invoice.aggregate([
        { $match: { tenant: tenantId, paymentMethod: 'installment' } },
        {
          $group: {
            _id: { $size: '$installments' },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Simplified model: longer installments = lower collection rate
      const avgCollectionRate = collectionData.length > 0
        ? collectionData.reduce((s, d) => s + (d.paidAmount / d.totalAmount), 0) / collectionData.length
        : 0.8;

      const currentCollectionEstimate = avgCollectionRate;
      const collectionDropPerInstallment = 0.02; // 2% drop per extra installment
      const installmentDiff = newInstallments - currentInstallments;
      const newCollectionEstimate = Math.max(0.5, currentCollectionEstimate - (installmentDiff * collectionDropPerInstallment));

      result = {
        scenario: 'installment_change',
        change: { from: currentInstallments, to: newInstallments },
        impact: {
          currentCollectionRate: Math.round(currentCollectionEstimate * 100),
          estimatedNewCollectionRate: Math.round(newCollectionEstimate * 100),
          collectionRateChange: Math.round((newCollectionEstimate - currentCollectionEstimate) * 100),
        },
        recommendation: newInstallments > currentInstallments
          ? '⚠️ زيادة عدد الأقساط قد تقلل نسبة التحصيل'
          : '✅ تقليل الأقساط يحسن التحصيل لكن قد يقلل المبيعات',
      };
    }

    ApiResponse.success(res, result);
  });

  /**
   * GET /api/v1/bi/achievements
   * Get merchant achievements and milestones
   */
  getAchievements = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    const [invoiceStats, customerCount, productCount] = await Promise.all([
      Invoice.aggregate([
        { $match: { tenant: tenantId, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalSales: { $sum: '$totalAmount' },
            totalCollected: { $sum: '$paidAmount' },
            firstInvoice: { $min: '$createdAt' },
          },
        },
      ]),
      Customer.countDocuments({ tenant: tenantId, isActive: true }),
      Product.countDocuments({ tenant: tenantId, isActive: true }),
    ]);

    const stats = invoiceStats[0] || { count: 0, totalSales: 0, totalCollected: 0 };
    const daysSinceStart = stats.firstInvoice
      ? Math.floor((Date.now() - new Date(stats.firstInvoice)) / (1000 * 60 * 60 * 24))
      : 0;

    // Define achievements
    const achievements = [
      { id: 'first_sale', name: 'أول بيعة', description: 'أنشأت أول فاتورة', icon: '🎉', unlocked: stats.count >= 1 },
      { id: 'sales_10', name: '10 مبيعات', description: 'وصلت 10 فواتير', icon: '📈', unlocked: stats.count >= 10 },
      { id: 'sales_50', name: '50 مبيعة', description: 'وصلت 50 فاتورة', icon: '🚀', unlocked: stats.count >= 50 },
      { id: 'sales_100', name: 'تاجر نشط', description: 'وصلت 100 فاتورة', icon: '⭐', unlocked: stats.count >= 100 },
      { id: 'sales_500', name: 'تاجر محترف', description: 'وصلت 500 فاتورة', icon: '👑', unlocked: stats.count >= 500 },
      { id: 'revenue_10k', name: 'أول 10 آلاف', description: 'مبيعات 10,000 ج.م', icon: '💰', unlocked: stats.totalSales >= 10000 },
      { id: 'revenue_100k', name: 'نجم المبيعات', description: 'مبيعات 100,000 ج.م', icon: '💎', unlocked: stats.totalSales >= 100000 },
      { id: 'revenue_1m', name: 'مليونير', description: 'مبيعات 1,000,000 ج.م', icon: '🏆', unlocked: stats.totalSales >= 1000000 },
      { id: 'customers_10', name: '10 عملاء', description: 'لديك 10 عملاء', icon: '👥', unlocked: customerCount >= 10 },
      { id: 'customers_50', name: '50 عميل', description: 'لديك 50 عميل', icon: '🌟', unlocked: customerCount >= 50 },
      { id: 'customers_100', name: 'قاعدة عملاء', description: 'لديك 100 عميل', icon: '🏢', unlocked: customerCount >= 100 },
      { id: 'products_20', name: 'تشكيلة متنوعة', description: 'لديك 20 منتج', icon: '📦', unlocked: productCount >= 20 },
      { id: 'week_active', name: 'أسبوع نشاط', description: 'نشط منذ أسبوع', icon: '📅', unlocked: daysSinceStart >= 7 },
      { id: 'month_active', name: 'شهر نشاط', description: 'نشط منذ شهر', icon: '🗓️', unlocked: daysSinceStart >= 30 },
      { id: 'year_active', name: 'سنة نجاح', description: 'نشط منذ سنة', icon: '🎂', unlocked: daysSinceStart >= 365 },
    ];

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const progress = Math.round((unlockedCount / achievements.length) * 100);

    // Business timeline story
    const timeline = [];
    if (stats.firstInvoice) timeline.push({ date: stats.firstInvoice, event: 'أول فاتورة', icon: '🎉' });
    if (stats.count >= 10) timeline.push({ date: null, event: 'وصلت 10 فواتير', icon: '📈' });
    if (stats.count >= 100) timeline.push({ date: null, event: 'وصلت 100 فاتورة', icon: '⭐' });
    if (stats.totalSales >= 100000) timeline.push({ date: null, event: 'تجاوزت 100 ألف مبيعات', icon: '💎' });

    ApiResponse.success(res, {
      achievements,
      stats: {
        unlockedCount,
        totalAchievements: achievements.length,
        progress,
        invoiceCount: stats.count,
        totalSales: stats.totalSales,
        totalCollected: stats.totalCollected,
        customerCount,
        productCount,
        daysSinceStart,
      },
      timeline,
      nextMilestone: achievements.find(a => !a.unlocked),
    });
  });

  /**
   * GET /api/v1/bi/customer-lifetime-value
   * Calculate CLV for top customers
   */
  getCustomerLifetimeValue = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    const customers = await Customer.find({ tenant: tenantId, isActive: true }).lean();

    const clvData = await Promise.all(
      customers.map(async (c) => {
        const invoices = await Invoice.find({ customer: c._id, status: { $ne: 'cancelled' } }).lean();
        const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalProfit = invoices.reduce((s, i) => {
          return s + i.items.reduce((is, item) => is + (item.unitPrice - (item.cost || item.unitPrice * 0.7)) * item.quantity, 0);
        }, 0);
        const avgOrderValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

        // Months since first purchase
        const firstInvoice = invoices.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
        const monthsActive = firstInvoice
          ? Math.max(1, Math.floor((Date.now() - new Date(firstInvoice.createdAt)) / (1000 * 60 * 60 * 24 * 30)))
          : 1;

        const monthlyValue = totalRevenue / monthsActive;
        const estimatedYearlyValue = monthlyValue * 12;

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          tier: c.tier,
          totalRevenue,
          totalProfit,
          invoiceCount: invoices.length,
          avgOrderValue: Math.round(avgOrderValue),
          monthsActive,
          monthlyValue: Math.round(monthlyValue),
          estimatedYearlyValue: Math.round(estimatedYearlyValue),
          creditScore: c.creditEngine?.score || 100,
          outstandingBalance: c.financials?.outstandingBalance || 0,
        };
      })
    );

    // Sort by CLV
    clvData.sort((a, b) => b.estimatedYearlyValue - a.estimatedYearlyValue);

    const totalCLV = clvData.reduce((s, c) => s + c.estimatedYearlyValue, 0);
    const avgCLV = clvData.length > 0 ? totalCLV / clvData.length : 0;

    ApiResponse.success(res, {
      customers: clvData.slice(0, 20),
      summary: {
        totalCustomers: clvData.length,
        totalEstimatedYearlyValue: totalCLV,
        avgCustomerValue: Math.round(avgCLV),
        topCustomerValue: clvData[0]?.estimatedYearlyValue || 0,
      },
    });
  });

  /**
   * GET /api/v1/bi/aging-report
   * Debt aging report (30/60/90 days)
   */
  getAgingReport = catchAsync(async (req, res, next) => {
    const report = await Customer.getAgingReport(req.tenantId);
    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/bi/real-profit
   * Calculate real profit after expenses, returns, bad debts
   */
  getRealProfit = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to) : new Date();

    const [invoices, expenses] = await Promise.all([
      Invoice.find({
        tenant: tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' },
      }).lean(),
      Expense.find({
        tenant: tenantId,
        date: { $gte: startDate, $lte: endDate },
        isActive: true,
      }).lean(),
    ]);

    // Revenue
    const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);

    // Cost of goods sold
    const cogs = invoices.reduce((s, i) => {
      return s + i.items.reduce((is, item) => is + (item.cost || item.unitPrice * 0.7) * item.quantity, 0);
    }, 0);

    // Gross profit
    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Operating expenses
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const expensesByCategory = {};
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    });

    // Bad debts (overdue > 90 days, consider 50% as bad debt)
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    const potentialBadDebt = overdueInvoices.reduce((s, i) => s + i.remainingAmount, 0) * 0.5;

    // Net profit
    const netProfit = grossProfit - totalExpenses - potentialBadDebt;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    ApiResponse.success(res, {
      period: { from: startDate, to: endDate },
      revenue: {
        total: Math.round(totalRevenue),
        collected: Math.round(totalCollected),
        outstanding: Math.round(totalRevenue - totalCollected),
        invoiceCount: invoices.length,
      },
      costs: {
        cogs: Math.round(cogs),
        expenses: Math.round(totalExpenses),
        expensesByCategory,
        potentialBadDebt: Math.round(potentialBadDebt),
      },
      profit: {
        gross: Math.round(grossProfit),
        grossMargin: Math.round(grossMargin * 10) / 10,
        net: Math.round(netProfit),
        netMargin: Math.round(netMargin * 10) / 10,
      },
      insight: netProfit > 0
        ? `✅ ربحت ${Math.round(netProfit).toLocaleString()} ج.م صافي هذه الفترة`
        : `⚠️ خسارة ${Math.abs(Math.round(netProfit)).toLocaleString()} ج.م — راجع المصروفات`,
    });
  });

  /**
   * GET /api/v1/bi/staff-performance
   * Detailed performance metrics for all staff
   */
  getStaffPerformance = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = to ? new Date(to) : new Date();

    const [staff, salesByUser, logsByUser] = await Promise.all([
      User.find({ tenant: tenantId, isActive: true }).select('name email role commissionRate avatars gamification createdAt').lean(),
      Invoice.aggregate([
        {
          $match: {
            tenant: tenantId,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: '$user',
            totalSales: { $sum: '$totalAmount' },
            totalCollected: { $sum: '$paidAmount' },
            invoiceCount: { $sum: 1 },
            avgInvoiceValue: { $avg: '$totalAmount' },
            totalProfit: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      { $multiply: [{ $subtract: ['$$this.unitPrice', { $ifNull: ['$$this.cost', { $multiply: ['$$this.unitPrice', 0.7] }] }] }, '$$this.quantity'] }
                    ]
                  }
                }
              }
            }
          }
        }
      ]),
      AuditLog.aggregate([
        {
          $match: {
            tenant: tenantId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$user',
            actionCount: { $sum: 1 },
            lastAction: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    // Merge results
    const salesMap = {};
    salesByUser.forEach(s => { if (s._id) salesMap[s._id.toString()] = s; });

    const logsMap = {};
    logsByUser.forEach(l => { if (l._id) logsMap[l._id.toString()] = l; });

    const performance = staff.map(member => {
      const sales = salesMap[member._id.toString()] || { totalSales: 0, totalCollected: 0, invoiceCount: 0, totalProfit: 0, avgInvoiceValue: 0 };
      const logs = logsMap[member._id.toString()] || { actionCount: 0, lastAction: null };

      const commission = Math.round(sales.totalProfit * ((member.commissionRate || 0) / 100));

      return {
        _id: member._id,
        name: member.name,
        role: member.role,
        commissionRate: member.commissionRate || 0,
        stats: {
          sales: Math.round(sales.totalSales),
          collected: Math.round(sales.totalCollected),
          invoiceCount: sales.invoiceCount,
          avgOrder: Math.round(sales.avgInvoiceValue),
          profitGenerated: Math.round(sales.totalProfit),
          commissionEarned: commission,
          actionCount: logs.actionCount,
          lastActive: logs.lastAction || member.createdAt
        },
        gamification: member.gamification
      };
    });

    // Sort by sales descending
    performance.sort((a, b) => b.stats.sales - a.stats.sales);

    ApiResponse.success(res, {
      period: { from: startDate, to: endDate },
      performance,
      summary: {
        totalStaff: performance.length,
        totalSales: performance.reduce((s, p) => s + p.stats.sales, 0),
        totalCommission: performance.reduce((s, p) => s + p.stats.commissionEarned, 0)
      }
    });
  });
}

module.exports = new BusinessIntelligenceController();
