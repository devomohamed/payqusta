import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
const paymentLabels = { cash: 'نقدي', installment: 'تقسيط', deferred: 'آجل' };
const invoiceStatus = {
  paid: { label: 'مدفوعة', variant: 'success' },
  pending: { label: 'قيد الانتظار', variant: 'warning' },
  partially_paid: { label: 'مدفوعة جزئيا', variant: 'primary' },
  overdue: { label: 'متأخرة', variant: 'danger' },
};
const installmentStatus = {
  paid: { label: 'مدفوعة', variant: 'success' },
  pending: { label: 'مستحقة', variant: 'warning' },
  partially_paid: { label: 'مدفوعة جزئيا', variant: 'primary' },
  overdue: { label: 'متأخرة', variant: 'danger' },
};

const fmt = (value) => Number(value || 0).toLocaleString('ar-EG');
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('ar-EG') : 'غير محدد');
const getInvoiceId = (invoice) => invoice?.invoiceId || invoice?._id;
const getCustomerId = (entry) => entry?.customer?._id || entry?._id || null;
const getRemainingAmount = (invoice) => Number(invoice?.invoiceRemaining ?? invoice?.remainingAmount ?? Math.max(0, Number(invoice?.amount || 0) - Number(invoice?.paidAmount || 0))) || 0;
const getInstallmentRemaining = (installment) => Math.max(0, Number(installment?.amount || 0) - Number(installment?.paidAmount || 0));
const getItemsText = (items = []) => {
  const names = items.map((item) => item?.productName || item?.product?.name).filter(Boolean);
  if (!names.length) return t('installments_dashboard_page.ui.k69t9cz');
  return names.length <= 2 ? names.join(t('installments_dashboard_page.ui.k111w')) : `${names[0]}، ${names[1]} +${names.length - 2} منتج`;
};
const nextDue = (invoice) => {
  const openInstallment = [...(invoice?.installments || [])]
    .filter((item) => ['pending', 'partially_paid', 'overdue'].includes(String(item?.status || '')))
    .sort((a, b) => new Date(a?.dueDate || 0) - new Date(b?.dueDate || 0))[0];
  if (openInstallment) {
    return {
      label: openInstallment.status === 'overdue' ? t('installments_dashboard_page.ui.kukjtmr') : t('installments_dashboard_page.ui.ktqkyxo'),
      date: openInstallment.dueDate,
      amount: getInstallmentRemaining(openInstallment),
    };
  }
  if (getRemainingAmount(invoice) > 0 && invoice?.dueDate) {
    return { label: t('installments_dashboard_page.ui.k5w68bv'), date: invoice.dueDate, amount: getRemainingAmount(invoice) };
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
  const { t } = useTranslation('admin');
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
      toast.error(t('installments_dashboard_page.toasts.kalmpu2'));
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
    if (!customerId) return toast.error(t('installments_dashboard_page.toasts.k6yw5j2'));
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
      toast.error(t('installments_dashboard_page.toasts.kjh9yk6'));
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error(t('installments_dashboard_page.toasts.kn6en3'));
    if (Number(payAmount) > getRemainingAmount(selectedInvoice)) return toast.error(t('installments_dashboard_page.toasts.kxx7ymc'));
    try {
      setPaying(true);
      await invoicesApi.pay(getInvoiceId(selectedInvoice), { amount: Number(payAmount), method: 'cash' });
      toast.success(t('installments_dashboard_page.toasts.kxuho5h'));
      closePayModal();
      await fetchData();
      if (showCustomerModal && getCustomerId(selectedCustomer) && getCustomerId(selectedCustomer) === getCustomerId(selectedInvoice)) {
        await loadCustomerProfile(selectedCustomer, true);
      }
    } catch {
      toast.error(t('installments_dashboard_page.toasts.k1j66lv'));
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

  const renderActions = (entry, payVariant = 'primary', payLabel = t('installments_dashboard_page.ui.kt30w4'), payHandler = () => openPayModal(entry)) => (
    <div className="flex items-center justify-center gap-2">
      <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => loadCustomerProfile(entry)}>
        {t('installments_dashboard_page.ui.k7fsly5')}
      </Button>
      <Button size="sm" variant={payVariant} onClick={payHandler}>{payLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 transition-transform duration-300 motion-safe:hover:-translate-y-0.5">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500/80">Collections Desk</p>
              <h1 className="text-2xl font-extrabold dark:text-white">{t('installments_dashboard_page.ui.k89r9m6')}</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-400 dark:text-gray-300">{t('installments_dashboard_page.ui.k6kva0e')}</p>
            </div>
          </div>
          <Button onClick={fetchData} variant="outline" icon={<RefreshCw className="h-4 w-4" />} className="w-full sm:w-auto">{t('installments_dashboard_page.ui.k560y7g')}</Button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Card className="app-surface rounded-2xl p-4 text-center">
            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.kiblri')}</p>
            <p className="mt-1 text-xl font-black text-blue-600">{upcoming.length}</p>
          </Card>
          <Card className="app-surface rounded-2xl p-4 text-center">
            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.kmsbmup')}</p>
            <p className="mt-1 text-xl font-black text-red-500">{overdue.length}</p>
          </Card>
          <Card className="app-surface rounded-2xl p-4 text-center">
            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.kxnct2q')}</p>
            <p className="mt-1 text-xl font-black text-amber-600">{debtors.length}</p>
          </Card>
        </div>
      </section>

      <div className="app-surface-muted flex items-center gap-2 overflow-x-auto rounded-2xl p-1 no-scrollbar">
        {[
          { id: 'upcoming', label: t('installments_dashboard_page.ui.kl2vhmi'), icon: Calendar },
          { id: 'overdue', label: t('installments_dashboard_page.ui.kmsbmup'), icon: AlertTriangle },
          { id: 'all_debts', label: t('installments_dashboard_page.ui.kic3kn3'), icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 ${activeTab === tab.id ? 'bg-primary-500/10 text-primary-600 shadow-sm dark:text-primary-300' : 'text-gray-400 hover:bg-black/[0.03] hover:text-gray-700 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="min-h-[400px] overflow-hidden rounded-3xl">
        {loading ? (
          <div className="p-12 text-center"><LoadingSpinner text="جاري تحميل البيانات..." /></div>
        ) : (
          <div className="p-4">
            {activeTab === 'upcoming' && (
              upcoming.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title={t('installments_dashboard_page.titles.ki0mxw0')} description="كل العملاء مسددين لأقساطهم" /> : (
                <>
                  <div className="space-y-3 md:hidden">
                    {visibleUpcoming.map((invoice) => (
                      <div key={getInvoiceId(invoice)} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</p>
                            <p className="mt-1 text-sm text-gray-700 dark:text-white">{invoice.customer?.name || t('installments_dashboard_page.toasts.kkmlvsh')}</p>
                          </div>
                          <Badge variant="info">{t('installments_dashboard_page.ui.ktcfyz')}</Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.klbnmc7')}</p>
                            <p className="mt-1 font-black text-blue-600 dark:text-blue-400">{formatDate(invoice.dueDate)}</p>
                          </div>
                          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.k8nqtzu')}</p>
                            <p className="mt-1 font-black text-gray-900 dark:text-white">{fmt(invoice.amount)} / {fmt(getRemainingAmount(invoice))} ج.م</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">{renderActions(invoice, 'primary', t('installments_dashboard_page.ui.kmyj7k'))}</div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.03]"><tr><th className="px-4 py-3 text-right">{t('installments_dashboard_page.ui.k3r1ew5')}</th><th className="px-4 py-3 text-right">{t('installments_dashboard_page.ui.kab4izh')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.klbnmc7')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.knegw9e')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.kvfmk6')}</th></tr></thead>
                    <tbody>
                      {visibleUpcoming.map((invoice) => (
                        <tr key={getInvoiceId(invoice)} className="border-b border-gray-100/70 font-medium transition-colors duration-200 hover:bg-primary-500/[0.03] dark:border-white/5 dark:text-gray-100 dark:hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-bold text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3 dark:text-white">{invoice.customer?.name || t('installments_dashboard_page.toasts.kkmlvsh')}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3 text-center font-bold dark:text-white">{fmt(invoice.amount)} / {fmt(getRemainingAmount(invoice))} ج.م</td>
                          <td className="px-4 py-3">{renderActions(invoice, 'primary', t('installments_dashboard_page.ui.kmyj7k'))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <Pagination currentPage={upcomingPage} totalPages={Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE))} totalItems={upcoming.length} onPageChange={setUpcomingPage} />
                </>
              )
            )}

            {activeTab === 'overdue' && (
              overdue.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title={t('installments_dashboard_page.titles.kuqh2zx')} description="لا يوجد عملاء متأخرين عن السداد" /> : (
                <>
                  <div className="space-y-3 md:hidden">
                    {visibleOverdue.map((invoice) => {
                      const refDate = nextDue(invoice)?.date || invoice?.dueDate || invoice?.createdAt;
                      const days = Math.max(0, Math.floor((new Date() - new Date(refDate)) / (1000 * 60 * 60 * 24)));
                      const overdueAmount = (invoice.installments || []).filter((item) => item?.status === 'overdue').reduce((sum, item) => sum + getInstallmentRemaining(item), 0);
                      return (
                        <div key={getInvoiceId(invoice)} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-extrabold text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{invoice.customer?.name || t('installments_dashboard_page.toasts.kkmlvsh')}</p>
                            </div>
                            <Badge variant="danger">{days} يوم</Badge>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                              <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.kzacme4')}</p>
                              <p className="mt-1 font-black text-red-600 dark:text-red-400">{fmt(overdueAmount || getRemainingAmount(invoice))} ج.م</p>
                            </div>
                            <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                              <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.khtraf7')}</p>
                              <p className="mt-1 font-black text-gray-900 dark:text-white">{fmt(getRemainingAmount(invoice))} ج.م</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col gap-2">{renderActions(invoice, 'danger', t('installments_dashboard_page.ui.kbzmwbk'))}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50/80 dark:bg-red-500/10"><tr><th className="px-4 py-3 text-right text-red-600">{t('installments_dashboard_page.ui.k3r1ew5')}</th><th className="px-4 py-3 text-right text-red-600">{t('installments_dashboard_page.ui.kab4izh')}</th><th className="px-4 py-3 text-center text-red-600">{t('installments_dashboard_page.ui.ksco3lo')}</th><th className="px-4 py-3 text-center text-red-600">{t('installments_dashboard_page.ui.kvtm83j')}</th><th className="px-4 py-3 text-center text-red-600">{t('installments_dashboard_page.ui.kvfmk6')}</th></tr></thead>
                    <tbody>
                      {visibleOverdue.map((invoice) => {
                        const refDate = nextDue(invoice)?.date || invoice?.dueDate || invoice?.createdAt;
                        const days = Math.max(0, Math.floor((new Date() - new Date(refDate)) / (1000 * 60 * 60 * 24)));
                        const overdueAmount = (invoice.installments || []).filter((item) => item?.status === 'overdue').reduce((sum, item) => sum + getInstallmentRemaining(item), 0);
                        return (
                          <tr key={getInvoiceId(invoice)} className="border-b border-gray-100/70 font-medium transition-colors duration-200 hover:bg-red-500/[0.03] dark:border-white/5 dark:text-gray-100 dark:hover:bg-red-500/[0.06]">
                            <td className="px-4 py-3 font-bold dark:text-white">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 dark:text-white">{invoice.customer?.name || t('installments_dashboard_page.toasts.kkmlvsh')}</td>
                            <td className="px-4 py-3 text-center font-bold text-red-500">{days} يوم</td>
                            <td className="px-4 py-3 text-center font-bold text-red-600 dark:text-red-400">{fmt(overdueAmount || getRemainingAmount(invoice))} / {fmt(getRemainingAmount(invoice))} ج.م</td>
                            <td className="px-4 py-3">{renderActions(invoice, 'danger', t('installments_dashboard_page.ui.kbzmwbk'))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  <Pagination currentPage={overduePage} totalPages={Math.max(1, Math.ceil(overdue.length / PAGE_SIZE))} totalItems={overdue.length} onPageChange={setOverduePage} />
                </>
              )
            )}

            {activeTab === 'all_debts' && (
              debtors.length === 0 ? <EmptyState icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} title={t('installments_dashboard_page.titles.kiz57vf')} description="لا يوجد أي ديون مستحقة على العملاء" /> : (
                <>
                  <div className="space-y-3 md:hidden">
                    {visibleDebtors.map((customer) => (
                      <div key={customer._id} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white">{customer.name}</p>
                            <p className="mt-1 text-xs text-gray-400" dir="ltr">{customer.phone}</p>
                          </div>
                          <Badge variant="danger">{fmt(customer.financials?.outstandingBalance)} ج.م</Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.k9zpd1v')}</p>
                            <p className="mt-1 font-black text-gray-900 dark:text-white">{fmt(customer.financials?.creditLimit)} ج.م</p>
                          </div>
                          <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[11px] text-gray-400">{t('installments_dashboard_page.ui.ka1a0q9')}</p>
                            <p className="mt-1 font-black text-red-500 dark:text-red-400">{fmt(customer.financials?.outstandingBalance)} ج.م</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => loadCustomerProfile(customer)} className="w-full">{t('installments_dashboard_page.ui.k7fsly5')}</Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.03]"><tr><th className="px-4 py-3 text-right">{t('installments_dashboard_page.ui.kab4izh')}</th><th className="px-4 py-3 text-right">{t('installments_dashboard_page.ui.k3pahhc')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.k9zpd1v')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.ka1a0q9')}</th><th className="px-4 py-3 text-center">{t('installments_dashboard_page.ui.kvfmk6')}</th></tr></thead>
                    <tbody>
                      {visibleDebtors.map((customer) => (
                        <tr key={customer._id} className="border-b border-gray-100/70 font-medium transition-colors duration-200 hover:bg-primary-500/[0.03] dark:border-white/5 dark:text-white dark:hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-bold">{customer.name}</td>
                          <td className="px-4 py-3 dark:text-gray-300" dir="ltr">{customer.phone}</td>
                          <td className="px-4 py-3 text-center dark:text-gray-300">{fmt(customer.financials?.creditLimit)} ج.م</td>
                          <td className="px-4 py-3 text-center font-bold text-red-500 dark:text-red-400">{fmt(customer.financials?.outstandingBalance)} ج.م</td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" icon={<Eye className="h-4 w-4" />} onClick={() => loadCustomerProfile(customer)}>{t('installments_dashboard_page.ui.k7fsly5')}</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <Pagination currentPage={debtorsPage} totalPages={Math.max(1, Math.ceil(debtors.length / PAGE_SIZE))} totalItems={debtors.length} onPageChange={setDebtorsPage} />
                </>
              )
            )}
          </div>
        )}
      </Card>

      {selectedInvoice && (
        <Modal open={showPayModal} onClose={closePayModal} title={t('installments_dashboard_page.titles.k4c02ay')}>
          <div className="space-y-4">
            <div className="app-surface-muted rounded-2xl p-4">
              <p className="mb-1 text-sm text-gray-500">{t('installments_dashboard_page.ui.kdfapok')}</p>
              <p className="text-2xl font-bold text-red-500">{fmt(getRemainingAmount(selectedInvoice))} ج.م</p>
            </div>
            <Input label={t('installments_dashboard_page.form.klsoh8s')} type="number" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder="0.00" />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={closePayModal}>{t('installments_dashboard_page.ui.cancel')}</Button>
            <Button onClick={handlePay} loading={paying} icon={<CheckCircle className="h-4 w-4" />}>{t('installments_dashboard_page.ui.k5h5smq')}</Button>
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
                <div key={label} className="app-surface-muted rounded-2xl p-4 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`mt-1 text-lg font-black ${tone}`}>{typeof value === 'number' && label !== t('installments_dashboard_page.ui.kebfl7g') ? `${fmt(value)} ج.م` : value}</p>
                </div>
              ))}
            </div>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold dark:text-white">{t('installments_dashboard_page.ui.k4l1cua')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('installments_dashboard_page.ui.k6mf6qs')}</p>
                </div>
                <Badge variant={openInvoices.length ? 'danger' : 'success'}>{openInvoices.length} فاتورة مفتوحة</Badge>
              </div>
              {openInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10">{t('installments_dashboard_page.ui.ka44uie')}</div>
              ) : (
                <div className="space-y-2">
                  {openInvoices.map((invoice) => {
                    const due = nextDue(invoice);
                    return (
                      <div key={invoice._id} className="app-surface-muted rounded-2xl p-3 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-primary-600">{invoice.invoiceNumber}</p>
                              <StatusBadge status={invoice.status} />
                              <Badge variant="gray">{paymentLabels[invoice.paymentMethod] || t('installments_dashboard_page.toasts.k5xt5xj')}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{getItemsText(invoice.items)}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div><p className="text-[11px] text-gray-500">{t('installments_dashboard_page.ui.krh6w30')}</p><p className="font-bold">{fmt(invoice.totalAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">{t('installments_dashboard_page.ui.kaax95h')}</p><p className="font-bold text-emerald-600">{fmt(invoice.paidAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">{t('installments_dashboard_page.ui.kzaci6q')}</p><p className="font-bold text-red-500">{fmt(invoice.remainingAmount)} ج.م</p></div>
                            <div><p className="text-[11px] text-gray-500">{due?.label || t('installments_dashboard_page.toasts.ktrq469')}</p><p className="font-bold">{formatDate(due?.date || invoice.createdAt)}</p></div>
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
                  <h3 className="font-bold dark:text-white">{t('installments_dashboard_page.ui.kk34ytt')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('installments_dashboard_page.ui.kxv4rpk')}</p>
                </div>
                <Badge variant="gray">{customerInvoices.length} فاتورة</Badge>
              </div>
              <div className="space-y-3">
                {customerInvoices.map((invoice) => {
                  const payments = [...(invoice.payments || [])].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
                  const expanded = expandedInvoice === invoice._id;
                  return (
                    <div key={invoice._id} className="app-surface-muted overflow-hidden rounded-2xl">
                      <button type="button" onClick={() => setExpandedInvoice(expanded ? null : invoice._id)} className="app-surface flex w-full items-center justify-between p-4 text-right transition-colors duration-200 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
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
                            <p className="text-xs text-gray-400">{t('installments_dashboard_page.ui.kzaci6q')}</p>
                            <p className={`font-bold ${Number(invoice.remainingAmount || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(invoice.remainingAmount)} ج.م</p>
                          </div>
                          {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </button>
                      {expanded && (
                        <div className="app-surface-muted space-y-4 border-t border-gray-100/80 p-4 dark:border-white/5">
                          <div>
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><Package className="h-4 w-4" />{t('installments_dashboard_page.ui.kabfd32')}</h4>
                            <div className="grid gap-2">
                              {(invoice.items || []).map((item, index) => (
                                <div key={`${invoice._id}-item-${index}`} className="app-surface flex items-center justify-between rounded-xl p-3">
                                  <div>
                                    <p className="font-semibold">{item.productName || item.product?.name || t('installments_dashboard_page.toasts.ktezs3')}</p>
                                    <p className="text-xs text-gray-500">الكمية: {item.quantity} × {fmt(item.unitPrice)} ج.م</p>
                                  </div>
                                  <p className="font-bold text-primary-600">{fmt(item.totalPrice)} ج.م</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {payments.length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-bold">{t('installments_dashboard_page.ui.kebga7s')}</h4>
                              <div className="grid gap-2 lg:grid-cols-2">
                                {payments.map((payment, index) => (
                                  <div key={`${invoice._id}-payment-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-emerald-700 dark:text-emerald-300">{fmt(payment.amount)} ج.م</p>
                                      <Badge variant="success">{paymentLabels[payment.method] || t('installments_dashboard_page.toasts.kt0upu')}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{formatDate(payment.date)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(invoice.installments || []).length > 0 && (
                            <div>
                              <h4 className="mb-2 text-sm font-bold">{t('installments_dashboard_page.ui.k5hwf2e')}</h4>
                              <div className="grid gap-2 lg:grid-cols-2">
                                {invoice.installments.map((installment, index) => (
                                  <div key={`${invoice._id}-installment-${index}`} className="app-surface rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold dark:text-white">قسط {installment.installmentNumber}</p>
                                      <StatusBadge status={installment.status} type="installment" />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">الاستحقاق: {formatDate(installment.dueDate)}</p>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                      <div><p className="text-gray-500 dark:text-gray-400">{t('installments_dashboard_page.ui.kaayojb')}</p><p className="font-bold dark:text-white">{fmt(installment.amount)}</p></div>
                                      <div><p className="text-gray-500 dark:text-gray-400">{t('installments_dashboard_page.ui.kaax95h')}</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(installment.paidAmount)}</p></div>
                                      <div><p className="text-gray-500 dark:text-gray-400">{t('installments_dashboard_page.ui.kzaci6q')}</p><p className="font-bold text-red-500 dark:text-red-400">{fmt(getInstallmentRemaining(installment))}</p></div>
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
