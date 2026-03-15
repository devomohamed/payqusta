jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('../../src/models/PaymentTransaction', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../src/models/Invoice', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/config/paymentGateways', () => ({
  paymob: {
    enabled: true,
    apiKey: 'paymob-api-key',
    apiUrl: 'https://accept.paymob.test/api',
    integrationId: 123,
    iframeId: 456,
    hmacSecret: '',
  },
  fawry: {
    enabled: true,
    merchantCode: 'FAWRY-001',
    paymentCodeLabel: '????? ???????',
    branchHint: '?? ?? ???? ????',
    webhookSecret: '',
  },
  vodafoneCash: {
    enabled: true,
    number: '01000000000',
    accountName: 'PayQusta',
    webhookSecret: '',
  },
  instaPay: {
    enabled: true,
    account: 'payqusta@instapay',
    accountName: 'PayQusta',
    bankName: 'NBE',
    webhookSecret: '',
  },
  settings: {
    linkExpiryHours: 24,
    earlyPaymentDiscount: 0,
    feesOnCustomer: false,
    currency: 'EGP',
  },
  getEnabledGateways: jest.fn(() => ['paymob']),
  hasEnabledGateway: jest.fn(() => true),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const axios = require('axios');
const PaymentTransaction = require('../../src/models/PaymentTransaction');
const paymentGatewayService = require('../../src/services/PaymentGatewayService');

describe('PaymentGatewayService refunds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('captures the actual Paymob transaction id from webhook payloads for later refunds', async () => {
    const transaction = {
      transactionId: 'TXN-100',
      gatewayOrderId: null,
      gatewayTransactionId: '5001',
      markAsSuccess: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
    };
    PaymentTransaction.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(transaction),
    });

    jest.spyOn(paymentGatewayService, 'verifyPaymobHMAC').mockReturnValue(true);
    const updateInvoicePaymentSpy = jest
      .spyOn(paymentGatewayService, 'updateInvoicePayment')
      .mockResolvedValue(true);

    await paymentGatewayService.processPaymobWebhook({
      obj: {
        order: 5001,
        id: 9001,
        success: true,
      },
    });

    expect(PaymentTransaction.findOne).toHaveBeenCalledWith({
      $or: [
        { gatewayOrderId: '5001' },
        { gatewayTransactionId: '5001' },
      ],
    });
    expect(transaction.gatewayOrderId).toBe('5001');
    expect(transaction.gatewayTransactionId).toBe('9001');
    expect(transaction.markAsSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9001 })
    );
    expect(updateInvoicePaymentSpy).toHaveBeenCalledWith(transaction);
    expect(transaction.save).toHaveBeenCalled();
  });

  it('creates a signed public payment page for Fawry instructions', async () => {
    const transaction = {
      _id: '507f191e810c19729de860ea',
      transactionId: 'TXN-FAWRY-1',
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };

    const paymentLink = await paymentGatewayService.createFawryLink(transaction, {});

    expect(transaction.gatewayTransactionId).toBe('TXN-FAWRY-1');
    expect(transaction.gatewayOrderId).toBe('TXN-FAWRY-1');
    expect(transaction.status).toBe('processing');
    expect(transaction.save).toHaveBeenCalled();
    expect(paymentLink).toContain('/payment/fawry/507f191e810c19729de860ea?access=');
  });

  it('returns a sanitized public payment session when the access token is valid', async () => {
    const id = '507f191e810c19729de860eb';

    PaymentTransaction.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: id,
          transactionId: 'TXN-2',
          gateway: 'instapay',
          status: 'processing',
          amount: 150,
          fees: 0,
          discount: 0,
          netAmount: 150,
          currency: 'EGP',
          linkExpiresAt: new Date('2026-03-15T10:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-03-14T09:00:00.000Z'),
          paymentLink: `http://localhost:5173/payment/instapay/${id}`,
          invoice: { invoiceNumber: 'INV-22' },
          customer: { name: 'Customer 1' },
        }),
      }),
    });

    const result = await paymentGatewayService.getPublicPaymentSession(
      id,
      paymentGatewayService.createPublicAccessToken(id)
    );

    expect(result).toEqual(
      expect.objectContaining({
        id,
        transactionId: 'TXN-2',
        gateway: 'instapay',
        invoiceNumber: 'INV-22',
      })
    );
    expect(result.paymentMeta).toEqual(
      expect.objectContaining({
        providerName: 'InstaPay',
        referenceValue: 'TXN-2',
      })
    );
  });

  it('marks Fawry transactions as successful and updates the invoice once', async () => {
    const transaction = {
      transactionId: 'TXN-FAWRY-2',
      status: 'processing',
      gatewayOrderId: null,
      gatewayTransactionId: null,
      markAsSuccess: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
    };
    PaymentTransaction.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(transaction),
    });

    const updateInvoicePaymentSpy = jest
      .spyOn(paymentGatewayService, 'updateInvoicePayment')
      .mockResolvedValue(true);

    await paymentGatewayService.processFawryWebhook({
      referenceNumber: 'TXN-FAWRY-2',
      paymentId: 'FW-900',
      status: 'PAID',
    });

    expect(transaction.gatewayOrderId).toBe('TXN-FAWRY-2');
    expect(transaction.gatewayTransactionId).toBe('FW-900');
    expect(transaction.markAsSuccess).toHaveBeenCalled();
    expect(updateInvoicePaymentSpy).toHaveBeenCalledWith(transaction);
  });

  it('submits refunds to Paymob when the transaction has a valid gateway transaction id', async () => {
    const transaction = {
      gateway: 'paymob',
      gatewayTransactionId: '9001',
      amount: 120,
      discount: 0,
      getCapturedAmount: jest.fn(() => 120),
      getRefundableAmount: jest.fn(() => 120),
      refund: jest.fn().mockResolvedValue(true),
    };

    axios.post
      .mockResolvedValueOnce({ data: { token: 'auth-token' } })
      .mockResolvedValueOnce({ data: { id: 'rf-1', success: true } });

    const result = await paymentGatewayService.refundPaymobTransaction(transaction, {
      amount: 50,
      reason: 'Customer requested refund',
      userId: 'user-1',
      metadata: { source: 'unit-test' },
    });

    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      'https://accept.paymob.test/api/auth/tokens',
      { api_key: 'paymob-api-key' }
    );
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      'https://accept.paymob.test/api/acceptance/void_refund/refund',
      {
        auth_token: 'auth-token',
        transaction_id: 9001,
        amount_cents: 5000,
      }
    );
    expect(transaction.refund).toHaveBeenCalledWith(
      'user-1',
      'Customer requested refund',
      50,
      expect.objectContaining({
        source: 'unit-test',
        provider: 'paymob',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        processed: true,
        mode: 'gateway',
        amount: 50,
      })
    );
  });

  it('falls back to manual handling when the gateway transaction id is not valid', async () => {
    const transaction = {
      gateway: 'paymob',
      gatewayTransactionId: 'invalid-id',
      amount: 100,
      discount: 0,
      getCapturedAmount: jest.fn(() => 100),
      getRefundableAmount: jest.fn(() => 100),
      refund: jest.fn(),
    };

    const result = await paymentGatewayService.refundPaymobTransaction(transaction, {
      amount: 25,
      reason: 'Invalid gateway id',
    });

    expect(result).toEqual(
      expect.objectContaining({
        processed: false,
        mode: 'manual',
      })
    );
    expect(axios.post).not.toHaveBeenCalled();
    expect(transaction.refund).not.toHaveBeenCalled();
  });

  it('returns a manual fallback for unsupported gateways', async () => {
    const result = await paymentGatewayService.refundTransaction({
      gateway: 'fawry',
    }, {
      amount: 20,
    });

    expect(result).toEqual(
      expect.objectContaining({
        processed: false,
        mode: 'manual',
      })
    );
  });
});
