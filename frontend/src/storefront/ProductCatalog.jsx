import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, X, Heart, Package, Star, Tag, SlidersHorizontal, ShoppingCart, ArrowLeft, ShieldCheck } from 'lucide-react';
import { api } from '../store';
import { portalApi } from '../store/portalStore';
import { useCommerceStore } from '../store/commerceStore';
import { notify } from '../components/AnimatedNotification';
import { pickProductImage } from '../utils/media';
import { storefrontPath } from '../utils/storefrontHost';
import { createBuyNowItem } from './buyNowItem';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import { buildStorefrontSearchSuggestions, rankStorefrontProducts } from './storefrontSearch';
import { STOREFRONT_VOLUME_OFFER_TIERS } from './storefrontVolumeOffers';

const priceRanges = [
  { value: 'all', label: 'جميع الأسعار' },
  { value: 'under100', label: 'أقل من 100 ج.م' },
  { value: '100-500', label: '100 – 500 ج.م' },
  { value: 'over500', label: 'أكثر من 500 ج.م' },
];

export default function ProductCatalog() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPortal = location.pathname.includes('/portal');

  const { addToCart, toggleWishlist, wishlistIds, cart } = useCommerceStore((state) => ({
    addToCart: state.addToCart,
    toggleWishlist: state.toggleWishlist,
    wishlistIds: state.wishlistIds,
    cart: state.cart,
  }));

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [addingId, setAddingId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchPanelRef = useRef(null);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    const searchParam = params.get('search');
    setSelectedCategory(catParam || '');
    setSearch(searchParam || '');
    loadData();
  }, [location.search, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isPortal) {
        const res = await portalApi.get('/portal/products?limit=100');
        setProducts(res.data.data.products || []);
        setCategories(res.data.data.categories || []);
      } else {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products?isActive=true&limit=100'),
          api.get('/products/categories'),
        ]);
        setProducts(productsRes.data.data || []);
        setCategories(categoriesRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchRankedPool = search.trim() ? rankStorefrontProducts(products, search) : products;
  const searchSuggestions = buildStorefrontSearchSuggestions({
    products,
    categories,
    query: search,
    limit: 6,
  });

  // Filter products
  const filteredProducts = searchRankedPool.filter((product) => {
    // category can be an object (populated) or a string/id
    const productCatId = typeof product.category === 'object' ? product.category?._id?.toString() : product.category;
    const productCatName = typeof product.category === 'object' ? product.category?.name : product.category;
    const matchesCategory = !selectedCategory || productCatId === selectedCategory || productCatName === selectedCategory;
    let matchesPrice = true;
    if (priceRange === 'under100') matchesPrice = product.price < 100;
    else if (priceRange === '100-500') matchesPrice = product.price >= 100 && product.price <= 500;
    else if (priceRange === 'over500') matchesPrice = product.price > 500;
    return matchesCategory && matchesPrice;
  });

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock?.quantity === 0) { notify.error('المنتج غير متوفر حالياً'); return; }
    if (product.hasVariants) {
      notify.info('اختر المواصفات أولاً من صفحة المنتج');
      navigate(detailPath(product));
      return;
    }
    setAddingId(product._id);
    addToCart(product, 1);
    if (!isPortal) {
      trackStorefrontFunnelEvent('add_to_cart', {
        productId: product._id,
        itemCount: 1,
        cartSize: 1,
        source: 'catalog',
      });
    }
    notify.success(isPortal ? `تمت إضافة "${product.name}" للسلة` : `تمت إضافة "${product.name}" للسلة. يمكنك إكمال الطلب كضيف في أي وقت.`);
    setTimeout(() => setAddingId(null), 600);
    return;
    if (product.stock?.quantity === 0) { notify.error('المنتج غير متوفر حالياً'); return; }
    setAddingId(product._id);
    addToCart(product, 1);
    notify.success(`تمت إضافة "${product.name}" للسلة 🛒`);
    setTimeout(() => setAddingId(null), 600);
  };

  const handleWishlist = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistLoading(prev => ({ ...prev, [product._id]: true }));
    const res = await toggleWishlist(product._id);
    if (res.success) {
      notify.success(res.wishlisted ? 'تمت الإضافة للمفضلة ❤️' : 'تمت الإزالة من المفضلة');
    }
    setWishlistLoading(prev => ({ ...prev, [product._id]: false }));
  };

  const detailPath = (product) =>
    isPortal ? `/portal/products/${product._id}` : `/store/products/${product._id}`;

  const handleBuyNow = (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock?.quantity === 0) {
      notify.error('المنتج غير متوفر حالياً');
      return;
    }

    if (product.hasVariants) {
      notify.info('اختر المواصفات أولاً لإتمام الشراء');
      navigate(detailPath(product));
      return;
    }

    const buyNowItem = createBuyNowItem(product);
    if (!buyNowItem) {
      notify.error('تعذر بدء الشراء الآن');
      return;
    }

    navigate(storefrontPath('/checkout'), {
      state: { buyNowItem },
    });
  };

  const handleSuggestionSelect = (product) => {
    setSearchFocused(false);
    navigate(detailPath(product));
  };

  const handleCategorySuggestion = (categoryId) => {
    setSearchFocused(false);
    navigate(`${isPortal ? '/portal/products' : storefrontPath('/products')}?category=${encodeURIComponent(categoryId)}`);
  };

  return (
    <div className={`space-y-4 pb-20 ${isPortal ? '' : ''}`} dir={isPortal ? 'rtl' : undefined}>

      {/* ═══ PORTAL HEADER ═══ */}
      {isPortal ? (
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">🛍️ المنتجات</h2>
          <p className="text-sm text-gray-400">
            {filteredProducts.length} منتج متاح • {categories.length} قسم
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-black mb-2">جميع المنتجات</h1>
          <p className="text-gray-500">تصفح مجموعتنا الكاملة من المنتجات</p>
        </div>
      )}

      {/* ═══ SEARCH BAR ═══ */}
      {!isPortal && (
        <div className="rounded-3xl border border-primary-100 bg-white dark:bg-gray-900 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                شراء كضيف
              </div>
              <p className="mt-3 text-lg font-black text-gray-900 dark:text-white">أضف منتجاتك مباشرة من هنا وأكمل الطلب بدون تسجيل دخول.</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">كل منتج تضيفه يذهب للسلة فورًا، ويمكنك مراجعة الطلب أو المتابعة لاحقًا.</p>
            </div>
            <button
              onClick={() => navigate(storefrontPath('/cart'))}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-colors"
            >
              مراجعة السلة
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{cartCount}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div ref={searchPanelRef} className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            value={search}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchFocused(true);
            }}
            className="w-full pr-11 pl-10 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-primary-500 focus:outline-none transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchFocused(true); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          {searchFocused && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/5 dark:border-gray-700 dark:bg-gray-800">
              {searchSuggestions.products.length > 0 ? (
                <div className="border-b border-gray-100 px-2 py-2 dark:border-gray-700">
                  {searchSuggestions.products.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => handleSuggestionSelect(product)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                        {pickProductImage(product) ? (
                          <img src={pickProductImage(product)} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="m-auto mt-2.5 h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          {typeof product.category === 'object' ? product.category?.name : (product.categoryName || product.category || 'منتج')}
                        </p>
                      </div>
                      <span className="text-xs font-black text-primary-600">{product.price?.toLocaleString()} ج.م</span>
                    </button>
                  ))}
                </div>
              ) : search.trim() ? (
                <div className="px-4 py-4 text-center text-sm text-gray-400">لا توجد نتائج قريبة، جرّب اسمًا أقصر أو SKU.</div>
              ) : (
                <div className="px-4 py-3 text-xs font-bold text-gray-400">ابدأ بالكتابة أو اختر قسمًا شائعًا.</div>
              )}

              {searchSuggestions.categories.length > 0 && (
                <div className="px-4 py-3 text-right">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">اقتراحات سريعة</p>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.categories.map((category) => (
                      <button
                        key={category.id || category.name}
                        onClick={() => handleCategorySuggestion(category.id)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm font-bold transition-all ${showFilters ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {isPortal ? '' : 'فلتر'}
        </button>
      </div>

      {/* ═══ CATEGORIES SCROLL ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${!selectedCategory ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
        >
          الكل
        </button>
        {categories.map(cat => {
          const catId = typeof cat === 'object' ? cat._id : cat;
          const catName = typeof cat === 'object' ? cat.name : cat;
          const catIcon = typeof cat === 'object' ? cat.icon : null;
          return (
            <button
              key={catId || catName}
              onClick={() => setSelectedCategory(selectedCategory === catId ? '' : catId)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedCategory === catId ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
            >
              {catIcon && <span className="mr-1">{catIcon}</span>}{catName}
            </button>
          );
        })}
      </div>

      {/* ═══ PRICE FILTER (collapsible) ═══ */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">نطاق السعر</p>
          <div className="flex flex-wrap gap-2">
            {priceRanges.map(r => (
              <button
                key={r.value}
                onClick={() => setPriceRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${priceRange === r.value ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RESULTS COUNT ═══ */}
      <p className="text-xs text-gray-400">
        عرض <span className="font-bold text-gray-700 dark:text-gray-300">{filteredProducts.length}</span> من {products.length} منتج
      </p>

      {/* ═══ PRODUCTS GRID ═══ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-500 dark:text-gray-400">لا توجد منتجات</p>
          <p className="text-sm text-gray-400 mt-1">جرب تغيير معايير البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product, index) => {
            const inWishlist = wishlistIds?.includes(product._id);
            const isAdding = addingId === product._id;
            const loadingHeart = wishlistLoading[product._id];
            const outOfStock = product.stock?.quantity === 0;
            const imageUrl = pickProductImage(product);
            const discount = product.compareAtPrice && product.compareAtPrice > product.price
              ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : null;

            return (
              <div
                key={product._id}
                className="bg-white dark:bg-gray-800/90 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 cursor-pointer group"
                style={{
                  opacity: 0,
                  animation: `fadeSlideUp 0.4s ease forwards ${index * 55}ms`,
                  transition: 'transform 0.15s ease, box-shadow 0.3s ease',
                }}
                onClick={() => navigate(detailPath(product))}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
                  const y = ((e.clientY - r.top) / r.height - 0.5) * -14;
                  e.currentTarget.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) scale(1.025)`;
                }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)'; }}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-300" /></div>
                  )}

                  {/* Discount badge */}
                  {discount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                      -{discount}%
                    </span>
                  )}

                  {/* Out of stock */}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-white text-gray-800 text-xs px-3 py-1 rounded-full font-black">نفذت الكمية</span>
                    </div>
                  )}

                  {/* Category badge */}
                  {product.category && (
                    <span className="absolute top-2 left-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {typeof product.category === 'object' ? product.category.name : product.category}
                    </span>
                  )}

                  {/* ❤ Wishlist (portal + storefront guests) */}
                  <button
                    onClick={(e) => handleWishlist(e, product)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  >
                    {loadingHeart ? (
                      <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <Heart className={`w-4 h-4 transition-colors ${inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                    )}
                  </button>

                  {/* 🛒 Add to cart floating button */}
                  {!outOfStock && (
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:bg-primary-600 hover:scale-110 active:scale-95 translate-y-10 group-hover:translate-y-0 duration-300"
                    >
                      {isAdding ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1">
                    {product.name}
                  </h3>

                  {/* Star Ratings display */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(product.avgRating || 0) ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`} />
                      ))}
                    </div>
                    {product.reviewCount > 0 && (
                      <span className="text-[10px] text-gray-400 font-medium">({product.reviewCount})</span>
                    )}
                  </div>

                  {/* Price row */}
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-lg font-black text-primary-600 leading-none">
                        {product.price.toLocaleString()}
                        <span className="text-xs text-gray-400 font-normal mr-0.5">ج.م</span>
                      </p>
                      {product.stock?.quantity > 0 && product.stock?.quantity <= 5 && (
                        <p className="text-[10px] text-orange-500 font-bold mt-0.5 flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse inline-block" />
                          آخر {product.stock.quantity} قطعة!
                        </p>
                      )}
                    </div>
                    {product.stock?.quantity > 5 && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">متوفر</span>
                    )}
                  </div>

                  {!isPortal && !product.hasVariants && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {STOREFRONT_VOLUME_OFFER_TIERS.map((tier) => (
                        <span key={tier.minQuantity} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                          {tier.shortLabel} عند {tier.minQuantity}+
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add to cart row (always visible button below price) */}
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={outOfStock}
                    className={`w-full mt-2.5 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${outOfStock ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/20'}`}
                  >
                    {outOfStock ? (
                      'نفذت الكمية'
                    ) : isAdding ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {product.hasVariants ? 'اختر المواصفات' : 'أضف للسلة'}
                      </>
                    )}
                  </button>

                  {!isPortal && !outOfStock && (
                    <button
                      onClick={(e) => handleBuyNow(e, product)}
                      className="w-full mt-2 h-9 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:border-primary-300 hover:text-primary-600 transition-colors"
                    >
                      اشترِ الآن
                    </button>
                  )}

                  {false && isPortal && (
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={outOfStock}
                      className="w-full mt-2.5 h-10 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 shadow-sm shadow-primary-500/20"
                    >
                      {outOfStock ? (
                        'نفذت الكمية'
                      ) : isAdding ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><ShoppingCart className="w-3.5 h-3.5" />أضف للسلة</>
                      )}
                    </button>
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
