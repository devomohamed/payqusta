import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Search, Package, Clock,
  User, RotateCcw, FileText,
  LayoutGrid, Target, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore, api } from '../store';
import { Button, Card, Badge, LoadingSpinner } from '../components/UI';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function BranchDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const branchId = user?.branch?._id;

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        if (!branchId) {
          if (mounted) setLoading(false);
          return;
        }

        const statsRes = await api.get(`/branches/${branchId}/stats`);
        const statsData = statsRes.data.data;

        if (!mounted) return;

        setStats({
          today: statsData.today,
          currentShift: statsData.currentShift,
          recentInvoices: statsData.recentInvoices || [],
          gamification: statsData.gamification
        });
      } catch (err) {
        console.error('Error fetching branch stats:', err);
        // Fallback to empty state
        if (!mounted) return;
        setStats({
          today: { sales: 0, paid: 0, invoicesCount: 0, expenses: 0, profit: 0 },
          currentShift: null,
          recentInvoices: [],
          gamification: null
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();

    return () => {
      mounted = false;
    };
  }, [branchId]);

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">مرحباً، {user?.name} 👋</h1>
          <p className="text-primary-100 text-lg mb-6">
            {user?.branch ? `أنت تعمل الآن في: ${user.branch.name}` : 'لوحة تحكم الموظف'}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/quick-sale">
              <Button
                className="bg-white text-primary-600 hover:bg-gray-100 border-none shadow-lg text-lg px-8 py-4 h-auto"
                icon={<ShoppingCart className="w-6 h-6" />}
              >
                بدء عملية بيع
              </Button>
            </Link>
            <Link to="/products">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                icon={<Search className="w-5 h-5" />}
              >
                بحث عن منتج
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Gamification & Performance Widget (Staff Only) */}
      {!user?.isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Daily Target Progress */}
          <div className="md:col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-indigo-100 font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  تحدي اليوم
                </h3>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-4xl font-black">
                    {stats?.gamification ? stats.gamification.progress : 0}%
                  </span>
                  <span className="text-indigo-200 mb-1">من الهدف اليومي</span>
                </div>
                <p className="text-sm text-indigo-100 opacity-80">
                  حققت {stats?.gamification?.currentSales?.toLocaleString() || stats?.today?.paid?.toLocaleString() || 0} من {stats?.gamification?.dailyTarget?.toLocaleString() || 10000} ج.م
                </p>
              </div>

              {/* Circular Progress (Simplified with CSS) */}
              <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full bg-black/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, stats?.gamification?.progress || 0)}%` }}
              />
            </div>
          </div>

          {/* Level & XP Card */}
          <div className="app-surface rounded-2xl p-6 border border-gray-100/80 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 font-black text-2xl mb-2 border-4 border-amber-50 dark:border-amber-900/40">
                {stats?.gamification?.level || user?.gamification?.level || 1}
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">بائع نشيط</h3>
              <p className="text-xs text-gray-400 mb-3">المستوى الحالي</p>

              <div className="mb-1 h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, ((stats?.gamification?.points || user?.gamification?.points || 0) % 1000) / 10)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">{stats?.gamification?.points || user?.gamification?.points || 0} XP نقطة خبرة</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <h2 className="text-xl font-bold flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-gray-500" />
        الوصول السريع
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/quick-sale" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-primary-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors text-primary-500">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">نقطة البيع</span>
        </Link>

        <Link to="/products" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-500">
            <Package className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">المخزون والمنتجات</span>
        </Link>

        <Link to="/invoices" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-emerald-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-emerald-500 transition-colors text-emerald-500">
            <FileText className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">الفواتير السابقة</span>
        </Link>

        <Link to="/returns-management" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-500">
            <RotateCcw className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">المرتجعات</span>
        </Link>
      </div>

      {/* Recent Activity / Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              آخر العمليات
            </h3>
            <Link to="/invoices" className="text-primary-600 text-sm font-bold hover:underline">عرض الكل</Link>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center"><LoadingSpinner /></div>
          ) : stats?.recentInvoices?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentInvoices.slice(0, 5).map((inv, index) => (
                <div key={inv._id || index} className="app-surface-muted flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="app-surface flex h-10 w-10 items-center justify-center rounded-lg shadow-sm">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">فاتورة #{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{format(new Date(inv.createdAt), 'hh:mm a', { locale: ar })}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{inv.totalAmount.toLocaleString()} ج.م</p>
                    <Badge variant={inv.status === 'paid' ? 'success' : 'warning'} size="sm">
                      {inv.status === 'paid' ? 'مدفوع' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400">
              لا توجد عمليات بيع اليوم
            </div>
          )}
        </Card>

        {/* Branch Info Card */}
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" />
            معلومات الموظف
          </h3>
          <div className="space-y-4">
            <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
              <span className="text-gray-500 text-sm">الاسم</span>
              <span className="font-bold">{user?.name}</span>
            </div>
            <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
              <span className="text-gray-500 text-sm">الدور الوظيفي</span>
              <Badge variant="primary">{user?.role === 'vendor' ? 'موظف مبيعات' : user?.role}</Badge>
            </div>
            <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
              <span className="text-gray-500 text-sm">الفرع الحالي</span>
              <span className="font-bold">{user?.branch?.name || 'الفرع الرئيسي'}</span>
            </div>
            <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
              <span className="text-gray-500 text-sm">وقت الدخول</span>
              <span className="font-bold font-mono">{format(new Date(), 'hh:mm a', { locale: ar })}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
