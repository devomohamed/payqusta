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
import UpdateBanner from './components/UpdateBanner';
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
const ActivateAccountPage = React.lazy(() => import('./pages/ActivateAccountPage'));
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
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const BranchManagement = React.lazy(() => import('./pages/BranchManagement'));
const TenantManagementPage = React.lazy(() => import('./pages/TenantManagementPage'));
const SuperAdminPlansPage = React.lazy(() => import('./pages/SuperAdminPlansPage'));
const SubscriptionRequestsPage = React.lazy(() => import('./pages/SubscriptionRequestsPage'));
const SuperAdminNotificationSettingsPage = React.lazy(() => import('./pages/SuperAdminNotificationSettingsPage'));
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
const AdminShiftsPage = React.lazy(() => import('./pages/AdminShiftsPage'));
const SupplierAgingReportPage = React.lazy(() => import('./pages/SupplierAgingReportPage'));
const PurchaseReturnsPage = React.lazy(() => import('./pages/PurchaseReturnsPage'));

const hasBrokenEncoding = (value = '') => /[Ã˜Ã™Ã°Ã¢]|^\?{3,}/.test(String(value));
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
      <div className="app-shell-bg min-h-screen flex items-center justify-center">
        <div className="app-surface app-eye-candy-ring flex items-center gap-3 rounded-2xl px-5 py-4 app-text-soft">
          <span className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <span className="app-text-strong text-sm font-semibold">Loading your workspace...</span>
        </div>
      </div>
    );
  }
  return children;
}

function MainLayout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="app-shell-bg flex min-h-screen overflow-hidden">
      <Sidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden scroll-smooth">
          <main className="mobile-app-main flex-1 w-full max-w-[1600px] mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<LazyRoute component={DashboardPage} message="جاري تحميل اللوحة..." />} />
                <Route path="/products" element={<LazyRoute component={ProductsPage} message="جاري تحميل المنتجات..." />} />
                <Route path="/customers" element={<LazyRoute component={CustomersPage} message="جاري تحميل العملاء..." />} />
                <Route path="/invoices" element={<LazyRoute component={InvoicesPage} message="جاري تحميل الفواتير..." />} />
                <Route path="/settings" element={<LazyRoute component={SettingsPage} message="جاري تحميل الإعدادات..." />} />
                <Route path="/branch-dashboard" element={<LazyRoute component={BranchDashboardPage} message="جاري تحميل لوحة الفرع..." />} />
                <Route path="/categories" element={<LazyRoute component={CategoriesPage} message="جاري تحميل التصنيفات..." />} />
                <Route path="/stocktake" element={<LazyRoute component={StocktakePage} message="جاري تحميل الجرد..." />} />
                <Route path="/stock-adjustments" element={<LazyRoute component={StockAdjustmentsPage} message="جاري تحميل تسويات المخزون..." />} />
                <Route path="/marketing" element={<LazyRoute component={MarketingPage} message="جاري تحميل التسويق..." />} />
                <Route path="/staff-performance" element={<LazyRoute component={StaffPerformancePage} message="جاري تحميل أداء الموظفين..." />} />
                <Route path="/financials" element={<LazyRoute component={FinancialsPage} message="جاري تحميل المالية..." />} />
                <Route path="/suppliers" element={<LazyRoute component={SuppliersPage} message="جاري تحميل الموردين..." />} />
                <Route path="/quick-sale" element={<LazyRoute component={QuickSalePage} message="جاري تحميل الكاشير..." />} />
                <Route path="/reports" element={<LazyRoute component={ReportsPage} message="جاري تحميل التقارير..." />} />
                <Route path="/business-reports" element={<LazyRoute component={BusinessReportsPage} message="جاري تحميل تقارير الأعمال..." />} />
                <Route path="/command-center" element={<LazyRoute component={CommandCenterPage} message="جاري تحميل مركز التحكم..." />} />
                <Route path="/expenses" element={<LazyRoute component={ExpensesPage} message="جاري تحميل المصاريف..." />} />
                <Route path="/low-stock" element={<LazyRoute component={LowStockPage} message="جاري تحميل النواقص..." />} />
                <Route path="/subscriptions" element={<LazyRoute component={SubscriptionPage} message="جاري تحميل الاشتراكات..." />} />
                <Route path="/cameras" element={<LazyRoute component={CamerasPage} message="جاري تحميل الكاميرات..." />} />
                <Route path="/cash-drawer" element={<LazyRoute component={CashDrawerPage} message="جاري تحميل الخزينة..." />} />
                <Route path="/roles" element={<LazyRoute component={RolesPage} message="جاري تحميل الأدوار..." />} />
                <Route path="/activity-logs" element={<LazyRoute component={ActivityLogsPage} message="جاري تحميل سجل النشاط..." />} />
                <Route path="/purchase-orders" element={<LazyRoute component={PurchaseOrdersPage} message="جاري تحميل أوامر الشراء..." />} />
                <Route path="/supplier-purchase-invoices" element={<LazyRoute component={SupplierPurchaseInvoicesPage} message="جاري تحميل فواتير المشتريات..." />} />
                <Route path="/aging-report" element={<LazyRoute component={AgingReportPage} message="جاري تحميل تقرير الأعمار..." />} />
                <Route path="/installments" element={<LazyRoute component={InstallmentsDashboardPage} message="جاري تحميل الأقساط..." />} />
                <Route path="/admin/dashboard" element={<LazyRoute component={AdminDashboardPage} message="جاري تحميل لوحة الإدارة..." />} />
                <Route path="/admin/tenants" element={<LazyRoute component={AdminTenantsPage} message="جاري تحميل المستأجرين..." />} />
                <Route path="/admin/users" element={<LazyRoute component={AdminUsersPage} message="جاري تحميل المستخدمين..." />} />
                <Route path="/admin/audit-logs" element={<LazyRoute component={AdminAuditLogsPage} message="جاري تحميل سجلات التدقيق..." />} />
                <Route path="/admin/statistics" element={<LazyRoute component={AdminStatisticsPage} message="جاري تحميل الإحصائيات..." />} />
                <Route path="/import" element={<LazyRoute component={ImportDataPage} message="جاري تحميل الاستيراد..." />} />
                <Route path="/backup" element={<LazyRoute component={BackupRestorePage} message="جاري تحميل النسخ الاحتياطي..." />} />
                <Route path="/onboarding" element={<LazyRoute component={OnboardingPage} message="جاري تحميل الإعداد الأولي..." />} />
                <Route path="/branches" element={<LazyRoute component={BranchManagement} message="جاري تحميل الفروع..." />} />
                <Route path="/tenant-management" element={<LazyRoute component={TenantManagementPage} message="جاري تحميل إدارة المتجر..." />} />
                <Route path="/super-admin/plans" element={<LazyRoute component={SuperAdminPlansPage} message="جاري تحميل الخطط..." />} />
                <Route path="/super-admin/requests" element={<LazyRoute component={SubscriptionRequestsPage} message="جاري تحميل الطلبات..." />} />
                <Route path="/super-admin/notifications" element={<LazyRoute component={SuperAdminNotificationSettingsPage} message="جاري تحميل إعدادات الإشعارات..." />} />
                <Route path="/portal-orders" element={<LazyRoute component={PortalOrdersAdminPage} message="جاري تحميل طلبات البوابة..." />} />
                <Route path="/returns-management" element={<LazyRoute component={ReturnsManagementPage} message="جاري تحميل إدارة المرتجعات..." />} />
                <Route path="/kyc-review" element={<LazyRoute component={KYCReviewPage} message="جاري تحميل مراجعة الهوية..." />} />
                <Route path="/support-messages" element={<LazyRoute component={SupportMessagesPage} message="جاري تحميل رسائل الدعم..." />} />
                <Route path="/reviews" element={<LazyRoute component={ReviewsPage} message="جاري تحميل التقييمات..." />} />
                <Route path="/coupons" element={<LazyRoute component={CouponsPage} message="جاري تحميل الكوبونات..." />} />
                <Route path="/referral" element={<LazyRoute component={ReferralPage} message="جاري تحميل الإحالات..." />} />
                <Route path="/revenue-analytics" element={<LazyRoute component={RevenueAnalyticsPage} message="جاري تحميل التحليلات..." />} />
                <Route path="/notifications" element={<LazyRoute component={NotificationsPage} message="جاري تحميل الإشعارات..." />} />
                <Route path="/stock-search" element={<LazyRoute component={StockSearchPage} message="جاري تحميل البحث..." />} />
                <Route path="/shift" element={<LazyRoute component={ShiftManagementPage} message="جاري تحميل الورديات..." />} />
                <Route path="/admin-shifts" element={<LazyRoute component={AdminShiftsPage} message="جاري تحميل مراقبة الورديات..." />} />
                <Route path="/supplier-aging-report" element={<LazyRoute component={SupplierAgingReportPage} message="جاري تحميل تقرير الموردين..." />} />
                <Route path="/purchase-returns" element={<LazyRoute component={PurchaseReturnsPage} message="جاري تحميل مرتجعات الشراء..." />} />
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
  const { dark, syncWithSystem } = useThemeStore();
  const { isAuthenticated, getMe, user, loadingUser, loggingOut } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user || loadingUser) return;
    getMe().catch(() => { });
  }, [isAuthenticated, user, loadingUser, getMe]);

  useEffect(() => syncWithSystem(), [syncWithSystem]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role !== 'super_admin') return;

    const key = `super-login-toast:${user.email?.toLowerCase()}`;
    if (sessionStorage.getItem(key)) return;

    toast.success('Signed in as Super Admin');
    sessionStorage.setItem(key, '1');
  }, [isAuthenticated, user]);

  if (loggingOut) {
    return (
      <div className={`app-shell-bg fixed inset-0 z-[9999] flex items-center justify-center ${dark ? 'dark' : ''}`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="app-surface relative flex flex-col items-center gap-6 rounded-[2rem] px-8 py-10">
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
        <AnimatedNotification />
        <ConfirmDialog />

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

        <InstallPrompt />
        <UpdateBanner />

        <Routes>
          <Route path="/portal/login" element={
            <LazyRoute component={PortalLogin} message="جاري تحميل تسجيل الدخول..." />
          } />

          <Route path="/portal" element={<LazyRoute component={PortalLayout} message="جاري تحميل البوابة..." />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<LazyRoute component={PortalHome} message="جاري تحميل البوابة..." />} />
            <Route path="invoices" element={<LazyRoute component={PortalInvoices} message="جاري تحميل فواتير البوابة..." />} />
            <Route path="returns" element={<LazyRoute component={PortalReturns} message="جاري تحميل المرتجعات..." />} />
            <Route path="statement" element={<LazyRoute component={PortalStatement} message="جاري تحميل كشف الحساب..." />} />
            <Route path="calculator" element={<LazyRoute component={PortalInstallmentCalculator} message="جاري تحميل حاسبة الأقساط..." />} />
            <Route path="documents" element={<LazyRoute component={PortalDocuments} message="جاري تحميل المستندات..." />} />
            <Route path="addresses" element={<LazyRoute component={PortalAddresses} message="جاري تحميل العناوين..." />} />
            <Route path="profile" element={<LazyRoute component={PortalProfile} message="جاري تحميل الملف الشخصي..." />} />
            <Route path="orders" element={<LazyRoute component={PortalOrders} message="جاري تحميل الطلبات..." />} />
            <Route path="wishlist" element={<LazyRoute component={PortalWishlist} message="جاري تحميل المفضلة..." />} />
            <Route path="support" element={<LazyRoute component={PortalSupport} message="جاري تحميل الدعم..." />} />
            <Route path="support/:id" element={<LazyRoute component={PortalSupportChat} message="جاري تحميل المحادثة..." />} />
            <Route path="notifications" element={<LazyRoute component={PortalNotifications} message="جاري تحميل الإشعارات..." />} />
            <Route path="points" element={<LazyRoute component={PortalPointsHistory} message="جاري تحميل سجل النقاط..." />} />
            <Route path="reviews" element={<LazyRoute component={PortalReviews} message="جاري تحميل التقييمات..." />} />
            <Route path="products" element={<LazyRoute component={PortalProducts} message="جاري تحميل المنتجات..." />} />
            <Route path="products/:id" element={<LazyRoute component={PortalProductDetails} message="جاري تحميل تفاصيل المنتج..." />} />
            <Route path="cart" element={<LazyRoute component={ShoppingCart} message="جاري تحميل السلة..." />} />
            <Route path="checkout" element={<LazyRoute component={PortalCheckout} message="جاري تحميل إتمام الطلب..." />} />
            <Route path="payment/result" element={<LazyRoute component={PortalPaymentResult} message="جاري تحميل نتيجة الدفع..." />} />
          </Route>

          <Route path={storefrontPath('/')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontHome} message="جاري تحميل المتجر..." />} />
          <Route path={storefrontPath('/products')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ProductCatalog} message="جاري تحميل كتالوج المنتجات..." />} />
          <Route path={storefrontPath('/products/:id')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ProductDetails} message="جاري تحميل تفاصيل المنتج..." />} />
          <Route path={storefrontPath('/collections/:slug')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontLandingPage} message="جاري تحميل المجموعة..." />} />
          <Route path={storefrontPath('/about')} element={<LazyLayoutRoute layout={StorefrontLayout} component={StorefrontAbout} message="جاري تحميل صفحة المتجر..." />} />
          <Route path={storefrontPath('/cart')} element={<LazyLayoutRoute layout={StorefrontLayout} component={ShoppingCart} message="جاري تحميل السلة..." />} />
          <Route path={storefrontPath('/checkout')} element={<LazyLayoutRoute layout={StorefrontLayout} component={Checkout} message="جاري تحميل إتمام الطلب..." />} />
          <Route path={storefrontPath('/order/:id')} element={<LazyLayoutRoute layout={StorefrontLayout} component={OrderConfirmation} message="جاري تحميل تفاصيل الطلب..." />} />
          <Route path={storefrontPath('/track-order')} element={<LazyLayoutRoute layout={StorefrontLayout} component={OrderTracking} message="جاري تحميل تتبع الطلب..." />} />

          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <LazyRoute component={LoginPage} message="جاري تحميل تسجيل الدخول..." />
          } />
          <Route path="/forgot-password" element={<LazyRoute component={ForgotPasswordPage} message="جاري تحميل استعادة كلمة المرور..." />} />
          <Route path="/reset-password/:token" element={<LazyRoute component={ResetPasswordPage} message="جاري تحميل إعادة التعيين..." />} />
          <Route path="/activate-account/:token" element={<LazyRoute component={ActivateAccountPage} message="جاري تحميل صفحة التفعيل..." />} />
          <Route path="/" element={
            isAuthenticated ? (
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            ) : (
              <LazyLayoutRoute layout={PublicSiteLayout} component={PublicLandingPage} message="جاري تحميل الصفحة الرئيسية..." />
            )
          } />
          <Route path="/features" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicFeaturesPage} message="جاري تحميل المزايا..." />} />
          <Route path="/use-cases" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicUseCasesPage} message="جاري تحميل حالات الاستخدام..." />} />
          <Route path="/how-it-works" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicHowItWorksPage} message="جاري تحميل شرح المنصة..." />} />
          <Route path="/faq" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicFaqPage} message="جاري تحميل الأسئلة الشائعة..." />} />
          <Route path="/privacy" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicPrivacyPage} message="جاري تحميل سياسة الخصوصية..." />} />
          <Route path="/terms" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicTermsPage} message="جاري تحميل الشروط والأحكام..." />} />
          <Route path="/contact" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicContactPage} message="جاري تحميل صفحة التواصل..." />} />
          <Route path="/payment/:gateway/:id" element={<LazyRoute component={PublicPaymentInstructionPage} message="جاري تحميل تعليمات الدفع..." />} />
          <Route path="/sales-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل صفحة إدارة المبيعات..." />} />
          <Route path="/inventory-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل صفحة إدارة المخزون..." />} />
          <Route path="/installments-management" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل صفحة الأقساط والتحصيل..." />} />
          <Route path="/pos-system" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل صفحة الكاشير ونقطة البيع..." />} />
          <Route path="/ecommerce-platform" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل صفحة المتجر الإلكتروني..." />} />
          <Route path="/pricing" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل الأسعار والباقات..." />} />
          <Route path="/demo" element={<LazyLayoutRoute layout={PublicSiteLayout} component={PublicSeoTopicPage} message="جاري تحميل الديمو والتجربة..." />} />

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

