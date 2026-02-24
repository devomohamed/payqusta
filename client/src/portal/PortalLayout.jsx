import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { ShoppingCart, Home, Package, User, Receipt, FileText, RefreshCcw, MapPin, Award, Star, Calculator } from 'lucide-react';

import PortalHeader from './components/layout/PortalHeader';
import PortalSidebar from './components/layout/PortalSidebar';
import PortalMobileNav from './components/layout/PortalMobileNav';
import PortalCartDrawer from './components/layout/PortalCartDrawer';

export default function PortalLayout() {
  const { customer, logout, isAuthenticated, fetchDashboard, cart, isCartOpen, toggleCart, removeFromCart, unreadCount, fetchUnreadCount } = usePortalStore();
  const { dark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('portal');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/portal/login');
    } else if (!customer) {
      fetchDashboard();
    }
  }, [isAuthenticated, navigate]);

  // Poll unread notifications count
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Dynamic Branding Injection
  useEffect(() => {
    if (customer?.tenant?.branding || usePortalStore.getState().tenant?.branding) {
      const branding = customer.tenant?.branding || usePortalStore.getState().tenant?.branding || {};
      const primary = branding.primaryColor || '#6366f1';
      const secondary = branding.secondaryColor || '#10b981';
      const root = document.documentElement;
      root.style.setProperty('--color-primary', primary);
      root.style.setProperty('--color-secondary', secondary);
    }
  }, [customer, usePortalStore.getState().tenant]);

  if (!isAuthenticated || !customer) return null;

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/portal/dashboard' },
    { icon: Package, label: t('nav.orders'), path: '/portal/orders' },
    { icon: Receipt, label: t('nav.invoices'), path: '/portal/invoices' },
    { icon: RefreshCcw, label: t('nav.returns'), path: '/portal/returns' },
    { icon: Award, label: t('nav.points'), path: '/portal/points' },
    { icon: Star, label: t('nav.reviews'), path: '/portal/reviews' },
    { icon: Calculator, label: t('nav.calculator'), path: '/portal/calculator' },
    { icon: FileText, label: t('nav.documents'), path: '/portal/documents' },
    { icon: MapPin, label: t('nav.addresses'), path: '/portal/addresses' },
    { icon: ShoppingCart, label: t('nav.cart'), path: '/portal/cart', badge: cart.length, isCart: true },
    { icon: User, label: t('nav.profile'), path: '/portal/profile' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`min-h-screen flex flex-col font-['Cairo'] pb-16 md:pb-0 ${dark ? 'dark' : ''}`} dir={i18n.dir()}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">

        {/* TOP HEADER */}
        <PortalHeader
          customer={customer}
          unreadCount={unreadCount}
          dark={dark}
          toggleTheme={toggleTheme}
          cartItemCount={cart.length}
          toggleCart={toggleCart}
          logout={logout}
        />

        {/* MAIN CONTENT */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex">

          {/* Desktop Sidebar Navigation */}
          <PortalSidebar navItems={navItems} isActive={isActive} />

          {/* Page Content */}
          <main className="flex-1 p-4 w-full min-w-0">
            <Outlet />
          </main>
        </div>

        {/* MOBILE NAV */}
        <PortalMobileNav navItems={navItems} isActive={isActive} toggleCart={toggleCart} />

        {/* CART DRAWER */}
        <PortalCartDrawer
          isCartOpen={isCartOpen}
          toggleCart={toggleCart}
          cart={cart}
          cartTotal={cartTotal}
          removeFromCart={removeFromCart}
        />
      </div>
    </div>
  );
}
