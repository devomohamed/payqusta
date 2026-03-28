jest.mock('../../src/models/Invoice', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/models/Branch', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/StockTransfer', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/services/NotificationService', () => ({
  sendDeduped: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/FulfillmentService', () => ({
  analyzeInvoiceFulfillment: jest.fn(),
}));

jest.mock('../../src/utils/inventoryAllocation', () => {
  const actual = jest.requireActual('../../src/utils/inventoryAllocation');
  return {
    ...actual,
    getBranchAvailableQuantity: jest.fn(),
  };
});

const Invoice = require('../../src/models/Invoice');
const Product = require('../../src/models/Product');
const Branch = require('../../src/models/Branch');
const StockTransfer = require('../../src/models/StockTransfer');
const NotificationService = require('../../src/services/NotificationService');
const { getBranchAvailableQuantity } = require('../../src/utils/inventoryAllocation');
const stockTransferController = require('../../src/controllers/stockTransferController');

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

describe('StockTransferController.updateStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks source-branch actions for users outside the transfer scope', async () => {
    const transfer = {
      _id: 'transfer-1',
      tenant: 'tenant-1',
      status: 'requested',
      fromBranch: 'branch-source',
      toBranch: 'branch-destination',
      items: [],
    };

    StockTransfer.findOne.mockResolvedValue(transfer);

    const req = {
      params: { id: 'transfer-1' },
      tenantId: 'tenant-1',
      user: {
        role: 'vendor',
        branch: 'branch-other',
      },
      body: {
        status: 'approved',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    stockTransferController.updateStatus(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
    expect(Invoice.findOne).not.toHaveBeenCalled();
  });

  it('moves a prepared transfer to in_transit and deducts source inventory once', async () => {
    const transfer = {
      _id: 'transfer-2',
      tenant: 'tenant-1',
      transferNumber: 'TR-2001',
      status: 'prepared',
      fromBranch: 'branch-source',
      toBranch: 'branch-destination',
      order: 'invoice-1',
      items: [
        {
          product: 'product-1',
          variant: null,
          productName: 'منتج',
          requestedQty: 3,
          shippedQty: 0,
        },
      ],
      reminders: {
        overdueSince: new Date('2026-03-26T00:00:00.000Z'),
        lastOverdueReminderAt: new Date('2026-03-26T02:00:00.000Z'),
        lastOverdueStatus: 'prepared',
      },
      timeline: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    const invoice = {
      _id: 'invoice-1',
      invoiceNumber: 'INV-1',
      orderStatus: 'pending',
      fulfillmentStatus: 'awaiting_stock_transfer',
      orderStatusHistory: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    const product = {
      _id: 'product-1',
      inventory: [
        { branch: 'branch-source', quantity: 5, minQuantity: 0 },
      ],
      variants: { id: jest.fn(() => null) },
      save: jest.fn().mockResolvedValue(undefined),
    };

    StockTransfer.findOne.mockResolvedValue(transfer);
    Invoice.findOne.mockResolvedValue(invoice);
    Product.find.mockResolvedValue([product]);
    getBranchAvailableQuantity.mockReturnValue(5);
    Branch.findById
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'branch-source', name: 'Branch Y', manager: 'manager-y' }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'branch-destination', name: 'Branch X', manager: 'manager-x' }) });

    const req = {
      params: { id: 'transfer-2' },
      tenantId: 'tenant-1',
      user: {
        role: 'vendor',
        branch: 'branch-source',
        _id: 'user-1',
      },
      body: {
        status: 'in_transit',
        notes: 'تم الشحن الداخلي',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    stockTransferController.updateStatus(req, res, next);
    await flushAsync();

    expect(next).not.toHaveBeenCalled();
    expect(product.inventory[0].quantity).toBe(2);
    expect(transfer.items[0].shippedQty).toBe(3);
    expect(transfer.stockDeductedAt).toBeInstanceOf(Date);
    expect(transfer.status).toBe('in_transit');
    expect(transfer.reminders).toEqual({
      overdueSince: null,
      lastOverdueReminderAt: null,
      lastOverdueStatus: null,
    });
    expect(invoice.fulfillmentStatus).toBe('transfer_in_progress');
    expect(product.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(transfer.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(invoice.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(NotificationService.sendDeduped).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 'tenant-1',
        recipient: 'manager-x',
        relatedId: 'invoice-1',
      }),
      expect.any(Object)
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
