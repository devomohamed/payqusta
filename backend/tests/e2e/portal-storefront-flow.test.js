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
const Notification = require('../../src/models/Notification');
const ReturnRequest = require('../../src/models/ReturnRequest');
const SupportMessage = require('../../src/models/SupportMessage');

const api = createApiClient();
const describeDb = hasDbTestEnv() ? describe : describe.skip;

const createTenant = async (overrides = {}) => Tenant.create({
  name: 'Portal E2E Store',
  slug: `portal-e2e-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  settings: {
    shipping: {
      enabled: false,
      provider: 'local',
      supportsCashOnDelivery: true,
      baseFee: 0,
    },
    installments: {
      defaultMonths: 6,
    },
  },
  ...overrides,
});

const createUser = async (tenant, overrides = {}) => User.create({
  name: 'Portal Admin',
  email: `portal-admin-${Date.now()}-${Math.round(Math.random() * 1000)}@example.com`,
  phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
  password: 'Secret123!',
  role: 'vendor',
  tenant: tenant._id,
  ...overrides,
});

const createProduct = async (tenant, overrides = {}) => Product.create({
  tenant: tenant._id,
  name: `Portal Product ${Date.now()}`,
  sku: `PORTAL-${Math.round(Math.random() * 100000)}`,
  price: 125,
  cost: 75,
  stock: {
    quantity: 5,
    minQuantity: 1,
    unit: 'piece',
  },
  images: [],
  ...overrides,
});

const createCustomer = async (tenant, overrides = {}) => Customer.create({
  tenant: tenant._id,
  name: 'Portal Customer',
  phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
  password: 'Secret123!',
  isPortalActive: true,
  isActive: true,
  financials: {
    totalPurchases: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    creditLimit: 10000,
  },
  ...overrides,
});

const portalLogin = async (tenantId, phone, password = 'Secret123!') => {
  const res = await api
    .post('/api/v1/portal/login')
    .set('x-tenant-id', tenantId.toString())
    .send({ phone, password });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeTruthy();

  return res.body.data.token;
};

const staffLogin = async (email, password = 'Secret123!') => {
  const res = await api
    .post('/api/v1/auth/login')
    .send({ email, password });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.token).toBeTruthy();

  return res.body.data.token;
};

const createGuestCustomer = async (tenant, overrides = {}) => {
  const payload = {
    name: 'Guest Customer',
    phone: `010${Math.floor(10000000 + Math.random() * 89999999)}`,
    address: 'Guest Address',
    ...overrides,
  };

  const res = await api
    .post('/api/v1/customers')
    .set('x-tenant-id', tenant._id.toString())
    .set('x-source', 'online_store')
    .send(payload);

  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);

  return res.body.data;
};

describeDb('Portal storefront DB-backed E2E', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase();
    await disconnectTestDatabase();
  });

  it('lets a storefront guest checkout and use public confirmation/tracking links', async () => {
    const tenant = await createTenant();
    const product = await createProduct(tenant, {
      name: 'Guest Checkout Product',
      sku: `GUEST-${Math.round(Math.random() * 100000)}`,
      price: 210,
      cost: 120,
      stock: {
        quantity: 4,
        minQuantity: 1,
        unit: 'piece',
      },
    });
    const guestCustomer = await createGuestCustomer(tenant, {
      name: 'Guest Buyer',
      phone: '01022334455',
      address: '9 Guest Road',
    });

    const checkoutRes = await api
      .post('/api/v1/invoices')
      .set('x-tenant-id', tenant._id.toString())
      .send({
        source: 'online_store',
        customerId: guestCustomer._id,
        paymentMethod: 'cash',
        items: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: 'Guest Buyer',
          phone: '01022334455',
          address: '9 Guest Road',
          city: 'Giza',
          governorate: 'Giza',
        },
        notes: 'Guest checkout flow',
      });

    expect(checkoutRes.statusCode).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.source).toBe('online_store');

    const storedInvoice = await Invoice.findById(checkoutRes.body.data._id).lean();
    const storedProduct = await Product.findById(product._id).lean();

    expect(storedInvoice.guestTrackingToken).toBeTruthy();
    expect(storedInvoice.source).toBe('online_store');
    expect(storedProduct.stock.quantity).toBe(3);

    const confirmationRes = await api
      .get(`/api/v1/orders/${storedInvoice._id.toString()}/confirmation`)
      .set('x-tenant-id', tenant._id.toString())
      .query({ token: storedInvoice.guestTrackingToken });

    expect(confirmationRes.statusCode).toBe(200);
    expect(confirmationRes.body.success).toBe(true);
    expect(confirmationRes.body.data.guestTrackingToken).toBe(storedInvoice.guestTrackingToken);
    expect(confirmationRes.body.data.orderNumber).toBe(storedInvoice.invoiceNumber);

    const trackingRes = await api
      .get('/api/v1/orders/track')
      .set('x-tenant-id', tenant._id.toString())
      .query({
        orderNumber: storedInvoice.invoiceNumber,
        token: storedInvoice.guestTrackingToken,
      });

    expect(trackingRes.statusCode).toBe(200);
    expect(trackingRes.body.success).toBe(true);
    expect(trackingRes.body.data.orderNumber).toBe(storedInvoice.invoiceNumber);
    expect(trackingRes.body.data.customer.phone).toBe('01022334455');
  });

  it('lets a portal customer cancel an eligible order and reorder its available items', async () => {
    const tenant = await createTenant();
    const product = await createProduct(tenant, {
      name: 'Cancelable Portal Product',
      sku: `CANCEL-${Math.round(Math.random() * 100000)}`,
      stock: {
        quantity: 6,
        minQuantity: 1,
        unit: 'piece',
      },
    });
    const customer = await createCustomer(tenant, {
      name: 'Cancel Customer',
      phone: '01099887766',
    });

    const token = await portalLogin(tenant._id, customer.phone);

    const checkoutRes = await api
      .post('/api/v1/portal/cart/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        paymentMethod: 'cash',
        shippingAddress: {
          fullName: 'Cancel Customer',
          phone: '01099887766',
          address: '18 Portal Street',
          city: 'Cairo',
          governorate: 'Cairo',
        },
        notes: 'Cancel and reorder flow',
      });

    expect(checkoutRes.statusCode).toBe(201);
    expect(checkoutRes.body.success).toBe(true);

    const orderId = checkoutRes.body.data.orderId;
    let storedProduct = await Product.findById(product._id).lean();
    expect(storedProduct.stock.quantity).toBe(4);

    const cancelRes = await api
      .post(`/api/v1/portal/orders/${orderId.toString()}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.invoice.orderStatus).toBe('cancelled');

    const cancelledInvoice = await Invoice.findById(orderId).lean();
    storedProduct = await Product.findById(product._id).lean();

    expect(cancelledInvoice.orderStatus).toBe('cancelled');
    expect(cancelledInvoice.status).toBe('cancelled');
    expect(storedProduct.stock.quantity).toBe(6);

    const reorderRes = await api
      .post(`/api/v1/portal/orders/${orderId.toString()}/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(reorderRes.statusCode).toBe(200);
    expect(reorderRes.body.success).toBe(true);
    expect(reorderRes.body.data.items).toHaveLength(1);
    expect(reorderRes.body.data.items[0].product._id.toString()).toBe(product._id.toString());
    expect(reorderRes.body.data.items[0].quantity).toBe(2);
  });

  it('lets a portal customer create return/support requests and lets staff manage them end-to-end', async () => {
    const tenant = await createTenant();
    const vendor = await createUser(tenant, {
      name: 'Store Vendor',
      email: 'vendor-manage@example.com',
      phone: '01055550001',
    });
    const product = await createProduct(tenant, {
      name: 'Managed Portal Product',
      sku: `MANAGED-${Math.round(Math.random() * 100000)}`,
    });
    const customer = await createCustomer(tenant, {
      name: 'Portal Alice',
      phone: '01012344321',
    });
    const otherCustomer = await createCustomer(tenant, {
      name: 'Portal Bob',
      phone: '01012344322',
    });

    await Invoice.create({
      tenant: tenant._id,
      invoiceNumber: `INV-OTHER-${Date.now()}`,
      customer: otherCustomer._id,
      items: [{
        product: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
      }],
      subtotal: product.price,
      totalAmount: product.price,
      paymentMethod: 'cash',
      paidAmount: product.price,
      remainingAmount: 0,
      status: 'paid',
      orderStatus: 'delivered',
      source: 'portal',
    });

    const portalToken = await portalLogin(tenant._id, customer.phone);
    const adminToken = await staffLogin(vendor.email);

    const checkoutRes = await api
      .post('/api/v1/portal/cart/checkout')
      .set('Authorization', `Bearer ${portalToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        paymentMethod: 'cash',
        shippingAddress: {
          fullName: 'Portal Alice',
          phone: '01012344321',
          address: '12 Nile Street',
          city: 'Cairo',
          governorate: 'Cairo',
        },
        notes: 'Portal order e2e',
      });

    expect(checkoutRes.statusCode).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.totalAmount).toBe(250);

    const orderId = checkoutRes.body.data.orderId;
    const createdInvoice = await Invoice.findById(orderId).lean();
    let storedProduct = await Product.findById(product._id).lean();

    expect(createdInvoice.customer.toString()).toBe(customer._id.toString());
    expect(createdInvoice.source).toBe('portal');
    expect(storedProduct.stock.quantity).toBe(3);

    const customerNotifications = await Notification.find({ customerRecipient: customer._id }).lean();
    const adminNotifications = await Notification.find({ recipient: vendor._id }).lean();
    expect(customerNotifications.some((entry) => entry.type === 'order')).toBe(true);
    expect(adminNotifications.some((entry) => entry.type === 'order')).toBe(true);

    const ordersRes = await api
      .get('/api/v1/portal/orders')
      .set('Authorization', `Bearer ${portalToken}`);

    expect(ordersRes.statusCode).toBe(200);
    expect(ordersRes.body.success).toBe(true);
    expect(ordersRes.body.data.orders).toHaveLength(1);
    expect(ordersRes.body.data.orders[0]._id.toString()).toBe(orderId.toString());

    const invoicesRes = await api
      .get('/api/v1/portal/invoices')
      .set('Authorization', `Bearer ${portalToken}`);

    expect(invoicesRes.statusCode).toBe(200);
    expect(invoicesRes.body.success).toBe(true);
    expect(invoicesRes.body.data.invoices).toHaveLength(1);
    expect(invoicesRes.body.data.invoices[0]._id.toString()).toBe(orderId.toString());

    const invoiceDoc = await Invoice.findById(orderId);
    invoiceDoc.orderStatus = 'delivered';
    invoiceDoc.status = 'paid';
    invoiceDoc.paidAmount = invoiceDoc.totalAmount;
    invoiceDoc.remainingAmount = 0;
    await invoiceDoc.save({ validateBeforeSave: false });

    const returnRes = await api
      .post('/api/v1/portal/returns')
      .set('Authorization', `Bearer ${portalToken}`)
      .send({
        invoiceId: orderId.toString(),
        productId: product._id.toString(),
        quantity: 1,
        reason: 'defective',
        description: 'Packaging damaged',
      });

    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.body.success).toBe(true);

    const createdReturn = await ReturnRequest.findOne({
      customer: customer._id,
      invoice: orderId,
      product: product._id,
    }).lean();
    expect(createdReturn).toBeTruthy();
    expect(createdReturn.quantity).toBe(1);

    const returnListRes = await api
      .get('/api/v1/portal/returns')
      .set('Authorization', `Bearer ${portalToken}`);

    expect(returnListRes.statusCode).toBe(200);
    expect(returnListRes.body.data).toHaveLength(1);

    const supportRes = await api
      .post('/api/v1/portal/support')
      .set('Authorization', `Bearer ${portalToken}`)
      .send({
        subject: 'Where is my replacement?',
        message: 'I opened a return request and need a delivery update.',
        type: 'complaint',
      });

    expect(supportRes.statusCode).toBe(200);
    expect(supportRes.body.success).toBe(true);
    expect(supportRes.body.data.ticketId).toBeTruthy();

    const supportThread = await SupportMessage.findOne({
      customer: customer._id,
      tenant: tenant._id,
    }).lean();
    expect(supportThread).toBeTruthy();
    expect(supportThread.subject).toBe('Where is my replacement?');

    const supportListRes = await api
      .get('/api/v1/portal/support')
      .set('Authorization', `Bearer ${portalToken}`);

    expect(supportListRes.statusCode).toBe(200);
    expect(supportListRes.body.data).toHaveLength(1);

    const manageReturnsRes = await api
      .get('/api/v1/manage/returns')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(manageReturnsRes.statusCode).toBe(200);
    expect(manageReturnsRes.body.success).toBe(true);
    expect(manageReturnsRes.body.data.returns).toHaveLength(1);

    const approveReturnRes = await api
      .patch(`/api/v1/manage/returns/${createdReturn._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        adminNotes: 'Approved after review',
      });

    expect(approveReturnRes.statusCode).toBe(200);
    expect(approveReturnRes.body.success).toBe(true);
    expect(approveReturnRes.body.data.status).toBe('approved');

    const completeReturnRes = await api
      .patch(`/api/v1/manage/returns/${createdReturn._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'completed',
        adminNotes: 'Item received and restocked',
      });

    expect(completeReturnRes.statusCode).toBe(200);
    expect(completeReturnRes.body.success).toBe(true);

    const completedReturn = await ReturnRequest.findById(createdReturn._id).lean();
    const updatedInvoice = await Invoice.findById(orderId).lean();
    storedProduct = await Product.findById(product._id).lean();

    expect(completedReturn.status).toBe('completed');
    expect(completedReturn.restockedQuantity).toBe(1);
    expect(completedReturn.refundStatus).toBe('pending');
    expect(updatedInvoice.returnStatus).toBe('received');
    expect(updatedInvoice.refundStatus).toBe('pending');
    expect(storedProduct.stock.quantity).toBe(4);

    const manageSupportRes = await api
      .get('/api/v1/manage/support')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(manageSupportRes.statusCode).toBe(200);
    expect(manageSupportRes.body.success).toBe(true);
    expect(manageSupportRes.body.data.messages).toHaveLength(1);

    const replySupportRes = await api
      .post(`/api/v1/manage/support/${supportThread._id.toString()}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'We received your request and started processing it.' });

    expect(replySupportRes.statusCode).toBe(200);
    expect(replySupportRes.body.success).toBe(true);
    expect(replySupportRes.body.data.status).toBe('replied');

    const closeSupportRes = await api
      .patch(`/api/v1/manage/support/${supportThread._id.toString()}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(closeSupportRes.statusCode).toBe(200);
    expect(closeSupportRes.body.success).toBe(true);
    expect(closeSupportRes.body.data.status).toBe('closed');

    const finalSupportThread = await SupportMessage.findById(supportThread._id).lean();
    expect(finalSupportThread.status).toBe('closed');
    expect(finalSupportThread.replies).toHaveLength(1);
    expect(finalSupportThread.replies[0].sender).toBe('vendor');

    const postSupportAdminNotifications = await Notification.find({ recipient: vendor._id }).lean();
    const postSupportCustomerNotifications = await Notification.find({ customerRecipient: customer._id }).lean();
    expect(postSupportAdminNotifications.some((entry) => entry.relatedId?.toString() === supportThread._id.toString())).toBe(true);
    expect(postSupportCustomerNotifications.some((entry) => entry.link === `/portal/support/${supportThread._id.toString()}`)).toBe(true);
    expect(postSupportCustomerNotifications.some((entry) => entry.link === '/portal/returns')).toBe(true);
  });
});

if (!hasDbTestEnv()) {
  describe('Portal storefront DB-backed E2E', () => {
    it('is skipped until TEST_MONGODB_URI is provided', () => {
      expect(hasDbTestEnv()).toBe(false);
    });
  });
}
