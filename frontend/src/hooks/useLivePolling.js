import { useEffect, useRef } from 'react';

export function useLivePolling(callback, {
  enabled = true,
  intervalMs = 5000,
  runImmediately = true,
} = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let intervalId;
    let stopped = false;

    const tick = async () => {
      if (stopped || document.hidden || !navigator.onLine) return;
      await callbackRef.current?.();
    };

    if (runImmediately) {
      tick();
    }

    intervalId = window.setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        tick();
      }
    };

    const handleFocus = () => {
      tick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, intervalMs, runImmediately]);
}
