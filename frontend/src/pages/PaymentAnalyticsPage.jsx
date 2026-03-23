/**
 * Payment Analytics Dashboard
 * Shows comprehensive payment gateway statistics
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const GATEWAY_NAMES = {
  paymob: 'Paymob',
  fawry: 'Fawry',
  vodafone: 'Vodafone Cash',
  instapay: 'InstaPay'
};

const PaymentAnalytics = () => {
  const [period, setPeriod] = useState('30');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/payments/analytics?period=${period}`);
      setAnalytics(data.data);
    } catch (error) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AnimatedBrandLogo size="lg" />
      </div>
    );
  }

  if (!analytics) return null;

  // Prepare data for charts
  const gatewayData = analytics.byGateway?.map(g => ({
    name: GATEWAY_NAMES[g._id] || g._id,
    amount: g.totalAmount,
    count: g.count,
    successRate: (g.successRate * 100).toFixed(1)
  })) || [];

  const dailyData = analytics.dailyTrend?.map(d => ({
    date: new Date(d._id).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    amount: d.amount,
    count: d.count,
    successRate: d.successCount > 0 ? ((d.successCount / d.count) * 100).toFixed(1) : 0
  })) || [];

  return (
    <div className="space-y-6 p-6 app-text-soft">
      {/* Header */}
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500/80">Payments Pulse</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحليلات الدفع الإلكتروني</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-400">
                إحصائيات شاملة حول المدفوعات الإلكترونية، مع توزيع أوضح للمؤشرات والرسوم على الهاتف.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              الفترة
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="app-surface w-full rounded-xl border border-transparent px-4 py-3 text-gray-900 dark:text-white sm:min-w-[220px]"
            >
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 3 شهور</option>
              <option value="365">آخر سنة</option>
            </select>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={32} className="opacity-80" />
            <span className="text-blue-100 text-sm">إجمالي المبالغ</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {gatewayData.reduce((sum, g) => sum + g.amount, 0).toLocaleString()} ج.م
          </div>
          <p className="text-blue-100 text-sm">
            {gatewayData.reduce((sum, g) => sum + g.count, 0)} معاملة
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle size={32} className="opacity-80" />
            <span className="text-green-100 text-sm">معدل النجاح</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {dailyData.length > 0
              ? (dailyData.reduce((sum, d) => sum + parseFloat(d.successRate), 0) / dailyData.length).toFixed(1)
              : 0}%
          </div>
          <p className="text-green-100 text-sm">
            من إجمالي المعاملات
          </p>
        </div>

        {/* Average Transaction */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CreditCard size={32} className="opacity-80" />
            <span className="text-purple-100 text-sm">متوسط المعاملة</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {gatewayData.reduce((sum, g) => sum + g.count, 0) > 0
              ? (gatewayData.reduce((sum, g) => sum + g.amount, 0) / gatewayData.reduce((sum, g) => sum + g.count, 0)).toFixed(0)
              : 0} ج.م
          </div>
          <p className="text-purple-100 text-sm">
            للمعاملة الواحدة
          </p>
        </div>

        {/* Most Used Gateway */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} className="opacity-80" />
            <span className="text-orange-100 text-sm">البوابة الأكثر استخداماً</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {gatewayData.length > 0
              ? gatewayData.reduce((max, g) => g.count > max.count ? g : max, gatewayData[0]).name
              : '-'}
          </div>
          <p className="text-orange-100 text-sm">
            {gatewayData.length > 0
              ? `${gatewayData.reduce((max, g) => g.count > max.count ? g : max, gatewayData[0]).count} معاملة`
              : ''}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gateway Comparison */}
        <div className="app-surface rounded-3xl p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
            مقارنة البوابات
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gatewayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="المبلغ" />
              <Bar dataKey="count" fill="#10b981" name="العدد" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate by Gateway */}
        <div className="app-surface rounded-3xl p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
            معدل النجاح لكل بوابة
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gatewayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.successRate}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="successRate"
              >
                {gatewayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="app-surface rounded-3xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
          الاتجاه اليومي
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              name="المبلغ"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              name="العدد"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gateway Details Table */}
      <div className="app-surface rounded-3xl p-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
          تفاصيل البوابات
        </h3>
        <div className="space-y-3 md:hidden">
          {gatewayData.map((gateway, index) => (
            <div key={gateway.name} className="rounded-3xl border border-white/60 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <p className="font-bold text-gray-900 dark:text-white">{gateway.name}</p>
                </div>
                <span className={`
                  rounded-full px-2 py-1 text-sm font-medium
                  ${parseFloat(gateway.successRate) >= 80
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : parseFloat(gateway.successRate) >= 60
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }
                `}>
                  {gateway.successRate}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <p className="text-[11px] text-gray-400">عدد المعاملات</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-white">{gateway.count}</p>
                </div>
                <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <p className="text-[11px] text-gray-400">إجمالي المبلغ</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-white">{gateway.amount.toLocaleString()} ج.م</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
                <p className="text-[11px] text-gray-400">متوسط المعاملة</p>
                <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">
                  {(gateway.amount / gateway.count).toFixed(0)} ج.م
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  البوابة
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  عدد المعاملات
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  إجمالي المبلغ
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  معدل النجاح
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  متوسط المعاملة
                </th>
              </tr>
            </thead>
            <tbody>
              {gatewayData.map((gateway, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {gateway.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {gateway.count}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {gateway.amount.toLocaleString()} ج.م
                  </td>
                  <td className="py-3 px-4">
                    <span className={`
                      px-2 py-1 rounded-full text-sm font-medium
                      ${parseFloat(gateway.successRate) >= 80
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : parseFloat(gateway.successRate) >= 60
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }
                    `}>
                      {gateway.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {(gateway.amount / gateway.count).toFixed(0)} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
