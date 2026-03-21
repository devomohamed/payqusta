import React, { useState, useEffect } from 'react';
import {
    Users,
    TrendingUp,
    Award,
    Calendar,
    Activity,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    BarChart2,
    Trophy,
    Target,
    Zap
} from 'lucide-react';
import { api } from '../store';
import { Card, Badge, EmptyState, LoadingSpinner, Button } from '../components/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const StaffPerformancePage = () => {
    const [performance, setPerformance] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        from: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        fetchPerformance();
    }, [dateRange]);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bi/staff-performance', { params: dateRange });
            setPerformance(res.data.data.performance);
            setSummary(res.data.data.summary);
        } catch (error) {
            toast.error('فشل تحميل إحصائيات الموظفين');
        } finally {
            setLoading(false);
        }
    };

    const PerformanceCard = ({ staff, rank }) => (
        <Card className="app-surface-muted overflow-hidden border-2 border-transparent transition-all duration-300 group hover:border-indigo-500 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black relative ${rank === 1 ? 'bg-amber-100 text-amber-600 shadow-md shadow-amber-200' :
                                rank === 2 ? 'bg-gray-100 text-gray-600 shadow-md shadow-gray-200' :
                                    rank === 3 ? 'bg-orange-100 text-orange-600 shadow-md shadow-orange-200' :
                                        'bg-blue-100 text-blue-600'
                            }`}>
                            {staff.name.substring(0, 1)}
                            {rank <= 3 && (
                                <Award className={`w-6 h-6 absolute -top-2 -right-2 ${rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-gray-400' : 'text-orange-500'
                                    }`} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                {staff.name}
                            </h3>
                            <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                            {staff.stats.sales.toLocaleString('ar-EG')} ج.م
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">إجمالي المبيعات</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="app-surface rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 mb-1">حمولة التحصيل</p>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">%{Math.round((staff.stats.collected / (staff.stats.sales || 1)) * 100)}</span>
                            <Activity className="w-3 h-3 text-indigo-500" />
                        </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                        <p className="text-[10px] text-blue-500 mb-1">العمولة الـمـقدرة</p>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-blue-600">{staff.stats.commissionEarned.toLocaleString('ar-EG')} ج.م</span>
                            <DollarSign className="w-3 h-3 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>{staff.stats.actionCount} عملية</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>نشط {format(new Date(staff.stats.lastActive), 'dd MMM', { locale: ar })}</span>
                    </div>
                </div>
            </div>

            {/* Progress towards a fictional target of 50,000 */}
            <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
                <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (staff.stats.sales / 50000) * 100)}%` }}
                />
            </div>
        </Card>
    );

    const DollarSign = ({ className }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );

    const Clock = ({ className }) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );

    return (
        <div className="space-y-6 animate-fade-in p-6 app-text-soft">
            <div className="app-surface-muted flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="app-surface flex h-14 w-14 items-center justify-center rounded-3xl text-indigo-600 dark:text-indigo-300">
                        <Trophy className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">أداء فريق العمل</h1>
                        <p className="text-gray-500 dark:text-gray-400">لوحة الشرف ومتابعة الإنتاجية</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="app-surface flex items-center gap-2 rounded-2xl p-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="bg-transparent border-none text-xs font-bold focus:ring-0"
                        />
                        <span className="text-gray-300">|</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="bg-transparent border-none text-xs font-bold focus:ring-0"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner />
                </div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-600/20">
                            <h4 className="text-indigo-100 text-xs font-bold mb-1">إجمالي المبيعات (الفريق)</h4>
                            <div className="text-3xl font-black">{summary?.totalSales.toLocaleString('ar-EG')} ج.م</div>
                            <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <Users className="w-3 h-3" />
                                <span>{summary?.totalStaff} موظف نشط</span>
                            </div>
                        </Card>

                        <Card className="app-surface-muted p-6">
                            <h4 className="text-gray-400 text-xs font-bold mb-1">العمولات المستحقة</h4>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{summary?.totalCommission.toLocaleString('ar-EG')} ج.م</div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-3 py-1.5 rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                <span>تحسن بنسبة %12 عن الشهر الماضي</span>
                            </div>
                        </Card>

                        <Card className="app-surface-muted p-6">
                            <h4 className="text-gray-400 text-xs font-bold mb-1">متوسط نشاط الموظف</h4>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">
                                {Math.round(performance.reduce((s, p) => s + p.stats.actionCount, 0) / (performance.length || 1))} عملية
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/30 w-fit px-3 py-1.5 rounded-full">
                                <Target className="w-3 h-3" />
                                <span>تحقيق %85 من المستهدف اليومي</span>
                            </div>
                        </Card>
                    </div>

                    {/* Performance Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {performance.map((staff, idx) => (
                            <PerformanceCard key={staff._id} staff={staff} rank={idx + 1} />
                        ))}
                    </div>

                    {performance.length === 0 && (
                        <EmptyState
                            icon={Users}
                            title="لا توجد بيانات أداء للموظفين"
                            description="لم يتم العثور على نشاط خلال الفترة المحددة."
                            action={{ label: 'تحديث البيانات', onClick: fetchPerformance }}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default StaffPerformancePage;
