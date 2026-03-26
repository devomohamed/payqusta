import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { Package, Clock, CheckCircle, Truck, XCircle, RotateCcw, ChevronLeft, X, ShoppingBag } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { confirm } from '../components/ConfirmDialog';
import { LoadingSpinner } from '../components/UI';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

const orderStatusConfig = {
    pending: { key: 'pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    confirmed: { key: 'confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { key: 'processing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
    shipped: { key: 'shipped', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    delivered: { key: 'delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { key: 'cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const trackingStepKeys = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const trackingLabelKeys = ['receive', 'confirm', 'prepare', 'ship', 'deliver'];

const refundStatusLabels = {
    none: t('portal_orders.ui.k2yltdq'),
    pending: t('portal_orders.ui.kx56vls'),
    partially_refunded: t('portal_orders.ui.kful99v'),
    refunded: t('portal_orders.ui.khyyhdf'),
    failed: t('portal_orders.ui.khokel4'),
};

const returnStatusLabels = {
    none: t('portal_orders.ui.kcmmmc7'),
    requested: t('portal_orders.ui.ky7odd'),
    approved: t('portal_orders.ui.ktcbz6'),
    received: t('portal_orders.ui.kd7k0gn'),
    rejected: t('portal_orders.ui.kw60x01'),
    refunded: t('portal_orders.ui.kpg8gs7'),
};

export default function PortalOrders() {
    const { fetchOrders, fetchOrderDetails, reorder, cancelOrder } = usePortalStore();
    const { t, i18n } = useTranslation('portal');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [reordering, setReordering] = useState(null);
    const [cancelling, setCancelling] = useState(null);

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        const res = await fetchOrders(1, statusFilter);
        if (res) setOrders(res.orders || []);
        setLoading(false);
    };

    const openDetails = async (id) => {
        setDetailsLoading(true);
        const res = await fetchOrderDetails(id);
        if (res) setSelectedOrder(res);
        setDetailsLoading(false);
    };

    const handleReorder = async (id) => {
        setReordering(id);
        const res = await reorder(id);
        if (res.success) notify.success(res.message);
        else notify.error(res.message);
        setReordering(null);
    };

    const handleCancel = async (id) => {
        const ok = await confirm.show({ title: t('portal_orders.ui.kuqz2jx'), message: t('orders.cancel_confirm'), confirmLabel: t('portal_orders.ui.kuqz2jx'), type: 'warning' });
        if (!ok) return;
        setCancelling(id);
        const res = await cancelOrder(id);
        if (res.success) {
            notify.success(t('orders.cancel_success'));
            loadOrders();
        } else {
            notify.error(res.message);
        }
        setCancelling(null);
    };

    const filters = [
        { value: 'all', label: t('orders.filters.all') },
        { value: 'pending', label: t('orders.statuses.pending') },
        { value: 'confirmed', label: t('orders.filters.confirmed') },
        { value: 'shipped', label: t('orders.filters.shipped') },
        { value: 'delivered', label: t('orders.filters.delivered') },
        { value: 'cancelled', label: t('orders.filters.cancelled') },
    ];

    const getStepIndex = (status) => trackingStepKeys.indexOf(status);

    return (
        <div className="space-y-4 pb-20 app-text-soft" dir={i18n.dir()}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary-500" />
                    {t('orders.title')}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('orders.order_count', { count: orders.length })}</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'app-surface text-gray-600 dark:text-gray-400 border border-gray-100/80 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Orders */}
            {loading ? (
                <PortalSkeleton count={3} type="card" className="mt-4" />
            ) : orders.length === 0 ? (
                <PortalEmptyState
                    icon={ShoppingBag}
                    title={t('orders.empty_title')}
                    message={t('orders.empty_message')}
                    className="my-8"
                />
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const ostatus = orderStatusConfig[order.orderStatus] || orderStatusConfig.pending;
                        const OIcon = ostatus.icon;
                        const currentStepIdx = getStepIndex(order.orderStatus);

                        return (
                            <div
                                key={order._id}
                                className="app-surface rounded-2xl p-4 sm:p-5 border border-gray-100/80 dark:border-white/10 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/5"
                            >
                                {/* Header */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{t('orders.order_num', { num: order.invoiceNumber })}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {new Date(order.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`self-start px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${ostatus.color}`}>
                                            <OIcon className="w-3.5 h-3.5" />
                                            {t(`orders.statuses.${ostatus.key}`)}
                                        </span>
                                        {order.returnStatus && order.returnStatus !== 'none' ? (
                                            <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                {returnStatusLabels[order.returnStatus] || order.returnStatus}
                                            </span>
                                        ) : null}
                                        {order.refundStatus && order.refundStatus !== 'none' ? (
                                            <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                {refundStatusLabels[order.refundStatus] || order.refundStatus}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Tracking Timeline (mini) */}
                                {order.orderStatus !== 'cancelled' && (
                                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                                        {trackingStepKeys.map((stepKey, idx) => (
                                            <React.Fragment key={stepKey}>
                                                <div className="flex flex-col items-center min-w-0">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${idx <= currentStepIdx
                                                        ? 'bg-primary-500 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                        }`}>
                                                        {idx < currentStepIdx ? '✓' : idx + 1}
                                                    </div>
                                                    <span className={`text-[9px] mt-0.5 whitespace-nowrap ${idx <= currentStepIdx ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-400'}`}>
                                                        {t(`orders.tracking.${trackingLabelKeys[idx]}`)}
                                                    </span>
                                                </div>
                                                {idx < trackingStepKeys.length - 1 && (
                                                    <div className={`flex-1 h-0.5 mb-3 ${idx < currentStepIdx ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {/* Price */}
                                <div className="app-surface-muted mb-3 grid grid-cols-1 sm:grid-cols-3 gap-0 rounded-xl overflow-hidden text-center text-xs divide-y sm:divide-y-0 sm:divide-x divide-gray-200/80 dark:divide-white/10">
                                    <div className="p-3">
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('orders.total')}</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{order.totalAmount?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('orders.paid')}</p>
                                        <p className="font-bold text-green-600 dark:text-green-400">{order.paidAmount?.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('orders.remaining')}</p>
                                        <p className="font-bold text-red-600 dark:text-red-400">{order.remainingAmount?.toLocaleString()}</p>
                                    </div>
                                </div>

                                {(order.refundStatus && order.refundStatus !== 'none') || (order.returnStatus && order.returnStatus !== 'none') ? (
                                    <div className="app-surface-muted mb-3 rounded-xl border border-gray-100/80 dark:border-white/10 px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                                        {order.refundStatus && order.refundStatus !== 'none' ? (
                                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {refundStatusLabels[order.refundStatus] || order.refundStatus}
                                                {Number(order.refundAmount || 0) > 0 ? ` • ${Number(order.refundAmount).toLocaleString()} ج.م` : ''}
                                            </p>
                                        ) : null}
                                        {order.returnStatus && order.returnStatus !== 'none' ? (
                                            <p className="mt-1 font-medium text-orange-600 dark:text-orange-300">{returnStatusLabels[order.returnStatus] || order.returnStatus}</p>
                                        ) : null}
                                    </div>
                                ) : null}

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={() => openDetails(order._id)}
                                        className="app-surface flex-1 py-2 rounded-xl border border-gray-100/80 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-400 hover:border-primary-500/40 hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center justify-center gap-1"
                                    >
                                        {t('orders.details')} <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {(order.orderStatus === 'delivered' || order.status === 'paid') && (
                                        <button
                                            onClick={() => handleReorder(order._id)}
                                            disabled={reordering === order._id}
                                            className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition flex items-center justify-center gap-1 disabled:opacity-60"
                                        >
                                            {reordering === order._id ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><RotateCcw className="w-4 h-4" /> {t('orders.reorder')}</>
                                            )}
                                        </button>
                                    )}
                                    {order.orderStatus === 'pending' && (
                                        <button
                                            onClick={() => handleCancel(order._id)}
                                            disabled={cancelling === order._id}
                                            className="flex-1 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-1 disabled:opacity-60"
                                        >
                                            {cancelling === order._id ? (
                                                <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <><XCircle className="w-4 h-4" /> {t('orders.cancel_order')}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal */}
            {(selectedOrder || detailsLoading) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => !detailsLoading && setSelectedOrder(null)}>
                    <div
                        className="app-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100/80 dark:border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {detailsLoading ? (
                            <div className="px-4">
                                <LoadingSpinner size="lg" text={t('orders.loading_details', { defaultValue: 'Loading order details...' })} />
                            </div>
                        ) : selectedOrder && (
                            <>
                                <div className="app-surface sticky top-0 border-b border-gray-100/80 dark:border-white/10 p-4 flex justify-between items-center z-10">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('orders.order_num', { num: selectedOrder.invoiceNumber })}</h3>
                                    <button onClick={() => setSelectedOrder(null)} className="app-surface-muted p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Full Timeline */}
                                    {selectedOrder.orderStatus !== 'cancelled' && (
                                        <div className="app-surface-muted rounded-2xl p-4">
                                            <h4 className="font-bold text-sm mb-3 text-gray-700 dark:text-gray-300">{t('orders.tracking.title')}</h4>
                                            <div className="space-y-0 relative">
                                                <div className="absolute top-4 bottom-4 right-4 w-0.5 bg-gray-200/90 dark:bg-white/10 z-0"></div>
                                                {trackingStepKeys.map((stepKey, idx) => {
                                                    const currentIdx = getStepIndex(selectedOrder.orderStatus);
                                                    const isDone = idx <= currentIdx;
                                                    const isLast = idx === trackingStepKeys.length - 1;
                                                    return (
                                                        <div key={stepKey} className={`flex items-start gap-4 relative z-10 ${isLast ? '' : 'pb-6'}`}>
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ring-4 ring-gray-50 dark:ring-gray-800 ${isDone ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                                {isDone ? '✓' : idx + 1}
                                                            </div>
                                                            <div className="mt-1">
                                                                <p className={`text-sm font-bold ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{t(`orders.tracking.${trackingLabelKeys[idx]}`)}</p>
                                                                {isDone && <p className="text-[10px] text-gray-500 mt-1">{t('orders.tracking.step_done')}</p>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">{t('orders.products')}</h4>
                                        <div className="space-y-2">
                                            {selectedOrder.items?.map((item, idx) => (
                                                <div key={idx} className="app-surface-muted flex items-center gap-3 rounded-xl p-3">
                                                    {item.product?.images?.[0] && (
                                                        <img src={item.product.images[0]} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product?.name || item.productName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('orders.qty', { qty: item.quantity, price: item.price?.toLocaleString() })}</p>
                                                    </div>
                                                    <p className="font-bold text-sm text-primary-600">{item.total?.toLocaleString()} {i18n.language === 'ar' ? t('portal_orders.ui.kwlxf') : 'EGP'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {(selectedOrder.returnStatus && selectedOrder.returnStatus !== 'none') || (selectedOrder.refundStatus && selectedOrder.refundStatus !== 'none') || selectedOrder.cancelReason ? (
                                        <div className="app-surface-muted rounded-2xl p-4 space-y-2">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{t('portal_orders.ui.keqv6gy')}</h4>
                                            {selectedOrder.returnStatus && selectedOrder.returnStatus !== 'none' ? (
                                                <div className="flex justify-between gap-4 text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('portal_orders.ui.kibxyl')}</span>
                                                    <span className="font-bold text-orange-600 dark:text-orange-300">{returnStatusLabels[selectedOrder.returnStatus] || selectedOrder.returnStatus}</span>
                                                </div>
                                            ) : null}
                                            {selectedOrder.refundStatus && selectedOrder.refundStatus !== 'none' ? (
                                                <div className="flex justify-between gap-4 text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('portal_orders.ui.kl1zpa2')}</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-300">
                                                        {refundStatusLabels[selectedOrder.refundStatus] || selectedOrder.refundStatus}
                                                        {Number(selectedOrder.refundAmount || 0) > 0 ? ` • ${Number(selectedOrder.refundAmount).toLocaleString()} ج.م` : ''}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {selectedOrder.cancelReason ? (
                                                <div className="text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">{t('portal_orders.ui.kbrs3jf')}</span>
                                                    <p className="mt-1 font-bold text-gray-800 dark:text-gray-100">{selectedOrder.cancelReason}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
