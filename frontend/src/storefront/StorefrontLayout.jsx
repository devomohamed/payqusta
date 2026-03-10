import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Package, MessageCircle, PhoneCall, Camera, LayoutDashboard } from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { useAuthStore } from '../store';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationDropdown from '../components/NotificationDropdown';
import BarcodeScanner from '../components/BarcodeScanner';
import { getBackofficeDashboardUrl, storefrontPath } from '../utils/storefrontHost';
import { pickProductImage } from '../utils/media';
import { buildStorefrontSearchSuggestions, rankStorefrontProducts } from './storefrontSearch';
import {
  loadStorefrontProductByBarcode,
  loadStorefrontProducts,
  loadStorefrontSettings,
} from './storefrontDataClient';
import { getStorefrontLandingPagePath } from './storefrontLandingPages';

function mergeUniqueProducts(...lists) {
  const seen = new Set();

  return lists
    .flat()
    .filter((product) => {
      if (!product?._id || seen.has(product._id)) return false;
      seen.add(product._id);
      return true;
    });
}

export default function StorefrontLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Instant search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCatalog, setSearchCatalog] = useState([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);
  const bootstrappedRef = useRef(false);

  const categories = usePortalStore(state => state.categories);
  const fetchCategories = usePortalStore(state => state.fetchCategories);
  const isAuthenticated = usePortalStore(state => state.isAuthenticated);
  const customer = usePortalStore(state => state.customer);
  const cart = usePortalStore(state => state.cart);

  const isAdminAuthenticated = useAuthStore(state => state.isAuthenticated);
  const adminUser = useAuthStore(state => state.user);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const trackOrderPath = storefrontPath('/track-order');
  const seasonalLandingPath = getStorefrontLandingPagePath('seasonal');
  const accountEntryPath = isAuthenticated ? '/portal/dashboard' : '/portal/login';
  const accountEntryLabel = isAuthenticated ? (customer?.name?.split(' ')[0] || 'حسابي') : 'تسجيل الدخول';
  const AccountEntryIcon = User;
  const isProductDetailsPage = /\/products\/[^/]+$/.test(location.pathname);
  const canAccessBackoffice = isAdminAuthenticated && (
    adminUser?.role === 'admin' ||
    adminUser?.isSuperAdmin ||
    adminUser?.email?.toLowerCase() === 'super@payqusta.com'
  );
  const backofficeDashboardUrl = getBackofficeDashboardUrl();
  const showSupportFab = !isProductDetailsPage;

  const directSupportPhone = settings?.store?.phone?.trim() || '';
  const publicSupportHref = directSupportPhone ? `tel:${directSupportPhone}` : storefrontPath('/track-order');
  const storefrontBarcodeSearchEnabled = settings?.settings?.barcode?.storefrontBarcodeSearchEnabled === true;
  const headerSearchSuggestions = buildStorefrontSearchSuggestions({
    products: searchCatalog,
    categories,
    query: searchQuery,
    limit: 6,
  });

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    loadSettings();
    loadSearchCatalog();
    if (fetchCategories) fetchCategories();
  }, [fetchCategories]);

  // Scroll listener for compact header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await loadStorefrontSettings();
      if (res.data?.data) setSettings(res.data.data);
    } catch (_) { } // graceful degradation
  };

  const loadSearchCatalog = async () => {
    try {
      const res = await loadStorefrontProducts({ isActive: true, limit: 80 }, { ttlMs: 15000 });
      setSearchCatalog(res.data?.data || []);
    } catch (_) {
      setSearchCatalog([]);
    }
  };

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    searchTimeout.current = setTimeout(async () => {
      const localResults = rankStorefrontProducts(searchCatalog, q, { limit: 6 });

      try {
        const res = await loadStorefrontProducts({
          isActive: true,
          search: q,
          limit: 10,
        }, { ttlMs: 4000 });
        const remoteResults = res.data?.data || [];
        setSearchResults(mergeUniqueProducts(remoteResults, localResults).slice(0, 6));
      } catch (_) {
        setSearchResults(localResults);
      }
      finally { setSearchLoading(false); }
    }, 300);
  }, [searchCatalog]);

  // Update document title and favicon
  useEffect(() => {
    if (settings) {
      if (settings?.store?.name) {
        document.title = settings.store.name;
      }
      if (settings?.branding?.logo) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.branding.logo;
      }
    }
  }, [settings]);

  const handleSearchSelect = (productId) => {
    navigate(storefrontPath(`/products/${productId}`));
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(storefrontPath(`/products?search=${encodeURIComponent(searchQuery)}`));
      setSearchOpen(false);
    }
  };

  const handleBarcodeLookup = async (payload) => {
    const code = payload?.value || payload;
    if (!code) return;

    try {
      const response = await loadStorefrontProductByBarcode(code, { ttlMs: 0 });
      const product = response?.data?.data;
      if (!product?._id) throw new Error('PRODUCT_NOT_FOUND');

      setShowBarcodeScanner(false);
      setSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      navigate(storefrontPath(`/products/${product._id}`));
    } catch (_) {
      setShowBarcodeScanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ─── HEADER ─── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg shadow-black/5' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
            {/* Logo */}
            <Link to={storefrontPath('/')} className="flex min-w-0 items-center gap-2 flex-shrink-0">
              {settings?.branding?.logo ? (
                <img src={settings.branding.logo} alt={settings?.store?.name || 'Logo'} className={`object-contain transition-all duration-300 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'}`} />
              ) : (
                <div className={`bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-black transition-all duration-300 ${scrolled ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'}`}>
                  {settings?.store?.name?.[0] || 'P'}
                </div>
              )}
              <span className={`max-w-[8.5rem] truncate font-black bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent transition-all duration-300 sm:max-w-none ${scrolled ? 'text-sm sm:text-base' : 'text-base sm:text-xl'}`}>
                {settings?.store?.name || 'المتجر'}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to={storefrontPath('/')} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">الرئيسية</Link>
              <Link to={storefrontPath('/products')} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">المنتجات</Link>
              <Link to={seasonalLandingPath} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">العروض</Link>

              {/* Mega Categories Dropdown */}
              {categories?.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm py-2 transition-colors">
                    الأقسام <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" />
                  </button>
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 shadow-2xl shadow-black/10 rounded-2xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-200 z-50 overflow-hidden">
                    {categories.map((cat) => (
                      <div key={cat._id || cat} className="relative group/sub">
                        <Link
                          to={storefrontPath(`/products?category=${cat._id || cat}`)}
                          className="flex justify-between items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
                        >
                          <span className="flex items-center gap-2"><span>{cat.icon || '📦'}</span>{cat.name || cat}</span>
                          {cat.children?.length > 0 && <span className="text-gray-300 text-xs">←</span>}
                        </Link>
                        {cat.children?.length > 0 && (
                          <div className="absolute top-0 right-full w-52 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all z-50 overflow-hidden">
                            {cat.children.map((sub) => (
                              <Link key={sub._id || sub} to={storefrontPath(`/products?category=${sub._id || sub}`)} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 border-b border-gray-50 last:border-0 transition-colors">
                                <span className="opacity-40">{sub.icon || '•'}</span>{sub.name || sub}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link to={storefrontPath('/about')} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">من نحن</Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Instant Search */}
              <div ref={searchRef} className="relative hidden md:block">
                <form onSubmit={handleSearchSubmit}>
                  <div className={`flex items-center transition-all duration-300 ${searchOpen ? 'w-64' : 'w-48'} bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border-2 ${searchOpen ? 'border-primary-300 dark:border-primary-700' : 'border-transparent'}`}>
                    <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="ابحث عن منتج..."
                      className="flex-1 py-2 pr-1 pl-3 bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none placeholder-gray-400 min-w-0"
                    />
                    {storefrontBarcodeSearchEnabled ? (
                      <button
                        type="button"
                        onClick={() => setShowBarcodeScanner(true)}
                        className="p-1 text-gray-400 hover:text-primary-600 flex-shrink-0"
                        title="بحث بالباركود"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    ) : null}
                    {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(true); }} className="p-1 ml-1 text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-3 h-3" /></button>}
                  </div>
                </form>
                {/* Search Dropdown */}
                {searchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 min-w-[280px]">
                    {searchLoading ? (
                      <div className="p-4 text-center text-sm text-gray-400">
                        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        {searchResults.map(p => (
                          <button key={p._id} onClick={() => handleSearchSelect(p._id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-right border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                              {pickProductImage(p) ? <img src={pickProductImage(p)} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-300 m-auto mt-2.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-xs text-primary-600 font-black">{p.price?.toLocaleString()} ج.م</p>
                            </div>
                          </button>
                        ))}
                        <button onClick={() => { navigate(storefrontPath(`/products?search=${encodeURIComponent(searchQuery)}`)); setSearchOpen(false); }} className="w-full py-3 text-sm font-bold text-primary-600 hover:bg-primary-50 transition-colors">
                          عرض جميع النتائج →
                        </button>
                      </div>
                    ) : !searchQuery.trim() && headerSearchSuggestions.categories.length > 0 ? (
                      <div className="p-4 text-right">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-gray-400">عمليات بحث شائعة</p>
                        <div className="flex flex-wrap gap-2">
                          {headerSearchSuggestions.categories.map((category) => (
                            <button
                              key={category.id || category.name}
                              onClick={() => {
                                navigate(storefrontPath(`/products?category=${category.id}`));
                                setSearchOpen(false);
                              }}
                              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              {category.icon ? `${category.icon} ` : ''}{category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-400">لا توجد نتائج لـ "{searchQuery}"</div>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {!canAccessBackoffice ? (
                <Link to="/portal/register" className="relative group hidden md:inline-flex items-center justify-center mr-2">
                  <span className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 opacity-60 blur-sm animate-pulse group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 font-bold text-xs text-white bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 rounded-full shadow-md transform group-hover:-translate-y-0.5 transition-all duration-300">
                    انشاء متجرك
                  </span>
                </Link>
              ) : null}

              {canAccessBackoffice && (
                <a href={backofficeDashboardUrl} className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 rounded-xl transition-colors text-sm font-bold border border-primary-200 dark:border-primary-800">
                  لوحة التحكم
                </a>
              )}

              <Link to={accountEntryPath} className="hidden sm:flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium">
                <AccountEntryIcon className="w-4 h-4" /> {accountEntryLabel}
              </Link>

              {/* Notifications */}
              {isAuthenticated && (
                <NotificationDropdown mode="portal" />
              )}

              {/* Cart with animated badge */}
              <Link to={storefrontPath('/cart')} className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors group">
                <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-primary-600 transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center animate-bounce-once shadow-md shadow-primary-500/40">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              <button className="md:hidden p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-700 animate-fade-in">
              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border-2 border-transparent focus-within:border-primary-300">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input type="text" value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={e => handleSearch(e.target.value)} placeholder="ابحث عن منتج..." className="flex-1 bg-transparent text-base text-gray-700 dark:text-gray-300 focus:outline-none placeholder-gray-400" />
                  {storefrontBarcodeSearchEnabled ? (
                    <button type="button" onClick={() => setShowBarcodeScanner(true)} className="text-gray-400 hover:text-primary-600">
                      <Camera className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
                {searchOpen && (searchResults.length > 0 || headerSearchSuggestions.categories.length > 0) && (
                  <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                    {searchResults.map(p => (
                      <button key={p._id} onClick={() => { handleSearchSelect(p._id); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-right border-b border-gray-50 last:border-0">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {pickProductImage(p) ? <img src={pickProductImage(p)} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-300 m-auto mt-2.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs text-primary-600 font-black">{p.price?.toLocaleString()} ج.م</p>
                        </div>
                      </button>
                    ))}
                    {searchResults.length === 0 && headerSearchSuggestions.categories.length > 0 && (
                      <div className="px-4 py-3 text-right">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">اقتراحات سريعة</p>
                        <div className="flex flex-wrap gap-2">
                          {headerSearchSuggestions.categories.map((category) => (
                            <button
                              key={category.id || category.name}
                              onClick={() => {
                                navigate(storefrontPath(`/products?category=${category.id}`));
                                setSearchOpen(false);
                                setMobileMenuOpen(false);
                              }}
                              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600"
                            >
                              {category.icon ? `${category.icon} ` : ''}{category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
              <nav className="flex flex-col gap-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-800/60 sm:hidden">
                  <LanguageSwitcher />
                </div>
                {canAccessBackoffice && (
                  <a href={backofficeDashboardUrl} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-bold border border-primary-200 dark:border-primary-800 transition-colors">
                    لوحة التحكم
                  </a>
                )}
                {[{ to: storefrontPath('/'), label: 'الرئيسية' }, { to: storefrontPath('/products'), label: 'المنتجات' }, { to: seasonalLandingPath, label: 'العروض' }, { to: storefrontPath('/about'), label: 'من نحن' }, { to: accountEntryPath, label: accountEntryLabel }].map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="px-4 py-3.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 font-medium transition-colors text-base flex items-center">
                    {item.label}
                  </Link>
                ))}
                {categories?.length > 0 && (
                  <div className="px-3 py-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">الأقسام</p>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <Link key={cat._id || cat} to={storefrontPath(`/products?category=${cat._id || cat}`)} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 py-1 transition-colors">
                          <span>{cat.icon || '📦'}</span><span className="truncate">{cat.name || cat}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
        {children}
      </main>

      {showBarcodeScanner ? (
        <BarcodeScanner
          onScan={handleBarcodeLookup}
          onClose={() => setShowBarcodeScanner(false)}
        />
      ) : null}

      {/* ─── FOOTER ─── */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right" dir="rtl">
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">{settings?.store?.name || 'المتجر'}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{settings?.businessInfo?.address || settings?.store?.address || 'متجر إلكتروني متكامل'}</p>
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">روابط سريعة</h3>
              <div className="flex flex-col gap-2 text-sm">
                {[{ to: storefrontPath('/'), label: 'الرئيسية' }, { to: storefrontPath('/products'), label: 'المنتجات' }, { to: seasonalLandingPath, label: 'العروض' }, { to: storefrontPath('/cart'), label: 'سلة التسوق' }, { to: accountEntryPath, label: accountEntryLabel }].map(item => (
                  <Link key={item.to} to={item.to} className="text-gray-500 hover:text-primary-600 transition-colors">{item.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">تواصل معنا</h3>
              <div className="text-sm text-gray-500 space-y-2">
                {(settings?.businessInfo?.phone || settings?.store?.phone) && <p className="flex items-center gap-2">📞 <span dir="ltr">{settings?.businessInfo?.phone || settings?.store?.phone}</span></p>}
                {(settings?.businessInfo?.email || settings?.store?.email) && <p className="flex items-center gap-2">📧 <span dir="ltr">{settings?.businessInfo?.email || settings?.store?.email}</span></p>}
                {settings?.businessInfo?.taxId && <p className="flex items-center gap-2 text-xs opacity-75">🏢 البطاقة الضريبية: <span dir="ltr">{settings.businessInfo.taxId}</span></p>}
                {settings?.businessInfo?.commercialRegister && <p className="flex items-center gap-2 text-xs opacity-75">📑 السجل التجاري: <span dir="ltr">{settings.businessInfo.commercialRegister}</span></p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 mt-8 pt-8 flex flex-col items-center gap-5">
            {!canAccessBackoffice ? (
              <Link to="/portal/register" className="relative group inline-flex items-center justify-center">
                <span className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 opacity-60 blur-md animate-pulse group-hover:opacity-100 transition-opacity duration-500"></span>
                <span className="relative z-10 font-black text-sm text-white bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-2.5 rounded-full shadow-lg transform group-hover:scale-105 transition-all duration-300">
                  انشاء متجرك
                </span>
              </Link>
            ) : null}
            <div className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
              جميع الحقوق محفوظة لـ {settings?.store?.name || 'المتجر'} © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>

      {canAccessBackoffice ? (
        <a
          href={backofficeDashboardUrl}
          className={`fixed right-4 z-50 flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_22px_54px_rgba(15,23,42,0.2)] dark:border-slate-700/80 dark:bg-slate-900/95 sm:right-6 sm:gap-3 sm:p-3 ${showSupportFab ? 'bottom-24 sm:bottom-28' : 'bottom-4 sm:bottom-6'} ${mobileMenuOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          title="العودة إلى لوحة التحكم"
          aria-label="العودة إلى لوحة التحكم"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 via-primary-500 to-slate-900 text-white shadow-lg shadow-primary-500/20 sm:h-11 sm:w-11">
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          <span className="hidden sm:flex flex-col text-right leading-tight">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">إدارة المتجر</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">لوحة التحكم</span>
          </span>
        </a>
      ) : null}

      {/* Floating Support Button */}
      {showSupportFab && customer ? (
        <Link
          to="/portal/support"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-3 py-3 text-white shadow-2xl transition-transform hover:scale-105 hover:bg-primary-500 sm:bottom-6 sm:right-6 sm:gap-3 sm:px-4 sm:py-3.5"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="font-bold text-sm hidden sm:inline-block">الدعم المباشر</span>
        </Link>
      ) : showSupportFab ? (
        <a
          href={publicSupportHref}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-3 py-3 text-white shadow-2xl transition-transform hover:scale-105 hover:bg-primary-500 sm:bottom-6 sm:right-6 sm:gap-3 sm:px-4 sm:py-3.5"
        >
          {directSupportPhone ? <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6" /> : <Package className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="font-bold text-sm hidden sm:inline-block">{directSupportPhone ? 'اتصل بالمتجر' : 'تتبع الطلب'}</span>
        </a>
      ) : null}
    </div>
  );
}
