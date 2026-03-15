/**
 * Batch Cleanup Utility
 * Prunes empty batches from Product inventory arrays to prevent unbounded growth.
 * Can be run manually or set up as a cron job.
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');

async function cleanupEmptyBatches() {
  try {
    console.log('Starting empty batch cleanup...');
    const result = await Product.updateMany(
      {
        $or: [
          { 'inventory.batches': { $elemMatch: { quantity: { $lte: 0 } } } },
          { 'variants.batches': { $elemMatch: { quantity: { $lte: 0 } } } }
        ]
      },
      {
        $pull: {
          'inventory.$[].batches': { quantity: { $lte: 0 } },
          'variants.$[].batches': { quantity: { $lte: 0 } }
        }
      }
    );
    console.log(`Cleanup completed. Adjusted ${result.modifiedCount} products.`);
  } catch (error) {
    console.error('Batch cleanup failed:', error);
  }
}

module.exports = cleanupEmptyBatches;

// Run standalone if executed directly via Node
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Please set MONGODB_URI to execute standalone');
    process.exit(1);
  }
  mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => cleanupEmptyBatches())
    .then(() => process.exit(0))
    .catch(console.error);
}
