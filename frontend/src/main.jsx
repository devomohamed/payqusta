import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import './i18n';
import syncService from './services/SyncService';
import AnimatedBrandLogo from './components/AnimatedBrandLogo';
import { isStorefrontSubdomainHost } from './utils/storefrontHost';
import { APP_VERSION } from './config/version';

console.log(`[PayQusta] Version: ${APP_VERSION}`);

// Handle Vite dynamic import failures (e.g. after a deployment when old chunks are missing)
window.addEventListener('vite:preloadError', async (event) => {
  console.warn('[Vite] Preload error detected. A new deployment is likely available. Clearing caches and reloading...', event);
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (err) {
    console.error('[Vite] Failed to clear caches on preload error', err);
  }
  // Force reload to fetch the new index.html from network
  window.location.reload();
});

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
      console.log('[SW] New version available, notifying user');
      // Store the update function for UpdateBanner to call when the user is ready
      window.__swUpdateSW = () => updateSW(true);
      // Dispatch a custom event that UpdateBanner listens for
      window.dispatchEvent(new CustomEvent('app-update-available'));
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

  // Reload is now triggered by UpdateBanner after explicit user confirmation.
  // We still listen to controllerchange but only reload if the banner
  // initiated the update (indicated by window.__swReloadPending).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window.__swReloadPending) {
      window.__swReloadPending = false;
      window.location.reload();
    }
  });
} else if ('serviceWorker' in navigator) {
  // Prevent stale SW from hijacking requests on non-PWA screens.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div className="app-shell-bg flex h-screen w-screen items-center justify-center"><AnimatedBrandLogo size="lg" /></div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);
