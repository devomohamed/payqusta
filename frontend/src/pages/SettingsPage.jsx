import React, { useState, Suspense, lazy } from 'react';
import {
  Store, User, MessageCircle, Tag, CreditCard, Palette, Users, Globe
} from 'lucide-react';
import { useThemeStore, useAuthStore } from '../store';
import { LoadingSpinner } from '../components/UI';

// Lazy load all settings components to improve performance
const SettingsStore = lazy(() => import('../components/settings/SettingsStore'));
const SettingsProfile = lazy(() => import('../components/settings/SettingsProfile'));
const SettingsWhatsApp = lazy(() => import('../components/settings/SettingsWhatsApp'));
const SettingsInstallments = lazy(() => import('../components/settings/SettingsInstallments'));
const SettingsUsers = lazy(() => import('../components/settings/SettingsUsers'));
const SettingsWhiteLabel = lazy(() => import('../components/settings/SettingsWhiteLabel'));

// Settings tabs configuration
const ALL_TABS = [
  { id: 'store', label: 'المتجر', icon: Store, color: 'primary', adminOnly: true }, // Only for admin
  { id: 'profile', label: 'حسابي', icon: User, color: 'emerald', adminOnly: false },
  { id: 'users', label: 'المستخدمين', icon: Users, color: 'blue', adminOnly: true }, // Only for admin
  { id: 'whatsapp', superOnly: true, label: 'واتساب', icon: MessageCircle, color: 'green', adminOnly: true }, // Changed to adminOnly
  { id: 'installments', label: 'الأقساط', icon: CreditCard, color: 'blue', adminOnly: true },
  { id: 'whitelabel', label: 'المظهر والهوية البصرية', icon: Palette, color: 'violet', adminOnly: true },
];

export default function SettingsPage() {
  const { dark, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store');

  // Filter tabs based on user role
  const TABS = ALL_TABS.filter((tab) => {
    if (tab.superOnly && !user?.isSuperAdmin) return false;
    if (tab.adminOnly && !(user?.role === 'admin' || user?.isSuperAdmin)) return false;
    return true;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'store': return <SettingsStore />;
      case 'profile': return <SettingsProfile />;
      case 'users': return <SettingsUsers />;
      case 'whatsapp': return <SettingsWhatsApp />;
      case 'installments': return <SettingsInstallments />;
      case 'whitelabel': return <SettingsWhiteLabel />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
      {/* Sidebar Navigation for Settings */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-lg">الإعدادات</h2>
          </div>
          <nav className="p-2 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              // Hardcoded colors for now to match original styles roughly
              const colorClass = isActive
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800';

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${colorClass}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-y-auto">
        <Suspense fallback={<LoadingSpinner text="جاري التحميل..." />}>
          {renderTabContent()}
        </Suspense>
      </div>
    </div>
  );
}


