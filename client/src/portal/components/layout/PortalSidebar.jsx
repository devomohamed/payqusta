import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PortalSidebar({ navItems = [], isActive }) {
    const navigate = useNavigate();
    const { t } = useTranslation('portal');

    return (
        <aside className="hidden md:block w-64 p-4 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">
                    {t('layout.main_menu')}
                </h3>
                {navItems.map((item) => {
                    if (item.isCart) return null;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${active
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-xl transition-colors ${active
                                        ? 'bg-primary-100 dark:bg-primary-900/30'
                                        : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 ${active ? 'fill-current/20' : ''}`} />
                                </div>
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
