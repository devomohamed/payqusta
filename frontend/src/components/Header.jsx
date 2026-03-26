import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Sun, Moon, Search, Monitor, Zap } from 'lucide-react';
import { useThemeStore, useAuthStore } from '../store';
import NotificationDropdown from './NotificationDropdown';
import GlobalSearch from './GlobalSearch';
import BranchSwitcher from './BranchSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import ShiftStatusWidget from './ShiftStatusWidget';

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, themeMode, toggleTheme } = useThemeStore();
  const { tenant, user } = useAuthStore();
  const { t } = useTranslation('admin');
  const [searchOpen, setSearchOpen] = useState(false);
  const isSystemSuperAdmin =
    !!user?.isSuperAdmin || user?.email?.toLowerCase() === 'super@payqusta.com';
  const ThemeIcon = themeMode === 'system' ? Monitor : dark ? Sun : Moon;
  const themeLabel = themeMode === 'system'
    ? t('header.theme.system')
    : dark
      ? t('header.theme.to_light')
      : t('header.theme.to_dark');

  const pageTitles = {
    '/': t('header.dashboard'),
    '/products': t('header.products'),
    '/customers': t('header.customers'),
    '/invoices': t('header.invoices'),
    '/suppliers': t('header.suppliers'),
    '/settings': t('header.settings'),
    '/super-admin/plans': t('header.plan_management'),
    '/tenant-management': t('header.store_management'),
  };

  const title = pageTitles[location.pathname] || t('header.dashboard');

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="app-surface-glass safe-area-top sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4 md:flex-nowrap md:gap-3 md:px-6">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <button
            onClick={onMenuClick}
            className="app-text-soft rounded-xl p-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05] md:hidden"
            aria-label={t('header.open_navigation')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-col overflow-hidden md:flex-row md:items-center md:gap-3">
            <h2 className="app-text-strong truncate text-base font-extrabold sm:text-lg md:text-xl">{title}</h2>
            <div className="mx-1 hidden h-6 w-px bg-[color:var(--surface-border)] md:block" />
            <div className="flex items-center gap-1.5 truncate text-[11px] font-bold sm:text-sm">
              {user?.branch?.name ? (
                <span className="whitespace-nowrap text-primary-600 dark:text-primary-300">
                  {user.branch.name}
                </span>
              ) : (
                <span className="whitespace-nowrap text-primary-600 dark:text-primary-300">
                  {tenant?.name}
                </span>
              )}
              {isSystemSuperAdmin && (
                <span className="mx-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                  {t('header.super_badge')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="order-2 flex w-full items-center justify-between gap-1 overflow-x-auto no-scrollbar sm:gap-1.5 md:w-auto md:flex-shrink-0 md:justify-end md:overflow-visible">
          <button
            onClick={() => navigate('/quick-sale')}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15 sm:text-sm"
            title={t('header.quick_sale')}
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.quick_sale')}</span>
          </button>

          <ShiftStatusWidget />

          <BranchSwitcher />

          <button
            onClick={() => setSearchOpen(true)}
            className="app-surface-muted app-text-soft hidden items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05] md:flex"
            title={t('header.search_quick')}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">{t('header.search_placeholder')}</span>
            <kbd className="app-surface app-text-muted hidden rounded border border-[color:var(--surface-border)] px-2 py-0.5 text-xs lg:inline-block">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="app-text-soft rounded-xl p-2.5 transition-all active:scale-95 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] md:hidden"
            title={t('header.search_quick_mobile')}
            aria-label={t('header.search_quick_mobile')}
          >
            <Search className="h-5 w-5" />
          </button>

          <NotificationDropdown mode="admin" />

          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="app-text-soft rounded-xl p-2.5 transition-all active:scale-95 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            aria-label={themeLabel}
            title={themeLabel}
            aria-pressed={dark}
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
