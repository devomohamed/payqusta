/**
 * Backup Controller — Data Backup & Restore
 */

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

// Models
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');

const EXCEL_SHEET_NAMES = {
  products: 'المنتجات',
  customers: 'العملاء',
  suppliers: 'الموردين',
};

const EXCEL_HEADERS = {
  name: 'الاسم',
  barcode: 'الباركود',
  category: 'الفئة',
  salePrice: 'سعر البيع',
  costPrice: 'سعر الشراء',
  quantity: 'الكمية',
  minQuantity: 'الحد الأدنى',
  phone: 'الهاتف',
  email: 'البريد',
  address: 'العنوان',
  totalPurchases: 'إجمالي المشتريات',
  remaining: 'المتبقي',
  points: 'نقاط الولاء',
  tier: 'المستوى',
  contactPerson: 'جهة الاتصال',
  paymentTerms: 'شروط الدفع',
  supplierPurchases: 'المشتريات',
  outstandingBalance: 'المستحق',
};

function extractWorksheetValue(cellValue) {
  if (cellValue == null) return '';
  if (cellValue instanceof Date) return cellValue;

  if (typeof cellValue === 'object') {
    if (typeof cellValue.text === 'string') return cellValue.text.trim();
    if (typeof cellValue.result !== 'undefined') return cellValue.result;
    if (Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((item) => item?.text || '').join('').trim();
    }
  }

  return cellValue;
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function readWorksheetRows(worksheet) {
  if (!worksheet) return [];

  const headers = [];
  worksheet.getRow(1).eachCell((cell, col) => {
    headers[col] = normalizeString(extractWorksheetValue(cell.value));
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const record = {};
    row.eachCell((cell, col) => {
      const header = headers[col];
      if (!header) return;
      record[header] = extractWorksheetValue(cell.value);
    });

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  });

  return rows;
}

function withOptionalSession(query, session) {
  return session ? query.session(session) : query;
}

async function createWithOptionalSession(Model, payload, session) {
  if (session) {
    await Model.create([payload], { session });
    return;
  }

  await Model.create(payload);
}

function supportsTransactions() {
  try {
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
  } catch {
    return false;
  }
}

async function startRestoreSession() {
  if (!supportsTransactions()) return null;

  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
}

function buildSupplierDuplicateQuery(tenantId, supplier) {
  const filters = [];
  const phone = normalizeString(supplier.phone);
  const name = normalizeString(supplier.name);

  if (phone) filters.push({ phone });
  if (name) filters.push({ name });

  if (filters.length === 0) return null;

  return {
    tenant: tenantId,
    $or: filters,
  };
}

function summarizeRestoreResults(results) {
  return Object.values(results).reduce(
    (summary, current) => ({
      imported: summary.imported + Number(current.imported || 0),
      skipped: summary.skipped + Number(current.skipped || 0),
    }),
    { imported: 0, skipped: 0 }
  );
}


class BackupController {
  /**
   * GET /api/v1/backup/export
   * Export all tenant data as Excel file
   */
  async exportData(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.find({ tenant: tenantId }).lean(),
        Customer.find({ tenant: tenantId }).lean(),
        Supplier.find({ tenant: tenantId }).lean(),
        Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
        Expense.find({ tenant: tenantId }).lean(),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.views = [{ rightToLeft: true }];

      // Products sheet
      const prodWs = workbook.addWorksheet('المنتجات');
      prodWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'الباركود', key: 'barcode', width: 18 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'سعر البيع', key: 'price', width: 12 },
        { header: 'سعر الشراء', key: 'cost', width: 12 },
        { header: 'الكمية', key: 'quantity', width: 10 },
        { header: 'الحد الأدنى', key: 'minQuantity', width: 12 },
        { header: 'الحالة', key: 'stockStatus', width: 12 },
      ];
      products.forEach(p => prodWs.addRow({
        name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        price: p.price, cost: p.cost,
        quantity: p.stock?.quantity || 0, minQuantity: p.stock?.minQuantity || 0,
        stockStatus: p.stockStatus,
      }));

      // Customers sheet
      const custWs = workbook.addWorksheet('العملاء');
      custWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'العنوان', key: 'address', width: 25 },
        { header: 'إجمالي المشتريات', key: 'totalPurchases', width: 18 },
        { header: 'المتبقي', key: 'totalRemaining', width: 15 },
        { header: 'نقاط الولاء', key: 'points', width: 12 },
        { header: 'المستوى', key: 'tier', width: 12 },
      ];
      customers.forEach(c => custWs.addRow({
        name: c.name, phone: c.phone, email: c.email, address: c.address,
        totalPurchases: c.financials?.totalPurchases || 0,
        totalRemaining: c.financials?.outstandingBalance || 0,
        points: c.gamification?.points || 0, tier: c.tier || 'normal',
      }));

      // Suppliers sheet
      const suppWs = workbook.addWorksheet('الموردين');
      suppWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'جهة الاتصال', key: 'contactPerson', width: 20 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'شروط الدفع', key: 'paymentTerms', width: 15 },
        { header: 'المشتريات', key: 'totalPurchases', width: 15 },
        { header: 'المستحق', key: 'outstandingBalance', width: 15 },
      ];
      suppliers.forEach(s => suppWs.addRow({
        name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email,
        paymentTerms: s.paymentTerms,
        totalPurchases: s.financials?.totalPurchases || 0,
        outstandingBalance: s.financials?.outstandingBalance || 0,
      }));

      // Invoices sheet
      const invWs = workbook.addWorksheet('الفواتير');
      invWs.columns = [
        { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 20 },
        { header: 'العميل', key: 'customer', width: 25 },
        { header: 'المبلغ', key: 'totalAmount', width: 15 },
        { header: 'المدفوع', key: 'paidAmount', width: 15 },
        { header: 'المتبقي', key: 'remainingAmount', width: 15 },
        { header: 'الحالة', key: 'status', width: 12 },
        { header: 'التاريخ', key: 'createdAt', width: 15 },
      ];
      invoices.forEach(inv => invWs.addRow({
        invoiceNumber: inv.invoiceNumber, customer: inv.customer?.name || '-',
        totalAmount: inv.totalAmount, paidAmount: inv.paidAmount, remainingAmount: inv.remainingAmount,
        status: inv.status, createdAt: inv.createdAt?.toLocaleDateString('ar-EG'),
      }));

      // Expenses sheet
      const expWs = workbook.addWorksheet('المصروفات');
      expWs.columns = [
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'المبلغ', key: 'amount', width: 15 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'التاريخ', key: 'date', width: 15 },
      ];
      expenses.forEach(e => expWs.addRow({
        description: e.description, amount: e.amount, category: e.category,
        date: e.date?.toLocaleDateString('ar-EG'),
      }));

      // Style all headers
      workbook.worksheets.forEach(ws => {
        ws.getRow(1).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/backup/stats
   * Get data counts for backup preview
   */
  async getStats(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.countDocuments({ tenant: tenantId }),
        Customer.countDocuments({ tenant: tenantId }),
        Supplier.countDocuments({ tenant: tenantId }),
        Invoice.countDocuments({ tenant: tenantId }),
        Expense.countDocuments({ tenant: tenantId }),
      ]);

      ApiResponse.success(res, {
        products, customers, suppliers, invoices, expenses,
        total: products + customers + suppliers + invoices + expenses,
        lastBackup: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore
   * Restore data from Excel backup file
   */
  async restoreData(req, res, next) {
    const fs = require('fs');
    let session = null;

    try {
      if (!req.file) return next(AppError.badRequest('\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'));

      const tenantId = req.tenantId;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);

      const productRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.products));
      const customerRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.customers));
      const supplierRows = readWorksheetRows(workbook.getWorksheet(EXCEL_SHEET_NAMES.suppliers));

      const results = {
        products: { imported: 0, skipped: 0 },
        customers: { imported: 0, skipped: 0 },
        suppliers: { imported: 0, skipped: 0 },
      };

      session = await startRestoreSession();

      for (const row of productRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        if (!name) continue;

        const existing = await withOptionalSession(Product.findOne({ tenant: tenantId, name }), session);
        if (existing) {
          results.products.skipped++;
          continue;
        }

        const categoryName = normalizeString(row[EXCEL_HEADERS.category]);
        const minQuantityValue = row[EXCEL_HEADERS.minQuantity];

        await createWithOptionalSession(Product, {
          tenant: tenantId,
          name,
          sku: normalizeString(row.SKU),
          barcode: normalizeString(row[EXCEL_HEADERS.barcode]),
          categoryName: categoryName || undefined,
          price: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.salePrice])),
          cost: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.costPrice])),
          stock: {
            quantity: Math.max(0, normalizeNumber(row[EXCEL_HEADERS.quantity])),
            minQuantity: minQuantityValue === '' || minQuantityValue == null ? 5 : Math.max(0, normalizeNumber(minQuantityValue)),
          },
        }, session);

        results.products.imported++;
      }

      for (const row of customerRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        const phone = normalizeString(row[EXCEL_HEADERS.phone]);
        if (!name || !phone) continue;

        const existing = await withOptionalSession(Customer.findOne({ tenant: tenantId, phone }), session);
        if (existing) {
          results.customers.skipped++;
          continue;
        }

        const totalPurchases = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.totalPurchases]));
        const outstandingBalance = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.remaining]));
        const points = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.points]));
        const tier = normalizeString(row[EXCEL_HEADERS.tier]);

        await createWithOptionalSession(Customer, {
          tenant: tenantId,
          name,
          phone,
          email: normalizeString(row[EXCEL_HEADERS.email]) || undefined,
          address: normalizeString(row[EXCEL_HEADERS.address]) || undefined,
          financials: {
            totalPurchases,
            totalPaid: Math.max(0, totalPurchases - outstandingBalance),
            outstandingBalance,
          },
          tier: tier || undefined,
          gamification: {
            points,
            totalEarnedPoints: points,
          },
        }, session);

        results.customers.imported++;
      }

      for (const row of supplierRows) {
        const name = normalizeString(row[EXCEL_HEADERS.name]);
        const phone = normalizeString(row[EXCEL_HEADERS.phone]);
        if (!name || !phone) continue;

        const duplicateQuery = buildSupplierDuplicateQuery(tenantId, { name, phone });
        const existing = duplicateQuery
          ? await withOptionalSession(Supplier.findOne(duplicateQuery), session)
          : null;

        if (existing) {
          results.suppliers.skipped++;
          continue;
        }

        const totalPurchases = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.supplierPurchases]));
        const outstandingBalance = Math.max(0, normalizeNumber(row[EXCEL_HEADERS.outstandingBalance]));

        await createWithOptionalSession(Supplier, {
          tenant: tenantId,
          name,
          contactPerson: normalizeString(row[EXCEL_HEADERS.contactPerson]) || undefined,
          phone,
          email: normalizeString(row[EXCEL_HEADERS.email]) || undefined,
          paymentTerms: normalizeString(row[EXCEL_HEADERS.paymentTerms]) || undefined,
          financials: {
            totalPurchases,
            totalPaid: Math.max(0, totalPurchases - outstandingBalance),
            outstandingBalance,
          },
        }, session);

        results.suppliers.imported++;
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      const summary = summarizeRestoreResults(results);

      ApiResponse.success(res, {
        ...results,
        totalImported: summary.imported,
        totalSkipped: summary.skipped,
      }, '\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 ' + summary.imported + ' \u0633\u062C\u0644 \u0628\u0646\u062C\u0627\u062D (\u062A\u0645 \u062A\u062E\u0637\u064A ' + summary.skipped + ' \u0645\u0643\u0631\u0631)');
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      next(error);
    } finally {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
  }
  /**
   * GET /api/v1/backup/export-json
   * Export all tenant data as JSON file (full backup)
   */
  async exportJSON(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.find({ tenant: tenantId }).lean(),
        Customer.find({ tenant: tenantId }).lean(),
        Supplier.find({ tenant: tenantId }).lean(),
        Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
        Expense.find({ tenant: tenantId }).lean(),
      ]);

      // Remove internal fields that shouldn't be in backup
      const clean = (docs) => docs.map(d => {
        const { __v, ...rest } = d;
        return rest;
      });

      const backup = {
        version: '1.0',
        appName: 'PayQusta',
        exportedAt: new Date().toISOString(),
        tenant: tenantId,
        counts: {
          products: products.length,
          customers: customers.length,
          suppliers: suppliers.length,
          invoices: invoices.length,
          expenses: expenses.length,
          total: products.length + customers.length + suppliers.length + invoices.length + expenses.length,
        },
        data: {
          products: clean(products),
          customers: clean(customers),
          suppliers: clean(suppliers),
          invoices: clean(invoices),
          expenses: clean(expenses),
        },
      };

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore-json
   * Restore data from JSON backup file
   */
  async restoreJSON(req, res, next) {
    const fs = require('fs');
    let session = null;

    try {
      if (!req.file) return next(AppError.badRequest('\u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'));

      const raw = fs.readFileSync(req.file.path, 'utf-8');

      let backup;
      try {
        backup = JSON.parse(raw);
      } catch {
        return next(AppError.badRequest('\u0645\u0644\u0641 JSON \u063A\u064A\u0631 \u0635\u0627\u0644\u062D'));
      }

      if (!backup.data || !backup.appName) {
        return next(AppError.badRequest('\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D - \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0644\u0641 PayQusta'));
      }

      const tenantId = req.tenantId;
      const results = {
        products: { imported: 0, skipped: 0 },
        customers: { imported: 0, skipped: 0 },
        suppliers: { imported: 0, skipped: 0 },
        invoices: { imported: 0, skipped: 0 },
        expenses: { imported: 0, skipped: 0 },
      };

      session = await startRestoreSession();

      if (backup.data.products?.length) {
        for (const product of backup.data.products) {
          const existing = await withOptionalSession(Product.findOne({ tenant: tenantId, name: product.name }), session);
          if (existing) {
            results.products.skipped++;
            continue;
          }

          await createWithOptionalSession(Product, {
            ...product,
            _id: undefined,
            tenant: tenantId,
          }, session);
          results.products.imported++;
        }
      }

      if (backup.data.customers?.length) {
        for (const customer of backup.data.customers) {
          const existing = await withOptionalSession(Customer.findOne({ tenant: tenantId, phone: customer.phone }), session);
          if (existing) {
            results.customers.skipped++;
            continue;
          }

          await createWithOptionalSession(Customer, {
            ...customer,
            _id: undefined,
            tenant: tenantId,
          }, session);
          results.customers.imported++;
        }
      }

      if (backup.data.suppliers?.length) {
        for (const supplier of backup.data.suppliers) {
          const duplicateQuery = buildSupplierDuplicateQuery(tenantId, supplier);
          const existing = duplicateQuery
            ? await withOptionalSession(Supplier.findOne(duplicateQuery), session)
            : null;

          if (existing) {
            results.suppliers.skipped++;
            continue;
          }

          await createWithOptionalSession(Supplier, {
            ...supplier,
            _id: undefined,
            tenant: tenantId,
          }, session);
          results.suppliers.imported++;
        }
      }

      if (backup.data.invoices?.length) {
        for (const invoice of backup.data.invoices) {
          const existing = await withOptionalSession(Invoice.findOne({ tenant: tenantId, invoiceNumber: invoice.invoiceNumber }), session);
          if (existing) {
            results.invoices.skipped++;
            continue;
          }

          let customerId = null;
          if (invoice.customer?.name) {
            const customer = await withOptionalSession(Customer.findOne({ tenant: tenantId, name: invoice.customer.name }), session);
            if (customer) customerId = customer._id;
          }

          await createWithOptionalSession(Invoice, {
            ...invoice,
            _id: undefined,
            tenant: tenantId,
            customer: customerId || invoice.customer?._id || invoice.customer,
          }, session);
          results.invoices.imported++;
        }
      }

      if (backup.data.expenses?.length) {
        for (const expense of backup.data.expenses) {
          const existing = await withOptionalSession(Expense.findOne({
            tenant: tenantId,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
          }), session);

          if (existing) {
            results.expenses.skipped++;
            continue;
          }

          await createWithOptionalSession(Expense, {
            ...expense,
            _id: undefined,
            tenant: tenantId,
          }, session);
          results.expenses.imported++;
        }
      }

      if (session) {
        await session.commitTransaction();
        session.endSession();
        session = null;
      }

      const summary = summarizeRestoreResults(results);

      ApiResponse.success(res, {
        ...results,
        totalImported: summary.imported,
        totalSkipped: summary.skipped,
      }, '\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 ' + summary.imported + ' \u0633\u062C\u0644 \u0628\u0646\u062C\u0627\u062D (\u062A\u0645 \u062A\u062E\u0637\u064A ' + summary.skipped + ' \u0645\u0643\u0631\u0631)');
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      next(error);
    } finally {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
  }
}


module.exports = new BackupController();
