jest.mock('../../src/models/PaymentTransaction', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/services/PaymentGatewayService', () => ({
  refundTransaction: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const PaymentTransaction = require('../../src/models/PaymentTransaction');
const paymentGatewayService = require('../../src/services/PaymentGatewayService');
const refundService = require('../../src/services/RefundService');

const createTransaction = (overrides = {}) => ({
  _id: 'txn-1',
  gateway: 'paymob',
  amount: 120,
  discount: 0,
  refundedAmount: 0,
  status: 'success',
  getCapturedAmount: jest.fn(() => 120),
  getRefundableAmount: jest.fn(() => 120),
  ...overrides,
});

const mockFindResult = (transactions) => ({
  sort: jest.fn().mockResolvedValue(transactions),
});

describe('RefundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes gateway refunds and marks the invoice as refunded when the target amount is fully covered', async () => {
    const transaction = createTransaction();
    PaymentTransaction.find.mockReturnValue(mockFindResult([transaction]));
    paymentGatewayService.refundTransaction.mockResolvedValue({
      processed: true,
      mode: 'gateway',
      amount: 100,
    });

    const invoice = {
      _id: 'invoice-1',
      tenant: 'tenant-1',
      refundAmount: 100,
      refundStatus: 'pending',
      returnStatus: 'approved',
      refundedAt: null,
    };

    const result = await refundService.refundInvoicePayments(invoice, {
      amount: 100,
      reason: 'Customer cancellation',
      userId: 'user-1',
      metadata: { source: 'unit-test' },
    });

    expect(paymentGatewayService.refundTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        amount: 100,
        reason: 'Customer cancellation',
        userId: 'user-1',
        metadata: { source: 'unit-test' },
      })
    );
    expect(result.mode).toBe('gateway');
    expect(result.executedAmount).toBe(100);
    expect(result.outstandingAmount).toBe(0);
    expect(result.manualFallbacks).toEqual([]);
    expect(invoice.refundStatus).toBe('refunded');
    expect(invoice.returnStatus).toBe('refunded');
    expect(invoice.refundedAt).toBeInstanceOf(Date);
  });

  it('keeps the invoice pending and reports manual fallbacks when the gateway cannot auto-refund', async () => {
    const transaction = createTransaction({
      _id: 'txn-manual',
      gateway: 'fawry',
      getRefundableAmount: jest.fn(() => 75),
    });
    PaymentTransaction.find.mockReturnValue(mockFindResult([transaction]));
    paymentGatewayService.refundTransaction.mockResolvedValue({
      processed: false,
      mode: 'manual',
      reason: 'Manual refund required',
    });

    const invoice = {
      _id: 'invoice-2',
      tenant: 'tenant-1',
      refundAmount: 75,
      refundStatus: 'none',
      returnStatus: 'approved',
      refundedAt: null,
    };

    const result = await refundService.refundInvoicePayments(invoice, {
      amount: 75,
      reason: 'Gateway unsupported',
    });

    expect(result.mode).toBe('manual');
    expect(result.executedAmount).toBe(0);
    expect(result.outstandingAmount).toBe(75);
    expect(result.manualFallbacks).toEqual([
      expect.objectContaining({
        transactionId: 'txn-manual',
        gateway: 'fawry',
        amount: 75,
      }),
    ]);
    expect(invoice.refundStatus).toBe('pending');
    expect(invoice.refundedAt).toBeNull();
  });

  it('marks the invoice refund as failed when all gateway attempts throw errors', async () => {
    const transaction = createTransaction({
      _id: 'txn-failed',
      getRefundableAmount: jest.fn(() => 40),
    });
    PaymentTransaction.find.mockReturnValue(mockFindResult([transaction]));
    paymentGatewayService.refundTransaction.mockRejectedValue(new Error('gateway down'));

    const invoice = {
      _id: 'invoice-3',
      tenant: 'tenant-1',
      refundAmount: 40,
      refundStatus: 'none',
      returnStatus: 'approved',
      refundedAt: null,
    };

    const result = await refundService.refundInvoicePayments(invoice, {
      amount: 40,
      reason: 'Gateway outage',
    });

    expect(result.mode).toBe('manual');
    expect(result.executedAmount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.manualFallbacks).toEqual([]);
    expect(invoice.refundStatus).toBe('failed');
    expect(invoice.refundedAt).toBeNull();
  });
});
