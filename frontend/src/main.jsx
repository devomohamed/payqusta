import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import './i18n';
import syncService from './services/SyncService';
import AnimatedBrandLogo from './components/AnimatedBrandLogo';
import { isStorefrontSubdomainHost } from './utils/storefrontHost';

const BUILD_STORAGE_KEY = 'payqusta_build_id';
const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : 'dev';

async function forceReloadOnNewDeployment() {
  const previousBuildId = localStorage.getItem(BUILD_STORAGE_KEY);
  localStorage.setItem(BUILD_STORAGE_KEY, CURRENT_BUILD_ID);

  if (!previousBuildId || previousBuildId === CURRENT_BUILD_ID) return;

  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => null)));
    }
  } catch (error) {
    console.warn('[Deploy Refresh] Failed to clear caches before hard refresh', error);
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('__build', CURRENT_BUILD_ID);
  window.location.replace(nextUrl.toString());
}

// Initialize Sync Service only for authenticated backoffice users.
// Portal customers use a different auth token and should not hit /api/v1/products via sync.
const hasBackofficeToken = !!localStorage.getItem('payqusta_token');
const isPortalPath = window.location.pathname.startsWith('/portal');
const isStorefrontPath = window.location.pathname.startsWith('/store') || isStorefrontSubdomainHost();
const isQuickSalePath = window.location.pathname === '/quick-sale';
const shouldRegisterPwa = import.meta.env.PROD && window.isSecureContext && (
  isPortalPath || isStorefrontPath || isQuickSalePath
);

// Suppress known "findDOMNode is deprecated" warnings from internal libraries
// to prevent forced reflow log flooding in React 18 StrictMode.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) return;
  originalConsoleError(...args);
};

if (hasBackofficeToken && !isPortalPath && !isStorefrontPath) {
  syncService.init().then(() => {
    console.log('Sync Service initialized');
  }).catch((error) => {
    console.error('Failed to initialize Sync Service:', error);
  });
}

void forceReloadOnNewDeployment();

// Keep the PWA service worker away from regular backoffice pages.
// This avoids stale admin caches and false offline states after deployments.
if (shouldRegisterPwa) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[SW] New version available, applying update');
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[SW] App ready to work offline');
    },
    onRegistered(swRegistration) {
      if (!swRegistration) return;

      const checkForUpdates = () => swRegistration.update().catch(() => null);
      checkForUpdates();
      setInterval(checkForUpdates, 60 * 1000);

      window.addEventListener('focus', checkForUpdates);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdates();
      });
    },
    onRegisterError(error) {
      console.error('[SW] Registration failed', error);
    },
  });

  // When a new SW takes control (skipWaiting triggered), reload once.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
} else if ('serviceWorker' in navigator) {
  // Prevent stale SW from hijacking requests on non-PWA screens.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><AnimatedBrandLogo size="lg" /></div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);
