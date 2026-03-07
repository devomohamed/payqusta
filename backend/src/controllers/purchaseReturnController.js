const mongoose = require('mongoose');
const PurchaseReturn = require('../models/PurchaseReturn');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const SupplierPurchaseInvoice = require('../models/SupplierPurchaseInvoice');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

class PurchaseReturnController {
    /**
     * List all purchase returns
     */
    getAll = catchAsync(async (req, res, next) => {
        const filter = { tenant: req.tenantId };

        if (req.query.supplier) filter.supplier = req.query.supplier;
        if (req.query.branch) filter.branch = req.query.branch;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const [returns, total] = await Promise.all([
            PurchaseReturn.find(filter)
                .populate('supplier', 'name')
                .populate('branch', 'name')
                .populate('items.product', 'name sku')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
            PurchaseReturn.countDocuments(filter),
        ]);

        ApiResponse.paginated(res, returns, { page, limit, total });
    });

    /**
     * Get a single return details
     */
    getById = catchAsync(async (req, res, next) => {
        const pr = await PurchaseReturn.findOne({ _id: req.params.id, tenant: req.tenantId })
            .populate('supplier')
            .populate('branch')
            .populate('items.product')
            .populate('user', 'name');

        if (!pr) return next(new AppError('مرتجع الشراء غير موجود', 404));
        ApiResponse.success(res, pr);
    });

    /**
     * Create a new purchase return
     */
    create = catchAsync(async (req, res, next) => {
        const { supplierId, branchId, items, purchaseInvoiceId, reason, notes } = req.body;

        if (!supplierId || !branchId || !items || items.length === 0) {
            return next(new AppError('يرجى ملء كافة البيانات المطلوبة والمنتجات المراد إرجاعها', 400));
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const supplier = await Supplier.findOne({ _id: supplierId, tenant: req.tenantId }).session(session);
            if (!supplier) throw new AppError('المورد غير موجود', 404);

            let totalReturnAmount = 0;
            const processedItems = [];

            for (const item of items) {
                const product = await Product.findOne({ _id: item.productId, tenant: req.tenantId }).session(session);
                if (!product) throw new AppError(`المنتج ${item.productId} غير موجود`, 404);

                const quantityToReturn = Number(item.quantity);
                const unitCost = Number(item.unitCost || product.cost || 0);
                const lineTotal = quantityToReturn * unitCost;

                // 1. Reduce inventory
                let inventoryFound = false;
                if (item.variantId) {
                    const variant = product.variants.id(item.variantId);
                    if (variant) {
                        const branchStock = variant.inventory.find(inv => inv.branch.toString() === branchId.toString());
                        if (branchStock) {
                            if (branchStock.quantity < quantityToReturn) {
                                throw new AppError(`الكمية المتوفرة من المنتج ${product.name} غير كافية للإرجاع في هذا الفرع`, 400);
                            }
                            branchStock.quantity -= quantityToReturn;
                            inventoryFound = true;
                        }
                    }
                } else {
                    const branchStock = product.inventory.find(inv => inv.branch.toString() === branchId.toString());
                    if (branchStock) {
                        if (branchStock.quantity < quantityToReturn) {
                            throw new AppError(`الكمية المتوفرة من المنتج ${product.name} غير كافية للإرجاع في هذا الفرع`, 400);
                        }
                        branchStock.quantity -= quantityToReturn;
                        inventoryFound = true;
                    }
                }

                if (!inventoryFound) {
                    // Fallback to global stock if inventory by branch is not managed or not found
                    if (product.stock.quantity < quantityToReturn) {
                        throw new AppError(`الكمية المتوفرة من المنتج ${product.name} غير كافية للإرجاع`, 400);
                    }
                    product.stock.quantity -= quantityToReturn;
                }

                await product.save({ session });

                processedItems.push({
                    product: product._id,
                    variantId: item.variantId,
                    quantity: quantityToReturn,
                    unitCost,
                    totalCost: lineTotal
                });

                totalReturnAmount += lineTotal;
            }

            // 2. Update Supplier Financials
            // We need to reduce both total purchases and outstanding balance
            supplier.financials.totalPurchases = Math.max(0, (supplier.financials.totalPurchases || 0) - totalReturnAmount);
            supplier.financials.outstandingBalance = (supplier.financials.outstandingBalance || 0) - totalReturnAmount;

            await supplier.save({ session });

            // 3. Link to Purchase Invoice if provided
            if (purchaseInvoiceId) {
                const invoice = await SupplierPurchaseInvoice.findOne({ _id: purchaseInvoiceId, tenant: req.tenantId }).session(session);
                if (invoice) {
                    invoice.outstandingAmount = Math.max(0, (invoice.outstandingAmount || 0) - totalReturnAmount);
                    if (invoice.outstandingAmount === 0) invoice.status = 'paid';
                    else if (invoice.outstandingAmount < invoice.totalAmount) invoice.status = 'partial_paid';
                    await invoice.save({ session });
                }
            }

            // 4. Create the Return Record
            const pr = new PurchaseReturn({
                tenant: req.tenantId,
                supplier: supplierId,
                branch: branchId,
                purchaseInvoice: purchaseInvoiceId,
                items: processedItems,
                totalAmount: totalReturnAmount,
                reason,
                notes,
                user: req.user?._id
            });

            await pr.save({ session });

            await session.commitTransaction();
            ApiResponse.success(res, pr, 'تم تسجيل مرتجع الشراء بنجاح');
        } catch (error) {
            await session.abortTransaction();
            next(error);
        } finally {
            session.endSession();
        }
    });
}

module.exports = new PurchaseReturnController();
