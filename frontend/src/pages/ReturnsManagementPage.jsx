import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCcw, Search, Eye, CheckCircle, XCircle, Package, Clock, User
} from 'lucide-react';
import { api as globalApi } from '../store';
import { Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const getStatusConfig = (t) => ({
  pending: { label: t('returns_management_page.ui.khwh8k7'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: t('returns_management_page.ui.ka79e0e'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: t('returns_management_page.ui.kpbjxer'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  completed: { label: t('returns_management_page.ui.kpbuy23'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
});

const getReasonLabels = (t) => ({
  defective: t('returns_management_page.ui.kan6ndp'),
  wrong_item: t('returns_management_page.ui.k8z3717'),
  changed_mind: t('returns_management_page.ui.kzcoccn'),
  other: t('returns_management_page.ui.ksssmb'),
});

export default function ReturnsManagementPage() {
  const { t } = useTranslation('admin');
  const statusConfig = useMemo(() => getStatusConfig(t), [t]);
  const reasonLabels = useMemo(() => getReasonLabels(t), [t]);
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const api = useCallback((method, url, data) =>
    globalApi({ method, url, data }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api('get', `/manage/returns?status=${statusFilter}&search=${search}`);
      const payload = data.data || data;
      setReturns(payload.returns || []);
      setStats(payload.stats || {});
    } catch {
      notify.error(t('returns_management_page.toasts.kg4wwyq'));
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const updateReturn = async (id, status, adminNotes = '') => {
    setActionLoading(true);
    try {
      await api('patch', `/manage/returns/${id}`, { status, adminNotes });
      notify.success(status === 'approved' ? t('returns_management_page.ui.ktcbz6') : status === 'rejected' ? t('returns_management_page.ui.kw60x01') : t('returns_management_page.ui.kar7l11'));
      load();
      setSelected(null);
      setShowRejectModal(null);
      setRejectNotes('');
    } catch {
      notify.error(t('returns_management_page.toasts.k1mzp4v'));
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
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500/80">Returns Control</p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">{t('returns_management_page.ui.kf3mwva')}</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                {t('returns_management_page.ui.kxm5101')}
              </p>
            </div>
          </div>
          <button onClick={load} className="app-surface flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-300 sm:w-auto">
            <RefreshCcw className="w-4 h-4" /> تحديث
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t('returns_management_page.ui.khwh8k7'), count: stats.pending || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', filter: 'pending' },
            { label: t('returns_management_page.ui.ka79e0e'), count: stats.approved || 0, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', filter: 'approved' },
            { label: t('returns_management_page.ui.kpbjxer'), count: stats.rejected || 0, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', filter: 'rejected' },
            { label: t('returns_management_page.ui.kpbuy23'), count: stats.completed || 0, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', filter: 'completed' },
          ].map((s) => (
            <button
              key={s.filter}
              onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
              className={`rounded-2xl border p-4 text-center transition-all duration-200 motion-safe:hover:-translate-y-0.5 ${statusFilter === s.filter ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-transparent'} ${s.color}`}
            >
              <p className="text-2xl font-black">{s.count}</p>
              <p className="mt-1 text-xs font-bold opacity-70">{s.label}</p>
            </button>
          ))}
        </div>
      </section>

      <Card className="app-surface-muted rounded-[2rem] p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Search</p>
          <h2 className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white">{t('returns_management_page.ui.khz20gp')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.ka8k57l')}</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('returns_management_page.placeholders.kbfl19m')}
            className="app-surface w-full rounded-2xl border border-transparent py-3 pl-4 pr-10 text-sm outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
      </Card>

      {/* Table */}
      {loading ? <LoadingSpinner /> : returns.length === 0 ? (
        <EmptyState
          icon={<RefreshCcw className="w-12 h-12 text-gray-300" />}
          title={t('returns_management_page.titles.kcya3ho')}
          description={statusFilter ? t('returns_management_page.ui.krwhrle') : 'لم يتم استلام أي طلبات مرتجعات بعد'}
        />
      ) : (
        <Card className="overflow-hidden rounded-3xl">
          <div className="space-y-3 p-4 md:hidden">
            {returns.map((ret) => (
              <div key={ret._id} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-gray-900 dark:text-white">{ret.customer?.name || '—'}</p>
                    <p className="mt-1 text-xs text-gray-400">{ret.customer?.phone || t('returns_management_page.toasts.k852f3y')}</p>
                  </div>
                  <StatusBadge status={ret.status} />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {ret.product?.images?.[0] ? (
                    <img src={ret.product.images[0]} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="app-surface-muted flex h-12 w-12 items-center justify-center rounded-2xl">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{ret.product?.name || '—'}</p>
                    <p className="mt-1 text-xs text-primary-600">#{ret.invoice?.invoiceNumber || '—'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">{t('returns_management_page.ui.kbrfofc')}</p>
                    <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">{reasonLabels[ret.reason] || ret.reason}</p>
                  </div>
                  <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">{t('returns_management_page.ui.kaay54y')}</p>
                    <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">{ret.quantity}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(ret.createdAt).toLocaleDateString('ar-EG')}</span>
                  {ret.refundStatus && ret.refundStatus !== 'none' ? <span>استرداد: {ret.refundStatus}</span> : <span>{t('returns_management_page.ui.kion2d')}</span>}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={() => setSelected(ret)} className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition-all duration-200 hover:bg-blue-100 dark:bg-blue-900/20">
                    {t('returns_management_page.ui.k3y9kzm')}
                  </button>
                  {ret.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateReturn(ret._id, 'approved')}
                        disabled={actionLoading}
                        className="rounded-2xl bg-green-50 px-4 py-2 text-sm font-bold text-green-600 transition-all duration-200 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20"
                      >
                        {t('returns_management_page.ui.k3y3q9w')}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(ret._id)}
                        className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500 transition-all duration-200 hover:bg-red-100 dark:bg-red-900/20"
                      >
                        {t('returns_management_page.ui.reject')}
                      </button>
                    </>
                  )}
                  {ret.status === 'approved' && (
                    <button
                      onClick={() => updateReturn(ret._id, 'completed')}
                      disabled={actionLoading}
                      className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition-all duration-200 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20"
                    >
                      {t('returns_management_page.ui.kqo0ksu')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-gray-100/80 bg-black/[0.02] dark:border-white/5 dark:bg-white/[0.03]">
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kab4izh')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kaawv6o')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kudvah3')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kovdx7a')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kaay54y')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kzbvdnf')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kabct8k')}</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400 text-center">{t('returns_management_page.ui.k5a5wt5')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/70 dark:divide-white/5">
                {returns.map((ret) => (
                  <tr key={ret._id} className="group transition-colors duration-200 hover:bg-primary-500/[0.03] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-800 dark:text-gray-200">{ret.customer?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{ret.customer?.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {ret.product?.images?.[0] ? (
                          <img src={ret.product.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="app-surface-muted flex h-8 w-8 items-center justify-center rounded-lg">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{ret.product?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-primary-600">#{ret.invoice?.invoiceNumber || '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{reasonLabels[ret.reason] || ret.reason}</td>
                    <td className="px-5 py-4 font-bold">{ret.quantity}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{new Date(ret.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-5 py-4"><StatusBadge status={ret.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setSelected(ret)} className="rounded-xl bg-blue-50 p-2 text-blue-600 transition-all duration-200 hover:bg-blue-100 motion-safe:hover:-translate-y-0.5 dark:bg-blue-900/20" title={t('returns_management_page.titles.k3y9kzm')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {ret.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateReturn(ret._id, 'approved')}
                              disabled={actionLoading}
                              className="rounded-xl bg-green-50 p-2 text-green-600 transition-all duration-200 hover:bg-green-100 motion-safe:hover:-translate-y-0.5 disabled:opacity-50 dark:bg-green-900/20"
                              title={t('returns_management_page.titles.k3y3q9w')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowRejectModal(ret._id)}
                              className="rounded-xl bg-red-50 p-2 text-red-500 transition-all duration-200 hover:bg-red-100 motion-safe:hover:-translate-y-0.5 dark:bg-red-900/20"
                              title={t('returns_management_page.titles.reject')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {ret.status === 'approved' && (
                          <button
                            onClick={() => updateReturn(ret._id, 'completed')}
                            disabled={actionLoading}
                            className="rounded-xl bg-blue-50 p-2 text-blue-600 transition-all duration-200 hover:bg-blue-100 motion-safe:hover:-translate-y-0.5 disabled:opacity-50 dark:bg-blue-900/20"
                            title={t('returns_management_page.titles.kawvwda')}
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        {ret.status === 'completed' && ['pending', 'failed'].includes(ret.refundStatus) && Number(ret.refundAmount || 0) > 0 && (
                          <button
                            onClick={() => updateReturn(ret._id, 'completed')}
                            disabled={actionLoading}
                            className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-all duration-200 hover:bg-emerald-100 motion-safe:hover:-translate-y-0.5 disabled:opacity-50 dark:bg-emerald-900/20"
                            title={t('returns_management_page.titles.k59fy6t')}
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('returns_management_page.titles.khknz88')} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selected.status} />
              {selected.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateReturn(selected._id, 'approved')} disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> موافقة
                  </button>
                  <button onClick={() => { setShowRejectModal(selected._id); setSelected(null); }}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> رفض
                  </button>
                </div>
              )}
              {selected.status === 'approved' && (
                <button
                  onClick={() => updateReturn(selected._id, 'completed')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-1"
                >
                  <Package className="w-4 h-4" /> إكمال المرتجع
                </button>
              )}
              {selected.status === 'completed' && ['pending', 'failed'].includes(selected.refundStatus) && Number(selected.refundAmount || 0) > 0 && (
                <button
                  onClick={() => updateReturn(selected._id, 'completed')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCcw className="w-4 h-4" /> معالجة الاسترداد
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="app-surface-muted rounded-2xl p-4">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-1"><User className="w-3 h-3" /> العميل</h4>
                <p className="font-bold">{selected.customer?.name}</p>
                <p className="text-xs text-gray-400 mt-1">{selected.customer?.phone}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-1"><Package className="w-3 h-3" /> المنتج</h4>
                <p className="font-bold">{selected.product?.name}</p>
                <p className="text-xs text-gray-400 mt-1">الكمية: {selected.quantity}</p>
              </div>
            </div>

            <div className="app-surface-muted rounded-2xl p-4">
              <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">{t('returns_management_page.ui.kbrfofc')}</h4>
              <p className="font-bold text-orange-600">{reasonLabels[selected.reason]}</p>
              {selected.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selected.description}</p>}
            </div>

            {selected.adminNotes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                <h4 className="font-bold text-xs text-blue-500 uppercase mb-2">{t('returns_management_page.ui.khbfvw2')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">{selected.adminNotes}</p>
              </div>
            )}

            {(selected.refundStatus && selected.refundStatus !== 'none') || selected.restockedAt || selected.completedAt ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-xs text-emerald-600 uppercase mb-2">{t('returns_management_page.ui.kl5incr')}</h4>
                {selected.refundStatus && selected.refundStatus !== 'none' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kl1zpa2')}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {selected.refundStatus === 'pending' ? t('returns_management_page.ui.ki0w2sk') : selected.refundStatus === 'refunded' ? t('returns_management_page.ui.khyyhdf') : selected.refundStatus}
                      {Number(selected.refundAmount || 0) > 0 ? ` • ${Number(selected.refundAmount).toLocaleString('ar-EG')} ج.م` : ''}
                    </span>
                  </div>
                ) : null}
                {selected.restockedAt ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.k9mklcc')}</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      {new Date(selected.restockedAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ) : null}
                {selected.completedAt ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.kwmigjj')}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">
                      {new Date(selected.completedAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ) : null}
                {selected.refundedAt ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('returns_management_page.ui.khyyhdf')}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {new Date(selected.refundedAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="text-xs text-gray-400 flex items-center gap-4">
              <span>تاريخ الطلب: {new Date(selected.createdAt).toLocaleString('ar-EG')}</span>
              {selected.reviewedAt && <span>تاريخ المراجعة: {new Date(selected.reviewedAt).toLocaleString('ar-EG')}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectNotes(''); }} title={t('returns_management_page.titles.k1v49u4')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('returns_management_page.ui.kby3lax')}</p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder={t('returns_management_page.placeholders.kfdjsoi')}
            className="app-surface h-24 w-full resize-none rounded-2xl border border-transparent p-3 text-sm outline-none transition-all duration-200 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
          />
          <div className="flex gap-3">
            <button
              onClick={() => updateReturn(showRejectModal, 'rejected', rejectNotes)}
              disabled={actionLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50"
            >
              {t('returns_management_page.ui.kksqvrs')}
            </button>
            <button
              onClick={() => { setShowRejectModal(null); setRejectNotes(''); }}
              className="app-surface flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-200 hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-300"
            >
              {t('returns_management_page.ui.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
