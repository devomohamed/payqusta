import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, MapPin, Phone, User, Search, Eye, CheckCircle,
    Truck, Package, XCircle, Clock, RefreshCw, Filter
} from 'lucide-react';
import { useAuthStore, api } from '../store';
import { Badge, Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import Pagination from '../components/Pagination';

const ORDER_STATUS_OPTIONS = [
    { value: '', label: 'كل الطلبات' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'processing', label: 'جاري التجهيز' },
    { value: 'shipped', label: 'تم الشحن' },
    { value: 'delivered', label: 'تم التسليم' },
    { value: 'cancelled', label: 'ملغي' },
];

const STATUS_CONFIG = {
    pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { label: 'جاري التجهيز', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
    shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    delivered: { label: 'تم التسليم', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const NEXT_STATUS = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivered',
};

export default function PortalOrdersAdminPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [shippingActionId, setShippingActionId] = useState(null);
    const [refundActionId, setRefundActionId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const { token } = useAuthStore();
    const LIMIT = 8;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT, source: 'portal,online_store', sort: '-createdAt' };
            if (statusFilter) params.orderStatus = statusFilter;
            if (search) params.search = search;
            const res = await api.get('/invoices', {
                params,
            });
            const payload = res.data?.data || res.data;
            const list = Array.isArray(payload) ? payload : (payload?.invoices || []);
            const pag = payload?.pagination || res.data?.pagination || {};
            setOrders(list);
            setPagination({ totalPages: pag.pages || pag.totalPages || 1, total: pag.total || pag.totalItems || list.length });
        } catch (err) {
            notify.error('فشل تحميل الطلبات');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search, token]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [statusFilter, search]);

    const refreshSelectedOrder = useCallback(async (orderId) => {
        if (!orderId) return null;
        try {
            const res = await api.get(`/invoices/${orderId}`);
            const nextOrder = res.data?.data || null;
            setSelected(nextOrder);
            return nextOrder;
        } catch {
            // Keep current modal data if refresh fails.
            return null;
        }
    }, []);

    const openOrderDetails = async (order) => {
        navigate(`/portal-orders/${order._id}`);
    };

    const closeOrderDetails = useCallback(() => {
        setSelected(null);
    }, []);

    const updateStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await api.patch(`/invoices/${orderId}/order-status`,
                { orderStatus: newStatus }
            );
            notify.success('تم تحديث حالة الطلب');
            load();
            if (selected?._id === orderId) setSelected(prev => ({ ...prev, orderStatus: newStatus }));
        } catch {
            notify.error('فشل تحديث الحالة');
        } finally {
            setUpdatingId(null);
        }
    };

    const createShipment = async (orderId) => {
        const busyKey = `create:${orderId}`;
        setShippingActionId(busyKey);
        try {
            const res = await api.post(`/invoices/${orderId}/shipping/bosta`, {});
            notify.success(`تم إنشاء الشحنة: ${res.data?.data?.waybillNumber || 'تم بنجاح'}`);
            await load();
            await refreshSelectedOrder(orderId);
        } catch (err) {
            notify.error(err.response?.data?.message || 'فشل إنشاء الشحنة');
        } finally {
            setShippingActionId(null);
        }
    };

    const syncShipment = async (orderId) => {
        const busyKey = `track:${orderId}`;
        setShippingActionId(busyKey);
        try {
            const res = await api.get(`/invoices/${orderId}/shipping/bosta/track`);
            notify.success(`تم تحديث الشحنة إلى: ${res.data?.data?.status || 'نجح التحديث'}`);
            await load();
            await refreshSelectedOrder(orderId);
        } catch (err) {
            notify.error(err.response?.data?.message || 'فشل تحديث حالة الشحنة');
        } finally {
            setShippingActionId(null);
        }
    };

    const processRefund = async (orderId) => {
        setRefundActionId(orderId);
        try {
            const res = await api.post(`/invoices/${orderId}/refund`, {});
            const refund = res.data?.data?.refund || {};
            if (refund.executedAmount > 0) {
                notify.success(`تم تنفيذ استرداد بقيمة ${fmt(refund.executedAmount)} ج.م`);
            } else {
                notify.success(res.data?.message || 'تم تحديث حالة الاسترداد');
            }
            await load();
            await refreshSelectedOrder(orderId);
        } catch (err) {
            notify.error(err.response?.data?.message || 'فشل تنفيذ الاسترداد');
        } finally {
            setRefundActionId(null);
        }
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');

    const StatusBadge = ({ status }) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
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
                        <ShoppingBag className="w-6 h-6 text-primary-500" /> طلبات البوابة الإلكترونية
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">الطلبات التي أرسلها العملاء من بوابتهم</p>
                </div>
                <button onClick={load} className="app-surface flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                    <RefreshCw className="w-4 h-4" /> تحديث
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="بحث باسم العميل أو رقم الطلب..."
                        className="app-surface w-full pr-10 pl-4 py-2.5 rounded-xl border border-transparent text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    />
                </div>
                <div className="relative sm:w-52">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="app-surface w-full pr-10 pl-4 py-2.5 rounded-xl border border-transparent text-sm outline-none transition appearance-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                        {ORDER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = orders.filter(o => o.orderStatus === key).length;
                    if (!count) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${statusFilter === key ? cfg.color + ' border-transparent' : 'app-surface border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-500/30'}`}
                        >
                            {cfg.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            {loading ? <LoadingSpinner /> : orders.length === 0 ? (
                <EmptyState
                    icon={<ShoppingBag className="w-12 h-12 text-gray-300" />}
                    title="لا توجد طلبات"
                    description={statusFilter ? 'لا توجد طلبات بهذه الحالة' : 'لم يتم استلام أي طلبات من البوابة بعد'}
                />
            ) : (
                <>
                    <Card className="app-surface overflow-hidden border-0 rounded-3xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead>
                                    <tr className="app-surface-muted border-b border-gray-100/80 dark:border-white/10">
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">رقم الطلب</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">العميل</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">التوصيل</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">التاريخ</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الإجمالي</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/70 dark:divide-white/10">
                                    {orders.map(order => (
                                        <tr key={order._id} className="group transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                                            <td className="px-5 py-4 font-bold text-primary-600 dark:text-primary-400">
                                                #{order.invoiceNumber}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{order.shippingAddress?.fullName || order.customer?.name || '—'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {order.shippingAddress?.phone || order.customer?.phone || '—'}
                                                </div>
                                                {order.shippingAddress?.fullName && order.customer?.name && order.shippingAddress.fullName !== order.customer.name ? (
                                                    <div className="text-[10px] text-gray-400 mt-1">الحساب: {order.customer.name}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-5 py-4">
                                                {order.shippingAddress ? (
                                                    <div className="flex items-start gap-1 text-xs text-gray-600 dark:text-gray-400 max-w-[180px]">
                                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                                                        <span className="truncate">{order.shippingAddress.governorate} — {order.shippingAddress.address}</span>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 text-xs">
                                                {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                                                <div className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-5 py-4 font-black text-gray-800 dark:text-gray-200">
                                                {fmt(order.totalAmount)} <span className="text-[10px] font-normal text-gray-400">ج.م</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={order.orderStatus || 'pending'} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openOrderDetails(order)}
                                                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                                                        title="عرض التفاصيل"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {NEXT_STATUS[order.orderStatus] && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, NEXT_STATUS[order.orderStatus])}
                                                            disabled={updatingId === order._id}
                                                            className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition disabled:opacity-50"
                                                            title={`تحديث إلى: ${STATUS_CONFIG[NEXT_STATUS[order.orderStatus]]?.label}`}
                                                        >
                                                            {updatingId === order._id
                                                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                                : <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {!order.shippingDetails?.waybillNumber && order.orderStatus !== 'cancelled' ? (
                                                        <button
                                                            onClick={() => createShipment(order._id)}
                                                            disabled={shippingActionId === `create:${order._id}`}
                                                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition disabled:opacity-50"
                                                            title="إنشاء شحنة"
                                                        >
                                                            {shippingActionId === `create:${order._id}`
                                                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                                : <Truck className="w-4 h-4" />}
                                                        </button>
                                                    ) : null}
                                                    {order.shippingDetails?.waybillNumber ? (
                                                        <button
                                                            onClick={() => syncShipment(order._id)}
                                                            disabled={shippingActionId === `track:${order._id}`}
                                                            className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition disabled:opacity-50"
                                                            title="تحديث الشحنة"
                                                        >
                                                            <RefreshCw className={`w-4 h-4 ${shippingActionId === `track:${order._id}` ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    ) : null}
                                                    {['pending', 'confirmed', 'processing'].includes(order.orderStatus) && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, 'cancelled')}
                                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                                                            title="إلغاء الطلب"
                                                        >
                                                            <XCircle className="w-4 h-4" />
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
                    <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} onPageChange={setPage} />
                </>
            )}

            {/* Order Detail Modal */}
            <Modal open={!!selected} onClose={closeOrderDetails} title={`تفاصيل الطلب #${selected?.invoiceNumber}`} size="lg">
                {selected && (
                    <div className="space-y-5">
                        {/* Status */}
                        <div className="flex items-center gap-3">
                            <StatusBadge status={selected.orderStatus || 'pending'} />
                            {NEXT_STATUS[selected.orderStatus] && (
                                <button
                                    onClick={() => updateStatus(selected._id, NEXT_STATUS[selected.orderStatus])}
                                    disabled={updatingId === selected._id}
                                    className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updatingId === selected._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> تحديث إلى: {STATUS_CONFIG[NEXT_STATUS[selected.orderStatus]]?.label}</>}
                                </button>
                            )}
                            {!selected.shippingDetails?.waybillNumber && selected.orderStatus !== 'cancelled' ? (
                                <button
                                    onClick={() => createShipment(selected._id)}
                                    disabled={shippingActionId === `create:${selected._id}`}
                                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {shippingActionId === `create:${selected._id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4" /> إنشاء شحنة</>}
                                </button>
                            ) : null}
                            {selected.shippingDetails?.waybillNumber ? (
                                <button
                                    onClick={() => syncShipment(selected._id)}
                                    disabled={shippingActionId === `track:${selected._id}`}
                                    className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${shippingActionId === `track:${selected._id}` ? 'animate-spin' : ''}`} />
                                    تحديث الشحنة
                                </button>
                            ) : null}
                            {selected.refundStatus && ['pending', 'partially_refunded', 'failed'].includes(selected.refundStatus) && Number(selected.refundAmount || 0) > 0 ? (
                                <button
                                    onClick={() => processRefund(selected._id)}
                                    disabled={refundActionId === selected._id}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refundActionId === selected._id ? 'animate-spin' : ''}`} />
                                    معالجة الاسترداد
                                </button>
                            ) : null}
                        </div>

                        {/* Customer & Shipping */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="app-surface-muted rounded-2xl p-4">
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> بيانات العميل</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-3"><span className="text-gray-400">الاسم</span><span className="font-bold text-left">{selected.shippingAddress?.fullName || selected.customer?.name || '—'}</span></div>
                                    <div className="flex justify-between gap-3"><span className="text-gray-400">التليفون</span><span className="font-bold" dir="ltr">{selected.shippingAddress?.phone || selected.customer?.phone || '—'}</span></div>
                                    {selected.shippingAddress?.fullName && selected.customer?.name && selected.shippingAddress.fullName !== selected.customer.name ? (
                                        <div className="flex justify-between gap-3"><span className="text-gray-400">اسم الحساب</span><span className="font-bold text-left">{selected.customer.name}</span></div>
                                    ) : null}
                                </div>
                            </div>
                                <div className="app-surface-muted rounded-2xl p-4">
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> بيانات التوصيل</h4>
                                {selected.shippingAddress ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-400">المستلم</span><span className="font-bold">{selected.shippingAddress.fullName}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">التليفون</span><span className="font-bold" dir="ltr">{selected.shippingAddress.phone}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">المحافظة</span><span className="font-bold">{selected.shippingAddress.governorate} {selected.shippingAddress.city && `/ ${selected.shippingAddress.city}`}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400 flex-shrink-0">العنوان</span><span className="font-bold text-left max-w-[60%]">{selected.shippingAddress.address}</span></div>
                                        {selected.shippingAddress.notes && <div className="flex justify-between"><span className="text-gray-400">ملاحظات</span><span className="text-gray-600 dark:text-gray-400 text-left max-w-[60%]">{selected.shippingAddress.notes}</span></div>}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={MapPin}
                                        title="لا توجد بيانات توصيل"
                                        description="لم يتم تسجيل عنوان أو تفاصيل شحن لهذا الطلب بعد."
                                        className="py-4"
                                    />
                                )}
                            </div>
                            <div className="app-surface-muted rounded-2xl p-4">
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> حالة الشحن</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">وسيلة الشحن</span><span className="font-bold">{selected.shippingMethod || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">رقم التتبع</span><span className="font-bold" dir="ltr">{selected.trackingNumber || selected.shippingDetails?.waybillNumber || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">حالة شركة الشحن</span><span className="font-bold">{selected.shippingDetails?.status || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">موعد متوقع</span><span className="font-bold">{selected.estimatedDeliveryDate ? new Date(selected.estimatedDeliveryDate).toLocaleDateString('ar-EG') : '—'}</span></div>
                                </div>
                                {selected.shippingDetails?.trackingUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => window.open(selected.shippingDetails.trackingUrl, '_blank', 'noopener,noreferrer')}
                                        className="mt-4 w-full rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm font-bold text-primary-700 transition hover:border-primary-300 hover:bg-primary-50 dark:border-primary-800 dark:bg-gray-900 dark:text-primary-300"
                                    >
                                        فتح رابط التتبع
                                    </button>
                                ) : null}
                            </div>
                            {(selected.refundStatus && selected.refundStatus !== 'none') || selected.cancelReason ? (
                            <div className="app-surface-muted rounded-2xl p-4">
                                    <h4 className="font-bold text-xs text-gray-400 uppercase mb-3">الاسترداد والإلغاء</h4>
                                    <div className="space-y-2 text-sm">
                                        {selected.refundStatus && selected.refundStatus !== 'none' ? (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">حالة الاسترداد</span>
                                                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                                    {selected.refundStatus === 'pending'
                                                        ? 'قيد المعالجة'
                                                        : selected.refundStatus === 'partially_refunded'
                                                            ? 'تم رد جزء من المبلغ'
                                                            : selected.refundStatus === 'refunded'
                                                                ? 'تم رد المبلغ'
                                                                : selected.refundStatus === 'failed'
                                                                    ? 'فشل الاسترداد'
                                                                    : selected.refundStatus}
                                                </span>
                                            </div>
                                        ) : null}
                                        {Number(selected.refundAmount || 0) > 0 ? (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">المبلغ المطلوب رده</span>
                                                <span className="font-bold">{fmt(selected.refundAmount)} ج.م</span>
                                            </div>
                                        ) : null}
                                        {selected.cancelReason ? (
                                            <div className="flex justify-between gap-3">
                                                <span className="text-gray-400 flex-shrink-0">سبب الإلغاء</span>
                                                <span className="font-bold text-left max-w-[60%]">{selected.cancelReason}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Items */}
                        <div>
                            <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> المنتجات</h4>
                            <div className="space-y-2">
                                {selected.items?.map((item, i) => (
                                    <div key={i} className="app-surface-muted flex justify-between items-center rounded-xl px-4 py-3">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.productName || item.product?.name || '—'}</p>
                                            <p className="text-xs text-gray-400">الكمية: {item.quantity} × {fmt(item.unitPrice)} ج.م</p>
                                        </div>
                                        <p className="font-black text-primary-600">{fmt(item.totalPrice)} ج.م</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100/80 dark:border-white/10 px-4">
                                <span className="font-bold text-gray-700 dark:text-gray-300">الإجمالي</span>
                                <span className="font-black text-xl text-primary-600">{fmt(selected.totalAmount)} ج.م</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {selected.notes && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
                                <span className="font-bold">ملاحظات: </span>{selected.notes}
                            </div>
                        )}

                        {/* Electronic Signature */}
                        {selected.electronicSignature && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                <h4 className="font-bold mb-1 flex items-center gap-2">التوقيع الإلكتروني الإلزامي (للشراء الآجل)</h4>
                                <p className="text-emerald-600 dark:text-emerald-500 text-xs mb-2">
                                    أقر العميل بصحة البيانات وبالموافقة على شروط الدفع الآجل بالتفويض التالي:
                                </p>
                                <p className="font-medium text-emerald-900 dark:text-emerald-100 font-mono text-base bg-white/60 dark:bg-black/20 px-4 py-2 rounded-lg text-center shadow-inner">
                                    {selected.electronicSignature}
                                </p>
                            </div>
                        )}

                        {/* Status History */}
                        {selected.orderStatusHistory?.length > 0 && (
                            <div>
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3">سجل الحالة</h4>
                                <div className="space-y-2">
                                    {selected.orderStatusHistory.map((h, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS_CONFIG[h.status]?.color || 'bg-gray-100 text-gray-600'}`}>{STATUS_CONFIG[h.status]?.label || h.status}</span>
                                            <span className="text-gray-400">{new Date(h.date).toLocaleString('ar-EG')}</span>
                                            {h.note && <span className="text-gray-500">— {h.note}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
