import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function PortalSidebar({ navItems = [], isActive }) {
    const navigate = useNavigate();
    const { t } = useTranslation('portal');

    return (
        <aside className="hidden md:block w-64 p-4 shrink-0">
            <div className="app-surface sticky top-24 space-y-2 rounded-3xl p-4">
                <h3 className="app-text-muted mb-4 px-2 text-xs font-black uppercase tracking-wider">
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
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 font-bold ring-1 ring-primary-200/70 dark:ring-primary-500/20'
                                : 'app-text-soft hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white font-medium'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-xl transition-colors ${active
                                        ? 'bg-primary-100 dark:bg-primary-900/30'
                                        : 'app-surface-muted group-hover:bg-white dark:group-hover:bg-gray-700'
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
