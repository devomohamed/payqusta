jest.mock('../../src/models/Invoice', () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../src/models/Customer', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Product', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../src/models/Coupon', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../src/models/Tenant', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/Branch', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/utils/helpers', () => ({
  generateInvoiceNumber: jest.fn(() => 'INV-TEST-001'),
  generateInstallmentSchedule: jest.fn(),
}));

jest.mock('../../src/utils/shippingHelpers', () => ({
  calculateTenantShippingSummary: jest.fn(() => ({
    shippingFee: 0,
    shippingDiscount: 0,
    carrierCost: 0,
  })),
  getTenantShippingSettings: jest.fn(() => ({
    supportsCashOnDelivery: true,
  })),
  normalizeInvoiceShippingSummary: jest.fn((value) => value || null),
}));

jest.mock('../../src/services/NotificationService', () => ({
  onOutOfStock: jest.fn(() => Promise.resolve()),
  onLowStock: jest.fn(() => Promise.resolve()),
  onInvoiceCreated: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/GamificationService', () => ({
  addXP: jest.fn(() => Promise.resolve()),
  checkAchievements: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/services/WhatsAppService', () => ({
  sendInvoiceNotification: jest.fn(() => Promise.resolve()),
}));

const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Product = require('../../src/models/Product');
const Tenant = require('../../src/models/Tenant');
const Branch = require('../../src/models/Branch');
const invoiceService = require('../../src/services/InvoiceService');

function buildPopulatedInvoice(invoiceData) {
  return {
    _id: 'invoice-1',
    ...invoiceData,
  };
}

describe('InvoiceService online branch allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores line allocatedBranch and invoice.branch from the forced online branch', async () => {
    const customer = {
      _id: 'customer-1',
      branch: 'branch-2',
      salesBlocked: false,
      financials: {
        outstandingBalance: 0,
        creditLimit: 0,
      },
      whatsapp: {
        enabled: false,
        notifications: {},
      },
      recordPurchase: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const product = {
      _id: 'product-1',
      tenant: 'tenant-1',
      isActive: true,
      isSuspended: false,
      name: 'منتج اختباري',
      price: 100,
      cost: 40,
      sku: 'SKU-1',
      stock: {
        quantity: 8,
        minQuantity: 1,
      },
      inventory: [
        { branch: 'branch-1', quantity: 8, minQuantity: 0 },
        { branch: 'branch-2', quantity: 2, minQuantity: 0 },
      ],
      branchAvailability: [
        { branch: 'branch-1', isAvailableInBranch: true, isSellableOnline: true, isSellableInPos: true },
        { branch: 'branch-2', isAvailableInBranch: true, isSellableOnline: true, isSellableInPos: true },
      ],
      variants: {
        id: jest.fn(() => null),
      },
      save: jest.fn().mockResolvedValue(undefined),
      outOfStockAlertSent: false,
      lowStockAlertSent: false,
    };

    Customer.findOne.mockResolvedValue(customer);
    Product.findOne.mockResolvedValue(product);
    Tenant.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'tenant-1',
        settings: {
          shipping: {},
          onlineFulfillment: {
            mode: 'branch_priority',
            defaultOnlineBranchId: null,
            branchPriorityOrder: [],
            allowCrossBranchOnlineAllocation: false,
            allowMixedBranchOrders: false,
          },
        },
        whatsapp: {},
      }),
    });
    Branch.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: 'branch-1', isActive: true, participatesInOnlineOrders: true, onlinePriority: 1, isFulfillmentCenter: true },
        { _id: 'branch-2', isActive: true, participatesInOnlineOrders: true, onlinePriority: 2, isFulfillmentCenter: false },
      ]),
    });

    let createdInvoiceData = null;
    Invoice.create.mockImplementation(async ([invoiceData]) => {
      createdInvoiceData = invoiceData;
      return [{ _id: 'invoice-1', ...invoiceData }];
    });
    Invoice.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    });

    // Build a stable final populated query chain.
    const finalInvoiceQuery = {
      populate: jest.fn().mockReturnThis(),
      then: undefined,
    };
    finalInvoiceQuery.populate.mockReturnValue(finalInvoiceQuery);
    Invoice.findById.mockReturnValue(finalInvoiceQuery);
    finalInvoiceQuery.populate.mockImplementation(() => finalInvoiceQuery);
    finalInvoiceQuery.then = undefined;
    finalInvoiceQuery[Symbol.toStringTag] = 'Promise';
    finalInvoiceQuery.catch = undefined;
    finalInvoiceQuery.finally = undefined;
    finalInvoiceQuery.exec = undefined;

    // The service awaits the query object directly, so return a real thenable.
    Invoice.findById.mockReturnValue({
      populate() {
        return this;
      },
      then(resolve) {
        return Promise.resolve(resolve(buildPopulatedInvoice(createdInvoiceData)));
      },
    });

    const invoice = await invoiceService.createInvoice('tenant-1', null, {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 3 }],
      paymentMethod: 'cash_on_delivery',
      source: 'online_store',
    });

    expect(createdInvoiceData.branch).toBe('branch-1');
    expect(createdInvoiceData.items).toHaveLength(1);
    expect(createdInvoiceData.items[0].allocatedBranch).toBe('branch-1');
    expect(product.inventory[0].quantity).toBe(5);
    expect(product.inventory[1].quantity).toBe(2);
    expect(customer.recordPurchase).toHaveBeenCalledWith(270, 0);
    expect(invoice.branch).toBe('branch-1');
    expect(invoice.items[0].allocatedBranch).toBe('branch-1');
    expect(invoice.discount).toBe(30);
  });
});
