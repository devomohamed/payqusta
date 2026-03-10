import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { Receipt, Eye, X, Calendar, CreditCard, Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Filter, Download, RefreshCcw, DollarSign } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { LoadingSpinner } from '../components/UI';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';


const statusConfig = {
  paid: { key: 'paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  partial: { key: 'partial', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  pending: { key: 'pending', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  overdue: { key: 'overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
};

export default function PortalInvoices() {
  const { fetchInvoices, fetchInvoiceDetails, downloadInvoicePDF, createReturnRequest, payInvoice } = usePortalStore();
  const { t, i18n } = useTranslation('portal');
  const { dark } = useThemeStore();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Payment State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Return Request State
  const [returnItem, setReturnItem] = useState(null);
  const [returnReason, setReturnReason] = useState('defective');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnDesc, setReturnDesc] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    loadInvoices(1, statusFilter);
  }, [statusFilter]);

  const loadInvoices = async (page, status) => {
    setLoading(true);
    const res = await fetchInvoices(page, status);
    if (res) {
      setInvoices(res.invoices || []);
      setPagination({ page: res.page || 1, pages: res.pages || 1, total: res.total || 0 });
    }
    setLoading(false);
  };

  const openDetails = async (id) => {
    setDetailsLoading(true);
    const res = await fetchInvoiceDetails(id);
    if (res) setSelectedInvoice(res);
    setDetailsLoading(false);
  };

  const filters = [
    { value: 'all', label: t('invoices.filters.all') },
    { value: 'paid', label: t('invoices.filters.paid') },
    { value: 'partial', label: t('invoices.filters.partial') },
    { value: 'pending', label: t('invoices.filters.pending') },
    { value: 'overdue', label: t('invoices.filters.overdue') },
  ];

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const currency = i18n.language === 'ar' ? 'ج.م' : 'EGP';

  return (
    <div className="space-y-4 pb-20" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary-500" />
          {t('invoices.title')}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.invoice_count', { count: pagination.total })}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <PortalSkeleton count={4} type="card" />
      ) : invoices.length === 0 ? (
        <PortalEmptyState
          icon={Receipt}
          title={t('invoices.empty_title')}
          message={t('invoices.empty_message')}
          className="my-8"
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const status = statusConfig[inv.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={inv._id}
                onClick={() => openDetails(inv._id)}
                className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{t('invoices.invoice_num', { num: inv.invoiceNumber })}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(inv.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`self-start px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {t(`invoices.statuses.${status.key}`)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
                  <div className="text-center p-3">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{t('invoices.total')}</p>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{inv.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{t('invoices.paid_amount')}</p>
                    <p className="font-bold text-sm text-green-600 dark:text-green-400">{inv.paidAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{t('invoices.remaining')}</p>
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">{inv.remainingAmount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('invoices.product_count', { count: inv.items?.length || 0 })}</span>
                  <span className="flex items-center gap-1 text-primary-500">
                    {t('invoices.view_details')} <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            onClick={() => loadInvoices(pagination.page - 1, statusFilter)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => loadInvoices(pagination.page + 1, statusFilter)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Invoice Details Modal */}
      {(selectedInvoice || detailsLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => !detailsLoading && setSelectedInvoice(null)}>
          <div
            className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailsLoading ? (
              <div className="px-4">
                <LoadingSpinner size="lg" text="جاري تحميل تفاصيل الفاتورة..." />
              </div>
            ) : selectedInvoice && (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-start justify-between gap-3 z-10">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {t('invoices.invoice_num', { num: selectedInvoice.invoiceNumber })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await downloadInvoicePDF(selectedInvoice._id);
                        if (!res.success) notify.error(t('invoices.download_fail'));
                      }}
                      className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 transition flex items-center gap-1 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('invoices.date')}</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">
                        {new Date(selectedInvoice.date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('invoices.status')}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${(statusConfig[selectedInvoice.status] || statusConfig.pending).color}`}>
                        {t(`invoices.statuses.${(statusConfig[selectedInvoice.status] || statusConfig.pending).key}`)}
                      </span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('invoices.paid_amount')}</p>
                      <p className="font-bold text-green-600 dark:text-green-400 text-sm mt-1">
                        {selectedInvoice.paidAmount?.toLocaleString()} {currency}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('invoices.remaining')}</p>
                      <p className="font-bold text-red-600 dark:text-red-400 text-sm mt-1">
                        {selectedInvoice.remainingAmount?.toLocaleString()} {currency}
                      </p>
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  {selectedInvoice.remainingAmount > 0 && (
                    <button
                      onClick={() => {
                        setPayAmount(String(selectedInvoice.remainingAmount));
                        setPayMethod('online_card');
                        setPayNotes('');
                        setPayModalOpen(true);
                      }}
                      className="w-full py-3 bg-primary-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
                    >
                      <DollarSign className="w-5 h-5" />
                      {t('invoices.pay_now', { amount: selectedInvoice.remainingAmount?.toLocaleString() })}
                    </button>
                  )}

                  {/* Items Table */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">{t('invoices.products')}</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[580px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-right p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('invoices.product')}</th>
                            <th className="text-center p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('invoices.quantity')}</th>
                            <th className="text-center p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('invoices.price')}</th>
                            <th className="text-left p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{t('invoices.total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                              <td className="p-3 font-medium text-gray-900 dark:text-white">{item.productName || item.product?.name || '-'}</td>
                              <td className="p-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                              <td className="p-3 text-center text-gray-600 dark:text-gray-400">{item.price?.toLocaleString()}</td>
                              <td className="p-3 text-left font-bold text-gray-900 dark:text-white">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{item.total?.toLocaleString()}</span>
                                  <button
                                    onClick={() => {
                                      setReturnItem({ ...item, invoiceId: selectedInvoice._id });
                                      setReturnQuantity(1);
                                      setReturnReason('defective');
                                      setReturnDesc('');
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                                    title={t('invoices.return_title')}
                                  >
                                    <RefreshCcw className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 dark:bg-gray-700/50">
                            <td colSpan="3" className="p-3 font-bold text-gray-900 dark:text-white">{t('invoices.total')}</td>
                            <td className="p-3 text-left font-black text-primary-600 dark:text-primary-400">{selectedInvoice.totalAmount?.toLocaleString()} {currency}</td>
                          </tr>
                        </tfoot>
                      </table>
                      </div>
                    </div>
                  </div>

                  {/* Installments */}
                  {selectedInvoice.installments && selectedInvoice.installments.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary-500" />
                        {t('invoices.installments')}
                      </h4>
                      <div className="space-y-2">
                        {selectedInvoice.installments.map((inst, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border ${inst.status === 'paid'
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                              : inst.status === 'overdue'
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                          >
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{t('invoices.installment_num', { num: idx + 1 })}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {new Date(inst.dueDate).toLocaleDateString(locale)}
                              </p>
                            </div>
                            <div className="text-right sm:text-left">
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{inst.amount?.toLocaleString()} {currency}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inst.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : inst.status === 'overdue'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {inst.status === 'paid' ? t('invoices.installment_paid') : inst.status === 'overdue' ? t('invoices.installment_overdue') : t('invoices.installment_upcoming')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('invoices.notes')}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal — Gateway based */}
      {payModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-500" />
                سداد الفاتورة #{selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setPayModalOpen(false)} disabled={payLoading} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Amount summary */}
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">المبلغ المتبقي</p>
                <p className="text-2xl font-black text-primary-600 dark:text-primary-400">
                  {selectedInvoice.remainingAmount?.toLocaleString('ar-EG')} ج.م
                </p>
              </div>

              {/* Gateway choice */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اختر طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'paymob', label: 'Paymob', sub: 'فيزا / ماستركارد / محفظة', icon: '💳' },
                    { id: 'fawry', label: 'Fawry', sub: 'دفع نقدي في المحلات', icon: '🏪' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setPayMethod(g.id)}
                      className={`p-3 rounded-xl border-2 text-right transition-all ${payMethod === g.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                    >
                      <div className="text-2xl mb-1">{g.icon}</div>
                      <p className={`text-sm font-bold ${payMethod === g.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{g.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{g.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  setPayLoading(true);
                  const res = await payInvoice(selectedInvoice._id, payMethod, selectedInvoice.remainingAmount);
                  setPayLoading(false);
                  if (res.success && res.data?.paymentLink) {
                    window.open(res.data.paymentLink, '_blank');
                    setPayModalOpen(false);
                    notify.success('تم إنشاء رابط الدفع — أكمل عملية الدفع في النافذة الجديدة');
                  } else if (res.success && res.data?.transaction) {
                    // Paymob might need gateway not enabled yet
                    notify.error(res.message || 'بوابة الدفع غير مفعلة. تواصل مع المتجر.');
                  } else {
                    notify.error(res.message || 'فشل إنشاء رابط الدفع');
                  }
                }}
                disabled={payLoading || !payMethod}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الإنشاء...</>
                ) : (
                  <><CreditCard className="w-5 h-5" /> ادفع الآن</>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                ستُفتح صفحة الدفع في نافذة جديدة آمنة
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-primary-500" />
                {t('invoices.return_request')}
              </h3>
              <button
                onClick={() => setReturnItem(null)}
                disabled={returnLoading}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{returnItem.productName || returnItem.product?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('invoices.purchased_qty', { qty: returnItem.quantity })}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('invoices.return_qty')}</label>
                <input
                  type="number"
                  min="1"
                  max={returnItem.quantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(Math.min(parseInt(e.target.value) || 1, returnItem.quantity))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('invoices.return_reason')}</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                >
                  <option value="defective">{t('invoices.reason_defective')}</option>
                  <option value="wrong_item">{t('invoices.reason_wrong')}</option>
                  <option value="changed_mind">{t('invoices.reason_changed_mind')}</option>
                  <option value="other">{t('invoices.reason_other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('invoices.additional_notes')}</label>
                <textarea
                  rows="2"
                  value={returnDesc}
                  onChange={(e) => setReturnDesc(e.target.value)}
                  placeholder={t('invoices.explain_issue')}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    setReturnLoading(true);
                    const res = await createReturnRequest({
                      invoiceId: returnItem.invoiceId,
                      productId: returnItem.product._id || returnItem.product,
                      quantity: returnQuantity,
                      reason: returnReason,
                      description: returnDesc
                    });

                    if (res.success) {
                      notify.success(t('invoices.return_success'));
                      setReturnItem(null);
                    } else {
                      notify.error(res.message);
                    }
                    setReturnLoading(false);
                  }}
                  disabled={returnLoading}
                  className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                  {returnLoading ? t('invoices.sending') : t('invoices.confirm_return')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
