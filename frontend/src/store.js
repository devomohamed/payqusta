/**
 * PayQusta — Global State Management (Zustand)
 * Manages auth, theme, and API communication
 */

import { create } from 'zustand';
import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getStoredThemeMode = () => {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const storedMode = localStorage.getItem('payqusta_theme_mode');
  if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
    return storedMode;
  }

  const legacyTheme = localStorage.getItem('payqusta_theme');
  if (legacyTheme === 'light' || legacyTheme === 'dark') {
    return legacyTheme;
  }

  return 'system';
};

const resolveDarkMode = (themeMode) => {
  if (themeMode === 'system') {
    return getSystemPrefersDark();
  }
  return themeMode === 'dark';
};

// Configure Axios defaults
export const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.setContentType === 'function') {
      config.headers.setContentType(undefined);
    } else if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }

  const token = localStorage.getItem('payqusta_token');
  if (token) {
    // Self-heal: If token is absurdly large (e.g. > 10KB due to old bug storing base64 logos), clear it to prevent 431 errors
    if (token.length > 10000) {
      console.warn('PayQusta: Detected oversized legacy token. Clearing and redirecting to login to prevent 431 errors.');
      localStorage.removeItem('payqusta_token');
      window.location.href = '/login';
      return Promise.reject(new Error('Token too large, redirecting to login.'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If we are currently logging out, don't trigger the interceptor redirect
      // to avoid jumping to the login screen before the logout state is ready.
      if (useAuthStore.getState().loggingOut) {
        return Promise.reject(error);
      }

      localStorage.removeItem('payqusta_token');
      // Only redirect to admin login if NOT in portal
      if (!window.location.pathname.startsWith('/portal')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ========== AUTH STORE ==========
export const useAuthStore = create((set, get) => ({
  user: null,
  tenant: null,
  permissions: [],
  token: localStorage.getItem('payqusta_token'),
  isAuthenticated: !!localStorage.getItem('payqusta_token'),
  loading: false,
  loadingUser: false,
  loggingOut: false,

  login: async (identifier, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      localStorage.setItem('payqusta_token', data.data.token);
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        permissions: data.data.permissions || [],
        token: data.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', formData);
      localStorage.setItem('payqusta_token', data.data.token);
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        permissions: data.data.permissions || [],
        token: data.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  getMe: async () => {
    // Return existing promise if request is already in flight
    if (get().loadingUser) return;

    set({ loadingUser: true });
    try {
      const { data } = await api.get('/auth/me');
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        permissions: data.data.permissions || [],
        loadingUser: false
      });
    } catch (error) {
      set({ isAuthenticated: false, user: null, loadingUser: false });
    }
  },

  can: (resource, action) => {
    const { permissions, user } = get();
    if (!user) return false;
    // Admin and Super Admin have all permissions
    if (user.role === 'admin' || !!user.isSuperAdmin || user.email?.toLowerCase() === 'super@payqusta.com') {
      return true;
    }
    return permissions.some(p => p.resource === resource && p.actions.includes(action));
  },

  logout: async () => {
    if (get().loggingOut) return;
    const token = get().token || localStorage.getItem('payqusta_token');

    // Show logging out state first, but KEEP user/isAuthenticated to prevent ProtectedRoute redirect flickering
    set({ loggingOut: true });

    try {
      if (token) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // Clear client auth state ONLY after API call completes
      localStorage.removeItem('payqusta_token');

      // Note: We keep loggingOut as TRUE here so the App continues to show 
      // the loading screen until the window actually reloads to /login.
      set({
        user: null,
        tenant: null,
        permissions: [],
        token: null,
        isAuthenticated: false,
        loggingOut: true
      });

      window.location.href = '/login';
    }
  },

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all API failed:', error);
    } finally {
      localStorage.removeItem('payqusta_token');
      set({ user: null, tenant: null, permissions: [], token: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  // --- Multi-Branch Actions ---
  switchTenant: async (tenantId) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/switch-tenant', { tenantId });
      localStorage.setItem('payqusta_token', data.data.token);

      // Reload user with new token
      const meRes = await api.get('/auth/me');
      set({
        token: data.data.token,
        user: meRes.data.data.user,
        tenant: meRes.data.data.tenant,
        permissions: meRes.data.data.permissions || [],
        loading: false
      });
      window.location.href = '/'; // Refresh to clear any stale state
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  getBranches: async () => {
    try {
      // Unified endpoint: use /branches (branchController) instead of /tenants/my-branches
      const { data } = await api.get('/branches');
      const payload = data?.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.branches)) return payload.branches;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch (error) {
      return [];
    }
  },

  createStore: async (data) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/create-store', data);

      // After successfully creating a store, refresh the user
      const meRes = await api.get('/auth/me');
      set({
        user: meRes.data.data.user,
        tenant: meRes.data.data.tenant,
        permissions: meRes.data.data.permissions || [],
        loading: false
      });

      return res.data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  createBranch: async (data) => {
    set({ loading: true });
    try {
      // Unified endpoint: use /branches (branchController) instead of /tenants/branch
      const res = await api.post('/branches', data);
      set({ loading: false });
      return res.data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },
}));

// ========== THEME STORE ==========
const initialThemeMode = getStoredThemeMode();

export const useThemeStore = create((set, get) => ({
  themeMode: initialThemeMode,
  dark: resolveDarkMode(initialThemeMode),

  setThemeMode: (themeMode) => {
    const nextThemeMode = themeMode === 'light' || themeMode === 'dark' || themeMode === 'system'
      ? themeMode
      : 'system';

    if (typeof window !== 'undefined') {
      localStorage.setItem('payqusta_theme_mode', nextThemeMode);
      if (nextThemeMode === 'system') {
        localStorage.removeItem('payqusta_theme');
      } else {
        localStorage.setItem('payqusta_theme', nextThemeMode);
      }
    }

    set({
      themeMode: nextThemeMode,
      dark: resolveDarkMode(nextThemeMode),
    });
  },

  toggleTheme: () => {
    const nextThemeMode = get().dark ? 'light' : 'dark';
    get().setThemeMode(nextThemeMode);
  },

  syncWithSystem: () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => { };
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      if (get().themeMode !== 'system') return;
      set({ dark: mediaQuery.matches });
    };

    applySystemTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    }

    mediaQuery.addListener(applySystemTheme);
    return () => mediaQuery.removeListener(applySystemTheme);
  },
}));

// ========== API HELPERS ==========


// Products API
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  generateLocalBarcode: (id) => api.post(`/products/${id}/generate-local-barcode`),
  create: (data, config = {}) => api.post('/products', data, config),
  update: (id, data, config = {}) => api.put(`/products/${id}`, data, config),
  delete: (id) => api.delete(`/products/${id}`),
  setSuspended: (id, suspended) => api.patch(`/products/${id}/suspend`, { suspended }),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  getLowStock: () => api.get('/products/low-stock'),
  getSummary: () => api.get('/products/summary'),
  getCategories: () => api.get('/products/categories'),
  requestRestock: (id, quantity) => api.post(`/products/${id}/request-restock`, { quantity }),
  requestRestockBulk: () => api.post('/products/request-restock-bulk'),
  uploadImage: (id, formData, config = {}) => api.post(`/products/${id}/upload-image`, formData, config),
  deleteImage: (id, imageUrl) => api.delete(`/products/${id}/images/${encodeURIComponent(imageUrl)}`),
  stocktake: (payload) => api.post('/products/stocktake', payload),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getTree: () => api.get('/categories/tree'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Customers API
export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  resendActivation: (id, data) => api.post(`/customers/${id}/resend-activation`, data),
  getTop: (limit) => api.get('/customers/top', { params: { limit } }),
  getDebtors: () => api.get('/customers/debtors'),
  getTransactions: (id) => api.get(`/customers/${id}/transactions`),
  getStatementPDF: (id, params) => api.get(`/customers/${id}/statement-pdf`, { params }),
  sendStatement: (id) => api.post(`/customers/${id}/send-statement`),
  sendStatementPDF: (id, data) => api.post(`/customers/${id}/send-statement-pdf`, data),
  updateWhatsAppPreferences: (id, data) => api.put(`/customers/${id}/whatsapp-preferences`, data),
  topupWallet: (id, data) => api.post(`/customers/${id}/wallet/topup`, data),
};

// Invoices API
export const invoicesApi = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  pay: (id, data) => api.post(`/invoices/${id}/pay`, data),
  payAll: (id) => api.post(`/invoices/${id}/pay-all`),
  sendWhatsApp: (id) => api.post(`/invoices/${id}/send-whatsapp`),
  getOverdue: () => api.get('/invoices/overdue'),
  getUpcoming: (days) => api.get('/invoices/upcoming-installments', { params: { days } }),
  getSalesSummary: (period) => api.get('/invoices/sales-summary', { params: { period } }),
  generatePaymentLink: (id, gateway) => api.post(`/invoices/${id}/payment-link`, { gateway }),
  createBostaWaybill: (id, payload) => api.post(`/invoices/${id}/shipping/bosta`, payload),
  trackBostaWaybill: (id) => api.get(`/invoices/${id}/shipping/bosta/track`),
};

// Suppliers API
export const suppliersApi = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  purchase: (id, data) => api.post(`/suppliers/${id}/purchase`, data),
  pay: (id, paymentId, data) => api.post(`/suppliers/${id}/payments/${paymentId}/pay`, data),
  payAll: (id) => api.post(`/suppliers/${id}/pay-all`),
  sendReminder: (id) => api.post(`/suppliers/${id}/send-reminder`),
  requestRestock: (id) => api.post(`/suppliers/${id}/request-restock`),
  getLowStockProducts: (id) => api.get(`/suppliers/${id}/low-stock-products`),
  getUpcomingPayments: (days) => api.get('/suppliers/upcoming-payments', { params: { days } }),
  getStatement: (id) => api.get(`/suppliers/${id}/statement`),
};

export const purchaseReturnsApi = {
  getAll: (params) => api.get('/purchase-returns', { params }),
  getById: (id) => api.get(`/purchase-returns/${id}`),
  create: (data) => api.post('/purchase-returns', data),
};

// Supplier Purchase Invoices API
export const supplierPurchaseInvoicesApi = {
  getAll: (params) => api.get('/supplier-purchase-invoices', { params }),
  getById: (id) => api.get(`/supplier-purchase-invoices/${id}`),
  pay: (id, data) => api.post(`/supplier-purchase-invoices/${id}/pay`, data),
  getUpcomingInstallments: (days = 7) => api.get('/supplier-purchase-invoices/upcoming-installments', { params: { days } }),
  syncFromPurchaseOrders: () => api.post('/supplier-purchase-invoices/sync-from-purchase-orders'),
};

// Purchase Orders API
export const purchaseOrdersApi = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  receive: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  getPDF: (id) => api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' }),
};

// Dashboard API
export const dashboardApi = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getSalesReport: (params) => api.get('/dashboard/sales-report', { params }),
  getProfitIntelligence: (params) => api.get('/dashboard/profit-intelligence', { params }),
  getRiskScoring: (params) => api.get('/dashboard/risk-scoring', { params }),
  getDailyCollections: (params) => api.get('/dashboard/daily-collections', { params }),
  getSmartAssistant: (params) => api.get('/dashboard/smart-assistant', { params }),
  getSupplierAgingReport: (params) => api.get('/dashboard/supplier-aging-report', { params }),
};


// Expenses API
export const expensesApi = {
  getAll: (params) => api.get('/expenses', { params }),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getCategories: () => api.get('/expenses/categories'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Business Intelligence API
export const biApi = {
  getHealthScore: () => api.get('/bi/health-score'),
  getCashFlowForecast: () => api.get('/bi/cash-flow-forecast'),
  getCommandCenter: () => api.get('/bi/command-center'),
  getAchievements: () => api.get('/bi/achievements'),
  getCustomerLifetimeValue: () => api.get('/bi/customer-lifetime-value'),
  getAgingReport: () => api.get('/bi/aging-report'),
  getRealProfit: (params) => api.get('/bi/real-profit', { params }),
  whatIfSimulator: (data) => api.post('/bi/what-if', data),
};

// Subscription API (Tenant Level)
export const subscriptionApi = {
  getPlans: () => api.get('/plans'),
  getMySubscription: () => api.get('/subscriptions/my-subscription'),
  subscribe: (planId, gateway) => api.post('/subscriptions/subscribe', { planId, gateway }),
  getPaymentMethods: () => api.get('/subscriptions/payment-methods'),
  submitReceipt: (data) => api.post('/subscriptions/submit-receipt', data),
};

// Audit Logs API (Tenant Level)
export const auditLogsApi = {
  getLogs: (params) => api.get('/audit-logs', { params }),
  getActiveUsers: () => api.get('/audit-logs/active-users'),
  getLoginHistory: () => api.get('/audit-logs/login-history'),
};

// Customer Credit API
export const creditApi = {
  getAssessment: (id) => api.get(`/customers/${id}/credit-assessment`),
  blockSales: (id, reason) => api.post(`/customers/${id}/block-sales`, { reason }),
  unblockSales: (id) => api.post(`/customers/${id}/unblock-sales`),
  sendStatement: (id) => api.post(`/customers/${id}/send-statement`),
  getStatementPDF: (id) => api.get(`/customers/${id}/statement-pdf`),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  updateStore: (data) => api.put('/settings/store', data),
  updateWhatsApp: (data) => api.put('/settings/whatsapp', data),
  updateBranding: (data) => api.put('/settings/branding', data),
  getNotificationChannels: () => api.get('/settings/notification-channels'),
  updateNotificationChannels: (data) => api.put('/settings/notification-channels', data),
  testNotificationEmail: (data) => api.post('/settings/notification-channels/test-email', data),
  testNotificationSms: (data) => api.post('/settings/notification-channels/test-sms', data),
  updateUser: (data) => api.put('/settings/user', data),
  changePassword: (data) => api.put('/settings/password', data),
};

// Restock API
export const restockApi = {
  requestRestock: (productId, quantity) => api.post(`/products/${productId}/request-restock`, { quantity }),
  requestRestockBulk: () => api.post('/products/request-restock-bulk'),
};

// Super Admin API (New)
export const superAdminApi = {
  getTenants: (params) => api.get('/super-admin/tenants', { params }),
  createTenant: (data) => api.post('/super-admin/tenants', data),
  updateTenant: (id, data) => api.put(`/super-admin/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/super-admin/tenants/${id}`),
  impersonateTenant: (id) => api.post(`/super-admin/tenants/${id}/impersonate`),
  getAnalytics: () => api.get('/super-admin/analytics'),
  getTenantDetails: (id) => api.get(`/super-admin/tenants/${id}/details`),
  getPlans: () => api.get('/super-admin/plans'),
  createPlan: (data) => api.post('/super-admin/plans', data),
  updatePlan: (id, data) => api.put(`/super-admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/super-admin/plans/${id}`),
  getPaymentMethods: () => api.get('/super-admin/payment-methods'),
  updatePaymentMethods: (data) => api.put('/super-admin/payment-methods', data),
  getSubscriptionRequests: (params) => api.get('/super-admin/subscription-requests', { params }),
  approveSubscriptionRequest: (id) => api.post(`/super-admin/subscription-requests/${id}/approve`),
  rejectSubscriptionRequest: (id, reason) => api.post(`/super-admin/subscription-requests/${id}/reject`, { reason }),
  getPublicLeads: (params) => api.get('/super-admin/leads', { params }),
  updatePublicLead: (id, data) => api.patch(`/super-admin/leads/${id}`, data),
  getNotificationSettings: () => api.get('/super-admin/notifications'),
  updateNotificationSettings: (data) => api.put('/super-admin/notifications', data),
  testNotificationEmail: (data) => api.post('/super-admin/notifications/test-email', data),
  testNotificationSms: (data) => api.post('/super-admin/notifications/test-sms', data),
};

// Admin API (Legacy / Tenant Admin)
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStatistics: () => api.get('/admin/statistics'),
  getTenants: (params) => api.get('/admin/tenants', { params }), // Legacy
  createTenant: (data) => api.post('/admin/tenants', data), // Legacy
  updateTenant: (id, data) => api.put(`/admin/tenants/${id}`, data), // Legacy
  deleteTenant: (id) => api.delete(`/admin/tenants/${id}`), // Legacy
  resetTenantPassword: (id, data) => api.post(`/admin/tenants/${id}/reset-password`, data),
  createBranch: (data) => api.post('/branches', data), // Create branch for tenant
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  resendUserInvitation: (id, data) => api.post(`/admin/users/${id}/resend-invitation`, data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id, params) => api.delete(`/admin/users/${id}`, { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export const activationApi = {
  getDetails: (token) => api.get(`/auth/activate-account/${token}`),
  activate: (token, data) => api.post(`/auth/activate-account/${token}`, data),
};

// Reports API (Business Reports)
export const reportsApi = {
  // Get Reports
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getProfitReport: (params) => api.get('/reports/profit', { params }),
  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
  getCustomerReport: (params) => api.get('/reports/customers', { params }),
  getProductPerformanceReport: (params) => api.get('/reports/products', { params }),

  // Export Reports (Excel)
  exportSalesReport: (params) => api.get('/reports/export/sales', { params, responseType: 'blob' }),
  exportProfitReport: (params) => api.get('/reports/export/profit', { params, responseType: 'blob' }),
  exportInventoryReport: (params) => api.get('/reports/export/inventory', { params, responseType: 'blob' }),
  exportCustomerReport: (params) => api.get('/reports/export/customers', { params, responseType: 'blob' }),
  exportProductPerformanceReport: (params) => api.get('/reports/export/products', { params, responseType: 'blob' }),
};

// Import API
export const importApi = {
  importProducts: (formData) => api.post('/import/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importCustomers: (formData) => api.post('/import/customers', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  preview: (formData) => api.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadTemplate: (type) => api.get(`/import/template/${type}`, { responseType: 'blob' }),
};

// Backup API
export const backupApi = {
  exportData: () => api.get('/backup/export', { responseType: 'blob' }),
  getStats: () => api.get('/backup/stats'),
  getAutoSettings: () => api.get('/backup/auto-settings'),
  updateAutoSettings: (data) => api.put('/backup/auto-settings', data),
  restore: (formData) => api.post('/backup/restore', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Profile API
export const profileApi = {
  updateProfile: (data) => api.put('/auth/update-profile', data),
  updateAvatar: (formData) => api.put('/auth/update-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeAvatar: () => api.delete('/auth/remove-avatar'),
};

// Coupons API
export const couponsApi = {
  getAll: (params) => api.get('/coupons', { params }),
  getStats: () => api.get('/coupons/stats'),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  validate: (data) => api.post('/coupons/validate', data),
};

// Affiliates API
export const affiliatesApi = {
  getAll: (params) => api.get('/affiliates', { params }),
  getStats: () => api.get('/affiliates/stats'),
  getById: (id) => api.get(`/affiliates/${id}`),
  getConversions: (id) => api.get(`/affiliates/${id}/conversions`),
  create: (data) => api.post('/affiliates', data),
  update: (id, data) => api.put(`/affiliates/${id}`, data),
  updateStatus: (id, status) => api.patch(`/affiliates/${id}/status`, { status }),
};

// Reviews API
export const reviewsApi = {
  getAll: (params) => api.get('/reviews', { params }),
  getStats: () => api.get('/reviews/stats'),
  getById: (id) => api.get(`/reviews/${id}`),
  updateStatus: (id, status) => api.patch(`/reviews/${id}/status`, { status }),
  addReply: (id, body) => api.post(`/reviews/${id}/reply`, { body }),
  delete: (id) => api.delete(`/reviews/${id}`),
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
};

// Cash Shifts API
export const cashShiftsApi = {
  getCurrent: () => api.get('/cash-shifts/current'),
  open: (data) => api.post('/cash-shifts/open', data),
  close: (data) => api.post('/cash-shifts/close', data),
  getHistory: (params) => api.get('/cash-shifts/history', { params }),
};

// ========== SHIFT STORE ==========
export const useShiftStore = create((set, get) => ({
  activeShift: null,
  loading: false,
  error: null,

  fetchCurrentShift: async () => {
    // Only fetch if authenticated
    if (!useAuthStore.getState().isAuthenticated) return;
    
    set({ loading: true, error: null });
    try {
      const { data } = await cashShiftsApi.getCurrent();
      set({ activeShift: data.data || null, loading: false });
    } catch (error) {
      set({ error: error?.response?.data?.message || 'Failed to load shift', loading: false });
    }
  },

  openShift: async (openingBalance) => {
    set({ loading: true, error: null });
    try {
      const { data } = await cashShiftsApi.open({ openingBalance });
      set({ activeShift: data.data, loading: false });
      return data;
    } catch (error) {
      set({ error: error?.response?.data?.message || 'Failed to open shift', loading: false });
      throw error;
    }
  },

  closeShift: async (actualCash, notes) => {
    set({ loading: true, error: null });
    try {
      const { data } = await cashShiftsApi.close({ actualCash, notes });
      set({ activeShift: null, loading: false });
      return data;
    } catch (error) {
      set({ error: error?.response?.data?.message || 'Failed to close shift', loading: false });
      throw error;
    }
  },

  clearShift: () => set({ activeShift: null })
}));
