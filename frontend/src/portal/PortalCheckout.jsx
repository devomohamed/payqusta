import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ShoppingBag, MapPin, Phone, User, ChevronRight,
    CheckCircle, Package, AlertCircle, Building2, Loader2,
    ArrowLeft, Tag, Trash2
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { notify } from '../components/AnimatedNotification';
import {
    buildEstimatedDeliveryDate,
    findStorefrontShippingZone,
    resolveStorefrontShippingSettings,
} from '../storefront/storefrontShipping';

const EGYPT_GOVERNORATES = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر',
    'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية',
    'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان',
    'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية',
    'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا',
    'شمال سيناء', 'سوهاج',
];

export default function PortalCheckout() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');
    const { cart, customer, checkout, clearCart, validateCoupon } = usePortalStore();

    const STEPS = [
        { id: 'shipping', label: t('checkout.steps.shipping'), icon: MapPin },
        { id: 'review', label: t('checkout.steps.review'), icon: Package },
        { id: 'done', label: t('checkout.steps.done'), icon: CheckCircle },
    ];

    const [step, setStep] = useState('shipping');
    const [loading, setLoading] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [orderNumber, setOrderNumber] = useState(null);

    const installmentSettings = customer?.tenant?.settings?.installments || {};
    const [paymentMethod, setPaymentMethod] = useState('deferred'); // 'cash' or 'deferred'
    const [months, setMonths] = useState(installmentSettings.defaultMonths || 6);

    const hasDocuments = customer?.documents && customer.documents.length > 0;
    const maxMonths = installmentSettings.maxMonths || 12;

    const [form, setForm] = useState({
        fullName: customer?.name || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        city: '',
        governorate: '',
        notes: '',
        signature: '',
    });

    const [errors, setErrors] = useState({});

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState('');

    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const shippingConfig = resolveStorefrontShippingSettings(customer?.tenant?.settings?.shipping);
    const selectedShippingZone = findStorefrontShippingZone(shippingConfig.zones, form.governorate);
    const shippingFeeBase = selectedShippingZone?.fee ?? shippingConfig.baseFee;
    const shippingDiscount =
        shippingConfig.freeShippingThreshold > 0 && subtotal >= shippingConfig.freeShippingThreshold
            ? shippingFeeBase
            : 0;
    const shipping = Math.max(0, shippingFeeBase - shippingDiscount);
    const shippingEta = selectedShippingZone?.eta || shippingConfig.eta;
    const shippingSummary = {
        shippingFee: shippingFeeBase,
        shippingDiscount,
        carrierCost: shippingFeeBase,
        shippingMethod: shippingConfig.defaultMethodName,
        provider: shippingConfig.provider,
        zoneCode: selectedShippingZone?.code || '',
        zoneLabel: selectedShippingZone?.label || form.governorate || '',
        estimatedDaysMin: selectedShippingZone?.estimatedDaysMin ?? shippingConfig.estimatedDaysMin,
        estimatedDaysMax: selectedShippingZone?.estimatedDaysMax ?? shippingConfig.estimatedDaysMax,
        estimatedDeliveryDate: buildEstimatedDeliveryDate(
            selectedShippingZone?.estimatedDaysMax ?? shippingConfig.estimatedDaysMax
        ),
    };
    const discount = couponData ? couponData.discountAmount : 0;
    const total = Math.max(0, subtotal + shipping - discount);
    const branchRoutingNote = '?????? ?????? ??? ??????? ???????? ??? ????? ??????? ????? ???????? ???? ?????? ??? ??????? ???? ?? ????? ??????? ????? ?????.';

    const creditLimit = customer?.financials?.creditLimit ?? customer?.creditLimit ?? 0;
    const outstandingBalance = customer?.financials?.outstandingBalance ?? customer?.outstandingBalance ?? 0;
    const creditAvailable = Math.max(0, creditLimit - outstandingBalance);

    useEffect(() => {
        if (shippingConfig.supportsCashOnDelivery === false && paymentMethod === 'cash') {
            setPaymentMethod('deferred');
        }
    }, [paymentMethod, shippingConfig.supportsCashOnDelivery]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');
        const res = await validateCoupon(couponCode.trim().toUpperCase(), subtotal);
        setCouponLoading(false);
        if (res.success) {
            setCouponData(res.data);
            notify.success(t('checkout.coupon.applied', { amount: res.data.discountAmount?.toLocaleString() }));
        } else {
            setCouponError(res.message);
            setCouponData(null);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setCouponData(null);
        setCouponError('');
    };

    const validate = () => {
        const e = {};
        if (!form.fullName.trim()) e.fullName = t('checkout.errors.name_required');
        if (!form.phone.trim()) e.phone = t('checkout.errors.phone_required');
        if (!form.address.trim()) e.address = t('checkout.errors.address_required');
        if (!form.governorate) e.governorate = t('checkout.errors.gov_required');
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validate()) return;
        setStep('review');
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (cart.length === 0) { notify.error(t('checkout.errors.empty_cart')); return; }
        if (!form.signature.trim()) { notify.error(t('checkout.errors.signature_required')); return; }
        setLoading(true);
        try {
            const items = cart.map(i => ({
                productId: i.product._id,
                quantity: i.quantity,
            }));

            const res = await checkout(items, {
                fullName: form.fullName,
                phone: form.phone,
                address: form.address,
                city: form.city,
                governorate: selectedShippingZone?.label || form.governorate,
                notes: form.notes,
            }, shippingSummary, form.notes, form.signature, couponData?.coupon?.code, paymentMethod, months);

            if (res.success) {
                setOrderId(res.data.orderId);
                setOrderNumber(res.data.invoiceNumber);
                clearCart();
                setStep('done');
                window.scrollTo(0, 0);
            } else {
                notify.error(res.message || t('checkout.errors.checkout_failed'));
            }
        } catch (err) {
            notify.error(t('checkout.errors.generic_error'));
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `app-surface w-full px-4 py-3 rounded-xl border text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${errors[field]
            ? 'border-red-400'
            : 'border-transparent'}`;

    // ── SUCCESS / DONE ──────────────────────────────────────────
    if (step === 'done') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 pb-24" dir={i18n.dir()}>
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-once">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('checkout.success.title')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-1">{t('checkout.success.order_number')}</p>
                <p className="text-3xl font-black text-primary-600 mb-6">#{orderNumber}</p>

                <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10 w-full max-w-sm ltr:text-left rtl:text-right mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('checkout.success.address')}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{form.address}، {selectedShippingZone?.label || form.governorate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('checkout.success.phone')}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{form.phone}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('checkout.success.total')}</span>
                        <span className="font-black text-primary-600">
                            {total.toLocaleString()} ج.م
                            {discount > 0 && <span className="text-xs text-green-500 mr-1 font-normal">{t('checkout.success.saved', { amount: discount.toLocaleString() })}</span>}
                        </span>
                    </div>
                </div>

                <p className="text-sm text-gray-400 mb-8">{t('checkout.success.contact_soon')}</p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => navigate('/portal/orders')}
                        className="w-full py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition"
                    >
                        {t('checkout.success.track_orders')}
                    </button>
                    <button
                        onClick={() => navigate('/portal/products')}
                        className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 transition"
                    >
                        {t('checkout.success.continue_shopping')}
                    </button>
                </div>
            </div>
        );
    }

    // ── MAIN ────────────────────────────────────────────────────
    return (
        <div className="pb-28 app-text-soft" dir={i18n.dir()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => step === 'review' ? setStep('shipping') : navigate(-1)} className="app-surface-muted w-9 h-9 rounded-full flex items-center justify-center ltr:rotate-180 transition-transform">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">{t('checkout.title')}</h2>
                    <p className="text-xs text-gray-400">{cart.length} {t('checkout.review.products', { count: '' })} • {total.toLocaleString()} ج.م{discount > 0 && <span className="text-green-500 ltr:ml-1 rtl:mr-1">({t('checkout.success.saved', { amount: discount.toLocaleString() })})</span>}</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map((s, i) => {
                    const active = s.id === step;
                    const done = (step === 'review' && i === 0) || (step === 'done' && i < 2);
                    return (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${active ? 'bg-primary-500 text-white' : done ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                <s.icon className="w-3.5 h-3.5" />
                                {s.label}
                            </div>
                            {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ─── STEP 1: Shipping ─── */}
            {step === 'shipping' && (
                <div className="space-y-4">
                    {/* Credit Warning */}
                    {total > creditAvailable && (
                        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-red-700 dark:text-red-400 text-sm">{t('checkout.shipping.insufficient_balance')}</p>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                                    {t('checkout.shipping.available_balance')} <b>{creditAvailable.toLocaleString()} ج.م</b> • {t('checkout.shipping.order_total')} <b>{total.toLocaleString()} ج.م</b>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Personal Info */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 text-sm">
                            <User className="w-4 h-4 text-primary-500" /> {t('checkout.shipping.personal_info')}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.full_name')}</label>
                                <input className={inputClass('fullName')} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder={t('checkout.shipping.full_name_placeholder')} />
                                {errors.fullName && <p className="text-red-500 text-[11px] mt-1">{errors.fullName}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.phone')}</label>
                                <input className={inputClass('phone')} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('checkout.shipping.phone_placeholder')} dir="ltr" />
                                {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 text-sm">
                            <MapPin className="w-4 h-4 text-primary-500" /> {t('checkout.shipping.address_title')}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.governorate')}</label>
                                <select
                                    className={inputClass('governorate')}
                                    value={form.governorate}
                                    onChange={e => setForm({ ...form, governorate: e.target.value })}
                                >
                                    <option value="">{t('checkout.shipping.choose_gov')}</option>
                                    {shippingConfig.zones.map((zone) => (
                                        <option key={zone.code} value={zone.code}>{zone.label}</option>
                                    ))}
                                </select>
                                {errors.governorate && <p className="text-red-500 text-[11px] mt-1">{errors.governorate}</p>}
                            </div>
                            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 px-4 py-3 text-xs text-primary-700 dark:text-primary-300">
                                <div className="flex items-center justify-between gap-3 font-bold">
                                    <span>{shippingConfig.defaultMethodName}</span>
                                    <span>{shipping === 0 ? 'مجاني' : `${shipping.toLocaleString()} ج.م`}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                                    <span>{selectedShippingZone?.label || 'سيتم اعتماد الرسوم الأساسية'}</span>
                                    <span>{shippingEta}</span>
                                </div>
                                {shippingDiscount > 0 && (
                                    <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        تم تفعيل الشحن المجاني بدلًا من {shippingFeeBase.toLocaleString()} ج.م
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.city')}</label>
                                <input className={inputClass('city')} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t('checkout.shipping.city_placeholder')} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.address_details')}</label>
                                <textarea
                                    className={`${inputClass('address')} min-h-[80px] resize-none`}
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder={t('checkout.shipping.address_placeholder')}
                                />
                                {errors.address && <p className="text-red-500 text-[11px] mt-1">{errors.address}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('checkout.shipping.notes')}</label>
                                <input className={inputClass('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={t('checkout.shipping.notes_placeholder')} />
                            </div>
                        </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2 mb-3">
                            <Tag className="w-4 h-4 text-primary-500" /> {t('checkout.coupon.title')}
                        </h3>
                        {couponData ? (
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                                <div>
                                    <p className="font-bold text-green-700 dark:text-green-400 text-sm">{couponData.coupon?.code}</p>
                                    <p className="text-xs text-green-600 dark:text-green-500">{t('checkout.coupon.discount', { amount: couponData.discountAmount?.toLocaleString() })}</p>
                                </div>
                                <button onClick={handleRemoveCoupon} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                        placeholder={t('checkout.coupon.placeholder')}
                                        className="app-surface flex-1 px-4 py-3 rounded-xl border border-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                        dir="ltr"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading || !couponCode.trim()}
                                        className="px-4 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('checkout.coupon.apply')}
                                    </button>
                                </div>
                                {couponError && <p className="text-red-500 text-[11px]">{couponError}</p>}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        className="w-full py-4 rounded-2xl bg-primary-500 text-white font-black text-base hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        {t('checkout.buttons.review_order')}
                        <ChevronRight className={`w-5 h-5 ${i18n.dir() === 'ltr' ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            )}

            {/* ─── STEP 2: Review ─── */}
            {step === 'review' && (
                <div className="space-y-4">
                    {/* Items */}
                    <div className="app-surface rounded-2xl border border-gray-100/80 dark:border-white/10 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100/80 dark:border-white/10">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary-500" /> {t('checkout.review.products', { count: cart.length })}
                            </h3>
                        </div>
                        {cart.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                                <div className="app-surface-muted w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                                    {item.product?.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product?.name}</p>
                                    <p className="text-xs text-gray-400">{t('checkout.review.qty', { count: item.quantity })}</p>
                                </div>
                                <p className="font-black text-sm text-primary-600">{(item.price * item.quantity).toLocaleString()} ج.م</p>
                            </div>
                        ))}
                        {discount > 0 && (
                            <div className="app-surface-muted px-5 py-3 flex justify-between items-center border-t border-gray-100/80 dark:border-white/10">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('checkout.review.subtotal')}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{subtotal.toLocaleString()} ج.م</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className="px-5 py-3 bg-green-50 dark:bg-green-900/10 flex justify-between items-center">
                                <span className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> {t('checkout.review.discount_label', { code: couponData?.coupon?.code })}
                                </span>
                                <span className="text-sm font-bold text-green-600">-{discount.toLocaleString()} ج.م</span>
                            </div>
                        )}
                        <div className="app-surface-muted px-5 py-3 flex justify-between items-center border-t border-gray-100/80 dark:border-white/10">
                            <span className="text-sm text-gray-500 dark:text-gray-400">الشحن</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{shipping === 0 ? 'مجاني' : `${shipping.toLocaleString()} ج.م`}</span>
                        </div>
                        <div className="app-surface-muted px-5 py-4 flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-300">{t('checkout.review.total')}</span>
                            <span className="font-black text-xl text-primary-600">{total.toLocaleString()} ج.م</span>
                        </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-primary-500" /> {t('checkout.review.delivery_details')}
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">{t('checkout.review.receiver')}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{form.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">{t('checkout.review.phone')}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200" dir="ltr">{form.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">{t('checkout.review.governorate')}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedShippingZone?.label || form.governorate} {form.city && `/ ${form.city}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">وسيلة الشحن</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{shippingConfig.defaultMethodName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">موعد متوقع</span>
                                <span className="font-bold text-primary-600">{shippingEta}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 flex-shrink-0">{t('checkout.review.address')}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 ltr:text-right rtl:text-left max-w-[60%]">{form.address}</span>
                            </div>
                            {form.notes && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">{t('checkout.review.notes')}</span>
                                    <span className="font-medium text-gray-600 dark:text-gray-400 ltr:text-right rtl:text-left max-w-[60%]">{form.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="app-surface rounded-2xl p-5 border border-primary-100/80 dark:border-primary-500/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="font-bold text-sm text-gray-900 dark:text-white">????? ????? ?????</p>
                                <p className="text-xs leading-6 text-gray-600 dark:text-gray-300">{branchRoutingNote}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10 space-y-4">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3">{t('checkout.payment.title')}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {shippingConfig.supportsCashOnDelivery !== false && (
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'cash' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-100/80 dark:border-white/10 text-gray-500 app-surface hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`}
                                >
                                    <Building2 className="w-5 h-5" />
                                    <span className="font-bold text-sm">{t('checkout.payment.cash')}</span>
                                </button>
                            )}
                            <button
                                onClick={() => setPaymentMethod('deferred')}
                                className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'deferred' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-100/80 dark:border-white/10 text-gray-500 app-surface hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'} ${shippingConfig.supportsCashOnDelivery === false ? 'col-span-2' : ''}`}
                            >
                                <Package className="w-5 h-5" />
                                <span className="font-bold text-sm">{t('checkout.payment.deferred')}</span>
                            </button>
                        </div>

                        {paymentMethod === 'deferred' && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">{t('checkout.payment.months_label')}</label>
                                    <select
                                        value={months}
                                        onChange={(e) => setMonths(Number(e.target.value))}
                                        className="app-surface w-full px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-gray-800 dark:text-white"
                                    >
                                        {[...Array(maxMonths)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-between items-center text-sm font-bold text-primary-600 dark:text-primary-400">
                                    <span>{t('checkout.payment.monthly_install')}</span>
                                    <span>{t('checkout.payment.monthly_amount', { amount: Math.ceil(total / months).toLocaleString() })}</span>
                                </div>

                                {total > creditAvailable && (
                                    <div className="flex items-start gap-2 text-xs text-red-600 bg-red-100 dark:bg-red-900/30 p-2 rounded-lg mt-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{t('checkout.payment.insufficient_install', { amount: creditAvailable.toLocaleString() })}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-xs font-bold text-center">
                                {t('checkout.payment.cash_notice', { amount: total.toLocaleString() })}
                            </div>
                        )}
                    </div>

                    {/* Basic Documents Required File Verification Message */}
                    {paymentMethod === 'deferred' && !hasDocuments && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-sm text-orange-700 dark:text-orange-400 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">{t('checkout.documents_warning.title')}</p>
                                <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5 leading-relaxed">
                                    {t('checkout.documents_warning.desc')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Electronic Signature */}
                    <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3">{t('checkout.signature.title')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 px-1">
                            {t('checkout.signature.desc')}
                        </p>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.signature}
                                onChange={(e) => setForm({ ...form, signature: e.target.value })}
                                placeholder={t('checkout.signature.placeholder')}
                                className={inputClass('signature')}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || (paymentMethod === 'deferred' && (!hasDocuments || total > creditAvailable))}
                        className="w-full py-4 rounded-2xl bg-green-500 text-white font-black text-base hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <><CheckCircle className="w-5 h-5" /> {t('checkout.buttons.confirm_order')}</>
                        )}
                    </button>
                    <button onClick={() => setStep('shipping')} className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">{t('checkout.buttons.edit_shipping')}</button>
                </div>
            )}
        </div>
    );
}
