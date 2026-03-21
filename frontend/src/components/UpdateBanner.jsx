import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Zap } from 'lucide-react';

/**
 * UpdateBanner
 *
 * Listens for the custom `app-update-available` event dispatched by main.jsx
 * when the Service Worker detects a new version. Shows a lightweight banner
 * at the bottom of the screen that lets the user choose when to reload.
 */
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setVisible(true);
    };

    window.addEventListener('app-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('app-update-available', handleUpdateAvailable);
  }, []);

  const handleUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      window.__swReloadPending = true;

      if (typeof window.__swUpdateSW === 'function') {
        await window.__swUpdateSW();
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set('__v', Date.now());
        window.location.replace(url.toString());
      }
    } catch {
      window.location.reload();
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{ background: 'radial-gradient(circle at bottom, rgba(92,103,230,0.12), transparent 55%)' }}
      />

      <div
        role="alert"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 animate-slide-up"
        style={{
          animation: 'updateBannerSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/40 bg-[color:var(--surface-elevated)] px-4 py-3.5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-primary-500/10 backdrop-blur-xl dark:border-white/10 dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(92,103,230,0.18) 0%, rgba(92,103,230,0.04) 42%, transparent 78%)',
            }}
          />

          <div className="relative flex items-center gap-3">
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/12 text-primary-500 ring-1 ring-primary-500/15 dark:bg-primary-400/12 dark:text-primary-300">
              <Zap className="h-5 w-5" />
            </div>

            <div className="relative min-w-0 flex-1" dir="rtl">
              <p className="app-text-body text-sm font-black leading-snug">
                يوجد تحديث جديد
              </p>
              <p className="app-text-muted mt-0.5 text-xs leading-relaxed">
                أعد تحميل التطبيق لضمان استمرار التشغيل بأحدث إصدار متاح.
              </p>
            </div>

            <div className="relative flex flex-shrink-0 items-center gap-2">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="تحديث الآن"
              >
                <RefreshCw className={`h-3.5 w-3.5 flex-shrink-0 ${updating ? 'animate-spin' : ''}`} />
                <span>{updating ? 'جارٍ التحديث...' : 'تحديث الآن'}</span>
              </button>

              <button
                onClick={handleDismiss}
                className="app-surface-muted app-text-soft flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-black/[0.04] hover:text-gray-700 active:scale-95 dark:hover:bg-white/[0.06] dark:hover:text-white"
                aria-label="تجاهل"
                title="لاحقًا"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes updateBannerSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
