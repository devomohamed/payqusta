jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Invoice', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
}));

jest.mock('../../src/models/ReturnRequest', () => ({
  aggregate: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../src/models/SupportMessage', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Notification', () => ({
  create: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/utils/orderLifecycle', () => ({
  calculateRefundAmountForItems: jest.fn(),
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

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Customer = require('../../src/models/Customer');
const Invoice = require('../../src/models/Invoice');
const Product = require('../../src/models/Product');
const ReturnRequest = require('../../src/models/ReturnRequest');
const SupportMessage = require('../../src/models/SupportMessage');
const Notification = require('../../src/models/Notification');
const User = require('../../src/models/User');
const { calculateRefundAmountForItems } = require('../../src/utils/orderLifecycle');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const tenantId = '507f1f77bcf86cd799439011';
const customerId = '507f1f77bcf86cd799439012';
const invoiceId = '507f1f77bcf86cd799439013';
const productId = '507f1f77bcf86cd799439014';

const createOrdersQuery = (result) => {
  const query = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    populate: jest.fn().mockResolvedValue(result),
  };

  return query;
};

const createSelectableQuery = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

const createPopulateQuery = (result) => ({
  populate: jest.fn().mockResolvedValue(result),
});

const createSelectQuery = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe('Portal protected routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { id: customerId, role: 'customer' });
    });
    Customer.findById.mockResolvedValue({
      _id: customerId,
      id: customerId,
      tenant: tenantId,
      isActive: true,
      isPortalActive: true,
    });
  });

  it('rejects portal order reads when the customer token is missing', async () => {
    const res = await api.get('/api/v1/portal/orders');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(Invoice.find).not.toHaveBeenCalled();
  });

  it('rejects portal access for deactivated customers even with a valid token', async () => {
    Customer.findById.mockResolvedValueOnce({
      _id: customerId,
      id: customerId,
      tenant: tenantId,
      isActive: false,
      isPortalActive: true,
    });

    const res = await api
      .get('/api/v1/portal/orders')
      .set('Authorization', 'Bearer portal-token');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(Invoice.find).not.toHaveBeenCalled();
  });

  it('rejects portal access when the portal account is not activated', async () => {
    Customer.findById.mockResolvedValueOnce({
      _id: customerId,
      id: customerId,
      tenant: tenantId,
      isActive: true,
      isPortalActive: false,
    });

    const res = await api
      .get('/api/v1/portal/orders')
      .set('Authorization', 'Bearer portal-token');

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(Invoice.find).not.toHaveBeenCalled();
  });

  it('returns portal orders for the authenticated customer only', async () => {
    const orders = [{
      _id: invoiceId,
      invoiceNumber: 'INV-200',
      orderStatus: 'processing',
      totalAmount: 450,
    }];

    Invoice.find.mockReturnValue(createOrdersQuery(orders));
    Invoice.countDocuments.mockResolvedValue(1);

    const res = await api
      .get('/api/v1/portal/orders')
      .set('Authorization', 'Bearer portal-token')
      .query({ status: 'processing' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orders).toHaveLength(1);
    expect(res.body.data.orders[0].invoiceNumber).toBe('INV-200');
    expect(Invoice.find).toHaveBeenCalledWith({
      customer: customerId,
      orderStatus: 'processing',
    });
    expect(Invoice.countDocuments).toHaveBeenCalledWith({
      customer: customerId,
      orderStatus: 'processing',
    });
  });

  it('creates portal return requests using the tenant context from portal auth', async () => {
    const invoice = {
      _id: invoiceId,
      status: 'paid',
      orderStatus: 'delivered',
      paidAmount: 50,
      items: [{
        product: {
          toString: () => productId,
        },
        quantity: 3,
        variant: null,
      }],
      save: jest.fn().mockResolvedValue(undefined),
      returnStatus: 'none',
    };
    const createdReturn = {
      _id: '507f1f77bcf86cd799439099',
      invoice: invoiceId,
      product: productId,
      quantity: 2,
      tenant: tenantId,
    };

    Invoice.findOne.mockResolvedValue(invoice);
    ReturnRequest.aggregate.mockResolvedValue([]);
    Product.findById.mockReturnValue(createSelectableQuery({ variants: [] }));
    calculateRefundAmountForItems.mockReturnValue(120);
    ReturnRequest.create.mockResolvedValue(createdReturn);

    const res = await api
      .post('/api/v1/portal/returns')
      .set('Authorization', 'Bearer portal-token')
      .send({
        invoiceId,
        productId,
        quantity: 2,
        reason: 'damaged',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(ReturnRequest.aggregate).toHaveBeenCalledWith([
      expect.objectContaining({
        $match: expect.objectContaining({
          tenant: new mongoose.Types.ObjectId(tenantId),
          customer: new mongoose.Types.ObjectId(customerId),
          invoice: new mongoose.Types.ObjectId(invoiceId),
          product: new mongoose.Types.ObjectId(productId),
        }),
      }),
      expect.any(Object),
    ]);
    expect(ReturnRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      tenant: tenantId,
      customer: customerId,
      invoice: invoiceId,
      product: productId,
      quantity: 2,
      refundAmount: 50,
    }));
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });

  it('creates support tickets and notifies store admins from the portal', async () => {
    const populatedCustomer = {
      _id: customerId,
      id: customerId,
      name: 'Portal Customer',
      tenant: {
        _id: tenantId,
        businessInfo: {
          phone: '01012345678',
          email: 'support@store.test',
        },
      },
    };

    Customer.findById
      .mockResolvedValueOnce({
        _id: customerId,
        id: customerId,
        tenant: tenantId,
        isActive: true,
      })
      .mockReturnValueOnce(createPopulateQuery(populatedCustomer));
    SupportMessage.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439077' });
    User.find.mockReturnValue(createSelectQuery([{ _id: '507f1f77bcf86cd799439088' }]));
    Notification.create.mockResolvedValue({ acknowledged: true });

    const res = await api
      .post('/api/v1/portal/support')
      .set('Authorization', 'Bearer portal-token')
      .send({
        subject: 'Need help',
        message: 'I need an update about my order.',
        type: 'support',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBe('507f1f77bcf86cd799439077');
    expect(SupportMessage.create).toHaveBeenCalledWith({
      tenant: tenantId,
      customer: customerId,
      subject: 'Need help',
      message: 'I need an update about my order.',
      type: 'support',
    });
    expect(User.find).toHaveBeenCalledWith({
      tenant: tenantId,
      role: { $in: ['admin', 'vendor'] },
    });
    expect(Notification.create).toHaveBeenCalledTimes(2);
  });
});
