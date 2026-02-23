import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Building2, FileText, DollarSign,
  TrendingUp, Activity, CheckCircle, UserPlus, Store,
  Calendar, ArrowRight, Crown, Target, Zap, AlertTriangle, Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, useAuthStore, biApi } from '../store';
import { Card, LoadingSpinner, Badge } from '../components/UI';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CommandCenterPage from './CommandCenterPage';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  // States for System Overview (Old Admin Dashboard)
  const [systemData, setSystemData] = useState(null);

  // States for Operations Center (Old Command Center)
  const [commandData, setCommandData] = useState(null);
  const [healthData, setHealthData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'operations'

  // If user is Tenant Admin (not Super Admin), show them only the Command Center
  if (user?.role === 'admin' && !user?.isSuperAdmin) {
    return <CommandCenterPage />;
  }

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sysRes, cmdRes, healthRes] = await Promise.all([
        adminApi.getDashboard().catch(() => ({ data: { data: null } })),
        biApi.getCommandCenter().catch(() => ({ data: { data: null } })),
        biApi.getHealthScore().catch(() => ({ data: { data: null } }))
      ]);
      setSystemData(sysRes.data?.data);
      setCommandData(cmdRes.data?.data);
      setHealthData(healthRes.data?.data);
    } catch (err) {
      toast.error('خطأ في تحميل لوحة القيادة المركزية');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = systemData?.statistics || {};

  const StatCard = ({ icon: Icon, label, value, subtitle, color = 'primary', badge }) => (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${color}-500 to-${color}-600`} />
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full group-hover:scale-150 transition-transform duration-500 blur-xl" />
      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center shadow-lg shadow-${color}-500/25`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && (
            <Badge variant="success" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <h3 className="text-3xl font-black mb-1 text-gray-800 dark:text-gray-100">{value?.toLocaleString('ar-EG')}</h3>
        <p className="text-sm font-bold text-gray-500 mb-1">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-1">القيادة المركزية العليا</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              التحكم الشامل والإحصائيات الحية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 flex rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'operations' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              العمليات الحية
            </button>
          </div>
          <button
            onClick={loadAllData}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            title="تحديث البيانات"
          >
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* ===== SYSTEM OVERVIEW TAB (Admin Top-Level) ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Main Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Building2}
              label="المتاجر المسجلة"
              value={stats.tenants?.total || 0}
              subtitle={`${stats.tenants?.active || 0} متجر نشط — ${stats.tenants?.total - (stats.tenants?.active || 0)} متوقف`}
              color="primary"
              badge={stats.tenants?.active > 0 ? `${Math.round((stats.tenants?.active / stats.tenants?.total) * 100)}% نشاط` : null}
            />
            <StatCard
              icon={Users}
              label="المستخدمين والموظفين"
              value={stats.users?.total || 0}
              subtitle="عبر جميع الفروع والمتاجر"
              color="blue"
            />
            <StatCard
              icon={FileText}
              label="الفواتير الصادرة"
              value={stats.invoices?.total || 0}
              subtitle="إجمالي العمليات المكتملة"
              color="emerald"
            />
            <StatCard
              icon={Target}
              label="قاعدة العملاء الكلية"
              value={stats.customers?.total || 0}
              subtitle="مستهدف النمو"
              color="purple"
            />
          </div>

          {/* Revenue Statistics Full Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-2xl p-8 border border-gray-700">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <h2 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10 text-emerald-400">
              <DollarSign className="w-6 h-6" />
              المركز المالي الموحد للمنصة
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-sm text-gray-400 mb-2 font-medium">إجمالي حجم التداولات (الإيرادات)</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-white">
                    {stats.revenue?.totalRevenue?.toLocaleString('ar-EG') || '0'}
                  </p>
                  <p className="text-sm text-emerald-400 mb-1 font-bold">ج.م</p>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-sm text-gray-400 mb-2 font-medium">السيولة المحصلة الفعالة</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-emerald-400">
                    {stats.revenue?.totalPaid?.toLocaleString('ar-EG') || '0'}
                  </p>
                  <p className="text-sm text-emerald-500 mb-1 font-bold">ج.م</p>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/5" />
                <p className="text-sm text-gray-400 mb-2 font-medium relative z-10">المتأخرات والأقساط المعلقة</p>
                <div className="flex items-end gap-2 relative z-10">
                  <p className="text-4xl font-black text-red-400">
                    {stats.revenue?.totalOutstanding?.toLocaleString('ar-EG') || '0'}
                  </p>
                  <p className="text-sm text-red-500 mb-1 font-bold">ج.م</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tenants & Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tenants */}
            <Card className="flex flex-col h-full border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <h2 className="text-lg font-black flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <Store className="w-5 h-5 text-primary-500" />
                  المتاجر الحديثة الانضمام
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-1">
                {systemData?.recentTenants?.length > 0 ? (
                  systemData.recentTenants.map((tenant) => (
                    <div key={tenant._id} className="p-4 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors group cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold group-hover:scale-110 transition-transform">
                            {tenant.name?.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm mb-1 text-gray-800 dark:text-gray-200">{tenant.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant={tenant.subscription?.plan === 'professional' ? 'primary' : 'gray'} className="text-[10px]">
                                {tenant.subscription?.plan || 'free'}
                              </Badge>
                              <span className="text-[10px] text-gray-400 font-medium">
                                مُنذ {format(new Date(tenant.createdAt), 'dd MMM yyyy', { locale: ar })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={tenant.isActive ? 'success' : 'danger'}>
                          {tenant.isActive ? 'مُفعل' : 'مُعطل'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <Store className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">لا توجد متاجر حتى الآن</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Users */}
            <Card className="flex flex-col h-full border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <h2 className="text-lg font-black flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  أحدث تسجيلات الموظفين
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
                {systemData?.recentUsers?.length > 0 ? (
                  systemData.recentUsers.map((user) => (
                    <div key={user._id} className="p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold flex-shrink-0 border border-gray-200 dark:border-gray-600">
                            {user.name?.charAt(0) || 'م'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm truncate text-gray-800 dark:text-gray-200 mb-0.5">{user.name}</h3>
                            <p className="text-[11px] text-gray-500 truncate mb-0.5">{user.email}</p>
                            {user.tenant && (
                              <p className="text-[10px] text-primary-600 font-bold truncate">تبع: {user.tenant.name}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={
                          user.role === 'admin' ? 'warning' :
                            user.role === 'vendor' ? 'primary' :
                              user.role === 'collector' ? 'success' : 'gray'
                        } className="flex-shrink-0 ml-2">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">لا يوجد مستخدمين حتى الآن</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickLink to="/admin/tenants" icon={Building2} label="إدارة المتاجر والفروع" color="primary" desc="تعديل، تفعيل، أو إيقاف" />
            <QuickLink to="/admin/users" icon={Users} label="إدارة طاقم العمل" color="emerald" desc="تسكين الصلاحيات" />
            <QuickLink to="/admin/statistics" icon={TrendingUp} label="تحليلات الأداء" color="purple" desc="تقارير الرسوم البيانية" />
            <QuickLink to="/admin/audit-logs" icon={Activity} label="مراقبة النظام" color="blue" desc="تتبع حركات المستخدمين" />
          </div>
        </div>
      )}

      {/* ===== OPERATIONS TAB (Command Center Integrated) ===== */}
      {activeTab === 'operations' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Operations Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {healthData && (
              <Card className="p-6 relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="font-bold text-gray-500 mb-1">مؤشر الصحة العام</h4>
                    <p className="text-3xl font-black" style={{ color: healthData.score >= 70 ? '#10b981' : healthData.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {healthData.score}%
                    </p>
                  </div>
                  <div className="text-4xl">{healthData.emoji}</div>
                </div>
                <div className="space-y-2 relative z-10">
                  {['collection', 'customers', 'inventory'].map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-[10px] w-12 font-bold text-gray-400 uppercase">{k.substring(0, 4)}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className={`h-full rounded-full ${healthData.breakdown[k].score > 5 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(healthData.breakdown[k].score / healthData.breakdown[k].max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {commandData && (
              <>
                <Card className="p-6 border-b-4 border-primary-500 flex flex-col justify-center hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-500">تحصيلات اليوم</h4>
                      <p className="text-3xl font-black text-primary-600">{fmt(commandData.summary?.collectionsTodayTotal)} <span className="text-sm">ج.م</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-bold bg-gray-100 dark:bg-gray-800 inline-block px-3 py-1 rounded-full w-max">
                    من إجمالي {commandData.summary?.collectionsTodayCount} قسط مستحق
                  </p>
                </Card>

                <Card className="p-6 border-b-4 border-red-500 flex flex-col justify-center hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-500">حجم المتأخرات الفعال</h4>
                      <p className="text-3xl font-black text-red-600">{fmt(commandData.summary?.overdueTotal)} <span className="text-sm">ج.م</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-red-400 font-bold bg-red-50 dark:bg-red-500/10 inline-block px-3 py-1 rounded-full w-max">
                    موزعة على {commandData.summary?.overdueCount} فاتورة حرجة
                  </p>
                </Card>
              </>
            )}
          </div>

          {/* Alerts & Smart Suggestions Box */}
          {commandData?.suggestions?.length > 0 && (
            <Card className="p-5 border border-amber-200 bg-gradient-to-l from-white to-amber-50 dark:from-gray-900 dark:to-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-6 h-6 text-amber-500 animate-pulse" />
                <h3 className="font-black text-lg text-amber-700 dark:text-amber-500">توصيات الذكاء العملي</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commandData.suggestions.map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border-l-4 ${s.priority === 'high' ? 'border-red-500 bg-white dark:bg-gray-800 shadow-sm' : 'border-amber-500 bg-white/50 dark:bg-gray-800/50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-1">{s.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold leading-relaxed text-gray-800 dark:text-gray-200">{s.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Operational Details (Two Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h4 className="font-black flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  إنذارات المخزون الحرج
                </h4>
                <Badge variant="warning">{commandData?.lowStockProducts?.length || 0} منتج</Badge>
              </div>
              <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                {(commandData?.lowStockProducts?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <CheckCircle className="w-10 h-10 mb-2 text-emerald-500 opacity-50" />
                    <p>المخزون آمن بالكامل</p>
                  </div>
                ) : (
                  commandData.lowStockProducts.map((p, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-sm text-gray-800">{p.name}</p>
                        <Badge variant={p.status === 'out_of_stock' ? 'danger' : 'warning'} className="text-[10px]">
                          {p.status === 'out_of_stock' ? 'رصيد صفري!' : `باقي ${p.quantity} حبة`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">SKU: {p.sku}</p>
                        {p.branchName && <p className="text-[10px] font-bold text-primary-600">📍 فرع {p.branchName}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h4 className="font-black flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-500" />
                  متابعة التحصيلات المتأخرة
                </h4>
                <Badge variant="danger">{commandData?.collectionsOverdue?.length || 0} متأخرة</Badge>
              </div>
              <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                {(commandData?.collectionsOverdue?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <CheckCircle className="w-10 h-10 mb-2 text-emerald-500 opacity-50" />
                    <p>الدورة النقدية نقية</p>
                  </div>
                ) : (
                  commandData.collectionsOverdue.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                      <div className="w-12 text-center bg-red-100 text-red-700 font-black rounded-lg py-1 flex-shrink-0">
                        <span className="text-xl leading-none">{c.daysOverdue}</span>
                        <span className="text-[9px] block">يوم تأخير</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{c.customer?.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">فاتورة #{c.invoiceNumber}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-red-600 dark:text-red-400 text-base">{fmt(c.amount)}</p>
                        <p className="text-[9px] font-bold text-red-500">جنيهاً</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, desc, color = 'primary' }) {
  return (
    <a
      href={to}
      className={`group p-5 rounded-2xl bg-white dark:bg-gray-900 hover:bg-${color}-50 dark:hover:bg-${color}-500/10 shadow-sm hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-${color}-200 dark:hover:border-${color}-500/30 flex flex-col justify-between min-h-[120px]`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className={`w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-${color}-500 group-hover:text-white transition-colors`}>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
      <div>
        <span className="font-black text-sm text-gray-800 dark:text-gray-100 block mb-1">{label}</span>
        {desc && <span className="text-[11px] font-bold text-gray-400">{desc}</span>}
      </div>
    </a>
  );
}

