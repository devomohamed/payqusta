jest.mock('../../src/models/Product', () => ({
  find: jest.fn(),
}));

jest.mock('../../src/utils/inventoryAllocation', () => ({
  restockInventoryAllocation: jest.fn(),
  toIdString: jest.requireActual('../../src/utils/inventoryAllocation').toIdString,
}));

const Product = require('../../src/models/Product');
const {
  restockInventoryAllocation,
} = require('../../src/utils/inventoryAllocation');
const {
  calculateRefundAmountForItems,
  restockInvoiceItems,
} = require('../../src/utils/orderLifecycle');

describe('orderLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restocks invoice items using the line allocatedBranch first', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const product = {
      _id: 'product-1',
      variants: { id: jest.fn().mockReturnValue(null) },
      save,
    };
    Product.find.mockResolvedValue([product]);

    const invoice = {
      tenant: 'tenant-1',
      branch: 'invoice-branch',
      items: [
        {
          product: 'product-1',
          quantity: 2,
          allocatedBranch: 'allocated-branch',
        },
      ],
    };

    const result = await restockInvoiceItems(invoice, [
      { productId: 'product-1', quantity: 2 },
    ]);

    expect(restockInventoryAllocation).toHaveBeenCalledWith({
      product,
      variant: null,
      branchId: 'allocated-branch',
      quantity: 2,
    });
    expect(save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(result).toEqual({ restockedItems: 1, totalQuantity: 2 });
  });

  it('calculates partial refunds from unit prices on invoice items', () => {
    const invoice = {
      items: [
        {
          product: 'product-1',
          quantity: 4,
          unitPrice: 25,
          totalPrice: 100,
        },
      ],
    };

    const refund = calculateRefundAmountForItems(invoice, [
      { productId: 'product-1', quantity: 3 },
    ]);

    expect(refund).toBe(75);
  });
});
