/**
 * Backfill legacy product/variant barcode values into internationalBarcode fields.
 * Usage: node scripts/migrate-legacy-barcodes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const { normalizeProductBarcodeFields } = require('../src/utils/barcodeHelpers');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const products = await Product.find({
      $or: [
        { barcode: { $type: 'string', $ne: '' } },
        { 'variants.barcode': { $type: 'string', $ne: '' } },
      ],
    });

    let updated = 0;

    for (const product of products) {
      const before = JSON.stringify({
        barcode: product.barcode,
        internationalBarcode: product.internationalBarcode,
        internationalBarcodeType: product.internationalBarcodeType,
        localBarcode: product.localBarcode,
        variants: (product.variants || []).map((variant) => ({
          barcode: variant.barcode,
          internationalBarcode: variant.internationalBarcode,
          internationalBarcodeType: variant.internationalBarcodeType,
          localBarcode: variant.localBarcode,
        })),
      });

      normalizeProductBarcodeFields(product);

      const after = JSON.stringify({
        barcode: product.barcode,
        internationalBarcode: product.internationalBarcode,
        internationalBarcodeType: product.internationalBarcodeType,
        localBarcode: product.localBarcode,
        variants: (product.variants || []).map((variant) => ({
          barcode: variant.barcode,
          internationalBarcode: variant.internationalBarcode,
          internationalBarcodeType: variant.internationalBarcodeType,
          localBarcode: variant.localBarcode,
        })),
      });

      if (before === after) continue;

      await product.save({ validateBeforeSave: false });
      updated += 1;
    }

    console.log(`Legacy barcode migration completed. Updated products: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('Legacy barcode migration failed:', error.message);
    process.exit(1);
  }
}

run();
