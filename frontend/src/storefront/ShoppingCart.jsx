import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, Tag, CheckCircle2, Truck, Sparkles } from 'lucide-react';
import { Card, Button, EmptyState } from '../components/UI';
import { storefrontPath } from '../utils/storefrontHost';
import { useCommerceStore } from '../store/commerceStore';
import { api } from '../store';
import { notify } from '../components/AnimatedNotification';
import { confirm } from '../components/ConfirmDialog';
import { pickProductImage } from '../utils/media';
import {
  clearStorefrontCoupon,
  loadStorefrontCoupon,
  saveStorefrontCoupon,
} from './storefrontCouponStorage';
import {
  calculateStorefrontVolumeDiscountForItems,
  calculateStorefrontVolumeDiscountForLine,
  getStorefrontVolumeOfferForQuantity,
} from './storefrontVolumeOffers';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import { loadStorefrontProducts } from './storefrontDataClient';

const FREE_SHIPPING_THRESHOLD = 500;
const ESTIMATED_SHIPPING_FEE = 50;

function normalizeCategoryValue(category) {
  if (!category) return '';
  if (typeof category === 'object') {
    return category._id || category.name || '';
  }
  return category;
}

export default function ShoppingCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal') || location.pathname.includes('/account');
  const portalBasePath = '/portal';
  const {
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useCommerceStore((state) => ({
    cart: state.cart,
    addToCart: state.addToCart,
    updateCartQuantity: state.updateCartQuantity,
    removeFromCart: state.removeFromCart,
    clearCart: state.clearCart,
  }));
  const [couponCode, setCouponCode] = useState(() => (!isPortal ? loadStorefrontCoupon()?.coupon?.code || '' : ''));
  const [couponData, setCouponData] = useState(() => (!isPortal ? loadStorefrontCoupon() : null));
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [suggestedProduct, setSuggestedProduct] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const handleQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    updateCartQuantity(cart[index].cartKey, newQuantity);
  };

  const handleClearCart = async () => {
    const ok = await confirm.warn('هل تريد إفراغ السلة؟ سيتم حذف جميع المنتجات المضافة.', 'إفراغ السلة');
    if (ok) {
      clearStorefrontCoupon();
      clearCart();
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const tax = subtotal * 0.14;
  const volumeDiscount = !isPortal ? calculateStorefrontVolumeDiscountForItems(cart) : 0;
  const discount = !isPortal ? (couponData?.discountAmount || 0) : 0;
  const total = Math.max(0, subtotal + tax - volumeDiscount - discount);
  const amountUntilFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  useEffect(() => {
    if (!isPortal && cart.length === 0) {
      setCouponData(null);
      setCouponCode('');
      setCouponError('');
      setSuggestedProduct(null);
      clearStorefrontCoupon();
    }
  }, [cart.length, isPortal]);

  useEffect(() => {
    if (isPortal || cart.length === 0) return;

    trackStorefrontFunnelEvent('cart_view', {
      cartSize: cart.length,
      itemCount: cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
      uniqueEventKey: 'cart_view',
    });
  }, [cart, isPortal]);

  useEffect(() => {
    if (isPortal || subtotal <= 0) return undefined;

    const storedCoupon = loadStorefrontCoupon();
    if (!storedCoupon?.coupon?.code) return undefined;

    let cancelled = false;

    const syncCoupon = async () => {
      setCouponLoading(true);
      try {
        const res = await api.post('/coupons/validate', {
          code: storedCoupon.coupon.code,
          orderTotal: Math.max(0, subtotal - volumeDiscount),
        }, {
          headers: { 'x-source': 'online_store' },
        });

        if (cancelled) return;

        setCouponData(res.data.data);
        setCouponCode(res.data.data.coupon?.code || storedCoupon.coupon.code);
        setCouponError('');
        saveStorefrontCoupon(res.data.data);
      } catch (error) {
        if (cancelled) return;

        setCouponData(null);
        setCouponError('');
        clearStorefrontCoupon();
      } finally {
        if (!cancelled) {
          setCouponLoading(false);
        }
      }
    };

    syncCoupon();

    return () => {
      cancelled = true;
    };
  }, [isPortal, subtotal, volumeDiscount]);

  useEffect(() => {
    if (isPortal || cart.length === 0) {
      setSuggestedProduct(null);
      setSuggestionLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadSuggestedProduct = async () => {
      setSuggestionLoading(true);

      try {
        const cartProductIds = new Set(
          cart.map((item) => item.product?._id || item.productId || item?._id).filter(Boolean)
        );
        const cartCategories = new Set(
          cart
            .map((item) => normalizeCategoryValue((item.product || item).category))
            .filter(Boolean)
        );

        const res = await loadStorefrontProducts({
          isActive: true,
          limit: 12,
          sort: '-sales',
        }, { ttlMs: 10000 });
        if (cancelled) return;

        const candidates = (res.data.data || []).filter((product) => {
          const stockQuantity = product.stock?.quantity ?? 0;
          return (
            product?._id &&
            !cartProductIds.has(product._id) &&
            stockQuantity > 0 &&
            !product.hasVariants
          );
        });

        const preferredCandidate =
          candidates.find((product) => cartCategories.has(normalizeCategoryValue(product.category))) ||
          candidates[0] ||
          null;

        setSuggestedProduct(preferredCandidate);
      } catch (error) {
        if (!cancelled) {
          setSuggestedProduct(null);
        }
      } finally {
        if (!cancelled) {
          setSuggestionLoading(false);
        }
      }
    };

    loadSuggestedProduct();

    return () => {
      cancelled = true;
    };
  }, [cart, isPortal]);

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode || subtotal <= 0 || isPortal) return;

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await api.post('/coupons/validate', {
        code: normalizedCode,
        orderTotal: Math.max(0, subtotal - volumeDiscount),
      }, {
        headers: { 'x-source': 'online_store' },
      });

      setCouponData(res.data.data);
      setCouponCode(res.data.data.coupon?.code || normalizedCode);
      saveStorefrontCoupon(res.data.data);
    } catch (error) {
      setCouponData(null);
      setCouponError(error.response?.data?.message || 'تعذر تطبيق الكوبون الآن');
      clearStorefrontCoupon();
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponData(null);
    setCouponError('');
    clearStorefrontCoupon();
  };

  const handleAddSuggestedProduct = () => {
    if (!suggestedProduct) return;

    addToCart(suggestedProduct, 1);
    if (!isPortal) {
      trackStorefrontFunnelEvent('add_to_cart', {
        productId: suggestedProduct._id,
        itemCount: 1,
        cartSize: 1,
        source: 'cart_suggestion',
      });
    }
    notify.success(`تمت إضافة "${suggestedProduct.name}" إلى السلة`);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ShoppingBag className="w-16 h-16" />}
          title="سلة التسوق فارغة"
          description="لم تقم بإضافة أي منتجات بعد"
        />
        <div className="text-center mt-6">
          <Button onClick={() => navigate(isPortal ? `${portalBasePath}/products` : storefrontPath('/products'))}>
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-black">سلة التسوق</h1>
        <button
          onClick={handleClearCart}
          className="self-start text-sm font-medium text-red-500 hover:text-red-600 sm:self-auto"
        >
          إفراغ السلة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {!isPortal && (
            <Card className="border border-primary-100 bg-gradient-to-l from-primary-50 via-white to-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-gray-100">
                      {amountUntilFreeShipping > 0
                        ? `أضف ${amountUntilFreeShipping.toFixed(2)} ج.م لتحصل على شحن مجاني`
                        : 'أنت مؤهل الآن للشحن المجاني'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      {amountUntilFreeShipping > 0
                        ? `أكمل الطلب الآن ووفر حتى ${ESTIMATED_SHIPPING_FEE} ج.م في خطوة الشحن.`
                        : 'جميل، تكلفة الشحن لن تُضاف عند إتمام هذا الطلب.'}
                    </p>
                  </div>
                </div>
                <div className="md:w-56">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-gray-500">
                    <span>تقدمك نحو الشحن المجاني</span>
                    <span>{freeShippingProgress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {cart.map((item, index) => {
            const product = item.product || item;
            const imageUrl = pickProductImage(product);
            const productName = product?.name || 'منتج';
            const variantAttributes = item.variant?.attributes || {};
            const volumeOffer = !isPortal ? getStorefrontVolumeOfferForQuantity(item.quantity) : null;
            const itemVolumeDiscount = !isPortal ? calculateStorefrontVolumeDiscountForLine(item.price || 0, item.quantity || 0) : 0;

            return (
              <Card key={item.cartKey || index} className="relative p-4">
                <button
                  onClick={() => removeFromCart(item.cartKey)}
                  className="absolute left-3 top-3 rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 sm:h-24 sm:w-24">
                    {imageUrl ? (
                      <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pr-8 sm:pr-0">
                    <h3 className="mb-1 text-base font-bold sm:text-lg">{productName}</h3>
                    {Object.keys(variantAttributes).length > 0 && (
                      <p className="text-sm text-gray-500 mb-2 flex flex-wrap gap-2">
                        {Object.entries(variantAttributes).map(([key, value]) => (
                          <span key={key}>{String(value)}</span>
                        ))}
                      </p>
                    )}
                    {volumeOffer && (
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        {volumeOffer.shortLabel} ويوفّر {itemVolumeDiscount.toFixed(2)} ج.م
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantity(index, item.quantity - 1)}
                          className="app-surface w-8 h-8 rounded-lg border-2 border-gray-200/80 dark:border-white/10 hover:border-primary-500 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-lg font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantity(index, item.quantity + 1)}
                          className="app-surface w-8 h-8 rounded-lg border-2 border-gray-200/80 dark:border-white/10 hover:border-primary-500 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-right sm:text-left">
                        <div className="text-lg font-black text-primary-600 sm:text-xl">
                          {((item.price || 0) * (item.quantity || 0)).toFixed(2)} ج.م
                        </div>
                        <div className="text-xs text-gray-400">
                          {(item.price || 0).toFixed(2)} ج.م × {item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="p-5 sm:p-6 lg:sticky lg:top-20">
            <h2 className="text-xl font-bold mb-4">ملخص الطلب</h2>

            {!isPortal && (
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900">
                  <Sparkles className="h-4 w-4" />
                  إضافة سريعة ترفع قيمة الطلب
                </div>
                {suggestedProduct ? (
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {pickProductImage(suggestedProduct) ? (
                          <img
                            src={pickProductImage(suggestedProduct)}
                            alt={suggestedProduct.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-gray-900 dark:text-gray-100">{suggestedProduct.name}</p>
                        <p className="mt-1 text-xs font-medium text-gray-500">إضافة خفيفة ومناسبة مع طلبك الحالي.</p>
                        <p className="mt-2 text-sm font-black text-primary-600">
                          {(suggestedProduct.price || 0).toFixed(2)} ج.م
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAddSuggestedProduct}
                      className="mt-3 w-full rounded-xl border border-primary-200 px-4 py-3 text-sm font-black text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
                    >
                      أضفها مع الطلب
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-amber-800">
                    {suggestionLoading
                      ? 'جارٍ تجهيز اقتراح مناسب لسلتك...'
                      : 'سلتك جاهزة الآن، ويمكنك المتابعة مباشرة لإتمام الطلب.'}
                  </p>
                )}
              </div>
            )}

            {!isPortal && (
              <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Tag className="w-4 h-4 text-primary-500" />
                  كوبون الخصم
                </div>

                {couponData ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-black">{couponData.coupon?.code}</span>
                        </div>
                        <p className="mt-1 text-xs text-emerald-700">
                          تم تطبيق الخصم وتوفير {discount.toFixed(2)} ج.م
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs font-bold text-red-500 hover:text-red-600"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="اكتب الكوبون"
                        className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
                        dir="ltr"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تطبيق'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs font-medium text-red-500">{couponError}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الضريبة (14%):</span>
                <span className="font-bold">{tax.toFixed(2)} ج.م</span>
              </div>
              {volumeDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>خصم الكمية:</span>
                  <span className="font-bold">-{volumeDiscount.toFixed(2)} ج.م</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>خصم الكوبون:</span>
                  <span className="font-bold">-{discount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="border-t border-gray-200/80 dark:border-white/10 pt-3 flex justify-between text-lg">
                <span className="font-bold">الإجمالي:</span>
                <span className="font-black text-primary-600 text-2xl">{total.toFixed(2)} ج.م</span>
              </div>
            </div>

            <Button
              onClick={() => navigate(isPortal ? `${portalBasePath}/checkout` : storefrontPath('/checkout'))}
              className="w-full"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              إتمام الطلب
            </Button>

            <button
              onClick={() => navigate(isPortal ? `${portalBasePath}/products` : storefrontPath('/products'))}
              className="w-full mt-3 text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              متابعة التسوق
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
