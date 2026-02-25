import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore, useThemeStore } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnimatedNotification from './components/AnimatedNotification';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import InstallPrompt from './components/InstallPrompt';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import StockAdjustmentsPage from './pages/StockAdjustmentsPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import SuppliersPage from './pages/SuppliersPage';
import QuickSalePage from './pages/QuickSalePage';
import ReportsPage from './pages/ReportsPage';
import BusinessReportsPage from './pages/BusinessReportsPage';
import CommandCenterPage from './pages/CommandCenterPage';
import ExpensesPage from './pages/ExpensesPage';
import LowStockPage from './pages/LowStockPage';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import CamerasPage from './pages/CamerasPage';
import CashDrawerPage from './pages/CashDrawerPage';
import RolesPage from './pages/RolesPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import AgingReportPage from './pages/AgingReportPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminTenantsPage from './pages/AdminTenantsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminStatisticsPage from './pages/AdminStatisticsPage';
import ImportDataPage from './pages/ImportDataPage';
import BackupRestorePage from './pages/BackupRestorePage';
import BranchManagement from './pages/BranchManagement';
import TenantManagementPage from './pages/TenantManagementPage';
import SuperAdminPlansPage from './pages/SuperAdminPlansPage';
import SubscriptionRequestsPage from './pages/SubscriptionRequestsPage';
import PortalOrdersAdminPage from './pages/PortalOrdersAdminPage';
import ReturnsManagementPage from './pages/ReturnsManagementPage';
import AddonStorePage from './pages/AddonStorePage';
import KYCReviewPage from './pages/KYCReviewPage';
import SupportMessagesPage from './pages/SupportMessagesPage';
import ReviewsPage from './pages/ReviewsPage';
import CouponsPage from './pages/CouponsPage';
import ReferralPage from './pages/ReferralPage';
import RevenueAnalyticsPage from './pages/RevenueAnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';

// Storefront Pages
import StorefrontLayout from './storefront/StorefrontLayout';
import StorefrontHome from './storefront/StorefrontHome';
import ProductCatalog from './storefront/ProductCatalog';
import ProductDetails from './storefront/ProductDetails';
import ShoppingCart from './storefront/ShoppingCart';
import Checkout from './storefront/Checkout';
import OrderConfirmation from './storefront/OrderConfirmation';

// Customer Portal Pages
import PortalLogin from './portal/PortalLogin';
import PortalLayout from './portal/PortalLayout';
import PortalHome from './portal/PortalHome';
import PortalInvoices from './portal/PortalInvoices';
import PortalReturns from './portal/PortalReturns';
import PortalStatement from './portal/PortalStatement';
import PortalProfile from './portal/PortalProfile';
import PortalDocuments from './portal/PortalDocuments';
import PortalAddresses from './portal/PortalAddresses';
import PortalInstallmentCalculator from './portal/PortalInstallmentCalculator';
import PortalOrders from './portal/PortalOrders';
import PortalWishlist from './portal/PortalWishlist';
import PortalSupport from './portal/PortalSupport';
import PortalSupportChat from './portal/PortalSupportChat';
import PortalNotifications from './portal/PortalNotifications';
import PortalCheckout from './portal/PortalCheckout';
import PortalPointsHistory from './portal/PortalPointsHistory';
import PortalReviews from './portal/PortalReviews';
import PortalProducts from './portal/PortalProducts';
import PortalProductDetails from './portal/PortalProductDetails';


// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

const isSystemSuperAdminUser = (user) =>
  !!user?.isSuperAdmin || user?.email?.toLowerCase() === 'super@payqusta.com';

// Admin Route wrapper - Only for Admin users
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') {
    // Non-admin users trying to access admin pages
    return <Navigate to="/" replace />;
  }

  return children;
}

function SuperAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSystemSuperAdminUser(user)) return <Navigate to="/" replace />;
  return children;
}

import BranchDashboardPage from './pages/BranchDashboardPage';

// ... (other imports)

// Main Layout with Sidebar + Header
function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark } = useThemeStore();
  const location = useLocation();
  const { user } = useAuthStore();
  const { t } = useTranslation('admin');
  const isSystemSuperAdmin = isSystemSuperAdminUser(user);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Dashboard Component Selection based on role
  const getDashboardComponent = () => {
    if (user?.role === 'admin' || isSystemSuperAdmin) {
      return <DashboardPage />;
    }
    return <BranchDashboardPage />;
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
      <div className="flex h-full w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {isSystemSuperAdmin && (
            <div className="px-4 md:px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-sm font-semibold">
              {t('header.super_admin_banner')}
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ErrorBoundary>
              <Routes>
                {/* Admin Routes - Protected */}
                <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                <Route path="/admin/statistics" element={<AdminRoute><AdminStatisticsPage /></AdminRoute>} />
                <Route path="/admin/import" element={<AdminRoute><ImportDataPage /></AdminRoute>} />
                <Route path="/admin/backup" element={<AdminRoute><BackupRestorePage /></AdminRoute>} />

                {/* Storefront Routes (Public) */}
                <Route path="/store" element={<StorefrontLayout><StorefrontHome /></StorefrontLayout>} />
                <Route path="/store/products" element={<StorefrontLayout><ProductCatalog /></StorefrontLayout>} />
                <Route path="/store/products/:id" element={<StorefrontLayout><ProductDetails /></StorefrontLayout>} />
                <Route path="/store/cart" element={<StorefrontLayout><ShoppingCart /></StorefrontLayout>} />
                <Route path="/store/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />
                <Route path="/store/order/:id" element={<StorefrontLayout><OrderConfirmation /></StorefrontLayout>} />
                <Route path="/admin/tenants" element={<AdminRoute><AdminTenantsPage /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />

                {/* Regular Routes */}
                <Route path="/" element={getDashboardComponent()} />
                <Route path="/quick-sale" element={<QuickSalePage />} />
                <Route path="/command-center" element={<CommandCenterPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/stock-adjustments" element={<StockAdjustmentsPage />} />
                <Route path="/low-stock" element={<LowStockPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/business-reports" element={<BusinessReportsPage />} />
                <Route path="/aging-report" element={<AgingReportPage />} />
                <Route path="/addon-store" element={<AddonStorePage />} />
                <Route path="/referrals" element={<ReferralPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/subscriptions"
                  element={isSystemSuperAdmin ? <Navigate to="/super-admin/plans" replace /> : <SubscriptionPage />}
                />
                <Route path="/cameras" element={<CamerasPage />} />
                <Route path="/branches" element={<BranchManagement />} />
                {/* Super Admin Routes */}
                <Route path="/super-admin/plans" element={<SuperAdminRoute><SuperAdminPlansPage /></SuperAdminRoute>} />
                <Route path="/super-admin/requests" element={<SuperAdminRoute><SubscriptionRequestsPage /></SuperAdminRoute>} />
                <Route path="/super-admin/analytics" element={<SuperAdminRoute><RevenueAnalyticsPage /></SuperAdminRoute>} />
                <Route path="/tenant-management" element={<SuperAdminRoute><TenantManagementPage /></SuperAdminRoute>} />
                <Route path="/cash-drawer" element={<CashDrawerPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/activity-logs" element={<ActivityLogsPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/import" element={<ImportDataPage />} />
                <Route path="/backup" element={<BackupRestorePage />} />
                <Route path="/portal-orders" element={<PortalOrdersAdminPage />} />
                <Route path="/returns-management" element={<ReturnsManagementPage />} />
                <Route path="/kyc-review" element={<KYCReviewPage />} />
                <Route path="/support-messages" element={<SupportMessagesPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { dark } = useThemeStore();
  const { isAuthenticated, getMe, user, globalLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      getMe().catch(() => { });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isSystemSuperAdminUser(user)) return;

    const key = `super-login-toast:${user.email?.toLowerCase()}`;
    if (sessionStorage.getItem(key)) return;

    toast.success('تم تسجيل الدخول بحساب Super Admin');
    sessionStorage.setItem(key, '1');
  }, [isAuthenticated, user]);

  return (
    <div className={dark ? 'dark' : ''}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* Beautiful Animated Notifications */}
        <AnimatedNotification />

        {/* Keep Toaster for backward compatibility */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Cairo, sans-serif',
              direction: 'rtl',
              borderRadius: '14px',
            },
          }}
        />

        {/* PWA Install Prompt */}
        <InstallPrompt />

        <Routes>
          {/* Customer Portal Routes */}
          <Route path="/portal/login" element={
            /* If we had a portal specific auth check in store, we could redirect if logged in. 
               For now, PortalLogin handles it or just renders login. 
            */
            <PortalLogin />
          } />

          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PortalHome />} />
            <Route path="invoices" element={<PortalInvoices />} />
            <Route path="returns" element={<PortalReturns />} />
            <Route path="statement" element={<PortalStatement />} />
            <Route path="calculator" element={<PortalInstallmentCalculator />} />
            <Route path="documents" element={<PortalDocuments />} />
            <Route path="addresses" element={<PortalAddresses />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="orders" element={<PortalOrders />} />
            <Route path="wishlist" element={<PortalWishlist />} />
            <Route path="support" element={<PortalSupport />} />
            <Route path="support/:id" element={<PortalSupportChat />} />
            <Route path="notifications" element={<PortalNotifications />} />
            <Route path="points" element={<PortalPointsHistory />} />
            <Route path="reviews" element={<PortalReviews />} />
            <Route path="products" element={<PortalProducts />} />
            <Route path="products/:id" element={<PortalProductDetails />} />
            <Route path="cart" element={<ShoppingCart />} />
            <Route path="checkout" element={<PortalCheckout />} />
          </Route>

          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Main App Routes (Protected) - Must be last */}
          <Route path="/*" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
