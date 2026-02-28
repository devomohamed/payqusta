const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Category Controller
 */
class CategoryController {
    /**
     * Get all categories for a tenant
     */
    getAll = catchAsync(async (req, res) => {
        // We can fetch categories with their children populated for a tree view
        const categories = await Category.find({
            ...req.tenantFilter,
            parent: null, // Start with top-level
            isActive: true,
        }).populate({
            path: 'children',
            populate: { path: 'children' } // Support up to 3 levels for now
        });

        ApiResponse.success(res, categories);
    });

    /**
     * Create a new category
     */
    create = catchAsync(async (req, res) => {
        const categoryData = {
            ...req.body,
            tenant: req.tenantId,
        };

        const category = await Category.create(categoryData);
        ApiResponse.created(res, category, 'تم إضافة التصنيف بنجاح');
    });

    /**
     * Update a category
     */
    update = catchAsync(async (req, res, next) => {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, ...req.tenantFilter },
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) {
            return next(AppError.notFound('التصنيف غير موجود'));
        }

        ApiResponse.success(res, category, 'تم تحديث التصنيف بنجاح');
    });

    /**
     * Delete a category (soft delete or check for products)
     */
    delete = catchAsync(async (req, res, next) => {
        // Before deleting, check if there are products in this category
        const Product = require('../models/Product');
        const productCount = await Product.countDocuments({
            category: req.params.id,
            ...req.tenantFilter,
            isActive: true
        });

        if (productCount > 0) {
            return next(AppError.badRequest('لا يمكن حذف التصنيف لوجود منتجات مرتبطة به'));
        }

        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            ...req.tenantFilter,
        });

        if (!category) {
            return next(AppError.notFound('التصنيف غير موجود'));
        }

        ApiResponse.success(res, null, 'تم حذف التصنيف بنجاح');
    });

    /**
     * Get category tree (hierarchical)
     */
    getTree = catchAsync(async (req, res) => {
        const categories = await Category.find({
            ...req.tenantFilter,
            parent: null,
            isActive: true,
        }).populate({
            path: 'children',
            populate: { path: 'children' } // Support up to 3 levels
        }).sort({ name: 1 });

        ApiResponse.success(res, categories);
    });
}

module.exports = new CategoryController();
