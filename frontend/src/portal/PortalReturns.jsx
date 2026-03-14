import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { RefreshCcw, CheckCircle, Clock, XCircle, ChevronLeft, Package, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalReturns() {
    const { fetchReturnRequests, loading } = usePortalStore();
    const navigate = useNavigate();
    const { dark } = useThemeStore();
    const { t, i18n } = useTranslation('portal');
    const [requests, setRequests] = useState([]);

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        const data = await fetchReturnRequests();
        setRequests(data || []);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'approved': return { key: 'approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle };
            case 'rejected': return { key: 'rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle };
            case 'completed': return { key: 'completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle };
            default: return { key: 'pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
        }
    };

    return (
        <div className="space-y-6 pb-20" dir={i18n.dir()}>
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCcw className="w-6 h-6 text-primary-500" />
                    {t('returns.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('returns.subtitle')}{' '}
                    {t('returns.from_invoices')} <Link to="/portal/invoices" className="text-primary-500 underline">{t('returns.invoices_link')}</Link>.
                </p>
            </div>

            {loading && requests.length === 0 ? (
                <PortalSkeleton count={3} type="list" className="mt-4" />
            ) : requests.length === 0 ? (
                <PortalEmptyState
                    icon={RefreshCcw}
                    title={t('returns.empty_title')}
                    message={t('returns.empty_message')}
                    actionText={t('returns.browse_invoices')}
                    onAction={() => navigate('/portal/invoices')}
                    className="my-8"
                />
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => {
                        const status = getStatusConfig(req.status);
                        const StatusIcon = status.icon;

                        return (
                            <div key={req._id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                                            <Package className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                                {req.product?.name || t('returns.unknown_product')}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {t('returns.qty_invoice', { qty: req.quantity, num: req.invoice?.invoiceNumber })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${status.color}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {t(`returns.statuses.${status.key}`)}
                                    </span>
                                </div>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">{t('returns.request_date')}</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                                {new Date(req.createdAt).toLocaleDateString(locale)}
                                        </span>
                                    </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">{t('returns.reason_label')}</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                                {t(`returns.reasons.${req.reason}`, { defaultValue: req.reason })}
                                            </span>
                                        </div>
                                        {req.refundStatus && req.refundStatus !== 'none' && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">حالة الاسترداد</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-300">
                                                    {req.refundStatus === 'pending' ? 'قيد المعالجة' : req.refundStatus === 'refunded' ? 'تم رد المبلغ' : req.refundStatus}
                                                    {Number(req.refundAmount || 0) > 0 ? ` • ${Number(req.refundAmount).toLocaleString(locale)} ج.م` : ''}
                                                </span>
                                            </div>
                                        )}
                                        {req.restockedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">إعادة للمخزون</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-300">
                                                    {new Date(req.restockedAt).toLocaleDateString(locale)}
                                                </span>
                                            </div>
                                        )}
                                        {req.invoice?.returnStatus && req.invoice.returnStatus !== 'none' && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">حالة الطلب</span>
                                                <span className="font-bold text-orange-600 dark:text-orange-300">{req.invoice.returnStatus}</span>
                                            </div>
                                        )}
                                        {req.adminNotes && (
                                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="block text-gray-500 dark:text-gray-400 mb-1">{t('returns.store_notes')}</span>
                                                <p className="text-gray-700 dark:text-gray-300">{req.adminNotes}</p>
                                            </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
