import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CreditCard, Receipt, RefreshCw, Truck } from 'lucide-react';
import { supplierPurchaseInvoicesApi, suppliersApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '../components/UI';
import Pagination from '../components/Pagination';
import { notify } from '../components/AnimatedNotification';
import { useTranslation } from 'react-i18next';

const getStatusOptions = (t) => [
  { value: '', label: t('supplier_purchase_invoices_page.ui.k8ylak1') },
  { value: 'open', label: t('supplier_purchase_invoices_page.ui.k3ub7rq') },
  { value: 'partial_paid', label: t('supplier_purchase_invoices_page.ui.k3c1c7y') },
  { value: 'paid', label: t('supplier_purchase_invoices_page.ui.k3ktm2p') },
  { value: 'cancelled', label: t('supplier_purchase_invoices_page.ui.kpbvx0a') },
];

const getDueScopeOptions = (t) => [
  { value: '', label: t('supplier_purchase_invoices_page.ui.k5ilx3q') },
  { value: 'today', label: t('supplier_purchase_invoices_page.ui.k405rtx') },
  { value: 'tomorrow', label: t('supplier_purchase_invoices_page.ui.kzbritf') },
  { value: 'upcoming', label: t('supplier_purchase_invoices_page.ui.ko8b0o') },
  { value: 'overdue', label: t('supplier_purchase_invoices_page.ui.k3hiy14') },
];

const getPaymentMethodOptions = (t) => [
  { value: 'cash', label: t('supplier_purchase_invoices_page.ui.ktfjxz') },
  { value: 'bank_transfer', label: t('supplier_purchase_invoices_page.ui.kpd74me') },
  { value: 'wallet', label: t('supplier_purchase_invoices_page.ui.kpbhd2i') },
  { value: 'other', label: t('supplier_purchase_invoices_page.ui.k42utn0') },
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('ar-EG');
}

function statusBadge(status) {
  if (status === 'paid') return 'success';
  if (status === 'partial_paid') return 'warning';
  if (status === 'open') return 'info';
  if (status === 'cancelled') return 'danger';
  return 'gray';
}

function installmentStatusBadge(status) {
  if (status === 'paid') return 'success';
  if (status === 'partially_paid') return 'warning';
  if (status === 'overdue') return 'danger';
  return 'info';
}

export default function SupplierPurchaseInvoicesPage() {
  const { t } = useTranslation('admin');
  const statusOptions = useMemo(() => getStatusOptions(t), [t]);
  const dueScopeOptions = useMemo(() => getDueScopeOptions(t), [t]);
  const paymentMethodOptions = useMemo(() => getPaymentMethodOptions(t), [t]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [filters, setFilters] = useState({
    search: '',
    supplier: '',
    status: '',
    dueScope: '',
  });

  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    installmentId: '',
    method: 'cash',
    reference: '',
    notes: '',
  });

  const { can } = useAuthStore();
  const canEdit = can('admin') || can('purchases');

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [page, filters.search, filters.supplier, filters.status, filters.dueScope]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.supplier, filters.status, filters.dueScope]);

  const summary = useMemo(() => {
    return invoices.reduce((acc, invoice) => {
      acc.total += Number(invoice.totalAmount || 0);
      acc.paid += Number(invoice.paidAmount || 0);
      acc.outstanding += Number(invoice.outstandingAmount || 0);
      return acc;
    }, { total: 0, paid: 0, outstanding: 0 });
  }, [invoices]);

  const openInstallments = useMemo(() => {
    const schedule = selectedInvoice?.installmentsSchedule || [];
    return schedule.filter((item) => ['pending', 'partially_paid', 'overdue'].includes(item.status));
  }, [selectedInvoice]);

  const loadSuppliers = async () => {
    try {
      const res = await suppliersApi.getAll({ limit: 300 });
      setSuppliers(res.data?.data || []);
    } catch (_) {
      setSuppliers([]);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await supplierPurchaseInvoicesApi.getAll({
        page,
        limit: 12,
        search: filters.search || undefined,
        supplier: filters.supplier || undefined,
        status: filters.status || undefined,
        dueScope: filters.dueScope || undefined,
      });
      setInvoices(res.data?.data || []);
      setPagination(res.data?.pagination || { totalPages: 1, totalItems: 0 });
    } catch (error) {
      notify.error(error.response?.data?.message || t('supplier_purchase_invoices_page.toasts.kx57zba'));
      setInvoices([]);
      setPagination({ totalPages: 1, totalItems: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromPurchaseOrders = async () => {
    setSyncing(true);
    try {
      const res = await supplierPurchaseInvoicesApi.syncFromPurchaseOrders();
      notify.success(res.data?.message || t('supplier_purchase_invoices_page.toasts.kqwaes0'));
      await loadInvoices();
    } catch (error) {
      notify.error(error.response?.data?.message || t('supplier_purchase_invoices_page.toasts.klj6juy'));
    } finally {
      setSyncing(false);
    }
  };

  const openDetails = async (invoiceId) => {
    setDetailsLoading(true);
    setShowDetails(true);
    try {
      const res = await supplierPurchaseInvoicesApi.getById(invoiceId);
      const invoice = res.data?.data || null;
      setSelectedInvoice(invoice);
      setPaymentForm((prev) => ({
        ...prev,
        amount: invoice?.outstandingAmount ? String(Number(invoice.outstandingAmount)) : '',
        installmentId: '',
      }));
    } catch (error) {
      notify.error(error.response?.data?.message || t('supplier_purchase_invoices_page.toasts.khvje6x'));
      setShowDetails(false);
      setSelectedInvoice(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selectedInvoice?._id) return;
    const amount = Number(paymentForm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return notify.warning(t('supplier_purchase_invoices_page.toasts.kpafzhq'));
    }

    setPaying(true);
    try {
      await supplierPurchaseInvoicesApi.pay(selectedInvoice._id, {
        amount,
        installmentId: paymentForm.installmentId || undefined,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      notify.success(t('supplier_purchase_invoices_page.toasts.krfo6yw'));
      await openDetails(selectedInvoice._id);
      await loadInvoices();
    } catch (error) {
      notify.error(error.response?.data?.message || t('supplier_purchase_invoices_page.toasts.k3nygxd'));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500/80">Supplier Finance Desk</p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">{t('supplier_purchase_invoices_page.ui.k2kled2')}</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                متابعة التزامات المورد، القسط القادم، وسجل السداد من واجهة أخف على الهاتف وأكثر وضوحًا على الشاشات الصغيرة.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadInvoices} className="w-full sm:w-auto">
              {t('supplier_purchase_invoices_page.ui.update')}
            </Button>
            {canEdit && (
              <Button variant="outline" loading={syncing} onClick={handleSyncFromPurchaseOrders} className="w-full sm:w-auto">
                {t('supplier_purchase_invoices_page.ui.k550sod')}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="app-surface-muted p-4 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
            <p className="text-xs text-gray-400 mb-1">{t('supplier_purchase_invoices_page.ui.kii918k')}</p>
            <p className="text-lg font-extrabold">{formatMoney(summary.total)} ج.م</p>
          </Card>
          <Card className="app-surface-muted p-4 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
            <p className="text-xs text-gray-400 mb-1">{t('supplier_purchase_invoices_page.ui.kfgprss')}</p>
            <p className="text-lg font-extrabold text-emerald-600">{formatMoney(summary.paid)} ج.م</p>
          </Card>
          <Card className="app-surface-muted p-4 transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
            <p className="text-xs text-gray-400 mb-1">{t('supplier_purchase_invoices_page.ui.khtraf7')}</p>
            <p className="text-lg font-extrabold text-amber-600">{formatMoney(summary.outstanding)} ج.م</p>
          </Card>
        </div>
      </section>

      <Card className="app-surface-muted rounded-[2rem] p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Filters</p>
          <h2 className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white">{t('supplier_purchase_invoices_page.ui.ktyexuv')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('supplier_purchase_invoices_page.ui.kjhlcon')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label={t('supplier_purchase_invoices_page.form.search')}
            placeholder={t('supplier_purchase_invoices_page.placeholders.kh4ptwp')}
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <Select
            label={t('supplier_purchase_invoices_page.form.kaawtj6')}
            value={filters.supplier}
            onChange={(e) => setFilters((prev) => ({ ...prev, supplier: e.target.value }))}
            options={[
              { value: '', label: t('supplier_purchase_invoices_page.ui.k5is3kp') },
              ...suppliers.map((supplier) => ({ value: supplier._id, label: supplier.name })),
            ]}
          />
          <Select
            label={t('supplier_purchase_invoices_page.form.kdqmf22')}
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            options={statusOptions}
          />
          <Select
            label={t('supplier_purchase_invoices_page.form.kvoy8wh')}
            value={filters.dueScope}
            onChange={(e) => setFilters((prev) => ({ ...prev, dueScope: e.target.value }))}
            options={dueScopeOptions}
          />
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : invoices.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon={Truck}
            title={t('supplier_purchase_invoices_page.titles.krqyf4a')}
            description="لو عندك أوامر شراء مستلمة قديمة اضغط مزامنة من أوامر الشراء."
          />
          {canEdit && (
            <div className="flex justify-center">
              <Button loading={syncing} onClick={handleSyncFromPurchaseOrders}>
                {t('supplier_purchase_invoices_page.ui.kfd1k4t')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden rounded-3xl">
          <div className="space-y-3 p-4 md:hidden">
            {invoices.map((invoice) => {
              const nextInstallment = invoice?.analytics?.nextInstallment;
              const nextAmount = Number(nextInstallment?.remainingAmount ?? nextInstallment?.amount ?? 0);
              return (
                <div key={invoice._id} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-gray-400">PO: {invoice.purchaseOrder?.orderNumber || '-'}</p>
                    </div>
                    <Badge variant={statusBadge(invoice.status)}>
                      {invoice.status === 'open' && 'مفتوحة'}
                      {invoice.status === 'partial_paid' && 'مدفوع جزئي'}
                      {invoice.status === 'paid' && 'مدفوعة'}
                      {invoice.status === 'cancelled' && 'ملغية'}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kaawtj6')}</p>
                      <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">{invoice.supplier?.name || '-'}</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kove7t8')}</p>
                      <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">{invoice.branch?.name || '-'}</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.krh6w30')}</p>
                      <p className="mt-1 font-black text-gray-900 dark:text-white">{formatMoney(invoice.totalAmount)} ج.م</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kzaci6q')}</p>
                      <p className="mt-1 font-black text-amber-600">{formatMoney(invoice.outstandingAmount)} ج.م</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kar7mmn')}</p>
                    {nextInstallment ? (
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{formatDate(nextInstallment.dueDate)}</span>
                        <span className="font-black text-primary-600">{formatMoney(nextAmount)} ج.م</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">{t('supplier_purchase_invoices_page.ui.ktl2ro7')}</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button size="sm" icon={<CreditCard className="w-4 h-4" />} onClick={() => openDetails(invoice._id)} className="w-full">
                      تفاصيل {canEdit ? '/ سداد' : ''}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                <tr>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.k3r1ew5')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.kaawtj6')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.kove7t8')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.kabct8k')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.krh6w30')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.kzaci6q')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.kar7mmn')}</th>
                  <th className="p-3 text-right">{t('supplier_purchase_invoices_page.ui.k5a5wt5')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
                {invoices.map((invoice) => {
                  const nextInstallment = invoice?.analytics?.nextInstallment;
                  const nextAmount = Number(nextInstallment?.remainingAmount ?? nextInstallment?.amount ?? 0);
                  return (
                    <tr key={invoice._id} className="transition-colors duration-200 hover:bg-primary-500/[0.03] dark:hover:bg-white/[0.03]">
                      <td className="p-3">
                        <p className="font-bold">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">PO: {invoice.purchaseOrder?.orderNumber || '-'}</p>
                      </td>
                      <td className="p-3">{invoice.supplier?.name || '-'}</td>
                      <td className="p-3">{invoice.branch?.name || '-'}</td>
                      <td className="p-3">
                        <Badge variant={statusBadge(invoice.status)}>
                          {invoice.status === 'open' && 'مفتوحة'}
                          {invoice.status === 'partial_paid' && 'مدفوع جزئي'}
                          {invoice.status === 'paid' && 'مدفوعة'}
                          {invoice.status === 'cancelled' && 'ملغية'}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold">{formatMoney(invoice.totalAmount)} ج.م</td>
                      <td className="p-3 font-semibold text-amber-600">{formatMoney(invoice.outstandingAmount)} ج.م</td>
                      <td className="p-3">
                        {nextInstallment ? (
                          <div className="text-xs">
                            <p className="font-semibold">{formatDate(nextInstallment.dueDate)}</p>
                            <p className="text-gray-500">{formatMoney(nextAmount)} ج.م</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{t('supplier_purchase_invoices_page.ui.k2j0vmq')}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button size="sm" icon={<CreditCard className="w-4 h-4" />} onClick={() => openDetails(invoice._id)}>
                          تفاصيل {canEdit ? '/ سداد' : ''}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-100/80 p-4 dark:border-white/5">
              <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal
        open={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedInvoice(null);
        }}
        title={t('supplier_purchase_invoices_page.titles.km9ue')}
        size="xl"
      >
        {detailsLoading ? (
          <LoadingSpinner />
        ) : !selectedInvoice ? (
          <EmptyState icon={Receipt} title={t('supplier_purchase_invoices_page.titles.km3iafu')} description="تعذر تحميل تفاصيل الفاتورة" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="app-surface-muted rounded-2xl p-3">
                <p className="text-xs text-gray-400">{t('supplier_purchase_invoices_page.ui.kaawtj6')}</p>
                <p className="font-bold mt-1">{selectedInvoice.supplier?.name || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-3">
                <p className="text-xs text-gray-400">{t('supplier_purchase_invoices_page.ui.kove7t8')}</p>
                <p className="font-bold mt-1">{selectedInvoice.branch?.name || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">PO: {selectedInvoice.purchaseOrder?.orderNumber || '-'}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-3">
                <p className="text-xs text-gray-400">{t('supplier_purchase_invoices_page.ui.kzaci6q')}</p>
                <p className="font-bold mt-1 text-amber-600">{formatMoney(selectedInvoice.outstandingAmount)} ج.م</p>
                <p className="text-xs text-gray-500 mt-1">المسدد: {formatMoney(selectedInvoice.paidAmount)} ج.م</p>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {(selectedInvoice.installmentsSchedule || []).map((item) => (
                <div key={item._id} className="app-surface rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">قسط #{item.installmentNumber}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatDate(item.dueDate)}</p>
                    </div>
                    <Badge variant={installmentStatusBadge(item.status)}>
                      {item.status === 'pending' && 'معلق'}
                      {item.status === 'partially_paid' && 'مدفوع جزئي'}
                      {item.status === 'paid' && 'مدفوع'}
                      {item.status === 'overdue' && 'متأخر'}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kaaxgsq')}</p>
                      <p className="mt-1 font-black text-gray-900 dark:text-white">{formatMoney(item.amount)}</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kza8sl1')}</p>
                      <p className="mt-1 font-black text-emerald-600">{formatMoney(item.paidAmount)}</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] text-gray-400">{t('supplier_purchase_invoices_page.ui.kzaci6q')}</p>
                      <p className="mt-1 font-black text-amber-600">{formatMoney(item.remainingAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl md:block app-surface">
              <table className="w-full text-sm">
                <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                  <tr>
                    <th className="p-2 text-right">#</th>
                    <th className="p-2 text-right">{t('supplier_purchase_invoices_page.ui.kfe6qqe')}</th>
                    <th className="p-2 text-right">{t('supplier_purchase_invoices_page.ui.kaaxgsq')}</th>
                    <th className="p-2 text-right">{t('supplier_purchase_invoices_page.ui.kza8sl1')}</th>
                    <th className="p-2 text-right">{t('supplier_purchase_invoices_page.ui.kzaci6q')}</th>
                    <th className="p-2 text-right">{t('supplier_purchase_invoices_page.ui.kabct8k')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
                  {(selectedInvoice.installmentsSchedule || []).map((item) => (
                    <tr key={item._id}>
                      <td className="p-2 font-semibold">{item.installmentNumber}</td>
                      <td className="p-2">{formatDate(item.dueDate)}</td>
                      <td className="p-2">{formatMoney(item.amount)} ج.م</td>
                      <td className="p-2">{formatMoney(item.paidAmount)} ج.م</td>
                      <td className="p-2 font-semibold text-amber-600">{formatMoney(item.remainingAmount)} ج.م</td>
                      <td className="p-2">
                        <Badge variant={installmentStatusBadge(item.status)}>
                          {item.status === 'pending' && 'معلق'}
                          {item.status === 'partially_paid' && 'مدفوع جزئي'}
                          {item.status === 'paid' && 'مدفوع'}
                          {item.status === 'overdue' && 'متأخر'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <Card className="app-surface-muted rounded-3xl p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary-500" />
                  {t('supplier_purchase_invoices_page.ui.k14xaai')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label={t('supplier_purchase_invoices_page.form.kaaxgsq')}
                    type="number"
                    min="0"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                  <Select
                    label={t('supplier_purchase_invoices_page.form.krjx83a')}
                    value={paymentForm.installmentId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, installmentId: e.target.value }))}
                    options={[
                      { value: '', label: t('supplier_purchase_invoices_page.ui.kl5m0tp') },
                      ...openInstallments.map((item) => ({
                        value: item._id,
                        label: `قسط #${item.installmentNumber} - ${formatDate(item.dueDate)} - ${formatMoney(item.remainingAmount)} ج.م`,
                      })),
                    ]}
                  />
                  <Select
                    label={t('supplier_purchase_invoices_page.form.kfj3di7')}
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    options={paymentMethodOptions}
                  />
                  <Input
                    label={t('supplier_purchase_invoices_page.form.kfalr2t')}
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label={t('supplier_purchase_invoices_page.form.ki8iche')}
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button icon={<CreditCard className="w-4 h-4" />} loading={paying} onClick={handlePay} className="w-full sm:w-auto">
                    {t('supplier_purchase_invoices_page.ui.k32vtoe')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDetails(false)} className="w-full sm:w-auto">
                    {t('supplier_purchase_invoices_page.ui.kov7vxo')}
                  </Button>
                </div>
              </Card>
            )}

            {!!selectedInvoice.paymentRecords?.length && (
              <Card className="app-surface-muted rounded-3xl p-4">
                <h3 className="font-bold mb-3">{t('supplier_purchase_invoices_page.ui.kebga7s')}</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedInvoice.paymentRecords.map((record) => (
                    <div
                      key={record._id}
                      className="app-surface flex items-center justify-between gap-2 rounded-2xl p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{formatMoney(record.amount)} ج.م</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(record.date)} - {record.method || 'cash'} {record.reference ? `- ${record.reference}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{record.recordedBy?.name || t('supplier_purchase_invoices_page.toasts.k1wekg5')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
