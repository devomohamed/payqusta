import React, { useState, useEffect } from 'react';
import {
    FileText, Check, X, Search, Image as ImageIcon,
    Clock, AlertCircle
} from 'lucide-react';
import { superAdminApi } from '../store';
import toast from 'react-hot-toast';
import { Button, Modal, LoadingSpinner, Badge, EmptyState } from '../components/UI';

export default function SubscriptionRequestsPage() {
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
            toast.error('حدث خطأ أثناء تحميل الطلبات');
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
            toast.success('تمت الموافقة وتفعيل الاشتراك بنجاح');
            fetchRequests();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'فشل تفعيل الاشتراك');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            return toast.error('يرجى كتابة سبب الرفض');
        }

        setProcessingId(requestToReject._id);
        try {
            await superAdminApi.rejectSubscriptionRequest(requestToReject._id, rejectionReason);
            toast.success('تم رفض الطلب');
            setRejectModalOpen(false);
            setRequestToReject(null);
            setRejectionReason('');
            fetchRequests();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'فشل رفض الطلب');
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold">طلبات الاشتراكات والإيصالات</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            مراجعة إيصالات الدفع اليدوية (انستاباي ومحافظ الكاش) والموافقة عليها.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="app-surface-muted flex p-1 rounded-xl shadow-sm border border-gray-100/80 dark:border-white/10 w-fit">
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    الطلبات المعلقة
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    الطلبات المقبولة
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'app-surface text-gray-800 dark:text-white' : 'text-gray-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                >
                    كل الطلبات
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : requests.length === 0 ? (
                <EmptyState
                    icon={<FileText />}
                    title="لا توجد طلبات"
                    description={filter === 'pending' ? 'لا توجد طلبات معلقة حالياً تنتظر المراجعة.' : 'لم يتم العثور على طلبات مطابقة.'}
                />
            ) : (
                <div className="app-surface rounded-xl shadow-sm border border-gray-100/80 dark:border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="app-surface-muted border-b border-gray-100/80 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">المتجر (العميل)</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">الباقة المطلوبة</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">طريقة الدفع</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">التاريخ</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">الحالة</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 w-48 font-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {requests.map((request) => (
                                    <tr key={request._id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{request.tenant?.name || 'متجر محذوف'}</div>
                                            <div className="text-xs text-gray-500">{request.tenant?.phone} | {request.tenant?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{request.plan?.name || '-'}</div>
                                            <div className="text-xs text-gray-500">{request.plan?.price} {request.plan?.currency}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="info">
                                                {request.gateway === 'instapay' ? 'إنستاباي' : request.gateway === 'vodafone_cash' ? 'فودافون كاش' : request.gateway}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span dir="ltr">{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {request.status === 'pending' && <Badge variant="warning">قيد المراجعة</Badge>}
                                            {request.status === 'approved' && <Badge variant="success">تم التفعيل</Badge>}
                                            {request.status === 'rejected' && <Badge variant="danger" title={request.rejectionReason}>مرفوض</Badge>}
                                        </td>
                                        <td className="px-6 py-4 text-center space-y-2">
                                            {/* See Receipt Button */}
                                            <button
                                                onClick={() => setSelectedReceipt(request.receiptImage)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                عرض الإيصال
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
                                                        تفعيل
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        className="flex-1 text-xs px-2"
                                                        onClick={() => openRejectModal(request)}
                                                        disabled={processingId !== null}
                                                    >
                                                        <X className="w-3.5 h-3.5 ml-1" />
                                                        رفض
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
            <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="صورة الإيصال" size="lg">
                {selectedReceipt && (
                    <div className="flex flex-col items-center gap-4">
                        <img
                            src={selectedReceipt}
                            alt="إيصال الدفع"
                            className="max-h-[70vh] rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-full object-contain"
                        />
                        <Button onClick={() => setSelectedReceipt(null)} className="w-full">
                            إغلاق
                        </Button>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="رفض طلب الاشتراك">
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-800">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                            أنت على وشك رفض هذا الإيصال ولن يتم تفعيل الاشتراك للمتجر: <strong>{requestToReject?.tenant?.name}</strong>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">سبب الرفض (يظهر للعميل)</label>
                        <textarea
                            className="app-surface w-full p-3 rounded-xl border border-transparent min-h-[100px] focus:ring-2 focus:ring-primary-500/20"
                            placeholder="مثال: الصورة غير واضحة، أو لم يصل المبلغ كاملاً..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>إلغاء</Button>
                        <Button variant="danger" onClick={handleReject} loading={processingId === requestToReject?._id}>تأكيد الرفض</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
