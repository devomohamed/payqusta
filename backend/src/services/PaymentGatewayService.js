/**
 * Payment Gateway Service - Multi-Gateway Support
 * Supports: Paymob, Fawry, Vodafone Cash, InstaPay
 */

const axios = require('axios');
const crypto = require('crypto');
const PaymentTransaction = require('../models/PaymentTransaction');
const Invoice = require('../models/Invoice');
const gateways = require('../config/paymentGateways');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const safeEqual = (left, right) => {
  if (!left || !right) return false;

  const normalizedLeft = Buffer.from(String(left));
  const normalizedRight = Buffer.from(String(right));

  if (normalizedLeft.length !== normalizedRight.length) return false;

  return crypto.timingSafeEqual(normalizedLeft, normalizedRight);
};

class PaymentGatewayService {
  getGatewayConfig(gateway) {
    const normalizedGateway = String(gateway || '').toLowerCase();

    if (normalizedGateway === 'vodafone') return gateways.vodafoneCash;
    if (normalizedGateway === 'instapay') return gateways.instaPay;

    return gateways[normalizedGateway];
  }

  async authenticatePaymob() {
    const config = gateways.paymob;

    if (!config?.apiKey) {
      throw AppError.badRequest('بيانات Paymob غير مكتملة لتنفيذ الاسترداد');
    }

    const authResponse = await axios.post(`${config.apiUrl}/auth/tokens`, {
      api_key: config.apiKey
    });

    return authResponse.data?.token;
  }

  /**
   * Create a payment link for an invoice
   */
  async createPaymentLink(invoiceId, gateway, options = {}) {
    const {
      amount,
      applyDiscount = false,
      userId,
      customerPhone,
      customerEmail
    } = options;

    const gatewayConfig = this.getGatewayConfig(gateway);

    // Validate gateway
    if (!gatewayConfig || !gatewayConfig.enabled) {
      throw AppError.badRequest(`بوابة الدفع ${gateway} غير مفعلة`);
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('customer')
      .populate('tenant');
    
    if (!invoice) {
      throw AppError.notFound('الفاتورة غير موجودة');
    }

    // Calculate amounts
    const paymentAmount = amount || invoice.totalAmount - invoice.paidAmount;
    let discount = 0;
    
    if (applyDiscount) {
      // Apply early payment discount if payment is before due date
      const today = new Date();
      const dueDate = new Date(invoice.dueDate);
      
      if (today < dueDate) {
        discount = (paymentAmount * gateways.settings.earlyPaymentDiscount) / 100;
      }
    }

    // Calculate fees
    const feePercentage = gatewayConfig.fees;
    let fees = (paymentAmount * feePercentage) / 100;
    
    // If fees on merchant, set to 0 for customer
    if (!gateways.settings.feesOnCustomer) {
      fees = 0;
    }

    const netAmount = paymentAmount - discount + fees;

    // Create transaction record
    const transaction = await PaymentTransaction.create({
      invoice: invoice._id,
      customer: invoice.customer._id,
      tenant: invoice.tenant,
      createdBy: userId,
      gateway,
      amount: paymentAmount,
      fees: gateways.settings.feesOnCustomer ? fees : 0,
      discount,
      netAmount,
      currency: gateways.settings.currency,
      customerPhone: customerPhone || invoice.customer.phone,
      customerEmail: customerEmail || invoice.customer.email,
      linkExpiresAt: new Date(Date.now() + gateways.settings.linkExpiryHours * 60 * 60 * 1000),
      metadata: {
        source: 'web',
        feesOnMerchant: !gateways.settings.feesOnCustomer
      }
    });

    // Generate payment link based on gateway
    let paymentLink;
    
    try {
      switch (gateway) {
        case 'paymob':
          paymentLink = await this.createPaymobLink(transaction, invoice);
          break;
        
        case 'fawry':
          paymentLink = await this.createFawryLink(transaction, invoice);
          break;
        
        case 'vodafone':
          paymentLink = await this.createVodafoneLink(transaction, invoice);
          break;
        
        case 'instapay':
          paymentLink = await this.createInstaPayLink(transaction, invoice);
          break;
        
        default:
          throw AppError.badRequest('بوابة دفع غير مدعومة');
      }
    } catch (error) {
      // Mark transaction as failed
      transaction.status = 'failed';
      transaction.notes = error.message;
      await transaction.save();
      throw error;
    }

    // Save payment link
    transaction.paymentLink = paymentLink;
    await transaction.save();

    logger.info(`Payment link created: ${transaction.transactionId} for invoice ${invoice.invoiceNumber}`);

    return {
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        fees: transaction.fees,
        discount: transaction.discount,
        netAmount: transaction.netAmount,
        gateway: transaction.gateway,
        expiresAt: transaction.linkExpiresAt
      },
      paymentLink,
      expiresAt: transaction.linkExpiresAt
    };
  }

  /**
   * Create Paymob payment link
   */
  async createPaymobLink(transaction, invoice) {
    const config = gateways.paymob;

    try {
      // Step 1: Authentication
      const authResponse = await axios.post(`${config.apiUrl}/auth/tokens`, {
        api_key: config.apiKey
      });

      const authToken = authResponse.data.token;

      // Step 2: Register Order
      const orderResponse = await axios.post(`${config.apiUrl}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(transaction.netAmount * 100), // Convert to cents
        currency: transaction.currency,
        merchant_order_id: transaction.transactionId,
        items: [{
          name: `فاتورة ${invoice.invoiceNumber}`,
          amount_cents: Math.round(transaction.amount * 100),
          description: `دفع قسط للفاتورة ${invoice.invoiceNumber}`,
          quantity: 1
        }]
      });

      const orderId = orderResponse.data.id;

      // Step 3: Get Payment Key
      const paymentKeyResponse = await axios.post(`${config.apiUrl}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: Math.round(transaction.netAmount * 100),
        expiration: gateways.settings.linkExpiryHours * 3600,
        order_id: orderId,
        billing_data: {
          apartment: 'NA',
          email: transaction.customerEmail || 'customer@payqusta.com',
          floor: 'NA',
          first_name: invoice.customer.name.split(' ')[0] || 'Customer',
          street: 'NA',
          building: 'NA',
          phone_number: transaction.customerPhone,
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'EG',
          last_name: invoice.customer.name.split(' ').slice(1).join(' ') || 'Name',
          state: 'NA'
        },
        currency: transaction.currency,
        integration_id: config.integrationId
      });

      const paymentToken = paymentKeyResponse.data.token;

      // Save gateway transaction ID
      transaction.gatewayOrderId = orderId.toString();
      transaction.gatewayTransactionId = orderId.toString();
      transaction.status = 'processing';
      await transaction.save();

      // Return iframe URL
      return `https://accept.paymob.com/api/acceptance/iframes/${config.iframeId}?payment_token=${paymentToken}`;
    } catch (error) {
      logger.error('Paymob error:', error.response?.data || error.message);
      throw AppError.badRequest('فشل إنشاء رابط الدفع من Paymob: ' + (error.response?.data?.detail || error.message));
    }
  }

  /**
   * Create Fawry payment link (simplified version)
   */
  async createFawryLink(transaction, invoice) {
    const config = gateways.fawry;

    try {
      const referenceNumber = transaction.transactionId;
      
      // For now, return a placeholder
      // Full Fawry integration requires merchant setup
      transaction.gatewayTransactionId = referenceNumber;
      transaction.status = 'processing';
      await transaction.save();

      // Return Fawry payment instruction page
      return `${process.env.APP_URL || 'http://localhost:5173'}/payment/fawry/${transaction._id}`;
    } catch (error) {
      logger.error('Fawry error:', error);
      throw AppError.badRequest('فشل إنشاء رابط الدفع من Fawry');
    }
  }

  /**
   * Create Vodafone Cash payment link (simplified)
   */
  async createVodafoneLink(transaction, invoice) {
    // Placeholder implementation
    transaction.gatewayTransactionId = transaction.transactionId;
    transaction.status = 'processing';
    await transaction.save();

    return `${process.env.APP_URL || 'http://localhost:5173'}/payment/vodafone/${transaction._id}`;
  }

  /**
   * Create InstaPay payment link (simplified)
   */
  async createInstaPayLink(transaction, invoice) {
    // Placeholder implementation
    transaction.gatewayTransactionId = transaction.transactionId;
    transaction.status = 'processing';
    await transaction.save();

    return `${process.env.APP_URL || 'http://localhost:5173'}/payment/instapay/${transaction._id}`;
  }

  /**
   * Verify Paymob HMAC signature
   */
  verifyPaymobHMAC(data) {
    const config = gateways.paymob;
    
    if (!config.hmacSecret) {
      logger.warn('Paymob HMAC secret not configured');
      return true; // Skip verification if not configured
    }

    const concatenated = [
      data.amount_cents,
      data.created_at,
      data.currency,
      data.error_occured,
      data.has_parent_transaction,
      data.id,
      data.integration_id,
      data.is_3d_secure,
      data.is_auth,
      data.is_capture,
      data.is_refunded,
      data.is_standalone_payment,
      data.is_voided,
      data.order,
      data.owner,
      data.pending,
      data.source_data_pan,
      data.source_data_sub_type,
      data.source_data_type,
      data.success
    ].join('');

    const calculatedHMAC = crypto
      .createHmac('sha512', config.hmacSecret)
      .update(concatenated)
      .digest('hex');

    return safeEqual(calculatedHMAC, data.hmac);
  }

  /**
   * Process payment webhook
   */
  async processWebhook(gateway, data) {
    let transaction;

    switch (gateway) {
      case 'paymob':
        transaction = await this.processPaymobWebhook(data);
        break;
      
      case 'fawry':
        transaction = await this.processFawryWebhook(data);
        break;
      
      case 'vodafone':
        transaction = await this.processVodafoneWebhook(data);
        break;
      
      case 'instapay':
        transaction = await this.processInstaPayWebhook(data);
        break;
      
      default:
        throw AppError.badRequest('بوابة دفع غير مدعومة');
    }

    return transaction;
  }

  /**
   * Process Paymob webhook
   */
  async processPaymobWebhook(data) {
    // Verify HMAC
    if (!this.verifyPaymobHMAC(data.obj)) {
      logger.error('Invalid Paymob HMAC signature');
      throw AppError.forbidden('Invalid HMAC signature');
    }

    // Find transaction by order ID
    const paymobOrderId = data.obj.order.toString();
    const transaction = await PaymentTransaction.findOne({
      $or: [
        { gatewayOrderId: paymobOrderId },
        { gatewayTransactionId: paymobOrderId },
      ],
    }).populate('invoice customer');

    if (!transaction) {
      logger.error(`Transaction not found for order: ${data.obj.order}`);
      throw AppError.notFound('Transaction not found');
    }

    // Update transaction
    if (data.obj.success === 'true' || data.obj.success === true) {
      transaction.gatewayOrderId = transaction.gatewayOrderId || paymobOrderId;
      if (data.obj.id) {
        transaction.gatewayTransactionId = data.obj.id.toString();
      }
      await transaction.markAsSuccess(data.obj);
      
      // Update invoice
      await this.updateInvoicePayment(transaction);
      
      logger.info(`Payment successful: ${transaction.transactionId}`);
    } else {
      await transaction.markAsFailed('Payment failed from gateway', data.obj);
      logger.warn(`Payment failed: ${transaction.transactionId}`);
    }

    transaction.webhookData = data;
    await transaction.save();

    return transaction;
  }

  supportsGatewayRefund(gateway) {
    return String(gateway || '').toLowerCase() === 'paymob';
  }

  async refundPaymobTransaction(transaction, { amount, reason = '', userId = null, metadata = {} } = {}) {
    const config = gateways.paymob;
    const capturedAmount = typeof transaction.getCapturedAmount === 'function'
      ? transaction.getCapturedAmount()
      : Math.max(0, (Number(transaction.amount) || 0) - (Number(transaction.discount) || 0));
    const refundableAmount = typeof transaction.getRefundableAmount === 'function'
      ? transaction.getRefundableAmount()
      : capturedAmount;
    const refundAmount = Math.min(refundableAmount, Math.max(0, Number(amount) || 0));

    if (refundAmount <= 0) {
      return { processed: false, mode: 'manual', reason: 'لا يوجد رصيد قابل للاسترداد' };
    }

    if (!config?.enabled || !config?.apiKey) {
      return { processed: false, mode: 'manual', reason: 'Paymob غير مفعل أو بياناته غير مكتملة' };
    }

    const paymobTransactionId = Number(transaction.gatewayTransactionId);
    if (!Number.isFinite(paymobTransactionId) || paymobTransactionId <= 0) {
      return { processed: false, mode: 'manual', reason: 'لا يوجد رقم معاملة Paymob صالح للاسترداد' };
    }

    const authToken = await this.authenticatePaymob();
    const refundPayload = {
      auth_token: authToken,
      transaction_id: paymobTransactionId,
      amount_cents: Math.round(refundAmount * 100),
    };

    let response;
    try {
      response = await axios.post(`${config.apiUrl}/acceptance/void_refund/refund`, refundPayload);
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
      response = await axios.post(`${config.apiUrl}/acceptance/void_refund/refund/`, refundPayload);
    }

    await transaction.refund(userId, reason || 'Gateway refund', refundAmount, {
      ...metadata,
      provider: 'paymob',
      gatewayRefundResponse: response.data,
    });

    return {
      processed: true,
      mode: 'gateway',
      amount: refundAmount,
      response: response.data,
    };
  }

  async refundTransaction(transaction, options = {}) {
    const gateway = String(transaction?.gateway || '').toLowerCase();

    switch (gateway) {
      case 'paymob':
        return this.refundPaymobTransaction(transaction, options);
      default:
        return {
          processed: false,
          mode: 'manual',
          reason: `الاسترداد التلقائي غير مدعوم لبوابة ${transaction?.gateway || 'غير معروفة'}`,
        };
    }
  }

  /**
   * Process Fawry webhook (placeholder)
   */
  async processFawryWebhook(data) {
    // Implementation needed based on Fawry webhook format
    logger.info('Fawry webhook received:', data);
    return null;
  }

  /**
   * Process Vodafone webhook (placeholder)
   */
  async processVodafoneWebhook(data) {
    logger.info('Vodafone webhook received:', data);
    return null;
  }

  /**
   * Process InstaPay webhook (placeholder)
   */
  async processInstaPayWebhook(data) {
    logger.info('InstaPay webhook received:', data);
    return null;
  }

  /**
   * Update invoice with successful payment
   */
  async updateInvoicePayment(transaction) {
    const invoice = await Invoice.findById(transaction.invoice);
    
    if (!invoice) {
      logger.error(`Invoice not found: ${transaction.invoice}`);
      return;
    }

    // Add payment amount (minus discount)
    const paidAmount = transaction.amount - transaction.discount;
    invoice.paidAmount += paidAmount;

    // Update status
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partially_paid';
    }

    await invoice.save();

    logger.info(`Invoice ${invoice.invoiceNumber} updated. Paid: ${invoice.paidAmount}/${invoice.totalAmount}`);

    // TODO: Send WhatsApp notification
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    const transaction = await PaymentTransaction.findById(transactionId)
      .populate('invoice customer createdBy');
    
    if (!transaction) {
      throw AppError.notFound('المعاملة غير موجودة');
    }

    return transaction;
  }

  /**
   * Get all enabled gateways
   */
  getEnabledGateways() {
    return gateways.getEnabledGateways();
  }

  /**
   * Check if any gateway is enabled
   */
  hasEnabledGateway() {
    return gateways.hasEnabledGateway();
  }
}

module.exports = new PaymentGatewayService();
