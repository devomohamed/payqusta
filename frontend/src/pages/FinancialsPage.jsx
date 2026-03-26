import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    Calendar,
    ArrowRightLeft,
    Filter,
    Download,
    PieChart,
    BarChart2,
    AlertCircle
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { EmptyState, LoadingSpinner } from '../components/UI';

const FinancialsPage = () => {
    const { t } = useTranslation('admin');
    const [activeTab, setActiveTab] = useState('pnl'); // pnl, ledger, forecast
    const [pnlData, setPnlData] = useState(null);
    const [ledgerData, setLedgerData] = useState([]);
    const [forecastData, setForecastData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        fetchFinancialData();
    }, [activeTab, dateRange]);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pnl') {
                const res = await api.get('/reports/pnl', { params: dateRange });
                setPnlData(res.data.data);
            } else if (activeTab === 'ledger') {
                const res = await api.get('/reports/ledger', { params: dateRange });
                setLedgerData(res.data.data);
            } else if (activeTab === 'forecast') {
                const res = await api.get('/reports/cash-flow-forecast');
                setForecastData(res.data.data);
            }
        } catch (error) {
            console.error('Financial fetch error:', error);
            if (error.response?.status === 403) {
                toast.error(t('financials_page.toasts.kkn4gar'));
            } else {
                toast.error(t('financials_page.toasts.khhl5w8'));
            }
        } finally {
            setLoading(false);
        }
    };

    const SummaryCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
        <div className="app-surface-muted rounded-3xl p-6 transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-bold ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trendValue}%
                    </div>
                )}
            </div>
            <h3 className="app-text-soft text-sm font-medium">{title}</h3>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {parseFloat(value).toLocaleString('ar-EG')} ج.م
            </div>
        </div>
    );

    const highlights = activeTab === 'pnl'
        ? [
            { label: t('financials_page.ui.kdbxbne'), value: `${parseFloat(pnlData?.revenue?.gross || 0).toLocaleString('ar-EG')} ج.م` },
            { label: t('financials_page.ui.ksa21zm'), value: `${parseFloat(pnlData?.operatingExpenses?.total || 0).toLocaleString('ar-EG')} ج.م` },
            { label: t('financials_page.ui.krtt038'), value: `${parseFloat(pnlData?.netProfit || 0).toLocaleString('ar-EG')} ج.م` },
        ]
        : activeTab === 'ledger'
            ? [
                { label: t('financials_page.ui.kzdpht1'), value: `${ledgerData.length.toLocaleString('ar-EG')}` },
                { label: t('financials_page.ui.kh1xly5'), value: dateRange.startDate },
                { label: t('financials_page.ui.kxi0a'), value: dateRange.endDate },
            ]
            : [
                { label: t('financials_page.ui.ke131co'), value: `${parseFloat(forecastData?.next30Days?.inflow || 0).toLocaleString('ar-EG')} ج.م` },
                { label: t('financials_page.ui.ke13oaa'), value: `${parseFloat(forecastData?.next30Days?.outflow || 0).toLocaleString('ar-EG')} ج.م` },
                { label: t('financials_page.ui.kab7pe0'), value: `${parseFloat(forecastData?.next30Days?.net || 0).toLocaleString('ar-EG')} ج.م` },
            ];

    return (
        <div className="space-y-6 app-text-soft">
            <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-700 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(14,116,144,0.9)] sm:px-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
                            <DollarSign className="h-3.5 w-3.5" />
                            {t('financials_page.ui.k3lx2n6')}
                        </div>
                        <h1 className="mt-4 flex items-center gap-2 text-2xl font-black sm:text-3xl">
                            {t('financials_page.ui.kxs18xo')}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
                            {t('financials_page.ui.kasl4dw')}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
                        {highlights.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                                <p className="text-xs font-bold text-white/65">{item.label}</p>
                                <p className="mt-2 text-lg font-black">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="app-surface-muted overflow-x-auto rounded-2xl p-1 no-scrollbar">
                <div className="flex min-w-max gap-2">
                    {['pnl', 'ledger', 'forecast'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${activeTab === tab
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'app-text-soft hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                                }`}
                        >
                            {tab === 'pnl' ? t('financials_page.ui.kdnib39') : tab === 'ledger' ? t('financials_page.ui.kclr6n') : 'توقعات السيولة'}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab !== 'forecast' && (
                <div className="app-surface-muted grid grid-cols-1 gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">{t('financials_page.ui.kvg5iix')}</span>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="app-surface rounded-xl border border-transparent p-2 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{t('financials_page.ui.ksuia8')}</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="app-surface rounded-xl border border-transparent p-2 text-sm"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30">
                        <Download className="w-5 h-5" />
                        {t('financials_page.ui.k2idb32')}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="min-h-[400px]">
                    <LoadingSpinner size="lg" text="جاري تحميل البيانات المالية..." />
                </div>
            ) : (
                <>
                    {activeTab === 'pnl' && pnlData ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <SummaryCard
                                    title={t('financials_page.titles.ktvonbd')}
                                    value={pnlData.revenue.gross}
                                    icon={TrendingUp}
                                    color="bg-green-100 text-green-700"
                                />
                                <SummaryCard
                                    title={t('financials_page.titles.k147tnu')}
                                    value={pnlData.cogs.total}
                                    icon={FileText}
                                    color="bg-amber-100 text-amber-700"
                                />
                                <SummaryCard
                                    title={t('financials_page.titles.kfsf8vz')}
                                    value={pnlData.operatingExpenses.total}
                                    icon={TrendingDown}
                                    color="bg-red-100 text-red-700"
                                />
                                <SummaryCard
                                    title={t('financials_page.titles.krtt038')}
                                    value={pnlData.netProfit}
                                    icon={DollarSign}
                                    color="bg-indigo-100 text-indigo-700"
                                    trend={pnlData.netMargin > 0 ? 'up' : 'down'}
                                    trendValue={pnlData.netMargin}
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* P&L Statement */}
                                <div className="app-surface overflow-hidden rounded-3xl">
                                    <div className="app-surface-muted border-b border-gray-100/80 p-6 dark:border-white/10">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-indigo-600" />
                                            {t('financials_page.ui.k5ttowq')}
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>{t('financials_page.ui.kgn5rlm')}</span>
                                            <span className="text-green-600">{pnlData.revenue.gross.toLocaleString()} ج.م</span>
                                        </div>
                                        <div className="pl-4 space-y-2 text-sm text-gray-500">
                                            <div className="flex justify-between">
                                                <span>{t('financials_page.ui.kjhhvv6')}</span>
                                                <span>{pnlData.revenue.gross.toLocaleString()} ج.م</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>{t('financials_page.ui.kacum0')}</span>
                                            <span className="text-red-600">({pnlData.cogs.total.toLocaleString()}) ج.م</span>
                                        </div>

                                        <div className="app-surface-muted flex items-center justify-between rounded-2xl p-3 text-lg font-bold">
                                            <span>{t('financials_page.ui.ktmsptu')}</span>
                                            <span>{(pnlData.revenue.gross - pnlData.cogs.total).toLocaleString()} ج.م</span>
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="text-lg font-bold mb-2">{t('financials_page.ui.k83z00m')}</div>
                                        <div className="space-y-3">
                                            {Object.entries(pnlData.operatingExpenses.breakdown).map(([cat, amount]) => (
                                                <div key={cat} className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400 capitalize">{cat}</span>
                                                    <span className="font-medium text-red-500">{amount.toLocaleString()} ج.م</span>
                                                </div>
                                            ))}
                                            {Object.keys(pnlData.operatingExpenses.breakdown).length === 0 && (
                                                <div className="text-center text-gray-400 py-4 text-sm italic">{t('financials_page.ui.kigkbil')}</div>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="flex justify-between items-center text-xl font-black p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                                            <span>{t('financials_page.ui.k3rj527')}</span>
                                            <span>{pnlData.netProfit.toLocaleString()} ج.م</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Insights */}
                                <div className="space-y-6">
                                    <div className="app-surface rounded-3xl p-6">
                                        <h3 className="font-bold mb-4 flex items-center gap-2">
                                            <PieChart className="w-5 h-5 text-indigo-600" />
                                            {t('financials_page.ui.kphzldv')}
                                        </h3>
                                        <div className="h-[200px] flex items-center justify-center text-gray-400">
                                            {/* Graphics would go here */}
                                            <BarChart2 className="w-16 h-16 opacity-10" />
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-900/50 dark:bg-indigo-900/20">
                                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            {t('financials_page.ui.ki7q678')}
                                        </h3>
                                        <ul className="space-y-3 text-sm text-indigo-800 dark:text-indigo-200">
                                            <li className="flex gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                                                <span>هامش الربح الإجمالي لديك هو {pnlData.cogs.margin}%، وهو ضمن المعدل الطبيعي.</span>
                                            </li>
                                            {pnlData.operatingExpenses.total > (pnlData.netProfit * 0.5) && (
                                                <li className="flex gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                                    <span>{t('financials_page.ui.k2itkps')}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'pnl' ? (
                        <EmptyState
                            icon={FileText}
                            title={t('financials_page.titles.kvkz5oh')}
                            description="تعذر تحميل بيانات الفترة الحالية. جرّب تغيير الفترة أو إعادة التحديث."
                            action={{ label: t('financials_page.ui.k267yxq'), onClick: fetchFinancialData }}
                        />
                    ) : null}

                    {activeTab === 'ledger' && (
                        <div className="app-surface overflow-hidden rounded-3xl animate-fade-in">
                            <div className="space-y-3 p-4 md:hidden">
                                {ledgerData.map((entry, idx) => (
                                    <div key={`${entry.date}-${idx}`} className="app-surface-muted rounded-2xl p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{entry.title}</p>
                                                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                                                    {format(new Date(entry.date), 'dd MMMM yyyy', { locale: ar })}
                                                </p>
                                            </div>
                                            <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${entry.type === 'sale' ? 'bg-green-100 text-green-700' :
                                                    entry.type === 'expense' ? 'bg-red-100 text-red-700' :
                                                        entry.type === 'purchase' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-100 text-blue-700'
                                                }`}>
                                                {entry.type}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                                                <p className="text-[10px] text-gray-400">{t('financials_page.ui.ktejie')}</p>
                                                <p className="mt-1 text-xs font-black text-green-600">{entry.debit > 0 ? entry.debit.toLocaleString('ar-EG') : '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                                                <p className="text-[10px] text-gray-400">{t('financials_page.ui.kt0b08')}</p>
                                                <p className="mt-1 text-xs font-black text-red-600">{entry.credit > 0 ? entry.credit.toLocaleString('ar-EG') : '-'}</p>
                                            </div>
                                        </div>
                                        <p className={`mt-3 text-xs font-semibold ${entry.status === 'paid' || entry.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                                            ● {entry.status === 'paid' || entry.status === 'completed' ? t('financials_page.ui.kpbuy23') : 'معلق'}
                                        </p>
                                    </div>
                                ))}
                                {ledgerData.length === 0 && (
                                    <EmptyState
                                        icon={ArrowRightLeft}
                                        title={t('financials_page.titles.k5l228v')}
                                        description="لا توجد قيود أو حركات ضمن الفترة المحددة."
                                        className="py-4"
                                    />
                                )}
                            </div>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="app-surface-muted text-sm uppercase text-gray-500 dark:text-gray-400">
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.kzbvdnf')}</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.kovec2i')}</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.ka1r9us')}</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.kwsuab0')}</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.kpgk97o')}</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">{t('financials_page.ui.kabct8k')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100/70 dark:divide-white/5">
                                        {ledgerData.map((entry, idx) => (
                                            <tr key={idx} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                                <td className="p-4 text-sm font-medium">
                                                    {format(new Date(entry.date), 'dd MMMM yyyy', { locale: ar })}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${entry.type === 'sale' ? 'bg-green-100 text-green-700' :
                                                            entry.type === 'expense' ? 'bg-red-100 text-red-700' :
                                                                entry.type === 'purchase' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm">{entry.title}</td>
                                                <td className="p-4 font-bold text-green-600">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                                                <td className="p-4 font-bold text-red-600">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                                                <td className="p-4">
                                                    <span className={`text-xs ${entry.status === 'paid' || entry.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                                                        ● {entry.status === 'paid' || entry.status === 'completed' ? t('financials_page.ui.kpbuy23') : 'معلق'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {ledgerData.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-4">
                                                    <EmptyState
                                                        icon={ArrowRightLeft}
                                                        title={t('financials_page.titles.k5l228v')}
                                                        description="لا توجد قيود أو حركات ضمن الفترة المحددة."
                                                        className="py-4"
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'forecast' && forecastData ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-3xl text-white shadow-xl shadow-green-500/20">
                                <h4 className="text-green-100 text-sm font-bold mb-2">{t('financials_page.ui.kjbslo7')}</h4>
                                <div className="text-3xl font-black mb-4">+{forecastData.next30Days.inflow.toLocaleString()} ج.م</div>
                                <div className="text-xs opacity-80">{t('financials_page.ui.k4bzksr')}</div>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 rounded-3xl text-white shadow-xl shadow-red-500/20">
                                <h4 className="text-red-100 text-sm font-bold mb-2">{t('financials_page.ui.khae2vu')}</h4>
                                <div className="text-3xl font-black mb-4">-{forecastData.next30Days.outflow.toLocaleString()} ج.م</div>
                                <div className="text-xs opacity-80">{t('financials_page.ui.k75440x')}</div>
                            </div>
                            <div className="app-surface-muted flex flex-col justify-center rounded-3xl border-2 border-dashed border-gray-200 p-8 dark:border-white/10">
                                <h4 className="text-gray-500 text-sm font-bold mb-2">{t('financials_page.ui.kczgg08')}</h4>
                                <div className={`text-3xl font-black ${forecastData.next30Days.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                    {forecastData.next30Days.net.toLocaleString()} ج.m
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'forecast' ? (
                        <EmptyState
                            icon={BarChart2}
                            title={t('financials_page.titles.k655lug')}
                            description="تعذر تحميل توقعات التدفق النقدي في الوقت الحالي."
                            action={{ label: t('financials_page.ui.k267yxq'), onClick: fetchFinancialData }}
                        />
                    ) : null}
                </>
            )}
        </div>
    );
};

export default FinancialsPage;
