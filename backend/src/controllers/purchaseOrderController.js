/**
 * Purchase Order Controller
 */

const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const PDFDocument = require('pdfkit');

class PurchaseOrderController {
  async getAll(req, res, next) {
    try {
      const { page, limit, skip } = Helpers.getPaginationParams(req.query);
      const filter = { ...req.tenantFilter };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.supplier) filter.supplier = req.query.supplier;

      const [orders, total] = await Promise.all([
        PurchaseOrder.find(filter)
          .populate('supplier', 'name contactPerson')
          .populate('createdBy', 'name')
          .sort('-createdAt')
          .skip(skip)
          .limit(limit),
        PurchaseOrder.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, orders, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier')
        .populate('items.product')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name');

      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { supplier, items, notes, expectedDeliveryDate } = req.body;

      const order = await PurchaseOrder.create({
        tenant: req.tenantId,
        supplier,
        items,
        notes,
        expectedDeliveryDate,
        createdBy: req.user._id,
      });

      ApiResponse.created(res, order, 'تم إنشاء أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { items, notes, expectedDeliveryDate, status } = req.body;

      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received') {
        return next(AppError.badRequest('لا يمكن تعديل أمر مستلم'));
      }

      if (items) order.items = items;
      if (notes !== undefined) order.notes = notes;
      if (expectedDeliveryDate) order.expectedDeliveryDate = expectedDeliveryDate;
      if (status) order.status = status;

      await order.save();

      ApiResponse.success(res, order, 'تم تحديث أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const { receivedItems, branchId } = req.body; // Array: [{ itemId, receivedQuantity, batchNumber, expiryDate }]

      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received' || order.status === 'cancelled') {
        return next(AppError.badRequest('لا يمكن تعديل استلام أمر بهذا الحالة'));
      }

      // Default branch if not provided (should ideally come from user profile or request)
      const targetBranchId = branchId || req.user.branch;

      // Update received quantities and stock
      for (const received of receivedItems) {
        const item = order.items.id(received.itemId);
        if (!item) continue;

        const quantityToReceive = Number(received.receivedQuantity) || 0;
        if (quantityToReceive <= 0) continue;

        item.receivedQuantity += quantityToReceive;

        // Update product stock
        const product = await Product.findById(item.product);
        if (product) {
          // Determine where to add stock (branch inventory)
          const targetInventory = item.variantId
            ? product.variants.id(item.variantId)?.inventory
            : product.inventory;

          if (targetInventory) {
            let branchStock = targetInventory.find(inv => inv.branch.toString() === targetBranchId.toString());

            if (!branchStock) {
              // Create branch inventory entry if doesn't exist
              branchStock = { branch: targetBranchId, quantity: 0, batches: [] };
              targetInventory.push(branchStock);
            }

            branchStock.quantity += quantityToReceive;

            // Handle Batch tracking
            if (received.batchNumber) {
              if (!branchStock.batches) branchStock.batches = [];
              let batch = branchStock.batches.find(b => b.batchNumber === received.batchNumber);
              if (batch) {
                batch.quantity += quantityToReceive;
                if (received.expiryDate) batch.expiryDate = received.expiryDate;
              } else {
                branchStock.batches.push({
                  batchNumber: received.batchNumber,
                  expiryDate: received.expiryDate,
                  quantity: quantityToReceive
                });
              }
            }
          }

          await product.save();
        }
      }

      // Determine Order Status
      const allReceived = order.items.every(item => item.receivedQuantity >= item.quantity);
      order.status = allReceived ? 'received' : 'partial';
      order.receivedDate = new Date();
      await order.save();

      ApiResponse.success(res, order, allReceived ? 'تم استلام أمر الشراء بالكامل' : 'تم استلام جزئي وتحديث المخزون');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter });
      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      if (order.status === 'received') {
        return next(AppError.badRequest('لا يمكن حذف أمر مستلم'));
      }

      await order.deleteOne();

      ApiResponse.success(res, null, 'تم حذف أمر الشراء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/purchase-orders/:id/pdf
   * Generate and download Purchase Order as PDF
   */
  async generatePDF(req, res, next) {
    try {
      const order = await PurchaseOrder.findOne({ _id: req.params.id, ...req.tenantFilter })
        .populate('supplier')
        .populate('items.product')
        .populate('createdBy', 'name')
        .populate('tenant');

      if (!order) return next(AppError.notFound('أمر الشراء غير موجود'));

      // Create PDF Document
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      // Set headers for file download
      const filename = `PO-${order.orderNumber}.pdf`;
      res.setHeader('Content-disposition', `inline; filename="${filename}"`); // inline for viewing
      res.setHeader('Content-type', 'application/pdf');

      doc.pipe(res);

      // --- PDF Header ---
      doc.rect(0, 0, 600, 100).fill('#f9fafb');
      doc.fillColor('#111827').fontSize(24).font('Helvetica-Bold').text('PURCHASE ORDER', 40, 40);

      doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
      doc.text(order.tenant?.name || 'PayQusta Store', 40, 70);
      doc.text('Inventory & Order Management System', 40, 82);

      // --- Order Info Box ---
      const infoY = 120;
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
      doc.text('ORDER TO:', 40, infoY);
      doc.text('ORDER DETAILS:', 350, infoY);

      doc.font('Helvetica').fillColor('#374151');
      doc.text(order.supplier?.name || 'N/A', 40, infoY + 15);
      doc.text(order.supplier?.phone || '', 40, infoY + 27);
      doc.text(order.supplier?.email || '', 40, infoY + 39);

      doc.text(`PO Number: ${order.orderNumber}`, 350, infoY + 15);
      doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, 350, infoY + 27);
      doc.text(`Status: ${order.status.toUpperCase()}`, 350, infoY + 39);

      doc.moveDown(4);

      // --- Table Header ---
      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 20).fill('#111827');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM DESCRIPTION', 50, tableTop + 6);
      doc.text('QTY', 300, tableTop + 6, { width: 50, align: 'center' });
      doc.text('UNIT COST', 360, tableTop + 6, { width: 80, align: 'right' });
      doc.text('TOTAL', 450, tableTop + 6, { width: 90, align: 'right' });

      // --- Table Rows ---
      let y = tableTop + 25;
      doc.fillColor('#374151').font('Helvetica');

      order.items.forEach((item, i) => {
        // Stripe background
        if (i % 2 === 1) {
          doc.rect(40, y - 5, 515, 20).fill('#f3f4f6');
          doc.fillColor('#374151');
        }

        const name = item.product?.name || 'Product';
        doc.text(name.substring(0, 50), 50, y);
        doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'center' });
        doc.text(item.unitCost.toFixed(2), 360, y, { width: 80, align: 'right' });
        doc.text(item.totalCost.toFixed(2), 450, y, { width: 90, align: 'right' });
        y += 20;
      });

      // --- Footer Section ---
      y += 20;
      doc.moveTo(350, y).lineTo(555, y).stroke('#e5e7eb');
      y += 10;
      doc.font('Helvetica-Bold').fontSize(12).text('GRAND TOTAL:', 350, y);
      doc.text(`EGP ${order.totalAmount.toFixed(2)}`, 450, y, { width: 100, align: 'right' });

      if (order.notes) {
        y += 40;
        doc.fontSize(10).font('Helvetica-Bold').text('NOTES:', 40, y);
        doc.font('Helvetica').fontSize(9).text(order.notes, 40, y + 15, { width: 300 });
      }

      // --- Bottom Copyright ---
      doc.fontSize(8).fillColor('#9ca3af').text('Thank you for your business!', 0, 780, { align: 'center' });
      doc.text('Powered by PayQusta', 0, 792, { align: 'center' });

      doc.end();

    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        console.error('PDF generation error after headers sent:', error);
      }
    }
  }
}

module.exports = new PurchaseOrderController();
