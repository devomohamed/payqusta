import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Search, CheckCircle, XCircle, Clock, Eye, RefreshCw,
  User, Phone, CreditCard, Shield, Image, AlertTriangle
} from 'lucide-react';
import { useAuthStore, api as globalApi } from '../store';
import { Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

function getStatusConfig(t) {
  return {
    pending: { label: t('k_y_c_review_page.ui.khwh8k7'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    approved: { label: t('k_y_c_review_page.ui.kpbu9nr'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    rejected: { label: t('k_y_c_review_page.ui.kpbjxer'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  };
}

function getTypeLabels(t) {
  return {
    national_id: { label: t('k_y_c_review_page.ui.kh2wjmp'), icon: CreditCard },
    passport: { label: t('k_y_c_review_page.ui.ksvmhl9'), icon: Shield },
    utility_bill: { label: t('k_y_c_review_page.ui.ka3wj31'), icon: FileText },
    contract: { label: t('k_y_c_review_page.ui.kxwrq'), icon: FileText },
    other: { label: t('k_y_c_review_page.ui.ko5okdy'), icon: FileText },
  };
}

export default function KYCReviewPage() {
  const { t } = useTranslation('admin');
  const statusConfig = useMemo(() => getStatusConfig(t), [t]);
  const typeLabels = useMemo(() => getTypeLabels(t), [t]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const { token } = useAuthStore();

  const api = useCallback((method, url, data) =>
    globalApi({ method, url, data }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api('get', `/manage/documents?status=${statusFilter}`);
      const payload = data.data || data;
      setDocuments(payload.documents || []);
      setStats(payload.stats || {});
    } catch {
      notify.error(t('k_y_c_review_page.toasts.kf6d9xk'));
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const reviewDocument = async (customerId, docId, status, reason = '') => {
    setActionLoading(true);
    try {
      await api('patch', `/manage/documents/${customerId}/${docId}`, { status, rejectionReason: reason });
      notify.success(status === 'approved' ? t('k_y_c_review_page.ui.ktb1e0') : t('k_y_c_review_page.ui.kw5zmev'));
      load();
      setViewDoc(null);
      setShowRejectModal(null);
      setRejectReason('');
    } catch {
      notify.error(t('k_y_c_review_page.toasts.k1mzp4v'));
    } finally {
      setActionLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      {/* Header */}
      <div className="app-surface-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> مراجعة مستندات العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('k_y_c_review_page.ui.k9jcdtk')}</p>
        </div>
        <button onClick={load} className="app-surface flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('k_y_c_review_page.ui.khwh8k7'), count: stats.pending || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', filter: 'pending' },
          { label: t('k_y_c_review_page.ui.kpbu9nr'), count: stats.approved || 0, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', filter: 'approved' },
          { label: t('k_y_c_review_page.ui.kpbjxer'), count: stats.rejected || 0, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', filter: 'rejected' },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
            className={`p-4 rounded-2xl text-center transition-all border-2 ${statusFilter === s.filter ? 'border-primary-500 shadow-md' : 'border-transparent'} ${s.color}`}
          >
            <p className="text-2xl font-black">{s.count}</p>
            <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-gray-300" />}
          title={t('k_y_c_review_page.titles.kdwtqiu')}
          description={statusFilter ? t('k_y_c_review_page.ui.knaijbg') : 'لم يتم رفع أي مستندات بعد'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const typeInfo = typeLabels[doc.type] || typeLabels.other;
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={doc._id} className="app-surface overflow-hidden border-0 rounded-3xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                {/* Document Preview */}
                <div
                  className="app-surface-muted h-40 flex items-center justify-center cursor-pointer relative group"
                  onClick={() => setViewDoc(doc)}
                >
                  {doc.url?.startsWith('data:image') ? (
                    <img src={doc.url} alt="Document" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-300" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={doc.status} />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-sm">{typeInfo.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString('ar-EG')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      {doc.customerPhoto ? (
                        <img src={doc.customerPhoto} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{doc.customerName}</p>
                      <p className="text-[10px] text-gray-400">{doc.customerPhone}</p>
                    </div>
                  </div>

                  {doc.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {doc.rejectionReason}
                    </div>
                  )}

                  {/* Actions */}
                  {doc.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => reviewDocument(doc.customerId, doc._id, 'approved')}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> قبول
                      </button>
                      <button
                        onClick={() => setShowRejectModal(doc)}
                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Document Modal */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={t('k_y_c_review_page.titles.kphdezq')} size="lg">
        {viewDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold">{viewDoc.customerName}</p>
                  <p className="text-xs text-gray-400">{viewDoc.customerPhone}</p>
                </div>
              </div>
              <StatusBadge status={viewDoc.status} />
            </div>

            {/* Document Image */}
            <div className={`app-surface-muted rounded-2xl overflow-hidden flex ${viewDoc.backUrl ? 'flex-col lg:flex-row' : 'items-center'} justify-center min-h-[300px] gap-4 p-4`}>
              {viewDoc.url?.startsWith('data:image') || viewDoc.url?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <div className="flex-1 flex flex-col items-center">
                  {viewDoc.backUrl && <span className="text-xs font-bold text-gray-500 mb-2">{t('k_y_c_review_page.ui.kgqfwfh')}</span>}
                  <img src={viewDoc.url} alt="Front Document" className="max-w-full max-h-[400px] object-contain rounded-xl shadow-sm border border-gray-200" />
                </div>
              ) : viewDoc.url?.startsWith('data:application/pdf') || viewDoc.url?.endsWith('.pdf') ? (
                <div className="flex-1 flex flex-col items-center p-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <a href={viewDoc.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-sm font-bold">{t('k_y_c_review_page.ui.koso9oe')}</a>
                </div>
              ) : (
                <div className="flex-1 text-center p-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('k_y_c_review_page.ui.kk7wf64')}</p>
                </div>
              )}

              {viewDoc.backUrl && (
                <>
                  {/* Vertical Divider for lg screens */}
                  <div className="hidden lg:block w-px bg-gray-200 dark:bg-gray-700 self-stretch" />
                  {/* Horizontal Divider for smaller screens */}
                  <div className="block lg:hidden h-px bg-gray-200 dark:bg-gray-700 w-full" />

                  {viewDoc.backUrl?.startsWith('data:image') || viewDoc.backUrl?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs font-bold text-gray-500 mb-2">{t('k_y_c_review_page.ui.kmdmwt2')}</span>
                      <img src={viewDoc.backUrl} alt="Back Document" className="max-w-full max-h-[400px] object-contain rounded-xl shadow-sm border border-gray-200" />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center p-8">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                      <a href={viewDoc.backUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-sm font-bold">{t('k_y_c_review_page.ui.k7iv6q2')}</a>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{t('k_y_c_review_page.ui.kaaw7j4')} <strong>{typeLabels[viewDoc.type]?.label || viewDoc.type}</strong></span>
              <span>تاريخ الرفع: {new Date(viewDoc.uploadedAt).toLocaleString('ar-EG')}</span>
            </div>

            {viewDoc.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => reviewDocument(viewDoc.customerId, viewDoc._id, 'approved')}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> قبول المستند
                </button>
                <button
                  onClick={() => { setShowRejectModal(viewDoc); setViewDoc(null); }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> رفض المستند
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectReason(''); }} title={t('k_y_c_review_page.titles.k1v2z8y')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('k_y_c_review_page.ui.kfkmos1')}</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('k_y_c_review_page.placeholders.kugo1o8')}
            className="app-surface w-full p-3 rounded-xl border border-transparent text-sm resize-none h-24 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-400/20 dark:focus:border-red-500/40"
          />
          <div className="flex gap-3">
            <button
              onClick={() => showRejectModal && reviewDocument(showRejectModal.customerId, showRejectModal._id, 'rejected', rejectReason)}
              disabled={actionLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50"
            >
              {t('k_y_c_review_page.ui.kksqvrs')}
            </button>
            <button
              onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
              className="app-surface flex-1 py-3 rounded-xl font-bold text-sm transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            >
              {t('k_y_c_review_page.ui.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
