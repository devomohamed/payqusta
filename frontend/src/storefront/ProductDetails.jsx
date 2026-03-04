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
        categoryId ? api.get(`/products?isActive=true&limit=12&category=${categoryId}`) : Promise.resolve({ data: { data: [] } }),
        api.get('/products?isActive=true&limit=18&sort=-sales'),
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
        <div className="lg:col-span-7 space-y-4">
          <div
            className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-3xl overflow-hidden relative group cursor-zoom-in border-2 border-transparent hover:border-primary-100 dark:hover:border-gray-700 transition-all shadow-xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsZoomed(false)}
            onClick={() => { setLightboxIndex(allImages.indexOf(activeImage)); setLightboxOpen(true); }}
          >
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-contain p-6 transition-transform duration-200"
                style={{ transformOrigin: `${mousePos.x}% ${mousePos.y}%`, transform: isZoomed ? 'scale(1.8)' : 'scale(1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-32 h-32 text-gray-200" />
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg -rotate-12">نفذت الكمية</div>
              </div>
            )}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3 h-3" /> تكبير
            </div>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${activeImage === img ? 'border-primary-500 ring-2 ring-primary-500/30 shadow-md' : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:border-gray-300'}`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Desktop Description */}
          <div className="hidden lg:block mt-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />وصف المنتج
            </h3>
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/30 p-6 rounded-2xl"
              dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف متاح لهذا المنتج.</p>' }}
            />
          </div>
        </div>

        {/* ─── Product Info ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {product.category && (
                <Badge variant="neutral" className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-800">
                  {typeof product.category === 'object' ? product.category.name : product.category}
                </Badge>
              )}
              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Share2 className="w-4 h-4" /> مشاركة
                </button>
                {shareOpen && (
                  <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 min-w-[180px] z-30 animate-fade-in">
                    <button onClick={copyLink} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      {copied ? 'تم النسخ!' : 'نسخ الرابط'}
                    </button>
                    <button onClick={whatsappShare} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                      <MessageCircle className="w-4 h-4 text-green-500" /> شارك واتساب
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight">{product.name}</h1>

            {/* Stars summary */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(reviewsStats.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                ))}
              </div>
              {reviewsStats.total > 0 ? (
                <button onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-gray-400 underline underline-offset-2 hover:text-primary-600 transition-colors">
                  {reviewsStats.total} تقييم
                </button>
              ) : <span className="text-sm text-gray-400">لا توجد تقييمات بعد</span>}
            </div>

            {(product.sku || product.barcode) && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                {product.sku && <span className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">SKU: <strong className="text-gray-600 dark:text-gray-300 select-all">{product.sku}</strong></span>}
                {product.barcode && <span className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">BARCODE: <strong className="text-gray-600 dark:text-gray-300 select-all">{product.barcode}</strong></span>}
              </div>
            )}
          </div>

          {/* ─── Action Card ─── */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 p-6 shadow-xl shadow-gray-100/50 dark:shadow-none sticky top-24 space-y-5">

            {/* Price */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1 font-medium">السعر</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-primary-600 tracking-tight tabular-nums">{currentPrice.toLocaleString('en-US')}</span>
                  <span className="text-lg font-bold text-gray-400">ج.م</span>
                </div>
                {product.compareAtPrice > currentPrice && (
                  <p className="text-sm text-gray-400 line-through mt-0.5">{product.compareAtPrice.toLocaleString()} ج.م</p>
                )}
                {product.taxable && (
                  <p className="text-xs text-gray-400 mt-0.5">{product.priceIncludesTax ? '(شامل الضريبة)' : `(+ ${product.taxRate}% ضريبة)`}</p>
                )}
              </div>
              <div className={`text-center px-4 py-2 rounded-2xl ${isOutOfStock ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
                <span className={`block text-2xl font-black ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>{isOutOfStock ? '0' : currentStock}</span>
                <span className={`text-xs font-semibold ${isOutOfStock ? 'text-red-400' : 'text-green-500'}`}>{isOutOfStock ? 'نفذ' : 'متوفر'}</span>
              </div>
            </div>

            {/* Stock progress bar */}
            {!isOutOfStock && currentStock <= 20 && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                    آخر {currentStock} قطعة فقط!
                  </span>
                  <span className="text-gray-400">{Math.round(stockPercent)}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${stockPercent}%`, background: stockPercent > 50 ? '#22c55e' : stockPercent > 20 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {productTrustSignals.map((signal) => (
                <div
                  key={signal.key}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60"
                >
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                    <signal.icon className="h-4 w-4 text-primary-500" />
                    <span className="text-[11px] font-black">{signal.title}</span>
                  </div>
                  <p className="mt-3 text-sm font-black text-gray-900 dark:text-white">{signal.value}</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-gray-500 dark:text-gray-400">{signal.detail}</p>
                </div>
              ))}
            </div>

            {/* Variants */}
            {product.hasVariants && product.variants?.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">الخيارات:</label>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={v.stock === 0}
                      className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex justify-between items-center ${selectedVariant?._id === v._id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 hover:border-gray-300'} ${v.stock === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className="truncate">{Object.values(v.attributes || {}).join(' / ')}</span>
                      {v.price > product.price && <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded">+{(v.price - product.price).toFixed(0)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div ref={addToCartRef}>
              {!isOutOfStock ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-500 pr-2">الكمية:</span>
                    <div className="flex-1 flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-1">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition active:scale-90">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-lg w-8 text-center tabular-nums">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition active:scale-90">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {!isPortal && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {STOREFRONT_VOLUME_OFFER_TIERS.map((tier) => (
                          <span
                            key={tier.minQuantity}
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${activeVolumeOffer?.minQuantity === tier.minQuantity ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-amber-700'}`}
                          >
                            {tier.label}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs font-medium text-amber-800">
                        {activeVolumeOffer
                          ? `الكمية الحالية فعّلت ${activeVolumeOffer.shortLabel} وتوفّر ${activeVolumeSavings.toFixed(2)} ج.م على هذا المنتج.`
                          : 'ارفع الكمية إلى 2 أو أكثر لتفعيل خصم تلقائي يظهر في السلة والـ checkout.'}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Button
                      onClick={addToCart}
                      className="flex-1 h-14 text-base rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
                      icon={<ShoppingCart className="w-5 h-5" />}
                    >
                      أضف إلى السلة
                    </Button>
                    <button
                      onClick={handleWishlist}
                      disabled={wishlistLoading}
                      className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all active:scale-90 flex-shrink-0 ${wishlistIds?.includes(product._id) ? 'border-red-100 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 dark:border-gray-700'}`}
                    >
                      <Heart className={`w-6 h-6 transition-transform ${wishlistIds?.includes(product._id) ? 'fill-current scale-110' : ''}`} />
                    </button>
                  </div>
                  {!isPortal && (
                    <button
                      onClick={handleBuyNow}
                      className="w-full h-12 rounded-2xl border border-primary-200 bg-primary-50 text-primary-700 font-bold hover:bg-primary-100 transition-all active:scale-[0.98]"
                    >
                      اشترِ الآن
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <button disabled className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold cursor-not-allowed">
                    غير متوفر حالياً
                  </button>
                  {/* C2 — Notify Me When Back In Stock */}
                  {!isPortal && (
                    <div className="p-4 rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 space-y-3">
                      {notifyDone ? (
                        <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 font-semibold text-sm justify-center py-1">
                          <Bell className="w-4 h-4 fill-current" />
                          سيصلك إشعار فور توفر المنتج!
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center">
                            <Bell className="w-3.5 h-3.5 inline-block ml-1 text-primary-500" />
                            أبلغني عند توفر المنتج
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="email"
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              placeholder="البريد الإلكتروني"
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-gray-700 dark:bg-gray-900"
                              dir="rtl"
                            />
                            <input
                              type="tel"
                              value={notifyPhone}
                              onChange={(e) => setNotifyPhone(e.target.value)}
                              placeholder="رقم الهاتف / واتساب"
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-gray-700 dark:bg-gray-900"
                              dir="rtl"
                            />
                          </div>
                          <button
                            onClick={handleNotifyMe}
                            disabled={notifySubmitting}
                            className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-500 disabled:opacity-50"
                          >
                            {notifySubmitting ? '...' : 'أبلغني عند التوفر'}
                          </button>
                          {false && (<>
                            <input
                              type="email"
                              value={notifyEmail}
                              onChange={e => setNotifyEmail(e.target.value)}
                              placeholder="بريدك الإلكتروني"
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 text-right"
                              dir="rtl"
                            />
                            <button
                              onClick={async () => {
                                if (!notifyEmail || !notifyEmail.includes('@')) {
                                  notify.error('يرجى إدخال بريد إلكتروني صحيح');
                                  return;
                                }
                                setNotifySubmitting(true);
                                try {
                                  await api.post(`/products/${product._id}/notify-stock`, { email: notifyEmail });
                                  setNotifyDone(true);
                                  notify.success('تم تسجيل طلبك! سنبلغك فور توفر المنتج');
                                } catch {
                                  notify.error('حدث خطأ، يرجى المحاولة مرة أخرى');
                                } finally {
                                  setNotifySubmitting(false);
                                }
                              }}
                              disabled={notifySubmitting}
                              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-all disabled:opacity-50 flex-shrink-0"
                            >
                              {notifySubmitting ? '...' : 'أبلغني'}
                            </button>
                          </>)}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp Order Button */}
            {!isPortal && (
              <button
                onClick={whatsappOrder}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-[0.98] text-white font-bold transition-all shadow-md shadow-green-500/20"
              >
                <MessageCircle className="w-5 h-5" />
                اطلب عبر واتساب
              </button>
            )}

            {/* Expiry Warning */}
            {product.expiryDate && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                ينتهي الصلاحية: <span className="font-bold font-mono">{new Date(product.expiryDate).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>

          {/* Mobile Description */}
          <div className="block lg:hidden pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3">وصف المنتج</h3>
            <div className="prose dark:prose-invert max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف.</p>' }} />
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
