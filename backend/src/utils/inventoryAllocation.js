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

function resolveInventoryAllocation({
  product,
  variant = null,
  quantity = 0,
  preferredBranchId = null,
  strictPreferredBranch = false,
}) {
  const requestedQuantity = Math.max(0, Number(quantity) || 0);
  const normalizedPreferredBranchId = toIdString(preferredBranchId);
  const inventoryRows = getInventoryRows(product, variant).filter((row) => row?.branch);

  if (normalizedPreferredBranchId) {
    const preferredRow = inventoryRows.find(
      (row) => toIdString(row.branch) === normalizedPreferredBranchId
    );

    if (preferredRow) {
      return {
        branchId: normalizedPreferredBranchId,
        availableQuantity: Number(preferredRow.quantity) || 0,
        usesInventory: true,
      };
    }

    if (strictPreferredBranch) {
      return {
        branchId: normalizedPreferredBranchId,
        availableQuantity: 0,
        usesInventory: inventoryRows.length > 0,
      };
    }
  }

  if (inventoryRows.length > 0) {
    const matchedRow =
      inventoryRows.find((row) => (Number(row.quantity) || 0) >= requestedQuantity) ||
      inventoryRows.reduce((bestRow, currentRow) => {
        const bestQuantity = Number(bestRow?.quantity) || 0;
        const currentQuantity = Number(currentRow?.quantity) || 0;
        return currentQuantity > bestQuantity ? currentRow : bestRow;
      }, inventoryRows[0]);

    return {
      branchId: toIdString(matchedRow.branch),
      availableQuantity: Number(matchedRow.quantity) || 0,
      usesInventory: true,
    };
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
  collectUniqueBranchIds,
  deductInventoryAllocation,
  restockInventoryAllocation,
  resolveInventoryAllocation,
  toIdString,
};
