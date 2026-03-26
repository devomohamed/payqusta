
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, ChevronLeft, Star, Quote, Heart, RotateCcw,
  Truck, ShieldCheck, Tag, Info, Bell, FileText, ArrowLeft, ArrowUpRight, CheckCircle2,
  Sparkles, Zap, Award, ShoppingBag, Clock, Loader2, CreditCard,
  MapPin, ChevronRight, File, User, Wallet, Gift, MessageCircle, PhoneCall, ArrowRight
} from 'lucide-react';
import { Card, LoadingSpinner, Badge, Button } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { storefrontPath } from '../utils/storefrontHost';
import { useCommerceStore } from '../store/commerceStore';
import { usePortalStore } from '../store/portalStore';
import { pickProductImage } from '../utils/media';
import { createBuyNowItem } from './buyNowItem';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import {
  loadStorefrontProducts,
  loadStorefrontSettings,
} from './storefrontDataClient';
import {
  buildStorefrontCategorySections,
} from './storefrontShowcase';

function buildUniqueProductList(...productLists) {
  const seen = new Set();

  return productLists
    .flat()
    .filter((product) => {
      if (!product?._id || seen.has(product._id)) return false;
      seen.add(product._id);
      return true;
    });
}

function getStorefrontRatingSnapshot(products) {
  const metrics = products.reduce((summary, product) => {
    const reviewCount = Number(product?.reviewCount) || 0;
    const avgRating = Number(product?.avgRating) || 0;

    if (reviewCount <= 0 || avgRating <= 0) return summary;

    return {
      reviewCount: summary.reviewCount + reviewCount,
      weightedRating: summary.weightedRating + (avgRating * reviewCount),
    };
  }, { reviewCount: 0, weightedRating: 0 });

  return {
    reviewCount: metrics.reviewCount,
    avgRating: metrics.reviewCount > 0 ? (metrics.weightedRating / metrics.reviewCount) : 0,
  };
}

const initialCustomerZone = {
  ordersCount: 0,
  invoicesCount: 0,
  returnsCount: 0,
  wishlistCount: 0,
  documentsCount: 0,
  addressesCount: 0,
  supportOpenCount: 0,
  dueInvoicesCount: 0,
  latestNotification: null,
};

export default function StorefrontHome() {
  const { t } = useTranslation('admin');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [customerZone, setCustomerZone] = useState(initialCustomerZone);
  const [customerZoneLoading, setCustomerZoneLoading] = useState(false);
  const storefrontCategories = usePortalStore((state) => state.categories);
  const customer = usePortalStore((state) => state.customer);
  const isAuthenticated = usePortalStore((state) => state.isAuthenticated);
  const unreadCount = usePortalStore((state) => state.unreadCount);
  const fetchDashboard = usePortalStore((state) => state.fetchDashboard);
  const fetchUnreadCount = usePortalStore((state) => state.fetchUnreadCount);
  const fetchNotifications = usePortalStore((state) => state.fetchNotifications);
  const fetchOrders = usePortalStore((state) => state.fetchOrders);
  const fetchInvoices = usePortalStore((state) => state.fetchInvoices);
  const fetchReturnRequests = usePortalStore((state) => state.fetchReturnRequests);
  const fetchWishlist = usePortalStore((state) => state.fetchWishlist);
  const fetchDocuments = usePortalStore((state) => state.fetchDocuments);
  const fetchAddresses = usePortalStore((state) => state.fetchAddresses);
  const fetchSupportMessages = usePortalStore((state) => state.fetchSupportMessages);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomerZone(initialCustomerZone);
      return;
    }

    loadCustomerZone();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, arrivalsRes, settingsRes] = await Promise.all([
        loadStorefrontProducts({ limit: 8, isActive: true, sort: '-sales' }, { ttlMs: 12000 }), // Best sellers
        loadStorefrontProducts({ limit: 8, isActive: true, sort: '-createdAt' }, { ttlMs: 12000 }), // New arrivals
        loadStorefrontSettings()
      ]);
      setFeaturedProducts(productsRes.data.data || []);
      setNewArrivals(arrivalsRes.data.data || []);
      setSettings(settingsRes.data.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerZone = async () => {
    setCustomerZoneLoading(true);
    try {
      const [
        notificationsData,
        ordersData,
        invoicesData,
        returnsData,
        wishlistData,
        documentsData,
        addressesData,
        supportData,
      ] = await Promise.all([
        fetchNotifications(1),
        fetchOrders(1, 'all'),
        fetchInvoices(1, 'all'),
        fetchReturnRequests(),
        fetchWishlist(),
        fetchDocuments(),
        fetchAddresses(),
        fetchSupportMessages(),
        fetchDashboard(),
        fetchUnreadCount(),
      ]);

      const notifications = notificationsData?.notifications || [];
      const orders = ordersData?.orders || [];
      const invoices = invoicesData?.invoices || [];
      const returns = Array.isArray(returnsData) ? returnsData : [];
      const wishlist = Array.isArray(wishlistData) ? wishlistData : [];
      const documents = Array.isArray(documentsData) ? documentsData : [];
      const addresses = Array.isArray(addressesData) ? addressesData : [];
      const supportTickets = Array.isArray(supportData) ? supportData : [];

      setCustomerZone({
        ordersCount: ordersData?.total || orders.length,
        invoicesCount: invoicesData?.total || invoices.length,
        returnsCount: returns.length,
        wishlistCount: wishlist.length,
        documentsCount: documents.length,
        addressesCount: addresses.length,
        supportOpenCount: supportTickets.filter((ticket) => ticket?.status !== 'closed').length,
        dueInvoicesCount: invoices.filter((invoice) => Number(invoice?.remainingAmount || 0) > 0).length,
        latestNotification: notifications[0] || null,
      });
    } catch (err) {
      console.error('Failed to load storefront customer zone:', err);
    } finally {
      setCustomerZoneLoading(false);
    }
  };


  if (loading) return <LoadingSpinner />;

  const categorySections = buildStorefrontCategorySections(storefrontCategories);
  const featuredCollection = featuredProducts;
  const arrivalsCollection = newArrivals;
  const isUsingShowcaseFallback = false;
  const showcasedProducts = buildUniqueProductList(featuredCollection, arrivalsCollection);
  const showcasedProductsCount = showcasedProducts.length;
  const showcasedInStockCount = showcasedProducts.filter((product) => (product?.stock?.quantity ?? 0) > 0).length;
  const storefrontRatingSnapshot = getStorefrontRatingSnapshot(showcasedProducts);
  const customerQuickLinks = [
    {
      key: 'orders',
      label: t('storefront_home.ui.k2qq2gk'),
      detail: `${customerZone.ordersCount.toLocaleString()} طلب`,
      icon: Package,
      href: '/portal/orders',
      tone: 'from-blue-500/15 via-white to-white',
      iconTone: 'bg-blue-100 text-blue-600',
    },
    {
      key: 'invoices',
      label: t('storefront_home.ui.k7dw1on'),
      detail: customerZone.dueInvoicesCount > 0 ? `${customerZone.dueInvoicesCount.toLocaleString()} تحتاج متابعة` : `${customerZone.invoicesCount.toLocaleString()} فاتورة`,
      icon: FileText,
      href: '/portal/invoices',
      tone: 'from-indigo-500/15 via-white to-white',
      iconTone: 'bg-indigo-100 text-indigo-600',
    },
    {
      key: 'returns',
      label: t('storefront_home.ui.kq51opb'),
      detail: customerZone.returnsCount > 0 ? `${customerZone.returnsCount.toLocaleString()} طلب مرتجع` : t('storefront_home.ui.k5dir2k'),
      icon: RotateCcw,
      href: '/portal/returns',
      tone: 'from-orange-500/15 via-white to-white',
      iconTone: 'bg-orange-100 text-orange-600',
    },
    {
      key: 'support',
      label: t('storefront_home.ui.kovduny'),
      detail: customerZone.supportOpenCount > 0 ? `${customerZone.supportOpenCount.toLocaleString()} محادثة مفتوحة` : t('storefront_home.ui.k8ilhkk'),
      icon: MessageCircle,
      href: '/portal/support',
      tone: 'from-emerald-500/15 via-white to-white',
      iconTone: 'bg-emerald-100 text-emerald-600',
    },
  ];
  const customerAssetCards = [
    {
      key: 'notifications',
      label: t('storefront_home.ui.k31c17e'),
      value: unreadCount.toLocaleString(),
      detail: customerZone.latestNotification?.title || t('storefront_home.toasts.k5r2sph'),
      icon: Bell,
      href: '/portal/dashboard',
      badgeClass: unreadCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600',
    },
    {
      key: 'wishlist',
      label: t('storefront_home.ui.kz9xj32'),
      value: customerZone.wishlistCount.toLocaleString(),
      detail: t('storefront_home.ui.kprsfd4'),
      icon: Heart,
      href: '/portal/wishlist',
      badgeClass: 'bg-rose-100 text-rose-700',
    },
    {
      key: 'documents',
      label: t('storefront_home.ui.kp6i1o5'),
      value: customerZone.documentsCount.toLocaleString(),
      detail: t('storefront_home.ui.k5bqua5'),
      icon: File,
      href: '/portal/documents',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'addresses',
      label: t('storefront_home.ui.kxp8jkp'),
      value: customerZone.addressesCount.toLocaleString(),
      detail: t('storefront_home.ui.k58t58j'),
      icon: MapPin,
      href: '/portal/addresses',
      badgeClass: 'bg-cyan-100 text-cyan-700',
    },
  ];
  const heroTrustSignals = [
    {
      key: 'availability',
      value: showcasedInStockCount > 0 ? showcasedInStockCount.toLocaleString() : '0',
      label: t('storefront_home.ui.kcjjq9l'),
      detail: showcasedProductsCount > 0
        ? `من أصل ${showcasedProductsCount.toLocaleString()} منتجًا ظاهرًا الآن`
        : t('storefront_home.ui.kl8kt2q'),
    },
    {
      key: 'reviews',
      value: storefrontRatingSnapshot.reviewCount > 0 ? `${storefrontRatingSnapshot.avgRating.toFixed(1)} / 5` : t('storefront_home.ui.k3bo9ss'),
      label: t('storefront_home.ui.kyftb58'),
      detail: storefrontRatingSnapshot.reviewCount > 0
        ? `${storefrontRatingSnapshot.reviewCount.toLocaleString()} تقييم على المنتجات المعروضة`
        : t('storefront_home.ui.kwlf76x'),
    },
    {
      key: 'guest-checkout',
      value: t('storefront_home.ui.k8buc5e'),
      label: t('storefront_home.ui.kuse6jo'),
      detail: t('storefront_home.ui.kx90hso'),
    },
  ];
  return (
    <div className="space-y-16 pb-12">
      {/* Premium Hero Section */}
      <section className="group relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 md:px-10 md:py-16" dir="rtl">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950 via-slate-950/85 to-slate-900/55" />
          <img
            src="/hero-banner.png"
            alt="Hero Background"
            className="h-full w-full object-cover opacity-30 transition-transform duration-[8s] group-hover:scale-[1.03]"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-gradient-to-br', 'from-slate-900', 'to-slate-800');
            }}
          />
        </div>

        <div className="relative z-20 mx-auto max-w-4xl text-white">
          <Badge variant="primary" className="border border-white/10 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-md">
            {t('storefront_home.ui.kky6coo')}
          </Badge>
          <h1 className="mt-5 max-w-2xl text-3xl sm:text-4xl md:text-5xl font-black leading-tight">
            اكتشف أحدث منتجات {settings?.store?.name || t('storefront_home.toasts.kaaxfw9')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
            {t('storefront_home.ui.kn1tf0b')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={storefrontPath('/products')}>
              <Button size="lg" className="px-8 py-3 shadow-xl">
                {t('storefront_home.ui.kkvl27p')}
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
            {heroTrustSignals.map((signal) => (
              <div
                key={signal.key}
                className="rounded-2xl border border-white/10 bg-white/10 p-5 text-right text-white backdrop-blur-sm"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-200">{signal.label}</p>
                <p className="mt-2 text-xl font-black">{signal.value}</p>
                <p className="mt-1 text-xs leading-6 text-slate-200/90">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isAuthenticated && customer ? (
        <section dir="rtl">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 bg-gradient-to-l from-slate-950 via-slate-900 to-primary-700 px-6 py-8 text-white md:px-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <Badge variant="primary" className="border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white backdrop-blur">
                    {t('storefront_home.ui.ki0x9gh')}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-black md:text-3xl">
                    {t('storefront_home.ui.knbfgl7')}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200 md:text-base">
                    أهلاً {customer.name || t('storefront_home.toasts.k12xn')}، هذه أهم العناصر المرتبطة بحسابك الآن مع اختصارات مباشرة للطلبات، الفواتير، المرتجعات، والدعم.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-200">{t('storefront_home.ui.k3g0ria')}</p>
                    <p className="mt-2 text-2xl font-black">{Number(customer.balance || 0).toLocaleString()} ج.م</p>
                    <p className="mt-1 text-xs text-slate-200">من حد ائتماني إجمالي {Number(customer.creditLimit || 0).toLocaleString()} ج.م</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-200">{t('storefront_home.ui.k22339j')}</p>
                    <p className="mt-2 text-2xl font-black">{Number(customer.points || 0).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-200">الفئة الحالية: {customer.tier || 'classic'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8 px-6 py-6 md:px-8">
              <div className="grid gap-4 lg:grid-cols-4">
                {customerQuickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      to={item.href}
                      className={`group rounded-[1.75rem] border border-slate-200 bg-gradient-to-br ${item.tone} p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-slate-900">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconTone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-5 inline-flex items-center gap-2 text-xs font-black text-primary-600">
                        {t('storefront_home.ui.kxtya3o')}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-right">
                      <h3 className="text-xl font-black text-slate-900">{t('storefront_home.ui.koathcn')}</h3>
                      <p className="mt-1 text-sm text-slate-500">{t('storefront_home.ui.kf365y8')}</p>
                    </div>
                    {customerZoneLoading ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t('storefront_home.ui.k3bo9ss')}
                      </div>
                    ) : (
                      <Link to="/portal/dashboard" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-primary-600 shadow-sm transition-colors hover:bg-primary-50">
                        {t('storefront_home.ui.krct6kk')}
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {customerAssetCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.key}
                          to={item.href}
                          className="rounded-2xl border border-white bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${item.badgeClass}`}>{item.value}</span>
                            <Icon className="h-4.5 w-4.5 text-slate-400" />
                          </div>
                          <p className="mt-4 text-sm font-black text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-500">{item.detail}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-right">
                      <h3 className="text-xl font-black text-slate-900">{t('storefront_home.ui.kxa9d3s')}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {t('storefront_home.ui.k6dq36z')}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-slate-500">{t('storefront_home.ui.k2ma9p4')}</span>
                      <span className="text-lg font-black text-slate-900">{customerZone.supportOpenCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-slate-500">{t('storefront_home.ui.k6wog0s')}</span>
                      <span className="text-lg font-black text-slate-900">{unreadCount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/portal/support"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
                    >
                      {t('storefront_home.ui.kgo5twl')}
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/portal/support"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                      {t('storefront_home.ui.kg68ls2')}
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Category Navigation */}
      <section dir="rtl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-right">
            <h2 className="flex items-center gap-3 text-3xl font-black text-gray-900 dark:text-white">
              <Sparkles className="w-8 h-8 text-amber-500" />
              {t('storefront_home.ui.kgl2s33')}
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {t('storefront_home.ui.k70bbpz')}
            </p>
          </div>
          {isUsingShowcaseFallback && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
              {t('storefront_home.ui.km2rdw3')}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categorySections.map((category) => (
            <Link
              key={category.id}
              to={storefrontPath(`/products?category=${category.id}`)}
              className="group block"
            >
              <Card className={`h-full rounded-[2rem] border p-6 text-right shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl ${category.border || 'border-gray-100'} bg-gradient-to-br ${category.accent || 'from-gray-100 via-white to-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary-500">
                      {t('storefront_home.ui.ky33o')}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{category.name}</h3>
                    <p className="mt-2 text-xs font-medium leading-6 text-gray-500">
                      {category.children.length > 0
                        ? `يحتوي على ${category.children.length.toLocaleString()} أقسام فرعية واضحة للعرض.`
                        : 'تصفح المنتجات المتاحة داخل هذا القسم بسهولة.'}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-lg backdrop-blur-sm">
                    {category.icon}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {category.children.length > 0 ? category.children.slice(0, 4).map((child) => (
                    <span key={child.id} className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[11px] font-black text-gray-700 shadow-sm">
                      <span>{child.icon}</span>
                      {child.name}
                    </span>
                  )) : (
                    <span className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] font-bold text-gray-500">
                      {t('storefront_home.ui.kic06je')}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>



      {/* Best Sellers Section */}
      <section dir="rtl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('storefront_home.ui.kmhoedv')}</h2>
            <p className="text-gray-500 font-medium">
              {featuredProducts.length > 0 ? t('storefront_home.ui.ktkkjtv') : 'منتجات مختارة لتبدأ التصفح بسرعة'}
            </p>
          </div>
          <Link to={storefrontPath('/products')} className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2">
            {t('storefront_home.ui.kwbgoww')}
            <ChevronLeft className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCollection.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>







      {/* New Arrivals Section */}
      <section dir="rtl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('storefront_home.ui.k74gwcw')}</h2>
            <p className="text-gray-500 font-medium">
              {newArrivals.length > 0 ? t('storefront_home.ui.kkokubj') : 'مختارات جديدة من المتجر'}
            </p>
          </div>
          <Link to={storefrontPath('/products?sort=-createdAt')} className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2">
            {t('storefront_home.ui.kwbgoww')}
            <ChevronLeft className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {arrivalsCollection.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { addToCart } = useCommerceStore((state) => ({
    addToCart: state.addToCart,
  }));
  const [adding, setAdding] = useState(false);
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : null;
  const outOfStock = product.stock?.quantity === 0;
  const isShowcasePlaceholder = Boolean(product.isShowcasePlaceholder);
  const rating = Number(product.avgRating) || 0;
  const reviewCount = Number(product.reviewCount) || 0;
  const productLink = isShowcasePlaceholder
    ? storefrontPath(`/products?category=${product.category?._id || ''}`)
    : storefrontPath(`/products/${product._id}`);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isShowcasePlaceholder) {
      navigate(productLink);
      notify.info(t('storefront_home.toasts.kfypy1h'));
      return;
    }

    if (outOfStock) {
      notify.error(t('storefront_home.toasts.kk8kk8g'));
      return;
    }

    if (product.hasVariants) {
      notify.info(t('storefront_home.toasts.ke5ldsi'));
      navigate(storefrontPath(`/products/${product._id}`));
      return;
    }

    setAdding(true);
    addToCart(product, 1);
    trackStorefrontFunnelEvent('add_to_cart', {
      productId: product._id,
      itemCount: 1,
      cartSize: 1,
      source: 'home_quick_add',
    });
    notify.success(`تمت إضافة "${product.name}" للسلة`);
    window.setTimeout(() => setAdding(false), 500);
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isShowcasePlaceholder) {
      navigate(productLink);
      notify.info(t('storefront_home.toasts.kq36k5p'));
      return;
    }

    if (outOfStock) {
      notify.error(t('storefront_home.toasts.kk8kk8g'));
      return;
    }

    if (product.hasVariants) {
      notify.info(t('storefront_home.toasts.kadyuv5'));
      navigate(storefrontPath(`/products/${product._id}`));
      return;
    }

    const buyNowItem = createBuyNowItem(product);
    if (!buyNowItem) {
      notify.error(t('storefront_home.toasts.kuqj79l'));
      return;
    }

    navigate(storefrontPath('/checkout'), {
      state: { buyNowItem },
    });
  };

  return (
    <Link to={productLink} className="group block h-full">
      <Card className="h-full group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-300 overflow-hidden relative border-transparent hover:border-primary-500/20 flex flex-col">
        {/* Badges */}
        <div className="absolute top-3 right-3 left-3 flex justify-between items-start z-10 pointer-events-none">
          {discount && (
            <Badge variant="danger" className="font-black px-3 py-1 text-sm shadow-lg pointer-events-auto">-{discount}%</Badge>
          )}
          {product.isNew && !discount && !isShowcasePlaceholder && (
            <Badge variant="success" className="font-black px-3 py-1 shadow-lg pointer-events-auto">{t('storefront_home.ui.ksyktk')}</Badge>
          )}
          <span className="hidden">
            {isShowcasePlaceholder ? (product.showcaseLabel || t('storefront_home.toasts.kg184i7')) : outOfStock ? t('storefront_home.ui.k5xt3ii') : 'شراء سريع'}
          </span>
        </div>

        {/* Product Image */}
        <div className="aspect-[4/5] bg-gray-50 dark:bg-gray-800 relative overflow-hidden flex-shrink-0">
          {pickProductImage(product) ? (
            <img
              src={pickProductImage(product)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-20 h-20 text-gray-200" />
            </div>
          )}

          {/* Quick Shop Overlay */}
          <div className="hidden">
            <Button className="w-full shadow-xl" size="md" onClick={handleQuickAdd} loading={adding} disabled={outOfStock && !isShowcasePlaceholder}>
              <ShoppingBag className="w-4 h-4 ml-2" />
              {isShowcasePlaceholder ? t('storefront_home.ui.k3rnbfb') : 'أضف للسلة'}
            </Button>
          </div>

          {outOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
              <span className="bg-white text-black font-black px-6 py-2 rounded-full text-sm uppercase tracking-wider">{t('storefront_home.ui.kuw1l5')}</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-5 flex-1 flex flex-col text-right" dir="rtl">
          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`} />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
              {reviewCount > 0 ? `(${reviewCount})` : 'بدون تقييمات'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors leading-7 min-h-[3.5rem]">
            {product.name}
          </h3>

          <div className="flex flex-col mt-auto">
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through mb-0.5">{product.originalPrice.toFixed(2)} ج.م</span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600">{product.price.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">{t('storefront_home.ui.kwlxf')}</span>
            </div>
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={(outOfStock && !isShowcasePlaceholder) || adding}
            className={`mt-4 w-full h-11 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${(outOfStock && !isShowcasePlaceholder) ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 active:scale-95'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            {isShowcasePlaceholder ? t('storefront_home.ui.k3rnbfb') : product.hasVariants ? t('storefront_home.ui.ka27v6s') : adding ? t('storefront_home.ui.kq77xre') : 'أضف للسلة الآن'}
          </button>

          {false && !outOfStock && !isShowcasePlaceholder && (
            <button
              onClick={handleBuyNow}
              className="mt-2.5 w-full h-10 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:border-primary-300 hover:text-primary-600 transition-all active:scale-95"
            >
              {t('storefront_home.ui.kkjjf1h')}
            </button>
          )}

          {/* Trust Signal for Card */}
          <div className="hidden">
            <Truck className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('storefront_home.ui.kk8rkq0')}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
