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
  getTenantShippingSettings: jest.fn(() => ({
    supportsCashOnDelivery: true,
  })),
  normalizeInvoiceShippingSummary: jest.fn((value) => value || null),
}));

jest.mock('../../src/utils/shippingQuoteResolver', () => ({
  resolveTenantShippingQuote: jest.fn(),
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
const { resolveTenantShippingQuote } = require('../../src/utils/shippingQuoteResolver');
const invoiceService = require('../../src/services/InvoiceService');

function buildPopulatedInvoice(invoiceData) {
  return {
    _id: 'invoice-1',
    ...invoiceData,
  };
}

function buildOnlineCustomer() {
  return {
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
}

function buildOnlineProduct() {
  return {
    _id: 'product-1',
    tenant: 'tenant-1',
    isActive: true,
    isSuspended: false,
    name: 'Ù…Ù†ØªØ¬ Ø§Ø®ØªØ¨Ø§Ø±ÙŠ',
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
}

function mockInvoiceFindByIdResult(createdInvoiceRef) {
  Invoice.findById.mockReturnValue({
    populate() {
      return this;
    },
    then(resolve) {
      return Promise.resolve(resolve(buildPopulatedInvoice(createdInvoiceRef.current)));
    },
  });
}

function arrangeOnlineInvoiceCreation({
  customer = buildOnlineCustomer(),
  product = buildOnlineProduct(),
  shippingQuote,
  shippingSettings = {},
} = {}) {
  Customer.findOne.mockResolvedValue(customer);
  Product.findOne.mockResolvedValue(product);
  Tenant.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: 'tenant-1',
      settings: {
        shipping: shippingSettings,
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
  resolveTenantShippingQuote.mockResolvedValue(shippingQuote);

  const createdInvoiceRef = { current: null };
  Invoice.create.mockImplementation(async ([invoiceData]) => {
    createdInvoiceRef.current = invoiceData;
    return [{ _id: 'invoice-1', ...invoiceData }];
  });
  mockInvoiceFindByIdResult(createdInvoiceRef);

  return {
    customer,
    product,
    createdInvoiceRef,
  };
}

describe('InvoiceService online branch allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores line allocatedBranch and invoice.branch from the forced online branch', async () => {
    const { customer, product, createdInvoiceRef } = arrangeOnlineInvoiceCreation({
      shippingQuote: {
        ok: true,
        shippingSummary: {
          shippingFee: 0,
          shippingDiscount: 0,
          carrierCost: 0,
        },
      },
    });

    const invoice = await invoiceService.createInvoice('tenant-1', null, {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 3 }],
      paymentMethod: 'cash_on_delivery',
      source: 'online_store',
    });

    expect(createdInvoiceRef.current.branch).toBe('branch-1');
    expect(createdInvoiceRef.current.items).toHaveLength(1);
    expect(createdInvoiceRef.current.items[0].allocatedBranch).toBe('branch-1');
    expect(product.inventory[0].quantity).toBe(5);
    expect(product.inventory[1].quantity).toBe(2);
    expect(customer.recordPurchase).toHaveBeenCalledWith(270, 0);
    expect(invoice.branch).toBe('branch-1');
    expect(invoice.items[0].allocatedBranch).toBe('branch-1');
    expect(invoice.discount).toBe(30);
  });

  it('persists the shipping snapshot returned by the unified quote resolver', async () => {
    const { createdInvoiceRef } = arrangeOnlineInvoiceCreation({
      shippingSettings: {
        defaultShippingBranchId: 'branch-default',
      },
      shippingQuote: {
        ok: true,
        shippingBranch: { branchId: 'branch-shipping-x' },
        shippingSummary: {
          shippingFee: 55,
          shippingDiscount: 5,
          carrierCost: 42,
          shippingMethod: 'Dynamic API',
          zoneCode: 'cairo',
          zoneLabel: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© Ø§Ù„ÙƒØ¨Ø±Ù‰',
          shipmentId: 'ship-123',
          trackingNumber: 'trk-123',
          estimatedDeliveryDate: new Date('2026-03-30T00:00:00.000Z'),
          provider: 'bosta',
          trackingUrl: 'https://tracking.example/trk-123',
        },
      },
    });

    await invoiceService.createInvoice('tenant-1', null, {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
      source: 'online_store',
      shippingAddress: {
        fullName: 'Ø£Ø­Ù…Ø¯',
        phone: '0100000000',
        address: 'Ø´Ø§Ø±Ø¹ Ø§Ù„ØªØ­Ø±ÙŠØ±',
        city: 'Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',
        governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
        notes: 'Ø§Ù„Ø¯ÙˆØ± Ø§Ù„Ø«Ø§Ù†ÙŠ',
      },
      shippingSummary: {
        shippingFee: 999,
      },
    });

    expect(createdInvoiceRef.current.shippingFee).toBe(55);
    expect(createdInvoiceRef.current.shippingDiscount).toBe(5);
    expect(createdInvoiceRef.current.carrierCost).toBe(42);
    expect(createdInvoiceRef.current.shippingMethod).toBe('Dynamic API');
    expect(createdInvoiceRef.current.shippingZone).toEqual({
      code: 'cairo',
      label: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© Ø§Ù„ÙƒØ¨Ø±Ù‰',
    });
    expect(createdInvoiceRef.current.shipmentId).toBe('ship-123');
    expect(createdInvoiceRef.current.trackingNumber).toBe('trk-123');
    expect(createdInvoiceRef.current.shippingDetails).toEqual({
      provider: 'bosta',
      waybillNumber: 'trk-123',
      trackingUrl: 'https://tracking.example/trk-123',
      status: 'created',
    });
    expect(createdInvoiceRef.current.fulfillmentBranch).toBe('branch-shipping-x');
    expect(createdInvoiceRef.current.fulfillmentStatus).toBe('pending_review');
    expect(createdInvoiceRef.current.shippingAddress).toEqual({
      fullName: 'Ø£Ø­Ù…Ø¯',
      phone: '0100000000',
      address: 'Ø´Ø§Ø±Ø¹ Ø§Ù„ØªØ­Ø±ÙŠØ±',
      city: 'Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',
      governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
      notes: 'Ø§Ù„Ø¯ÙˆØ± Ø§Ù„Ø«Ø§Ù†ÙŠ',
    });
  });

  it('creates an online order for manual review when no single branch can fulfill it', async () => {
    const { customer, product, createdInvoiceRef } = arrangeOnlineInvoiceCreation({
      shippingSettings: {
        defaultShippingBranchId: 'branch-default',
      },
      shippingQuote: {
        ok: true,
        shippingBranch: { branchId: 'branch-shipping-x' },
        shippingSummary: {
          shippingFee: 0,
          shippingDiscount: 0,
          carrierCost: 0,
        },
      },
    });

    const invoice = await invoiceService.createInvoice('tenant-1', null, {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 9 }],
      paymentMethod: 'cash_on_delivery',
      source: 'online_store',
    });

    expect(createdInvoiceRef.current.fulfillmentBranch).toBe('branch-shipping-x');
    expect(createdInvoiceRef.current.fulfillmentStatus).toBe('pending_review');
    expect(createdInvoiceRef.current.branch).toBeUndefined();
    expect(createdInvoiceRef.current.items[0].allocatedBranch).toBeNull();
    expect(product.inventory[0].quantity).toBe(8);
    expect(product.inventory[1].quantity).toBe(2);
    expect(customer.recordPurchase).toHaveBeenCalledWith(810, 0);
    expect(invoice.fulfillmentStatus).toBe('pending_review');
    expect(invoice.items[0].allocatedBranch).toBeNull();
  });
  it('blocks invoice creation when the shipping quote resolver rejects the destination', async () => {
    arrangeOnlineInvoiceCreation({
      shippingQuote: {
        ok: false,
        errorMessage: 'Ø®Ø¯Ù…Ø© Ø§Ù„Ø´Ø­Ù† ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©',
        errorCode: 'SHIPPING_UNAVAILABLE',
      },
    });

    await expect(invoiceService.createInvoice('tenant-1', null, {
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
      source: 'online_store',
      shippingAddress: {
        fullName: 'Ø£Ø­Ù…Ø¯',
        phone: '0100000000',
        address: 'Ø´Ø§Ø±Ø¹ Ø§Ù„ØªØ­Ø±ÙŠØ±',
        city: 'Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',
        governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
      },
    })).rejects.toMatchObject({
      message: 'Ø®Ø¯Ù…Ø© Ø§Ù„Ø´Ø­Ù† ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©',
      statusCode: 400,
      code: 'SHIPPING_UNAVAILABLE',
    });

    expect(Invoice.create).not.toHaveBeenCalled();
  });
});


