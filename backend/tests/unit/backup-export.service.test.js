const buildLeanQuery = (data) => ({
  lean: jest.fn().mockResolvedValue(data),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

jest.mock('../../src/models/Product', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Supplier', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Invoice', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Expense', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Branch', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Role', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Plan', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/SubscriptionRequest', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Notification', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/AuditLog', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/middleware/upload', () => ({
  readUploadedFile: jest.fn(),
}));

const Product = require('../../src/models/Product');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');
const Invoice = require('../../src/models/Invoice');
const Expense = require('../../src/models/Expense');
const Branch = require('../../src/models/Branch');
const Role = require('../../src/models/Role');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const Plan = require('../../src/models/Plan');
const SubscriptionRequest = require('../../src/models/SubscriptionRequest');
const Notification = require('../../src/models/Notification');
const AuditLog = require('../../src/models/AuditLog');
const { readUploadedFile } = require('../../src/middleware/upload');
const { buildTenantJsonBackup } = require('../../src/services/backupExportService');

describe('backupExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports extended tenant backup domains and sanitizes user auth metadata', async () => {
    Product.find.mockReturnValue(buildLeanQuery([{
      _id: 'p1',
      name: 'Product 1',
      images: ['/uploads/products/product-1.webp'],
      __v: 0,
    }]));
    Customer.find.mockReturnValue(buildLeanQuery([{ _id: 'c1', name: 'Customer 1', phone: '0100', __v: 0 }]));
    Supplier.find.mockReturnValue(buildLeanQuery([{ _id: 's1', name: 'Supplier 1', phone: '0200', __v: 0 }]));
    Invoice.find.mockReturnValue(buildLeanQuery([{ _id: 'i1', invoiceNumber: 'INV-1', customer: { name: 'Customer 1' }, __v: 0 }]));
    Expense.find.mockReturnValue(buildLeanQuery([{ _id: 'e1', description: 'Rent', amount: 100, __v: 0 }]));
    Branch.find.mockReturnValue(buildLeanQuery([{ _id: 'b1', name: 'Main', tenant: 'tenant-1', __v: 0 }]));
    Role.find.mockReturnValue(buildLeanQuery([{ _id: 'r1', name: 'Cashier', tenant: 'tenant-1', permissions: [], __v: 0 }]));
    User.find.mockReturnValue(buildLeanQuery([{
      _id: 'u1',
      name: 'User 1',
      email: 'user@example.com',
      phone: '0111',
      password: '$2b$12$hashed',
      role: 'vendor',
      branch: 'b1',
      customRole: 'r1',
      tenant: 'tenant-1',
      avatar: '/uploads/avatars/user-1.webp',
      sessionVersion: 7,
      passwordResetToken: 'secret',
      passwordResetExpires: new Date('2026-03-15T10:00:00.000Z'),
      twoFactorSecret: 'otp-secret',
      twoFactorEnabled: true,
      __v: 0,
    }]));
    Plan.find.mockReturnValue(buildLeanQuery([{
      _id: 'plan-1',
      name: 'Growth',
      slug: 'growth',
      billingCycle: 'monthly',
      price: 299,
      currency: 'EGP',
    }]));
    SubscriptionRequest.find.mockReturnValue(buildLeanQuery([{
      _id: 'sr1',
      tenant: 'tenant-1',
      plan: 'plan-1',
      gateway: 'instapay',
      receiptImage: 'data:image/png;base64,ZmFrZQ==',
      status: 'pending',
      createdAt: new Date('2026-03-15T11:00:00.000Z'),
      updatedAt: new Date('2026-03-15T11:00:00.000Z'),
      __v: 0,
    }]));
    Notification.find.mockReturnValue(buildLeanQuery([{
      _id: 'n1',
      tenant: 'tenant-1',
      recipient: 'u1',
      type: 'invoice_created',
      title: 'Invoice created',
      message: 'A new invoice was created.',
      __v: 0,
    }]));
    AuditLog.find.mockReturnValue(buildLeanQuery([{
      _id: 'a1',
      tenant: 'tenant-1',
      user: 'u1',
      action: 'create',
      resource: 'invoice',
      details: { invoiceNumber: 'INV-1' },
      __v: 0,
    }]));
    Tenant.findById.mockReturnValue(buildLeanQuery({
      _id: 'tenant-1',
      name: 'PayQusta Store',
      slug: 'payqusta-store',
      branding: { logo: '/uploads/logos/store-logo.webp' },
      businessInfo: { phone: '0123' },
      settings: {
        currency: 'EGP',
        autoBackup: {
          enabled: true,
          consentAcceptedAt: new Date('2026-03-15T09:00:00.000Z'),
          consentAcceptedBy: 'u1',
          frequency: 'daily',
          format: 'json',
          destination: { type: 'platform_storage' },
          retention: { keepLast: 20 },
          lastSuccessAt: new Date('2026-03-15T08:00:00.000Z'),
        },
      },
      whatsapp: { enabled: true },
      subscription: { status: 'active', maxUsers: 5 },
      dashboardWidgets: [{ widgetId: 'sales' }],
      cameras: [{ name: 'Front', url: 'https://example.com/cam' }],
      addons: ['whatsapp'],
      isActive: true,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-15T00:00:00.000Z'),
    }));
    readUploadedFile.mockImplementation(async (filePath) => ({
      '/uploads/products/product-1.webp': {
        buffer: Buffer.from('product-image'),
        contentType: 'image/webp',
        size: 13,
      },
      '/uploads/avatars/user-1.webp': {
        buffer: Buffer.from('avatar-image'),
        contentType: 'image/webp',
        size: 12,
      },
      '/uploads/logos/store-logo.webp': {
        buffer: Buffer.from('logo-image'),
        contentType: 'image/webp',
        size: 10,
      },
    }[filePath] || null));

    const backup = await buildTenantJsonBackup('tenant-1');

    expect(backup.counts).toEqual(expect.objectContaining({
      products: 1,
      customers: 1,
      suppliers: 1,
      invoices: 1,
      expenses: 1,
      branches: 1,
      roles: 1,
      users: 1,
      subscriptionRequests: 1,
      notifications: 1,
      auditLogs: 1,
      uploadBinaries: 3,
      tenantConfig: 1,
      total: 15,
    }));
    expect(backup.data.users[0]).toEqual(expect.objectContaining({
      _id: 'u1',
      email: 'user@example.com',
      passwordHash: '$2b$12$hashed',
      branch: 'b1',
      customRole: 'r1',
      twoFactorEnabled: false,
    }));
    expect(backup.data.users[0].sessionVersion).toBeUndefined();
    expect(backup.data.users[0].passwordResetToken).toBeUndefined();
    expect(backup.data.users[0].twoFactorSecret).toBeUndefined();
    expect(backup.data.subscriptionRequests[0]).toEqual(expect.objectContaining({
      gateway: 'instapay',
      receiptImage: 'data:image/png;base64,ZmFrZQ==',
      plan: 'plan-1',
      planSnapshot: expect.objectContaining({
        name: 'Growth',
        billingCycle: 'monthly',
      }),
    }));
    expect(backup.data.tenantSnapshot).toEqual(expect.objectContaining({
      name: 'PayQusta Store',
      slug: 'payqusta-store',
      whatsapp: { enabled: true },
      subscription: { status: 'active', maxUsers: 5 },
    }));
    expect(backup.data.tenantSnapshot.settings.autoBackup).toEqual({
      enabled: true,
      consentAcceptedAt: new Date('2026-03-15T09:00:00.000Z'),
      frequency: 'daily',
      format: 'json',
      destination: { type: 'platform_storage' },
      retention: { keepLast: 20 },
    });
    expect(backup.data.notifications).toHaveLength(1);
    expect(backup.data.auditLogs).toHaveLength(1);
    expect(backup.data.uploadBinaries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'products/product-1.webp',
        contentType: 'image/webp',
        encoding: 'base64',
      }),
      expect.objectContaining({ key: 'avatars/user-1.webp' }),
      expect.objectContaining({ key: 'logos/store-logo.webp' }),
    ]));
  });
});
