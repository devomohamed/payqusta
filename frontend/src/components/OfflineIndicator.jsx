import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineSync } from '../utils/offlineSync';
import { notify } from './AnimatedNotification';

export default function OfflineIndicator() {
  const { t } = useTranslation('admin');
  const { isOnline, wasOffline } = useOnlineStatus();
  const [syncing, setSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  React.useEffect(() => {
    loadPendingCount();
  }, []);

  React.useEffect(() => {
    if (isOnline && wasOffline) {
      notify.success(t('offline_indicator.toasts.online'));
      handleSync();
    } else if (!isOnline) {
      notify.warning(t('offline_indicator.toasts.offline'));
    }
  }, [isOnline, t, wasOffline]);

  const loadPendingCount = async () => {
    try {
      const pending = await offlineSync.getPendingInvoices();
      setPendingCount(pending.length);
    } catch (err) {}
  };

  const handleSync = async () => {
    if (!isOnline) {
      notify.error(t('offline_indicator.toasts.sync_requires_online'));
      return;
    }

    setSyncing(true);
    try {
      const results = await offlineSync.syncPendingData();
      const successful = results.filter(r => r.success).length;
      
      if (successful > 0) {
        notify.success(t('offline_indicator.toasts.sync_success', { count: successful }));
        loadPendingCount();
      }
    } catch (err) {
      notify.error(t('offline_indicator.toasts.sync_failed'));
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${
        isOnline 
          ? 'bg-green-500/90 text-white' 
          : 'bg-orange-500/90 text-white'
      }`}>
        {isOnline ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        
        <div className="text-sm font-medium">
          {isOnline ? t('offline_indicator.status.online') : t('offline_indicator.status.offline')}
          {pendingCount > 0 && (
            <span className="mr-2">({t('offline_indicator.status.pending', { count: pendingCount })})</span>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
