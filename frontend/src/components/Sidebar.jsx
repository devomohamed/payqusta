import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, Users, FileText, Truck,
  Settings, LogOut, X, Zap, BarChart3, Target, Receipt,
  AlertTriangle, ChevronDown, ChevronLeft, Boxes, Clock, Search, FolderTree,
  PieChart, TrendingUp, Crown, Building2, Shield, Activity,
  Upload, Database, Archive, DollarSign, ShoppingCart, Video, Bell,
  ShoppingBag, RefreshCcw, MessageCircle, FileCheck, Star, Tag, CheckSquare, Award,
  Store, ExternalLink, Plus
} from 'lucide-react';
import { useAuthStore } from '../store';
import AnimatedBrandLogo from './AnimatedBrandLogo';
import { getStorefrontDomainUrl } from '../utils/storefrontHost';

const iconTones = {
  slate: {
    icon: 'text-slate-500 dark:text-slate-300',
    iconActive: 'text-primary-600 dark:text-primary-300',
    bg: 'bg-slate-100 dark:bg-slate-800/80',
    bgActive: 'bg-primary-100 dark:bg-primary-500/20',
  },
  sky: {
    icon: 'text-sky-600 dark:text-sky-300',
    iconActive: 'text-sky-700 dark:text-sky-200',
    bg: 'bg-sky-100/90 dark:bg-sky-500/15',
    bgActive: 'bg-sky-200/90 dark:bg-sky-500/25',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-300',
    iconActive: 'text-amber-700 dark:text-amber-200',
    bg: 'bg-amber-100/90 dark:bg-amber-500/15',
    bgActive: 'bg-amber-200/90 dark:bg-amber-500/25',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-300',
    iconActive: 'text-emerald-700 dark:text-emerald-200',
    bg: 'bg-emerald-100/90 dark:bg-emerald-500/15',
    bgActive: 'bg-emerald-200/90 dark:bg-emerald-500/25',
  },
  indigo: {
    icon: 'text-indigo-600 dark:text-indigo-300',
    iconActive: 'text-indigo-700 dark:text-indigo-200',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/15',
    bgActive: 'bg-indigo-200/90 dark:bg-indigo-500/25',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-300',
    iconActive: 'text-violet-700 dark:text-violet-200',
    bg: 'bg-violet-100/90 dark:bg-violet-500/15',
    bgActive: 'bg-violet-200/90 dark:bg-violet-500/25',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-300',
    iconActive: 'text-teal-700 dark:text-teal-200',
    bg: 'bg-teal-100/90 dark:bg-teal-500/15',
    bgActive: 'bg-teal-200/90 dark:bg-teal-500/25',
  },
  rose: {
    icon: 'text-rose-600 dark:text-rose-300',
    iconActive: 'text-rose-700 dark:text-rose-200',
    bg: 'bg-rose-100/90 dark:bg-rose-500/15',
    bgActive: 'bg-rose-200/90 dark:bg-rose-500/25',
  },
  cyan: {
    icon: 'text-cyan-600 dark:text-cyan-300',
    iconActive: 'text-cyan-700 dark:text-cyan-200',
    bg: 'bg-cyan-100/90 dark:bg-cyan-500/15',
    bgActive: 'bg-cyan-200/90 dark:bg-cyan-500/25',
  },
};

const resolveTone = (tone = 'slate') => iconTones[tone] || iconTones.slate;

const NavItem = ({ to, icon: Icon, label, end = false, badge = null, tone = 'slate' }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => {
        const toneClasses = resolveTone(tone);
        return (
          <>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? toneClasses.bgActive : toneClasses.bg}`}>
              <Icon className={`w-4 h-4 ${isActive ? toneClasses.iconActive : toneClasses.icon}`} />
            </span>
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {badge}
              </span>
            )}
          </>
        );
      }}
    </NavLink>
  );
};

const SubNavItem = ({ to, icon: Icon, label, tone = 'slate', end }) => {
  const { i18n } = useTranslation('admin');
  const isRTL = i18n.dir() === 'rtl';
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 ${isRTL ? 'pr-12' : 'pl-12'} rounded-lg text-sm font-medium transition-all duration-200 ${isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => {
        const toneClasses = resolveTone(tone);
        return (
          <>
            <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? toneClasses.bgActive : toneClasses.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${isActive ? toneClasses.iconActive : toneClasses.icon}`} />
            </span>
            <span>{label}</span>
          </>
        );
      }}
    </NavLink>
  );
};

const DropdownButton = ({ isOpen, isActive, onClick, icon: Icon, label, tone = 'slate' }) => {
  const handleClick = (e) => {
    onClick();
    if (!isOpen) {
      const parent = e.currentTarget.parentElement;
      setTimeout(() => {
        parent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 250);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? resolveTone(tone).bgActive : resolveTone(tone).bg}`}>
          <Icon className={`w-4 h-4 ${isActive ? resolveTone(tone).iconActive : resolveTone(tone).icon}`} />
        </span>
        <span>{label}</span>
      </div>
      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

export default function Sidebar({ open, onClose }) {
  const user = useAuthStore(state => state.user);
  const tenant = useAuthStore(state => state.tenant);
  const logout = useAuthStore(state => state.logout);
  const permissions = useAuthStore(state => state.permissions);
  const can = useAuthStore(state => state.can);
  const location = useLocation();
  const { t, i18n } = useTranslation('admin');
  const isRTL = i18n.dir() === 'rtl';
  const isSystemSuperAdmin =
    !!user?.isSuperAdmin || user?.email?.toLowerCase() === 'super@payqusta.com';
  const storefrontUrl = getStorefrontDomainUrl(tenant?.slug);

  // Dropdown states
  const [dashboardOpen, setDashboardOpen] = useState(
    location.pathname === '/' || location.pathname === '/command-center'
  );
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith('/admin')
  );
  const [productsOpen, setProductsOpen] = useState(
    location.pathname.startsWith('/products') || location.pathname === '/low-stock' || location.pathname === '/stocktake'
  );
  const [salesOpen, setSalesOpen] = useState(
    location.pathname === '/quick-sale' || location.pathname === '/customers' || location.pathname === '/invoices' || location.pathname === '/installments'
  );
  const [suppliersOpen, setSuppliersOpen] = useState(
    location.pathname === '/suppliers' ||
    location.pathname === '/purchase-orders' ||
    location.pathname === '/purchase-returns' ||
    location.pathname === '/supplier-purchase-invoices'
  );
  const [portalOpen, setPortalOpen] = useState(
    location.pathname === '/portal-orders' ||
    location.pathname === '/returns-management' ||
    location.pathname === '/kyc-review' ||
    location.pathname === '/support-messages' ||
    location.pathname === '/reviews' ||
    location.pathname === '/coupons'
  );
  const [storeOpen, setStoreOpen] = useState(
    location.pathname === '/expenses' ||
    location.pathname === '/branches' ||
    location.pathname === '/cameras' ||
    location.pathname === '/subscriptions'
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/supplier-aging-report' || location.pathname === '/business-reports' || location.pathname === '/financials'
  );
  const [toolsOpen, setToolsOpen] = useState(
    location.pathname === '/import' || location.pathname === '/backup'
  );
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings') || location.pathname === '/admin/audit-logs'
  );

  const handleLogout = async () => {
    await logout();
  };


  // Check if paths are active
  const isDashboardActive = location.pathname === '/' || location.pathname === '/command-center';
  const isAdminActive = location.pathname.startsWith('/admin') && location.pathname !== '/admin/audit-logs';
  const isProductsActive = location.pathname.startsWith('/products') || location.pathname === '/low-stock' || location.pathname === '/stocktake';
  const isSalesActive = location.pathname === '/quick-sale' || location.pathname === '/customers' || location.pathname === '/invoices' || location.pathname === '/installments';
  const isSuppliersActive =
    location.pathname === '/suppliers' ||
    location.pathname === '/purchase-orders' ||
    location.pathname === '/purchase-returns' ||
    location.pathname === '/supplier-purchase-invoices';
  const isPortalActive =
    location.pathname === '/portal-orders' ||
    location.pathname === '/returns-management' ||
    location.pathname === '/kyc-review' ||
    location.pathname === '/support-messages' ||
    location.pathname === '/reviews' ||
    location.pathname === '/coupons';
  const isStoreActive =
    location.pathname === '/expenses' ||
    location.pathname === '/branches' ||
    location.pathname === '/cameras' ||
    location.pathname === '/subscriptions';
  const isReportsActive = location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/supplier-aging-report' || location.pathname === '/business-reports';
  const isToolsActive = location.pathname === '/import' || location.pathname === '/backup';
  const isSettingsActive = location.pathname.startsWith('/settings') || location.pathname === '/admin/audit-logs';
  const canAccessSuppliers = can('suppliers', 'read') || user?.role === 'admin';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {tenant?.branding?.logo ? (
            <AnimatedBrandLogo
              src={tenant.branding.logo}
              alt="Logo"
              size="md"
            />
          ) : (
            <AnimatedBrandLogo
              alt={user?.branch?.name || tenant?.name || 'PQ'}
              size="md"
            />
          )}
          <div>
            <h1 className="text-lg font-extrabold tracking-tight truncate max-w-[150px]">
              {user?.branch?.name || tenant?.name || 'PayQusta'}
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5">{t('sidebar.control_panel')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 pb-24 space-y-1 overflow-y-auto no-scrollbar">
        {/* Super Admin Section - Only for Super Admin */}
        {isSystemSuperAdmin && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                <span>{t('sidebar.super_admin')}</span>
              </div>
            </div>
            <NavItem to="/super-admin/plans" icon={Crown} label={t('sidebar.plan_management')} tone="amber" />
            <NavItem to="/super-admin/requests" icon={FileText} label={t('sidebar.subscription_requests')} tone="amber" />
            <NavItem to="/super-admin/leads" icon={MessageCircle} label="????? ??????" tone="amber" />
            <NavItem to="/tenant-management" icon={Building2} label={t('sidebar.store_management')} tone="amber" />
            <div className="my-3 border-t border-gray-200 dark:border-gray-700"></div>
          </>
        )}

        {/* Admin Section - Only for Admin Users (Tenant Admin) */}
        {user?.role === 'admin' && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                <span>{t('sidebar.admin_section')}</span>
              </div>
            </div>

            <NavItem to="/admin/users" icon={Shield} label={isSystemSuperAdmin ? t('sidebar.system_admins') : t('sidebar.employees')} tone="indigo" />
            <NavItem to="/roles" icon={Shield} label={t('sidebar.roles_permissions')} tone="indigo" />

            <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
          </>
        )}

        {/* Dashboard Dropdown */}
        <div>
          <DropdownButton
            isOpen={dashboardOpen}
            isActive={isDashboardActive}
            onClick={() => setDashboardOpen(!dashboardOpen)}
            icon={LayoutDashboard}
            label={t('sidebar.dashboard')}
            tone="sky"
          />
          <div className={`overflow-hidden transition-all duration-200 ${dashboardOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/" icon={LayoutDashboard} label={t('sidebar.overview')} tone="sky" />
              {!isSystemSuperAdmin && (
                <SubNavItem to="/command-center" icon={Target} label={t('sidebar.command_center')} tone="sky" />
              )}
            </div>
          </div>
        </div>

        {!isSystemSuperAdmin && (can('invoices', 'create') || can('customers', 'read') || can('invoices', 'read')) && (
          <div>
            <DropdownButton
              isOpen={salesOpen}
              isActive={isSalesActive}
              onClick={() => setSalesOpen(!salesOpen)}
              icon={Zap}
              tone="amber"
              label="المبيعات"
            />
            <div className={`overflow-hidden transition-all duration-200 ${salesOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('invoices', 'create') && (
                  <SubNavItem to="/quick-sale" icon={Zap} label={t('sidebar.quick_sale')} tone="amber" />
                )}
                {can('customers', 'read') && (
                  <SubNavItem to="/customers" icon={Users} label={t('sidebar.customers')} tone="amber" />
                )}
                {can('invoices', 'read') && (
                  <>
                    <SubNavItem to="/invoices" icon={FileText} label={t('sidebar.invoices')} tone="amber" />
                    <SubNavItem to="/installments" icon={Clock} label="دفتر الأقساط والآجل" tone="amber" />
                    <SubNavItem to="/shift" icon={Clock} label="إدارة الورديات" tone="amber" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Dropdown */}
        {!isSystemSuperAdmin && (can('products', 'read') || can('stock_adjustments', 'read')) && (
          <div>
            <DropdownButton
              isOpen={productsOpen}
              isActive={isProductsActive}
              onClick={() => setProductsOpen(!productsOpen)}
              icon={Package}
              tone="emerald"
              label={t('sidebar.products')}
            />
            <div className={`overflow-y-auto transition-all duration-200 ${productsOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('products', 'read') && (
                  <>
                    <SubNavItem to="/products" icon={Boxes} label={t('sidebar.all_products')} tone="emerald" end />
                    <SubNavItem to="/products?action=add" icon={Plus} label="إضافة منتج" tone="emerald" />
                    <SubNavItem to="/categories" icon={FolderTree} label="الأقسام" tone="emerald" />
                    <SubNavItem to="/stock-search" icon={Search} label="بحث عن توفر منتج" tone="emerald" />
                    <SubNavItem to="/low-stock" icon={AlertTriangle} label={t('sidebar.low_stock')} tone="emerald" />
                    <SubNavItem to="/stocktake" icon={CheckSquare} label="الجرد الشامل" tone="emerald" />
                  </>
                )}
                {can('stock_adjustments', 'read') && (
                  <SubNavItem to="/stock-adjustments" icon={Archive} label={t('sidebar.stock_adjustments')} tone="emerald" />
                )}
              </div>
            </div>
          </div>
        )}

        {!isSystemSuperAdmin && canAccessSuppliers && (
          <div>
            <DropdownButton
              isOpen={suppliersOpen}
              isActive={isSuppliersActive}
              onClick={() => setSuppliersOpen(!suppliersOpen)}
              icon={Truck}
              tone="indigo"
              label={t('sidebar.suppliers')}
            />
            <div className={`overflow-hidden transition-all duration-200 ${suppliersOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                <SubNavItem to="/suppliers" icon={Truck} label={t('sidebar.suppliers')} tone="indigo" />
                <SubNavItem to="/purchase-orders" icon={ShoppingCart} label="أوامر الشراء" tone="indigo" />
                <SubNavItem to="/supplier-purchase-invoices" icon={Receipt} label="فواتير مشتريات المورد" tone="indigo" />
                <SubNavItem to="/purchase-returns" icon={RefreshCcw} label="مرتجعات الشراء" tone="indigo" />
              </div>
            </div>
          </div>
        )}


        {!isSystemSuperAdmin && (
          <div>
            <DropdownButton
              isOpen={portalOpen}
              isActive={isPortalActive}
              onClick={() => setPortalOpen(!portalOpen)}
              icon={ShoppingBag}
              tone="violet"
              label="البوابة"
            />
            <div className={`overflow-hidden transition-all duration-200 ${portalOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {user?.role === 'admin' && (
                  <SubNavItem to="/portal-orders" icon={ShoppingBag} label={t('sidebar.portal_orders')} tone="violet" />
                )}
                {(user?.role === 'admin' || user?.role === 'vendor' || can('settings', 'read')) && (
                  <>
                    <SubNavItem to="/returns-management" icon={RefreshCcw} label={t('sidebar.returns')} tone="violet" />
                    <SubNavItem to="/kyc-review" icon={FileCheck} label={t('sidebar.kyc_documents')} tone="violet" />
                    <SubNavItem to="/support-messages" icon={MessageCircle} label={t('sidebar.support_messages')} tone="violet" />
                    <SubNavItem to="/reviews" icon={Star} label={t('sidebar.reviews')} tone="violet" />
                    <SubNavItem to="/coupons" icon={Tag} label={t('sidebar.coupons')} tone="violet" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Store Quick Link - visible to tenant admins only */}
        {!isSystemSuperAdmin && user?.role === 'admin' && (
          <div className="my-2">
            <a
              href={storefrontUrl}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Store className="w-5 h-5 flex-shrink-0" />
              </div>
              <span className="flex-1">تصفح متجري</span>
            </a>
          </div>
        )}

        {!isSystemSuperAdmin && (can('expenses', 'read') || user?.role === 'admin') && (
          <div>
            <DropdownButton
              isOpen={storeOpen}
              isActive={isStoreActive}
              onClick={() => setStoreOpen(!storeOpen)}
              icon={Building2}
              tone="teal"
              label="إدارة المتجر"
            />
            <div className={`overflow-hidden transition-all duration-200 ${storeOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('expenses', 'read') && (
                  <SubNavItem to="/expenses" icon={Receipt} label={t('sidebar.expenses')} tone="teal" />
                )}
                {user?.role === 'admin' && (
                  <>
                    <SubNavItem to="/branches" icon={Building2} label={t('sidebar.branches')} tone="teal" />
                    <SubNavItem to="/cameras" icon={Video} label={t('sidebar.live_monitoring')} tone="teal" />
                    <SubNavItem to="/subscriptions" icon={Crown} label={t('sidebar.subscriptions')} tone="teal" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Dropdown */}
        {(isSystemSuperAdmin || can('reports', 'read')) && (
          <div>
            <DropdownButton
              isOpen={reportsOpen}
              isActive={isReportsActive}
              onClick={() => setReportsOpen(!reportsOpen)}
              icon={BarChart3}
              tone="rose"
              label={isSystemSuperAdmin ? t('sidebar.system_analytics') : t('sidebar.reports')}
            />
            <div className={`overflow-y-auto transition-all duration-200 ${reportsOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {isSystemSuperAdmin ? (
                  <>
                    <SubNavItem to="/super-admin/analytics" icon={PieChart} label={t('sidebar.store_revenue')} tone="rose" />
                    <SubNavItem to="/admin/statistics" icon={TrendingUp} label={t('sidebar.system_stats')} tone="rose" />
                  </>
                ) : (
                  <>
                    <SubNavItem to="/reports" icon={PieChart} label={t('sidebar.general_reports')} tone="rose" />
                    <SubNavItem to="/financials" icon={DollarSign} label="المالية والأرباح" tone="rose" />
                    <SubNavItem to="/staff-performance" icon={Award} label="أداء الموظفين" tone="rose" />
                    <SubNavItem to="/business-reports" icon={TrendingUp} label={t('sidebar.business_reports')} tone="rose" />
                    <SubNavItem to="/aging-report" icon={Clock} label={t('sidebar.debt_aging')} tone="rose" />
                    <SubNavItem to="/supplier-aging-report" icon={Truck} label="أعمار ديون الموردين" tone="rose" />
                    <SubNavItem to="/admin/audit-logs" icon={Shield} label="سجلات الأمان" tone="rose" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Tools Dropdown - Only for regular Admin */}
        {
          (user?.role === 'admin' && !isSystemSuperAdmin) && (
            <div>
              <DropdownButton
                isOpen={toolsOpen}
                isActive={isToolsActive}
                onClick={() => setToolsOpen(!toolsOpen)}
                icon={Database}
                tone="cyan"
                label={t('sidebar.tools')}
              />
              <div className={`overflow-hidden transition-all duration-200 ${toolsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
                <div className="space-y-1 py-1">
                  <SubNavItem to="/import" icon={Upload} label={t('sidebar.import_data')} tone="cyan" />
                  <SubNavItem to="/backup" icon={Database} label={t('sidebar.backup')} tone="cyan" />
                </div>
              </div>
            </div>
          )
        }

        {/* Settings Dropdown */}
        <div>
          <DropdownButton
            isOpen={settingsOpen}
            isActive={isSettingsActive}
            onClick={() => setSettingsOpen(!settingsOpen)}
            icon={Settings}
            tone="slate"
            label={t('sidebar.settings')}
          />
          <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/settings" icon={Settings} label={t('sidebar.general_settings')} tone="slate" />
              {(user?.role === 'admin' || isSystemSuperAdmin) && (
                <SubNavItem to="/admin/audit-logs" icon={Activity} label={t('sidebar.activity_log')} tone="slate" />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{tenant?.name || t('sidebar.my_store')}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title={t('sidebar.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 flex-shrink-0 ${isRTL ? 'border-l' : 'border-r'} border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col`}>
        {renderSidebarContent()}
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl ${isRTL ? 'animate-slide-right' : 'animate-slide-left'} flex flex-col`}>
            <button
              onClick={onClose}
              className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400`}
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}
    </>
  );
}
