/**
 * Collector Dashboard Page
 * Admin view for monitoring field collectors
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  DollarSign,
  MapPin,
  Calendar,
  Award,
  AlertCircle
} from 'lucide-react';
import { api } from '../store';
import { api } from '../store';
import toast from 'react-hot-toast';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';

const CollectorDashboard = () => {
  const [collectors, setCollectors] = useState([]);
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollectors();
  }, []);

  useEffect(() => {
    if (selectedCollector) {
      fetchCollectorStats(selectedCollector._id);
    }
  }, [selectedCollector]);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/collection/collectors');
      setCollectors(data.data || []);
      if (data.data?.length > 0) {
        setSelectedCollector(data.data[0]);
      }
    } catch (error) {
      toast.error('فشل تحميل المحصلين');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectorStats = async (collectorId) => {
    try {
      const { data } = await api.get(`/collection/collectors/${collectorId}/stats`);
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedBrandLogo size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          لوحة المحصلين الميدانيين
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          مراقبة أداء المحصلين في الوقت الفعلي
        </p>
      </div>

      {/* Collectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {collectors.map(collector => (
          <div
            key={collector._id}
            onClick={() => setSelectedCollector(collector)}
            className={`
              p-4 rounded-xl border-2 cursor-pointer transition
              ${selectedCollector?._id === collector._id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="text-blue-600" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  {collector.user?.name || 'محصل'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {collector.isActive ? '🟢 نشط' : '🔴 غير نشط'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">التحصيل اليوم</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {collector.stats?.totalCollected?.toLocaleString() || 0} ج.م
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">معدل النجاح</span>
                <span className="font-bold text-green-600">
                  {collector.successRate || 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Collector Details */}
      {selectedCollector && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Collected */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <DollarSign size={32} className="opacity-80" />
                <span className="text-green-100 text-sm">إجمالي التحصيل</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.stats?.totalCollected?.toLocaleString() || 0}
              </div>
              <p className="text-green-100 text-sm">جنيه مصري</p>
            </div>

            {/* Total Visits */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <MapPin size={32} className="opacity-80" />
                <span className="text-blue-100 text-sm">إجمالي الزيارات</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.stats?.totalVisits || 0}
              </div>
              <p className="text-blue-100 text-sm">زيارة</p>
            </div>

            {/* Success Rate */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={32} className="opacity-80" />
                <span className="text-purple-100 text-sm">معدل النجاح</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.successRate || 0}%
              </div>
              <p className="text-purple-100 text-sm">من الزيارات</p>
            </div>

            {/* Distance Traveled */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <MapPin size={32} className="opacity-80" />
                <span className="text-orange-100 text-sm">المسافة المقطوعة</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {((selectedCollector.stats?.totalDistance || 0) / 1000).toFixed(1)}
              </div>
              <p className="text-orange-100 text-sm">كيلومتر</p>
            </div>
          </div>

          {/* Today's Performance */}
          {stats.todayPerformance && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                أداء اليوم
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المهام المعينة</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.todayPerformance.tasksAssigned || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المهام المكتملة</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.todayPerformance.tasksCompleted || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المبلغ المحصل</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.todayPerformance.amountCollected?.toLocaleString() || 0} ج.م
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">تقدم الهدف</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.todayPerformance.targetProgress || 0}%
                    </p>
                    <div className="flex-1 mb-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(stats.todayPerformance.targetProgress || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collector Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
              معلومات المحصل
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الاسم</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.user?.name || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الهاتف</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.user?.phone || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المناطق المعينة</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.assignedRegions?.join(', ') || 'غير محدد'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الهدف اليومي</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.dailyTarget?.toLocaleString() || 0} ج.م
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">آخر نشاط</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.stats?.lastActive
                    ? new Date(selectedCollector.stats.lastActive).toLocaleString('ar-EG')
                    : '-'
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">الحالة</p>
                <span className={`
                  inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                  ${selectedCollector.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }
                `}>
                  {selectedCollector.isActive ? '✅ نشط' : '❌ غير نشط'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectorDashboard;
