const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const SystemConfig = require('../models/SystemConfig');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');
const NotificationService = require('../services/NotificationService');

const normalizeGatewaySecretKey = (gateway) => (
    String(gateway || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
);

const safeCompare = (provided, expected) => {
    if (!provided || !expected) return false;

    const left = Buffer.from(String(provided));
    const right = Buffer.from(String(expected));

    if (left.length !== right.length) return false;

    return crypto.timingSafeEqual(left, right);
};

class SubscriptionController {
    ensureSystemConfig = async () => {
        let config = await SystemConfig.findOne({ key: 'default' });
        if (!config) {
            config = await SystemConfig.create({
                key: 'default',
                payments: {
                    stripe: { enabled: false, configured: false, label: 'Stripe' },
                    paymob: { enabled: false, configured: false, label: 'Paymob' },
                    instapay: { enabled: true, configured: true, label: 'InstaPay', account: 'payqusta@instapay' },
                    vodafone_cash: { enabled: true, configured: true, label: 'Vodafone Cash', number: '01000000000' },
                },
            });
        }
        return config;
    };

    getAvailable = (config) => {
        const payments = config?.payments || {};
        const flags = {
            stripe: !!(payments.stripe?.enabled && payments.stripe?.configured),
            paymob: !!(payments.paymob?.enabled && payments.paymob?.configured),
            instapay: !!(payments.instapay?.enabled && payments.instapay?.configured),
            vodafone_cash: !!(payments.vodafone_cash?.enabled && payments.vodafone_cash?.configured),
        };
        return Object.keys(flags).filter((k) => flags[k]);
    };

    resolveWebhookSecret = (gateway) => {
        const normalizedGateway = normalizeGatewaySecretKey(gateway);
        return (
            process.env[`SUBSCRIPTION_${normalizedGateway}_WEBHOOK_SECRET`] ||
            process.env.SUBSCRIPTION_WEBHOOK_SECRET ||
            ''
        ).trim();
    };

    verifyWebhookRequest = (gateway, req) => {
        const configuredSecret = this.resolveWebhookSecret(gateway);
        if (!configuredSecret) {
            throw new AppError('Subscription webhook secret is not configured', 503, 'WEBHOOK_SECRET_NOT_CONFIGURED');
        }

        const authorizationHeader = String(req.headers.authorization || '').trim();
        const bearerToken = authorizationHeader.startsWith('Bearer ')
            ? authorizationHeader.slice('Bearer '.length).trim()
            : '';
        const providedSecret =
            req.headers['x-subscription-webhook-secret'] ||
            req.headers['x-webhook-secret'] ||
            bearerToken ||
            req.query.secret ||
            req.body?.secret ||
            '';

        if (!safeCompare(providedSecret, configuredSecret)) {
            throw AppError.forbidden('Subscription webhook is not authorized');
        }
    };

    /**
     * GET /api/v1/subscriptions/payment-methods
     */
    getPaymentMethods = catchAsync(async (req, res) => {
        const config = await this.ensureSystemConfig();
        const available = this.getAvailable(config);

        ApiResponse.success(res, {
            methods: [
                {
                    key: 'stripe',
                    label: config.payments?.stripe?.label || 'Stripe',
                    available: available.includes('stripe'),
                },
                {
                    key: 'paymob',
                    label: config.payments?.paymob?.label || 'Paymob',
                    available: available.includes('paymob'),
                },
                {
                    key: 'instapay',
                    label: config.payments?.instapay?.label || 'InstaPay',
                    available: available.includes('instapay'),
                    account: config.payments?.instapay?.account || '',
                },
                {
                    key: 'vodafone_cash',
                    label: config.payments?.vodafone_cash?.label || 'Vodafone Cash',
                    available: available.includes('vodafone_cash'),
                    number: config.payments?.vodafone_cash?.number || '',
                },
            ],
            availableMethods: available,
        });
    });

    /**
     * POST /api/v1/subscriptions/subscribe
     * Creates a checkout session or returns payment link based on selected gateway
     */
    subscribe = catchAsync(async (req, res, next) => {
        const { planId } = req.body;
        let { gateway } = req.body;
        const vendorId = req.user.id;
        const supportedGateways = ['stripe', 'paymob', 'instapay', 'vodafone_cash'];

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return next(AppError.notFound('الباقة غير متاحة'));
        }

        const config = await this.ensureSystemConfig();
        const available = this.getAvailable(config);
        if (available.length === 0) {
            return next(
                AppError.badRequest('لا توجد بوابات دفع مفعلة حاليا. يرجى من صاحب النظام تفعيل InstaPay أو Vodafone Cash.')
            );
        }

        if (!gateway) {
            const priority = ['stripe', 'paymob', 'instapay', 'vodafone_cash'];
            gateway = priority.find((g) => available.includes(g));
        }

        if (!supportedGateways.includes(gateway)) {
            return next(AppError.badRequest('بوابة الدفع غير مدعومة'));
        }
        if (!available.includes(gateway)) {
            return next(AppError.badRequest(`بوابة الدفع "${gateway}" غير مفعلة. المتاح: ${available.join(', ')}`));
        }

        const tenantRaw = await Tenant.findOne({ owner: vendorId }).lean();
        if (!tenantRaw) {
            return next(AppError.notFound('لم يتم العثور على المتجر الخاص بك'));
        }

        const mongoose = require('mongoose');
        if (tenantRaw.subscription?.plan && !mongoose.isValidObjectId(tenantRaw.subscription.plan)) {
            await Tenant.updateOne({ _id: tenantRaw._id }, { $set: { 'subscription.plan': null } });
        }

        const tenant = await Tenant.findById(tenantRaw._id);
        if (!tenant) {
            return next(AppError.notFound('لم يتم العثور على المتجر الخاص بك'));
        }

        let paymentLink = '';
        const transactionReference = `SUB-${tenant._id}-${Date.now()}`;

        switch (gateway) {
            case 'stripe':
                paymentLink = `https://checkout.stripe.com/pay/${transactionReference}`;
                break;
            case 'paymob':
                paymentLink = `https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=${transactionReference}`;
                break;
            case 'vodafone_cash':
                paymentLink = `vfcash://pay?to=${encodeURIComponent(config.payments?.vodafone_cash?.number || '')}&amount=${plan.price}`;
                break;
            case 'instapay':
                paymentLink = `instapay://pay?ipa=${encodeURIComponent(config.payments?.instapay?.account || '')}&amount=${plan.price}`;
                break;
            default:
                break;
        }

        tenant.subscription.gateway = gateway;
        await tenant.save();

        ApiResponse.success(
            res,
            {
                paymentLink,
                transactionReference,
                amount: plan.price,
                currency: plan.currency,
                gateway,
                paymentMeta:
                    gateway === 'instapay'
                        ? { account: config.payments?.instapay?.account || '' }
                        : gateway === 'vodafone_cash'
                            ? { number: config.payments?.vodafone_cash?.number || '' }
                            : {},
            },
            'تم إنشاء طلب الاشتراك بنجاح. يرجى إتمام الدفع.'
        );
    });

    /**
     * POST /api/v1/subscriptions/webhook/:gateway
     */
    handleWebhook = catchAsync(async (req, res) => {
        const { gateway } = req.params;
        const payload = req.body;
        this.verifyWebhookRequest(gateway, req);

        try {
            let isSuccess = false;
            let tenantId = null;
            let planId = null;

            if (gateway === 'stripe') {
                isSuccess = payload.type === 'checkout.session.completed';
                tenantId = payload.data?.object?.client_reference_id;
                planId = payload.data?.object?.metadata?.planId;
            } else if (gateway === 'paymob') {
                isSuccess = payload.obj?.success === true;
                tenantId = payload.obj?.order?.merchant_order_id?.split('-')[1];
                planId = payload.obj?.order?.items?.[0]?.description;
            } else if (gateway === 'vodafone_cash' || gateway === 'instapay') {
                isSuccess = payload.status === 'success';
                tenantId = payload.tenantId;
                planId = payload.planId;
            }

            if (isSuccess && tenantId && planId) {
                const tenant = await Tenant.findById(tenantId);
                const plan = await Plan.findById(planId);

                if (tenant && plan) {
                    tenant.subscription.plan = plan._id;
                    tenant.subscription.status = 'active';
                    tenant.subscription.gateway = gateway;

                    const startDate = new Date();
                    const endDate = new Date(startDate);
                    if (plan.billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
                    else endDate.setMonth(endDate.getMonth() + 1);

                    tenant.subscription.currentPeriodStart = startDate;
                    tenant.subscription.currentPeriodEnd = endDate;
                    tenant.subscription.maxProducts = plan.limits.maxProducts;
                    tenant.subscription.maxCustomers = plan.limits.maxCustomers;
                    tenant.subscription.maxUsers = plan.limits.maxUsers;
                    tenant.subscription.maxBranches = plan.limits.maxBranches;
                    await tenant.save();
                }
            }

            res.status(200).json({ received: true });
        } catch (error) {
            res.status(400).send(`Webhook Error: ${error.message}`);
        }
    });

    /**
     * GET /api/v1/subscriptions/my-subscription
     */
    getMySubscription = catchAsync(async (req, res, next) => {
        const mongoose = require('mongoose');
        const tenantRaw = await Tenant.findOne({ owner: req.user.id }).lean();
        if (!tenantRaw) return next(AppError.notFound('المتجر غير موجود'));

        if (tenantRaw.subscription?.plan && !mongoose.isValidObjectId(tenantRaw.subscription.plan)) {
            await Tenant.updateOne({ _id: tenantRaw._id }, { $set: { 'subscription.plan': null } });
        }

        const tenant = await Tenant.findById(tenantRaw._id).populate('subscription.plan');
        if (!tenant) return next(AppError.notFound('المتجر غير موجود'));

        ApiResponse.success(res, tenant.subscription);
    });

    /**
     * POST /api/v1/subscriptions/submit-receipt
     * Uploads a receipt for manual payment gateways (instapay, vodafone_cash)
     */
    submitReceipt = catchAsync(async (req, res, next) => {
        const { planId, gateway, receiptImage } = req.body;
        const vendorId = req.user.id;
        const supportedGateways = ['instapay', 'vodafone_cash'];

        if (!supportedGateways.includes(gateway)) {
            return next(AppError.badRequest('بوابة الدفع هذه لا تتطلب إيصال يدوي'));
        }

        if (!receiptImage) {
            return next(AppError.badRequest('صورة الإيصال مطلوبة'));
        }

        // --- Security Check: Validate Base64 Image Pattern ---
        const base64Regex = /^data:image\/(png|jpeg|jpg|webp);base64,/;
        if (!base64Regex.test(receiptImage)) {
            return next(AppError.badRequest('صيغة ملف غير صالحة. يرجى رفع صورة فقط (PNG, JPEG, WebP)'));
        }

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return next(AppError.notFound('الباقة غير متاحة'));
        }

        const tenant = await Tenant.findOne({ owner: vendorId });
        if (!tenant) {
            return next(AppError.notFound('لم يتم العثور على المتجر الخاص بك'));
        }

        // Check if there's already a pending request for this tenant
        const existingRequest = await SubscriptionRequest.findOne({
            tenant: tenant._id,
            status: 'pending'
        });

        if (existingRequest) {
            return next(AppError.badRequest('لديك طلب اشتراك قيد المراجعة بالفعل. يرجى الانتظار لحين مراجعته.'));
        }

        // Process image size limitation (prevent too large base64)
        if (receiptImage.length > 5 * 1024 * 1024) { // Roughly 3.7MB file size
            return next(AppError.badRequest('حجم الصورة كبير جداً، يرجى رفع صورة أصغر'));
        }

        const request = await SubscriptionRequest.create({
            tenant: tenant._id,
            plan: plan._id,
            gateway,
            receiptImage,
            status: 'pending'
        });

        // Notify super admin that a new receipt was submitted for review
        NotificationService.onNewSubscriptionRequest(
            tenant._id,
            tenant.name,
            plan.name,
            `${plan.price} ${plan.currency || 'EGP'}`
        ).catch(() => { });

        ApiResponse.success(
            res,
            { requestId: request._id },
            'تم إرسال إيصال الدفع بنجاح. سيتم مراجعته وتفعيل اشتراكك قريباً.'
        );
    });
}

module.exports = new SubscriptionController();
