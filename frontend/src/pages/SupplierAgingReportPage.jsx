import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Truck, TrendingUp, AlertTriangle, Clock, DollarSign,
    Download, Filter, ChevronDown, ChevronUp, Printer, FileSpreadsheet,
    Phone, Eye, RefreshCw, PieChart, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardApi } from '../store';
import { Card, Button, Badge, Input, LoadingSpinner } from '../components/UI';
import Pagination from '../components/Pagination';

// Aging buckets configuration (Same as backend logic)
const AGING_BUCKETS = [
    { key: 'current', label: 'الحالي (0-30)', color: 'emerald' },
    { key: 'days30', label: '31-60 يوم', color: 'amber' },
    { key: 'days61', label: '61-90 يوم', color: 'orange' },
    { key: 'days90', label: '91-120 يوم', color: 'red' },
    { key: 'over90', label: '+120 يوم', color: 'rose' },
];

const BUCKET_STYLES = {
    current: { text: 'text-emerald-600 dark:text-emerald-400' },
    days30: { text: 'text-amber-600 dark:text-amber-400' },
    days61: { text: 'text-orange-600 dark:text-orange-400' },
    days90: { text: 'text-red-600 dark:text-red-400' },
    over90: { text: 'text-rose-600 dark:text-rose-400' },
};

export default function SupplierAgingReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('total');
    const [sortDir, setSortDir] = useState('desc');
    const [filterBucket, setFilterBucket] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 15;

    useEffect(() => {
        fetchAgingData();
    }, []);

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const res = await dashboardApi.getSupplierAgingReport();
            setData(res.data.data);
        } catch (err) {
            toast.error('خطأ في تحميل تقرير أعمار ديون الموردين');
        } finally {
            setLoading(false);
        }
    };

    const filteredSuppliers = useMemo(() => {
        if (!data?.suppliers) return [];
        let result = [...data.suppliers];

        // Search
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(sup =>
                sup.name?.toLowerCase().includes(s) ||
                sup.phone?.includes(s)
            );
        }

        // Bucket Filter
        if (filterBucket !== 'all') {
            result = result.filter(sup => (sup[filterBucket] || 0) > 0);
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortBy] || 0;
            let bVal = b[sortBy] || 0;
            if (sortBy === 'name') {
                aVal = a.name || '';
                bVal = b.name || '';
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [data, search, filterBucket, sortBy, sortDir]);

    const totalPages = Math.ceil(filteredSuppliers.length / limit);
    const paginated = filteredSuppliers.slice((page - 1) * limit, page * limit);

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');

    const exportCSV = () => {
        const headers = ['المورد', 'الهاتف', 'الإجمالي', '0-30', '31-60', '61-90', '91-120', '+120'];
        const rows = filteredSuppliers.map(s => [
            s.name, s.phone, s.total, s.current, s.days30, s.days61, s.days90, s.over90
        ]);
        let csv = '\uFEFF' + headers.join(',') + '\n';
        rows.forEach(r => csv += r.join(',') + '\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SupplierAging_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('تم التصدير بنجاح ✅');
    };

    if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-4"><LoadingSpinner size="lg" /><p className="text-gray-500 animate-pulse">جاري تحليل أعمار الديون...</p></div>;

    const summary = data?.summary || {};

    return (
        <div className="space-y-6 animate-fade-in pb-10 app-text-soft">
            {/* Header */}
            <div className="app-surface-muted flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="app-surface flex h-12 w-12 items-center justify-center rounded-2xl text-primary-600 dark:text-primary-300">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">أعمار ديون الموردين</h1>
                        <p className="text-sm text-gray-400">تحليل المديونيات المستحقة للموردين حسب الفترة الزمنية</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={fetchAgingData}><RefreshCw className="w-4 h-4" /></Button>
                    <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /> طباعة</Button>
                    <Button onClick={exportCSV}><FileSpreadsheet className="w-4 h-4" /> تصدير</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <Card className="app-surface-muted p-4 border-primary-100 dark:border-primary-900/20">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-primary-600 mb-1">إجمالي المستحقات</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(summary.total)} <span className="text-[10px]">ج.م</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">{summary.supplierCount} مورد</p>
                </Card>

                {AGING_BUCKETS.map(b => (
                    <Card
                        key={b.key}
                        className={`app-surface-muted cursor-pointer p-4 transition-all duration-200 hover:border-primary-300 motion-safe:hover:-translate-y-0.5 ${filterBucket === b.key ? 'ring-2 ring-primary-500' : ''}`}
                        onClick={() => setFilterBucket(filterBucket === b.key ? 'all' : b.key)}
                    >
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">{b.label}</p>
                        <p className={`text-xl font-black ${BUCKET_STYLES[b.key]?.text}`}>{fmt(summary[b.key] || 0)}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{((summary[b.key] / Math.max(summary.total, 1)) * 100).toFixed(1)}%</p>
                    </Card>
                ))}
            </div>

            {/* Main Content */}
            <Card className="app-surface overflow-hidden rounded-3xl">
                <div className="app-surface-muted flex flex-col items-center justify-between gap-4 border-b border-gray-100/80 p-4 dark:border-white/10 sm:flex-row">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            className="app-surface w-full rounded-xl border border-transparent py-2 pl-4 pr-10 text-sm transition-all outline-none"
                            placeholder="بحث بالمورد..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span>يتم احتساب العمر من تاريخ إنشاء فاتورة المشتريات</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="app-surface-muted text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                <th className="px-6 py-4 cursor-pointer hover:text-primary-500" onClick={() => toggleSort('name')}>
                                    <div className="flex items-center gap-2">المورد <SortIcon field="name" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-primary-500 text-center" onClick={() => toggleSort('total')}>
                                    <div className="flex items-center justify-center gap-2">الإجمالي <SortIcon field="total" /></div>
                                </th>
                                <th className="px-6 py-4 text-center">0-30 يوم</th>
                                <th className="px-6 py-4 text-center">31-60 يوم</th>
                                <th className="px-6 py-4 text-center">61-90 يوم</th>
                                <th className="px-6 py-4 text-center">91-120 يوم</th>
                                <th className="px-6 py-4 text-center">+120 يوم</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {paginated.map(s => (
                                <tr key={s._id} className="group transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                                {s.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                                                <p className="text-[10px] text-gray-400">{s.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-gray-900 dark:text-white">{fmt(s.total)}</td>
                                    <td className={`px-6 py-4 text-center text-xs ${s.current > 0 ? 'text-emerald-600 font-bold' : 'text-gray-300'}`}>{s.current > 0 ? fmt(s.current) : '-'}</td>
                                    <td className={`px-6 py-4 text-center text-xs ${s.days30 > 0 ? 'text-amber-600 font-bold' : 'text-gray-300'}`}>{s.days30 > 0 ? fmt(s.days30) : '-'}</td>
                                    <td className={`px-6 py-4 text-center text-xs ${s.days61 > 0 ? 'text-orange-600 font-bold' : 'text-gray-300'}`}>{s.days61 > 0 ? fmt(s.days61) : '-'}</td>
                                    <td className={`px-6 py-4 text-center text-xs ${s.days90 > 0 ? 'text-red-500 font-bold' : 'text-gray-300'}`}>{s.days90 > 0 ? fmt(s.days90) : '-'}</td>
                                    <td className={`px-6 py-4 text-center text-xs ${s.over90 > 0 ? 'text-rose-600 font-black underline' : 'text-gray-300'}`}>{s.over90 > 0 ? fmt(s.over90) : '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        {s.status === 'critical' ? <Badge variant="danger">خطير</Badge> :
                                            s.status === 'warning' ? <Badge variant="warning">متأخر</Badge> :
                                                s.status === 'delayed' ? <Badge variant="warning" className="opacity-70">قريب</Badge> :
                                                    <Badge variant="success">منتظم</Badge>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredSuppliers.length > limit && (
                    <div className="border-t border-gray-100/80 p-4 dark:border-white/10">
                        <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredSuppliers.length} onPageChange={setPage} />
                    </div>
                )}
            </Card>

            {/* Print Specific CSS */}
            <style>{`
        @media print {
            header, .no-print, button, input { display: none !important; }
            .Card { border: none !important; box-shadow: none !important; }
            body { background: white !important; font-size: 10pt; }
        }
      `}</style>
        </div>
    );
}
