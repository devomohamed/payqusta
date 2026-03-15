import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore, useThemeStore } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnimatedNotification from './components/AnimatedNotification';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import RouteMetadata from './components/RouteMetadata';
import InstallPrompt from './components/InstallPrompt';
import AnimatedBrandLogo from './components/AnimatedBrandLogo';
import { LoadingSpinner } from './components/UI';
import { storefrontPath } from './utils/storefrontHost';

const PublicSiteLayout = React.lazy(() => import('./publicSite/PublicSiteLayout'));
const StorefrontLayout = React.lazy(() => import('./storefront/StorefrontLayout'));
const PortalLayout = React.lazy(() => import('./portal/PortalLayout'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const PublicLandingPage = React.lazy(() => import('./pages/PublicLandingPage'));
const PublicFeaturesPage = React.lazy(() => import('./pages/PublicFeaturesPage'));
const PublicUseCasesPage = React.lazy(() => import('./pages/PublicUseCasesPage'));
const PublicHowItWorksPage = React.lazy(() => import('./pages/PublicHowItWorksPage'));
const PublicFaqPage = React.lazy(() => import('./pages/PublicFaqPage'));
const PublicPrivacyPage = React.lazy(() => import('./pages/PublicPrivacyPage'));
const PublicTermsPage = React.lazy(() => import('./pages/PublicTermsPage'));
const PublicContactPage = React.lazy(() => import('./pages/PublicContactPage'));
const PublicSeoTopicPage = React.lazy(() => import('./pages/PublicSeoTopicPage'));
const PublicPaymentInstructionPage = React.lazy(() => import('./pages/PublicPaymentInstructionPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const BranchDashboardPage = React.lazy(() => import('./pages/BranchDashboardPage'));
const StorefrontHome = React.lazy(() => import('./storefront/StorefrontHome'));
const ProductCatalog = React.lazy(() => import('./storefront/ProductCatalog'));
const ProductDetails = React.lazy(() => import('./storefront/ProductDetails'));
const ShoppingCart = React.lazy(() => import('./storefront/ShoppingCart'));
const Checkout = React.lazy(() => import('./storefront/Checkout'));
const OrderConfirmation = React.lazy(() => import('./storefront/OrderConfirmation'));
const OrderTracking = React.lazy(() => import('./storefront/OrderTracking'));
const StorefrontAbout = React.lazy(() => import('./storefront/StorefrontAbout'));
const StorefrontLandingPage = React.lazy(() => import('./storefront/StorefrontLandingPage'));
const PortalLogin = React.lazy(() => import('./portal/PortalLogin'));
const PortalHome = React.lazy(() => import('./portal/PortalHome'));
const PortalInvoices = React.lazy(() => import('./portal/PortalInvoices'));
const PortalReturns = React.lazy(() => import('./portal/PortalReturns'));
const PortalStatement = React.lazy(() => import('./portal/PortalStatement'));
const PortalProfile = React.lazy(() => import('./portal/PortalProfile'));
const PortalDocuments = React.lazy(() => import('./portal/PortalDocuments'));
const PortalAddresses = React.lazy(() => import('./portal/PortalAddresses'));
const PortalInstallmentCalculator = React.lazy(() => import('./portal/PortalInstallmentCalculator'));
const PortalOrders = React.lazy(() => import('./portal/PortalOrders'));
const PortalWishlist = React.lazy(() => import('./portal/PortalWishlist'));
const PortalSupport = React.lazy(() => import('./portal/PortalSupport'));
const PortalSupportChat = React.lazy(() => import('./portal/PortalSupportChat'));
const PortalNotifications = React.lazy(() => import('./portal/PortalNotifications'));
const PortalCheckout = React.lazy(() => import('./portal/PortalCheckout'));
const PortalPointsHistory = React.lazy(() => import('./portal/PortalPointsHistory'));
const PortalReviews = React.lazy(() => import('./portal/PortalReviews'));
const PortalProducts = React.lazy(() => import('./portal/PortalProducts'));
const PortalProductDetails = React.lazy(() => import('./portal/PortalProductDetails'));
const PortalPaymentResult = React.lazy(() => import('./portal/PortalPaymentResult'));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'));
const StocktakePage = React.lazy(() => import('./pages/StocktakePage'));
const StockAdjustmentsPage = React.lazy(() => import('./pages/StockAdjustmentsPage'));
const MarketingPage = React.lazy(() => import('./pages/MarketingPage'));
const StaffPerformancePage = React.lazy(() => import('./pages/StaffPerformancePage'));
const FinancialsPage = React.lazy(() => import('./pages/FinancialsPage'));
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage'));
const QuickSalePage = React.lazy(() => import('./pages/QuickSalePage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const BusinessReportsPage = React.lazy(() => import('./pages/BusinessReportsPage'));
const CommandCenterPage = React.lazy(() => import('./pages/CommandCenterPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const LowStockPage = React.lazy(() => import('./pages/LowStockPage'));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage'));
const CamerasPage = React.lazy(() => import('./pages/CamerasPage'));
const CashDrawerPage = React.lazy(() => import('./pages/CashDrawerPage'));
const RolesPage = React.lazy(() => import('./pages/RolesPage'));
const ActivityLogsPage = React.lazy(() => import('./pages/ActivityLogsPage'));
const PurchaseOrdersPage = React.lazy(() => import('./pages/PurchaseOrdersPage'));
const SupplierPurchaseInvoicesPage = React.lazy(() => import('./pages/SupplierPurchaseInvoicesPage'));
const AgingReportPage = React.lazy(() => import('./pages/AgingReportPage'));
const InstallmentsDashboardPage = React.lazy(() => import('./pages/InstallmentsDashboardPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const AdminTenantsPage = React.lazy(() => import('./pages/AdminTenantsPage'));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'));
const AdminAuditLogsPage = React.lazy(() => import('./pages/AdminAuditLogsPage'));
const AdminStatisticsPage = React.lazy(() => import('./pages/AdminStatisticsPage'));
const ImportDataPage = React.lazy(() => import('./pages/ImportDataPage'));
const BackupRestorePage = React.lazy(() => import('./pages/BackupRestorePage'));
const BranchManagement = React.lazy(() => import('./pages/BranchManagement'));
const TenantManagementPage = React.lazy(() => import('./pages/TenantManagementPage'));
const SuperAdminPlansPage = React.lazy(() => import('./pages/SuperAdminPlansPage'));
const SubscriptionRequestsPage = React.lazy(() => import('./pages/SubscriptionRequestsPage'));
const PortalOrdersAdminPage = React.lazy(() => import('./pages/PortalOrdersAdminPage'));
const ReturnsManagementPage = React.lazy(() => import('./pages/ReturnsManagementPage'));
const AddonStorePage = React.lazy(() => import('./pages/AddonStorePage'));
const KYCReviewPage = React.lazy(() => import('./pages/KYCReviewPage'));
const SupportMessagesPage = React.lazy(() => import('./pages/SupportMessagesPage'));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage'));
const CouponsPage = React.lazy(() => import('./pages/CouponsPage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'));
const RevenueAnalyticsPage = React.lazy(() => import('./pages/RevenueAnalyticsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const StockSearchPage = React.lazy(() => import('./pages/StockSearchPage'));
const ShiftManagementPage = React.lazy(() => import('./pages/ShiftManagementPage'));
const SupplierAgingReportPage = React.lazy(() => import('./pages/SupplierAgingReportPage'));
const PurchaseReturnsPage = React.lazy(() => import('./pages/PurchaseReturnsPage'));

const hasBrokenEncoding = (value = '') => /[ØÙðâ]|^\?{3,}/.test(String(value));
const normalizeLoadingMessage = (message) => {
  if (!message || hasBrokenEncoding(message)) return 'Loading...';
  return message;
};

function RouteFallback({ message = 'Loading...' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner size="lg" text={normalizeLoadingMessage(message)} />
    </div>
  );
}

function LazyRoute({ component: Component, message }) {
  return (
    <React.Suspense fallback={<RouteFallback message={normalizeLoadingMessage(message)} />}>
      <Component />
    </React.Suspense>
  );
}

function LazyLayoutRoute({ layout: Layout, component: Component, message }) {
  return (
    <React.Suspense fallback={<RouteFallback message={normalizeLoadingMessage(message)} />}>
      <Layout>
        <Component />
      </Layout>
    </React.Suspense>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, user, loadingUser } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loadingUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <span className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading your workspace...</span>
        </div>
      </div>
    );
  }
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
      return <LazyRoute component={DashboardPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…..." />;
    }
    return <LazyRoute component={BranchDashboardPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„ÙØ±Ø¹..." />;
  };

  return (
    <div className={`flex min-h-svh md:h-screen overflow-x-hidden md:overflow-hidden ${dark ? 'dark' : ''}`}>
      <div className="app-shell-pattern flex min-h-svh md:h-full w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-svh md:min-h-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {isSystemSuperAdmin && (
            <div className="px-4 md:px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-sm font-semibold">
              {t('header.super_admin_banner')}
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <ErrorBoundary>
              <Routes>
                {/* Admin Routes - Protected */}
                <Route path="/admin/dashboard" element={<AdminRoute><LazyRoute component={AdminDashboardPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©..." /></AdminRoute>} />
                <Route path="/admin/statistics" element={<AdminRoute><LazyRoute component={AdminStatisticsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø­ØµØ§Ø¡Ø§Øª..." /></AdminRoute>} />
                <Route path="/admin/import" element={<AdminRoute><LazyRoute component={ImportDataPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯..." /></AdminRoute>} />
                <Route path="/admin/backup" element={<AdminRoute><LazyRoute component={BackupRestorePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ..." /></AdminRoute>} />

                <Route path="/admin/tenants" element={<AdminRoute><LazyRoute component={AdminTenantsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ØªØ§Ø¬Ø±..." /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><LazyRoute component={AdminUsersPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†..." /></AdminRoute>} />
                <Route path="/admin/audit-logs" element={<AdminRoute><LazyRoute component={AdminAuditLogsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©..." /></AdminRoute>} />

                {/* Regular Routes */}
                <Route path="/" element={getDashboardComponent()} />
                <Route path="/quick-sale" element={<LazyRoute component={QuickSalePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ¹ Ø§Ù„Ø³Ø±ÙŠØ¹..." />} />
                <Route path="/command-center" element={<LazyRoute component={CommandCenterPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù…Ø±ÙƒØ² Ø§Ù„Ù‚ÙŠØ§Ø¯Ø©..." />} />
                <Route path="/products" element={<LazyRoute component={ProductsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª..." />} />
                <Route path="/categories" element={<LazyRoute component={CategoriesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…..." />} />
                <Route path="/stock-search" element={<LazyRoute component={StockSearchPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¨Ø­Ø« Ø§Ù„Ù…Ø®Ø²ÙˆÙ†..." />} />
                <Route path="/stocktake" element={<LazyRoute component={StocktakePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¬Ø±Ø¯..." />} />
                <Route path="/stock-adjustments" element={<LazyRoute component={StockAdjustmentsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø®Ø²ÙˆÙ†..." />} />
                <Route path="/low-stock" element={<LazyRoute component={LowStockPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ù…Ù†Ø®ÙØ¶Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†..." />} />
                <Route path="/customers" element={<LazyRoute component={CustomersPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡..." />} />
                <Route path="/marketing" element={<LazyRoute component={MarketingPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªØ³ÙˆÙŠÙ‚..." />} />
                <Route path="/financials" element={<LazyRoute component={FinancialsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ù…Ø§Ù„ÙŠØ©..." />} />
                <Route path="/staff-performance" element={<LazyRoute component={StaffPerformancePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†..." />} />
                <Route path="/invoices" element={<LazyRoute component={InvoicesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙÙˆØ§ØªÙŠØ±..." />} />
                <Route path="/suppliers" element={<LazyRoute component={SuppliersPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†..." />} />
                <Route path="/supplier-purchase-invoices" element={<LazyRoute component={SupplierPurchaseInvoicesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†..." />} />
                <Route path="/purchase-returns" element={<LazyRoute component={PurchaseReturnsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù…Ø±ØªØ¬Ø¹Ø§Øª Ø§Ù„Ø´Ø±Ø§Ø¡..." />} />
                <Route path="/notifications" element={<LazyRoute component={NotificationsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª..." />} />
                <Route path="/expenses" element={<LazyRoute component={ExpensesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª..." />} />
                <Route path="/reports" element={<LazyRoute component={ReportsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±..." />} />
                <Route path="/business-reports" element={<LazyRoute component={BusinessReportsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø£Ø¹Ù…Ø§Ù„..." />} />
                <Route path="/aging-report" element={<LazyRoute component={AgingReportPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø§Ù„Ø¯ÙŠÙˆÙ†..." />} />
                <Route path="/supplier-aging-report" element={<LazyRoute component={SupplierAgingReportPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙ‚Ø±ÙŠØ± Ø£Ø¹Ù…Ø§Ø± Ø¯ÙŠÙˆÙ† Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†..." />} />
                <Route path="/installments" element={<LazyRoute component={InstallmentsDashboardPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£Ù‚Ø³Ø§Ø·..." />} />
                <Route path="/addon-store" element={<LazyRoute component={AddonStorePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù…ØªØ¬Ø± Ø§Ù„Ø¥Ø¶Ø§ÙØ§Øª..." />} />
                <Route path="/referrals" element={<LazyRoute component={ReferralPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø­Ø§Ù„Ø§Øª..." />} />
                <Route path="/settings" element={<LazyRoute component={SettingsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª..." />} />
                <Route
                  path="/subscriptions"
                  element={isSystemSuperAdmin ? <Navigate to="/super-admin/plans" replace /> : <LazyRoute component={SubscriptionPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª..." />}
                />
                <Route path="/cameras" element={<LazyRoute component={CamerasPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§Øª..." />} />
                <Route path="/branches" element={<LazyRoute component={BranchManagement} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙØ±ÙˆØ¹..." />} />
                {/* Super Admin Routes */}
                <Route path="/super-admin/plans" element={<SuperAdminRoute><LazyRoute component={SuperAdminPlansPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨Ø§Ù‚Ø§Øª..." /></SuperAdminRoute>} />
                <Route path="/super-admin/requests" element={<SuperAdminRoute><LazyRoute component={SubscriptionRequestsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ..." /></SuperAdminRoute>} />
                <Route path="/super-admin/analytics" element={<SuperAdminRoute><LazyRoute component={RevenueAnalyticsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØ­Ù„ÙŠÙ„Ø§Øª Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª..." /></SuperAdminRoute>} />
                <Route path="/tenant-management" element={<SuperAdminRoute><LazyRoute component={TenantManagementPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ØªØ§Ø¬Ø±..." /></SuperAdminRoute>} />
                <Route path="/cash-drawer" element={<LazyRoute component={CashDrawerPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø®Ø²ÙŠÙ†Ø©..." />} />
                <Route path="/shift" element={<LazyRoute component={ShiftManagementPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª..." />} />

                <Route path="/roles" element={<LazyRoute component={RolesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª..." />} />
                <Route path="/activity-logs" element={<LazyRoute component={ActivityLogsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø·..." />} />
                <Route path="/purchase-orders" element={<LazyRoute component={PurchaseOrdersPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡..." />} />
                <Route path="/import" element={<LazyRoute component={ImportDataPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯..." />} />
                <Route path="/backup" element={<LazyRoute component={BackupRestorePage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ..." />} />
                <Route path="/portal-orders" element={<LazyRoute component={PortalOrdersAdminPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©..." />} />
                <Route path="/returns-management" element={<LazyRoute component={ReturnsManagementPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø±ØªØ¬Ø¹Ø§Øª..." />} />
                <Route path="/kyc-review" element={<LazyRoute component={KYCReviewPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù‡ÙˆÙŠØ©..." />} />
                <Route path="/support-messages" element={<LazyRoute component={SupportMessagesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø¯Ø¹Ù…..." />} />
                <Route path="/reviews" element={<LazyRoute component={ReviewsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª..." />} />
                <Route path="/coupons" element={<LazyRoute component={CouponsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¨ÙˆÙ†Ø§Øª..." />} />
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
  const { isAuthenticated, getMe, user, loadingUser, loggingOut } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user || loadingUser) return;
    getMe().catch(() => { });
  }, [isAuthenticated, user, loadingUser, getMe]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isSystemSuperAdminUser(user)) return;

    const key = `super-login-toast:${user.email?.toLowerCase()}`;
    if (sessionStorage.getItem(key)) return;

    toast.success('Signed in as Super Admin');
    sessionStorage.setItem(key, '1');
  }, [isAuthenticated, user]);

  if (loggingOut) {
    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${dark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative w-24 h-24 mb-2">
            <div className="absolute inset-0 bg-primary-500/10 rounded-3xl animate-pulse" />
            <div className="absolute inset-0 border-2 border-primary-500/20 rounded-3xl animate-spin-slow" />
            <div className="relative h-full flex items-center justify-center p-4">
              <AnimatedBrandLogo src="/logo-square.png" alt="Logo" size="full" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Pay<span className="text-primary-500">Qusta</span></h2>
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold tracking-wide">Signing out...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouteMetadata />
        {/* Beautiful Animated Notifications */}
        <AnimatedNotification />
        {/* Global Confirm Dialog */}
        <ConfirmDialog />

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
            <LazyRoute component={PortalLogin} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„..." />
          } />

          <Route path="/portal" element={<LazyRoute component={PortalLayout} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©..." />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<LazyRoute component={PortalHome} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©..." />} />
            <Route path="invoices" element={<LazyRoute component={PortalInvoices} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©..." />} />
            <Route path="returns" element={<LazyRoute component={PortalReturns} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø±ØªØ¬Ø¹Ø§Øª..." />} />
            <Route path="statement" element={<LazyRoute component={PortalStatement} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ÙƒØ´Ù Ø§Ù„Ø­Ø³Ø§Ø¨..." />} />
            <Route path="calculator" element={<LazyRoute component={PortalInstallmentCalculator} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø­Ø§Ø³Ø¨Ø© Ø§Ù„Ø£Ù‚Ø³Ø§Ø·..." />} />
            <Route path="documents" element={<LazyRoute component={PortalDocuments} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª..." />} />
            <Route path="addresses" element={<LazyRoute component={PortalAddresses} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¹Ù†Ø§ÙˆÙŠÙ†..." />} />
            <Route path="profile" element={<LazyRoute component={PortalProfile} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ..." />} />
            <Route path="orders" element={<LazyRoute component={PortalOrders} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª..." />} />
            <Route path="wishlist" element={<LazyRoute component={PortalWishlist} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ÙØ¶Ù„Ø©..." />} />
            <Route path="support" element={<LazyRoute component={PortalSupport} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¯Ø¹Ù…..." />} />
            <Route path="support/:id" element={<LazyRoute component={PortalSupportChat} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©..." />} />
            <Route path="notifications" element={<LazyRoute component={PortalNotifications} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª..." />} />
            <Route path="points" element={<LazyRoute component={PortalPointsHistory} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„ Ø§Ù„Ù†Ù‚Ø§Ø·..." />} />
            <Route path="reviews" element={<LazyRoute component={PortalReviews} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØªÙ‚ÙŠÙŠÙ…Ø§Øª..." />} />
            <Route path="products" element={<LazyRoute component={PortalProducts} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª..." />} />
            <Route path="products/:id" element={<LazyRoute component={PortalProductDetails} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬..." />} />
            <Route path="cart" element={<LazyRoute component={ShoppingCart} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø³Ù„Ø©..." />} />
            <Route path="checkout" element={<LazyRoute component={PortalCheckout} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø·Ù„Ø¨..." />} />
            <Route path="payment/result" element={<LazyRoute component={PortalPaymentResult} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¯ÙØ¹..." />} />
          </Route>


          {/* Storefront Routes (Public) */}
          <Route path={storefrontPath('/')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontHome} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…ØªØ¬Ø±..." />} />
          <Route path={storefrontPath('/products')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ProductCatalog} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ÙƒØªØ§Ù„ÙˆØ¬ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª..." />} />
          <Route path={storefrontPath('/products/:id')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ProductDetails} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬..." />} />
          <Route path={storefrontPath('/collections/:slug')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontLandingPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©..." />} />
          <Route path={storefrontPath('/about')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontAbout} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„Ù…ØªØ¬Ø±..." />} />
          <Route path={storefrontPath('/cart')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ShoppingCart} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø³Ù„Ø©..." />} />
          <Route path={storefrontPath('/checkout')} element={<LazyLayoutRoute layout={StorefrontLayout} component={Checkout} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø·Ù„Ø¨..." />} />
          <Route path={storefrontPath('/order/:id')} element={<LazyLayoutRoute layout={StorefrontLayout} component={OrderConfirmation} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨..." />} />
          <Route path={storefrontPath('/track-order')} element={<LazyLayoutRoute layout={StorefrontLayout} component={OrderTracking} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØªØ¨Ø¹ Ø§Ù„Ø·Ù„Ø¨..." />} />

          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <LazyRoute component={LoginPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„..." />
          } />
          <Route path="/forgot-password" element={<LazyRoute component={ForgotPasswordPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ø³ØªØ¹Ø§Ø¯Ø© ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±..." />} />
          <Route path="/reset-password/:token" element={<LazyRoute component={ResetPasswordPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ¹ÙŠÙŠÙ†..." />} />
          <Route path="/" element={
            isAuthenticated ? (
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            ) : (
              <LazyLayoutRoute layout={PublicSiteLayout} component={PublicLandingPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©..." />
            )
          } />
          <Route path="/features" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicFeaturesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø²Ø§ÙŠØ§..." />} />
          <Route path="/use-cases" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicUseCasesPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…..." />} />
          <Route path="/how-it-works" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicHowItWorksPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø´Ø±Ø­ Ø§Ù„Ù…Ù†ØµØ©..." />} />
          <Route path="/faq" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicFaqPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø§Ù„Ø´Ø§Ø¦Ø¹Ø©..." />} />
          <Route path="/privacy" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicPrivacyPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©..." />} />
          <Route path="/terms" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicTermsPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…..." />} />
          <Route path="/contact" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicContactPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„ØªÙˆØ§ØµÙ„..." />} />
          <Route path="/payment/:gateway/:id" element={<LazyRoute component={PublicPaymentInstructionPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ø¯ÙØ¹..." />} />
          <Route path="/sales-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª..." />} />
          <Route path="/inventory-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†..." />} />
          <Route path="/installments-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„Ø£Ù‚Ø³Ø§Ø· ÙˆØ§Ù„ØªØ­ØµÙŠÙ„..." />} />
          <Route path="/pos-system" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„ÙƒØ§Ø´ÙŠØ± ÙˆÙ†Ù‚Ø·Ø© Ø§Ù„Ø¨ÙŠØ¹..." />} />
          <Route path="/ecommerce-platform" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ØµÙØ­Ø© Ø§Ù„Ù…ØªØ¬Ø± Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ..." />} />
          <Route path="/pricing" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„Ø¨Ø§Ù‚Ø§Øª..." />} />
          <Route path="/demo" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¯ÙŠÙ…Ùˆ ÙˆØ§Ù„ØªØ¬Ø±Ø¨Ø©..." />} />

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




