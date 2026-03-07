import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CreditCard, Receipt, RefreshCw, Truck } from 'lucide-react';
import { supplierPurchaseInvoicesApi, suppliersApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '../components/UI';
import Pagination from '../components/Pagination';
import { notify } from '../components/AnimatedNotification';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'open', label: 'مفتوحة' },
  { value: 'partial_paid', label: 'مدفوع جزئي' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'cancelled', label: 'ملغية' },
];

const DUE_SCOPE_OPTIONS = [
  { value: '', label: 'كل المواعيد' },
  { value: 'today', label: 'مستحق اليوم' },
  { value: 'tomorrow', label: 'مستحق غدا' },
  { value: 'upcoming', label: 'مواعيد قادمة' },
  { value: 'overdue', label: 'متأخرة' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'wallet', label: 'محفظة' },
  { value: 'other', label: 'طريقة أخرى' },
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
      notify.error(error.response?.data?.message || 'فشل تحميل فواتير المورد');
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
      notify.success(res.data?.message || 'تمت المزامنة بنجاح');
      await loadInvoices();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل مزامنة الفواتير من أوامر الشراء');
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
      notify.error(error.response?.data?.message || 'فشل تحميل تفاصيل الفاتورة');
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
      return notify.warning('ادخل مبلغ سداد صحيح');
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
      notify.success('تم تسجيل دفعة المورد بنجاح');
      await openDetails(selectedInvoice._id);
      await loadInvoices();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تسجيل الدفعة');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-500" />
            فواتير مشتريات المورد
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            متابعة استحقاقات المورد والاقساط والسداد على مستوى كل فاتورة شراء
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={loadInvoices}>
            تحديث
          </Button>
          {canEdit && (
            <Button variant="outline" loading={syncing} onClick={handleSyncFromPurchaseOrders}>
              مزامنة من أوامر الشراء
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي الفواتير المعروضة</p>
          <p className="text-lg font-extrabold">{formatMoney(summary.total)} ج.م</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي المسدد</p>
          <p className="text-lg font-extrabold text-emerald-600">{formatMoney(summary.paid)} ج.م</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي المتبقي</p>
          <p className="text-lg font-extrabold text-amber-600">{formatMoney(summary.outstanding)} ج.م</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="بحث"
            placeholder="رقم الفاتورة..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <Select
            label="المورد"
            value={filters.supplier}
            onChange={(e) => setFilters((prev) => ({ ...prev, supplier: e.target.value }))}
            options={[
              { value: '', label: 'كل الموردين' },
              ...suppliers.map((supplier) => ({ value: supplier._id, label: supplier.name })),
            ]}
          />
          <Select
            label="حالة الفاتورة"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            options={STATUS_OPTIONS}
          />
          <Select
            label="الاستحقاق"
            value={filters.dueScope}
            onChange={(e) => setFilters((prev) => ({ ...prev, dueScope: e.target.value }))}
            options={DUE_SCOPE_OPTIONS}
          />
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : invoices.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon={Truck}
            title="لا توجد فواتير مشتريات"
            description="لو عندك أوامر شراء مستلمة قديمة اضغط مزامنة من أوامر الشراء."
          />
          {canEdit && (
            <div className="flex justify-center">
              <Button loading={syncing} onClick={handleSyncFromPurchaseOrders}>
                مزامنة الآن
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-right">رقم الفاتورة</th>
                  <th className="p-3 text-right">المورد</th>
                  <th className="p-3 text-right">الفرع</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">المتبقي</th>
                  <th className="p-3 text-right">القسط القادم</th>
                  <th className="p-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.map((invoice) => {
                  const nextInstallment = invoice?.analytics?.nextInstallment;
                  const nextAmount = Number(nextInstallment?.remainingAmount ?? nextInstallment?.amount ?? 0);
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                          <span className="text-xs text-gray-400">لا يوجد</span>
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
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
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
        title="تفاصيل فاتورة مشتريات المورد"
        size="xl"
      >
        {detailsLoading ? (
          <LoadingSpinner />
        ) : !selectedInvoice ? (
          <EmptyState icon={Receipt} title="لا توجد بيانات" description="تعذر تحميل تفاصيل الفاتورة" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-400">المورد</p>
                <p className="font-bold mt-1">{selectedInvoice.supplier?.name || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-400">الفرع</p>
                <p className="font-bold mt-1">{selectedInvoice.branch?.name || '-'}</p>
                <p className="text-xs text-gray-500 mt-1">PO: {selectedInvoice.purchaseOrder?.orderNumber || '-'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-400">المتبقي</p>
                <p className="font-bold mt-1 text-amber-600">{formatMoney(selectedInvoice.outstandingAmount)} ج.م</p>
                <p className="text-xs text-gray-500 mt-1">المسدد: {formatMoney(selectedInvoice.paidAmount)} ج.م</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="p-2 text-right">#</th>
                    <th className="p-2 text-right">موعد الاستحقاق</th>
                    <th className="p-2 text-right">المبلغ</th>
                    <th className="p-2 text-right">المدفوع</th>
                    <th className="p-2 text-right">المتبقي</th>
                    <th className="p-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
              <Card className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary-500" />
                  تسجيل دفعة جديدة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="المبلغ"
                    type="number"
                    min="0"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                  <Select
                    label="توجيه السداد"
                    value={paymentForm.installmentId}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, installmentId: e.target.value }))}
                    options={[
                      { value: '', label: 'توزيع تلقائي على الأقساط الأقدم' },
                      ...openInstallments.map((item) => ({
                        value: item._id,
                        label: `قسط #${item.installmentNumber} - ${formatDate(item.dueDate)} - ${formatMoney(item.remainingAmount)} ج.م`,
                      })),
                    ]}
                  />
                  <Select
                    label="طريقة الدفع"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    options={PAYMENT_METHOD_OPTIONS}
                  />
                  <Input
                    label="مرجع العملية (اختياري)"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="ملاحظات (اختياري)"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button icon={<CreditCard className="w-4 h-4" />} loading={paying} onClick={handlePay}>
                    تسجيل الدفعة
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDetails(false)}>
                    اغلاق
                  </Button>
                </div>
              </Card>
            )}

            {!!selectedInvoice.paymentRecords?.length && (
              <Card className="p-4">
                <h3 className="font-bold mb-3">سجل الدفعات</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedInvoice.paymentRecords.map((record) => (
                    <div
                      key={record._id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold">{formatMoney(record.amount)} ج.م</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(record.date)} - {record.method || 'cash'} {record.reference ? `- ${record.reference}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{record.recordedBy?.name || 'مستخدم النظام'}</span>
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
