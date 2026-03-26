import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  FileText,
  Clock,
  Boxes,
  CreditCard,
  AlertTriangle,
  Users,
  Truck,
  Calendar,
  DollarSign,
  Star,
  Zap,
  BarChart3,
  Store,
  Link2,
  CheckSquare,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { dashboardApi, useAuthStore } from '../store';
import { StatCard, Card, Badge, EmptyState, LoadingSpinner } from '../components/UI';
import AIStockWidget from '../components/AIStockWidget';

export default function DashboardPage() {
  const { t } = useTranslation('admin');
  const { user, getBranches, can } = useAuthStore();
  const [data, setData] = useState(null);
  const [collections, setCollections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    if (user?.role === 'admin' || user?.isSuperAdmin) {
      getBranches().then(setBranches).catch(() => {});
    }
  }, [user, getBranches]);

  useEffect(() => {
    setLoading(true);
    const params = selectedBranch !== 'all' ? { branch: selectedBranch } : {};

    Promise.all([
      dashboardApi.getOverview(params),
      dashboardApi.getDailyCollections(params),
    ])
      .then(([overviewResponse, collectionsResponse]) => {
        setData(overviewResponse.data.data);
        setCollections(collectionsResponse.data.data);
      })
      .catch(() => {
        setData({
          sales: { totalSales: 0, totalPaid: 0, totalOutstanding: 0, invoiceCount: 0 },
          stock: { inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
          customers: { total: 0 },
          suppliers: { total: 0 },
          installments: { upcomingCount: 0, overdueCount: 0 },
          quickCollections: { totalCollected: 0, totalFees: 0 },
          monthlySales: [],
          topProducts: [],
          recentInvoices: [],
        });
        setCollections({
          today: { total: 0, items: [] },
          week: { total: 0, items: [] },
          overdue: { total: 0, items: [] },
        });
      })
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const summaryCards = [
    {
      key: 'customers',
      to: '/customers',
      icon: Users,
      value: data.customers?.total || 0,
      label: t('dashboard_page.ui.kzgg8kr'),
      accentClass: 'bg-primary-50 dark:bg-primary-500/10',
      iconClass: 'text-primary-600 dark:text-primary-300',
    },
    {
      key: 'suppliers',
      to: '/suppliers',
      icon: Truck,
      value: data.suppliers?.total || 0,
      label: t('dashboard_page.ui.krzfmdg'),
      accentClass: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconClass: 'text-emerald-600 dark:text-emerald-300',
    },
    {
      key: 'stock-value',
      icon: DollarSign,
      value: fmt(data.stock?.totalValue || 0),
      label: t('dashboard_page.ui.k3ma4dm'),
      accentClass: 'bg-amber-50 dark:bg-amber-500/10',
      iconClass: 'text-amber-600 dark:text-amber-300',
    },
    {
      key: 'upcoming-installments',
      icon: Star,
      value: data.installments?.upcomingCount || 0,
      label: t('dashboard_page.ui.ki4okg'),
      accentClass: 'bg-violet-50 dark:bg-violet-500/10',
      iconClass: 'text-violet-600 dark:text-violet-300',
    },
    {
      key: 'quick-links',
      icon: Link2,
      value: `${fmt(data.quickCollections?.totalCollected || 0)} ج.م`,
      label: t('dashboard_page.ui.kkkgu8i'),
      subtext: `العمولة: ${fmt(data.quickCollections?.totalFees || 0)} ج.م`,
      accentClass: 'bg-indigo-50 dark:bg-indigo-500/10',
      iconClass: 'text-indigo-600 dark:text-indigo-300',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in sm:space-y-8">
      <div className="app-surface relative overflow-hidden rounded-[1.75rem] p-4 sm:p-5 lg:p-6">
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent pointer-events-none" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="app-text-muted text-[11px] font-black uppercase tracking-[0.22em]">{t('dashboard_page.ui.krcr5uq')}</p>
            <h1 className="mt-2 text-xl font-black text-gray-900 dark:text-white sm:text-2xl lg:text-[2rem]">{t('dashboard_page.ui.k9g9jd6')}</h1>
            <p className="app-text-soft mt-2 text-sm leading-7">
              {t('dashboard_page.ui.k9alu18')}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {can('invoices', 'create') && (
              <Link
                to="/quick-sale"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto sm:py-2.5"
              >
                <Zap className="h-4 w-4" />
                {t('dashboard_page.ui.kbvlebu')}
              </Link>
            )}
            {can('reports', 'read') && (
              <Link
                to="/reports"
                className="app-surface-muted inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-white dark:text-gray-100 dark:hover:bg-white/10 sm:w-auto sm:py-2.5"
              >
                <BarChart3 className="h-4 w-4 text-violet-500" />
                {t('dashboard_page.ui.ku5zj1i')}
              </Link>
            )}
            {(user?.role === 'admin' || user?.isSuperAdmin) && branches.length > 0 && (
              <div className="app-surface-muted flex w-full items-center gap-2 rounded-2xl p-1.5 shadow-sm sm:w-auto">
                <Store className="mr-2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer border-none bg-transparent text-sm font-bold focus:ring-0 sm:flex-none"
                >
                  <option value="all">{t('dashboard_page.ui.ki14stf')}</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {(user?.role === 'admin' || can('settings', 'update')) && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-primary-50 via-white to-emerald-50 p-5 dark:from-primary-500/10 dark:via-slate-950 dark:to-emerald-500/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/25">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] app-text-muted">{t('dashboard_page.ui.k798myr')}</p>
                <h2 className="mt-2 text-xl font-black app-text-strong">{t('dashboard_page.ui.kbzscwd')}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 app-text-muted">
                  {t('dashboard_page.ui.k3k00u9')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <CheckSquare className="h-4 w-4" />
                {t('dashboard_page.ui.kd6has1')}
              </Link>
              <Link
                to="/backup"
                className="app-surface-muted inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-white dark:text-gray-100 dark:hover:bg-white/10"
              >
                <Store className="h-4 w-4 text-emerald-500" />
                {t('dashboard_page.ui.k4ssz6j')}
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {can('reports', 'read') && (
          <StatCard
            title={t('dashboard_page.titles.kflwesj')}
            value={`${fmt(data.sales?.totalSales)} ج.م`}
            icon={<TrendingUp className="w-5 h-5" />}
            change={`${data.sales?.invoiceCount || 0} فاتورة`}
            gradient="bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-900 shadow-lg shadow-primary-500/10"
          />
        )}
        {can('invoices', 'read') && (
          <StatCard
            title={t('dashboard_page.titles.kar7gk6')}
            value={`${fmt(data.sales?.totalPaid)} ج.م`}
            icon={<CreditCard className="w-5 h-5" />}
            change="المبالغ المحصلة"
            gradient="bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 shadow-lg shadow-emerald-500/10"
          />
        )}
        {can('reports', 'read') && (
          <StatCard
            title={t('dashboard_page.titles.ke6czak')}
            value={`${fmt(data.sales?.totalOutstanding)} ج.م`}
            icon={<Clock className="w-5 h-5" />}
            change={`${data.installments?.overdueCount || 0} متأخرة`}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-800 shadow-lg shadow-amber-500/10"
          />
        )}
        {can('products', 'read') && (
          <StatCard
            title={t('dashboard_page.titles.ks0nri5')}
            value={`${(data.stock?.inStock || 0) + (data.stock?.lowStock || 0) + (data.stock?.outOfStock || 0)}`}
            icon={<Boxes className="w-5 h-5" />}
            change={`${data.stock?.lowStock || 0} منخفض, ${data.stock?.outOfStock || 0} نافد`}
            gradient="bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-800 shadow-lg shadow-rose-500/10"
          />
        )}
      </div>

      {(collections?.overdue?.items?.length || 0) > 0 && can('reports', 'read') && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 animate-slide-up dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              لديك {collections.overdue.items.length} قسط متأخر بإجمالي {fmt(collections.overdue.total)} ج.م
            </p>
            <p className="text-xs text-red-500/70">
              {collections.overdue.items.slice(0, 3).map((item) => item.customer?.name).join(' • ')}
            </p>
          </div>
          <Link to="/reports" className="flex-shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white">
            {t('dashboard_page.ui.ku5ftfg')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <AIStockWidget />

        {can('reports', 'read') && (
          <Card className="p-5 lg:col-span-2">
            <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('dashboard_page.ui.kwktnaq')}</h3>
            {data.monthlySales?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.monthlySales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} dx={-10} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: 13,
                      fontFamily: 'Cairo',
                      backgroundColor: 'rgba(255,255,255,0.96)',
                    }}
                    itemStyle={{ fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(v) => [`${v.toLocaleString('ar-EG')} ج.م`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#818CF8"
                    fill="url(#colorSales)"
                    strokeWidth={3}
                    name="المبيعات"
                    dot={{ r: 4, fill: '#818CF8', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title={t('dashboard_page.titles.klhlwvh')}
                description="ستظهر حركة المبيعات الشهرية هنا بمجرد تسجيل فواتير ومبيعات جديدة."
                className="h-60 py-4"
              />
            )}
          </Card>
        )}

        {(can('reports', 'read') || can('invoices', 'read')) && (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
                <Calendar className="h-4 w-4 text-primary-500" />
                {t('dashboard_page.ui.k5ldmtq')}
              </h3>
              <Link to="/reports" className="text-xs font-semibold text-primary-500 hover:underline">
                {t('dashboard_page.ui.kwbgoww')}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 dark:border-primary-500/20 dark:bg-primary-500/10">
                <p className="mb-1 text-[10px] font-bold text-primary-500">{t('dashboard_page.ui.kfdwama')}</p>
                <p className="text-xl font-black text-primary-600">{fmt(collections?.today?.total || 0)} ج.م</p>
                <p className="text-[10px] text-gray-400">{collections?.today?.items?.length || 0} قسط</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="mb-1 text-[10px] font-bold text-amber-500">{t('dashboard_page.ui.kahs1jq')}</p>
                <p className="text-xl font-black text-amber-600">{fmt(collections?.week?.total || 0)} ج.م</p>
                <p className="text-[10px] text-gray-400">{collections?.week?.items?.length || 0} قسط</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="mb-1 text-[10px] font-bold text-red-500">{t('dashboard_page.ui.k3hiy14')}</p>
                <p className="text-xl font-black text-red-600">{fmt(collections?.overdue?.total || 0)} ج.م</p>
                <p className="text-[10px] text-gray-400">{collections?.overdue?.items?.length || 0} قسط</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <Card className="p-5">
          <h3 className="mb-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('dashboard_page.ui.kmhof7v')}</h3>
          {data.topProducts?.length > 0 ? (
            <div className="space-y-2">
              {data.topProducts.map((product, index) => (
                <div key={index} className="group flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold transition-transform group-hover:scale-110 ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{product.productName}</p>
                    <p className="text-xs text-muted">{product.totalSold} قطعة</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-500">{fmt(product.totalRevenue)} ج.م</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Boxes}
              title={t('dashboard_page.titles.kri2tuz')}
              description="عند بدء المبيعات ستظهر المنتجات الأعلى أداءً هنا."
              className="h-40 py-4"
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('dashboard_page.ui.k7ojc6v')}</h3>
            <Link to="/invoices" className="text-xs font-semibold text-primary-500 hover:underline">
              {t('dashboard_page.ui.kwbgoww')}
            </Link>
          </div>
          {data.recentInvoices?.length > 0 ? (
            <div className="space-y-2">
              {data.recentInvoices.slice(0, 6).map((invoice, index) => (
                <div key={index} className="group flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</p>
                    <p className="text-[10px] text-muted">{invoice.customer?.name || '—'}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(invoice.totalAmount)}</span>
                  <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}>
                    {invoice.status === 'paid' ? t('dashboard_page.ui.kpbinfs') : invoice.status === 'overdue' ? t('dashboard_page.ui.kpbetmp') : 'جزئي'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title={t('dashboard_page.titles.kimgir5')}
              description="ستظهر آخر الفواتير المسجلة هنا تلقائيًا."
              className="py-6"
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const body = (
            <div className="app-surface h-full rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.accentClass}`}>
                <Icon className={`h-5 w-5 ${card.iconClass}`} />
              </div>
              <p className="text-xl font-black text-gray-900 dark:text-white">{card.value}</p>
              <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{card.label}</p>
              {card.subtext ? <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">{card.subtext}</p> : null}
            </div>
          );

          if (card.to) {
            return (
              <Link key={card.key} to={card.to} className="group">
                {body}
              </Link>
            );
          }

          return <div key={card.key}>{body}</div>;
        })}
      </div>
    </div>
  );
}
