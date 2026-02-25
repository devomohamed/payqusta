import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Wallet, Heart, Bell, Sun, Moon, ShoppingCart, LogOut } from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher';

export default function PortalHeader({
    customer,
    unreadCount,
    dark,
    toggleTheme,
    cartItemCount,
    toggleCart,
    logout
}) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');

    const currency = i18n.language === 'ar' ? 'ج.م' : 'EGP';

    return (
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 transition-all">
            <div className="flex items-center gap-4">
                {/* Brand Logo & Name */}
                <Link to="/portal/dashboard" className="flex items-center gap-3 group" aria-label={t('layout.home')}>
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-inner flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 p-1.5 transition-transform group-hover:scale-105 active:scale-95">
                        {customer?.tenant?.branding?.logo ? (
                            <img src={customer.tenant.branding.logo} alt={customer.tenant.name} className="w-full h-full object-contain" />
                        ) : (
                            <Package className="w-full h-full text-primary-600" />
                        )}
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-white leading-tight uppercase tracking-wide">
                            {customer?.tenant?.name || 'PayQusta'}
                        </span>
                        <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 rounded w-fit">
                            PORTAL
                        </span>
                    </div>
                </Link>

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

                {/* User Info & Balance */}
                <Link to="/portal/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity select-none group" aria-label={t('layout.home')}>
                    <div className="relative">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-gray-800 overflow-hidden">
                            {customer?.profilePhoto ? (
                                <img src={customer.profilePhoto} alt={customer.name} className="w-full h-full object-cover" />
                            ) : (
                                customer?.name?.[0]
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1 group-hover:text-primary-600 transition-colors">
                            {customer?.name?.split(' ')[0]}
                        </h1>
                        <div className="flex items-center gap-1">
                            <Wallet className="w-2.5 h-2.5 text-primary-600" />
                            <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                                {customer?.balance?.toLocaleString() || 0} <span className="text-[8px] font-normal opacity-60">{currency}</span>
                            </span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                {/* Wishlist */}
                <button
                    onClick={() => navigate('/portal/wishlist')}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
                    aria-label={t('layout.wishlist')}
                    title={t('layout.wishlist')}
                >
                    <Heart className="w-5 h-5" />
                </button>

                {/* Notifications Bell */}
                <button
                    onClick={() => navigate('/portal/notifications')}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
                    aria-label={t('layout.notifications')}
                    title={t('layout.notifications')}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Language Switcher */}
                <LanguageSwitcher />

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
                    aria-label={dark ? t('layout.light_mode') : t('layout.dark_mode')}
                    title={dark ? t('layout.light_mode') : t('layout.dark_mode')}
                >
                    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Cart */}
                <button
                    onClick={toggleCart}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
                    aria-label={t('layout.cart')}
                    title={t('layout.cart')}
                >
                    <ShoppingCart className="w-5 h-5" />
                    {cartItemCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                            {cartItemCount}
                        </span>
                    )}
                </button>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                <button
                    onClick={() => { logout(); navigate('/portal/login'); }}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90"
                    aria-label={t('layout.logout')}
                    title={t('layout.logout')}
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
