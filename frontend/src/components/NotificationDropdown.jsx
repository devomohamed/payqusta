import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, CheckCheck, Clock, AlertTriangle, CreditCard,
  FileText, Package, Truck, UserPlus, Star, X, Trash2, ShoppingBag,
  Store, CheckCircle, AlertCircle,
} from 'lucide-react';
import { api, API_URL } from '../store';
import { usePortalStore, portalApi } from '../store/portalStore';
import { resolvePortalNotificationLink } from '../portal/utils/notificationLinks';

const iconMap = {
  clock: Clock,
  'alert-triangle': AlertTriangle,
  'credit-card': CreditCard,
  'file-text': FileText,
  'package-x': Package,
  'package-plus': Package,
  truck: Truck,
  'user-plus': UserPlus,
  star: Star,
  store: Store,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  bell: Bell,
  'shopping-bag': ShoppingBag,
};

const colorMap = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-500/10', text: 'text-primary-500', ring: 'ring-primary-500/20' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/20' },
  info: { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-500', ring: 'ring-sky-500/20' },
  danger: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', ring: 'ring-gray-500/20' },
};

export default function NotificationDropdown({ mode = 'admin' }) {
  const isPortalMode = mode === 'portal';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(isPortalMode ? 'portal' : 'admin');
  const portalBasePath = location.pathname.startsWith('/account') ? '/account' : '/portal';

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const getToken = useCallback(() => {
    if (isPortalMode) {
      return localStorage.getItem('portal_token') || usePortalStore.getState().token;
    }
    return localStorage.getItem('payqusta_token');
  }, [isPortalMode]);

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const client = isPortalMode ? portalApi : api;
      const endpoint = isPortalMode ? '/portal/notifications/unread-count' : '/notifications/unread-count';
      const { data } = await client.get(endpoint);
      const nextCount = data.data?.count || 0;
      setUnreadCount(nextCount);
      if (isPortalMode) {
        usePortalStore.setState({ unreadCount: nextCount });
      }
    } catch (e) { }
  }, [getToken, isPortalMode]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const client = isPortalMode ? portalApi : api;
      const endpoint = isPortalMode ? '/portal/notifications' : '/notifications';
      const { data } = await client.get(endpoint, {
        params: isPortalMode ? { page: 1, limit: 20 } : { limit: 20 },
      });

      if (isPortalMode) {
        const payload = data.data || {};
        setNotifications(payload.notifications || []);
        const nextCount = payload.unreadCount || 0;
        setUnreadCount(nextCount);
        usePortalStore.setState({ unreadCount: nextCount });
      } else {
        setNotifications(data.data || []);
      }
    } catch (e) { }
    setLoading(false);
  }, [getToken, isPortalMode]);

  // SSE real-time connection with auto-reconnect
  useEffect(() => {
    if (isPortalMode) return;
    const token = getToken();
    if (!token) return;

    let eventSource;
    let retryTimeout;
    let retryCount = 0;

    const connect = () => {
      if (document.hidden) return;

      try {
        eventSource = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

        eventSource.onopen = () => {
          retryCount = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            if (notification.type === 'connected') return;

            setNotifications((prev) => [notification, ...prev].slice(0, 30));
            setUnreadCount((prev) => prev + 1);

            if (window.Notification && window.Notification.permission === 'granted') {
              new window.Notification(notification.title, { body: notification.message, icon: '/favicon.svg' });
            }
          } catch (e) { }
        };

        eventSource.onerror = () => {
          eventSource.close();
          const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        };
      } catch (e) { }
    };

    if (!document.hidden) connect();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        eventSource?.close();
        clearTimeout(retryTimeout);
      } else {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(retryTimeout);
      eventSource?.close();
    };
  }, [getToken, isPortalMode]);

  // Poll unread count periodically (every 60s), only if visible
  useEffect(() => {
    let interval;

    const startPolling = () => {
      fetchUnreadCount();
      interval = setInterval(fetchUnreadCount, 60000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    if (!document.hidden) startPolling();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      const client = isPortalMode ? portalApi : api;
      const endpoint = isPortalMode ? `/portal/notifications/${id}/read` : `/notifications/${id}/read`;
      if (isPortalMode) {
        await client.put(endpoint);
      } else {
        await client.patch(endpoint);
      }
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => {
        const nextCount = Math.max(0, prev - 1);
        if (isPortalMode) {
          usePortalStore.setState({ unreadCount: nextCount });
        }
        return nextCount;
      });
    } catch (e) { }
  };

  const markAllRead = async () => {
    try {
      const client = isPortalMode ? portalApi : api;
      const endpoint = isPortalMode ? '/portal/notifications/read-all' : '/notifications/read-all';
      if (isPortalMode) {
        await client.put(endpoint);
      } else {
        await client.patch(endpoint);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (isPortalMode) {
        usePortalStore.setState({ unreadCount: 0 });
      }
    } catch (e) { }
  };

  const deleteNotification = async (id) => {
    if (isPortalMode) return;
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (e) { }
  };

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.link) {
      let navLink = notification.link;
      if (isPortalMode) {
        navLink = resolvePortalNotificationLink(navLink, portalBasePath);
        if (!navLink) return;
        if (/^https?:\/\//i.test(navLink)) {
          window.location.assign(navLink);
          setOpen(false);
          return;
        }
      } else if (navLink === '/admin/subscriptions') {
        navLink = '/super-admin/requests';
      }
      navigate(navLink);
      setOpen(false);
    }
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return isPortalMode ? t('notifications.time_now') : t('notifications.just_now');
    if (diff < 3600) return isPortalMode ? t('notifications.time_minutes', { count: Math.floor(diff / 60) }) : t('notifications.minutes_ago', { count: Math.floor(diff / 60) });
    if (diff < 86400) return isPortalMode ? t('notifications.time_hours', { count: Math.floor(diff / 3600) }) : t('notifications.hours_ago', { count: Math.floor(diff / 3600) });
    if (diff < 604800) return isPortalMode ? t('notifications.time_days', { count: Math.floor(diff / 86400) }) : t('notifications.days_ago', { count: Math.floor(diff / 86400) });
    return d.toLocaleDateString(locale);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-gray-500 transition-all active:scale-95"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary-500' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white px-1 animate-pulse-soft shadow-lg shadow-red-500/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`fixed inset-x-4 top-[4.5rem] mt-0 w-auto max-w-[calc(100vw-2rem)] sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[380px] ${i18n.dir() === 'rtl' ? 'sm:left-0' : 'sm:right-0'} app-surface rounded-2xl shadow-2xl border border-gray-100/80 dark:border-white/10 overflow-hidden z-50 animate-slide-up`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/80 dark:border-white/10">
            <h4 className="font-bold text-base">{t('notifications.title')}</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-500 font-semibold hover:text-primary-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> {t('notifications.mark_all_read')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="app-surface-muted p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">{t('common:loading')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">{isPortalMode ? t('notifications.empty_title') : t('notifications.no_notifications')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const IconComp = iconMap[n.icon] || Bell;
                const colors = colorMap[n.color] || colorMap.primary;

                return (
                  <div
                    key={n._id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.03] group ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-500/5' : ''
                      }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0 ring-2 ${colors.ring}`}>
                      <IconComp className="w-4.5 h-4.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5 shadow-sm shadow-primary-500/50" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Actions (on hover) */}
                    {!isPortalMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
              <span className="text-xs text-gray-400">{notifications.length} {t('notifications.title').toLowerCase()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
