const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const { findProductByCode } = require('../services/barcodeService');

/**
 * Global Search Controller
 * Provides unified search across all entities
 */
class SearchController {
  /**
   * GET /api/v1/search?q=...
   * Global search across products, customers, invoices, suppliers
   */
  globalSearch = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return ApiResponse.success(res, {
        products: [],
        customers: [],
        invoices: [],
        suppliers: [],
        total: 0,
      }, 'أدخل كلمة بحث (حرفين على الأقل)');
    }

    const searchTerm = q.trim();
    const filter = req.tenantFilter;
    const regex = new RegExp(searchTerm, 'i');

    const [products, customers, invoices, suppliers] = await Promise.all([
      Product.find({
        ...filter,
        isActive: true,
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: regex },
          { internationalBarcode: regex },
          { localBarcode: regex },
          { 'variants.sku': regex },
          { 'variants.barcode': regex },
          { 'variants.internationalBarcode': regex },
          { 'variants.localBarcode': regex },
          { category: regex },
          { tags: regex },
        ],
      })
        .limit(10)
        .select('name sku barcode internationalBarcode localBarcode category price stock thumbnail')
        .lean(),

      Customer.find({
        ...filter,
        isActive: true,
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { address: regex },
        ],
      })
        .limit(10)
        .select('name phone email totalSpent remainingBalance')
        .lean(),

      Invoice.find({
        ...filter,
        $or: [
          { invoiceNumber: regex },
          { 'customer.name': regex },
        ],
      })
        .limit(10)
        .populate('customer', 'name phone')
        .select('invoiceNumber totalAmount paidAmount remainingAmount status createdAt')
        .sort('-createdAt')
        .lean(),

      Supplier.find({
        ...filter,
        isActive: true,
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { contactPerson: regex },
        ],
      })
        .limit(10)
        .select('name phone email contactPerson totalDebt')
        .lean(),
    ]);

    const total = products.length + customers.length + invoices.length + suppliers.length;

    ApiResponse.success(res, {
      query: searchTerm,
      products: products.map((product) => ({
        ...product,
        type: 'product',
        displayText: `${product.name} (${product.sku})`,
        link: '/products',
      })),
      customers: customers.map((customer) => ({
        ...customer,
        type: 'customer',
        displayText: `${customer.name} - ${customer.phone}`,
        link: '/customers',
      })),
      invoices: invoices.map((invoice) => ({
        ...invoice,
        type: 'invoice',
        displayText: `${invoice.invoiceNumber} - ${invoice.customer?.name || 'عميل محذوف'}`,
        link: '/invoices',
      })),
      suppliers: suppliers.map((supplier) => ({
        ...supplier,
        type: 'supplier',
        displayText: `${supplier.name} - ${supplier.phone}`,
        link: '/suppliers',
      })),
      total,
    });
  });

  /**
   * GET /api/v1/search/suggestions?q=...
   * Quick search suggestions (autocomplete)
   */
  getSearchSuggestions = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return ApiResponse.success(res, []);
    }

    const searchTerm = q.trim();
    const filter = req.tenantFilter;
    const regex = new RegExp(searchTerm, 'i');

    const [products, customers, invoices] = await Promise.all([
      Product.find({
        ...filter,
        isActive: true,
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: regex },
          { internationalBarcode: regex },
          { localBarcode: regex },
          { 'variants.sku': regex },
          { 'variants.barcode': regex },
          { 'variants.internationalBarcode': regex },
          { 'variants.localBarcode': regex },
        ],
      })
        .limit(5)
        .select('name sku barcode internationalBarcode localBarcode')
        .lean(),

      Customer.find({
        ...filter,
        isActive: true,
        $or: [{ name: regex }, { phone: regex }],
      })
        .limit(5)
        .select('name phone')
        .lean(),

      Invoice.find({
        ...filter,
        invoiceNumber: regex,
      })
        .limit(5)
        .populate('customer', 'name')
        .select('invoiceNumber')
        .lean(),
    ]);

    const suggestions = [
      ...products.map((product) => ({
        id: product._id,
        text: `${product.name} (${product.sku})`,
        type: 'product',
        icon: '📦',
      })),
      ...customers.map((customer) => ({
        id: customer._id,
        text: `${customer.name} - ${customer.phone}`,
        type: 'customer',
        icon: '👤',
      })),
      ...invoices.map((invoice) => ({
        id: invoice._id,
        text: `${invoice.invoiceNumber} - ${invoice.customer?.name || 'عميل محذوف'}`,
        type: 'invoice',
        icon: '📄',
      })),
    ];

    ApiResponse.success(res, suggestions);
  });

  /**
   * GET /api/v1/search/quick?barcode=...
   * Quick search by barcode (for POS/Quick Sale)
   */
  quickSearchByBarcode = catchAsync(async (req, res, next) => {
    const { barcode } = req.query;

    if (!barcode) {
      return next(AppError.badRequest('الباركود مطلوب'));
    }

    const product = await findProductByCode({
      tenantFilter: req.tenantFilter,
      code: barcode,
      includeSuspended: true,
    });

    if (!product) {
      return next(AppError.notFound('المنتج غير موجود'));
    }

    ApiResponse.success(res, product);
  });
}

module.exports = new SearchController();
