/**
 * Daily Product Trends Job — Cron
 * Analyzes product stock trends, calculates daily run rates,
 * and detects fast selling vs slow moving inventory.
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

class ProductTrendsJob {
    /**
     * Start the product trends analyzer
     * Runs every night at 2:00 AM
     */
    start() {
        cron.schedule('0 2 * * *', () => this.analyzeTrends(), {
            timezone: 'Africa/Cairo',
        });

        logger.info('📈 Product Trends Job started');
    }

    async analyzeTrends() {
        try {
            logger.info('📈 Analyzing product stock trends...');

            const tenants = await Tenant.find({ isActive: true });
            const now = new Date();
            // Look back 7 days for calculation
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            for (const tenant of tenants) {
                const tenantId = tenant._id;

                // 1. Calculate sales per product for the last 7 days (Daily Run Rate)
                const recentSales = await Invoice.aggregate([
                    {
                        $match: {
                            tenant: tenantId,
                            createdAt: { $gte: sevenDaysAgo },
                            status: { $ne: 'cancelled' }
                        }
                    },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.product',
                            totalSold7Days: { $sum: '$items.quantity' }
                        }
                    }
                ]);

                const salesMap = {};
                recentSales.forEach(sale => {
                    salesMap[sale._id.toString()] = sale.totalSold7Days;
                });

                // 2. Fetch all active products
                const products = await Product.find({ tenant: tenantId, isActive: true });

                for (const product of products) {
                    const soldLast7Days = salesMap[product._id.toString()] || 0;
                    const dailySalesRate = soldLast7Days / 7;

                    // Prediction: How many days until stock out?
                    let daysUntilStockOut = -1;
                    if (dailySalesRate > 0 && product.stock.quantity > 0) {
                        daysUntilStockOut = Math.floor(product.stock.quantity / dailySalesRate);
                    }

                    // Check if it's slow moving (No sales in 30 days but has stock)
                    // We need a 30 day aggregate for this specifically
                    let isSlowMoving = false;

                    // To prevent massive queries per product, we'll do a simple check.
                    // If it hasn't sold in 7 days, let's verify if it sold in 30.
                    if (soldLast7Days === 0 && product.stock.quantity > 0) {
                        const soldLast30Days = await Invoice.aggregate([
                            {
                                $match: {
                                    tenant: tenantId,
                                    createdAt: { $gte: thirtyDaysAgo },
                                    status: { $ne: 'cancelled' },
                                    'items.product': product._id
                                }
                            },
                            { $count: 'sales' }
                        ]);

                        if (soldLast30Days.length === 0) {
                            isSlowMoving = true;
                        }
                    }

                    // Update product metrics (Fire & forget to not block)
                    await Product.findByIdAndUpdate(product._id, {
                        $set: {
                            'metrics.dailyRunRate': dailySalesRate,
                            'metrics.daysUntilStockOut': daysUntilStockOut,
                            'metrics.isSlowMoving': isSlowMoving,
                            'metrics.lastTrendUpdate': new Date()
                        }
                    }).catch(e => logger.error(`Failed to update metrics for product ${product._id}:`, e));
                }

            }

            logger.info('✅ Product trend analysis completed');
        } catch (error) {
            logger.error(`Product trends monitor error: ${error.message}`);
        }
    }
}

module.exports = ProductTrendsJob;
