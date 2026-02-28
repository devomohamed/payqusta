import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, Users, FileText, Truck,
  Settings, LogOut, X, Zap, BarChart3, Target, Receipt,
  AlertTriangle, ChevronDown, ChevronLeft, Boxes, Clock, Search, FolderTree,
  PieChart, TrendingUp, Crown, Building2, Shield, Activity,
  Upload, Database, Archive, DollarSign, ShoppingCart, Video, Bell,
  ShoppingBag, RefreshCcw, MessageCircle, FileCheck, Star, Tag, CheckSquare, Award,
} from 'lucide-react';
import { useAuthStore } from '../store';
import AnimatedBrandLogo from './AnimatedBrandLogo';

export default function Sidebar({ open, onClose }) {
  const { user, tenant, logout, permissions, can } = useAuthStore();
  const location = useLocation();
  const { t, i18n } = useTranslation('admin');
  const isRTL = i18n.dir() === 'rtl';
  const isSystemSuperAdmin =
    !!user?.isSuperAdmin || user?.email?.toLowerCase() === 'super@payqusta.com';

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
    location.pathname === '/quick-sale' || location.pathname === '/customers' || location.pathname === '/invoices'
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
    location.pathname === '/suppliers' ||
    location.pathname === '/expenses' ||
    location.pathname === '/branches' ||
    location.pathname === '/cameras' ||
    location.pathname === '/subscriptions'
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/business-reports' || location.pathname === '/financials'
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
  const isSalesActive = location.pathname === '/quick-sale' || location.pathname === '/customers' || location.pathname === '/invoices';
  const isPortalActive =
    location.pathname === '/portal-orders' ||
    location.pathname === '/returns-management' ||
    location.pathname === '/kyc-review' ||
    location.pathname === '/support-messages' ||
    location.pathname === '/reviews' ||
    location.pathname === '/coupons';
  const isStoreActive =
    location.pathname === '/suppliers' ||
    location.pathname === '/expenses' ||
    location.pathname === '/branches' ||
    location.pathname === '/cameras' ||
    location.pathname === '/subscriptions';
  const isReportsActive = location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/business-reports';
  const isToolsActive = location.pathname === '/import' || location.pathname === '/backup';
  const isSettingsActive = location.pathname.startsWith('/settings') || location.pathname === '/admin/audit-logs';

  const NavItem = ({ to, icon: Icon, label, end = false, badge = null }) => (
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
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );

  const SubNavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 ${isRTL ? 'pr-12' : 'pl-12'} rounded-lg text-sm font-medium transition-all duration-200 ${isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-gray-300'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );

  const DropdownButton = ({ isOpen, isActive, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  const SidebarContent = () => (
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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {/* Super Admin Section - Only for Super Admin */}
        {isSystemSuperAdmin && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                <span>{t('sidebar.super_admin')}</span>
              </div>
            </div>
            <NavItem to="/super-admin/plans" icon={Crown} label={t('sidebar.plan_management')} />
            <NavItem to="/super-admin/requests" icon={FileText} label={t('sidebar.subscription_requests')} />
            <NavItem to="/tenant-management" icon={Building2} label={t('sidebar.store_management')} />
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

            <NavItem to="/admin/users" icon={Shield} label={isSystemSuperAdmin ? t('sidebar.system_admins') : t('sidebar.employees')} />
            <NavItem to="/roles" icon={Shield} label={t('sidebar.roles_permissions')} />

            <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
          </>
        )}

        {/* Staff Tools */}

        {/* Dashboard Dropdown */}
        <div>
          <DropdownButton
            isOpen={dashboardOpen}
            isActive={isDashboardActive}
            onClick={() => setDashboardOpen(!dashboardOpen)}
            icon={LayoutDashboard}
            label={t('sidebar.dashboard')}
          />
          <div className={`overflow-hidden transition-all duration-200 ${dashboardOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/" icon={LayoutDashboard} label={t('sidebar.overview')} />
              {!isSystemSuperAdmin && (
                <SubNavItem to="/command-center" icon={Target} label={t('sidebar.command_center')} />
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
              label="المبيعات"
            />
            <div className={`overflow-hidden transition-all duration-200 ${salesOpen ? 'max-h-52 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('invoices', 'create') && (
                  <SubNavItem to="/quick-sale" icon={Zap} label={t('sidebar.quick_sale')} />
                )}
                {can('customers', 'read') && (
                  <SubNavItem to="/customers" icon={Users} label={t('sidebar.customers')} />
                )}
                {can('invoices', 'read') && (
                  <SubNavItem to="/invoices" icon={FileText} label={t('sidebar.invoices')} />
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
              label={t('sidebar.products')}
            />
            <div className={`overflow-y-auto transition-all duration-200 ${productsOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('products', 'read') && (
                  <>
                    <SubNavItem to="/products" icon={Boxes} label={t('sidebar.all_products')} />
                    <SubNavItem to="/categories" icon={FolderTree} label="التصنيفات" />
                    <SubNavItem to="/stock-search" icon={Search} label="بحث عن توفر منتج" />
                    <SubNavItem to="/low-stock" icon={AlertTriangle} label={t('sidebar.low_stock')} />
                    <SubNavItem to="/stocktake" icon={CheckSquare} label="الجرد الشامل" />
                  </>
                )}
                {can('stock_adjustments', 'read') && (
                  <SubNavItem to="/stock-adjustments" icon={Archive} label={t('sidebar.stock_adjustments')} />
                )}
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
              label="البوابة"
            />
            <div className={`overflow-hidden transition-all duration-200 ${portalOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {user?.role === 'admin' && (
                  <SubNavItem to="/portal-orders" icon={ShoppingBag} label={t('sidebar.portal_orders')} />
                )}
                {(user?.role === 'admin' || user?.role === 'vendor' || can('settings', 'read')) && (
                  <>
                    <SubNavItem to="/returns-management" icon={RefreshCcw} label={t('sidebar.returns')} />
                    <SubNavItem to="/kyc-review" icon={FileCheck} label={t('sidebar.kyc_documents')} />
                    <SubNavItem to="/support-messages" icon={MessageCircle} label={t('sidebar.support_messages')} />
                    <SubNavItem to="/reviews" icon={Star} label={t('sidebar.reviews')} />
                    <SubNavItem to="/coupons" icon={Tag} label={t('sidebar.coupons')} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!isSystemSuperAdmin && (can('suppliers', 'read') || can('expenses', 'read') || user?.role === 'admin') && (
          <div>
            <DropdownButton
              isOpen={storeOpen}
              isActive={isStoreActive}
              onClick={() => setStoreOpen(!storeOpen)}
              icon={Building2}
              label="إدارة المتجر"
            />
            <div className={`overflow-hidden transition-all duration-200 ${storeOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {can('suppliers', 'read') && (
                  <SubNavItem to="/suppliers" icon={Truck} label={t('sidebar.suppliers')} />
                )}
                {can('expenses', 'read') && (
                  <SubNavItem to="/expenses" icon={Receipt} label={t('sidebar.expenses')} />
                )}
                {user?.role === 'admin' && (
                  <>
                    <SubNavItem to="/branches" icon={Building2} label={t('sidebar.branches')} />
                    <SubNavItem to="/cameras" icon={Video} label={t('sidebar.live_monitoring')} />
                    <SubNavItem to="/subscriptions" icon={Crown} label={t('sidebar.subscriptions')} />
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
              label={isSystemSuperAdmin ? t('sidebar.system_analytics') : t('sidebar.reports')}
            />
            <div className={`overflow-y-auto transition-all duration-200 ${reportsOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {isSystemSuperAdmin ? (
                  <>
                    <SubNavItem to="/super-admin/analytics" icon={PieChart} label={t('sidebar.store_revenue')} />
                    <SubNavItem to="/admin/statistics" icon={TrendingUp} label={t('sidebar.system_stats')} />
                  </>
                ) : (
                  <>
                    <SubNavItem to="/reports" icon={PieChart} label={t('sidebar.general_reports')} />
                    <SubNavItem to="/financials" icon={DollarSign} label="المالية والأرباح" />
                    <SubNavItem to="/staff-performance" icon={Award} label="أداء الموظفين" />
                    <SubNavItem to="/business-reports" icon={TrendingUp} label={t('sidebar.business_reports')} />
                    <SubNavItem to="/aging-report" icon={Clock} label={t('sidebar.debt_aging')} />
                    <SubNavItem to="/admin/audit-logs" icon={Shield} label="سجلات الأمان" />
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
                label={t('sidebar.tools')}
              />
              <div className={`overflow-hidden transition-all duration-200 ${toolsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
                <div className="space-y-1 py-1">
                  <SubNavItem to="/import" icon={Upload} label={t('sidebar.import_data')} />
                  <SubNavItem to="/backup" icon={Database} label={t('sidebar.backup')} />
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
            label={t('sidebar.settings')}
          />
          <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/settings" icon={Settings} label={t('sidebar.general_settings')} />
              {(user?.role === 'admin' || isSystemSuperAdmin) && (
                <SubNavItem to="/admin/audit-logs" icon={Activity} label={t('sidebar.activity_log')} />
              )}
            </div>
          </div>
        </div>
      </nav >

      {/* User Card */}
      < div className="p-3 border-t border-gray-100 dark:border-gray-800" >
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
      </div >
    </div >
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 flex-shrink-0 ${isRTL ? 'border-l' : 'border-r'} border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col`}>
        <SidebarContent />
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
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
