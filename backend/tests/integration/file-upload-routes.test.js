jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../src/controllers/importController', () => ({
  importProducts: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'import-products' })),
  importCustomers: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'import-customers' })),
  previewFile: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'import-preview' })),
  downloadTemplate: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'import-template' })),
}));

jest.mock('../../src/controllers/backupController', () => ({
  exportData: jest.fn(),
  exportJSON: jest.fn(),
  getStats: jest.fn(),
  restoreData: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'backup-restore' })),
  restoreJSON: jest.fn((req, res) => res.status(200).json({ success: true, kind: 'backup-restore-json' })),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/Tenant');
const Product = require('../../src/models/Product');
const importController = require('../../src/controllers/importController');
const backupController = require('../../src/controllers/backupController');
const { createApiClient } = require('../helpers/apiClient');

const api = createApiClient();

const createSelectResult = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe('File upload route hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    jwt.verify.mockReturnValue({
      id: 'user-1',
      tenant: 'tenant-1',
      iat: 2000000000,
      sv: 0,
    });

    User.findById.mockReturnValue(createSelectResult({
      _id: 'user-1',
      tenant: 'tenant-1',
      role: 'admin',
      isActive: true,
      sessionVersion: 0,
      changedPasswordAfter: jest.fn().mockReturnValue(false),
    }));
    Tenant.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'tenant-1',
        subscription: {
          status: 'active',
          maxProducts: 50,
        },
      }),
    });
    Product.countDocuments.mockResolvedValue(0);
  });

  it('allows valid product import files to reach the controller', async () => {
    const res = await api
      .post('/api/v1/import/products')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from('sku,name\nA-1,Product One\n'), {
        filename: 'products.csv',
        contentType: 'text/csv',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(importController.importProducts).toHaveBeenCalled();
  });

  it('rejects invalid import file types before hitting the controller', async () => {
    const res = await api
      .post('/api/v1/import/products')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from('{"bad":true}'), {
        filename: 'payload.json',
        contentType: 'application/json',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(importController.importProducts).not.toHaveBeenCalled();
  });

  it('rejects invalid backup restore json uploads before hitting the controller', async () => {
    const res = await api
      .post('/api/v1/backup/restore-json')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'backup.png',
        contentType: 'image/png',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(backupController.restoreJSON).not.toHaveBeenCalled();
  });
});
