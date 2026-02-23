/**
 * Notification Center Component
 * Displays all notifications with mark as read
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../store';
import toast from 'react-hot-toast';

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
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('تم تحديد الكل كمقروء');
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💳',
      invoice: '📄',
      collection: '🚗',
      system: '⚙️',
      alert: '⚠️'
    };
    return icons[type] || '🔔';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-stretch sm:items-start justify-end sm:p-4">
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          className="bg-white dark:bg-gray-800 sm:rounded-2xl shadow-2xl w-full sm:max-w-md h-full sm:h-[90vh] sm:max-h-[700px] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="text-blue-600" size={22} />
                <h2 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
                  الإشعارات
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                غير مقروء
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="mr-auto text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bell size={48} className="mb-3 opacity-50" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-3 sm:p-4 rounded-xl border transition cursor-pointer
                    ${notification.isRead
                      ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }
                  `}
                  onClick={async () => {
                    // Mark as read
                    if (!notification.isRead) await markAsRead(notification._id);
                    // Navigate to link if present
                    if (notification.link) {
                      // Fallback for old notifications stored with the legacy link
                      const navLink = notification.link === '/admin/subscriptions'
                        ? '/super-admin/requests'
                        : notification.link;

                      navigate(navLink);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug break-words">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed break-words">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[11px] text-gray-400">
                          {new Date(notification.createdAt).toLocaleString('ar-EG')}
                        </p>
                        {notification.link && (
                          <span className="text-[11px] text-blue-500 flex items-center gap-0.5 opacity-70">
                            فتح <ChevronLeft size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
                          title="تحديد كمقروء"
                        >
                          <Check size={15} className="text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 size={15} className="text-red-500" />
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
