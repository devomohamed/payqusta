const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const { seedStarterCatalogForTenant } = require('../services/starterCatalogService');

/**
 * Category Controller
 */
class CategoryController {
    /**
     * Get all categories for a tenant
     */
    getAll = catchAsync(async (req, res) => {
        const loadCategories = () => Category.find({
            ...req.tenantFilter,
            parent: null,
            isActive: true,
        }).populate({
            path: 'children',
            populate: { path: 'children' }
        });

        let categories = await loadCategories();

        if (categories.length === 0) {
            const seedResult = await seedStarterCatalogForTenant(req.tenantId);
            if (seedResult.seeded) {
                categories = await loadCategories();
            }
        }

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
        ApiResponse.created(res, category, 'تم إضافة القسم بنجاح');
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
            return next(AppError.notFound('القسم غير موجود'));
        }

        ApiResponse.success(res, category, 'تم تحديث القسم بنجاح');
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
            return next(AppError.badRequest('لا يمكن حذف القسم لوجود منتجات مرتبطة به'));
        }

        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            ...req.tenantFilter,
        });

        if (!category) {
            return next(AppError.notFound('القسم غير موجود'));
        }

        ApiResponse.success(res, null, 'تم حذف القسم بنجاح');
    });

    /**
     * Get category tree (hierarchical)
     */
    getTree = catchAsync(async (req, res) => {
        const loadCategories = () => Category.find({
            ...req.tenantFilter,
            parent: null,
            isActive: true,
        }).populate({
            path: 'children',
            populate: { path: 'children' }
        }).sort({ name: 1 });

        let categories = await loadCategories();

        if (categories.length === 0) {
            const seedResult = await seedStarterCatalogForTenant(req.tenantId);
            if (seedResult.seeded) {
                categories = await loadCategories();
            }
        }

        ApiResponse.success(res, categories);
    });
}

module.exports = new CategoryController();
