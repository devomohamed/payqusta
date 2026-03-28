import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CreditCard,
  Globe,
  MessageCircle,
  Palette,
  Store,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { LoadingSpinner } from '../components/UI';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';

const SettingsStore = lazy(() => import('../components/settings/SettingsStore'));
const SettingsProfile = lazy(() => import('../components/settings/SettingsProfile'));
const SettingsWhatsApp = lazy(() => import('../components/settings/SettingsWhatsApp'));
const SettingsInstallments = lazy(() => import('../components/settings/SettingsInstallments'));
const SettingsUsers = lazy(() => import('../components/settings/SettingsUsers'));
const SettingsWhiteLabel = lazy(() => import('../components/settings/SettingsWhiteLabel'));
const SettingsNotificationChannels = lazy(() => import('../components/settings/SettingsNotificationChannels'));
const SettingsShipping = lazy(() => import('../components/settings/SettingsShipping'));
const SettingsSystem = lazy(() => import('../components/settings/SettingsSystem'));

const ALL_TABS = [
  { id: 'profile', label: 'حسابي', description: 'المعلومات الشخصية والأمان', icon: User, adminOnly: false },
  { id: 'store', label: 'المتجر', description: 'إعدادات المنشأة', icon: Store, adminOnly: true },
  { id: 'users', label: 'المستخدمون', description: 'صلاحيات ومدراء النظام', icon: Users, adminOnly: true },
  { id: 'installments', label: 'الأقساط', description: 'سياسات الدفع والتقسيط', icon: CreditCard, adminOnly: true },
  { id: 'whitelabel', label: 'الهوية البصرية', description: 'تخصيص ألوان وشعار المنصة', icon: Palette, adminOnly: true },
  { id: 'whatsapp', label: 'واتساب', description: 'ربط وإعداد رسائل واتساب', icon: MessageCircle, adminOnly: true, superOnly: true },
  { id: 'notifications', label: 'الإشعارات', description: 'قنوات التنبيه والرسائل', icon: BellRing, adminOnly: true },
  { id: 'shipping', label: 'الشحن', description: 'Branch X وتسعير التوصيل', icon: Truck, adminOnly: true },
  { id: 'system', label: 'حالة النظام', description: 'تحديثات ومعلومات النظام', icon: Globe, adminOnly: false },
];

export default function SettingsPage() {
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

  const setActiveTab = (id) => setSearchParams({ tab: id });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return <SettingsProfile />;
      case 'store': return <SettingsStore />;
      case 'users': return <SettingsUsers />;
      case 'installments': return <SettingsInstallments />;
      case 'whitelabel': return <SettingsWhiteLabel />;
      case 'whatsapp': return <SettingsWhatsApp />;
      case 'notifications': return <SettingsNotificationChannels />;
      case 'shipping': return <SettingsShipping />;
      case 'system': return <SettingsSystem />;
      default: return null;
    }
  };

  const currentTabInfo = tabs.find((t) => t.id === activeTab);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 sm:space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">الإعدادات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            إدارة تفضيلات حسابك، إعدادات النظام، والتحكم في تجربة الاستخدام بشكل كامل.
          </p>
        </div>

        <div className="flex w-fit items-center gap-3 rounded-2xl border border-gray-100 p-2 pr-4 shadow-sm app-surface dark:border-white/5">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-gray-900 dark:text-white">مظهر النظام</p>
          </div>
          <div className="mx-1 hidden h-6 w-[1px] bg-gray-200 dark:bg-gray-700 sm:block" />
          <ThemeModeSwitcher compact />
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-220px)] flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full flex-shrink-0 lg:sticky lg:top-6 lg:w-72">
          <nav className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-3 lg:flex-col lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex min-w-[220px] snap-start items-center justify-between gap-3 rounded-2xl p-3 text-right transition-all duration-200 lg:min-w-0 ${
                    isActive
                      ? 'bg-primary-50 shadow-sm ring-1 ring-primary-200/50 dark:bg-primary-500/10 dark:ring-primary-500/20'
                      : 'hover:bg-gray-50 active:scale-[0.98] dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-primary-500/20 dark:text-primary-400'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-white dark:bg-gray-800/50 dark:text-gray-400 dark:group-hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className={`font-bold transition-colors ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white'}`}>
                        {tab.label}
                      </p>
                      <p className={`mt-0.5 hidden text-xs sm:block ${isActive ? 'text-primary-600/70 dark:text-primary-400/70' : 'text-gray-500 dark:text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <div className="absolute right-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-l-full bg-primary-500 dark:bg-primary-400 lg:block" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm backdrop-blur-xl app-surface dark:border-white/5 dark:bg-gray-900/50">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5 dark:border-white/5 dark:bg-white/[0.02] sm:px-8 sm:py-6">
              <div className="flex items-center gap-3">
                {currentTabInfo && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <currentTabInfo.icon className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {currentTabInfo?.label}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {currentTabInfo?.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 sm:p-8">
              <Suspense
                fallback={(
                  <div className="flex h-40 items-center justify-center">
                    <LoadingSpinner text="جاري التحميل..." />
                  </div>
                )}
              >
                {renderTabContent()}
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
