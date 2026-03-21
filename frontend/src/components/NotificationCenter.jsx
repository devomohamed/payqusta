import React, { useEffect, useState } from 'react';
import { X, Bell, Check, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../store';
import toast from 'react-hot-toast';
import { EmptyState, LoadingSpinner } from './UI';

const NotificationCenter = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = filter === 'unread' ? '?unread=true' : '';
      const { data } = await api.get(`/notifications${params}`);
      setNotifications(data.data || []);
    } catch (error) {
      toast.error('فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((notification) => (
        notification._id === id ? { ...notification, isRead: true } : notification
      )));
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      toast.success('تم تحديد الكل كمقروء');
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((notification) => notification._id !== id));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💳',
      invoice: '📄',
      collection: '🚚',
      system: '⚙️',
      alert: '⚠️'
    };
    return icons[type] || '🔔';
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-sm sm:items-start sm:p-4">
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          className="app-surface flex h-full w-full flex-col shadow-2xl sm:h-[90vh] sm:max-h-[700px] sm:max-w-md sm:rounded-2xl"
        >
          <div className="flex-shrink-0 border-b border-gray-200/80 p-4 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="text-blue-600" size={22} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">الإشعارات</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="app-surface-muted rounded-xl p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'app-surface-muted text-gray-700 dark:text-gray-300'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'app-surface-muted text-gray-700 dark:text-gray-300'
                }`}
              >
                غير مقروء
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mr-auto text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-sm">
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {loading ? (
              <LoadingSpinner size="lg" text="جارٍ تحميل الإشعارات..." className="h-full" />
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="لا توجد إشعارات"
                description={filter === 'unread' ? 'لا توجد إشعارات غير مقروءة حاليًا.' : 'ستظهر إشعاراتك هنا عند وصول جديد.'}
                action={filter === 'unread' ? { label: 'عرض الكل', onClick: () => setFilter('all') } : null}
                className="h-full py-0"
              />
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`cursor-pointer rounded-xl border p-3 transition sm:p-4 ${
                    notification.isRead
                      ? 'app-surface-muted border-gray-200/80 dark:border-white/10'
                      : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  }`}
                  onClick={async () => {
                    if (!notification.isRead) await markAsRead(notification._id);

                    if (notification.link) {
                      const navLink = notification.link === '/admin/subscriptions'
                        ? '/super-admin/requests'
                        : notification.link;

                      navigate(navLink);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 text-xl sm:text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="break-words text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[11px] text-gray-400">
                          {new Date(notification.createdAt).toLocaleString('ar-EG')}
                        </p>
                        {notification.link && (
                          <span className="flex items-center gap-0.5 text-[11px] text-blue-500 opacity-70">
                            فتح <ChevronLeft size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-center gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-500/10"
                          title="تحديد كمقروء"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationCenter;
