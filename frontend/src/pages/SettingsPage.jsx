import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Store,
  User,
  MessageCircle,
  CreditCard,
  Palette,
  Users,
  Globe,
  BellRing
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
const SettingsSystem = lazy(() => import('../components/settings/SettingsSystem'));

function getAllTabs(t) {
  return [
    { id: 'profile', label: t('settings_page.ui.koydl43'), description: t('settings_page.ui.kph005m'), icon: User, adminOnly: false },
    { id: 'store', label: t('settings_page.ui.kaaxfw9'), description: t('settings_page.ui.k9mdtni'), icon: Store, adminOnly: true },
    { id: 'users', label: t('settings_page.ui.kdirwj'), description: t('settings_page.ui.k6y3nn8'), icon: Users, adminOnly: true },
    { id: 'installments', label: t('settings_page.ui.kz8i2sn'), description: t('settings_page.ui.k6bx67n'), icon: CreditCard, adminOnly: true },
    { id: 'whitelabel', label: t('settings_page.ui.kivmqxp'), description: t('settings_page.ui.kubf45j'), icon: Palette, adminOnly: true },
    { id: 'whatsapp', label: t('settings_page.ui.k4v4zt5'), description: t('settings_page.ui.kjenzmz'), icon: MessageCircle, adminOnly: true, superOnly: true },
    { id: 'notifications', label: t('settings_page.ui.k31c17e'), description: t('settings_page.ui.k2lxm7p'), icon: BellRing, adminOnly: true },
    { id: 'system', label: t('settings_page.ui.kbftok2'), description: t('settings_page.ui.kiy4csr'), icon: Globe, adminOnly: false },
  ];
}

export default function SettingsPage() {
  const { t } = useTranslation('admin');
  const allTabs = getAllTabs(t);
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs = allTabs.filter((tab) => {
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
      case 'system': return <SettingsSystem />;
      default: return null;
    }
  };

  const currentTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t('settings_page.ui.k5925rd')}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            {t('settings_page.ui.k18leer')}
          </p>
        </div>
        
        {/* Theme Widget */}
        <div className="flex items-center gap-3 app-surface rounded-2xl p-2 pr-4 shadow-sm border border-gray-100 dark:border-white/5 w-fit">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-gray-900 dark:text-white">{t('settings_page.ui.k99evk')}</p>
          </div>
          <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block mx-1"></div>
          <ThemeModeSwitcher compact={true} />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 lg:min-h-[calc(100vh-220px)]">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-6">
          <nav className="flex overflow-x-auto lg:flex-col gap-2 pb-3 lg:pb-0 no-scrollbar snap-x">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex min-w-[220px] lg:min-w-0 items-center justify-between gap-3 rounded-2xl p-3 text-right transition-all duration-200 snap-start
                    ${isActive 
                      ? 'bg-primary-50 dark:bg-primary-500/10 shadow-sm ring-1 ring-primary-200/50 dark:ring-primary-500/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98]'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span 
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors
                        ${isActive 
                          ? 'bg-white text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 shadow-sm' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700/50'
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className={`font-bold transition-colors ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                        {tab.label}
                      </p>
                      <p className={`text-xs mt-0.5 hidden sm:block ${isActive ? 'text-primary-600/70 dark:text-primary-400/70' : 'text-gray-500 dark:text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-l-full dark:bg-primary-400 hidden lg:block"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <div className="app-surface rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden flex-1 flex flex-col bg-white dark:bg-gray-900/50 backdrop-blur-xl">
            {/* Context Header */}
            <div className="border-b border-gray-100 dark:border-white/5 px-6 py-5 sm:px-8 sm:py-6 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {currentTabInfo && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <currentTabInfo.icon className="w-5 h-5" />
                  </span>
                )}
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {currentTabInfo?.label}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {currentTabInfo?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Rendered View */}
            <div className="p-6 sm:p-8 flex-1">
              <Suspense 
                fallback={
                  <div className="flex h-40 items-center justify-center">
                    <LoadingSpinner text="جاري التحميل..." />
                  </div>
                }
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
