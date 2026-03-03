import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, ArrowRight, Phone } from 'lucide-react';
import { api } from '../store';
import { notify } from '../components/AnimatedNotification';

const STATUS_CONFIG = {
    pending: { icon: Clock, label: 'قيد الانتظار', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', bar: 'bg-amber-400', step: 1 },
    processing: { icon: Package, label: 'جارٍ التجهيز', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', bar: 'bg-blue-400', step: 2 },
    shipped: { icon: Truck, label: 'في الطريق إليك', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10', bar: 'bg-purple-400', step: 3 },
    delivered: { icon: CheckCircle, label: 'تم التوصيل ✅', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10', bar: 'bg-green-400', step: 4 },
    cancelled: { icon: XCircle, label: 'ملغي', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10', bar: 'bg-red-400', step: 0 },
};

const STEPS = ['قيد الانتظار', 'جارٍ التجهيز', 'في الطريق إليك', 'تم التوصيل'];

export default function OrderTracking() {
    const [orderNumber, setOrderNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [notFound, setNotFound] = useState(false);

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!orderNumber.trim() || !phone.trim()) {
            notify.error('يرجى إدخال رقم الطلب ورقم الهاتف');
            return;
        }
        setLoading(true);
        setNotFound(false);
        setOrder(null);
        try {
            const res = await api.get(`/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`);
            if (res.data.data) {
                setOrder(res.data.data);
            } else {
                setNotFound(true);
            }
        } catch (err) {
            if (err.response?.status === 404) setNotFound(true);
            else notify.error('حدث خطأ، يرجى المحاولة مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    const status = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending) : null;
    const StatusIcon = status?.icon || Package;

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">تتبع طلبك</h1>
                <p className="text-gray-500">أدخل رقم الطلب ورقم الهاتف المسجل لمتابعة حالة شحنتك</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleTrack} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl p-6 mb-8 space-y-4">
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">رقم الطلب</label>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="مثال: ORD-2024-001"
                            className="w-full pr-10 pl-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-primary-400 transition-colors"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">رقم الهاتف</label>
                    <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full pr-10 pl-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-primary-400 transition-colors"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <><Search className="w-4 h-4" /> تتبع الطلب</>
                    )}
                </button>
            </form>

            {/* Not Found */}
            {notFound && (
                <div className="text-center py-12 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800 animate-fade-in">
                    <XCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                    <p className="font-black text-gray-800 dark:text-white mb-1">لم يتم العثور على الطلب</p>
                    <p className="text-sm text-gray-500">تأكد من رقم الطلب ورقم الهاتف وحاول مرة أخرى</p>
                </div>
            )}

            {/* Order Result */}
            {order && status && (
                <div className="space-y-5 animate-slide-up">
                    {/* Status Card */}
                    <div className={`${status.bg} rounded-3xl p-6 border border-gray-100 dark:border-gray-700`}>
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm`}>
                                <StatusIcon className={`w-7 h-7 ${status.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium mb-0.5">حالة الطلب</p>
                                <p className={`text-xl font-black ${status.color}`}>{status.label}</p>
                            </div>
                            <div className="mr-auto text-right">
                                <p className="text-xs text-gray-400">رقم الطلب</p>
                                <p className="font-black text-gray-900 dark:text-white">{order.orderNumber}</p>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        {order.status !== 'cancelled' && (
                            <div className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    {STEPS.map((step, i) => (
                                        <div key={i} className="flex flex-col items-center flex-1">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i + 1 <= status.step ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                {i + 1 <= status.step ? '✓' : i + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-3 -mt-4">
                                    <div
                                        className={`h-full ${status.bar} rounded-full transition-all duration-700`}
                                        style={{ width: `${((status.step - 1) / (STEPS.length - 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    {STEPS.map((step, i) => (
                                        <span key={i} className={`text-[9px] font-bold text-center flex-1 leading-tight ${i + 1 <= status.step ? 'text-primary-600' : 'text-gray-400'}`}>
                                            {step}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-3">
                        <h3 className="font-black text-sm text-gray-500 uppercase tracking-wide">تفاصيل الطلب</h3>
                        {[
                            { label: 'تاريخ الطلب', value: order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                            { label: 'الإجمالي', value: order.total ? `${order.total.toLocaleString()} ج.م` : '—' },
                            { label: 'طريقة الدفع', value: order.paymentMethod || '—' },
                            { label: 'عنوان التوصيل', value: order.shippingAddress?.city || order.shippingAddress?.address || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <span className="text-sm text-gray-500">{label}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Items */}
                    {order.items?.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                            <h3 className="font-black text-sm text-gray-500 uppercase tracking-wide mb-4">المنتجات ({order.items.length})</h3>
                            <div className="space-y-3">
                                {order.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                        {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                                            <p className="text-xs text-gray-400">الكمية: {item.quantity}</p>
                                        </div>
                                        <span className="text-sm font-black text-primary-600">{((item.price || 0) * item.quantity).toLocaleString()} ج.م</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
