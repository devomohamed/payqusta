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
                toast.error('هذه الميزة تتطلب باقة التقارير المتقدمة');
            } else {
                toast.error('فشل تحميل البيانات المالية');
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

    return (
        <div className="space-y-6 app-text-soft">
            <div className="app-surface-muted flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-indigo-600" />
                        التقارير المالية والمحاسبية
                    </h1>
                    <p className="app-text-soft">تتبع الأرباح، دفتر الأستاذ، وتوقعات السيولة</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="app-surface flex rounded-2xl p-1">
                        {['pnl', 'ledger', 'forecast'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${activeTab === tab
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'app-text-soft hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                                    }`}
                            >
                                {tab === 'pnl' ? 'الأرباح والخسائر' : tab === 'ledger' ? 'دفتر الأستاذ' : 'توقعات السيولة'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeTab !== 'forecast' && (
                <div className="app-surface-muted flex flex-wrap items-center gap-4 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">الفترة من:</span>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="app-surface rounded-xl border border-transparent p-2 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">إلى:</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="app-surface rounded-xl border border-transparent p-2 text-sm"
                        />
                    </div>
                    <button className="mr-auto flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30">
                        <Download className="w-5 h-5" />
                        تصدير Excel
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
                                    title="إجمالي الإيرادات"
                                    value={pnlData.revenue.gross}
                                    icon={TrendingUp}
                                    color="bg-green-100 text-green-700"
                                />
                                <SummaryCard
                                    title="تكلفة البضاعة (COGS)"
                                    value={pnlData.cogs.total}
                                    icon={FileText}
                                    color="bg-amber-100 text-amber-700"
                                />
                                <SummaryCard
                                    title="إجمالي المصاريف"
                                    value={pnlData.operatingExpenses.total}
                                    icon={TrendingDown}
                                    color="bg-red-100 text-red-700"
                                />
                                <SummaryCard
                                    title="صافي الربح"
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
                                            قائمة الأرباح والخسائر التفصيلية
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>الإيرادات التشغيلية</span>
                                            <span className="text-green-600">{pnlData.revenue.gross.toLocaleString()} ج.م</span>
                                        </div>
                                        <div className="pl-4 space-y-2 text-sm text-gray-500">
                                            <div className="flex justify-between">
                                                <span>مبيعات المنتجات</span>
                                                <span>{pnlData.revenue.gross.toLocaleString()} ج.م</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="flex justify-between items-center text-lg font-bold">
                                            <span>تكلفة النشاط</span>
                                            <span className="text-red-600">({pnlData.cogs.total.toLocaleString()}) ج.م</span>
                                        </div>

                                        <div className="app-surface-muted flex items-center justify-between rounded-2xl p-3 text-lg font-bold">
                                            <span>مجمل الربح (Gross Profit)</span>
                                            <span>{(pnlData.revenue.gross - pnlData.cogs.total).toLocaleString()} ج.م</span>
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="text-lg font-bold mb-2">مصروفات التشغيل</div>
                                        <div className="space-y-3">
                                            {Object.entries(pnlData.operatingExpenses.breakdown).map(([cat, amount]) => (
                                                <div key={cat} className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400 capitalize">{cat}</span>
                                                    <span className="font-medium text-red-500">{amount.toLocaleString()} ج.م</span>
                                                </div>
                                            ))}
                                            {Object.keys(pnlData.operatingExpenses.breakdown).length === 0 && (
                                                <div className="text-center text-gray-400 py-4 text-sm italic">لا توجد مصاريف مسجلة في هذه الفترة</div>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

                                        <div className="flex justify-between items-center text-xl font-black p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                                            <span>صافي الربح النهائي</span>
                                            <span>{pnlData.netProfit.toLocaleString()} ج.م</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Insights */}
                                <div className="space-y-6">
                                    <div className="app-surface rounded-3xl p-6">
                                        <h3 className="font-bold mb-4 flex items-center gap-2">
                                            <PieChart className="w-5 h-5 text-indigo-600" />
                                            توزيع المصروفات
                                        </h3>
                                        <div className="h-[200px] flex items-center justify-center text-gray-400">
                                            {/* Graphics would go here */}
                                            <BarChart2 className="w-16 h-16 opacity-10" />
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-900/50 dark:bg-indigo-900/20">
                                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            ملاحظات ذكية
                                        </h3>
                                        <ul className="space-y-3 text-sm text-indigo-800 dark:text-indigo-200">
                                            <li className="flex gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                                                <span>هامش الربح الإجمالي لديك هو {pnlData.cogs.margin}%، وهو ضمن المعدل الطبيعي.</span>
                                            </li>
                                            {pnlData.operatingExpenses.total > (pnlData.netProfit * 0.5) && (
                                                <li className="flex gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                                    <span>تنبيه: المصروفات التشغيلية مرتفعة نسبياً مقارنة بالأرباح.</span>
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
                            title="لا توجد بيانات أرباح وخسائر"
                            description="تعذر تحميل بيانات الفترة الحالية. جرّب تغيير الفترة أو إعادة التحديث."
                            action={{ label: 'إعادة المحاولة', onClick: fetchFinancialData }}
                        />
                    ) : null}

                    {activeTab === 'ledger' && (
                        <div className="app-surface overflow-hidden rounded-3xl animate-fade-in">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="app-surface-muted text-sm uppercase text-gray-500 dark:text-gray-400">
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">التاريخ</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">النوع</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">البيان / الوصف</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">مدين (+)</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">دائن (-)</th>
                                            <th className="border-b border-gray-100/80 p-4 font-bold dark:border-white/10">الحالة</th>
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
                                                        ● {entry.status === 'paid' || entry.status === 'completed' ? 'مكتمل' : 'معلق'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {ledgerData.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-4">
                                                    <EmptyState
                                                        icon={ArrowRightLeft}
                                                        title="لا توجد حركات مالية"
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
                                <h4 className="text-green-100 text-sm font-bold mb-2">تدفقات نقدية متوقعة (30 يوم)</h4>
                                <div className="text-3xl font-black mb-4">+{forecastData.next30Days.inflow.toLocaleString()} ج.م</div>
                                <div className="text-xs opacity-80">بناءً على أقساط العملاء المستحقة</div>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 rounded-3xl text-white shadow-xl shadow-red-500/20">
                                <h4 className="text-red-100 text-sm font-bold mb-2">التزامات نقدية متوقعة (30 يوم)</h4>
                                <div className="text-3xl font-black mb-4">-{forecastData.next30Days.outflow.toLocaleString()} ج.م</div>
                                <div className="text-xs opacity-80">تشمل المصاريف الدورية والموردين</div>
                            </div>
                            <div className="app-surface-muted flex flex-col justify-center rounded-3xl border-2 border-dashed border-gray-200 p-8 dark:border-white/10">
                                <h4 className="text-gray-500 text-sm font-bold mb-2">صافي التدفق (Net Flow)</h4>
                                <div className={`text-3xl font-black ${forecastData.next30Days.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                    {forecastData.next30Days.net.toLocaleString()} ج.m
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'forecast' ? (
                        <EmptyState
                            icon={BarChart2}
                            title="لا توجد توقعات متاحة"
                            description="تعذر تحميل توقعات التدفق النقدي في الوقت الحالي."
                            action={{ label: 'إعادة المحاولة', onClick: fetchFinancialData }}
                        />
                    ) : null}
                </>
            )}
        </div>
    );
};

export default FinancialsPage;
