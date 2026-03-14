
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
}));

jest.mock('../../src/services/InvoiceService', () => ({
  createInvoice: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const InvoiceService = require('../../src/services/InvoiceService');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe('Checkout route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.PLATFORM_ROOT_DOMAIN = 'payqusta.store';
    Tenant.findById.mockResolvedValue({ _id: 'tenant-1', isActive: true });
  });

  it('allows online store checkout without dashboard authentication', async () => {
    InvoiceService.createInvoice.mockResolvedValue({
      _id: 'invoice-1',
      invoiceNumber: 'INV-300',
      source: 'online_store',
    });

    const payload = {
      source: 'online_store',
      customer: 'customer-1',
      items: [{ product: 'product-1', quantity: 1, unitPrice: 100 }],
    };

    const res = await api
      .post('/api/v1/invoices')
      .set('x-tenant-id', 'tenant-1')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toBe('INV-300');
    expect(InvoiceService.createInvoice).toHaveBeenCalledWith('tenant-1', undefined, payload);
  });

  it('rejects non-storefront invoice creation when no bearer token is present', async () => {
    const res = await api
      .post('/api/v1/invoices')
      .set('x-tenant-id', 'tenant-1')
      .send({
        customer: 'customer-1',
        items: [{ product: 'product-1', quantity: 1, unitPrice: 100 }],
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(InvoiceService.createInvoice).not.toHaveBeenCalled();
  });

  it('allows authenticated internal invoice creation and passes the user id into the service', async () => {
    jwt.verify.mockReturnValue({
      id: 'user-1',
      tenant: 'tenant-1',
      iat: 2000000000,
      sv: 0,
    });
    User.findById.mockReturnValue(createSelectResult({
      _id: 'user-1',
      tenant: 'tenant-1',
      role: 'vendor',
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
    InvoiceService.createInvoice.mockResolvedValue({
      _id: 'invoice-2',
      invoiceNumber: 'INV-301',
      source: 'direct_sale',
    });

    const payload = {
      customer: 'customer-2',
      items: [{ product: 'product-2', quantity: 2, unitPrice: 50 }],
    };

    const res = await api
      .post('/api/v1/invoices')
      .set('Authorization', 'Bearer valid-token')
      .set('x-tenant-id', 'tenant-1')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(InvoiceService.createInvoice).toHaveBeenCalledWith('tenant-1', 'user-1', payload);
  });
});
