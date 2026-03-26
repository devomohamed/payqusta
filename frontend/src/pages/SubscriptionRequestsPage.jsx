import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileText, Check, X, Image as ImageIcon,
    Clock, AlertCircle
} from 'lucide-react';
import { superAdminApi } from '../store';
import toast from 'react-hot-toast';
import { Button, Modal, LoadingSpinner, Badge, EmptyState } from '../components/UI';

export default function SubscriptionRequestsPage() {
  const { t } = useTranslation('admin');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    // Action state
    const [processingId, setProcessingId] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [requestToReject, setRequestToReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await superAdminApi.getSubscriptionRequests({ status: filter });
            setRequests(res.data?.data || []);
        } catch (error) {
            toast.error(t('subscription_requests_page.toasts.kr2fvaw'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const handleApprove = async (id) => {
        setProcessingId(id);
        try {
            await superAdminApi.approveSubscriptionRequest(id);
            toast.success(t('subscription_requests_page.toasts.kvtz867'));
            fetchRequests();
        } catch (error) {
            toast.error(error?.response?.data?.message || t('subscription_requests_page.toasts.k25lirk'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            return toast.error(t('subscription_requests_page.toasts.kehcaf3'));
        }

        setProcessingId(requestToReject._id);
        try {
            await superAdminApi.rejectSubscriptionRequest(requestToReject._id, rejectionReason);
            toast.success(t('subscription_requests_page.toasts.keqyqan'));
            setRejectModalOpen(false);
            setRequestToReject(null);
            setRejectionReason('');
            fetchRequests();
        } catch (error) {
            toast.error(error?.response?.data?.message || t('subscription_requests_page.toasts.kvghoyz'));
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (request) => {
        setRequestToReject(request);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in app-text-soft">
            <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/80">Subscription Review Desk</p>
                            <h1 className="text-2xl font-extrabold">{t('subscription_requests_page.ui.kn84pdz')}</h1>
                            <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                                {t('subscription_requests_page.ui.kj5woqp')}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:w-auto">
                        <div className="app-surface rounded-2xl p-4 text-center">
                            <p className="text-[11px] text-gray-400">{t('subscription_requests_page.ui.ki0ztqo')}</p>
                            <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">{requests.length}</p>
                        </div>
                        <div className="app-surface rounded-2xl p-4 text-center">
                            <p className="text-[11px] text-gray-400">{t('subscription_requests_page.ui.kza2cna')}</p>
                            <p className="mt-1 text-xl font-black text-amber-600">{requests.filter((request) => request.status === 'pending').length}</p>
                        </div>
                        <div className="app-surface rounded-2xl p-4 text-center">
                            <p className="text-[11px] text-gray-400">{t('subscription_requests_page.ui.kz9xguz')}</p>
                            <p className="mt-1 text-xl font-black text-emerald-600">{requests.filter((request) => request.status === 'approved').length}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <div className="app-surface-muted flex w-full overflow-x-auto rounded-2xl border border-gray-100/80 p-1 shadow-sm no-scrollbar dark:border-white/10 sm:w-fit">
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    {t('subscription_requests_page.ui.kxpj8n9')}
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    {t('subscription_requests_page.ui.kklktmm')}
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'app-surface text-gray-800 dark:text-white' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    {t('subscription_requests_page.ui.k94l6ci')}
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : requests.length === 0 ? (
                <EmptyState
                    icon={<FileText />}
                    title={t('subscription_requests_page.titles.kk4v7to')}
                    description={filter === 'pending' ? t('subscription_requests_page.ui.kyj7f20') : 'لم يتم العثور على طلبات مطابقة.'}
                />
            ) : (
                <div className="app-surface rounded-xl shadow-sm border border-gray-100/80 dark:border-white/10 overflow-hidden">
                    <div className="space-y-3 p-4 md:hidden">
                        {requests.map((request) => (
                            <div key={request._id} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-extrabold text-gray-900 dark:text-white">{request.tenant?.name || t('subscription_requests_page.toasts.kk5rm0l')}</p>
                                        <p className="mt-1 text-xs text-gray-400">{request.tenant?.phone || '-'} {request.tenant?.email ? `• ${request.tenant?.email}` : ''}</p>
                                    </div>
                                    <div>
                                        {request.status === 'pending' && <Badge variant="warning">{t('subscription_requests_page.ui.khwh8k7')}</Badge>}
                                        {request.status === 'approved' && <Badge variant="success">{t('subscription_requests_page.ui.kaquluu')}</Badge>}
                                        {request.status === 'rejected' && <Badge variant="danger" title={request.rejectionReason}>{t('subscription_requests_page.ui.kpbjxer')}</Badge>}
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                                        <p className="text-[11px] text-gray-400">{t('subscription_requests_page.ui.kabg07x')}</p>
                                        <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{request.plan?.name || '-'}</p>
                                        <p className="mt-1 text-xs text-gray-400">{request.plan?.price} {request.plan?.currency}</p>
                                    </div>
                                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                                        <p className="text-[11px] text-gray-400">{t('subscription_requests_page.ui.kfj3di7')}</p>
                                        <div className="mt-1">
                                            <Badge variant="info">
                                                {request.gateway === 'instapay' ? t('subscription_requests_page.ui.k5rqh6k') : request.gateway === 'vodafone_cash' ? t('subscription_requests_page.ui.kt931rk') : request.gateway}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span dir="ltr">{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <button
                                        onClick={() => setSelectedReceipt(request.receiptImage)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        {t('subscription_requests_page.ui.kp06w4u')}
                                    </button>

                                    {request.status === 'pending' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                                onClick={() => handleApprove(request._id)}
                                                loading={processingId === request._id}
                                                disabled={processingId !== null}
                                            >
                                                {t('subscription_requests_page.ui.kowzjb0')}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => openRejectModal(request)}
                                                disabled={processingId !== null}
                                            >
                                                {t('subscription_requests_page.ui.reject')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-right text-sm">
                            <thead className="app-surface-muted border-b border-gray-100/80 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">{t('subscription_requests_page.ui.kz6l96x')}</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">{t('subscription_requests_page.ui.kudk7ap')}</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">{t('subscription_requests_page.ui.kfj3di7')}</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">{t('subscription_requests_page.ui.kzbvdnf')}</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">{t('subscription_requests_page.ui.kabct8k')}</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 w-48 font-center">{t('subscription_requests_page.ui.kvfmk6')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {requests.map((request) => (
                                    <tr key={request._id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{request.tenant?.name || t('subscription_requests_page.toasts.kk5rm0l')}</div>
                                            <div className="text-xs text-gray-500">{request.tenant?.phone} | {request.tenant?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{request.plan?.name || '-'}</div>
                                            <div className="text-xs text-gray-500">{request.plan?.price} {request.plan?.currency}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="info">
                                                {request.gateway === 'instapay' ? t('subscription_requests_page.ui.k5rqh6k') : request.gateway === 'vodafone_cash' ? t('subscription_requests_page.ui.kt931rk') : request.gateway}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span dir="ltr">{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {request.status === 'pending' && <Badge variant="warning">{t('subscription_requests_page.ui.khwh8k7')}</Badge>}
                                            {request.status === 'approved' && <Badge variant="success">{t('subscription_requests_page.ui.kaquluu')}</Badge>}
                                            {request.status === 'rejected' && <Badge variant="danger" title={request.rejectionReason}>{t('subscription_requests_page.ui.kpbjxer')}</Badge>}
                                        </td>
                                        <td className="px-6 py-4 text-center space-y-2">
                                            {/* See Receipt Button */}
                                            <button
                                                onClick={() => setSelectedReceipt(request.receiptImage)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                {t('subscription_requests_page.ui.kp06w4u')}
                                            </button>

                                            {/* Approve/Reject Buttons only if pending */}
                                            {request.status === 'pending' && (
                                                <div className="flex gap-2 w-full mt-2">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="flex-1 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                                        onClick={() => handleApprove(request._id)}
                                                        loading={processingId === request._id}
                                                        disabled={processingId !== null}
                                                    >
                                                        <Check className="w-3.5 h-3.5 ml-1" />
                                                        {t('subscription_requests_page.ui.kowzjb0')}
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        className="flex-1 text-xs px-2"
                                                        onClick={() => openRejectModal(request)}
                                                        disabled={processingId !== null}
                                                    >
                                                        <X className="w-3.5 h-3.5 ml-1" />
                                                        {t('subscription_requests_page.ui.reject')}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Picture Viewer Modal */}
            <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title={t('subscription_requests_page.titles.klk4hej')} size="lg">
                {selectedReceipt && (
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src={selectedReceipt}
                            alt="إيصال الدفع"
                            className="max-h-[70vh] rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-full object-contain"
                        />
                        <Button onClick={() => setSelectedReceipt(null)} className="w-full">
                            {t('subscription_requests_page.ui.close')}
                        </Button>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title={t('subscription_requests_page.titles.kh09b2s')}>
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-800">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                            أنت على وشك رفض هذا الإيصال ولن يتم تفعيل الاشتراك للمتجر: <strong>{requestToReject?.tenant?.name}</strong>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">{t('subscription_requests_page.ui.kxq50gx')}</label>
                        <textarea
                            className="app-surface w-full p-3 rounded-xl border border-transparent min-h-[100px] focus:ring-2 focus:ring-primary-500/20"
                            placeholder={t('subscription_requests_page.placeholders.kforgpt')}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>{t('subscription_requests_page.ui.cancel')}</Button>
                        <Button variant="danger" onClick={handleReject} loading={processingId === requestToReject?._id}>{t('subscription_requests_page.ui.kksqvrs')}</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
