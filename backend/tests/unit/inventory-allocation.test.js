const {
  buildOnlineBranchCandidateIds,
  collectUniqueBranchIds,
  deductInventoryAllocation,
  getBranchAvailableQuantity,
  getOnlineFulfillmentSettings,
  restockInventoryAllocation,
  resolveInventoryAllocation,
} = require('../../src/utils/inventoryAllocation');

describe('inventoryAllocation helpers', () => {
  it('normalizes tenant online fulfillment settings safely', () => {
    const settings = getOnlineFulfillmentSettings({
      settings: {
        onlineFulfillment: {
          mode: 'customer_branch',
          defaultOnlineBranchId: { _id: 'branch-default' },
          branchPriorityOrder: ['branch-b', 'branch-b', { _id: 'branch-a' }],
          allowCrossBranchOnlineAllocation: true,
          allowMixedBranchOrders: false,
        },
      },
    });

    expect(settings).toEqual({
      mode: 'customer_branch',
      defaultOnlineBranchId: 'branch-default',
      branchPriorityOrder: ['branch-b', 'branch-a'],
      allowCrossBranchOnlineAllocation: true,
      allowMixedBranchOrders: false,
    });
  });

  it('builds ordered online branch candidates from customer branch and priority settings', () => {
    const branch1 = { _id: 'branch-1', isActive: true, participatesInOnlineOrders: true, onlinePriority: 3 };
    const branch2 = { _id: 'branch-2', isActive: true, participatesInOnlineOrders: true, onlinePriority: 2 };
    const branch3 = { _id: 'branch-3', isActive: true, participatesInOnlineOrders: true, onlinePriority: 1, isFulfillmentCenter: true };

    const candidates = buildOnlineBranchCandidateIds({
      tenant: {
        settings: {
          onlineFulfillment: {
            mode: 'customer_branch',
            defaultOnlineBranchId: 'branch-2',
            branchPriorityOrder: ['branch-3'],
          },
        },
      },
      branches: [branch1, branch2, branch3],
      source: 'portal',
      customerBranchId: 'branch-1',
    });

    expect(candidates).toEqual(['branch-1', 'branch-2', 'branch-3']);
  });

  it('subtracts safety and reserved stock for online channels', () => {
    const product = {
      inventory: [{ branch: 'branch-1', quantity: 12 }],
      branchAvailability: [{
        branch: 'branch-1',
        isAvailableInBranch: true,
        isSellableOnline: true,
        safetyStock: 2,
        onlineReserveQty: 3,
      }],
    };

    expect(
      getBranchAvailableQuantity({
        product,
        branchId: 'branch-1',
        channel: 'online',
      })
    ).toBe(7);

    expect(
      getBranchAvailableQuantity({
        product,
        branchId: 'branch-1',
        channel: 'pos',
      })
    ).toBe(12);
  });

  it('rejects branches that are not sellable online', () => {
    const product = {
      inventory: [{ branch: 'branch-1', quantity: 5 }],
      branchAvailability: [{
        branch: 'branch-1',
        isAvailableInBranch: true,
        isSellableOnline: false,
      }],
    };

    expect(
      getBranchAvailableQuantity({
        product,
        branchId: 'branch-1',
        channel: 'online',
      })
    ).toBe(0);
  });

  it('allocates to the first branch that can satisfy the requested online quantity', () => {
    const product = {
      inventory: [
        { branch: 'branch-1', quantity: 3 },
        { branch: 'branch-2', quantity: 9 },
      ],
      branchAvailability: [
        { branch: 'branch-1', isAvailableInBranch: true, isSellableOnline: true },
        { branch: 'branch-2', isAvailableInBranch: true, isSellableOnline: true },
      ],
    };

    const result = resolveInventoryAllocation({
      product,
      quantity: 5,
      candidateBranchIds: ['branch-1', 'branch-2'],
      channel: 'online',
    });

    expect(result).toEqual({
      branchId: 'branch-2',
      availableQuantity: 9,
      usesInventory: true,
    });
  });

  it('prefers the default branch mode when the configured branch is eligible', () => {
    const candidates = buildOnlineBranchCandidateIds({
      tenant: {
        settings: {
          onlineFulfillment: {
            mode: 'default_branch',
            defaultOnlineBranchId: 'branch-2',
            branchPriorityOrder: ['branch-1', 'branch-3'],
          },
        },
      },
      branches: [
        { _id: 'branch-1', isActive: true, participatesInOnlineOrders: true, onlinePriority: 3 },
        { _id: 'branch-2', isActive: true, participatesInOnlineOrders: true, onlinePriority: 10 },
        { _id: 'branch-3', isActive: true, participatesInOnlineOrders: true, onlinePriority: 1 },
      ],
      source: 'online_store',
    });

    expect(candidates[0]).toBe('branch-2');
    expect(candidates).toEqual(['branch-2', 'branch-1', 'branch-3']);
  });

  it('returns the preferred branch allocation when strictPreferredBranch is enabled', () => {
    const product = {
      inventory: [
        { branch: 'branch-1', quantity: 2 },
        { branch: 'branch-2', quantity: 8 },
      ],
      branchAvailability: [
        { branch: 'branch-1', isAvailableInBranch: true, isSellableOnline: true },
        { branch: 'branch-2', isAvailableInBranch: true, isSellableOnline: true },
      ],
    };

    const result = resolveInventoryAllocation({
      product,
      quantity: 5,
      preferredBranchId: 'branch-1',
      strictPreferredBranch: true,
      candidateBranchIds: ['branch-2'],
      channel: 'online',
    });

    expect(result).toEqual({
      branchId: 'branch-1',
      availableQuantity: 2,
      usesInventory: true,
    });
  });

  it('deducts and restocks branch inventory rows without touching unrelated branches', () => {
    const product = {
      inventory: [
        { branch: 'branch-1', quantity: 10 },
        { branch: 'branch-2', quantity: 4 },
      ],
    };

    deductInventoryAllocation({
      product,
      branchId: 'branch-1',
      quantity: 3,
    });

    expect(product.inventory).toEqual([
      { branch: 'branch-1', quantity: 7 },
      { branch: 'branch-2', quantity: 4 },
    ]);

    restockInventoryAllocation({
      product,
      branchId: 'branch-2',
      quantity: 5,
    });

    expect(product.inventory).toEqual([
      { branch: 'branch-1', quantity: 7 },
      { branch: 'branch-2', quantity: 9 },
    ]);
  });

  it('collects unique branch ids from allocation updates', () => {
    expect(
      collectUniqueBranchIds([
        { branchId: 'branch-1' },
        { branchId: { _id: 'branch-2' } },
        { branchId: 'branch-1' },
        { branchId: null },
      ])
    ).toEqual(['branch-1', 'branch-2']);
  });
});
