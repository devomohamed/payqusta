function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function getInventoryRows(product, variant = null) {
  if (variant && Array.isArray(variant.inventory)) return variant.inventory;
  if (!variant && Array.isArray(product?.inventory)) return product.inventory;
  return [];
}

function getBranchAvailabilityRows(product) {
  return Array.isArray(product?.branchAvailability) ? product.branchAvailability : [];
}

function getOnlineFulfillmentSettings(tenant = null) {
  const raw = tenant?.settings?.onlineFulfillment || tenant?.onlineFulfillment || {};

  return {
    mode: raw.mode || 'branch_priority',
    defaultOnlineBranchId: toIdString(raw.defaultOnlineBranchId),
    branchPriorityOrder: [...new Set(
      (Array.isArray(raw.branchPriorityOrder) ? raw.branchPriorityOrder : [])
        .map((branchId) => toIdString(branchId))
        .filter(Boolean)
    )],
    allowCrossBranchOnlineAllocation: Boolean(raw.allowCrossBranchOnlineAllocation),
    allowMixedBranchOrders: Boolean(raw.allowMixedBranchOrders),
  };
}

function sortEligibleBranches(branches = [], branchPriorityOrder = []) {
  const priorityIndex = new Map(
    branchPriorityOrder.map((branchId, index) => [toIdString(branchId), index])
  );

  return [...branches]
    .filter((branch) => branch && branch.isActive !== false && branch.participatesInOnlineOrders)
    .sort((left, right) => {
      const leftId = toIdString(left._id || left);
      const rightId = toIdString(right._id || right);
      const leftExplicitRank = priorityIndex.has(leftId) ? priorityIndex.get(leftId) : Number.MAX_SAFE_INTEGER;
      const rightExplicitRank = priorityIndex.has(rightId) ? priorityIndex.get(rightId) : Number.MAX_SAFE_INTEGER;

      if (leftExplicitRank !== rightExplicitRank) {
        return leftExplicitRank - rightExplicitRank;
      }

      const leftPriority = Number(left.onlinePriority) || 100;
      const rightPriority = Number(right.onlinePriority) || 100;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (Boolean(left.isFulfillmentCenter) !== Boolean(right.isFulfillmentCenter)) {
        return left.isFulfillmentCenter ? -1 : 1;
      }

      return leftId.localeCompare(rightId);
    });
}

function buildOnlineBranchCandidateIds({
  tenant = null,
  branches = [],
  source = 'online_store',
  customerBranchId = null,
}) {
  const settings = getOnlineFulfillmentSettings(tenant);
  const eligibleBranches = sortEligibleBranches(branches, settings.branchPriorityOrder);
  const eligibleBranchIds = eligibleBranches.map((branch) => toIdString(branch._id || branch));
  const eligibleSet = new Set(eligibleBranchIds);

  const orderedBranchIds = [];
  const pushBranchId = (branchId) => {
    const normalizedBranchId = toIdString(branchId);
    if (!normalizedBranchId || !eligibleSet.has(normalizedBranchId) || orderedBranchIds.includes(normalizedBranchId)) {
      return;
    }
    orderedBranchIds.push(normalizedBranchId);
  };

  if (settings.mode === 'default_branch') {
    pushBranchId(settings.defaultOnlineBranchId);
  } else if (settings.mode === 'customer_branch' && source === 'portal') {
    pushBranchId(customerBranchId);
    pushBranchId(settings.defaultOnlineBranchId);
  }

  for (const branchId of settings.branchPriorityOrder) {
    pushBranchId(branchId);
  }

  for (const branchId of eligibleBranchIds) {
    pushBranchId(branchId);
  }

  return orderedBranchIds;
}

function getBranchAvailableQuantity({
  product,
  variant = null,
  branchId = null,
  channel = 'pos',
}) {
  const normalizedBranchId = toIdString(branchId);
  const inventoryRows = getInventoryRows(product, variant).filter((row) => row?.branch);
  const availabilityRows = getBranchAvailabilityRows(product);
  const branchAvailability = availabilityRows.find(
    (row) => toIdString(row.branch) === normalizedBranchId
  );

  if (!normalizedBranchId) {
    return variant
      ? (Number(variant.stock) || 0)
      : (Number(product?.stock?.quantity) || 0);
  }

  const inventoryRow = inventoryRows.find(
    (row) => toIdString(row.branch) === normalizedBranchId
  );

  if (!inventoryRow && inventoryRows.length > 0) {
    return 0;
  }

  if (branchAvailability && branchAvailability.isAvailableInBranch === false) {
    return 0;
  }

  if (channel === 'online' && branchAvailability && branchAvailability.isSellableOnline === false) {
    return 0;
  }

  if (channel === 'pos' && branchAvailability && branchAvailability.isSellableInPos === false) {
    return 0;
  }

  if (inventoryRow) {
    const rawQuantity = Number(inventoryRow.quantity) || 0;
    if (channel === 'online') {
      const safetyStock = Number(branchAvailability?.safetyStock) || 0;
      const onlineReserveQty = Number(branchAvailability?.onlineReserveQty) || 0;
      return Math.max(0, rawQuantity - safetyStock - onlineReserveQty);
    }
    return rawQuantity;
  }

  return variant
    ? (Number(variant.stock) || 0)
    : (Number(product?.stock?.quantity) || 0);
}

function resolveInventoryAllocation({
  product,
  variant = null,
  quantity = 0,
  preferredBranchId = null,
  strictPreferredBranch = false,
  candidateBranchIds = [],
  channel = 'pos',
}) {
  const requestedQuantity = Math.max(0, Number(quantity) || 0);
  const normalizedPreferredBranchId = toIdString(preferredBranchId);
  const inventoryRows = getInventoryRows(product, variant).filter((row) => row?.branch);

  const orderedBranchIds = [];
  const pushCandidate = (branchId) => {
    const normalizedBranchId = toIdString(branchId);
    if (!normalizedBranchId || orderedBranchIds.includes(normalizedBranchId)) return;
    orderedBranchIds.push(normalizedBranchId);
  };

  if (normalizedPreferredBranchId) {
    pushCandidate(normalizedPreferredBranchId);
  }

  for (const branchId of candidateBranchIds) {
    pushCandidate(branchId);
  }

  if (orderedBranchIds.length === 0) {
    for (const row of inventoryRows) {
      pushCandidate(row.branch);
    }
  }

  if (normalizedPreferredBranchId && strictPreferredBranch) {
    return {
      branchId: normalizedPreferredBranchId,
      availableQuantity: getBranchAvailableQuantity({
        product,
        variant,
        branchId: normalizedPreferredBranchId,
        channel,
      }),
      usesInventory: inventoryRows.length > 0,
    };
  }

  let bestMatch = null;

  for (const branchId of orderedBranchIds) {
    const availableQuantity = getBranchAvailableQuantity({
      product,
      variant,
      branchId,
      channel,
    });

    if (availableQuantity >= requestedQuantity) {
      return {
        branchId,
        availableQuantity,
        usesInventory: inventoryRows.length > 0,
      };
    }

    if (!bestMatch || availableQuantity > bestMatch.availableQuantity) {
      bestMatch = {
        branchId,
        availableQuantity,
        usesInventory: inventoryRows.length > 0,
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  return {
    branchId: null,
    availableQuantity: variant
      ? (Number(variant.stock) || 0)
      : (Number(product?.stock?.quantity) || 0),
    usesInventory: false,
  };
}

function deductInventoryAllocation({
  product,
  variant = null,
  branchId = null,
  quantity = 0,
}) {
  const deductionQuantity = Math.max(0, Number(quantity) || 0);
  const normalizedBranchId = toIdString(branchId);

  if (normalizedBranchId) {
    const inventoryRows = getInventoryRows(product, variant);
    const matchingRow = inventoryRows.find(
      (row) => toIdString(row.branch) === normalizedBranchId
    );

    if (matchingRow) {
      matchingRow.quantity = Math.max(0, (Number(matchingRow.quantity) || 0) - deductionQuantity);
      return;
    }
  }

  if (variant) {
    variant.stock = Math.max(0, (Number(variant.stock) || 0) - deductionQuantity);
    return;
  }

  if (!product.stock || typeof product.stock !== 'object') {
    product.stock = { quantity: 0 };
  }

  product.stock.quantity = Math.max(
    0,
    (Number(product.stock.quantity) || 0) - deductionQuantity
  );
}

function restockInventoryAllocation({
  product,
  variant = null,
  branchId = null,
  quantity = 0,
}) {
  const restockQuantity = Math.max(0, Number(quantity) || 0);
  const normalizedBranchId = toIdString(branchId);
  const inventoryRows = getInventoryRows(product, variant);

  if (normalizedBranchId) {
    const matchingRow = inventoryRows.find(
      (row) => toIdString(row.branch) === normalizedBranchId
    );

    if (matchingRow) {
      matchingRow.quantity = (Number(matchingRow.quantity) || 0) + restockQuantity;
      return;
    }

    if (Array.isArray(inventoryRows)) {
      inventoryRows.push({
        branch: branchId,
        quantity: restockQuantity,
        minQuantity: 0,
      });
      return;
    }
  }

  if (inventoryRows.length > 0) {
    inventoryRows[0].quantity = (Number(inventoryRows[0].quantity) || 0) + restockQuantity;
    return;
  }

  if (variant) {
    variant.stock = (Number(variant.stock) || 0) + restockQuantity;
    return;
  }

  if (!product.stock || typeof product.stock !== 'object') {
    product.stock = { quantity: 0 };
  }

  product.stock.quantity = (Number(product.stock.quantity) || 0) + restockQuantity;
}

function collectUniqueBranchIds(updates = []) {
  return [...new Set(
    (Array.isArray(updates) ? updates : [])
      .map((entry) => toIdString(entry?.branchId))
      .filter(Boolean)
  )];
}

module.exports = {
  buildOnlineBranchCandidateIds,
  collectUniqueBranchIds,
  deductInventoryAllocation,
  getBranchAvailableQuantity,
  getOnlineFulfillmentSettings,
  restockInventoryAllocation,
  resolveInventoryAllocation,
  toIdString,
};
