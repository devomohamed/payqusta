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
import {
  getStorefrontTenantRequestConfig,
  loadStorefrontSettings,
} from './storefrontDataClient';
import {
  buildEstimatedDeliveryDate,
  findStorefrontShippingZone,
  resolveStorefrontShippingSettings,
} from './storefrontShipping';
import {
  buildGuestTrackingQuery,
  saveGuestOrderTracking,
} from './guestOrderTracking';

const DEFAULT_PORTAL_SHIPPING_FEE = 50;
const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر',
  'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية',
  'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان',
  'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية',
  'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا',
  'شمال سيناء', 'سوهاج',
];

const STEPS = [
  { id: 'customer', title: 'بيانات العميل', icon: User },
  { id: 'payment', title: 'الدفع والشحن', icon: CreditCard },
  { id: 'summary', title: 'مراجعة الطلب', icon: CheckCircle },
];

function formatShippingEta(summary, fallbackText = 'سيتم تأكيد الموعد بعد مراجعة الطلب') {
  const minDays = Number(summary?.estimatedDaysMin);
  const maxDays = Number(summary?.estimatedDaysMax);

  if (Number.isFinite(maxDays) && maxDays > 0) {
    if (!Number.isFinite(minDays) || minDays <= 0 || minDays === maxDays) {
      return `خلال ${maxDays} يوم عمل`;
    }

    return `خلال ${minDays}-${maxDays} أيام عمل`;
  }

  return fallbackText;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [storefrontSettings, setStorefrontSettings] = useState(null);
  const [shippingQuote, setShippingQuote] = useState({
    status: 'idle',
    summary: null,
    message: '',
    warningMessage: '',
    calculationState: 'idle',
    isEstimated: false,
  });

  // Portal Context
  const isPortal = location.pathname.includes('/portal');
  const { customer, isAuthenticated } = usePortalStore();

  const [savedGuestProfile, setSavedGuestProfile] = useState(() => (!isPortal ? loadStorefrontGuestProfile() : null));
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

  useEffect(() => {
    if (isPortal) return undefined;

    let cancelled = false;

    loadStorefrontSettings()
      .then((response) => {
        if (cancelled) return;
        setStorefrontSettings(response?.data?.data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setStorefrontSettings(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPortal]);

  const normalizedCheckoutItems = checkoutItems.map((item) => normalizeCheckoutItem(item));
  const subtotal = normalizedCheckoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = normalizedCheckoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const shippingConfig = !isPortal
    ? resolveStorefrontShippingSettings(storefrontSettings?.settings?.shipping)
    : null;
  const shippingGovernorateOptions = !isPortal
    ? (
        shippingConfig?.pricingMode === 'dynamic_api'
          ? EGYPT_GOVERNORATES.map((name) => ({ code: name, label: name }))
          : (shippingConfig?.zones || [])
      )
    : [];
  const selectedShippingRegion = !isPortal
    ? findStorefrontShippingZone(shippingConfig?.zones, form.governorate)
    : null;
  const shippingEnabled = isPortal ? true : shippingConfig?.enabled !== false;
  const quoteSummary = !isPortal ? shippingQuote.summary : null;
  const estimatedShippingFee = isPortal
    ? DEFAULT_PORTAL_SHIPPING_FEE
    : (quoteSummary?.carrierCost ?? quoteSummary?.shippingFee ?? 0);
  const shipping = isPortal
    ? DEFAULT_PORTAL_SHIPPING_FEE
    : Math.max(0, (quoteSummary?.shippingFee || 0) - (quoteSummary?.shippingDiscount || 0));
  const shippingRegionLabel = isPortal
    ? 'داخل مصر'
    : quoteSummary?.zoneLabel || selectedShippingRegion?.label || shippingConfig?.defaultMethodName || 'اختر المحافظة';
  const shippingEta = isPortal
    ? 'خلال 3-5 أيام عمل'
    : formatShippingEta(quoteSummary, selectedShippingRegion?.eta || shippingConfig?.eta || '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629 \u0623\u0648\u0644\u0627\u064b \u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0648\u0639\u062f \u0627\u0644\u0645\u062a\u0648\u0642\u0639');
  const shippingSavings = !isPortal ? (quoteSummary?.shippingDiscount || 0) : 0;
  const shippingSummary = !isPortal
    ? {
        shippingFee: shipping,
        shippingDiscount: shippingSavings,
        carrierCost: estimatedShippingFee,
        shippingMethod: shippingConfig?.defaultMethodName || 'شحن قياسي',
        provider: shippingConfig?.provider || 'local',
        zoneCode: selectedShippingRegion?.code || '',
        zoneLabel: selectedShippingRegion?.label || form.governorate || '',
        estimatedDaysMin: selectedShippingRegion?.estimatedDaysMin ?? shippingConfig?.estimatedDaysMin,
        estimatedDaysMax: selectedShippingRegion?.estimatedDaysMax ?? shippingConfig?.estimatedDaysMax,
        estimatedDeliveryDate: buildEstimatedDeliveryDate(
          selectedShippingRegion?.estimatedDaysMax ?? shippingConfig?.estimatedDaysMax
        ),
      }
    : null;
  const resolvedShippingSummary = !isPortal ? (quoteSummary || shippingSummary) : shippingSummary;
  const effectiveShippingFee = !isPortal
    ? Math.max(0, (resolvedShippingSummary?.shippingFee || 0) - (resolvedShippingSummary?.shippingDiscount || 0))
    : shipping;
  const effectiveEstimatedShippingFee = !isPortal
    ? (resolvedShippingSummary?.carrierCost ?? resolvedShippingSummary?.shippingFee ?? estimatedShippingFee)
    : estimatedShippingFee;
  const effectiveShippingLabel = !isPortal
    ? (resolvedShippingSummary?.zoneLabel || shippingRegionLabel)
    : shippingRegionLabel;
  const effectiveShippingEta = !isPortal
    ? formatShippingEta(resolvedShippingSummary, shippingEta)
    : shippingEta;
  const effectiveShippingSavings = !isPortal
    ? (resolvedShippingSummary?.shippingDiscount || shippingSavings)
    : shippingSavings;
  const hasCalculatedShipping = !isPortal && ['success', 'fallback'].includes(shippingQuote.status);
  const shippingQuoteMessage = shippingQuote.message || shippingQuote.warningMessage;
  useEffect(() => {
    if (isPortal) return;
    if (shippingConfig?.supportsCashOnDelivery === false && form.paymentMethod === 'cash') {
      setForm((prev) => ({ ...prev, paymentMethod: 'online' }));
    }
  }, [form.paymentMethod, isPortal, shippingConfig?.supportsCashOnDelivery]);
  useEffect(() => {
    if (isPortal) return undefined;

    if (!shippingEnabled) {
      setShippingQuote({
        status: 'success',
        summary: {
          shippingFee: 0,
          shippingDiscount: 0,
          carrierCost: 0,
          shippingMethod: shippingConfig?.defaultMethodName || 'شحن قياسي',
          provider: shippingConfig?.provider || 'local',
          zoneCode: selectedShippingRegion?.code || '',
          zoneLabel: selectedShippingRegion?.label || form.governorate || '',
          estimatedDaysMin: shippingConfig?.estimatedDaysMin || 0,
          estimatedDaysMax: shippingConfig?.estimatedDaysMax || 0,
          estimatedDeliveryDate: null,
        },
        message: '',
        warningMessage: '',
        calculationState: 'success',
        isEstimated: false,
      });
      return undefined;
    }

    const governorateLabel = selectedShippingRegion?.label || form.governorate?.trim();
    const needsDynamicCity = shippingConfig?.pricingMode === 'dynamic_api';
    const addressReady = Boolean(
      governorateLabel &&
      form.address.trim() &&
      (!needsDynamicCity || form.city.trim())
    );

    if (!addressReady) {
      setShippingQuote({
        status: 'idle',
        summary: null,
        message: '',
        warningMessage: '',
        calculationState: 'idle',
        isEstimated: false,
      });
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setShippingQuote((prev) => ({
        ...prev,
        status: 'loading',
        message: '',
        warningMessage: '',
        calculationState: 'loading',
      }));

      try {
        const response = await api.post('/shipping/calculate', {
          subtotal,
          shippingAddress: {
            fullName: form.customerName,
            phone: form.phone,
            address: form.address,
            city: form.city || undefined,
            area: form.city || undefined,
            governorate: governorateLabel,
            notes: form.notes || undefined,
          },
          shippingSummary: {
            zoneCode: selectedShippingRegion?.code || '',
            zoneLabel: selectedShippingRegion?.label || governorateLabel,
          },
        }, getStorefrontTenantRequestConfig({
          headers: { 'x-source': 'online_store' },
        }));

        if (cancelled) return;

        const quoteData = response?.data?.data || {};
        setShippingQuote({
          status: quoteData.isEstimated ? 'fallback' : 'success',
          summary: quoteData.shippingSummary || null,
          message: '',
          warningMessage: quoteData.warningMessage || '',
          calculationState: quoteData.calculationState || 'success',
          isEstimated: Boolean(quoteData.isEstimated),
        });
      } catch (error) {
        if (cancelled) return;

        setShippingQuote({
          status: 'error',
          summary: null,
          message: error?.response?.data?.message || 'تعذر حساب تكلفة الشحن الآن',
          warningMessage: '',
          calculationState: error?.response?.data?.code === 'SHIPPING_ZONE_UNMATCHED' ? 'blocked' : 'error',
          isEstimated: false,
        });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    form.address,
    form.city,
    form.customerName,
    form.governorate,
    form.notes,
    form.phone,
    isPortal,
    selectedShippingRegion?.code,
    selectedShippingRegion?.label,
    shippingConfig?.defaultMethodName,
    shippingConfig?.estimatedDaysMax,
    shippingConfig?.estimatedDaysMin,
    shippingConfig?.pricingMode,
    shippingConfig?.provider,
    shippingEnabled,
    subtotal,
  ]);
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
  const volumeDiscount = !isPortal ? calculateStorefrontVolumeDiscountForItems(normalizedCheckoutItems) : 0;
  const [couponData, setCouponData] = useState(() => (!isPortal ? loadStorefrontCoupon() : null));
  const discount = !isPortal ? (couponData?.discountAmount || 0) : 0;
  const total = Math.max(0, subtotal + effectiveShippingFee - volumeDiscount - discount);
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
        ? 'هذا المنتج جاهز للمراجعة النهائية قبل تأكيد الطلب'
        : `${normalizedCheckoutItems.length} منتجًا جاهزًا للمراجعة النهائية`,
    },
    {
      key: 'reviews',
      icon: ShieldCheck,
      title: 'ثقة العملاء',
      value: checkoutReviewSnapshot.reviewCount > 0 ? `${checkoutAverageRating.toFixed(1)} / 5` : 'جاري التحديث',
      detail: checkoutReviewSnapshot.reviewCount > 0
        ? `${checkoutReviewSnapshot.reviewCount} مراجعة معتمدة على العناصر المختارة`
        : 'سيظهر متوسط التقييم هنا عند توفر مراجعات معتمدة للعناصر المختارة',
    },
    {
      key: 'shipping',
      icon: Truck,
      title: 'التوصيل المتوقع',
      value: effectiveShippingEta,
      detail: !isPortal ? effectiveShippingLabel : 'يتم تجهيز الشحنة بعد تأكيد الطلب',
    },
  ];
  const branchRoutingNote = isPortal
    ? 'نختار الفرع الأقرب لعنوانك أو الأقوى في الجاهزية التشغيلية قبل تسليم الطلب لشركة الشحن.'
    : 'نحسب أقرب فرع قادر على تجهيز طلبك بالكامل، ثم نثبت سعر الشحن والوقت المتوقع قبل تأكيد الطلب مباشرة.';

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
      const missingGovernorate = !isPortal && shippingEnabled && !form.governorate.trim();
      const missingDynamicCity =
        !isPortal &&
        shippingEnabled &&
        shippingConfig?.pricingMode === 'dynamic_api' &&
        !form.city.trim();

      if (missingName || missingPhone || missingAddress || missingGovernorate || missingDynamicCity) {
        notify.error(isPortal ? 'برجاء استكمال البيانات المطلوبة' : 'برجاء استكمال بيانات العميل والشحن أولاً');
        return;
      }

      if (!isPortal && shippingEnabled) {
        if (shippingQuote.status === 'loading') {
          notify.error('انتظر حتى يكتمل حساب تكلفة الشحن');
          return;
        }

        if (!hasCalculatedShipping) {
          notify.error(shippingQuoteMessage || 'تعذر تحديد تكلفة الشحن الحالية');
          return;
        }
      }
    }
    if (false && currentStep === 0 && (!form.customerName || !form.phone)) {
      notify.error('برجاء استكمال البيانات المطلوبة');
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
    notify.success('تم مسح البيانات المحفوظة بنجاح');
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
        notify.success('تم تقديم طلبك بنجاح');
        navigate('/portal/dashboard');

      } else {
        // === PUBLIC STORE CHECKOUT FLOW ===
        if (!hasCalculatedShipping || !resolvedShippingSummary) {
          throw new Error('SHIPPING_QUOTE_MISSING');
        }

        let customerId;
        try {
          const customerRes = await api.post('/customers', {
            name: form.customerName,
            phone: form.phone,
            email: form.email || undefined,
            address: form.address || undefined
          }, getStorefrontTenantRequestConfig({ headers: { 'x-source': 'online_store' } }));
          customerId = customerRes.data.data._id;
        } catch (err) {
          const searchRes = await api.get('/customers', getStorefrontTenantRequestConfig({
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
            }, getStorefrontTenantRequestConfig({
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
            governorate: resolvedShippingSummary?.zoneLabel || selectedShippingRegion?.label || form.governorate || undefined,
            notes: form.notes
          },
          shippingSummary: resolvedShippingSummary,
          source: 'online_store',
          ...(campaignAttribution ? { campaignAttribution } : {})
        };

        const invoiceRes = await api.post('/invoices', invoiceData, getStorefrontTenantRequestConfig());
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

        saveGuestOrderTracking({
          orderId: invoice?._id,
          orderNumber: invoice?.invoiceNumber,
          token: invoice?.guestTrackingToken,
        });

        if (form.paymentMethod === 'online') {
          const paymentRes = await api.post('/storefront/payments/create-link', {
            invoiceId: invoice._id,
            amount: invoice.totalAmount,
            customerPhone: form.phone,
            customerEmail: form.email,
            source: 'online_store',
          }, getStorefrontTenantRequestConfig({
            headers: { 'x-source': 'online_store' },
          }));
          const paymentUrl = paymentRes?.data?.data?.paymentUrl || paymentRes?.data?.data?.paymentLink;
          if (!paymentUrl) {
            throw new Error('PAYMENT_URL_MISSING');
          }
          window.location.href = paymentUrl;
        } else {
          navigate(
            storefrontPath(
              `/order/${invoice._id}${buildGuestTrackingQuery({
                orderNumber: invoice?.invoiceNumber,
                token: invoice?.guestTrackingToken,
              })}`
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12" dir="rtl">
        <EmptyState
          icon={ShoppingBag}
          title={isPortal ? 'لا توجد منتجات جاهزة للدفع' : 'لا توجد منتجات في السلة'}
          description={isPortal
            ? 'أضف منتجات إلى سلة البوابة أولاً حتى تتمكن من إكمال الطلب.'
            : 'لم تعد هناك منتجات داخل سلة التسوق. تصفح المتجر وأضف ما يناسبك ثم عد لإتمام الطلب.'}
          action={{
            label: isPortal ? 'اذهب إلى المنتجات' : 'العودة إلى المنتجات',
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
                        {shippingGovernorateOptions.map((region) => (
                          <option key={region.code} value={region.code}>
                            {region.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label={shippingConfig?.pricingMode === 'dynamic_api' ? '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 / \u0627\u0644\u0645\u062f\u064a\u0646\u0629 *' : '\u0627\u0644\u0645\u0646\u0637\u0642\u0629 / \u0627\u0644\u0645\u062f\u064a\u0646\u0629 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)'}
                      placeholder={shippingConfig?.pricingMode === 'dynamic_api' ? '\u0623\u062f\u062e\u0644 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0623\u0648 \u0627\u0644\u0645\u062f\u064a\u0646\u0629 \u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0634\u062d\u0646' : '\u0645\u062b\u0627\u0644: \u0645\u062f\u064a\u0646\u0629 \u0646\u0635\u0631'}
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="md:col-span-1"
                    />
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-600 mb-2">عنوان التوصيل المقابل للعقار بالتفصيل *</label>
                  <textarea
                    placeholder="اكتب العنوان مع أقرب علامة مميزة..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full h-32 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>
                {!isPortal && (
                  <div className="md:col-span-2 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-900">{'\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0634\u062d\u0646 \u0642\u0628\u0644 \u0627\u0644\u062f\u0641\u0639'}</p>
                        <p className="mt-1 text-sm text-indigo-700">
                          {effectiveShippingLabel !== (shippingConfig?.defaultMethodName || '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629')
                            ? `${effectiveShippingLabel}${form.city ? ` - ${form.city}` : ''}`
                            : '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629 \u0623\u0648\u0644\u0627\u064b \u0644\u0639\u0631\u0636 \u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-indigo-600">{effectiveShippingEta}</p>
                        {shippingQuote.status === 'loading' && (
                          <p className="mt-2 text-xs font-bold text-indigo-500">{'\u062c\u0627\u0631\u064a \u062d\u0633\u0627\u0628 \u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0634\u062d\u0646...'}</p>
                        )}
                        {shippingQuote.status === 'error' && (
                          <p className="mt-2 text-xs font-bold text-rose-600">{shippingQuoteMessage || '\u062a\u0639\u0630\u0631 \u062d\u0633\u0627\u0628 \u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0634\u062d\u0646. \u0631\u0627\u062c\u0639 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0648 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.'}</p>
                        )}
                        {shippingQuote.status === 'fallback' && shippingQuoteMessage && (
                          <p className="mt-2 text-xs font-bold text-amber-600">{shippingQuoteMessage}</p>
                        )}
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                        <p className="text-[11px] font-black text-indigo-400">
                          {shippingQuote.status === 'loading' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0633\u0627\u0628' : '\u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0645\u062a\u0648\u0642\u0639'}
                        </p>
                        <p className="mt-1 text-lg font-black text-indigo-700">
                          {shippingQuote.status === 'loading'
                            ? '...'
                            : effectiveShippingFee === 0
                              ? '\u0645\u062c\u0627\u0646\u064a'
                              : `${effectiveShippingFee} \u062c.\u0645`}
                        </p>
                        {shippingQuote.isEstimated && shippingQuote.status === 'fallback' && (
                          <p className="mt-1 text-[11px] font-bold text-amber-600">{'\u0633\u0639\u0631 \u062a\u0642\u062f\u064a\u0631\u064a'}</p>
                        )}
                        {effectiveShippingSavings > 0 && (
                          <p className="mt-1 text-[11px] font-bold text-emerald-600">{'\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0634\u062d\u0646 \u0627\u0644\u0645\u062c\u0627\u0646\u064a \u0628\u062f\u0644\u0627\u064b \u0645\u0646 '} {effectiveEstimatedShippingFee} {'\u062c.\u0645'}</p>
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
                        <h4 className="font-bold">{effectiveShippingLabel}</h4>
                        <p className="text-sm text-gray-500">{effectiveShippingEta}</p>
                      </div>
                    </div>
                    <span className="font-black text-indigo-600">{effectiveShippingFee === 0 ? 'مجاني' : `${effectiveShippingFee} ج.م`}</span>
                  </div>
                  {!isPortal && effectiveShippingSavings > 0 && (
                    <p className="text-xs font-bold text-emerald-600">طلبك فعّل الشحن المجاني، وتم إسقاط {effectiveEstimatedShippingFee} ج.م من تكلفة التوصيل.</p>
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
                      {shippingConfig?.supportsCashOnDelivery !== false && (
                        <button
                          onClick={() => setForm({ ...form, paymentMethod: 'cash' })}
                          className={`p-6 rounded-3xl border-2 text-right transition-all ${form.paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                        >
                          <Wallet className={`w-8 h-8 mb-4 ${form.paymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                          <h4 className="font-black text-lg mb-1">الدفع عند الاستلام</h4>
                          <p className="text-xs text-gray-500">ادفع نقداً عند باب منزلك</p>
                        </button>
                      )}
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
                    <p className="font-bold text-gray-900 dark:text-gray-100">{form.customerName}</p>
                    <p className="text-sm text-gray-500">{form.address}</p>
                    <p className="text-sm text-gray-500">{form.phone}</p>
                    {!isPortal && (
                      <>
                        <p className="text-sm text-gray-500">
                          {effectiveShippingLabel || '\u0628\u062f\u0648\u0646 \u062a\u062d\u062f\u064a\u062f \u0645\u062d\u0627\u0641\u0638\u0629'}{form.city ? ` - ${form.city}` : ''}
                        </p>
                        <p className="text-xs font-bold text-indigo-600">{effectiveShippingEta}</p>
                      </>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">طريقة الدفع</h4>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {form.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : form.paymentMethod === 'credit' ? 'خصم من الرصيد' : 'بطاقة بنكية'}
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
                    placeholder="مثال: الدور الثالث، الشقة 15 يمين"
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
                  <span className="font-bold">{effectiveShippingFee === 0 ? 'مجاني' : `${effectiveShippingFee} ج.م`}</span>
                </div>
                {!isPortal && (
                  <div className="flex justify-between text-[11px] text-indigo-300">
                    <span>{effectiveShippingLabel}</span>
                    <span>{effectiveShippingEta}</span>
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

            <div className="app-surface rounded-3xl border border-primary-100/80 p-5 shadow-sm dark:border-primary-500/20">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-gray-900 dark:text-white">توجيه الشحن الذكي</p>
                  <p className="text-xs leading-6 text-gray-600 dark:text-gray-300">
                    {branchRoutingNote}
                  </p>
                </div>
              </div>
            </div>

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
                  ? `متوسط تقييم المنتجات في طلبك يعتمد على ${checkoutReviewSnapshot.reviewCount} مراجعة بمتوسط ${checkoutAverageRating.toFixed(1)} من 5.`
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

