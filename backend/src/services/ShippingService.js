/**
 * Shipping Service — Bosta API Integration
 * Handles creation, tracking, and cancellation of delivery waybills.
 */

const axios = require('axios');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

class ShippingService {
    constructor() {
        this.baseURL = process.env.BOSTA_API_URL || 'https://app.bosta.co/api/v0';
        this.apiKey = process.env.BOSTA_API_KEY; // Tenant specific keys can override this later
    }

    /**
     * Helper to get axios instance with correct headers
     */
    _getClient(customApiKey = null) {
        const key = customApiKey || this.apiKey;
        if (!key) {
            throw AppError.internal('مفتاح الربط (API Key) لشركة الشحن غير متوفر');
        }
        return axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': key,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Create a new delivery waybill in Bosta
     * @param {Object} deliveryData 
     * @param {Object} options { apiKey }
     * @returns {Object} { _id, trackingNumber }
     */
    async createDelivery(deliveryData, options = {}) {
        try {
            const client = this._getClient(options.apiKey);

            const payload = {
                type: 10, // 10 = Forward delivery
                specs: {
                    packageDetails: {
                        itemsCount: deliveryData.itemsCount || 1,
                        description: deliveryData.description || 'Items from PayQusta',
                    }
                },
                notes: deliveryData.notes || '',
                cod: deliveryData.cod || 0, // Cash on Delivery amount
                dropOffAddress: {
                    firstLine: deliveryData.address,
                    city: deliveryData.city, // Bosta requires specific city codes, we should map them or expect valid names
                    zone: deliveryData.zone || deliveryData.governorate,
                },
                receiver: {
                    firstName: deliveryData.customerName,
                    lastName: ' ', // Bosta might require both
                    phone: deliveryData.customerPhone,
                    email: deliveryData.customerEmail,
                },
                reference: deliveryData.reference, // Our Invoice Number
            };

            const response = await client.post('/deliveries', payload);

            logger.info(`[ShippingService] Bosta delivery created: ${response.data?._id}`);

            return {
                success: true,
                deliveryId: response.data._id,
                trackingNumber: response.data.trackingNumber,
                state: response.data.state,
            };
        } catch (error) {
            logger.error(`[ShippingService] Error creating Bosta delivery: ${error.response?.data?.message || error.message}`);
            throw AppError.internal(`فشل إنشاء بوليصة الشحن: ${error.response?.data?.message || 'خطأ في الاتصال بمزود الخدمة'}`);
        }
    }

    /**
     * Get tracking status of a delivery
     * @param {String} trackingNumber 
     * @param {Object} options { apiKey }
     */
    async trackDelivery(trackingNumber, options = {}) {
        try {
            const client = this._getClient(options.apiKey);
            const response = await client.get(`/deliveries/${trackingNumber}`);

            // Map Bosta states to our internal generic states
            // Bosta states: Delivered, Picked up, In Transit, Terminated, etc.
            const bostaState = response.data.state?.value;
            const mappedState = this._mapStatus(bostaState);

            return {
                success: true,
                status: mappedState,
                rawStatus: bostaState,
                history: response.data.stateHistory || [],
            };
        } catch (error) {
            logger.error(`[ShippingService] Error tracking Bosta delivery: ${error.message}`);
            throw AppError.internal('فشل الاستعلام عن حالة الشحنة');
        }
    }

    normalizeTrackingStatus(providerStatus) {
        return this._mapStatus(providerStatus);
    }

    /**
     * Maps Bosta internal states to our standard DB statuses
     */
    _mapStatus(bostaStatus) {
        if (!bostaStatus) return 'pending';
        const statusStr = String(bostaStatus).toLowerCase();

        if (statusStr.includes('delivered')) return 'delivered';
        if (statusStr.includes('picked up')) return 'picked_up';
        if (statusStr.includes('in transit') || statusStr.includes('out for delivery')) return 'in_transit';
        if (statusStr.includes('returned') || statusStr.includes('terminated') || statusStr.includes('cancelled')) return 'returned';

        return 'created'; // Created but not picked up yet
    }

    /**
     * Cancel a delivery
     */
    async cancelDelivery(deliveryId, options = {}) {
        try {
            const client = this._getClient(options.apiKey);
            await client.delete(`/deliveries/${deliveryId}`);
            return { success: true };
        } catch (error) {
            logger.error(`[ShippingService] Error cancelling Bosta delivery: ${error.message}`);
            throw AppError.internal('فشل إلغاء بوليصة الشحن');
        }
    }
}

module.exports = new ShippingService();
