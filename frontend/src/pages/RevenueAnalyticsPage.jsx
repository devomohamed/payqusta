import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp, Users, DollarSign, Activity, ArrowUpRight,
    ArrowDownRight, BarChart3, UserCheck, UserX
} from 'lucide-react';
import { api } from '../store';
import { EmptyState, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useThemeStore } from '../store';

export default function RevenueAnalyticsPage() {
  const { t } = useTranslation('admin');
    const { dark } = useThemeStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/admin/analytics/revenue');
            setData(res.data.data);
        } catch (err) {
            notify.error(t('revenue_analytics_page.toasts.kgszud7'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" text="جاري تحميل تحليلات الإيرادات..." />;
    }
    if (!data) {
        return (
            <EmptyState
                icon={BarChart3}
                title={t('revenue_analytics_page.titles.km3iafu')}
                description="تعذر تحميل تحليلات الإيرادات حاليًا. جرّب التحديث مرة أخرى."
                action={{ label: t('revenue_analytics_page.ui.k267yxq'), onClick: fetchAnalytics }}
            />
        );
    }

    const fmt = (v) => Number(v || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });

    return (
        <div className="space-y-6 max-w-7xl mx-auto app-text-soft">
            {/* Header */}
            <div className="app-surface-muted mb-2 flex items-center gap-3 rounded-3xl p-5">
                <div className="app-surface flex items-center justify-center rounded-2xl p-3 text-indigo-600 dark:text-indigo-300">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{t('revenue_analytics_page.ui.k3zdiqg')}</h1>
                    <p className="text-sm text-gray-400">{t('revenue_analytics_page.ui.k7xfpty')}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    dark={dark} icon={DollarSign} label="MRR"
                    value={`${fmt(data.revenue?.mrr)} جنيه`}
                    sub={`ARPU: ${fmt(data.revenue?.arpu)} جنيه`}
                    color="from-green-500 to-emerald-600"
                />
                <KPICard
                    dark={dark} icon={Users} label={t('revenue_analytics_page.form.k288n8w')}
                    value={data.tenants?.total}
                    sub={`مدفوع: ${data.tenants?.paid} | تجريبي: ${data.tenants?.trial}`}
                    color="from-blue-500 to-indigo-600"
                />
                <KPICard
                    dark={dark} icon={UserCheck} label={t('revenue_analytics_page.form.kewoh79')}
                    value={`${data.conversion?.rate || 0}%`}
                    sub="Trial → Paid"
                    color="from-purple-500 to-violet-600"
                />
                <KPICard
                    dark={dark} icon={UserX} label="Churn Rate"
                    value={`${data.churn?.rate || 0}%`}
                    sub={`${data.churn?.count || 0} متجر ألغوا هذا الشهر`}
                    color="from-red-500 to-pink-600"
                />
            </div>

            {/* Activity + Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Activity */}
                <div className="app-surface rounded-3xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" /> نشاط المستخدمين
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="app-surface-muted rounded-2xl p-4">
                            <p className="text-sm text-gray-400 mb-1">{t('revenue_analytics_page.ui.kce1p9g')}</p>
                            <p className="text-3xl font-bold">{data.activity?.dau || 0}</p>
                        </div>
                        <div className="app-surface-muted rounded-2xl p-4">
                            <p className="text-sm text-gray-400 mb-1">{t('revenue_analytics_page.ui.khrfy2h')}</p>
                            <p className="text-3xl font-bold">{data.activity?.wau || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Revenue Comparison */}
                <div className="app-surface rounded-3xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" /> مقارنة الإيرادات
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="app-surface-muted rounded-2xl p-4">
                            <p className="text-sm text-gray-400 mb-1">{t('revenue_analytics_page.ui.kze6jsv')}</p>
                            <p className="text-2xl font-bold">{fmt(data.revenue?.thisMonth)} جنيه</p>
                        </div>
                        <div className="app-surface-muted rounded-2xl p-4">
                            <p className="text-sm text-gray-400 mb-1">{t('revenue_analytics_page.ui.k47lnke')}</p>
                            <p className="text-2xl font-bold">{fmt(data.revenue?.lastMonth)} جنيه</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {data.revenue?.growth >= 0 ? (
                            <ArrowUpRight className="w-5 h-5 text-green-500" />
                        ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`font-bold text-lg ${data.revenue?.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {data.revenue?.growth || 0}%
                        </span>
                        <span className="text-sm text-gray-400">{t('revenue_analytics_page.ui.kyjcbwj')}</span>
                    </div>
                </div>
            </div>

            {/* Growth Over Time */}
            {data.growthOverTime?.length > 0 && (
                <div className="app-surface rounded-3xl p-6">
                    <h3 className="text-lg font-bold mb-4">{t('revenue_analytics_page.ui.ktywa1j')}</h3>
                    <div className="flex items-end gap-3 h-40">
                        {data.growthOverTime.map((item, idx) => {
                            const maxCount = Math.max(...data.growthOverTime.map(g => g.count));
                            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold">{item.count}</span>
                                    <div
                                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all"
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                    ></div>
                                    <span className="text-xs text-gray-400">{item._id?.slice(5)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ dark, icon: Icon, label, value, sub, color }) {
    return (
        <div className="app-surface-muted rounded-3xl p-5 transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="app-text-soft text-sm">{label}</span>
            </div>
            <p className="text-2xl font-bold mb-1">{value}</p>
            {sub && <p className="app-text-soft text-xs">{sub}</p>}
        </div>
    );
}
