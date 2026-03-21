import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Store,
  User,
  MessageCircle,
  CreditCard,
  Palette,
  Users,
  Globe,
} from 'lucide-react';
import { useThemeStore, useAuthStore } from '../store';
import { LoadingSpinner } from '../components/UI';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';

const SettingsStore = lazy(() => import('../components/settings/SettingsStore'));
const SettingsProfile = lazy(() => import('../components/settings/SettingsProfile'));
const SettingsWhatsApp = lazy(() => import('../components/settings/SettingsWhatsApp'));
const SettingsInstallments = lazy(() => import('../components/settings/SettingsInstallments'));
const SettingsUsers = lazy(() => import('../components/settings/SettingsUsers'));
const SettingsWhiteLabel = lazy(() => import('../components/settings/SettingsWhiteLabel'));
const SettingsSystem = lazy(() => import('../components/settings/SettingsSystem'));

const ALL_TABS = [
  { id: 'store', label: 'المتجر', icon: Store, adminOnly: true },
  { id: 'profile', label: 'حسابي', icon: User, adminOnly: false },
  { id: 'users', label: 'المستخدمون', icon: Users, adminOnly: true },
  { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, adminOnly: true, superOnly: true },
  { id: 'installments', label: 'الأقساط', icon: CreditCard, adminOnly: true },
  { id: 'whitelabel', label: 'المظهر والهوية البصرية', icon: Palette, adminOnly: true },
  { id: 'system', label: 'معلومات النظام', icon: Globe, adminOnly: false },
];

export default function SettingsPage() {
  const { dark, themeMode } = useThemeStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = ALL_TABS.filter((tab) => {
    if (tab.superOnly && !user?.isSuperAdmin) return false;
    if (tab.adminOnly && !(user?.role === 'admin' || user?.isSuperAdmin)) return false;
    return true;
  });

  const defaultTab = tabs.length > 0 ? tabs[0].id : 'profile';
  const urlTab = searchParams.get('tab');
  const activeTab = (urlTab && tabs.some((tab) => tab.id === urlTab)) ? urlTab : defaultTab;
  const currentThemeLabel = themeMode === 'system' ? 'تلقائي' : themeMode === 'dark' ? 'داكن' : 'فاتح';
  const currentThemeDescription =
    themeMode === 'system'
      ? `المنصة تتبع إعدادات الجهاز الآن على الوضع ${dark ? 'الداكن' : 'الفاتح'}.`
      : themeMode === 'dark'
        ? 'مظهر مريح للعين مع أسطح أهدأ وتباين أعلى.'
        : 'مظهر واضح ومضيء مناسب لبيئات العمل اليومية.';

  const setActiveTab = (id) => setSearchParams({ tab: id });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'store':
        return <SettingsStore />;
      case 'profile':
        return <SettingsProfile />;
      case 'users':
        return <SettingsUsers />;
      case 'whatsapp':
        return <SettingsWhatsApp />;
      case 'installments':
        return <SettingsInstallments />;
      case 'whitelabel':
        return <SettingsWhiteLabel />;
      case 'system':
        return <SettingsSystem />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="app-surface rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="app-text-muted text-xs font-black uppercase tracking-[0.18em]">التفضيلات العامة</p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">الإعدادات وتجربة العرض</h1>
            <p className="app-text-soft mt-2 text-sm leading-7">
              نظّم طريقة ظهور المنصة للمستخدمين ووحّد تجربة الدارك مود واللايت مود عبر النظام كله.
            </p>
          </div>

          <div className="app-surface-muted rounded-2xl p-4 text-right xl:max-w-sm">
            <p className="app-text-muted text-xs font-black uppercase tracking-[0.18em]">الوضع الحالي</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-gray-900 dark:text-white">{currentThemeLabel}</p>
                <p className="app-text-soft mt-1 text-sm leading-6">{currentThemeDescription}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${dark ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-primary-600'}`}>
                <Palette className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-200/70 pt-5 dark:border-white/10">
          <ThemeModeSwitcher />
        </div>
      </section>

      <div className="flex min-h-[calc(100vh-240px)] flex-col gap-6 lg:h-[calc(100vh-240px)] lg:flex-row">
        <div className="w-full flex-shrink-0 lg:w-72">
          <div className="app-surface sticky top-6 h-full overflow-hidden rounded-[1.75rem]">
            <div className="border-b border-gray-200/70 p-4 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">الإعدادات</h2>
            </div>

            <nav className="space-y-1.5 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colorClass = isActive
                  ? 'bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-200/70 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-500/20'
                  : 'app-text-soft hover:bg-gray-50 dark:hover:bg-white/5';

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all ${colorClass}`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-white text-primary-600 dark:bg-primary-500/10 dark:text-primary-300' : 'app-surface-muted app-text-muted'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-bold">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="app-surface min-w-0 flex-1 overflow-y-auto rounded-[1.75rem] p-6">
          <Suspense fallback={<LoadingSpinner text="جاري التحميل..." />}>
            {renderTabContent()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
