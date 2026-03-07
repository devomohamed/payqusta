/**
 * Stock Adjustment Controller
 */

const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');

class StockAdjustmentController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.type) filter.type = req.query.type;
      if (req.query.product) filter.product = req.query.product;

      const [adjustments, total] = await Promise.all([
        StockAdjustment.find(filter)
          .sort(sort || '-createdAt')
          .skip(skip)
          .limit(limit)
          .populate('product', 'name sku price cost')
          .populate('user', 'name')
          .populate('branch', 'name')
          .lean(),
        StockAdjustment.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, adjustments, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { productId, type, quantity, reason, branchId } = req.body;
      const tenantId = req.tenantId; // From auth/tenant middleware

      if (!productId || !type || !quantity || !branchId) {
        return next(AppError.badRequest('جميع الحقول مطلوبة (المنتج، النوع، الكمية، الفرع)'));
      }

      const product = await Product.findOne({ _id: productId, ...req.tenantFilter });
      if (!product) return next(AppError.notFound('المنتج غير موجود'));

      // Determine stock change direction
      let stockChange = 0;
      if (['damage', 'theft', 'loss', 'internal_use', 'correction_decrease'].includes(type)) {
        stockChange = -Math.abs(quantity);
      } else if (['correction_increase'].includes(type)) {
        stockChange = Math.abs(quantity);
      } else {
        return next(AppError.badRequest('نوع تسوية غير صالح'));
      }

      if (!product.inventory) product.inventory = [];
      let branchStock = product.inventory.find(inv => inv.branch.toString() === branchId.toString());

      if (!branchStock) {
        branchStock = { branch: branchId, quantity: 0, minQuantity: 5 };
        product.inventory.push(branchStock);
        branchStock = product.inventory[product.inventory.length - 1];
      }

      branchStock.quantity += stockChange;
      await product.save();

      // Create Record
      const adjustment = await StockAdjustment.create({
        tenant: tenantId,
        product: productId,
        user: req.user._id, // From auth middleware
        branch: branchId,
        type,
        quantity: Math.abs(quantity),
        reason,
        costAtAdjustment: product.cost || 0,
      });

      ApiResponse.created(res, adjustment, 'تم تسجيل التسوية بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockAdjustmentController();
