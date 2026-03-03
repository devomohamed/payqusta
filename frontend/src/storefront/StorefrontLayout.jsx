import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Package } from 'lucide-react';
import { api } from '../store';
import { usePortalStore } from '../store/portalStore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { storefrontPath } from '../utils/storefrontHost';
import { pickProductImage } from '../utils/media';

export default function StorefrontLayout({ children }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Instant search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  const { categories, fetchCategories, isAuthenticated, customer, cart } = usePortalStore((state) => ({
    categories: state.categories,
    fetchCategories: state.fetchCategories,
    isAuthenticated: state.isAuthenticated,
    customer: state.customer,
    cart: state.cart,
  }));

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const accountEntryPath = isAuthenticated ? '/account/dashboard' : '/account/login';
  const accountEntryLabel = isAuthenticated ? (customer?.name?.split(' ')[0] || 'حسابي') : 'تسجيل الدخول';

  useEffect(() => {
    loadSettings();
    if (fetchCategories) fetchCategories();
  }, [fetchCategories]);

  // Scroll listener for compact header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.data) setSettings(res.data.data);
    } catch (_) { } // graceful degradation
  };

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get(`/products?isActive=true&search=${encodeURIComponent(q)}&limit=6`);
        setSearchResults(res.data.data || []);
      } catch (_) { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ─── HEADER ─── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg shadow-black/5' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
            {/* Logo */}
            <Link to={storefrontPath('/')} className="flex items-center gap-2 flex-shrink-0">
              {settings?.branding?.logo ? (
                <img src={settings.branding.logo} alt={settings?.store?.name || 'Logo'} className={`object-contain transition-all duration-300 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'}`} />
              ) : (
                <div className={`bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-black transition-all duration-300 ${scrolled ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'}`}>
                  {settings?.store?.name?.[0] || 'P'}
                </div>
              )}
              <span className={`font-black bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent transition-all duration-300 ${scrolled ? 'text-base' : 'text-xl'}`}>
                {settings?.store?.name || 'PayQusta Store'}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to={storefrontPath('/')} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">الرئيسية</Link>
              <Link to={storefrontPath('/products')} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium text-sm transition-colors">المنتجات</Link>

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
            <div className="flex items-center gap-3">
              {/* Instant Search */}
              <div ref={searchRef} className="relative hidden md:block">
                <form onSubmit={handleSearchSubmit}>
                  <div className={`flex items-center transition-all duration-300 ${searchOpen ? 'w-64' : 'w-48'} bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border-2 ${searchOpen ? 'border-primary-300 dark:border-primary-700' : 'border-transparent'}`}>
                    <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      onFocus={() => searchQuery && setSearchOpen(true)}
                      placeholder="ابحث عن منتج..."
                      className="flex-1 py-2 pr-1 pl-3 bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none placeholder-gray-400 min-w-0"
                    />
                    {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }} className="p-1 ml-1 text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-3 h-3" /></button>}
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
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-400">لا توجد نتائج لـ "{searchQuery}"</div>
                    )}
                  </div>
                )}
              </div>

              <LanguageSwitcher />

              <Link to={accountEntryPath} className="hidden sm:flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium">
                <User className="w-4 h-4" /> {accountEntryLabel}
              </Link>

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
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2.5 border-2 border-transparent focus-within:border-primary-300">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="ابحث عن منتج..." className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none placeholder-gray-400" />
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                  </div>
                )}
              </form>
              <nav className="flex flex-col gap-2">
                {[{ to: storefrontPath('/'), label: 'الرئيسية' }, { to: storefrontPath('/products'), label: 'المنتجات' }, { to: storefrontPath('/about'), label: 'من نحن' }, { to: accountEntryPath, label: accountEntryLabel }].map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-600 font-medium transition-colors">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right" dir="rtl">
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">{settings?.store?.name || 'PayQusta Store'}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{settings?.store?.address || 'متجر إلكتروني متكامل'}</p>
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">روابط سريعة</h3>
              <div className="flex flex-col gap-2 text-sm">
                {[{ to: storefrontPath('/'), label: 'الرئيسية' }, { to: storefrontPath('/products'), label: 'المنتجات' }, { to: storefrontPath('/cart'), label: 'سلة التسوق' }, { to: accountEntryPath, label: accountEntryLabel }].map(item => (
                  <Link key={item.to} to={item.to} className="text-gray-500 hover:text-primary-600 transition-colors">{item.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white mb-3">تواصل معنا</h3>
              <div className="text-sm text-gray-500 space-y-1.5">
                {settings?.store?.phone && <p className="flex items-center gap-2">📞 {settings.store.phone}</p>}
                {settings?.store?.email && <p className="flex items-center gap-2">📧 {settings.store.email}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} {settings?.store?.name || 'PayQusta'}. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
