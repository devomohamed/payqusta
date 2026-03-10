import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CreditCard, User, MapPin, Phone, Mail, CheckCircle,
  Wallet, AlertCircle, ShieldCheck, Truck, ChevronLeft,
  ChevronRight, Lock, CreditCard as CardIcon, ShoppingBag,
  Info
} from 'lucide-react';
import { api } from '../store';
import { Card, Button, Input, LoadingSpinner, Badge, EmptyState } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { usePortalStore } from '../store/portalStore';
import { storefrontPath } from '../utils/storefrontHost';
import { useCommerceStore } from '../store/commerceStore';
import { pickProductImage } from '../utils/media';
import {
  clearStorefrontCoupon,
  loadStorefrontCoupon,
  saveStorefrontCoupon,
} from './storefrontCouponStorage';
import {
  clearStorefrontGuestProfile,
  loadStorefrontGuestProfile,
  saveStorefrontGuestProfile,
} from './storefrontGuestProfile';
import {
  getStorefrontCampaignBanner,
  loadStorefrontCampaignAttribution,
} from './storefrontCampaignAttribution';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import { calculateStorefrontVolumeDiscountForItems } from './storefrontVolumeOffers';
import { getStorefrontTenantRequestConfig } from './storefrontDataClient';

const FREE_SHIPPING_THRESHOLD = 500;
const DEFAULT_PORTAL_SHIPPING_FEE = 50;
const SHIPPING_REGIONS = [
  { value: 'cairo', label: 'القاهرة', fee: 45, eta: 'خلال 24-48 ساعة' },
  { value: 'giza', label: 'الجيزة', fee: 45, eta: 'خلال 24-48 ساعة' },
  { value: 'alexandria', label: 'الإسكندرية', fee: 60, eta: 'خلال 2-3 أيام عمل' },
  { value: 'delta', label: 'الدلتا', fee: 65, eta: 'خلال 2-4 أيام عمل' },
  { value: 'canal', label: 'مدن القناة', fee: 70, eta: 'خلال 2-4 أيام عمل' },
  { value: 'upper-egypt', label: 'الصعيد', fee: 85, eta: 'خلال 3-5 أيام عمل' },
  { value: 'frontier', label: 'المحافظات الحدودية', fee: 110, eta: 'خلال 4-6 أيام عمل' },
];

function getShippingRegion(value) {
  if (!value) return null;
  return SHIPPING_REGIONS.find((region) => region.value === value) || null;
}

const STEPS = [
  { id: 'customer', title: 'بيانات العميل', icon: User },
  { id: 'payment', title: 'الدفع والشحن', icon: CreditCard },
  { id: 'summary', title: 'مراجعة الطلب', icon: CheckCircle },
];

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Portal Context
  const isPortal = location.pathname.includes('/portal');
  const { customer, isAuthenticated } = usePortalStore();

  const [savedGuestProfile, setSavedGuestProfile] = useState(() => (!isPortal ? loadStorefrontGuestProfile() : null));
  const withStorefrontContext = (options = {}) => getStorefrontTenantRequestConfig(options);
  const [form, setForm] = useState(() => ({
    customerName: savedGuestProfile?.customerName || '',
    phone: savedGuestProfile?.phone || '',
    email: savedGuestProfile?.email || '',
    address: savedGuestProfile?.address || '',
    governorate: savedGuestProfile?.governorate || '',
    city: savedGuestProfile?.city || '',
    notes: '',
    paymentMethod: isPortal ? 'credit' : 'cash'
  }));

  const { cart, clearCart } = useCommerceStore((state) => ({
    cart: state.cart,
    clearCart: state.clearCart,
  }));
  const buyNowItem = !isPortal && location.state?.buyNowItem ? location.state.buyNowItem : null;
  const campaignAttribution = !isPortal ? loadStorefrontCampaignAttribution() : null;
  const campaignBanner = !isPortal ? getStorefrontCampaignBanner(campaignAttribution) : null;
  const checkoutItems = buyNowItem ? [buyNowItem] : cart;

  const normalizeCheckoutItem = (item) => {
    const product = item.product || item;

    return {
      product,
      productId: item.productId || product?._id,
      variantId: item.variantId || item.variant?.id || item.variant?._id,
      quantity: item.quantity || 1,
      price: item.price ?? item.unitPrice ?? item.variant?.price ?? product?.price ?? 0,
      name: item.name || product?.name || 'منتج',
      image: item.image || pickProductImage(product),
    };
  };

  useEffect(() => {
    if (isPortal && isAuthenticated && customer) {
      setForm(prev => ({
        ...prev,
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        paymentMethod: 'credit'
      }));
    }
  }, [isPortal, isAuthenticated, customer, checkoutItems.length]);

  const normalizedCheckoutItems = checkoutItems.map((item) => normalizeCheckoutItem(item));
  const subtotal = normalizedCheckoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = normalizedCheckoutItems.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => {
    if (isPortal || normalizedCheckoutItems.length === 0) return;

    trackStorefrontFunnelEvent('checkout_start', {
      source: buyNowItem ? 'buy_now' : 'cart',
      cartSize: normalizedCheckoutItems.length,
      itemCount,
      productId: normalizedCheckoutItems[0]?.productId,
      uniqueEventKey: buyNowItem ? `checkout_start:buy_now:${normalizedCheckoutItems[0]?.productId || 'item'}` : 'checkout_start:cart',
    });
  }, [isPortal, buyNowItem, itemCount, normalizedCheckoutItems]);
  const selectedShippingRegion = !isPortal ? getShippingRegion(form.governorate) : null;
  const estimatedShippingFee = isPortal ? DEFAULT_PORTAL_SHIPPING_FEE : (selectedShippingRegion?.fee ?? DEFAULT_PORTAL_SHIPPING_FEE);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : estimatedShippingFee;
  const shippingRegionLabel = isPortal ? 'توصيل قياسي' : (selectedShippingRegion?.label || 'اختر المحافظة');
  const shippingEta = isPortal ? 'خلال 3-5 أيام عمل' : (selectedShippingRegion?.eta || 'اختر المحافظة أولًا لعرض الموعد المتوقع');
  const shippingSavings = subtotal >= FREE_SHIPPING_THRESHOLD ? estimatedShippingFee : 0;
  const volumeDiscount = !isPortal ? calculateStorefrontVolumeDiscountForItems(normalizedCheckoutItems) : 0;
  const [couponData, setCouponData] = useState(() => (!isPortal ? loadStorefrontCoupon() : null));
  const discount = !isPortal ? (couponData?.discountAmount || 0) : 0;
  const total = Math.max(0, subtotal + shipping - volumeDiscount - discount);
  const checkoutReviewSnapshot = normalizedCheckoutItems.reduce((summary, item) => {
    const reviewCount = Number(item.product?.reviewCount) || 0;
    const avgRating = Number(item.product?.avgRating) || 0;

    if (reviewCount <= 0 || avgRating <= 0) return summary;

    return {
      reviewCount: summary.reviewCount + reviewCount,
      weightedRating: summary.weightedRating + (avgRating * reviewCount),
    };
  }, { reviewCount: 0, weightedRating: 0 });
  const checkoutAverageRating = checkoutReviewSnapshot.reviewCount > 0
    ? (checkoutReviewSnapshot.weightedRating / checkoutReviewSnapshot.reviewCount)
    : 0;
  const checkoutTrustSignals = [
    {
      key: 'items',
      icon: ShoppingBag,
      title: 'جاهزية الطلب',
      value: `${itemCount} قطعة`,
      detail: buyNowItem
        ? 'شراء مباشر من صفحة المنتج بدون المرور على السلة'
        : `${normalizedCheckoutItems.length} منتجًا جاهزًا للمراجعة النهائية`,
    },
    {
      key: 'reviews',
      icon: ShieldCheck,
      title: 'ثقة العملاء',
      value: checkoutReviewSnapshot.reviewCount > 0 ? `${checkoutAverageRating.toFixed(1)} / 5` : 'جاري التحديث',
      detail: checkoutReviewSnapshot.reviewCount > 0
        ? `${checkoutReviewSnapshot.reviewCount} تقييم متاح على العناصر المختارة`
        : 'سيظهر متوسط التقييم هنا عند توفر مراجعات معتمدة للعناصر المختارة',
    },
    {
      key: 'shipping',
      icon: Truck,
      title: 'التوصيل المتوقع',
      value: shippingEta,
      detail: !isPortal ? shippingRegionLabel : 'يظهر الموعد المتوقع قبل تأكيد الطلب',
    },
  ];

  useEffect(() => {
    if (isPortal || subtotal <= 0) return undefined;

    const storedCoupon = loadStorefrontCoupon();
    if (!storedCoupon?.coupon?.code) {
      setCouponData(null);
      return undefined;
    }

    let cancelled = false;

    const syncCoupon = async () => {
      try {
        const res = await api.post('/coupons/validate', {
          code: storedCoupon.coupon.code,
          orderTotal: Math.max(0, subtotal - volumeDiscount),
        }, {
          headers: { 'x-source': 'online_store' },
        });

        if (cancelled) return;

        setCouponData(res.data.data);
        saveStorefrontCoupon(res.data.data);
      } catch (error) {
        if (cancelled) return;

        setCouponData(null);
        clearStorefrontCoupon();
      }
    };

    syncCoupon();

    return () => {
      cancelled = true;
    };
  }, [isPortal, subtotal, volumeDiscount]);

  const nextStep = () => {
    if (currentStep === 0) {
      const missingName = !form.customerName.trim();
      const missingPhone = !form.phone.trim();
      const missingAddress = !isPortal && !form.address.trim();
      const missingGovernorate = !isPortal && !form.governorate.trim();

      if (missingName || missingPhone || missingAddress || missingGovernorate) {
        notify.error(isPortal ? 'الرجاء إدخال الاسم ورقم الهاتف' : 'الرجاء إدخال الاسم ورقم الهاتف وعنوان التوصيل');
        return;
      }
    }
    if (false && currentStep === 0 && (!form.customerName || !form.phone)) {
      notify.error('الرجاء إدخال الاسم ورقم الهاتف');
      return;
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClearSavedGuestProfile = () => {
    clearStorefrontGuestProfile();
    setSavedGuestProfile(null);
    setForm((prev) => ({
      ...prev,
      customerName: '',
      phone: '',
      email: '',
      address: '',
      governorate: '',
      city: '',
    }));
    notify.success('تم مسح البيانات المحفوظة من هذا الجهاز');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isPortal) {
        // === PORTAL CHECKOUT FLOW ===
        await api.post('/portal/cart/checkout', {
          items: normalizedCheckoutItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          paymentMethod: form.paymentMethod,
          notes: form.notes
        }, {
          headers: { Authorization: `Bearer ${usePortalStore.getState().token}` }
        });

        clearCart();
        notify.success('تم استلام طلبك بنجاح');
        navigate('/portal/dashboard');

      } else {
        // === PUBLIC STORE CHECKOUT FLOW ===
        let customerId;
        try {
          const customerRes = await api.post('/customers', {
            name: form.customerName,
            phone: form.phone,
            email: form.email || undefined,
            address: form.address || undefined
          }, withStorefrontContext({ headers: { 'x-source': 'online_store' } }));
          customerId = customerRes.data.data._id;
        } catch (err) {
          const searchRes = await api.get('/customers', withStorefrontContext({
            params: { search: form.phone },
            headers: { 'x-source': 'online_store' },
          }));
          if (searchRes.data.data.length > 0) {
            customerId = searchRes.data.data[0]._id;
          } else {
            throw err;
          }
        }

        let validatedCouponData = couponData;
        if (couponData?.coupon?.code) {
          try {
            const couponRes = await api.post('/coupons/validate', {
              code: couponData.coupon.code,
              orderTotal: Math.max(0, subtotal - volumeDiscount),
              customerId,
            }, withStorefrontContext({
              headers: { 'x-source': 'online_store' },
            }));

            validatedCouponData = couponRes.data.data;
            setCouponData(couponRes.data.data);
            saveStorefrontCoupon(couponRes.data.data);
          } catch (couponError) {
            setCouponData(null);
            clearStorefrontCoupon();
            throw couponError;
          }
        }

        const normalizedPaymentMethod = form.paymentMethod === 'online' ? 'visa' : form.paymentMethod;

        const invoiceData = {
          customerId,
          items: normalizedCheckoutItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
          })),
          paymentMethod: normalizedPaymentMethod,
          notes: form.notes,
          couponCode: validatedCouponData?.coupon?.code,
          sendWhatsApp: true,
          shippingAddress: {
            fullName: form.customerName,
            phone: form.phone,
            address: form.address,
            city: form.city || undefined,
            governorate: selectedShippingRegion?.label || form.governorate || undefined,
            notes: form.notes
          },
          source: 'online_store',
          ...(campaignAttribution ? { campaignAttribution } : {})
        };

        const invoiceRes = await api.post('/invoices', invoiceData, withStorefrontContext());
        const invoice = invoiceRes.data.data;
        trackStorefrontFunnelEvent('order_complete', {
          orderId: invoice?._id,
          cartSize: normalizedCheckoutItems.length,
          itemCount,
          totalAmount: invoice?.totalAmount || total,
          source: buyNowItem ? 'buy_now' : 'checkout',
          uniqueEventKey: `order_complete:${invoice?._id || 'unknown'}`,
        });
        const nextSavedGuestProfile = {
          customerName: form.customerName,
          phone: form.phone,
          email: form.email,
          address: form.address,
          governorate: form.governorate,
          city: form.city,
        };

        saveStorefrontGuestProfile(nextSavedGuestProfile);
        setSavedGuestProfile(nextSavedGuestProfile);

        if (!buyNowItem) {
          clearCart();
        }
        clearStorefrontCoupon();

        if (form.paymentMethod === 'online') {
          const paymentRes = await api.post('/storefront/payments/create-link', {
            invoiceId: invoice._id,
            amount: invoice.totalAmount,
            customerPhone: form.phone,
            customerEmail: form.email,
            source: 'online_store',
          }, withStorefrontContext({
            headers: { 'x-source': 'online_store' },
          }));
          const paymentUrl = paymentRes?.data?.data?.paymentUrl || paymentRes?.data?.data?.paymentLink;
          if (!paymentUrl) {
            throw new Error('PAYMENT_URL_MISSING');
          }
          window.location.href = paymentUrl;
        } else {
          navigate(storefrontPath(`/order/${invoice._id}`));
        }
      }
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || 'فشل إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
        <EmptyState
          icon={ShoppingBag}
          title={isPortal ? 'سلة البوابة فارغة الآن' : 'سلة المتجر فارغة الآن'}
          description={isPortal
            ? 'أضف منتجات إلى السلة أولًا ثم ارجع لإتمام الطلب من هذه الصفحة.'
            : 'لم يتم العثور على عناصر جاهزة للشراء. ابدأ من صفحات المنتجات ثم ارجع لإتمام الطلب.'}
          action={{
            label: isPortal ? 'تصفح منتجات البوابة' : 'العودة إلى المتجر',
            onClick: () => navigate(isPortal ? '/portal/products' : storefrontPath('/products')),
            variant: 'primary',
            size: 'md',
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4" dir="rtl">
      {/* ═══ PROGRESS STEPS ═══ */}
      <div className="flex justify-between items-center mb-12 relative max-w-2xl mx-auto">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-0" />
        <div className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 -z-0 transition-all duration-500" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />

        {STEPS.map((step, i) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${i <= currentStep ? 'bg-white dark:bg-gray-900 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 text-gray-300'}`}>
              {i < currentStep ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${i <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>{step.title}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ═══ STEP CONTENT ═══ */}
        <div className="lg:col-span-8 space-y-8">
          {currentStep === 0 && (
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] animate-slide-up">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <User className="w-6 h-6 text-indigo-500" />
                بيانات العميل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!isPortal && (
                  <div className="md:col-span-2 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-right">
                      {savedGuestProfile && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-white/80 px-3 py-2">
                          <p className="text-xs font-bold text-emerald-700">تم تعبئة آخر بيانات محفوظة لتسريع الطلب.</p>
                          <button
                            type="button"
                            onClick={handleClearSavedGuestProfile}
                            className="text-xs font-black text-emerald-800 transition-colors hover:text-emerald-950"
                          >
                            مسح البيانات المحفوظة
                          </button>
                        </div>
                      )}
                      <p className="font-black text-emerald-900">إتمام الطلب لا يحتاج إلى تسجيل حساب.</p>
                      <p className="text-sm text-emerald-700 mt-1">اكتب بيانات الاستلام فقط، وسنستخدمها لتأكيد الطلب وتتبع الشحنة بشكل مباشر.</p>
                    </div>
                  </div>
                )}
                <Input
                  label="الاسم الكامل *"
                  placeholder="مثال: أحمد محمد"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="md:col-span-1"
                  disabled={isPortal}
                />
                <Input
                  label="رقم الهاتف *"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="md:col-span-1"
                  disabled={isPortal}
                />
                <Input
                  label="البريد الإلكتروني (اختياري)"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="md:col-span-2"
                />
                {!isPortal && (
                  <>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-gray-600 mb-2">المحافظة *</label>
                      <select
                        value={form.governorate}
                        onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                        className="w-full rounded-2xl bg-gray-50 border-2 border-transparent px-4 py-4 text-sm focus:border-indigo-500 focus:bg-white transition-all"
                      >
                        <option value="">اختر المحافظة</option>
                        {SHIPPING_REGIONS.map((region) => (
                          <option key={region.value} value={region.value}>
                            {region.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="المنطقة / المدينة (اختياري)"
                      placeholder="مثال: مدينة نصر"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="md:col-span-1"
                    />
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-600 mb-2">عنوان التوصيل المقابل للعقار بالتفصيل *</label>
                  <textarea
                    placeholder="رقم العقار، اسم الشارع، المحافظة..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full h-32 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>
                {!isPortal && (
                  <div className="md:col-span-2 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-900">معاينة الشحن قبل الدفع</p>
                        <p className="mt-1 text-sm text-indigo-700">
                          {selectedShippingRegion
                            ? `${selectedShippingRegion.label}${form.city ? ` - ${form.city}` : ''}`
                            : 'اختر المحافظة أولًا لعرض تكلفة التوصيل المتوقعة'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-indigo-600">{shippingEta}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                        <p className="text-[11px] font-black text-indigo-400">التوصيل المتوقع</p>
                        <p className="mt-1 text-lg font-black text-indigo-700">{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</p>
                        {shippingSavings > 0 && (
                          <p className="mt-1 text-[11px] font-bold text-emerald-600">تم تفعيل الشحن المجاني بدلًا من {estimatedShippingFee} ج.م</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {currentStep === 1 && (
            <div className="space-y-8 animate-slide-up">
              <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem]">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <Truck className="w-6 h-6 text-indigo-500" />
                  خيار الشحن
                </h2>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Truck className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-bold">{shippingRegionLabel}</h4>
                        <p className="text-sm text-gray-500">{shippingEta}</p>
                      </div>
                    </div>
                    <span className="font-black text-indigo-600">{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</span>
                  </div>
                  {!isPortal && shippingSavings > 0 && (
                    <p className="text-xs font-bold text-emerald-600">طلبك فعّل الشحن المجاني، وتم إسقاط {estimatedShippingFee} ج.م من تكلفة التوصيل.</p>
                  )}
                </div>
              </Card>

              <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem]">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-indigo-500" />
                  طريقة الدفع
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isPortal ? (
                    <button
                      onClick={() => setForm({ ...form, paymentMethod: 'credit' })}
                      className={`p-6 rounded-3xl border-2 text-right transition-all group ${form.paymentMethod === 'credit' ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-50' : 'border-gray-100 hover:border-primary-200'}`}
                    >
                      <Wallet className={`w-8 h-8 mb-4 ${form.paymentMethod === 'credit' ? 'text-primary-600' : 'text-gray-400'}`} />
                      <h4 className="font-black text-lg mb-1">خصم من الرصيد</h4>
                      <p className="text-xs text-gray-500">رصيدك: {customer?.balance?.toLocaleString()} ج.م</p>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setForm({ ...form, paymentMethod: 'cash' })}
                        className={`p-6 rounded-3xl border-2 text-right transition-all ${form.paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                      >
                        <Wallet className={`w-8 h-8 mb-4 ${form.paymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <h4 className="font-black text-lg mb-1">الدفع عند الاستلام</h4>
                        <p className="text-xs text-gray-500">ادفع نقداً عند باب منزلك</p>
                      </button>
                      <button
                        onClick={() => setForm({ ...form, paymentMethod: 'online' })}
                        className={`p-6 rounded-3xl border-2 text-right transition-all ${form.paymentMethod === 'online' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                      >
                        <Lock className={`w-8 h-8 mb-4 ${form.paymentMethod === 'online' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <h4 className="font-black text-lg mb-1">بطاقة بنكية / محفظة</h4>
                        <p className="text-xs text-gray-500">ادفع الآن بأمان تام</p>
                      </button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] animate-slide-up">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-500" />
                مراجعة نهائية
              </h2>
              <div className="space-y-6">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">توصيل إلى</h4>
                    <p className="font-bold text-gray-900">{form.customerName}</p>
                    <p className="text-sm text-gray-500">{form.address}</p>
                    <p className="text-sm text-gray-500">{form.phone}</p>
                    {!isPortal && (
                      <>
                        <p className="text-sm text-gray-500">
                          {selectedShippingRegion?.label || 'بدون تحديد محافظة'}{form.city ? ` - ${form.city}` : ''}
                        </p>
                        <p className="text-xs font-bold text-indigo-600">{shippingEta}</p>
                      </>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">طريقة الدفع</h4>
                    <p className="font-bold text-gray-900">
                      {form.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : form.paymentMethod === 'credit' ? 'رصيد المحفظة' : 'دفع إلكتروني'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">المنتجات المختارة ({normalizedCheckoutItems.length})</h4>
                  {normalizedCheckoutItems.map((item, i) => (
                    <div key={`${item.productId || 'item'}-${item.variantId || 'base'}-${i}`} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-sm">{item.name}</h5>
                        <p className="text-xs text-gray-400">الكمية: {item.quantity}</p>
                      </div>
                      <span className="font-black">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <label className="block text-sm font-bold text-gray-600 mb-2">هل لديك أي ملاحظات أخرى؟</label>
                  <textarea
                    placeholder="مثال: يرجى الاتصال قبل الوصول بـ 15 دقيقة"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full h-24 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ═══ NAVIGATION BUTTONS ═══ */}
          <div className="flex justify-between items-center pt-4">
            {currentStep > 0 && (
              <Button variant="ghost" className="px-10" onClick={prevStep}>
                <ChevronRight className="w-5 h-5 ml-2" />
                السابق
              </Button>
            )}
            <div className="mr-auto">
              {currentStep < STEPS.length - 1 ? (
                <Button className="px-12 h-14" onClick={nextStep}>
                  المتابعة
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              ) : (
                <Button
                  className="px-16 h-14 shadow-2xl shadow-indigo-500/40"
                  loading={loading}
                  onClick={handleSubmit}
                  disabled={isPortal && customer && total > (customer.balance || 0)}
                >
                  <CheckCircle className="w-5 h-5 ml-2" />
                  تأكيد وطلب الآن
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SIDEBAR: ORDER SUMMARY ═══ */}
        <aside className="lg:col-span-4">
          <div className="sticky top-28 space-y-6">
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] bg-indigo-900 text-white overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <h3 className="text-xl font-black mb-8 relative">ملخص الطلب</h3>

              <div className="space-y-4 mb-8 relative">
                <div className="flex justify-between text-indigo-200">
                  <span className="font-medium">المجموع الفرعي</span>
                  <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-indigo-200">
                  <span className="font-medium">تكلفة الشحن</span>
                  <span className="font-bold">{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</span>
                </div>
                {!isPortal && (
                  <div className="flex justify-between text-[11px] text-indigo-300">
                    <span>{shippingRegionLabel}</span>
                    <span>{shippingEta}</span>
                  </div>
                )}
                {volumeDiscount > 0 && (
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">خصم الكمية</span>
                    <span className="font-bold">-{volumeDiscount.toLocaleString()} ج.م</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-200">
                    <span className="font-medium">خصم الكوبون</span>
                    <span className="font-bold">-{discount.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="h-px bg-white/20 my-4" />
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">الإجمالي النهائي</p>
                    <p className="text-4xl font-black">{total.toLocaleString()} <span className="text-sm font-medium">ج.م</span></p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center gap-3 opacity-80">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">ضمان حماية المشتري مفعّل</span>
              </div>
            </Card>

            {false && (<div className="hidden">
            {/* Trust & Confidence Markers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                <Lock className="w-6 h-6 text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-gray-400">دفع آمن</span>
              </div>
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                <Truck className="w-6 h-6 text-amber-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-gray-400">تتبع طلبك</span>
              </div>
            </div></div>)}

            <div className="grid gap-4 md:grid-cols-3">
              {checkoutTrustSignals.map((signal) => (
                <div key={signal.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center">
                  <signal.icon className="mx-auto mb-2 h-6 w-6 text-primary-500" />
                  <span className="text-[10px] font-black uppercase text-gray-400">{signal.title}</span>
                  <p className="mt-2 text-sm font-black text-gray-900">{signal.value}</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-gray-500">{signal.detail}</p>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              {false && (<p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase">
                أنت بصدد طلب {itemCount} قطعة من متجرنا. نحن نضمن لك جودة المنتج وسلامة التوصيل.
              </p>)}
              <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase">
                {checkoutReviewSnapshot.reviewCount > 0
                  ? `العناصر التي تراجعها الآن لديها ${checkoutReviewSnapshot.reviewCount} تقييمًا متاحًا، ومتوسطها ${checkoutAverageRating.toFixed(1)} من 5.`
                  : `أنت بصدد مراجعة ${itemCount} قطعة، وسيظهر لك إجمالي الشحن والتكلفة النهائية قبل التأكيد مباشرة.`}
              </p>
            </div>
            {!isPortal && campaignBanner && (
              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="text-right">
                  <p className="text-xs font-black text-amber-900">{campaignBanner.title}</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-amber-700">{campaignBanner.detail}</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
