const SystemConfig = require('../models/SystemConfig');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

const defaultConfigPayload = {
  key: 'default',
  payments: {
    stripe: { enabled: false, configured: false, label: 'Stripe' },
    paymob: { enabled: false, configured: false, label: 'Paymob' },
    instapay: { enabled: true, configured: true, label: 'InstaPay', account: 'payqusta@instapay' },
    vodafone_cash: { enabled: true, configured: true, label: 'Vodafone Cash', number: '01000000000' },
  },
};

const normalizeAvailability = (config) => {
  const p = config?.payments || defaultConfigPayload.payments;

  const methods = [
    { key: 'stripe', available: !!(p.stripe?.enabled && p.stripe?.configured), label: p.stripe?.label || 'Stripe' },
    { key: 'paymob', available: !!(p.paymob?.enabled && p.paymob?.configured), label: p.paymob?.label || 'Paymob' },
    { key: 'instapay', available: !!(p.instapay?.enabled && p.instapay?.configured), label: p.instapay?.label || 'InstaPay', account: p.instapay?.account || '' },
    { key: 'vodafone_cash', available: !!(p.vodafone_cash?.enabled && p.vodafone_cash?.configured), label: p.vodafone_cash?.label || 'Vodafone Cash', number: p.vodafone_cash?.number || '' },
  ];

  const available = methods.filter((m) => m.available);
  return { methods, available };
};

class PaymentMethodController {
  static ensureConfig = async () => {
    let config = await SystemConfig.findOne({ key: 'default' });
    if (!config) {
      config = await SystemConfig.create(defaultConfigPayload);
    }
    return config;
  };

  getOwnerAvailableMethods = catchAsync(async (req, res) => {
    const config = await PaymentMethodController.ensureConfig();
    const { methods, available } = normalizeAvailability(config);

    ApiResponse.success(res, {
      methods,
      availableMethods: available.map((m) => m.key),
      requiresManualSetup: available.length === 0,
      fallbackMessage:
        available.length === 0
          ? 'لا توجد بوابات دفع مفعلة. يرجى تفعيل InstaPay أو Vodafone Cash من حساب صاحب النظام.'
          : null,
    });
  });

  getSuperPaymentMethods = catchAsync(async (req, res) => {
    const config = await PaymentMethodController.ensureConfig();
    ApiResponse.success(res, config);
  });

  updateSuperPaymentMethods = catchAsync(async (req, res) => {
    const { payments } = req.body || {};
    const config = await PaymentMethodController.ensureConfig();

    if (payments?.stripe) {
      config.payments.stripe.enabled = !!payments.stripe.enabled;
      config.payments.stripe.configured = !!payments.stripe.configured;
      if (payments.stripe.label !== undefined) config.payments.stripe.label = String(payments.stripe.label || 'Stripe');
    }

    if (payments?.paymob) {
      config.payments.paymob.enabled = !!payments.paymob.enabled;
      config.payments.paymob.configured = !!payments.paymob.configured;
      if (payments.paymob.label !== undefined) config.payments.paymob.label = String(payments.paymob.label || 'Paymob');
    }

    if (payments?.instapay) {
      config.payments.instapay.enabled = !!payments.instapay.enabled;
      config.payments.instapay.configured = !!payments.instapay.configured;
      if (payments.instapay.label !== undefined) config.payments.instapay.label = String(payments.instapay.label || 'InstaPay');
      if (payments.instapay.account !== undefined) config.payments.instapay.account = String(payments.instapay.account || '');
    }

    if (payments?.vodafone_cash) {
      config.payments.vodafone_cash.enabled = !!payments.vodafone_cash.enabled;
      config.payments.vodafone_cash.configured = !!payments.vodafone_cash.configured;
      if (payments.vodafone_cash.label !== undefined) config.payments.vodafone_cash.label = String(payments.vodafone_cash.label || 'Vodafone Cash');
      if (payments.vodafone_cash.number !== undefined) config.payments.vodafone_cash.number = String(payments.vodafone_cash.number || '');
    }

    await config.save();
    const { methods, available } = normalizeAvailability(config);

    ApiResponse.success(
      res,
      { config, methods, availableMethods: available.map((m) => m.key) },
      'تم تحديث طرق الدفع بنجاح'
    );
  });
}

module.exports = new PaymentMethodController();
  