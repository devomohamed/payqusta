const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

class PaymentLinkController {
    /**
     * POST /api/v1/invoices/:id/payment-link
     * Generates a payment link for a specific invoice
     */
    generateLink = catchAsync(async (req, res, next) => {
        const { id: invoiceId } = req.params;
        const { gateway } = req.body; // e.g., 'stripe', 'paymob'
        const tenantId = req.tenantId || req.tenant._id;

        if (!['stripe', 'paymob', 'instapay', 'vodafone_cash'].includes(gateway)) {
            return next(AppError.badRequest('بوابة الدفع غير مدعومة'));
        }

        const invoice = await Invoice.findOne({ _id: invoiceId, tenant: tenantId });

        if (!invoice) {
            return next(AppError.notFound('فاتورة غير موجودة'));
        }

        if (invoice.remainingAmount <= 0) {
            return next(AppError.badRequest('الفاتورة مسددة بالكامل'));
        }

        // 1. Calculate Fees (Adding gateway fees to the customer amount)
        let feePercentage = 0;
        let fixedFee = 0;

        switch (gateway) {
            case 'stripe':
                feePercentage = 2.9 / 100;
                fixedFee = 3; // 3 EGP or similar context depending on currency
                break;
            case 'paymob':
                feePercentage = 2.75 / 100;
                fixedFee = 3;
                break;
            // ... configure others as needed
        }

        const originalAmount = invoice.remainingAmount;
        const additionalFees = Math.ceil((originalAmount * feePercentage) + fixedFee);
        const amountWithFees = originalAmount + additionalFees;

        let paymentLink = '';
        const transactionReference = `INV-${invoice._id}-${Date.now()}`;

        // 2. Generate Link (Mock for demonstration based on the approved plan)
        switch (gateway) {
            case 'stripe':
                paymentLink = `https://checkout.stripe.com/pay/${transactionReference}?amount=${amountWithFees}`;
                break;
            case 'paymob':
                paymentLink = `https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=${transactionReference}&amount_cents=${amountWithFees * 100}`;
                break;
            case 'vodafone_cash':
                paymentLink = `https://vfcash.mock/pay/${transactionReference}?amount=${amountWithFees}`;
                break;
            case 'instapay':
                paymentLink = `instapay://pay?ipa=payqusta@instapay&amount=${amountWithFees}`;
                break;
        }

        // Update Invoice with the generated link
        invoice.paymentLink = paymentLink;
        invoice.gatewayFees = additionalFees;

        // Add tracking attempt
        invoice.paymentAttempts.push({
            date: new Date(),
            gateway,
            status: 'pending',
            transactionId: transactionReference
        });

        await invoice.save();

        ApiResponse.success(res, {
            paymentLink,
            originalAmount,
            additionalFees,
            totalAmountToPay: amountWithFees,
            gateway,
            transactionReference
        }, 'تم إنشاء رابط الدفع بنجاح.');
    });

    /**
     * POST /api/v1/invoices/webhook/:gateway
     * Public webhook handler for invoice payments
     */
    handleWebhook = catchAsync(async (req, res, next) => {
        const { gateway } = req.params;
        const payload = req.body;

        try {
            let isSuccess = false;
            let transactionId = null;
            let invoiceId = null;
            let paidAmount = 0; // Amount with fees
            let errorMessage = '';

            // Mock parsing for Invoice Gateway Webhooks
            if (gateway === 'stripe') {
                isSuccess = payload.type === 'checkout.session.completed';
                transactionId = payload.data?.object?.id;
                invoiceId = payload.data?.object?.client_reference_id; // assuming we passed it as INV-ID-Timestamp
                if (invoiceId) invoiceId = invoiceId.split('-')[1];
                paidAmount = (payload.data?.object?.amount_total || 0) / 100;

                if (payload.type === 'payment_intent.payment_failed') {
                    isSuccess = false;
                    errorMessage = payload.data?.object?.last_payment_error?.message || 'Payment failed';
                    // Extract invoice ID from metadata if checkout session is not completed
                    invoiceId = payload.data?.object?.metadata?.invoiceId || invoiceId;
                }
            } else if (gateway === 'paymob') {
                isSuccess = payload.obj?.success === true;
                transactionId = payload.obj?.id;
                const merchant_order_id = payload.obj?.order?.merchant_order_id;
                if (merchant_order_id) invoiceId = merchant_order_id.split('-')[1];
                paidAmount = (payload.obj?.amount_cents || 0) / 100;

                if (!isSuccess && payload.type === 'TRANSACTION') {
                    errorMessage = payload.obj?.data?.message || 'Transaction declined by issuer';
                }
            }

            if (invoiceId) {
                const invoice = await Invoice.findById(invoiceId);

                if (invoice && invoice.remainingAmount > 0) {
                    if (isSuccess) {
                        // Add transaction record
                        const netAmount = paidAmount - invoice.gatewayFees;

                        await PaymentTransaction.create({
                            invoice: invoiceId,
                            tenant: invoice.tenant,
                            customer: invoice.customer,
                            transactionId: transactionId || `MOCK-${Date.now()}`,
                            gateway,
                            amount: paidAmount,
                            fees: invoice.gatewayFees,
                            netAmount: netAmount,
                            status: 'success',
                            completedAt: new Date()
                        });

                        // Apply payment to invoice
                        invoice.recordPayment(netAmount, gateway, null, transactionId);
                        await invoice.save();
                        logger.info(`[INVOICE WEBHOOK SUCCESS] Invoice ${invoiceId} paid via ${gateway}`);
                    } else if (errorMessage) {
                        // Failed Attempt
                        invoice.paymentAttempts.push({
                            date: new Date(),
                            gateway,
                            status: 'failed',
                            transactionId: transactionId || `FAILED-${Date.now()}`,
                            errorMessage
                        });
                        await invoice.save();

                        const Notification = require('../models/Notification');
                        await Notification.create({
                            tenant: invoice.tenant,
                            type: 'alert',
                            title: 'فشل عملية دفع إلكتروني',
                            message: `فشلت محاولة دفع إلكتروني للفاتورة رقـم ${invoice.invoiceNumber}. السبب: ${errorMessage}`,
                            link: `/invoices`
                        });

                        logger.error(`[INVOICE WEBHOOK FAILED] Invoice ${invoiceId} via ${gateway} - ${errorMessage}`);
                    }
                }
            }

            res.status(200).json({ received: true });
        } catch (error) {
            logger.error(`[INVOICE WEBHOOK ERROR - ${gateway}]:`, error);
            res.status(400).send(`Webhook Error: ${error.message}`);
        }
    });
}

module.exports = new PaymentLinkController();
