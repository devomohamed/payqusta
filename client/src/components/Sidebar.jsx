import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, Users, FileText, Truck,
  Settings, LogOut, X, Zap, BarChart3, Target, Receipt,
  AlertTriangle, ChevronDown, ChevronLeft, Boxes, Clock,
  PieChart, TrendingUp, Crown, Building2, Shield, Activity,
  Upload, Database, Archive, DollarSign, ShoppingCart, Video, Bell,
  ShoppingBag, RefreshCcw, MessageCircle, FileCheck, Star, Tag,
} from 'lucide-react';
import { useAuthStore } from '../store';

export default function Sidebar({ open, onClose }) {
  const { user, tenant, logout, permissions } = useAuthStore();
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
    location.pathname.startsWith('/products') || location.pathname === '/low-stock'
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/business-reports'
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

  const hasPermission = (resource) => {
    if (user?.role === 'admin' || !!user?.isSuperAdmin || user?.email?.toLowerCase() === 'super@payqusta.com') return true;
    return permissions?.some(p => p.resource === resource && p.actions.includes('read'));
  };

  // Check if paths are active
  const isDashboardActive = location.pathname === '/' || location.pathname === '/command-center';
  const isAdminActive = location.pathname.startsWith('/admin') && location.pathname !== '/admin/audit-logs';
  const isProductsActive = location.pathname.startsWith('/products') || location.pathname === '/low-stock';
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
            <img
              src={tenant.branding.logo}
              alt="Logo"
              className="w-11 h-11 object-contain"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
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

        {!isSystemSuperAdmin && hasPermission('invoices') && (
          <NavItem to="/quick-sale" icon={Zap} label={t('sidebar.quick_sale')} />
        )}

        {/* Products Dropdown */}
        {!isSystemSuperAdmin && (hasPermission('products') || hasPermission('stock_adjustments')) && (
          <div>
            <DropdownButton
              isOpen={productsOpen}
              isActive={isProductsActive}
              onClick={() => setProductsOpen(!productsOpen)}
              icon={Package}
              label={t('sidebar.products')}
            />
            <div className={`overflow-hidden transition-all duration-200 ${productsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {hasPermission('products') && (
                  <>
                    <SubNavItem to="/products" icon={Boxes} label={t('sidebar.all_products')} />
                    <SubNavItem to="/low-stock" icon={AlertTriangle} label={t('sidebar.low_stock')} />
                  </>
                )}
                {hasPermission('stock_adjustments') && (
                  <SubNavItem to="/stock-adjustments" icon={Archive} label={t('sidebar.stock_adjustments')} />
                )}
              </div>
            </div>
          </div>
        )}

        {!isSystemSuperAdmin && (
          <>
            {hasPermission('customers') && <NavItem to="/customers" icon={Users} label={t('sidebar.customers')} />}
            {hasPermission('invoices') && <NavItem to="/invoices" icon={FileText} label={t('sidebar.invoices')} />}
          </>
        )}

        {(user?.role === 'admin' && !isSystemSuperAdmin) && (
          <NavItem to="/portal-orders" icon={ShoppingBag} label={t('sidebar.portal_orders')} />
        )}

        {!isSystemSuperAdmin && (user?.role === 'admin' || user?.role === 'vendor' || hasPermission('settings')) && (
          <>
            <NavItem to="/returns-management" icon={RefreshCcw} label={t('sidebar.returns')} />
            <NavItem to="/kyc-review" icon={FileCheck} label={t('sidebar.kyc_documents')} />
            <NavItem to="/support-messages" icon={MessageCircle} label={t('sidebar.support_messages')} />
            <NavItem to="/reviews" icon={Star} label={t('sidebar.reviews')} />
            <NavItem to="/coupons" icon={Tag} label={t('sidebar.coupons')} />
          </>
        )}

        {!isSystemSuperAdmin && (
          <>
            {hasPermission('suppliers') && <NavItem to="/suppliers" icon={Truck} label={t('sidebar.suppliers')} />}
            {hasPermission('expenses') && <NavItem to="/expenses" icon={Receipt} label={t('sidebar.expenses')} />}
          </>
        )}

        {/* Reports Dropdown */}
        {(isSystemSuperAdmin || hasPermission('reports')) && (
          <div>
            <DropdownButton
              isOpen={reportsOpen}
              isActive={isReportsActive}
              onClick={() => setReportsOpen(!reportsOpen)}
              icon={BarChart3}
              label={isSystemSuperAdmin ? t('sidebar.system_analytics') : t('sidebar.reports')}
            />
            <div className={`overflow-hidden transition-all duration-200 ${reportsOpen ? 'max-h-60 mt-1' : 'max-h-0'}`}>
              <div className="space-y-1 py-1">
                {isSystemSuperAdmin ? (
                  <>
                    <SubNavItem to="/super-admin/analytics" icon={PieChart} label={t('sidebar.store_revenue')} />
                    <SubNavItem to="/admin/statistics" icon={TrendingUp} label={t('sidebar.system_stats')} />
                  </>
                ) : (
                  <>
                    <SubNavItem to="/reports" icon={PieChart} label={t('sidebar.general_reports')} />
                    <SubNavItem to="/business-reports" icon={TrendingUp} label={t('sidebar.business_reports')} />
                    <SubNavItem to="/aging-report" icon={Clock} label={t('sidebar.debt_aging')} />
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

        {/* Branches - Only for regular Admin */}
        {
          (user?.role === 'admin' && !isSystemSuperAdmin) && (
            <NavItem to="/branches" icon={Building2} label={t('sidebar.branches')} />
          )
        }

        {/* Cameras - Only for regular Admin */}
        {
          (user?.role === 'admin' && !isSystemSuperAdmin) && (
            <NavItem to="/cameras" icon={Video} label={t('sidebar.live_monitoring')} />
          )
        }

        {/* Subscriptions - Only for regular Admin */}
        {
          (user?.role === 'admin' && !isSystemSuperAdmin) && (
            <NavItem to="/subscriptions" icon={Crown} label={t('sidebar.subscriptions')} />
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
