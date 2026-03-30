const Role = require('../models/Role');
const { RESOURCES, ACTIONS } = require('../config/permissions');

const BRANCH_MANAGER_ROLE_NAME = 'مدير فرع';
const BRANCH_MANAGER_ROLE_DESCRIPTION = 'يدير تشغيل الفرع اليومي والمبيعات والتحويلات والمخزون دون صلاحيات الإدارة العليا أو إدارة المستخدمين.';

const BRANCH_MANAGER_PERMISSIONS = [
  { resource: RESOURCES.PRODUCTS, actions: [ACTIONS.READ, ACTIONS.UPDATE] },
  { resource: RESOURCES.STOCK_ADJUSTMENTS, actions: [ACTIONS.CREATE, ACTIONS.READ] },
  { resource: RESOURCES.PURCHASE_ORDERS, actions: [ACTIONS.READ] },
  { resource: RESOURCES.SUPPLIER_REPLENISHMENT_REQUESTS, actions: [ACTIONS.CREATE, ACTIONS.READ] },
  { resource: RESOURCES.SUPPLIERS, actions: [ACTIONS.READ] },
  { resource: RESOURCES.CUSTOMERS, actions: [ACTIONS.READ] },
  { resource: RESOURCES.INVOICES, actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE] },
  { resource: RESOURCES.CASH_SHIFTS, actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE] },
  { resource: RESOURCES.BRANCHES, actions: [ACTIONS.READ] },
  { resource: RESOURCES.EXPENSES, actions: [ACTIONS.CREATE, ACTIONS.READ] },
  { resource: RESOURCES.REPORTS, actions: [ACTIONS.READ] },
];

async function ensureBranchManagerRole(tenantId) {
  if (!tenantId) return null;

  return Role.findOneAndUpdate(
    {
      tenant: tenantId,
      name: BRANCH_MANAGER_ROLE_NAME,
    },
    {
      $set: {
        tenant: tenantId,
        name: BRANCH_MANAGER_ROLE_NAME,
        description: BRANCH_MANAGER_ROLE_DESCRIPTION,
        permissions: BRANCH_MANAGER_PERMISSIONS,
        isSystem: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function ensureTenantSystemRoles(tenantId) {
  if (!tenantId) return [];

  const branchManagerRole = await ensureBranchManagerRole(tenantId);
  return branchManagerRole ? [branchManagerRole] : [];
}

module.exports = {
  BRANCH_MANAGER_ROLE_NAME,
  BRANCH_MANAGER_ROLE_DESCRIPTION,
  BRANCH_MANAGER_PERMISSIONS,
  ensureBranchManagerRole,
  ensureTenantSystemRoles,
};
