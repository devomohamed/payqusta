import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, CreditCard,
  FileText, Package, Truck, UserPlus, Star, Store, CheckCircle, AlertCircle,
} from 'lucide-react';
import { api } from '../store';
import { notify } from '../components/AnimatedNotification';

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
};

const colorMap = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-500/10', text: 'text-primary-500', ring: 'ring-primary-500/20' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/20' },
  danger: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', ring: 'ring-gray-500/20' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    if (!localStorage.getItem('payqusta_token')) return;
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.data?.count || 0);
    } catch (e) {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem('payqusta_token')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = filter === 'unread' ? { unread: true, limit: 50 } : { limit: 50 };
      const { data } = await api.get('/notifications', { params });
      setNotifications(data.data || []);
    } catch (e) {
      notify.error('فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      notify.error('فشل تحديث الإشعار');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      notify.error('فشل تحديث الإشعارات');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (e) {
      notify.error('فشل حذف الإشعار');
    }
  };

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.link) navigate(notification.link);
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString('ar-EG');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">الإشعارات</h1>
            <p className="text-sm text-gray-500">كل تنبيهات النظام في مكان واحد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
          >
            غير مقروء
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            لا توجد إشعارات حالياً
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => {
              const IconComponent = iconMap[notification.icon] || Bell;
              const color = colorMap[notification.color] || colorMap.primary;
              return (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-4 cursor-pointer transition ${notification.isRead
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-primary-50/60 dark:bg-primary-500/10'
                    }`}
                  onClick={() => handleClick(notification)}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color.bg} ${color.text} ring-1 ${color.ring}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="تحديد كمقروء"
                      >
                        <Check className="w-4 h-4 text-primary-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
