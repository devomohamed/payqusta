import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Package,
    Wallet,
    Heart,
    Bell,
    Sun,
    Moon,
    ShoppingCart,
    LogOut,
    Store,
    MoreHorizontal,
} from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import { storefrontPath } from '../../../utils/storefrontHost';

export default function PortalHeader({
    customer,
    unreadCount,
    dark,
    toggleTheme,
    cartItemCount,
    toggleCart,
    logout,
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const accountBasePath = location.pathname.startsWith('/account') ? '/account' : '/portal';
    const storeHomePath = storefrontPath('/');
    const currency = i18n.language === 'ar' ? 'ج.م' : 'EGP';
    const moreActionsLabel = t('layout.more_actions', { defaultValue: 'More actions' });

    useEffect(() => {
        setMobileActionsOpen(false);
    }, [location.pathname]);

    const mobileActions = [
        {
            key: 'wishlist',
            label: t('layout.wishlist'),
            icon: Heart,
            onClick: () => navigate(`${accountBasePath}/wishlist`),
        },
        {
            key: 'store',
            label: t('layout.back_to_store', { defaultValue: 'Back to store' }),
            icon: Store,
            onClick: () => navigate(storeHomePath),
        },
        {
            key: 'theme',
            label: dark ? t('layout.light_mode') : t('layout.dark_mode'),
            icon: dark ? Sun : Moon,
            onClick: toggleTheme,
        },
        {
            key: 'logout',
            label: t('layout.logout'),
            icon: LogOut,
            onClick: () => {
                logout();
                navigate(`${accountBasePath}/login`);
            },
            danger: true,
        },
    ];

    return (
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-lg transition-all dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <Link to={`${accountBasePath}/dashboard`} className="group flex shrink-0 items-center gap-3" aria-label={t('layout.home')}>
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-inner transition-transform group-hover:scale-105 active:scale-95 dark:border-gray-700 dark:bg-gray-800">
                            {customer?.tenant?.branding?.logo ? (
                                <img src={customer.tenant.branding.logo} alt={customer.tenant.name} className="h-full w-full object-contain" />
                            ) : (
                                <Package className="h-full w-full text-primary-600" />
                            )}
                        </div>
                        <div className="hidden flex-col sm:flex">
                            <span className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                {customer?.tenant?.name || 'PayQusta'}
                            </span>
                            <span className="w-fit rounded bg-primary-50 px-1.5 text-[10px] font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                                PORTAL
                            </span>
                        </div>
                    </Link>

                    <div className="mx-1 hidden h-8 w-px bg-gray-200 dark:bg-gray-800 sm:block" />

                    <Link to={`${accountBasePath}/profile`} className="group flex min-w-0 items-center gap-3 select-none transition-opacity hover:opacity-80" aria-label={t('layout.home')}>
                        <div className="relative">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md dark:border-gray-800">
                                {customer?.profilePhoto ? (
                                    <img src={customer.profilePhoto} alt={customer.name} className="h-full w-full object-cover" />
                                ) : (
                                    customer?.name?.[0]
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                            <h1 className="mb-0.5 truncate text-xs font-bold leading-none text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white">
                                {customer?.name?.split(' ')[0]}
                            </h1>
                            <div className="hidden items-center gap-1 sm:flex">
                                <Wallet className="h-2.5 w-2.5 text-primary-600" />
                                <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                                    {customer?.balance?.toLocaleString() || 0} <span className="text-[8px] font-normal opacity-60">{currency}</span>
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate(`${accountBasePath}/notifications`)}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-90 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        aria-label={t('layout.notifications')}
                        title={t('layout.notifications')}
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] font-bold text-white animate-pulse dark:border-gray-900">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={toggleCart}
                        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 transition-all hover:bg-gray-100 active:scale-90 dark:text-gray-200 dark:hover:bg-gray-800"
                        aria-label={t('layout.cart')}
                        title={t('layout.cart')}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {cartItemCount > 0 && (
                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-[9px] font-bold text-white animate-pulse dark:border-gray-900">
                                {cartItemCount}
                            </span>
                        )}
                    </button>

                    <div className="hidden items-center gap-1 sm:flex">
                        <button
                            onClick={() => navigate(`${accountBasePath}/wishlist`)}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90 dark:hover:bg-red-900/20"
                            aria-label={t('layout.wishlist')}
                            title={t('layout.wishlist')}
                        >
                            <Heart className="h-5 w-5" />
                        </button>

                        <Link
                            to={storeHomePath}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-primary-50 hover:text-primary-600 active:scale-90 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                            aria-label={t('layout.back_to_store', { defaultValue: 'Back to store' })}
                            title={t('layout.back_to_store', { defaultValue: 'Back to store' })}
                        >
                            <Store className="h-5 w-5" />
                        </Link>

                        <LanguageSwitcher />

                        <button
                            onClick={toggleTheme}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-90 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            aria-label={dark ? t('layout.light_mode') : t('layout.dark_mode')}
                            title={dark ? t('layout.light_mode') : t('layout.dark_mode')}
                        >
                            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>

                        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

                        <button
                            onClick={() => {
                                logout();
                                navigate(`${accountBasePath}/login`);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90 dark:hover:bg-red-900/20"
                            aria-label={t('layout.logout')}
                            title={t('layout.logout')}
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileActionsOpen((current) => !current)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-90 dark:hover:bg-gray-800 dark:hover:text-gray-200 sm:hidden"
                        aria-label={moreActionsLabel}
                        title={moreActionsLabel}
                        aria-expanded={mobileActionsOpen}
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {mobileActionsOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10 bg-black/20 sm:hidden"
                        onClick={() => setMobileActionsOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="absolute left-4 right-4 top-full z-20 mt-2 rounded-3xl border border-gray-100 bg-white p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:hidden">
                        <div className="grid grid-cols-2 gap-2">
                            {mobileActions.map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    onClick={() => {
                                        setMobileActionsOpen(false);
                                        action.onClick();
                                    }}
                                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-right text-sm font-bold transition-colors ${
                                        action.danger
                                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <action.icon className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 truncate">{action.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 rounded-2xl border border-gray-100 p-2 dark:border-gray-800">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}
