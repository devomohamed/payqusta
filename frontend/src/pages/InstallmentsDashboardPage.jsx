import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  FileText,
  Package,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, customersApi, invoicesApi } from '../store';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal } from '../components/UI';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;
const paymentLabels = { cash: 'نقد', installment: 'أقساط', deferred: 'آجل' };
const invoiceStatus = {
  paid: { label: 'مسدد', variant: 'success' },
  pending: { label: 'قيد السداد', variant: 'warning' },
  partially_paid: { label: 'مسدد جزئيا', variant: 'primary' },
  overdue: { label: 'متأخر', variant: 'danger' },
};
const installmentStatus = {
  paid: { label: 'مسدد', variant: 'success' },
  pending: { label: 'قادم', variant: 'warning' },
  partially_paid: { label: 'جزئي', variant: 'primary' },
  overdue: { label: 'متأخر', variant: 'danger' },
};

const fmt = (value) => Number(value || 0).toLocaleString('ar-EG');
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('ar-EG') : 'غير محدد');
const getInvoiceId = (invoice) => invoice?.invoiceId || invoice?._id;
const getCustomerId = (entry) => entry?.customer?._id || entry?._id || null;
const getRemainingAmount = (invoice) => Number(invoice?.invoiceRemaining ?? invoice?.remainingAmount ?? Math.max(0, Number(invoice?.amount || 0) - Number(invoice?.paidAmount || 0))) || 0;
const getInstallmentRemaining = (installment) => Math.max(0, Number(installment?.amount || 0) - Number(installment?.paidAmount || 0));
const getItemsText = (items = []) => {
  const names = items.map((item) => item?.productName || item?.product?.name).filter(Boolean);
  if (!names.length) return 'بدون بنود مسجلة';
  return names.length <= 2 ? names.join('، ') : `${names[0]}، ${names[1]} +${names.length - 2} منتج`;
};
const nextDue = (invoice) => {
  const openInstallment = [...(invoice?.installments || [])]
    .filter((item) => ['pending', 'partially_paid', 'overdue'].includes(String(item?.status || '')))
    .sort((a, b) => new Date(a?.dueDate || 0) - new Date(b?.dueDate || 0))[0];
  if (openInstallment) {
    return {
      label: openInstallment.status === 'overdue' ? 'أقرب قسط متأخر' : 'أقرب قسط',
      date: openInstallment.dueDate,
      amount: getInstallmentRemaining(openInstallment),
    };
  }
  if (getRemainingAmount(invoice) > 0 && invoice?.dueDate) {
    return { label: 'استحقاق الآجل', date: invoice.dueDate, amount: getRemainingAmount(invoice) };
  }
  return null;
};
const sortInvoices = (invoices = []) => [...invoices].sort((a, b) => {
  const aOpen = Number(a?.remainingAmount || 0) > 0 ? 1 : 0;
  const bOpen = Number(b?.remainingAmount || 0) > 0 ? 1 : 0;
  if (aOpen !== bOpen) return bOpen - aOpen;
  return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
});

function StatusBadge({ status, type = 'invoice' }) {
  const meta = (type === 'installment' ? installmentStatus : invoiceStatus)[status] || { label: status || 'غير معروف', variant: 'gray' };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default function InstallmentsDashboardPage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [debtorsPage, setDebtorsPage] = useState(1);

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  useEffect(() => { fetchData(); }, [activeTab]);
  useEffect(() => { const max = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE)); if (upcomingPage > max) setUpcomingPage(max); }, [upcoming.length, upcomingPage]);
  useEffect(() => { const max = Math.max(1, Math.ceil(overdue.length / PAGE_SIZE)); if (overduePage > max) setOverduePage(max); }, [overdue.length, overduePage]);
  useEffect(() => { const max = Math.max(1, Math.ceil(debtors.length / PAGE_SIZE)); if (debtorsPage > max) setDebtorsPage(max); }, [debtors.length, debtorsPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'upcoming') setUpcoming((await invoicesApi.getUpcoming(30)).data.data || []);
      if (activeTab === 'overdue') setOverdue((await invoicesApi.getOverdue()).data.data || []);
      if (activeTab === 'all_debts') setDebtors((await customersApi.getDebtors()).data.data || []);
    } catch {
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setSelectedInvoice(null);
    setPayAmount('');
  };

  const openPayModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPayAmount(String(getRemainingAmount(invoice)));
    setShowPayModal(true);
  };

  const loadCustomerProfile = async (entry, refreshOnly = false) => {
    const customerId = getCustomerId(entry);
    if (!customerId) return toast.error('تعذر تحديد العميل');
    if (!refreshOnly) {
      setShowCustomerModal(true);
      setCustomerInvoices([]);
      setExpandedInvoice(null);
    }
    setSelectedCustomer((current) => ({ ...(current || {}), ...(entry?.customer || entry), financials: entry?.financials || current?.financials || {} }));
    setLoadingCustomer(true);
    try {
      const { data } = await api.get(`/customers/${customerId}/transactions`, { params: { page: 1, limit: 100 } });
      const payload = data?.data || {};
      const invoices = sortInvoices(payload?.invoices || []);
      setSelectedCustomer((current) => ({ ...(current || {}), ...(payload?.customer || {}) }));
      setCustomerInvoices(invoices);
      setExpandedInvoice((current) => current || invoices.find((item) => Number(item?.remainingAmount || 0) > 0)?._id || invoices[0]?._id || null);
    } catch {
      toast.error('خطأ في تحميل ملف العميل');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error('أدخل مبلغ الدفع');
    if (Number(payAmount) > getRemainingAmount(selectedInvoice)) return toast.error('المبلغ أكبر من المتبقي');
    try {
      setPaying(true);
      await invoicesApi.pay(getInvoiceId(selectedInvoice), { amount: Number(payAmount), method: 'cash' });
      toast.success('تم تسجيل الدفعة بنجاح');
      closePayModal();
      await fetchData();
      if (showCustomerModal && getCustomerId(selectedCustomer) && getCustomerId(selectedCustomer) === getCustomerId(selectedInvoice)) {
        await loadCustomerProfile(selectedCustomer, true);
      }
    } catch {
      toast.error('خطأ في تسجيل الدفعة');
    } finally {
      setPaying(false);
    }
  };

  const visibleUpcoming = upcoming.slice((upcomingPage - 1) * PAGE_SIZE, upcomingPage * PAGE_SIZE);
  const visibleOverdue = overdue.slice((overduePage - 1) * PAGE_SIZE, overduePage * PAGE_SIZE);
  const visibleDebtors = debtors.slice((debtorsPage - 1) * PAGE_SIZE, debtorsPage * PAGE_SIZE);

  const totals = {
    purchases: selectedCustomer?.financials?.totalPurchases ?? customerInvoices.reduce((sum, invoice) => sum + Number(invoice?.totalAmount || 0), 0),
    paid: selectedCustomer?.financials?.totalPaid ?? customerInvoices.reduce((sum, invoice) => sum + Number(invoice?.paidAmount || 0), 0),
    outstanding: selectedCustomer?.financials?.outstandingBalance ?? customerInvoices.reduce((sum, invoice) => sum + Number(invoice?.remainingAmount || 0), 0),
    creditLimit: selectedCustomer?.financials?.creditLimit ?? 0,
  };
  const openInvoices = customerInvoices.filter((invoice) => Number(invoice?.remainingAmount || 0) > 0);
  const overdueInstallmentsCount = customerInvoices.reduce((sum, invoice) => sum + (invoice?.installments || []).filter((item) => item?.status === 'overdue').length, 0);

  const renderActions = (entry, payVariant = 'primary', payLabel = 'سداد', payHandler = () => openPayModal(entry)) => (
    <div className="flex items-center justify-center gap-2">
      <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => loadCustomerProfile(entry)}>
        عرض الملف
      </Button>
      <Button size="sm" variant={payVariant} onClick={payHandler}>{payLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">لوحة الأقساط والآجل</h1>
            <p className="text-sm text-gray-400">متابعة الديون المستحقة، الأقساط القادمة، والعملاء المتأخرين</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" icon={<RefreshCw className="h-4 w-4" />}>تحديث البيانات</Button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 pb-px dark:border-gray-800">
        {[
          { id: 'upcoming', label: 'أقساط قادمة مستحقة', icon: Calendar },
          { id: 'overdue', label: 'ديون متأخرة', icon: AlertTriangle },
          { id: 'all_debts', label: 'سجل المديونيات الكامل', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-400'}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center"><LoadingSpinner text="جاري تحميل البيانات..." /></div>
        ) : (
          <div className="overflow-x-auto p-4">
            {activeTab === 'upcoming' && (
              upcoming.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title="لا توجد أقساط قادمة" description="كل العملاء مسددين لأقساطهم" /> : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className="px-4 py-3 text-right">رقم الفاتورة</th><th className="px-4 py-3 text-right">العميل</th><th className="px-4 py-3 text-center">تاريخ الاستحقاق</th><th className="px-4 py-3 text-center">قيمة القسط / المتبقي</th><th className="px-4 py-3 text-center">الإجراءات</th></tr></thead>
                    <tbody>
                      {visibleUpcoming.map((invoice) => (
                        <tr key={getInvoiceId(invoice)} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="px-4 py-3 font-bold text-primary-600">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3">{invoice.customer?.name || 'عميل نقدي'}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-600">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3 text-center font-bold">{fmt(invoice.amount)} / {fmt(getRemainingAmount(invoice))} ج.م</td>
                          <td className="px-4 py-3">{renderActions(invoice, 'primary', 'سداد جزئي/كلي')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination currentPage={upcomingPage} totalPages={Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE))} totalItems={upcoming.length} onPageChange={setUpcomingPage} />
                </>
              )
            )}

            {activeTab === 'overdue' && (
              overdue.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title="لا توجد ديون متأخرة" description="لا يوجد عملاء متأخرين عن السداد" /> : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 dark:bg-red-500/10"><tr><th className="px-4 py-3 text-right text-red-600">رقم الفاتورة</th><th className="px-4 py-3 text-right text-red-600">العميل</th><th className="px-4 py-3 text-center text-red-600">أيام التأخير</th><th className="px-4 py-3 text-center text-red-600">المتأخر / المتبقي</th><th className="px-4 py-3 text-center text-red-600">الإجراءات</th></tr></thead>
                    <tbody>
                      {visibleOverdue.map((invoice) => {
                        const refDate = nextDue(invoice)?.date || invoice?.dueDate || invoice?.createdAt;
                        const days = Math.max(0, Math.floor((new Date() - new Date(refDate)) / (1000 * 60 * 60 * 24)));
                        const overdueAmount = (invoice.installments || []).filter((item) => item?.status === 'overdue').reduce((sum, item) => sum + getInstallmentRemaining(item), 0);
                        return (
                          <tr key={getInvoiceId(invoice)} className="border-b border-gray-50 dark:border-gray-800">
                            <td className="px-4 py-3 font-bold">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3">{invoice.customer?.name || 'عميل نقدي'}</td>
                            <td className="px-4 py-3 text-center font-bold text-red-500">{days} يوم</td>
                            <td className="px-4 py-3 text-center font-bold text-red-600">{fmt(overdueAmount || getRemainingAmount(invoice))} / {fmt(getRemainingAmount(invoice))} ج.م</td>
                            <td className="px-4 py-3">{renderActions(invoice, 'danger', 'السداد الآن')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination currentPage={overduePage} totalPages={Math.max(1, Math.ceil(overdue.length / PAGE_SIZE))} totalItems={overdue.length} onPageChange={setOverduePage} />
                </>
              )
            )}

            {activeTab === 'all_debts' && (
              debtors.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title="لا توجد ديون" description="لا يوجد أي ديون مستحقة على العملاء" /> : (
                <>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className="px-4 py-3 text-right">العميل</th><th className="px-4 py-3 text-right">رقم الهاتف</th><th className="px-4 py-3 text-center">الحد الائتماني</th><th className="px-4 py-3 text-center">إجمالي المديونية</th><th className="px-4 py-3 text-center">الإجراءات</th></tr></thead>
                    <tbody>
                      {visibleDebtors.map((customer) => (
                        <tr key={customer._id} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="px-4 py-3 font-bold">{customer.name}</td>
                          <td className="px-4 py-3" dir="ltr">{customer.phone}</td>
                          <td className="px-4 py-3 text-center">{fmt(customer.financials?.creditLimit)} ج.م</td>
                          <td className="px-4 py-3 text-center font-bold text-red-500">{fmt(customer.financials?.outstandingBalance)} ج.م</td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => loadCustomerProfile(customer)}>عرض الملف</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination currentPage={debtorsPage} totalPages={Math.max(1, Math.ceil(debtors.length / PAGE_SIZE))} totalItems={debtors.length} onPageChange={setDebtorsPage} />
                </>
              )
            )}
          </div>
        )}
      </Card>

      {selectedInvoice && (
        <Modal open={showPayModal} onClose={closePayModal} title="سداد قسط / مديونية">
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="mb-1 text-sm text-gray-500">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-red-500">{fmt(getRemainingAmount(selectedInvoice))} ج.م</p>
            </div>
            <Input label="المبلغ المسدد الآن" type="number" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder="0.00" />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={closePayModal}>إلغاء</Button>
            <Button onClick={handlePay} loading={paying} icon={<CheckCircle className="h-4 w-4" />}>تأكيد السداد</Button>
          </div>
        </Modal>
      )}

      <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} title={selectedCustomer?.name ? `ملف العميل - ${selectedCustomer.name}` : 'ملف العميل'} size="2xl">
        {loadingCustomer ? (
          <LoadingSpinner text="جاري تحميل ملف العميل..." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['إجمالي المشتريات', totals.purchases, 'text-gray-900 dark:text-white'],
                ['المسدد', totals.paid, 'text-emerald-600'],
                ['المتبقي', totals.outstanding, 'text-red-500'],
                ['الحد الائتماني', totals.creditLimit, 'text-gray-900 dark:text-white'],
                ['أقساط متأخرة', overdueInstallmentsCount, 'text-amber-600'],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`mt-1 text-lg font-black ${tone}`}>{typeof value === 'number' && label !== 'أقساط متأخرة' ? `${fmt(value)} ج.م` : value}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">الديون الحالية</h3>
                  <p className="text-xs text-gray-500">الفلوس دي على أي فواتير، واتدفع منها كام، ولسه باقي كام.</p>
                </div>
                <Badge variant={openInvoices.length ? 'danger' : 'success'}>{openInvoices.length} فاتورة مفتوحة</Badge>
              </div>
              {openInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10">لا توجد ديون قائمة حالياً.</div>
              ) : (
                <div className="space-y-2">
                  {openInvoices.map((invoice) => {
                    const due = nextDue(invoice);
                    return (
                      <div key={invoice._id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-primary-600">{invoice.invoiceNumber}</p>
                              <StatusBadge status={invoice.status} />
                              <Badge variant="gray">{paymentLabels[invoice.paymentMethod] || 'غير محدد'}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{getItemsText(invoice.items)}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div><p className="text-[11px] text-gray-500">الإجمالي</p><p className="font-bold">{fmt(invoice.totalAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">المسدد</p><p className="font-bold text-emerald-600">{fmt(invoice.paidAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">المتبقي</p><p className="font-bold text-red-500">{fmt(invoice.remainingAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">{due?.label || 'تاريخ الفاتورة'}</p><p className="font-bold">{formatDate(due?.date || invoice.createdAt)}</p></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">تفاصيل الفواتير</h3>
                  <p className="text-xs text-gray-500">اضغط على الفاتورة لمعرفة البنود، سجل الدفعات، وجدول الأقساط.</p>
                </div>
                <Badge variant="gray">{customerInvoices.length} فاتورة</Badge>
              </div>
              <div className="space-y-3">
                {customerInvoices.map((invoice) => {
                  const payments = [...(invoice.payments || [])].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
                  const expanded = expandedInvoice === invoice._id;
                  return (
                    <div key={invoice._id} className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                      <button type="button" onClick={() => setExpandedInvoice(expanded ? null : invoice._id)} className="flex w-full items-center justify-between bg-white p-4 text-right dark:bg-gray-900">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : invoice.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-primary-600">{invoice.invoiceNumber}</p>
                              <StatusBadge status={invoice.status} />
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{getItemsText(invoice.items)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">المتبقي</p>
                            <p className={`font-bold ${Number(invoice.remainingAmount || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(invoice.remainingAmount)} ج.م</p>
                          </div>
                          {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </button>
                      {expanded && (
                        <div className="space-y-4 border-t border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/20">
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><Package className="h-4 w-4" />البنود</h4>
                            <div className="grid gap-2">
                              {(invoice.items || []).map((item, index) => (
                                <div key={`${invoice._id}-item-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                  <div>
                                    <p className="font-semibold">{item.productName || item.product?.name || 'منتج'}</p>
                                    <p className="text-xs text-gray-500">الكمية: {item.quantity} × {fmt(item.unitPrice)} ج.م</p>
                                  </div>
                                  <p className="font-bold text-primary-600">{fmt(item.totalPrice)} ج.م</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {payments.length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-bold">سجل الدفعات</h4>
                              <div className="grid gap-2 lg:grid-cols-2">
                                {payments.map((payment, index) => (
                                  <div key={`${invoice._id}-payment-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-emerald-700 dark:text-emerald-300">{fmt(payment.amount)} ج.م</p>
                                      <Badge variant="success">{paymentLabels[payment.method] || 'دفعة'}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{formatDate(payment.date)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(invoice.installments || []).length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-bold">جدول الأقساط</h4>
                              <div className="grid gap-2 lg:grid-cols-2">
                                {invoice.installments.map((installment, index) => (
                                  <div key={`${invoice._id}-installment-${index}`} className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold">قسط {installment.installmentNumber}</p>
                                      <StatusBadge status={installment.status} type="installment" />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">الاستحقاق: {formatDate(installment.dueDate)}</p>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                      <div><p className="text-gray-500">القيمة</p><p className="font-bold">{fmt(installment.amount)}</p></div>
                                      <div><p className="text-gray-500">المسدد</p><p className="font-bold text-emerald-600">{fmt(installment.paidAmount)}</p></div>
                                      <div><p className="text-gray-500">المتبقي</p><p className="font-bold text-red-500">{fmt(getInstallmentRemaining(installment))}</p></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
