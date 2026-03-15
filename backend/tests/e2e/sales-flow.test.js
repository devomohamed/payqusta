const { createApiClient } = require('../helpers/apiClient');
const {
  hasDbTestEnv,
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} = require('../helpers/dbTestHarness');

const Tenant = require('../../src/models/Tenant');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Product = require('../../src/models/Product');
const Invoice = require('../../src/models/Invoice');

const api = createApiClient();
const describeDb = hasDbTestEnv() ? describe : describe.skip;

const createTenant = async (overrides = {}) => Tenant.create({
  name: 'E2E Store',
  slug: `e2e-store-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  settings: {
    shipping: {
      enabled: false,
      provider: 'local',
      supportsCashOnDelivery: true,
      baseFee: 0,
    },
  },
  ...overrides,
});

const createVendorUser = async (tenant, overrides = {}) => User.create({
  name: 'E2E Vendor',
  email: `vendor-${Date.now()}-${Math.round(Math.random() * 1000)}@example.com`,
  phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
  password: 'Secret123!',
  role: 'vendor',
  tenant: tenant._id,
  ...overrides,
});

const createProduct = async (tenant, overrides = {}) => Product.create({
  tenant: tenant._id,
  name: `E2E Product ${Date.now()}`,
  sku: `E2E-${Math.round(Math.random() * 100000)}`,
  price: 100,
  cost: 60,
  stock: {
    quantity: 5,
    minQuantity: 1,
    unit: 'piece',
  },
  images: [],
  ...overrides,
});

const loginAs = async (email, password = 'Secret123!') => {
  const res = await api
    .post('/api/v1/auth/login')
    .send({ email, password });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeTruthy();

  return res.body.data.token;
};

describeDb('Sales flow DB-backed E2E', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase();
    await disconnectTestDatabase();
  });

  it('lets a vendor login, create a customer, create an invoice, and settle it end-to-end', async () => {
    const tenant = await createTenant();
    const vendor = await createVendorUser(tenant);
    const product = await createProduct(tenant);
    const token = await loginAs(vendor.email);

    const customerRes = await api
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Customer',
        phone: '01011112222',
        address: 'Alexandria',
        creditLimit: 5000,
      });

    expect(customerRes.statusCode).toBe(201);
    expect(customerRes.body.success).toBe(true);

    const customerId = customerRes.body.data._id;

    const createInvoiceRes = await api
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId,
        items: [
          {
            productId: product._id.toString(),
            quantity: 2,
          },
        ],
        paymentMethod: 'cash',
        source: 'pos',
      });

    expect(createInvoiceRes.statusCode).toBe(201);
    expect(createInvoiceRes.body.success).toBe(true);
    expect(createInvoiceRes.body.data.totalAmount).toBe(200);

    const invoiceId = createInvoiceRes.body.data._id;

    let storedInvoice = await Invoice.findById(invoiceId).lean();
    let storedProduct = await Product.findById(product._id).lean();
    let storedCustomer = await Customer.findById(customerId).lean();

    expect(storedInvoice.remainingAmount).toBe(200);
    expect(storedProduct.stock.quantity).toBe(3);
    expect(storedCustomer.financials.totalPurchases).toBe(200);
    expect(storedCustomer.financials.outstandingBalance).toBe(200);

    const partialPaymentRes = await api
      .post(`/api/v1/invoices/${invoiceId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 50,
        method: 'cash',
      });

    expect(partialPaymentRes.statusCode).toBe(200);
    expect(partialPaymentRes.body.success).toBe(true);

    storedInvoice = await Invoice.findById(invoiceId).lean();
    storedCustomer = await Customer.findById(customerId).lean();

    expect(storedInvoice.paidAmount).toBe(50);
    expect(storedInvoice.remainingAmount).toBe(150);
    expect(storedCustomer.financials.totalPaid).toBe(50);
    expect(storedCustomer.financials.outstandingBalance).toBe(150);

    const payAllRes = await api
      .post(`/api/v1/invoices/${invoiceId}/pay-all`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(payAllRes.statusCode).toBe(200);
    expect(payAllRes.body.success).toBe(true);

    storedInvoice = await Invoice.findById(invoiceId).lean();
    storedCustomer = await Customer.findById(customerId).lean();

    expect(storedInvoice.status).toBe('paid');
    expect(storedInvoice.remainingAmount).toBe(0);
    expect(storedCustomer.financials.outstandingBalance).toBe(0);
    expect(storedCustomer.financials.totalPaid).toBe(200);
  });

  it('enforces tenant isolation on DB-backed customer reads', async () => {
    const tenantA = await createTenant({ name: 'Tenant A' });
    const tenantB = await createTenant({ name: 'Tenant B' });
    const vendorA = await createVendorUser(tenantA, {
      email: 'tenant-a@example.com',
      phone: '01020000001',
    });

    await Customer.create({
      tenant: tenantA._id,
      name: 'Tenant A Customer',
      phone: '01030000001',
      address: 'Alexandria',
    });

    await Customer.create({
      tenant: tenantB._id,
      name: 'Tenant B Customer',
      phone: '01030000002',
      address: 'Cairo',
    });

    const token = await loginAs(vendorA.email);

    const res = await api
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'Tenant' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Tenant A Customer');
  });

  it('blocks cross-tenant invoice creation when the customer or product belongs to another tenant', async () => {
    const tenantA = await createTenant({ name: 'Tenant A' });
    const tenantB = await createTenant({ name: 'Tenant B' });
    const vendorA = await createVendorUser(tenantA, {
      email: 'writer-a@example.com',
      phone: '01020000011',
    });
    const tokenA = await loginAs(vendorA.email);

    const customerA = await Customer.create({
      tenant: tenantA._id,
      name: 'Tenant A Customer',
      phone: '01030000011',
      address: 'Alexandria',
    });
    const customerB = await Customer.create({
      tenant: tenantB._id,
      name: 'Tenant B Customer',
      phone: '01030000012',
      address: 'Cairo',
    });
    const productA = await createProduct(tenantA, {
      name: 'Tenant A Product',
      sku: 'TENANT-A-PRODUCT',
    });
    const productB = await createProduct(tenantB, {
      name: 'Tenant B Product',
      sku: 'TENANT-B-PRODUCT',
    });

    const foreignCustomerRes = await api
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId: customerB._id.toString(),
        items: [
          {
            productId: productA._id.toString(),
            quantity: 1,
          },
        ],
        paymentMethod: 'cash',
        source: 'pos',
      });

    expect(foreignCustomerRes.statusCode).toBe(404);
    expect(foreignCustomerRes.body.success).toBe(false);

    const foreignProductRes = await api
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        customerId: customerA._id.toString(),
        items: [
          {
            productId: productB._id.toString(),
            quantity: 1,
          },
        ],
        paymentMethod: 'cash',
        source: 'pos',
      });

    expect(foreignProductRes.statusCode).toBe(404);
    expect(foreignProductRes.body.success).toBe(false);

    const tenantAInvoices = await Invoice.countDocuments({ tenant: tenantA._id });
    const productBStored = await Product.findById(productB._id).lean();

    expect(tenantAInvoices).toBe(0);
    expect(productBStored.stock.quantity).toBe(5);
  });

  it('blocks cross-tenant writes on existing customer, product, and invoice records', async () => {
    const tenantA = await createTenant({ name: 'Tenant A' });
    const tenantB = await createTenant({ name: 'Tenant B' });
    const vendorA = await createVendorUser(tenantA, {
      email: 'writer-a-2@example.com',
      phone: '01020000021',
    });
    const vendorB = await createVendorUser(tenantB, {
      email: 'writer-b@example.com',
      phone: '01020000022',
    });

    const customerB = await Customer.create({
      tenant: tenantB._id,
      name: 'Tenant B Customer',
      phone: '01030000021',
      address: 'Cairo',
    });
    const productB = await createProduct(tenantB, {
      name: 'Tenant B Product',
      sku: 'TENANT-B-PRODUCT-2',
    });
    const tokenA = await loginAs(vendorA.email);
    const tokenB = await loginAs(vendorB.email);

    const invoiceRes = await api
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        customerId: customerB._id.toString(),
        items: [
          {
            productId: productB._id.toString(),
            quantity: 1,
          },
        ],
        paymentMethod: 'deferred',
        source: 'pos',
      });

    expect(invoiceRes.statusCode).toBe(201);
    const invoiceId = invoiceRes.body.data._id;

    const updateCustomerRes = await api
      .put(`/api/v1/customers/${customerB._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Leaked Customer' });

    expect(updateCustomerRes.statusCode).toBe(404);
    expect(updateCustomerRes.body.success).toBe(false);

    const updateProductRes = await api
      .put(`/api/v1/products/${productB._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Leaked Product' });

    expect(updateProductRes.statusCode).toBe(404);
    expect(updateProductRes.body.success).toBe(false);

    const payInvoiceRes = await api
      .post(`/api/v1/invoices/${invoiceId}/pay`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 10,
        method: 'cash',
      });

    expect(payInvoiceRes.statusCode).toBe(404);
    expect(payInvoiceRes.body.success).toBe(false);

    const storedCustomer = await Customer.findById(customerB._id).lean();
    const storedProduct = await Product.findById(productB._id).lean();
    const storedInvoice = await Invoice.findById(invoiceId).lean();

    expect(storedCustomer.name).toBe('Tenant B Customer');
    expect(storedProduct.name).toBe('Tenant B Product');
    expect(storedInvoice.paidAmount).toBe(0);
    expect(storedInvoice.remainingAmount).toBe(storedInvoice.totalAmount);
  });
});

if (!hasDbTestEnv()) {
  describe('Sales flow DB-backed E2E', () => {
    it('is skipped until TEST_MONGODB_URI is provided', () => {
      expect(hasDbTestEnv()).toBe(false);
    });
  });
}
