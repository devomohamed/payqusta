import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, TrendingUp, Star, ArrowRight, ShieldCheck,
  Truck, RotateCcw, CreditCard, Tag, Sparkles, ChevronLeft, ChevronRight, Loader2, Wallet, Gift,
  MessageCircle, Bell, Package, FileText
} from 'lucide-react';
import { api } from '../store';
import { Card, LoadingSpinner, Badge, Button } from '../components/UI';
import { storefrontPath } from '../utils/storefrontHost';
import { usePortalStore } from '../store/portalStore';
import { pickProductImage } from '../utils/media';

export default function StorefrontHome() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [pointsSummary, setPointsSummary] = useState(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addressesCount, setAddressesCount] = useState(0);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [wishlistLoaded, setWishlistLoaded] = useState(false);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const {


    customer,
    fetchDashboard,
    fetchUnreadCount,
    unreadCount,
    fetchPoints,
    fetchDocuments,
    fetchWishlist,
    fetchAddresses,
    notificationStreamStatus,
  } = usePortalStore();
  const heroHighlights = [
    {
      key: 'installments',
      title: 'متابعة الأقساط',
      desc: 'اقرأ مواعيد السداد، رسائل التذكير، والفواتير النشطة في واجهة واحدة متصلة بالبوابة.',
      icon: CreditCard,
    },
    {
      key: 'points',
      title: 'نقاط وامتيازات',
      desc: 'تحكم بنقاط الولاء، تابع التير واطلب مكافآت يومية مباشرة من المتجر.',
      icon: Gift,
    },
    {
      key: 'support',
      title: 'دعم مباشر',
      desc: 'تواصل مع الدفع والدعم عبر الدردشة أو التذاكر دون مغادرة متجر العملاء.',
      icon: MessageCircle,
    },
    {
      key: 'security',
      title: 'أمان وموثوقية',
      desc: 'توثيق JWT، سجلات تدقيق، وتبليغ فوري عن التنبيهات من البوابة.',
      icon: ShieldCheck,
    },
    {
      key: 'notifications',
      title: 'تنبيهات لحظية',
      desc: 'يصلـك كل إشعار من البوابة في المتجر قبل أن تتخطى فواتيرك.',
      icon: Bell,
    },
  ];
  const quickActions = [
    {
      key: 'orders',
      title: 'الطلبات',
      desc: 'راجع حالة الشحن، الدفع، والتسليم لجميع الطلبات الحديثة.',
      path: '/portal/orders',
      icon: Package,
      gradient: 'from-blue-500/90 to-blue-600/80',
    },
    {
      key: 'invoices',
      title: 'الفواتير',
      desc: 'ادفع الفواتير المتأخرة أو اطلع على أقساطك القادمة.',
      path: '/portal/invoices',
      icon: FileText,
      gradient: 'from-purple-500/90 to-purple-600/80',
    },
    {
      key: 'returns',
      title: 'المرتجعات',
      desc: 'تتبع الطلبات المعادة واطلب الاستبدال أو الاسترجاع بسهولة.',
      path: '/portal/returns',
      icon: RotateCcw,
      gradient: 'from-orange-400/90 to-orange-500/80',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, arrivalsRes, settingsRes] = await Promise.all([
        api.get('/products?limit=8&isActive=true&sort=-sales'), // Best sellers
        api.get('/products?limit=8&isActive=true&sort=-createdAt'), // New arrivals
        api.get('/settings')
      ]);
      setFeaturedProducts(productsRes.data.data || []);
      setNewArrivals(arrivalsRes.data.data || []);
      setSettings(settingsRes.data.data);

      if (settingsRes.data.data?.tenant?.settings?.categories) {
        setCategories(settingsRes.data.data.tenant.settings.categories.filter(c => c.isVisible));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!fetchDashboard) return;
    try {
      const data = await fetchDashboard();
      if (data) setDashboardData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotificationCount = async () => {
    if (!fetchUnreadCount) return;
    setNotificationLoading(true);
    try {
      await fetchUnreadCount();
    } finally {
      setNotificationLoading(false);
    }
  };

  const loadPoints = async () => {
    if (!fetchPoints) return;
    try {
      const summary = await fetchPoints();
      if (summary) {
        setPointsSummary(summary);
      }
    } catch (err) {
      console.error('Failed to load points', err);
    }
  };

  const loadDocumentsSummary = async () => {
    if (!fetchDocuments) {
      setDocumentsCount(0);
      setDocumentsLoaded(true);
      return;
    }
    setDocumentsLoaded(false);
    try {
      const docs = await fetchDocuments();
      setDocumentsCount(Array.isArray(docs) ? docs.length : 0);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
    setDocumentsLoaded(true);
  };

  const loadWishlistSummary = async () => {
    if (!fetchWishlist) {
      setWishlistCount(0);
      setWishlistLoaded(true);
      return;
    }
    setWishlistLoaded(false);
    try {
      const items = await fetchWishlist();
      setWishlistCount(Array.isArray(items) ? items.length : 0);
    } catch (err) {
      console.error('Failed to load wishlist', err);
    }
    setWishlistLoaded(true);
  };

  const loadAddressesSummary = async () => {
    if (!fetchAddresses) {
      setAddressesCount(0);
      setAddressesLoaded(true);
      return;
    }
    setAddressesLoaded(false);
    try {
      const list = await fetchAddresses();
      setAddressesCount(Array.isArray(list) ? list.length : 0);
    } catch (err) {
      console.error('Failed to load addresses', err);
    }
    setAddressesLoaded(true);
  };

  useEffect(() => {
    if (customer) {
      loadDashboard();
      loadNotificationCount();
      loadPoints();
      loadDocumentsSummary();
      loadWishlistSummary();
      loadAddressesSummary();
    }
  }, [customer]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-16 pb-12">
      {/* Premium Hero Section */}
      <section className="relative h-[500px] md:h-[600px] flex items-center overflow-hidden rounded-[2.5rem] bg-indigo-900 group">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-900/40 to-transparent z-10" />
          <img
            src="/hero-banner.png"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-gradient-to-br', 'from-indigo-600', 'to-violet-700');
            }}
          />
        </div>

        <div className="relative z-20 px-8 md:px-16 max-w-2xl text-white animate-fade-in">
          <Badge variant="primary" className="mb-6 bg-white/20 text-white backdrop-blur-md border border-white/10 px-4 py-1.5 text-sm">
            🔥 عرض لفترة محدودة
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight drop-shadow-xl">
            اطلب الآن من <span className="text-indigo-400">{settings?.tenant?.name || 'متجرنا'}</span> واحصل على أفضل العروض
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-10 leading-relaxed font-medium">
            جودة عالمية، أسعار تنافسية، وتجربة شراء لا تُنسى. أكثر من 1000 منتج بانتظارك.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to={storefrontPath('/products')}>
              <Button size="lg" className="px-10 py-4 shadow-2xl">
                تصفح المنتجات الآن
                <ArrowRight className="w-6 h-6 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Hero Highlights (portal capabilities) */}
      <section dir="rtl" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 px-2">
        {heroHighlights.map((highlight) => (
          <Card
            key={highlight.key}
            className="p-6 shadow-2xl bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/90 to-primary-700/60 text-white flex items-center justify-center shadow-lg">
                  <highlight.icon className="w-6 h-6" />
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                    {highlight.key === 'points' && pointsSummary?.tier
                      ? `فئة ${pointsSummary.tier.toUpperCase()}`
                      : highlight.title}
                  </p>
                  {highlight.key === 'points' && typeof pointsSummary?.points === 'number' && (
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {pointsSummary.points.toLocaleString()} نقطة
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">
                    {highlight.desc}
                  </p>
                </div>
              </div>
            </div>
            {highlight.key === 'notifications' && (
              <div className="flex items-center justify-between gap-3 mt-4 text-sm font-bold text-gray-700 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  {notificationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  ) : (
                    <span>{unreadCount ?? 0} إشعار جديد</span>
                  )}
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">من البوابة</span>
                </div>
                <Link to={storefrontPath('/portal/notifications')} className="text-primary-500 underline">
                  عرض الإشعارات
                </Link>
              </div>
            )}
            {highlight.key === 'notifications' && notificationStreamStatus === 'error' && (
              <p className="mt-2 text-[11px] font-semibold text-red-500">
                تعذر الاتصال بالإشعارات المباشرة، نعيد المحاولة تلقائياً.
              </p>
            )}
          </Card>
        ))}
      </section>

      <section className="px-4">
        <div className="bg-white/90 dark:bg-gray-900/80 border border-primary-200/40 dark:border-primary-700/50 shadow-xl rounded-3xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Bell className="w-6 h-6 text-primary-500" />
            <div className="text-right space-y-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">تابع إشعارات البوابة</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {notificationLoading ? 'جارٍ مزامنة الإشعارات...' : `${unreadCount ?? 0} إشعار جديد`}.
                {dashboardData?.notifications?.lastRead ? ` أحدث: ${new Date(dashboardData.notifications.lastRead).toLocaleString('ar-EG')}` : ''}
              </p>
            </div>
          </div>
          <Link
            to={storefrontPath('/portal/notifications')}
            className="text-sm font-bold text-primary-600 hover:text-primary-500 transition-colors"
          >
            افتح الإشعارات
          </Link>
        </div>
      </section>

      <section dir="rtl" className="px-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 dark:text-white">روابط سريعة</h3>
          <Link to={storefrontPath('/portal/orders')} className="text-sm font-bold text-primary-600">
            فتح البوابة
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.key}
              to={storefrontPath(action.path)}
              className="group"
            >
              <Card className="h-full border-0 shadow-xl rounded-3xl overflow-hidden">
                <div className={`h-40 bg-gradient-to-br ${action.gradient} rounded-3xl flex items-start justify-between p-5`}>
                  <action.icon className="w-10 h-10 text-white" />
                  <div className="text-sm font-bold text-white text-right">
                    عرض
                  </div>
                </div>
                <div className="p-5 text-right">
                  <h4 className="text-xl font-black text-gray-900 dark:text-white">{action.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{action.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust Badges - Improved Commerce Feel */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 text-right" dir="rtl">
        {[
          { icon: Truck, title: 'توصيل سريع', desc: 'خلال 24-48 ساعة', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: ShieldCheck, title: 'دفع آمن 100%', desc: 'تشفير كامل للبيانات', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: RotateCcw, title: 'إرجاع سهل', desc: 'سياسة إرجاع خلال 14 يوم', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { icon: Tag, title: 'أفضل الأسعار', desc: 'أسعار تنافسية وحصرية', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((feat, i) => (
          <div key={i} className="flex flex-col items-center text-center p-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 ${feat.bg} dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4`}>
              <feat.icon className={`w-7 h-7 ${feat.color}`} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{feat.title}</h3>
            <p className="text-xs text-gray-500 font-medium">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* Category Navigation */}
      {categories.length > 0 && (
        <section dir="rtl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-amber-500" />
              تصفح بالأقسام
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {categories.map((cat, i) => (
              <Link
                key={cat._id ?? cat.slug ?? i}
                to={storefrontPath(`/products?category=${cat.name}`)}
                className="flex-shrink-0 group"
              >
                <div className="w-32 h-32 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-3 group-hover:border-primary-500 group-hover:shadow-lg transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {customer && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_bottom,_rgba(99,102,241,0.3),transparent_60%)]" />
            <div className="relative z-10 flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm tracking-wide">القوة الشرائية</h3>
                <p className="text-xs text-gray-300">رصيد ائتمان قابل للاستخدام</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-800/40 px-3 py-1 rounded-full">
                  PayQusta Pay
                </span>
              </div>
            </div>
            <h2 className="text-4xl font-black mb-2">
              {(dashboardData?.wallet?.availableCredit ?? customer.balance ?? 0).toLocaleString()} {dashboardData?.wallet?.currency === 'EGP' ? 'ج.م' : dashboardData?.wallet?.currency}
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              {`الحد الكلي ${(dashboardData?.wallet?.creditLimit ?? customer?.creditLimit ?? 0).toLocaleString()} ج.م • المستخدم ${(dashboardData?.wallet?.usedCredit ?? customer?.outstanding ?? 0).toLocaleString()} ج.م`}
            </p>
            <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden mb-1 border border-gray-700">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((dashboardData?.wallet?.availableCredit ?? customer.balance ?? 0) / Math.max(1, dashboardData?.wallet?.creditLimit ?? customer?.creditLimit ?? 1)) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500">نسبة المتابعة مقابل الحد</p>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-6 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">نقاط الولاء</h3>
                <p className="text-xs text-gray-500">ترقي إلى مستوى أعلى واستمتع بمكافآت يومية</p>
              </div>
              <Gift className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="text-4xl font-black text-gray-900 dark:text-white mb-3">
              {(dashboardData?.profile?.points ?? customer.points ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-3">
              <span>المستوى الحالي: {(dashboardData?.profile?.tier || customer?.tier || 'classic').toUpperCase()}</span>
              <span className="text-yellow-500">•</span>
              <span>
                {Math.max(0, 1000 - (dashboardData?.profile?.points ?? customer.points ?? 0))} نقطة للترقية
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((dashboardData?.profile?.points ?? customer.points ?? 0) / 1000) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400">نقاط تُستعمل لمكافآت وتقسيط أسرع</p>
          </Card>
        </section>
      )}

      {/* Best Sellers Section */}
      <section dir="rtl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">الأكثر مبيعاً</h2>
            <p className="text-gray-500 font-medium">المنتجات التي يفضلها عملاؤنا حالياً</p>
          </div>
          <Link to={storefrontPath('/products')} className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2">
            عرض الكل
            <ChevronLeft className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.length > 0 ? featuredProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          )) : (
            <div className="col-span-full py-20 text-center text-gray-400">لا يوجد منتجات حالياً</div>
          )}
        </div>
      </section>

      {customer && (
        <section dir="rtl" className="px-4 py-10 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">مركز حسابي</h3>
            <Link to={storefrontPath('/portal/profile')} className="text-sm font-bold text-primary-600">
              إدارة الحساب
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-xl transition-shadow text-right">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">الوثائق المرفوعة</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {documentsLoaded
                      ? documentsCount > 0
                        ? documentsCount
                        : 'لا توجد وثائق'
                      : 'جارٍ التحميل...'}
                  </p>
                </div>
                <Link to={storefrontPath('/portal/documents')} className="text-sm text-primary-600 font-bold">
                  عرض الوثائق
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                رفع جوازات، بطاقات هوية، أو مستندات الدعم التي يحتاجها حسابك.
              </p>
            </Card>
            <Card className="p-6 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-xl transition-shadow text-right">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">قائمة المفضلة</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {wishlistLoaded
                      ? wishlistCount > 0
                        ? wishlistCount
                        : 'لا توجد مفضلات'
                      : 'جارٍ التحميل...'}
                  </p>
                </div>
                <Link to={storefrontPath('/portal/wishlist')} className="text-sm text-primary-600 font-bold">
                  فتح المفضلة
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                تابع المنتجات التي سجلتها للطلب لاحقاً واحصل على تنبيهات خاصة.
              </p>
            </Card>
            <Card className="p-6 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-xl transition-shadow text-right">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">عناوين التسليم</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {addressesLoaded
                      ? addressesCount > 0
                        ? addressesCount
                        : 'لا توجد عناوين'
                      : 'جارٍ التحميل...'}
                  </p>
                </div>
                <Link to={storefrontPath('/portal/addresses')} className="text-sm text-primary-600 font-bold">
                  تعديل العناوين
                </Link>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                أضف أو عدّل العناوين وسهّل توصيل الطلبات القادمة.
              </p>
            </Card>
          </div>
        </section>
      )}

      {/* Loyalty Points Promo Banner (unauthenticated guests only) */}
      {!customer && (
        <section dir="rtl" className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-right space-y-3 flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 px-4 py-1.5 rounded-full text-sm font-bold mb-2">
                <Gift className="w-4 h-4" /> نظام المكافآت
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">أنشئ حساباً الآن واحصل على <span className="text-yellow-300">100 نقطة</span> مجاناً!</h2>
              <p className="text-white/80 text-base font-medium">اكسب نقاطاً مع كل عملية شراء، واستبدلها بخصومات وهدايا حصرية.</p>
            </div>
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <Link to={storefrontPath('/portal/register')} className="bg-white text-violet-700 font-black px-8 py-4 rounded-2xl text-lg shadow-xl hover:bg-yellow-300 hover:text-violet-800 transition-all hover:-translate-y-0.5">
                ابدأ مجاناً الآن
              </Link>
              <p className="text-white/60 text-xs">التسجيل مجاني بالكامل</p>
            </div>
          </div>
        </section>
      )}

      {/* Promotional Banner */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2.5rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden relative" dir="rtl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="flex-1 text-right">
          <Badge variant="warning" className="bg-white/20 text-white mb-4 border border-white/20">توفير كبير</Badge>
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">اشترك في القائمة البريدية واحصل على خصم 10%</h2>
          <p className="text-lg opacity-90 font-medium">كن أول من يعرف عن الخصومات والمنتجات الجديدة</p>
        </div>
        <div className="flex-1 w-full max-w-md">
          <div className="flex gap-2">
            <input type="email" placeholder="بريدك الإلكتروني" className="flex-1 px-6 py-4 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md text-white placeholder-white/70 focus:outline-none focus:ring-2 ring-white text-right" />
            <Button variant="ghost" className="bg-white text-orange-600 px-8">اشترك</Button>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section dir="rtl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">وصل حديثاً</h2>
            <p className="text-gray-500 font-medium">أحدث المنتجات في متجرنا</p>
          </div>
          <Link to={storefrontPath('/products?sort=-createdAt')} className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2">
            عرض الكل
            <ChevronLeft className="w-4 h-4 ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.length > 0 ? newArrivals.map(product => (
            <ProductCard key={product._id} product={product} />
          )) : (
            <div className="col-span-full py-20 text-center text-gray-400">لا يوجد منتجات حالياً</div>
          )}
        </div>
      </section>
      <Link
        to={storefrontPath('/portal/support')}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-primary-600 text-white px-4 py-3 rounded-full shadow-2xl hover:bg-primary-500 transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-bold text-sm">الدعم المباشر</span>
      </Link>
    </div>
  );
}

function ProductCard({ product }) {
  const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : null;

  return (
    <Link to={storefrontPath(`/products/${product._id}`)} className="group block h-full">
      <Card className="h-full group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-300 overflow-hidden relative border-transparent hover:border-primary-500/20 flex flex-col">
        {/* Badges */}
        <div className="absolute top-3 right-3 left-3 flex justify-between items-start z-10 pointer-events-none">
          {discount && (
            <Badge variant="danger" className="font-black px-3 py-1 text-sm shadow-lg pointer-events-auto">-{discount}%</Badge>
          )}
          {product.isNew && !discount && (
            <Badge variant="success" className="font-black px-3 py-1 shadow-lg pointer-events-auto">جديد</Badge>
          )}
          <button className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-2 rounded-full shadow-md text-gray-400 hover:text-red-500 hover:scale-110 transition-all pointer-events-auto mr-auto">
            <Star className="w-4 h-4" />
          </button>
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
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
            <Button className="w-full shadow-xl" size="md">
              <ShoppingBag className="w-4 h-4 ml-2" />
              أضف للسلة
            </Button>
          </div>

          {product.stock?.quantity === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
              <span className="bg-white text-black font-black px-6 py-2 rounded-full text-sm uppercase tracking-wider">نفذت الكمية</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-5 flex-1 flex flex-col text-right" dir="rtl">
          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-current' : ''}`} />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">(4.0)</span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
            {product.name}
          </h3>

          <div className="flex flex-col mt-auto">
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through mb-0.5">{product.originalPrice.toFixed(2)} ج.م</span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-600">{product.price.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">ج.م</span>
            </div>
          </div>

          {/* Trust Signal for Card */}
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2 opacity-60">
            <Truck className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">توصيل غداً</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
