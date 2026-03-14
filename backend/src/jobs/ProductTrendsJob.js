/**
 * Daily Product Trends Job â€” Cron
 * Analyzes product stock trends, calculates daily run rates,
 * and detects fast selling vs slow moving inventory.
 */

const cron = require('node-cron');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');
const {
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
} = require('../ops/runtimeState');

const PRODUCT_TRENDS_JOB = 'product_trends';

class ProductTrendsJob {
  /**
   * Start the product trends analyzer
   * Runs every night at 2:00 AM
   */
  start() {
    registerJob(PRODUCT_TRENDS_JOB, {
      schedule: '0 2 * * *',
      timezone: 'Africa/Cairo',
      category: 'analytics',
    });

    cron.schedule('0 2 * * *', () => this.analyzeTrends(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('ðŸ“ˆ Product Trends Job started');
  }

  async analyzeTrends() {
    markJobRunStarted(PRODUCT_TRENDS_JOB, { operation: 'analyzeTrends' });

    try {
      logger.info('ðŸ“ˆ Analyzing product stock trends...');

      const tenants = await Tenant.find({ isActive: true });
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let productsUpdated = 0;
      let slowMovingProducts = 0;

      for (const tenant of tenants) {
        const tenantId = tenant._id;

        const recentSales = await Invoice.aggregate([
          {
            $match: {
              tenant: tenantId,
              createdAt: { $gte: sevenDaysAgo },
              status: { $ne: 'cancelled' },
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              totalSold7Days: { $sum: '$items.quantity' },
            },
          },
        ]);

        const salesMap = {};
        recentSales.forEach((sale) => {
          salesMap[sale._id.toString()] = sale.totalSold7Days;
        });

        const products = await Product.find({ tenant: tenantId, isActive: true });

        for (const product of products) {
          const soldLast7Days = salesMap[product._id.toString()] || 0;
          const dailySalesRate = soldLast7Days / 7;

          let daysUntilStockOut = -1;
          if (dailySalesRate > 0 && product.stock.quantity > 0) {
            daysUntilStockOut = Math.floor(product.stock.quantity / dailySalesRate);
          }

          let isSlowMoving = false;

          if (soldLast7Days === 0 && product.stock.quantity > 0) {
            const soldLast30Days = await Invoice.aggregate([
              {
                $match: {
                  tenant: tenantId,
                  createdAt: { $gte: thirtyDaysAgo },
                  status: { $ne: 'cancelled' },
                  'items.product': product._id,
                },
              },
              { $count: 'sales' },
            ]);

            if (soldLast30Days.length === 0) {
              isSlowMoving = true;
              slowMovingProducts += 1;
            }
          }

          await Product.findByIdAndUpdate(product._id, {
            $set: {
              'metrics.dailyRunRate': dailySalesRate,
              'metrics.daysUntilStockOut': daysUntilStockOut,
              'metrics.isSlowMoving': isSlowMoving,
              'metrics.lastTrendUpdate': new Date(),
            },
          }).catch((error) => logger.error(`Failed to update metrics for product ${product._id}:`, error));

          productsUpdated += 1;
        }
      }

      logger.info('âœ… Product trend analysis completed');
      markJobRunSuccess(PRODUCT_TRENDS_JOB, {
        operation: 'analyzeTrends',
        processedTenants: tenants.length,
        productsUpdated,
        slowMovingProducts,
      });
    } catch (error) {
      logger.error(`Product trends monitor error: ${error.message}`);
      markJobRunFailure(PRODUCT_TRENDS_JOB, error, {
        operation: 'analyzeTrends',
      });
    }
  }
}

module.exports = ProductTrendsJob;
