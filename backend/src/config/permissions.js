/**
 * Permission Constants
 * Defines available resources and actions for the permission system
 */

const RESOURCES = {
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    INVOICES: 'invoices',
    BRANCHES: 'branches',
    EXPENSES: 'expenses',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    USERS: 'users',
    STOCK_ADJUSTMENTS: 'stock_adjustments',
    CASH_SHIFTS: 'cash_shifts',
    PURCHASE_ORDERS: 'purchase_orders',
    SUPPLIER_REPLENISHMENT_REQUESTS: 'supplier_replenishment_requests',
};

const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
};

const RESOURCE_VALUES = Object.values(RESOURCES);
const ACTION_VALUES = Object.values(ACTIONS);

module.exports = {
  RESOURCES,
  RESOURCE_VALUES,
  ACTIONS,
  ACTION_VALUES,
  // Default role permissions
  DEFAULT_ROLES: {
    VENDOR: {
      name: 'Vendor Admin',
      permissions: [
        { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'customers', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'invoices', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'branches', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'expenses', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'settings', actions: ['read', 'update'] },
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'stock_adjustments', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'cash_shifts', actions: ['create', 'read', 'update'] },
        { resource: 'purchase_orders', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'supplier_replenishment_requests', actions: ['create', 'read', 'update', 'delete'] },
      ],
    },
    COORDINATOR: {
      name: 'Coordinator',
      permissions: [
        { resource: 'products', actions: ['create', 'read', 'update'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'suppliers', actions: ['read'] },
        { resource: 'invoices', actions: ['create', 'read'] },
        { resource: 'branches', actions: ['read', 'update'] },
        { resource: 'expenses', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'stock_adjustments', actions: ['create', 'read'] },
        { resource: 'cash_shifts', actions: ['create', 'read'] },
        { resource: 'purchase_orders', actions: ['read'] },
        { resource: 'supplier_replenishment_requests', actions: ['read'] },
      ],
    },
    CASHIER: {
      name: 'Cashier',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'invoices', actions: ['create', 'read'] },
        { resource: 'branches', actions: ['read'] },
        { resource: 'cash_shifts', actions: ['create', 'read'] },
      ],
    },
  },
};
