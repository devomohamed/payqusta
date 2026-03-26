/**
 * Collector Dashboard Page
 * Admin view for monitoring field collectors
 */

import React, { useState, useEffect } from 'react';
import { api } from '../store';
import { useTranslation } from 'react-i18next';
import {
  Users,
  TrendingUp,
  DollarSign,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';

const CollectorDashboard = () => {
  const { t } = useTranslation('admin');
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
      toast.error(t('collector_dashboard.toasts.k7g6wpp'));
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
    <div className="space-y-6 p-6 app-text-soft">
      {/* Header */}
      <div className="app-surface-muted rounded-3xl p-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('collector_dashboard.ui.kk2t1xy')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('collector_dashboard.ui.kv5mbsh')}
        </p>
      </div>

      {/* Collectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {collectors.map(collector => (
          <div
            key={collector._id}
            onClick={() => setSelectedCollector(collector)}
            className={`
              rounded-3xl border-2 p-4 cursor-pointer transition-all duration-200 motion-safe:hover:-translate-y-0.5
              ${selectedCollector?._id === collector._id
                ? 'app-surface-muted border-primary-500/40 shadow-lg shadow-primary-500/10'
                : 'app-surface border-transparent hover:border-primary-500/20'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="app-surface-muted flex h-12 w-12 items-center justify-center rounded-full">
                <Users className="text-blue-600" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  {collector.user?.name || t('collector_dashboard.toasts.ktehiv')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {collector.isActive ? '🟢 نشط' : '🔴 غير نشط'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('collector_dashboard.ui.kmpkwav')}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {collector.stats?.totalCollected?.toLocaleString() || 0} ج.م
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('collector_dashboard.ui.kgi89a8')}</span>
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
            <div className="rounded-3xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <DollarSign size={32} className="opacity-80" />
                <span className="text-green-100 text-sm">{t('collector_dashboard.ui.ki8jjnm')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.stats?.totalCollected?.toLocaleString() || 0}
              </div>
              <p className="text-green-100 text-sm">{t('collector_dashboard.ui.kda49v6')}</p>
            </div>

            {/* Total Visits */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <MapPin size={32} className="opacity-80" />
                <span className="text-blue-100 text-sm">{t('collector_dashboard.ui.k744303')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.stats?.totalVisits || 0}
              </div>
              <p className="text-blue-100 text-sm">{t('collector_dashboard.ui.kp1j8yv')}</p>
            </div>

            {/* Success Rate */}
            <div className="rounded-3xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={32} className="opacity-80" />
                <span className="text-purple-100 text-sm">{t('collector_dashboard.ui.kgi89a8')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {selectedCollector.successRate || 0}%
              </div>
              <p className="text-purple-100 text-sm">{t('collector_dashboard.ui.k1n8tc1')}</p>
            </div>

            {/* Distance Traveled */}
            <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <MapPin size={32} className="opacity-80" />
                <span className="text-orange-100 text-sm">{t('collector_dashboard.ui.k46ej61')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {((selectedCollector.stats?.totalDistance || 0) / 1000).toFixed(1)}
              </div>
              <p className="text-orange-100 text-sm">{t('collector_dashboard.ui.kndgugx')}</p>
            </div>
          </div>

          {/* Today's Performance */}
          {stats.todayPerformance && (
            <div className="app-surface rounded-3xl p-6">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                {t('collector_dashboard.ui.kcc81ww')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.k5whd6v')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.todayPerformance.tasksAssigned || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.ku9bchq')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.todayPerformance.tasksCompleted || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kirhpwe')}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.todayPerformance.amountCollected?.toLocaleString() || 0} ج.م
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kdvplai')}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.todayPerformance.targetProgress || 0}%
                    </p>
                    <div className="flex-1 mb-2">
                      <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
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
          <div className="app-surface rounded-3xl p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
              {t('collector_dashboard.ui.kh2gwlg')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kovdol8')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.user?.name || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kaaw86k')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.user?.phone || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kfb4tcg')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.assignedRegions?.join(', ') || t('collector_dashboard.toasts.k5xt5xj')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.knvlwik')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.dailyTarget?.toLocaleString() || 0} ج.م
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kvbkk5j')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCollector.stats?.lastActive
                    ? new Date(selectedCollector.stats.lastActive).toLocaleString('ar-EG')
                    : '-'
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('collector_dashboard.ui.kabct8k')}</p>
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
