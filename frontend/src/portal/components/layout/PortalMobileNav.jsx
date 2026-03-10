import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';

export default function PortalMobileNav({ navItems = [], isActive, toggleCart }) {
    const navigate = useNavigate();
    const { t } = useTranslation('portal');
    const [showMore, setShowMore] = useState(false);

    const preferredSections = ['dashboard', 'orders', 'invoices', 'profile'];
    const primaryItems = preferredSections
        .map((section) => navItems.find((item) => item.path.endsWith(`/${section}`)))
        .filter(Boolean);
    const secondaryItems = navItems.filter(item => !primaryItems.includes(item));

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 md:hidden z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center px-1 py-1">
                    {primaryItems.map((item) => {
                        const active = isActive(item.path) && !item.isCart;
                        return (
                            <button
                                key={item.path}
                                onClick={() => {
                                    setShowMore(false);
                                    item.isCart ? toggleCart() : navigate(item.path);
                                }}
                                className={`flex flex-col items-center justify-center py-2 px-1 flex-1 rounded-2xl transition-all active:scale-95 ${active
                                    ? 'text-primary-600 dark:text-primary-400 font-bold'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                    }`}
                                aria-label={item.label}
                            >
                                <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                    <item.icon className={`w-6 h-6 ${active ? 'fill-current/20' : ''}`} strokeWidth={active ? 2.5 : 2} />
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[10px] mt-0.5 truncate w-full text-center ${active ? 'opacity-100' : 'opacity-80'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* More Button */}
                    {secondaryItems.length > 0 && (
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`flex flex-col items-center justify-center py-2 px-1 flex-1 rounded-2xl transition-all active:scale-95 ${showMore
                                ? 'text-primary-600 dark:text-primary-400 font-bold'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                            aria-label={t('layout.more')}
                            aria-expanded={showMore}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all ${showMore ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                <MoreHorizontal className="w-6 h-6" strokeWidth={showMore ? 2.5 : 2} />
                                {secondaryItems.some(i => i.badge > 0) && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                                )}
                            </div>
                            <span className={`text-[10px] mt-0.5 truncate w-full text-center ${showMore ? 'opacity-100' : 'opacity-80'}`}>
                                {t('layout.more')}
                            </span>
                        </button>
                    )}
                </div>
            </nav>

            {/* More Menu Drawer */}
            {showMore && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden animate-fade-in" onClick={() => setShowMore(false)} aria-hidden="true" />
                    <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 md:hidden p-4 animate-slide-up transform transition-transform">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
                        <div className="grid grid-cols-4 gap-4">
                            {secondaryItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        setShowMore(false);
                                        item.isCart ? toggleCart() : navigate(item.path);
                                    }}
                                    className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="relative w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                                        <item.icon className="w-5 h-5" />
                                        {item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 text-center">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
