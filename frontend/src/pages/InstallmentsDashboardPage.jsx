import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Clock, DollarSign, AlertTriangle, CheckCircle,
    FileText, Search, CreditCard, ArrowUpRight, Plus, RefreshCw, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi, customersApi, api } from '../store';
import { Card, Button, Badge, Input, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import Pagination from '../components/Pagination';

export default function InstallmentsDashboardPage() {
    const PAGE_SIZE = 10;
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, overdue, all_debts
    const [loading, setLoading] = useState(true);

    // Data states
    const [upcoming, setUpcoming] = useState([]);
    const [overdue, setOverdue] = useState([]);
    const [debtors, setDebtors] = useState([]);
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [overduePage, setOverduePage] = useState(1);
    const [debtorsPage, setDebtorsPage] = useState(1);

    const [summary, setSummary] = useState({
        totalOutstanding: 0,
        totalOverdue: 0,
        upcomingAmount: 0
    });

    // Pay Modal Modal
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [paying, setPaying] = useState(false);

    const getInvoiceId = (invoice) => invoice?.invoiceId || invoice?._id;
    const getRemainingAmount = (invoice) => (
        Number(
            invoice?.invoiceRemaining ??
            invoice?.remainingAmount ??
            Math.max(0, Number(invoice?.amount || 0) - Number(invoice?.paidAmount || 0))
        ) || 0
    );

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
        if (upcomingPage > maxPage) setUpcomingPage(maxPage);
    }, [upcoming.length, upcomingPage]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(overdue.length / PAGE_SIZE));
        if (overduePage > maxPage) setOverduePage(maxPage);
    }, [overdue.length, overduePage]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(debtors.length / PAGE_SIZE));
        if (debtorsPage > maxPage) setDebtorsPage(maxPage);
    }, [debtors.length, debtorsPage]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'upcoming') {
                const { data } = await invoicesApi.getUpcoming(30); // Next 30 days
                setUpcoming(data.data || []);
            } else if (activeTab === 'overdue') {
                const { data } = await invoicesApi.getOverdue();
                setOverdue(data.data || []);
            } else if (activeTab === 'all_debts') {
                const { data } = await customersApi.getDebtors();
                setDebtors(data.data || []);
            }

            // Update summary independently or based on specific API if available
            // For now, calculating from loaded data if we can, 
            // otherwise, we might need a dedicated summary endpoint.
            if (activeTab === 'all_debts') {
                const total = (debtors || []).reduce((sum, c) => sum + (c.financials?.outstandingBalance || 0), 0);
                setSummary(prev => ({ ...prev, totalOutstanding: total }));
            }
        } catch (err) {
            toast.error('خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async () => {
        if (!payAmount || Number(payAmount) <= 0) return toast.error('أدخل مبلغ الدفع');
        const remainingAmount = getRemainingAmount(selectedInvoice);
        if (Number(payAmount) > remainingAmount) return toast.error('المبلغ أكبر من المتبقي');

        const invoiceId = getInvoiceId(selectedInvoice);
        if (!invoiceId) return toast.error('تعذر تحديد الفاتورة');

        setPaying(true);
        try {
            await invoicesApi.pay(invoiceId, {
                amount: Number(payAmount),
                method: 'cash'
            });
            toast.success('تم تسجيل الدفعة بنجاح');
            setShowPayModal(false);
            fetchData(); // Refresh list
        } catch (err) {
            toast.error('خطأ في تسجيل الدفعة');
        } finally {
            setPaying(false);
        }
    };

    const openPayModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPayAmount(String(getRemainingAmount(invoice)));
        setShowPayModal(true);
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const upcomingTotalPages = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
    const overdueTotalPages = Math.max(1, Math.ceil(overdue.length / PAGE_SIZE));
    const debtorsTotalPages = Math.max(1, Math.ceil(debtors.length / PAGE_SIZE));

    const visibleUpcoming = useMemo(() => {
        const start = (upcomingPage - 1) * PAGE_SIZE;
        return upcoming.slice(start, start + PAGE_SIZE);
    }, [upcoming, upcomingPage]);

    const visibleOverdue = useMemo(() => {
        const start = (overduePage - 1) * PAGE_SIZE;
        return overdue.slice(start, start + PAGE_SIZE);
    }, [overdue, overduePage]);

    const visibleDebtors = useMemo(() => {
        const start = (debtorsPage - 1) * PAGE_SIZE;
        return debtors.slice(start, start + PAGE_SIZE);
    }, [debtors, debtorsPage]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold">لوحة الأقساط والآجل</h1>
                        <p className="text-sm text-gray-400">متابعة الديون المستحقة، الأقساط القادمة، والعملاء المتأخرين</p>
                    </div>
                </div>
                <Button onClick={fetchData} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
                    تحديث البيانات
                </Button>
            </div>

            {/* Quick Stats (Optional summary if data is complex across tabs, omitting for simplicity unless fetched globally) */}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-px">
                {[
                    { id: 'upcoming', label: 'أقساط قادمة مستحقة', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { id: 'overdue', label: 'ديون متأخرة', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
                    { id: 'all_debts', label: 'سجل المديونيات الكامل', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? tab.bg : 'bg-transparent'}`}>
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                        </div>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <Card className="min-h-[400px]">
                {loading ? (
                    <div className="p-12 text-center">
                        <LoadingSpinner />
                        <p className="text-sm text-gray-400 mt-4">جاري التحميل...</p>
                    </div>
                ) : (
                    <div className="p-4 overflow-x-auto">
                        {activeTab === 'upcoming' && (
                            upcoming.length === 0 ? (
                                <EmptyState icon={<CheckCircle className="w-8 h-8 text-emerald-500" />} title="لا توجد أقساط قادمة" description="كل العملاء مسددين لأقساطهم" />
                            ) : (
                                <>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                                            <th className="px-4 py-3 text-right">العميل</th>
                                            <th className="px-4 py-3 text-center">تاريخ الاستحقاق</th>
                                            <th className="px-4 py-3 text-center">قيمة القسط / المتبقي</th>
                                            <th className="px-4 py-3 text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleUpcoming.map((inv) => (
                                            <tr key={getInvoiceId(inv)} className="border-b border-gray-50 dark:border-gray-800">
                                                <td className="px-4 py-3 font-bold text-primary-600">{inv.invoiceNumber}</td>
                                                <td className="px-4 py-3">{inv.customer?.name || 'عميل نقدي'}</td>
                                                <td className="px-4 py-3 text-center text-blue-600 font-bold">{new Date(inv.dueDate || inv.createdAt).toLocaleDateString('ar-EG')}</td>
                                                <td className="px-4 py-3 text-center font-bold">{fmt(getRemainingAmount(inv))} ج.م</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button size="sm" onClick={() => openPayModal(inv)}>سداد جزئي/كلي</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={upcomingPage}
                                    totalPages={upcomingTotalPages}
                                    totalItems={upcoming.length}
                                    onPageChange={setUpcomingPage}
                                />
                                </>
                            )
                        )}

                        {activeTab === 'overdue' && (
                            overdue.length === 0 ? (
                                <EmptyState icon={<CheckCircle className="w-8 h-8 text-emerald-500" />} title="لا توجد ديون متأخرة" description="ممتاز! لا يوجد عملاء متأخرين عن السداد" />
                            ) : (
                                <>
                                <table className="w-full text-sm">
                                    <thead className="bg-red-50 dark:bg-red-500/10">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-red-600">رقم الفاتورة</th>
                                            <th className="px-4 py-3 text-right text-red-600">العميل</th>
                                            <th className="px-4 py-3 text-center text-red-600">أيام التأخير</th>
                                            <th className="px-4 py-3 text-center text-red-600">المبلغ المتأخر</th>
                                            <th className="px-4 py-3 text-center text-red-600">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleOverdue.map((inv) => {
                                            const daysOverdue = Math.floor((new Date() - new Date(inv.dueDate || inv.createdAt)) / (1000 * 60 * 60 * 24));
                                            return (
                                                <tr key={getInvoiceId(inv)} className="border-b border-gray-50 dark:border-gray-800">
                                                    <td className="px-4 py-3 font-bold">{inv.invoiceNumber}</td>
                                                    <td className="px-4 py-3">{inv.customer?.name || 'عميل نقدي'}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-red-500">{Math.max(0, daysOverdue)} يوم</td>
                                                    <td className="px-4 py-3 text-center font-bold text-red-600">{fmt(getRemainingAmount(inv))} ج.م</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button size="sm" variant="danger" onClick={() => openPayModal(inv)}>السداد الآن</Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={overduePage}
                                    totalPages={overdueTotalPages}
                                    totalItems={overdue.length}
                                    onPageChange={setOverduePage}
                                />
                                </>
                            )
                        )}

                        {activeTab === 'all_debts' && (
                            debtors.length === 0 ? (
                                <EmptyState icon={<CheckCircle className="w-8 h-8 text-emerald-500" />} title="لا توجد ديون" description="لا يوجد أي ديون مستحقة على العملاء" />
                            ) : (
                                <>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-4 py-3 text-right">العميل</th>
                                            <th className="px-4 py-3 text-right">رقم الهاتف</th>
                                            <th className="px-4 py-3 text-center">الحد الائتماني</th>
                                            <th className="px-4 py-3 text-center">إجمالي المديونية</th>
                                            <th className="px-4 py-3 text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleDebtors.map((c) => (
                                            <tr key={c._id} className="border-b border-gray-50 dark:border-gray-800">
                                                <td className="px-4 py-3 font-bold">{c.name}</td>
                                                <td className="px-4 py-3" dir="ltr">{c.phone}</td>
                                                <td className="px-4 py-3 text-center">{fmt(c.financials?.creditLimit)} ج.م</td>
                                                <td className="px-4 py-3 text-center font-bold text-red-500">{fmt(c.financials?.outstandingBalance)} ج.م</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/customers`}>عرض الملف</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={debtorsPage}
                                    totalPages={debtorsTotalPages}
                                    totalItems={debtors.length}
                                    onPageChange={setDebtorsPage}
                                />
                                </>
                            )
                        )}
                    </div>
                )}
            </Card>

            {/* Pay Modal */}
            {selectedInvoice && (
                <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="سداد قسط / مديونية">
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">المبلغ المتبقي</p>
                            <p className="text-2xl font-bold text-red-500">{fmt(getRemainingAmount(selectedInvoice))} ج.م</p>
                        </div>

                        <Input
                            label="المبلغ المسدد الآن"
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setShowPayModal(false)}>إلغاء</Button>
                        <Button onClick={handlePay} loading={paying} icon={<CheckCircle className="w-4 h-4" />}>
                            تأكيد السداد
                        </Button>
                    </div>
                </Modal>
            )}

        </div>
    );
}
