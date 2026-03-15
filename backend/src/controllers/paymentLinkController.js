const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const paymentGatewayService = require('../services/PaymentGatewayService');

const normalizeGateway = (gateway) => {
    const normalizedGateway = String(gateway || '').trim().toLowerCase();

    if (normalizedGateway === 'vodafone_cash') return 'vodafone';
    return normalizedGateway;
};

class PaymentLinkController {
    /**
     * POST /api/v1/invoices/:id/payment-link
     * Backward-compatible invoice payment-link endpoint.
     * Delegates to the unified PaymentGatewayService flow used elsewhere.
     */
    generateLink = catchAsync(async (req, res, next) => {
        const { id: invoiceId } = req.params;
        const { gateway, amount, applyDiscount } = req.body || {};
        const tenantId = req.user?.tenant || req.tenantId || req.tenant?._id;
        const normalizedGateway = normalizeGateway(gateway);

        if (!['paymob', 'fawry', 'instapay', 'vodafone'].includes(normalizedGateway)) {
            return next(AppError.badRequest('بوابة الدفع غير مدعومة'));
        }

        const invoice = await Invoice.findOne({ _id: invoiceId, tenant: tenantId });
        if (!invoice) {
            return next(AppError.notFound('فاتورة غير موجودة'));
        }

        if (invoice.remainingAmount <= 0) {
            return next(AppError.badRequest('الفاتورة مسددة بالكامل'));
        }

        const result = await paymentGatewayService.createPaymentLink(
            invoice._id.toString(),
            normalizedGateway,
            {
                amount,
                applyDiscount,
                userId: req.user?._id,
            }
        );

        invoice.paymentLink = result.paymentLink;
        invoice.gatewayFees = Number(result.transaction?.fees || 0);
        invoice.paymentAttempts.push({
            date: new Date(),
            gateway: normalizedGateway,
            status: 'pending',
            transactionId: result.transaction?.transactionId || '',
        });
        await invoice.save({ validateBeforeSave: false });

        return ApiResponse.success(res, {
            ...result,
            gateway: normalizedGateway,
            paymentUrl: result.paymentLink,
            originalAmount: Number(result.transaction?.amount || invoice.remainingAmount),
            additionalFees: Number(result.transaction?.fees || 0),
            totalAmountToPay: Number(result.transaction?.netAmount || 0),
            transactionReference: result.transaction?.transactionId || '',
        }, 'تم إنشاء رابط الدفع بنجاح.');
    });
}

module.exports = new PaymentLinkController();
