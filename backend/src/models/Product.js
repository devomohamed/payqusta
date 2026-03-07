/**
 * Product Model — Inventory & Stock Management
 * Multi-tenant product catalog with low-stock alerts
 */

const mongoose = require('mongoose');
const { STOCK_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

async function dispatchBackInStockNotifications(product) {
  const pendingNotifications = (product?.stockNotifications || [])
    .map((notification, index) => ({ notification, index }))
    .filter(({ notification }) => !notification?.notifiedAt && (notification?.email || notification?.phone));

  if (!product?.tenant || (product?.stock?.quantity || 0) <= 0 || pendingNotifications.length === 0) {
    return;
  }

  const Tenant = require('./Tenant');
  const emailService = require('../services/EmailService');
  const WhatsAppService = require('../services/WhatsAppService');
  const tenant = await Tenant.findById(product.tenant).select('name whatsapp');
  const storeName = tenant?.name || 'متجرك';

  const emailSubject = `المنتج "${product.name}" متوفر الآن`;
  const notificationText = `مرحبًا، المنتج "${product.name}" عاد للمخزون الآن لدى ${storeName}. يمكنك إكمال الطلب قبل نفاد الكمية مرة أخرى.`;
  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; }
        h1 { font-size: 24px; color: #0f172a; margin: 16px 0 12px; }
        p { color: #475569; line-height: 1.8; margin: 0 0 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">عاد إلى المخزون</span>
        <h1>${product.name}</h1>
        <p>المنتج الذي طلبت تنبيهًا له أصبح متوفرًا الآن لدى ${storeName}.</p>
        <p>ننصح بإتمام الطلب قريبًا قبل نفاد الكمية مرة أخرى.</p>
      </div>
    </body>
    </html>
  `;

  const results = await Promise.all(
    pendingNotifications.map(async ({ notification, index }) => {
      let attempted = false;
      let delivered = false;

      if (notification.email) {
        attempted = true;
        try {
          const emailResult = await emailService.sendEmail({
            to: notification.email,
            subject: emailSubject,
            text: notificationText,
            html: emailHtml,
          });
          delivered = delivered || Boolean(emailResult?.success);
        } catch (error) {
          logger.error(`Back-in-stock email send failed: ${error.message}`);
        }
      }

      if (notification.phone) {
        attempted = true;
        try {
          const whatsappResult = await WhatsAppService.sendMessage(notification.phone, notificationText, tenant?.whatsapp);
          delivered = delivered || Boolean(whatsappResult?.success);
        } catch (error) {
          logger.error(`Back-in-stock WhatsApp send failed: ${error.message}`);
        }
      }

      return attempted ? { index, delivered } : null;
    })
  );

  const processedNotifications = results.filter(Boolean);
  if (processedNotifications.length === 0) return;

  const notifiedAt = new Date();
  const updateSet = {};

  processedNotifications.forEach(({ index }) => {
    if (product.stockNotifications?.[index]) {
      product.stockNotifications[index].notifiedAt = notifiedAt;
    }
    updateSet[`stockNotifications.${index}.notifiedAt`] = notifiedAt;
  });

  await product.constructor.updateOne({ _id: product._id }, { $set: updateSet });

  const deliveredCount = processedNotifications.filter(({ delivered }) => delivered).length;
  logger.info(`Processed ${processedNotifications.length} back-in-stock alerts for product ${product._id} (${deliveredCount} delivered).`);
}

const productSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'اسم المنتج مطلوب'],
      trim: true,
      maxlength: [200, 'اسم المنتج لا يتجاوز 200 حرف'],
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: { type: String, maxlength: 10000 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    categoryName: {
      type: String,
      trim: true,
    },
    // Pricing (no tax — as per BRD)
    price: {
      type: Number,
      required: [true, 'سعر البيع مطلوب'],
      min: [0, 'السعر لا يمكن أن يكون سالباً'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'سعر المقارنة لا يمكن أن يكون سالباً'],
    },
    cost: {
      type: Number,
      required: [true, 'سعر التكلفة مطلوب'],
      min: [0, 'التكلفة لا يمكن أن تكون سالبة'],
    },
    // Wholesale & Shipping pricing
    wholesalePrice: {
      type: Number,
      min: [0, 'سعر الجملة لا يمكن أن يكون سالباً'],
      default: 0,
    },
    shippingCost: {
      type: Number,
      min: [0, 'تكلفة الشحن لا يمكن أن تكون سالبة'],
      default: 0,
    },
    // Tax
    taxable: { type: Boolean, default: true },
    taxRate: { type: Number, default: 14, min: 0, max: 100 }, // VAT % (Egypt = 14%)
    priceIncludesTax: { type: Boolean, default: false },
    // Stock (Global Summary - Read Only, updated via hooks)
    stock: {
      quantity: { type: Number, default: 0, min: 0 },
      minQuantity: { type: Number, default: 5, min: 0 }, // Global alert threshold
      unit: { type: String, default: 'قطعة' },
    },
    // Multi-Branch Inventory
    inventory: [
      {
        branch: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Branch',
          required: true
        },
        quantity: { type: Number, default: 0, min: 0 },
        minQuantity: { type: Number, default: 5, min: 0 },
        location: { type: String, trim: true }, // Aisle/Shelf
        batches: [
          {
            batchNumber: { type: String, trim: true },
            expiryDate: { type: Date },
            quantity: { type: Number, default: 0, min: 0 }
          }
        ],
      }
    ],
    stockStatus: {
      type: String,
      enum: Object.values(STOCK_STATUS),
      default: STOCK_STATUS.IN_STOCK,
    },
    // Expiry Date (New Feature)
    expiryDate: { type: Date },
    // Supplier link
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    // Media
    images: [{ type: String }],
    thumbnail: { type: String },
    // Metadata
    barcode: { type: String },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    seoTitle: { type: String, trim: true, maxlength: 100 },
    seoDescription: { type: String, trim: true, maxlength: 300 },

    // Product Variants (Size/Color)
    hasVariants: { type: Boolean, default: false },
    variants: [
      {
        sku: { type: String, trim: true, uppercase: true },
        attributes: {
          type: Map,
          of: String,
          default: {},
        },
        price: { type: Number, min: 0 },
        compareAtPrice: { type: Number, min: 0 },
        cost: { type: Number, min: 0 },
        stock: { type: Number, default: 0, min: 0 }, // Variant Global Stock
        inventory: [ // Variant Branch Inventory
          {
            branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
            quantity: { type: Number, default: 0 },
            location: { type: String },
            batches: [
              {
                batchNumber: { type: String, trim: true },
                expiryDate: { type: Date },
                quantity: { type: Number, default: 0, min: 0 }
              }
            ],
          }
        ],
        barcode: { type: String },
        isActive: { type: Boolean, default: true },
      },
    ],

    // Stock alerts
    lowStockAlertSent: { type: Boolean, default: false },
    outOfStockAlertSent: { type: Boolean, default: false },
    // Auto-restock
    autoRestock: {
      enabled: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 },
    },
    // Metrics for AI Smart Alerts
    metrics: {
      dailyRunRate: { type: Number, default: 0 },
      daysUntilStockOut: { type: Number, default: -1 }, // -1 means unknown or infinite
      isSlowMoving: { type: Boolean, default: false },
      lastTrendUpdate: { type: Date }
    },
    autoRestock: {
      enabled: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 },
    },
    // Back-in-stock notifications (C2)
    stockNotifications: [
      {
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        notifiedAt: { type: Date }, // null = not yet notified
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({ tenant: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index(
  { tenant: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $type: 'string' } }
  }
);
productSchema.index({ tenant: 1, name: 'text', description: 'text' });
productSchema.index({ tenant: 1, category: 1 });
productSchema.index({ tenant: 1, stockStatus: 1 });
productSchema.index({ tenant: 1, supplier: 1 });
productSchema.index({ tenant: 1, isSuspended: 1 });

// Virtual: profit margin
productSchema.virtual('profitMargin').get(function () {
  if (this.cost === 0) return 100;
  return (((this.price - this.cost) / this.cost) * 100).toFixed(1);
});

// Virtual: profit per unit
productSchema.virtual('profitPerUnit').get(function () {
  return this.price - this.cost;
});

// Pre-save: Update global stock from inventory and set status
productSchema.pre('save', function (next) {
  // Convert empty strings or null to undefined for sparse indexes
  if (this.sku === '' || this.sku === null) this.sku = undefined;
  if (this.barcode === '' || this.barcode === null) this.barcode = undefined;

  // Sync Inventory -> Global Stock
  if (this.inventory && this.inventory.length > 0) {
    this.stock.quantity = this.inventory.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Sync Variant Inventory -> Variant Stock
  if (this.hasVariants && this.variants) {
    this.variants.forEach(variant => {
      if (variant.inventory && variant.inventory.length > 0) {
        variant.stock = variant.inventory.reduce((sum, item) => sum + item.quantity, 0);
      }
    });
  }

  // Update Stock Status based on Global Quantity
  if (this.stock.quantity <= 0) {
    this.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
  } else if (this.stock.quantity <= this.stock.minQuantity) {
    this.stockStatus = STOCK_STATUS.LOW_STOCK;
  } else {
    this.stockStatus = STOCK_STATUS.IN_STOCK;
    this.lowStockAlertSent = false;
    this.outOfStockAlertSent = false;
  }

  next();
});

productSchema.post('save', async function (doc) {
  try {
    await dispatchBackInStockNotifications(doc);
  } catch (error) {
    logger.error(`Back-in-stock dispatch error for product ${doc?._id}: ${error.message}`);
  }
});

// Post-findOneAndUpdate: Sync stockStatus and calculate totals
productSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;

  // We need to re-fetch to ensure we have the latest inventory to sum up
  // or relying on the doc returned might be enough if we returned new: true
  // meaningful recalculation often requires a separate save or atomic update.
  // For simplicity, we'll just check the returned doc's quantity if it was updated successfully.

  let newStatus = doc.stockStatus;

  if (doc.stock.quantity <= 0) {
    newStatus = STOCK_STATUS.OUT_OF_STOCK;
  } else if (doc.stock.quantity <= doc.stock.minQuantity) {
    newStatus = STOCK_STATUS.LOW_STOCK;
  } else {
    newStatus = STOCK_STATUS.IN_STOCK;
  }

  if (doc.stockStatus !== newStatus) {
    doc.stockStatus = newStatus;
    await doc.save();
  }
});

// Static: Find low stock products for a tenant (uses aggregation for reliable field-to-field comparison)
productSchema.statics.findLowStock = async function (tenantId) {
  // Step 1: Aggregation pipeline to find products where quantity <= minQuantity
  const matched = await this.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
      },
    },
    {
      $match: {
        $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
      },
    },
    { $project: { _id: 1 } },
  ]);

  if (matched.length === 0) return [];

  // Step 2: Fetch as Mongoose documents with populate (needed for .save() in StockMonitorJob)
  return this.find({ _id: { $in: matched.map((p) => p._id) } })
    .populate('supplier', 'name contactPerson phone');
};

// Static: Get stock summary for a tenant (compute status from actual quantities)
productSchema.statics.getStockSummary = async function (tenantId, branchId = null) {
  const matchStage = { tenant: new mongoose.Types.ObjectId(tenantId), isActive: true };
  let groupStage = {};
  let projectStage = {};

  if (branchId) {
    // Branch specific aggregation
    const branchObjId = new mongoose.Types.ObjectId(branchId);

    // Filter products that have this branch in inventory
    // matchStage['inventory.branch'] = branchObjId; // Optional: only count products that exist in this branch

    // Unwind inventory to filter by branch
    // We strictly want to count stock for this branch

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$inventory' },
      { $match: { 'inventory.branch': branchObjId } },
      {
        $addFields: {
          computedStatus: {
            $cond: {
              if: { $lte: ['$inventory.quantity', 0] },
              then: 'out_of_stock',
              else: {
                $cond: {
                  if: { $lte: ['$inventory.quantity', '$inventory.minQuantity'] },
                  then: 'low_stock',
                  else: 'in_stock',
                },
              },
            },
          },
          costVal: { $multiply: ['$inventory.quantity', '$cost'] }
        },
      },
      {
        $group: {
          _id: '$computedStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$costVal' },
        },
      },
    ];

    const result = await this.aggregate(pipeline);

    const summary = { inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
    result.forEach((item) => {
      if (item._id === 'in_stock') { summary.inStock = item.count; summary.totalValue += item.totalValue; }
      if (item._id === 'low_stock') { summary.lowStock = item.count; summary.totalValue += item.totalValue; }
      if (item._id === 'out_of_stock') summary.outOfStock = item.count;
    });
    return summary;

  } else {
    // Global Tenant aggregation (Original logic)
    const result = await this.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          computedStatus: {
            $cond: {
              if: { $lte: ['$stock.quantity', 0] },
              then: 'out_of_stock',
              else: {
                $cond: {
                  if: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
                  then: 'low_stock',
                  else: 'in_stock',
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$computedStatus',
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$stock.quantity', '$cost'] } },
        },
      },
    ]);

    const summary = { inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
    result.forEach((item) => {
      if (item._id === 'in_stock') { summary.inStock = item.count; summary.totalValue += item.totalValue; }
      if (item._id === 'low_stock') { summary.lowStock = item.count; summary.totalValue += item.totalValue; }
      if (item._id === 'out_of_stock') summary.outOfStock = item.count;
    });

    return summary;
  }
};

module.exports = mongoose.model('Product', productSchema);
