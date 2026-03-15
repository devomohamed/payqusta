/**
 * Stock Monitor Job â€” Cron
 * Monitors stock levels and sends alerts via WhatsApp
 * Handles auto-restock requests to coordinators
 */

const cron = require('node-cron');
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');
const {
  registerJob,
  markJobRunStarted,
  markJobRunSuccess,
  markJobRunFailure,
  markJobRunSkipped,
} = require('../ops/runtimeState');
const { acquireJobLock, releaseJobLock } = require('../services/jobLockService');

const STOCK_MONITOR_JOB = 'stock_monitor';

class StockMonitorJob {
  /**
   * Start the stock monitor
   * Runs every 6 hours
   */
  start() {
    registerJob(STOCK_MONITOR_JOB, {
      schedule: '0 */6 * * *',
      timezone: 'Africa/Cairo',
      category: 'inventory',
    });

    cron.schedule('0 */6 * * *', () => this.checkStockLevels(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('ðŸ“¦ Stock Monitor Job started');
  }

  async checkStockLevels() {
    const lock = await acquireJobLock({
      jobName: STOCK_MONITOR_JOB,
      leaseMs: 45 * 60 * 1000,
      metadata: { operation: 'checkStockLevels' },
    });
    if (!lock.acquired) {
      markJobRunSkipped(STOCK_MONITOR_JOB, { operation: 'checkStockLevels', reason: 'lock_not_acquired' });
      return;
    }

    markJobRunStarted(STOCK_MONITOR_JOB, { operation: 'checkStockLevels' });

    try {
      logger.info('ðŸ“¦ Checking stock levels...');

      const tenants = await Tenant.find({ isActive: true });
      let lowStockProductsCount = 0;
      let restockRequestsSent = 0;

      for (const tenant of tenants) {
        // Find low stock products
        const lowStockProducts = await Product.findLowStock(tenant._id);
        lowStockProductsCount += lowStockProducts.length;

        if (lowStockProducts.length === 0) continue;

        const vendor = await User.findOne({
          tenant: tenant._id,
          role: 'vendor',
        });

        const coordinator = await User.findOne({
          tenant: tenant._id,
          role: 'coordinator',
        });

        for (const product of lowStockProducts) {
          const isOutOfStock = product.stock.quantity <= 0;

          if (
            (isOutOfStock && !product.outOfStockAlertSent) ||
            (!isOutOfStock && !product.lowStockAlertSent)
          ) {
            try {
              if (isOutOfStock) {
                await NotificationService.onOutOfStock(tenant._id, product);
              } else {
                await NotificationService.onLowStock(tenant._id, product);
              }
            } catch (err) {
              logger.error(`Stock notification failed: ${err.message}`);
            }

            if (vendor && tenant.whatsapp?.enabled && tenant.whatsapp?.notifications?.lowStockAlert) {
              try {
                await WhatsAppService.sendLowStockAlert(
                  vendor.phone,
                  product,
                  isOutOfStock
                );
              } catch (err) {
                logger.error(`Stock alert WhatsApp failed: ${err.message}`);
              }
            }

            if (isOutOfStock) {
              product.outOfStockAlertSent = true;
            } else {
              product.lowStockAlertSent = true;
            }
          }

          if (
            product.autoRestock?.enabled &&
            coordinator &&
            product.stock.quantity <= product.stock.minQuantity
          ) {
            try {
              await WhatsAppService.sendRestockRequest(
                coordinator.phone,
                product,
                product.autoRestock.quantity,
                tenant.name
              );

              logger.info(`Restock request sent for ${product.name} to coordinator`);
              restockRequestsSent += 1;
            } catch (err) {
              logger.error(`Restock request failed: ${err.message}`);
            }
          }

          await product.save();
        }
      }

      logger.info('âœ… Stock level check completed');
      markJobRunSuccess(STOCK_MONITOR_JOB, {
        operation: 'checkStockLevels',
        processedTenants: tenants.length,
        lowStockProductsCount,
        restockRequestsSent,
      });
    } catch (error) {
      logger.error(`Stock monitor error: ${error.message}`);
      markJobRunFailure(STOCK_MONITOR_JOB, error, {
        operation: 'checkStockLevels',
      });
    } finally {
      await releaseJobLock(lock);
    }
  }
}

module.exports = StockMonitorJob;
