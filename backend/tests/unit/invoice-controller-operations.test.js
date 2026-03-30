jest.mock('../../src/models/Invoice', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/services/InvoiceService', () => ({}));
jest.mock('../../src/utils/helpers', () => ({}));
jest.mock('../../src/services/WhatsAppService', () => ({}));
jest.mock('../../src/services/NotificationService', () => ({}));
jest.mock('../../src/services/GamificationService', () => ({}));
jest.mock('../../src/services/ShippingService', () => ({
  createDelivery: jest.fn(),
}));
jest.mock('../../src/services/FulfillmentService', () => ({
  analyzeInvoiceFulfillment: jest.fn(),
}));
jest.mock('../../src/services/RefundService', () => ({
  refundInvoicePayments: jest.fn(),
}));
jest.mock('../../src/utils/orderLifecycle', () => ({
  cancelInvoiceOrder: jest.fn(),
  completeInvoiceReturn: jest.fn(),
}));

const Invoice = require('../../src/models/Invoice');
const ShippingService = require('../../src/services/ShippingService');
const invoiceController = require('../../src/controllers/invoiceController');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('InvoiceController operational shipping actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists shipment failure details when courier creation fails', async () => {
    const invoice = {
      _id: 'invoice-1',
      tenant: 'tenant-1',
      invoiceNumber: 'INV-1001',
      remainingAmount: 120,
      notes: 'اتصل قبل الوصول',
      items: [{ quantity: 2 }],
      customer: {
        name: 'أحمد',
        phone: '0100000000',
        email: 'a@example.com',
        address: 'القاهرة',
      },
      shippingAddress: {
        fullName: 'أحمد',
        phone: '0100000000',
        address: 'مدينة نصر',
        city: 'القاهرة',
        governorate: 'القاهرة',
      },
      orderStatus: 'ready_for_shipping',
      orderStatusHistory: [],
      save: jest.fn().mockResolvedValue(undefined),
      shippingDetails: {},
    };

    Invoice.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(invoice),
    });
    ShippingService.createDelivery.mockRejectedValue(new Error('Courier timeout'));

    const req = {
      params: { id: 'invoice-1' },
      tenantFilter: { tenant: 'tenant-1' },
      body: {},
    };
    const res = createResponse();
    const next = jest.fn();

    invoiceController.createBostaWaybill(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ message: 'Courier timeout' });
    expect(invoice.shipmentFailure).toEqual(expect.objectContaining({
      provider: 'bosta',
      lastError: 'Courier timeout',
      retryCount: 1,
      lastAttemptPayloadSummary: expect.objectContaining({
        address: 'مدينة نصر',
        city: 'القاهرة',
        governorate: 'القاهرة',
        itemsCount: 2,
        reference: 'INV-1001',
      }),
      dismissedAt: null,
      dismissedBy: null,
      dismissalNote: '',
    }));
    expect(invoice.orderStatusHistory.at(-1)).toEqual(expect.objectContaining({
      status: 'ready_for_shipping',
      note: 'Shipment creation failed: Courier timeout',
    }));
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });

  it('allows admin dismissal of a stored shipment failure alert', async () => {
    const invoice = {
      _id: 'invoice-2',
      orderStatus: 'ready_for_shipping',
      shipmentFailure: {
        provider: 'bosta',
        lastError: 'Courier timeout',
        failedAt: new Date('2026-03-27T10:00:00.000Z'),
        retryCount: 1,
        dismissedAt: null,
        dismissedBy: null,
        dismissalNote: '',
      },
      orderStatusHistory: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    Invoice.findOne.mockResolvedValue(invoice);

    const req = {
      params: { id: 'invoice-2' },
      tenantFilter: { tenant: 'tenant-1' },
      user: { _id: 'admin-1' },
      body: {
        action: 'dismiss_shipment_failure',
        note: 'سيتم إعادة المحاولة لاحقًا',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    invoiceController.resolveOperationalReview(req, res, next);
    await flushAsync();

    expect(next).not.toHaveBeenCalled();
    expect(invoice.shipmentFailure.dismissedBy).toBe('admin-1');
    expect(invoice.shipmentFailure.dismissedAt).toBeInstanceOf(Date);
    expect(invoice.shipmentFailure.dismissalNote).toBe('سيتم إعادة المحاولة لاحقًا');
    expect(invoice.orderStatusHistory.at(-1)).toEqual(expect.objectContaining({
      status: 'ready_for_shipping',
      note: 'سيتم إعادة المحاولة لاحقًا',
    }));
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
