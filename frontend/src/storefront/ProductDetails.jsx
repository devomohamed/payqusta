import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Package, Star, Heart, Share2, MessageCircle, ChevronRight, ZoomIn, X, Copy, Check, ChevronLeft, Bell, BellOff } from 'lucide-react';
import { api } from '../store';
import { portalApi } from '../store/portalStore';
import { useCommerceStore } from '../store/commerceStore';
import { Card, Button, Badge, LoadingSpinner, Select } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import PortalInstallmentCalculator from '../portal/PortalInstallmentCalculator';
import { collectProductImages, pickProductImage } from '../utils/media';
import { storefrontPath } from '../utils/storefrontHost';
import { createBuyNowItem } from './buyNowItem';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import { loadStorefrontGuestProfile } from './storefrontGuestProfile';
import { loadStorefrontProducts } from './storefrontDataClient';
import {
  calculateStorefrontVolumeDiscountForLine,
  getStorefrontVolumeOfferForQuantity,
  STOREFRONT_VOLUME_OFFER_TIERS,
} from './storefrontVolumeOffers';

/* ─── Recently Viewed Utility ─── */
const RECENTLY_VIEWED_KEY = 'rv_products';
function saveRecentlyViewed(product) {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    const filtered = existing.filter(p => p._id !== product._id);
    const updated = [{ _id: product._id, name: product.name, price: product.price, image: pickProductImage(product), category: typeof product.category === 'object' ? product.category?.name : product.category }, ...filtered].slice(0, 8);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch (_) { }
}
function getRecentlyViewed(excludeId) {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]').filter(p => p._id !== excludeId).slice(0, 5);
  } catch (_) { return []; }
}

const CROSS_SELL_EVENTS_KEY = 'storefront_cross_sell_events';

function normalizeCategoryId(category) {
  if (!category) return '';
  if (typeof category === 'object') {
    return category._id || category.name || '';
  }
  return category;
}

function uniqueProducts(products) {
  const seen = new Set();

  return products.filter((product) => {
    if (!product?._id || seen.has(product._id)) return false;
    seen.add(product._id);
    return true;
  });
}

function getSharedTagCount(baseProduct, candidate) {
  const sourceTags = new Set((baseProduct?.tags || []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean));
  const candidateTags = (candidate?.tags || []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);

  if (sourceTags.size === 0 || candidateTags.length === 0) return 0;

  return candidateTags.reduce((count, tag) => count + (sourceTags.has(tag) ? 1 : 0), 0);
}

function scoreRelatedProduct(baseProduct, candidate) {
  const sameCategory = normalizeCategoryId(baseProduct?.category) === normalizeCategoryId(candidate?.category);
  const sharedTags = getSharedTagCount(baseProduct, candidate);
  const basePrice = baseProduct?.price || 0;
  const candidatePrice = candidate?.price || 0;
  const priceGapScore = basePrice > 0 ? Math.max(0, 1 - (Math.abs(basePrice - candidatePrice) / basePrice)) : 0;

  return (sameCategory ? 10 : 0) + (sharedTags * 4) + priceGapScore;
}

function getCrossSellReason(baseProduct, candidate) {
  if (normalizeCategoryId(baseProduct?.category) === normalizeCategoryId(candidate?.category)) {
    return 'يكمل نفس الفئة';
  }

  if (getSharedTagCount(baseProduct, candidate) > 0) {
    return 'مقترح من نفس الاهتمام';
  }

  return 'اختيار مناسب مع هذا المنتج';
}

function trackCrossSellEvent(type, sourceProductId, relatedProductId) {
  if (typeof window === 'undefined') return;

  try {
    const existingEvents = JSON.parse(window.localStorage.getItem(CROSS_SELL_EVENTS_KEY) || '[]');
    const nextEvents = [
      ...existingEvents,
      {
        type,
        sourceProductId,
        relatedProductId,
        createdAt: new Date().toISOString(),
      },
    ].slice(-40);

    window.localStorage.setItem(CROSS_SELL_EVENTS_KEY, JSON.stringify(nextEvents));
  } catch (_) { }
}

const REVIEW_SIGNAL_PATTERNS = [
  { label: 'الجودة', patterns: ['جودة', 'الخامة', 'خامه', 'متقن'] },
  { label: 'السعر', patterns: ['سعر', 'السعر', 'قيمة', 'قيمه'] },
  { label: 'التوصيل', patterns: ['شحن', 'توصيل', 'وصل', 'التسليم'] },
  { label: 'التغليف', patterns: ['تغليف', 'تعبئة', 'تغليفه'] },
  { label: 'الخدمة', patterns: ['خدمة', 'الدعم', 'التعامل'] },
];

function getTopReviewSignal(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;

  const scoredSignals = REVIEW_SIGNAL_PATTERNS.map((signal) => {
    const score = reviews.reduce((total, review) => {
      const text = `${review?.title || ''} ${review?.body || ''}`.toLowerCase();
      return total + signal.patterns.reduce((count, pattern) => count + (text.includes(pattern) ? 1 : 0), 0);
    }, 0);

    return { ...signal, score };
  });

  const topSignal = scoredSignals.sort((a, b) => b.score - a.score)[0];
  return topSignal?.score > 0 ? topSignal.label : null;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');

  const { addToCart: addToCartShared, toggleWishlist, wishlistIds } = useCommerceStore((state) => ({
    addToCart: state.addToCart,
    toggleWishlist: state.toggleWishlist,
    wishlistIds: state.wishlistIds,
  }));

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState({ total: 0, avgRating: 0 });
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [crossSellAddingId, setCrossSellAddingId] = useState(null);

  // UI states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showStickyCart, setShowStickyCart] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const addToCartRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // C2 — Notify Me When Back In Stock
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);

  useEffect(() => {
    setNotifyDone(false);
    loadProduct();
    loadReviews();
    window.scrollTo({ top: 0 });
  }, [id]);

  // Sticky cart visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!addToCartRef.current) return;
      const rect = addToCartRef.current.getBoundingClientRect();
      setShowStickyCart(rect.bottom < 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isPortal) return;

    const guestProfile = loadStorefrontGuestProfile();
    if (!guestProfile) return;

    if (guestProfile.email) setNotifyEmail(guestProfile.email);
    if (guestProfile.phone) setNotifyPhone(guestProfile.phone);
  }, [isPortal]);

  const loadReviews = async () => {
    try {
      const res = await api.get(`/reviews/product/${id}`);
      setReviews(res.data.data.reviews || []);
      setReviewsStats({ total: res.data.data.total || 0, avgRating: res.data.data.avgRating || 0 });
    } catch (_) { }
  };

  useEffect(() => {
    if (product) {
      setActiveImage(pickProductImage(product));
      saveRecentlyViewed(product);
      setRecentlyViewed(getRecentlyViewed(product._id));
      loadRelated(product, product._id);
      if (!isPortal) {
        trackStorefrontFunnelEvent('product_view', {
          productId: product._id,
          uniqueEventKey: `product_view:${product._id}`,
        });
      }
    }
  }, [product, isPortal]);

  const loadRelated = async (currentProduct, currentId) => {
    if (!currentProduct) return;
    try {
      const categoryId = normalizeCategoryId(currentProduct.category);
      const [sameCategoryRes, fallbackRes] = await Promise.all([
        categoryId
          ? loadStorefrontProducts({ isActive: true, limit: 12, category: categoryId }, { ttlMs: 10000 })
          : Promise.resolve({ data: { data: [] } }),
        loadStorefrontProducts({ isActive: true, limit: 18, sort: '-sales' }, { ttlMs: 10000 }),
      ]);

      const products = uniqueProducts([
        ...(sameCategoryRes.data.data || []),
        ...(fallbackRes.data.data || []),
      ])
        .filter((candidate) => candidate?._id && candidate._id !== currentId && (candidate.stock?.quantity ?? 0) > 0)
        .sort((a, b) => scoreRelatedProduct(currentProduct, b) - scoreRelatedProduct(currentProduct, a))
        .slice(0, 5);

      setRelatedProducts(products);
    } catch (_) { }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const apiClient = isPortal ? portalApi : api;
      const endpoint = isPortal ? `/portal/products/${id}` : `/products/${id}`;
      const res = await apiClient.get(endpoint);
      setProduct(res.data.data);
      if (res.data.data.hasVariants && res.data.data.variants?.length > 0) {
        setSelectedVariant(res.data.data.variants[0]);
      }
    } catch (err) {
      notify.error('فشل تحميل المنتج');
      navigate(isPortal ? '/portal/products' : '/store/products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    addToCartShared(product, quantity, selectedVariant);
    if (!isPortal) {
      trackStorefrontFunnelEvent('add_to_cart', {
        productId: product?._id,
        itemCount: quantity,
        cartSize: quantity,
        source: selectedVariant ? 'product_details_variant' : 'product_details',
      });
    }
    notify.success(isPortal ? 'تم إضافة المنتج للسلة' : 'تمت إضافة المنتج للسلة. يمكنك إكمال الطلب مباشرة كضيف.');
    return;
    if (isPortal) {
      addToPortalCart(product, quantity, selectedVariant);
      notify.success('تم إضافة المنتج للسلة 🛒');
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItem = {
      productId: product._id, name: product.name,
      price: selectedVariant?.price || product.price, quantity,
      image: activeImage || pickProductImage(product),
      variant: selectedVariant ? { id: selectedVariant._id, attributes: selectedVariant.attributes } : null
    };
    const existingIndex = cart.findIndex(item =>
      item.productId === cartItem.productId && JSON.stringify(item.variant) === JSON.stringify(cartItem.variant)
    );
    if (existingIndex >= 0) cart[existingIndex].quantity += quantity;
    else cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify.success('تم إضافة المنتج للسلة 🛒');
  };

  const handleCrossSellOpen = (relatedProductId) => {
    trackCrossSellEvent('click', product?._id, relatedProductId);
  };

  const handleCrossSellAdd = (event, relatedProduct) => {
    event.preventDefault();
    event.stopPropagation();

    if (!relatedProduct?._id) return;

    if ((relatedProduct.stock?.quantity ?? 0) <= 0) {
      notify.error('هذا المنتج غير متوفر حاليًا');
      return;
    }

    if (relatedProduct.hasVariants) {
      trackCrossSellEvent('click', product?._id, relatedProduct._id);
      notify.info('اختر المواصفات أولًا من صفحة المنتج');
      navigate(storefrontPath(`/products/${relatedProduct._id}`));
      return;
    }

    setCrossSellAddingId(relatedProduct._id);
    addToCartShared(relatedProduct, 1);
    trackCrossSellEvent('add', product?._id, relatedProduct._id);
    if (!isPortal) {
      trackStorefrontFunnelEvent('add_to_cart', {
        productId: relatedProduct._id,
        itemCount: 1,
        cartSize: 1,
        source: 'cross_sell',
      });
    }
    notify.success(`تمت إضافة "${relatedProduct.name}" إلى السلة`);
    window.setTimeout(() => setCrossSellAddingId(null), 600);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      notify.error('المنتج غير متوفر حالياً');
      return;
    }

    const buyNowItem = createBuyNowItem(product, quantity, selectedVariant);
    if (!buyNowItem) {
      notify.error('تعذر بدء الشراء الآن');
      return;
    }

    navigate(storefrontPath('/checkout'), {
      state: { buyNowItem },
    });
  };

  const handleWishlist = async () => {
    setWishlistLoading(true);
    const res = await toggleWishlist(product._id);
    if (res?.success) notify.success(res.wishlisted ? 'تمت الإضافة للمفضلة ❤️' : 'تمت الإزالة من المفضلة');
    setWishlistLoading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); return; } catch (_) { }
    }
    setShareOpen(v => !v);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsappShare = () => {
    const msg = encodeURIComponent(`${product.name} — ${currentPrice.toLocaleString('en-US')} ج.م\n${window.location.href}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const whatsappOrder = () => {
    const msg = encodeURIComponent(`مرحباً، أريد طلب:\n🛍️ ${product.name}\n💰 السعر: ${currentPrice.toLocaleString('en-US')} ج.م\n🔢 الكمية: ${quantity}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleNotifyMe = async () => {
    const normalizedEmail = notifyEmail.trim().toLowerCase();
    const normalizedPhone = notifyPhone.trim();

    if (!normalizedEmail && !normalizedPhone) {
      notify.error('أدخل بريدك الإلكتروني أو رقم الهاتف');
      return;
    }

    if (normalizedEmail && !normalizedEmail.includes('@')) {
      notify.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setNotifySubmitting(true);

    try {
      const res = await api.post(`/products/${product._id}/notify-stock`, {
        email: normalizedEmail,
        phone: normalizedPhone,
      });

      if (res?.data?.data?.availableNow) {
        notify.info(res?.data?.message || 'المنتج متوفر الآن ويمكنك إكمال الطلب');
        return;
      }

      setNotifyDone(true);
      notify.success(res?.data?.message || 'تم تسجيل طلبك وسنبلغك فور توفر المنتج');
    } catch (error) {
      notify.error(error?.response?.data?.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setNotifySubmitting(false);
    }
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    setMousePos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
    setIsZoomed(true);
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;
  const currentStock = selectedVariant?.stock ?? product?.stock?.quantity ?? 0;
  const isOutOfStock = currentStock === 0;
  const allImages = collectProductImages(product);
  const stockPercent = product?.stock?.maxQuantity ? Math.min(100, (currentStock / product.stock.maxQuantity) * 100) : Math.min(100, (currentStock / 50) * 100);
  const activeVolumeOffer = !isPortal ? getStorefrontVolumeOfferForQuantity(quantity) : null;
  const activeVolumeSavings = !isPortal ? calculateStorefrontVolumeDiscountForLine(currentPrice, quantity) : 0;
  const sortedReviews = [...reviews].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const highlightedReviews = sortedReviews.slice(0, 2);
  const topReviewSignal = getTopReviewSignal(sortedReviews);
  const latestReviewDate = sortedReviews[0]?.createdAt ? new Date(sortedReviews[0].createdAt).toLocaleDateString() : null;
  const productTrustSignals = [
    {
      key: 'rating',
      icon: Star,
      title: 'تقييم العملاء',
      value: reviewsStats.total > 0 ? `${reviewsStats.avgRating?.toFixed(1) || '0.0'} / 5` : 'بانتظار أول تقييم',
      detail: reviewsStats.total > 0 ? `${reviewsStats.total} مراجعة معتمدة` : 'سيظهر هنا أول تقييم معتمد',
    },
    {
      key: 'availability',
      icon: Package,
      title: 'حالة التوفر',
      value: isOutOfStock ? 'غير متوفر الآن' : `${currentStock} قطعة`,
      detail: isOutOfStock ? 'فعّل تنبيه العودة للمخزون' : (currentStock <= 20 ? 'مخزون محدود حاليًا' : 'جاهز للطلب الآن'),
    },
    {
      key: 'signal',
      icon: MessageCircle,
      title: 'إشارة الثقة',
      value: topReviewSignal || (latestReviewDate ? 'آخر مراجعة مؤكدة' : 'طلب مباشر كضيف'),
      detail: topReviewSignal
        ? 'أكثر ما يتكرر داخل آراء العملاء'
        : (latestReviewDate ? `آخر مراجعة بتاريخ ${latestReviewDate}` : 'يمكنك إتمام الطلب بدون إنشاء حساب'),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  // D1 — Open Graph meta tags
  const pageTitle = product.seoTitle || product.name;
  const pageDesc = product.seoDescription || (product.description ? product.description.replace(/<[^>]*>/g, '').slice(0, 155) : '');
  const pageImage = pickProductImage(product);
  const pageUrl = window.location.href;
  // Dynamically update document head for OG
  if (typeof document !== 'undefined') {
    document.title = pageTitle;
    const setMeta = (prop, val, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}='${prop}']`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute('content', val);
    };
    setMeta('og:title', pageTitle);
    setMeta('og:description', pageDesc);
    setMeta('og:image', pageImage || '');
    setMeta('og:url', pageUrl);
    setMeta('og:type', 'product');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', pageTitle, 'name');
    setMeta('twitter:description', pageDesc, 'name');
    setMeta('twitter:image', pageImage || '', 'name');
  }

  return (

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 animate-fade-in" dir="rtl">

      {/* ─── Lightbox ─── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all" onClick={() => setLightboxOpen(false)}>
            <X className="w-6 h-6" />
          </button>
          {allImages.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length); }}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % allImages.length); }}>
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img src={allImages[lightboxIndex]} alt={product.name} className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
          {allImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {allImages.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightboxIndex(i); }} className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-6' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Sticky Add-to-Cart Bar ─── */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ${showStickyCart ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {activeImage && <img src={activeImage} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{product.name}</p>
              <p className="text-primary-600 font-black">{currentPrice.toLocaleString('en-US')} ج.م</p>
            </div>
            <button
              onClick={addToCart}
              disabled={isOutOfStock}
              className="flex-shrink-0 h-11 px-6 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              أضف للسلة
            </button>
          </div>
        </div>
      </div>

      {/* ─── Breadcrumbs ─── */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8 pt-4 flex-wrap" aria-label="breadcrumb">
        <Link to={storefrontPath('/')} className="hover:text-primary-600 transition-colors font-medium">الرئيسية</Link>
        <ChevronLeft className="w-4 h-4 flex-shrink-0" />
        <Link to={storefrontPath('/products')} className="hover:text-primary-600 transition-colors font-medium">المنتجات</Link>
        {product.category && (
          <>
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            <Link to={storefrontPath(`/products?category=${typeof product.category === 'object' ? product.category?._id : product.category}`)} className="hover:text-primary-600 transition-colors font-medium">{typeof product.category === 'object' ? product.category?.name : product.category}</Link>
          </>
        )}
        <ChevronLeft className="w-4 h-4 flex-shrink-0" />
        <span className="text-gray-700 dark:text-gray-200 font-semibold truncate max-w-[180px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ─── Gallery ─── */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className="aspect-[4/3] sm:aspect-square bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/50 rounded-[2rem] overflow-hidden relative group cursor-zoom-in border border-gray-100 dark:border-gray-800 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
            onClick={() => { setLightboxIndex(allImages.indexOf(activeImage)); setLightboxOpen(true); }}
          >
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-contain p-8 transition-transform duration-300 ease-out"
                style={{ transformOrigin: `${mousePos.x}% ${mousePos.y}%`, transform: isZoomed ? 'scale(1.8)' : 'scale(1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-32 h-32 text-gray-200" />
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-10 transition-all duration-300">
                <div className="bg-red-500 text-white px-8 py-3 rounded-full font-black text-xl shadow-[0_8px_30px_rgb(239,68,68,0.3)] -rotate-6 transform hover:scale-105 transition-transform duration-300">نفذت الكمية</div>
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white/80 dark:bg-black/60 backdrop-blur-md text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-sm">
              <ZoomIn className="w-3.5 h-3.5" /> تكبير للصورة
            </div>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 snap-center rounded-2xl overflow-hidden border-2 transition-all duration-300 ease-out ${activeImage === img ? 'border-primary-500 shadow-[0_4px_12px_rgb(var(--color-primary-500)/0.2)] scale-105' : 'border-transparent bg-white dark:bg-gray-800 hover:bg-gray-50 opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-contain p-2" />
                </button>
              ))}
            </div>
          )}

          {/* Desktop Description */}
          <div className="hidden lg:block mt-8">
            <h3 className="text-xl font-black mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
              <span className="w-1.5 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />وصف المنتج
            </h3>
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
              dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف متاح لهذا المنتج.</p>' }}
            />
          </div>
        </div>

        {/* ─── Product Info ─── */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {product.category && (
                <Badge variant="neutral" className="px-4 py-1.5 text-xs font-bold tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none rounded-full">
                  {typeof product.category === 'object' ? product.category.name : product.category}
                </Badge>
              )}
              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Share2 className="w-4 h-4" /> شارك
                </button>
                {shareOpen && (
                  <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-2 min-w-[200px] z-30 animate-fade-in origin-top-left">
                    <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold transition-colors">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      {copied ? 'تم النسخ!' : 'انسخ الرابط'}
                    </button>
                    <button onClick={whatsappShare} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 text-sm font-bold transition-colors">
                      <MessageCircle className="w-4 h-4" /> شارك واتساب
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.15] tracking-tight">{product.name}</h1>

            {/* Stars summary */}
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 w-fit px-4 py-2 rounded-full border border-gray-100 dark:border-gray-700">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(reviewsStats.avgRating) ? 'fill-amber-400 text-amber-400 drop-shadow-sm' : 'text-gray-300 dark:text-gray-600'}`} />
                ))}
              </div>
              {reviewsStats.total > 0 ? (
                <button onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors flex items-center gap-1.5">
                  <span className="text-amber-500 font-black">{reviewsStats.avgRating?.toFixed(1) || '0.0'}</span>
                  ({reviewsStats.total} تقييم)
                </button>
              ) : <span className="text-sm font-medium text-gray-400">لا يوجد تقييمات</span>}
            </div>

            {(product.sku || product.barcode) && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {product.sku && <span className="text-[11px] font-mono text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-sm">SKU: <strong className="text-gray-700 dark:text-white select-all">{product.sku}</strong></span>}
                {product.barcode && <span className="text-[11px] font-mono text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-sm">BC: <strong className="text-gray-700 dark:text-white select-all">{product.barcode}</strong></span>}
              </div>
            )}
          </div>

          {/* ─── Action Card ─── */}
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:shadow-none sticky top-24 space-y-6">

            {/* Price */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-bold uppercase tracking-wider">السعر الإجمالي</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent tracking-tighter tabular-nums leading-none pb-1">{currentPrice.toLocaleString('en-US')}</span>
                  <span className="text-xl font-bold text-gray-400">ج.م</span>
                </div>
                {product.compareAtPrice > currentPrice && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-base text-gray-400 line-through font-medium">{product.compareAtPrice.toLocaleString()} ج.م</p>
                    <Badge variant="danger" className="text-xs px-2 py-0.5 rounded-lg shadow-sm">
                      وفر {(product.compareAtPrice - currentPrice).toLocaleString()} ج.م
                    </Badge>
                  </div>
                )}
                {product.taxable && (
                  <p className="text-xs font-bold text-gray-400 mt-1.5 bg-gray-50 dark:bg-gray-800 w-fit px-2 py-0.5 rounded-md">{product.priceIncludesTax ? 'السعر شامل الضريبة' : `تُضاف ضريبة بنسبة ${product.taxRate}%`}</p>
                )}
              </div>

              <div className={`sm:absolute top-0 left-0 text-center px-5 py-3 rounded-2xl min-w-[100px] border ${isOutOfStock ? 'bg-red-50 dark:bg-red-900/10 border-red-100' : 'bg-green-50 dark:bg-green-900/10 border-green-100'}`}>
                <span className={`block text-3xl font-black ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>{isOutOfStock ? '0' : currentStock}</span>
                <span className={`text-xs font-bold uppercase tracking-widest ${isOutOfStock ? 'text-red-400' : 'text-green-600'}`}>{isOutOfStock ? 'نفذت الكمية' : 'متاح للطلب'}</span>
              </div>
            </div>

            {/* Stock progress bar */}
            {false && !isOutOfStock && currentStock <= 20 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-black text-orange-600 dark:text-orange-400 flex items-center gap-2 text-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                    </span>
                    أسرع! آخر {currentStock} قطع متبقية بالمتجر
                  </span>
                </div>
                <div className="h-2.5 bg-orange-200/50 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-orange-400 to-orange-500"
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>
              </div>
            )}

            {false && <div className="grid gap-3 sm:grid-cols-3">
              {productTrustSignals.map((signal) => (
                <div
                  key={signal.key}
                  className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/60 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <signal.icon className="h-4 w-4 shrink-0 text-primary-500" />
                    <span className="text-[11px] font-black uppercase tracking-wider">{signal.title}</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900 dark:text-white leading-tight">{signal.value}</p>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-500 dark:text-gray-400">{signal.detail}</p>
                </div>
              ))}
            </div>}

            {/* Variants */}
            {product.hasVariants && product.variants?.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-gray-900 dark:text-white">اختر المواصفات المتاحة:</label>
                  {selectedVariant && (
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">تم الاختيار</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={v.stock === 0}
                      className={`relative px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200 overflow-hidden ${selectedVariant?._id === v._id ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 text-primary-700 shadow-md transform scale-[1.02]' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 hover:border-gray-200 hover:shadow-sm'} ${v.stock === 0 ? 'opacity-40 hover:scale-100 cursor-not-allowed bg-gray-50' : ''}`}
                    >
                      {selectedVariant?._id === v._id && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-primary-600" />
                      )}
                      <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                        <span className="truncate">{Object.values(v.attributes || {}).join(' / ')}</span>
                        {v.price > product.price && <span className="text-[10px] font-black tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md mt-1">+{(v.price - product.price).toFixed(0)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div ref={addToCartRef} className="pt-4 border-t border-gray-100 dark:border-gray-800">
              {!isOutOfStock ? (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 transition-colors active:scale-95">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-xl w-6 text-center tabular-nums text-gray-900 dark:text-white">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 transition-colors active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 flex gap-3">
                      <Button
                        onClick={addToCart}
                        className="flex-1 h-16 text-lg rounded-2xl shadow-[0_8px_20px_rgb(var(--color-primary-500)/0.25)] hover:shadow-[0_12px_25px_rgb(var(--color-primary-500)/0.35)] active:scale-[0.98] transition-all duration-200 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 border-none group"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <ShoppingCart className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                          <span className="font-black tracking-wide">أضف إلى السلة</span>
                        </div>
                      </Button>
                      <button
                        onClick={handleWishlist}
                        disabled={wishlistLoading}
                        className={`w-16 h-16 flex items-center justify-center rounded-2xl border-2 transition-all active:scale-90 shrink-0 ${wishlistIds?.includes(product._id) ? 'border-red-100 bg-red-50 text-red-500 shadow-sm' : 'border-gray-100 bg-white dark:bg-gray-900 text-gray-400 hover:border-red-200 hover:text-red-400 dark:border-gray-800 shadow-sm'}`}
                      >
                        <Heart className={`w-6 h-6 transition-transform duration-300 ${wishlistIds?.includes(product._id) ? 'fill-current scale-110' : 'hover:scale-110'}`} />
                      </button>
                    </div>
                  </div>

                  {false && !isPortal && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5 mt-2 transition-colors hover:bg-amber-50">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {STOREFRONT_VOLUME_OFFER_TIERS.map((tier) => (
                          <span
                            key={tier.minQuantity}
                            className={`inline-flex rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-sm transition-colors ${activeVolumeOffer?.minQuantity === tier.minQuantity ? 'bg-emerald-500 text-white' : 'bg-white text-amber-600 border border-amber-100'}`}
                          >
                            {tier.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-amber-800/90 leading-relaxed">
                        {activeVolumeOffer
                          ? `الكمية الحالية فعّلت ${activeVolumeOffer.shortLabel} وتوفّر ${activeVolumeSavings.toFixed(2)} ج.م على هذا المنتج.`
                          : 'ارفع الكمية إلى 2 أو أكثر لتفعيل خصم تلقائي يظهر في السلة وعند الدفع.'}
                      </p>
                    </div>
                  )}

                  {!isPortal && (
                    <button
                      onClick={handleBuyNow}
                      className="w-full h-14 rounded-2xl border-2 border-primary-200 bg-primary-50/50 text-primary-700 font-bold hover:bg-primary-100 hover:border-primary-300 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span className="tracking-wide">اشتري الآن بسرعة</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full py-5 rounded-2xl bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col items-center justify-center gap-2 cursor-not-allowed">
                    <Package className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-500 font-black">المنتج غير متوفر حالياً بالمخزون</span>
                  </div>
                  {/* C2 — Notify Me When Back In Stock */}
                  {!isPortal && (
                    <div className="p-6 rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10 space-y-4 hover:bg-primary-50/60 transition-colors">
                      {notifyDone ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
                          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <Check className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-gray-900">تم تسجيل طلبك للمتابعة</p>
                          <p className="text-sm text-gray-500">سيصلك إشعار فور توفر المنتج لدينا!</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center">
                            <h4 className="font-black text-gray-900 dark:text-gray-100 mb-1 flex items-center justify-center gap-2">
                              <Bell className="w-5 h-5 text-primary-500" /> أعلمني عند التوفر
                            </h4>
                            <p className="text-sm text-gray-500">لا تفوت الفرصة، سجل بياناتك لنخبرك مسبقاً</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 pt-2">
                            <input
                              type="email"
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              placeholder="البريد الإلكتروني"
                              className="w-full rounded-xl border-gray-200 bg-white placeholder:text-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900 shadow-sm transition-shadow hover:shadow-md"
                              dir="rtl"
                            />
                            <input
                              type="tel"
                              value={notifyPhone}
                              onChange={(e) => setNotifyPhone(e.target.value)}
                              placeholder="رقم واتساب للمراسلة"
                              className="w-full rounded-xl border-gray-200 bg-white placeholder:text-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900 shadow-sm transition-shadow hover:shadow-md"
                              dir="rtl"
                            />
                          </div>
                          <button
                            onClick={handleNotifyMe}
                            disabled={notifySubmitting}
                            className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black dark:bg-primary-600 dark:hover:bg-primary-500 text-white font-bold transition-all disabled:opacity-50 shadow-md active:scale-[0.98] mt-2"
                          >
                            {notifySubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> جاري الإرسال...</span> : 'سجل طلبي الآن'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp Order Button */}
            {false && !isPortal && (
              <button
                onClick={whatsappOrder}
                className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 active:scale-[0.98] text-white font-bold transition-all shadow-[0_8px_20px_rgb(16,185,129,0.25)] border-none"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span className="tracking-wide text-lg">اطلب وتواصل بالواتساب</span>
              </button>
            )}

            {/* Expiry Warning */}
            {product.expiryDate && (
              <div className="p-4 bg-red-50/80 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-500 mb-0.5">تاريخ الصلاحية</p>
                  <p className="text-sm font-black font-mono tracking-wider">{new Date(product.expiryDate).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Side (Info + Action) closes — now Mobile Description ─── */}
      </div>

      {/* ─── Lower section: Description (mobile) + Installment + Reviews ─── */}
      <div className="mt-10 space-y-10">

        {/* Mobile Description */}
        <div className="block lg:hidden">
          <h3 className="text-xl font-black mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
            <span className="w-1.5 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />وصف المنتج
          </h3>
          <div
            className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800/40 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800"
            dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف متاح لهذا المنتج.</p>' }}
          />
        </div>

        {/* Installment Calculator */}
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
          <PortalInstallmentCalculator />
        </div>

        {/* Reviews */}
        <div id="reviews-section" className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> آراء وتقييمات العملاء
          </h3>
          {sortedReviews.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-[11px] font-black text-amber-700">متوسط التقييم</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{reviewsStats.avgRating?.toFixed(1) || '0.0'} / 5</p>
                <p className="mt-1 text-xs font-medium text-amber-700">{reviewsStats.total} تقييم فعلي</p>
              </div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <p className="text-[11px] font-black text-primary-700">آخر تقييم</p>
                <p className="mt-1 text-base font-black text-primary-900">{latestReviewDate || 'لا يوجد بعد'}</p>
                <p className="mt-1 text-xs font-medium text-primary-700">أحدث آراء العملاء تظهر أولًا</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[11px] font-black text-emerald-700">أكثر ما يذكره العملاء</p>
                <p className="mt-1 text-base font-black text-emerald-900">{topReviewSignal || 'تجربة شراء جيدة'}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">إشارة ثقة متكررة داخل المراجعات</p>
              </div>
            </div>
          )}
          {highlightedReviews.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {highlightedReviews.map((review) => (
                <div key={`highlight-${review._id}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-gray-500">{review.customer?.name || 'عميل'}</span>
                    <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
                  </div>
                  <p className="mt-2 text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-3">{review.title || review.body}</p>
                </div>
              ))}
            </div>
          )}
          {sortedReviews.length > 0 ? (
            <div className="space-y-3">
              {sortedReviews.map(r => (
                <div key={r._id} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{r.customer?.name || 'مستخدم'}</span>
                      <div className="flex mt-0.5">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <h4 className="font-bold text-sm mb-1">{r.title}</h4>}
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{r.body}</p>
                  {r.reply && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-r-4 border-primary-500">
                      <span className="text-xs font-black text-primary-600 block mb-1">رد المتجر</span>
                      <p className="text-xs text-gray-500 leading-relaxed">{r.reply.body}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-500 font-bold">لا توجد تقييمات حتى الآن</p>
              <p className="text-sm text-gray-400">كن أول من يقيم هذا المنتج!</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Related Products ─── */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-gray-100 dark:border-gray-800 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">منتجات قد تعجبك</h2>
            <Link to={isPortal ? '/portal/products' : storefrontPath('/products')} className="text-sm font-bold text-primary-600 hover:text-primary-500 flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {relatedProducts.map(p => (
              <div
                key={p._id}
                className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <Link
                  to={isPortal ? `/portal/products/${p._id}` : storefrontPath(`/products/${p._id}`)}
                  onClick={() => handleCrossSellOpen(p._id)}
                  className="block"
                >
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 overflow-hidden">
                    {pickProductImage(p) ? (
                      <img src={pickProductImage(p)} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 transition-colors">{p.name}</p>
                    <span className="mt-2 inline-flex w-fit rounded-full bg-primary-50 px-2 py-1 text-[10px] font-black text-primary-700">
                      {getCrossSellReason(product, p)}
                    </span>
                    <p className="text-primary-600 font-black text-sm mt-1">{p.price?.toLocaleString()} ج.م</p>
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  <button
                    onClick={(event) => handleCrossSellAdd(event, p)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 px-3 py-2 text-xs font-black text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
                  >
                    {crossSellAddingId === p._id ? (
                      <span className="h-4 w-4 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        {p.hasVariants ? 'عرض التفاصيل' : 'أضفه مع الطلب'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Recently Viewed ─── */}
      {recentlyViewed.length > 0 && (
        <section className="mt-12 animate-fade-in">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <span className="w-1 h-5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            شاهدته مؤخراً
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
            {recentlyViewed.map(p => (
              <Link
                key={p._id}
                to={storefrontPath(`/products/${p._id}`)}
                className="flex-shrink-0 w-32 group"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 group-hover:border-primary-300 transition-all">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-2 line-clamp-2 group-hover:text-primary-600 transition-colors">{p.name}</p>
                <p className="text-xs text-primary-600 font-black">{p.price?.toLocaleString()} ج.م</p>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
