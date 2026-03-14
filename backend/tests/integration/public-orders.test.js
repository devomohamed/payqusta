jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
}));

jest.mock('../../src/models/Invoice', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/utils/orderLifecycle', () => ({
  completeInvoiceReturn: jest.fn(),
  cancelInvoiceOrder: jest.fn(),
}));

jest.mock('../../src/services/RefundService', () => ({
  refundInvoicePayments: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const Tenant = require('../../src/models/Tenant');
const Invoice = require('../../src/models/Invoice');
const { completeInvoiceReturn } = require('../../src/utils/orderLifecycle');
const refundService = require('../../src/services/RefundService');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createPopulateLeanQuery = (result) => {
  const query = {
    populate: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(result),
  };

  return query;
};

const createPublicInvoice = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  invoiceNumber: 'INV-100',
  source: 'online_store',
  guestTrackingToken: 'guest-token-123',
  orderStatus: 'processing',
  createdAt: new Date('2026-03-13T10:00:00.000Z'),
  subtotal: 100,
  taxAmount: 0,
  discount: 0,
  shippingFee: 15,
  shippingDiscount: 0,
  totalAmount: 115,
  paymentMethod: 'cash',
  shippingMethod: 'standard',
  shippingDetails: {
    status: 'pending',
    trackingUrl: null,
  },
  trackingNumber: null,
  estimatedDeliveryDate: null,
  cancelledAt: null,
  deliveredAt: null,
  returnStatus: 'none',
  refundStatus: 'none',
  refundAmount: 0,
  shippingAddress: {
    phone: '01000000000',
    address: 'Alexandria',
  },
  customer: {
    phone: '01000000000',
    address: 'Alexandria',
  },
  items: [{
    productName: 'Demo product',
    quantity: 1,
    unitPrice: 100,
    totalPrice: 100,
    product: {
      name: 'Demo product',
      image: 'demo.png',
      images: ['demo.png'],
    },
  }],
  orderStatusHistory: [],
  ...overrides,
});

describe('Public order endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_ROOT_DOMAIN = 'payqusta.store';
    Tenant.findById.mockResolvedValue({ _id: 'tenant-1', isActive: true });
  });

  it('returns guest tracking data when the order number and token are valid', async () => {
    const invoice = createPublicInvoice();
    Invoice.findOne.mockReturnValue(createPopulateLeanQuery(invoice));

    const res = await api
      .get('/api/v1/orders/track')
      .set('x-tenant-id', 'tenant-1')
      .query({
        orderNumber: 'INV-100',
        token: 'guest-token-123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBe('INV-100');
    expect(res.body.data.shippingFee).toBe(15);
    expect(res.body.data.customer.phone).toBe('01000000000');
    expect(Invoice.findOne).toHaveBeenCalledWith({
      invoiceNumber: 'INV-100',
      source: 'online_store',
      tenant: 'tenant-1',
    });
  });

  it('rejects guest tracking when the token is invalid', async () => {
    const invoice = createPublicInvoice();
    Invoice.findOne.mockReturnValue(createPopulateLeanQuery(invoice));

    const res = await api
      .get('/api/v1/orders/track')
      .set('x-tenant-id', 'tenant-1')
      .query({
        orderNumber: 'INV-100',
        token: 'wrong-token',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns safe confirmation payloads for storefront guests', async () => {
    const invoice = createPublicInvoice();
    Invoice.findOne.mockReturnValue(createPopulateLeanQuery(invoice));

    const res = await api
      .get('/api/v1/orders/507f1f77bcf86cd799439011/confirmation')
      .set('x-tenant-id', 'tenant-1')
      .query({ token: 'guest-token-123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceId).toBe('507f1f77bcf86cd799439011');
    expect(res.body.data.guestTrackingToken).toBe('guest-token-123');
  });

  it('syncs shipping status updates from the Bosta webhook', async () => {
    const invoice = {
      _id: 'invoice-webhook-1',
      invoiceNumber: 'INV-200',
      orderStatus: 'processing',
      trackingNumber: null,
      shipmentId: null,
      shippingDetails: {
        status: 'pending',
      },
      orderStatusHistory: [],
      items: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Invoice.findOne.mockResolvedValue(invoice);

    const res = await api
      .post('/api/v1/shipping/webhooks/bosta')
      .send({
        trackingNumber: 'TRACK-200',
        status: 'In Transit',
        trackingUrl: 'https://track.example/TRACK-200',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('shipped');
    expect(res.body.data.shippingStatus).toBe('in_transit');
    expect(res.body.data.trackingNumber).toBe('TRACK-200');
    expect(invoice.trackingNumber).toBe('TRACK-200');
    expect(invoice.shippingDetails.waybillNumber).toBe('TRACK-200');
    expect(invoice.shippingDetails.trackingUrl).toBe('https://track.example/TRACK-200');
    expect(invoice.orderStatusHistory).toHaveLength(1);
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });

  it('completes returns and triggers refunds when Bosta reports a returned shipment', async () => {
    const invoice = {
      _id: 'invoice-webhook-2',
      invoiceNumber: 'INV-201',
      orderStatus: 'shipped',
      trackingNumber: 'TRACK-201',
      shipmentId: 'shipment-201',
      shippingDetails: {
        status: 'in_transit',
      },
      orderStatusHistory: [],
      items: [{
        product: 'product-1',
        variant: 'variant-1',
        quantity: 2,
      }],
      save: jest.fn().mockResolvedValue(true),
    };
    Invoice.findOne.mockResolvedValue(invoice);
    completeInvoiceReturn.mockResolvedValue({
      totalQuantity: 2,
      refundAmount: 55,
    });
    refundService.refundInvoicePayments.mockResolvedValue({
      mode: 'gateway',
      requestedAmount: 55,
      executedAmount: 55,
      outstandingAmount: 0,
      errors: [],
    });

    const res = await api
      .post('/api/v1/shipping/webhooks/bosta')
      .send({
        trackingNumber: 'TRACK-201',
        status: 'Returned to shipper',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderStatus).toBe('cancelled');
    expect(res.body.data.shippingStatus).toBe('returned');
    expect(completeInvoiceReturn).toHaveBeenCalledWith(
      invoice,
      [{
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 2,
      }],
      expect.objectContaining({
        reason: 'returned',
        cancelOrder: true,
      })
    );
    expect(refundService.refundInvoicePayments).toHaveBeenCalledWith(
      invoice,
      expect.objectContaining({
        amount: 55,
        reason: 'Returned shipment refund',
      })
    );
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });
});
