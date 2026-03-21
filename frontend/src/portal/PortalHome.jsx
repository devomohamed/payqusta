import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notify } from '../components/AnimatedNotification';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import {
  CreditCard, Calendar, ArrowLeft, ShoppingBag, Receipt, FileText,
  User, Star, Search, ShoppingCart, Heart, Bell,
  ChevronRight, ArrowRight, Tag, Zap, ShieldCheck, Package, MessageCircle, X, Gift
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';
import ProductCard from './components/product/ProductCard';

export default function PortalHome() {
  const { t } = useTranslation('portal');
  const { fetchDashboard, loading, customer, addToCart, toggleWishlist, wishlistIds, claimDailyReward } = usePortalStore();
  const { dark } = useThemeStore();
  const [data, setData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetchDashboard();
    if (res) setData(res);
  };

  const handleClaimReward = async () => {
    setIsClaiming(true);
    const res = await claimDailyReward();
    if (res.success) {
      notify.success(res.message);
    } else {
      notify.error(res.message);
    }
    setIsClaiming(false);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('home.loading_store')}</p>
      </div>
    );
  }

  const { wallet, upcomingInstallments, categories, products, store } = data;
  const currencyLabel = wallet?.currency === 'EGP' ? 'ج.م' : wallet?.currency;

  // Dynamic colors
  const primaryColor = store?.primaryColor || '#6366f1';
  const secondaryColor = store?.secondaryColor || '#10b981';

  return (
    <div className="pb-24 animate-fade-in space-y-6 app-text-soft" dir="rtl">

      {/* ═══════════════ SEARCH & HERO ═══════════════ */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative cursor-text group" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
          <div className="app-surface w-full rounded-2xl py-4 pr-12 pl-4 shadow-sm transition-shadow group-hover:shadow-md text-sm text-gray-400 text-right">
            {t('home.search_placeholder')}
          </div>
        </div>

        {/* Hero Banner (Premium Redesign) */}
        <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl h-56 sm:h-60 md:h-80 group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-hover:scale-105"
            style={{
              backgroundImage: `url(${store?.coverImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80'})`,
            }}
          />
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/40 to-transparent dark:from-black/95 dark:via-black/60" />

          {/* Glassmorphic Content Container */}
          <div className="absolute inset-0 p-4 sm:p-6 md:p-10 flex flex-col justify-center items-start text-white">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 rounded-3xl max-w-full sm:max-w-sm md:max-w-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] transform transition-all duration-700 hover:-translate-y-1">
              <span className="inline-block bg-gradient-to-r from-primary-500 to-indigo-500 text-white text-xs font-black px-4 py-1.5 rounded-full mb-4 shadow-lg">
                {t('home.exclusive_offers')}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-3 leading-tight tracking-tight">
                {t('home.mega_sales')}
              </h1>
              <p className="text-white/80 mb-6 text-sm font-medium line-clamp-2 leading-relaxed">
                {t('home.hero_subtitle')}
              </p>
              <button
                onClick={() => navigate('/portal/products')}
                className="w-full sm:w-auto justify-center bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-2 group/btn"
              >
                {t('home.shop_now')}
                <div className="bg-gray-100 rounded-full p-1 group-hover/btn:bg-gray-200 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ PURCHASING POWER & GAMIFICATION ═══════════════ */}
      {(customer?.creditLimit > 0 || customer?.points > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Purchasing Power (Virtual Credit Card) */}
          {customer?.creditLimit > 0 && (
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden group border border-gray-700/50">
              {/* Card Texture & Glows */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-500/20 rounded-full blur-2xl -ml-20 -mb-20 transition-transform duration-1000 group-hover:scale-110" />

              {/* NFC / Chip Icon overlay pattern */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]" />

              <div className="relative z-10 flex items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-bold text-gray-300 text-sm tracking-wide">{t('home.purchasing_power')}</h3>
                  <div className="w-8 h-6 bg-yellow-400/20 rounded border border-yellow-500/30 flex items-center justify-center mt-2">
                    <div className="w-4 h-3 border border-yellow-500/50 rounded-sm opacity-80" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-800/50 px-2 py-1 rounded-lg backdrop-blur-sm border border-gray-700">
                    PayQusta Pay
                  </span>
                </div>
              </div>

              <div className="relative z-10 mb-6">
                <h2 className="text-4xl font-black tracking-tight flex items-baseline gap-2 drop-shadow-md">
                  {customer.balance?.toLocaleString() || 0}
                  <span className="text-lg font-medium text-gray-400">{currencyLabel}</span>
                </h2>
              </div>

              {/* Progress & Limit details */}
              <div className="relative z-10">
                <div className="flex justify-between text-[11px] font-bold text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    {t('home.used')} {(customer.outstanding || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    {t('home.total_limit')} {customer.creditLimit.toLocaleString()}
                  </span>
                </div>

                {/* Refined Progress Bar */}
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden shadow-inner border border-gray-700/50 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${Math.min(100, ((customer.balance || 0) / customer.creditLimit) * 100)}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 rounded-full blur-[2px]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gamification / Loyalty Points (Premium) */}
          {customer?.points >= 0 && (
            <div className="app-surface border border-gray-100/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/20 relative overflow-hidden flex flex-col justify-center group hover:border-yellow-500/30 transition-colors">

              {/* Subtle ambient background glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/10 dark:bg-yellow-500/5 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150" />

              <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_4px_15px_rgba(234,179,8,0.3)]">
                    <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white tracking-tight">{t('home.loyalty_points')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('home.tier')} <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400">{customer.tier === 'vip' ? t('home.tier_vip') : customer.tier === 'gold' ? t('home.tier_gold') : customer.tier === 'silver' ? t('home.tier_silver') : t('home.tier_classic')}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 dark:text-yellow-500 py-2 px-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow-md border border-yellow-200 dark:border-yellow-700/30"
                  title={t('home.daily_reward')}
                >
                  {isClaiming ? (
                    <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{t('home.daily_reward_short')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                  {customer.points.toLocaleString()} <span className="text-sm font-bold text-gray-400">{t('home.points_label')}</span>
                </h2>

                <div className="w-full bg-gray-100 dark:bg-gray-700/50 h-2.5 rounded-full overflow-hidden mb-2 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-full relative"
                    style={{ width: `${Math.min(100, (customer.points / 1000) * 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                  <span>{customer.points >= 1000 ? t('home.max_tier') : t('home.points_to_upgrade', { points: 1000 - customer.points })}</span>
                  <span>1000 {t('home.points_label')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* ═══════════════ CATEGORIES (Pill style) ═══════════════ */}
      <div>
        <div className="flex items-end justify-between gap-3 px-2 mb-4">
          <h3 className="font-black text-xl dark:text-white tracking-tight">{t('home.browse_categories')}</h3>
          <Link to="/portal/products" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition flex items-center gap-1">
            {t('home.view_all')} <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto px-2 pb-4 no-scrollbar snap-x snap-mandatory">
          {categories?.length > 0 ? categories.map((cat, i) => (
            <Link
              key={i}
              to={`/portal/products?category=${cat.slug}`}
              className="app-surface group flex items-center gap-3 border border-gray-100/80 dark:border-white/10 px-4 py-3 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg hover:shadow-primary-500/10 hover:border-primary-200 transition-all snap-start whitespace-nowrap"
            >
              <div className="app-surface-muted w-10 h-10 rounded-full flex items-center justify-center text-primary-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:scale-110 transition-all">
                <Tag className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-primary-600 transition-colors">
                {cat.name}
              </span>
            </Link>
          )) : (
            <div className="w-full text-center py-4 text-gray-400 text-xs">{t('home.no_categories')}</div>
          )}
        </div>
      </div>

      {/* ═══════════════ FEATURED PRODUCTS & QUICK ACTIONS ═══════════════ */}
      <div className="app-surface-muted border-t border-gray-200/50 dark:border-white/10 -mx-4 px-4 py-8 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">

        {/* Quick Actions Grid (Refined) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 px-1">
          <button onClick={() => navigate('/portal/orders')} className="flex flex-col items-center gap-2 group">
            <div className="app-surface w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100/80 dark:border-white/10 group-hover:shadow-md group-hover:-translate-y-1 transition-all">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('home.quick_actions.my_orders')}</span>
          </button>

          <button onClick={() => navigate('/portal/wishlist')} className="flex flex-col items-center gap-2 group">
            <div className="app-surface w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100/80 dark:border-white/10 group-hover:shadow-md group-hover:-translate-y-1 transition-all">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('home.quick_actions.wishlist')}</span>
          </button>

          <button onClick={() => navigate('/portal/statement')} className="flex flex-col items-center gap-2 group">
            <div className="app-surface w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100/80 dark:border-white/10 group-hover:shadow-md group-hover:-translate-y-1 transition-all">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('home.quick_actions.statement')}</span>
          </button>

          <button onClick={() => navigate('/portal/support')} className="flex flex-col items-center gap-2 group">
            <div className="app-surface w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100/80 dark:border-white/10 group-hover:shadow-md group-hover:-translate-y-1 transition-all">
              <MessageCircle className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{t('home.quick_actions.support')}</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 px-1">
          <h3 className="font-black text-xl sm:text-2xl dark:text-white tracking-tight flex items-center gap-2">
            {t('home.featured_products')}
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1.5 rounded-xl">
              <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
          </h3>
          <Link to="/portal/products" className="text-sm font-bold text-primary-600 hover:text-primary-700 transition">{t('home.view_more')}</Link>
        </div>

        {!products?.length ? (
          <div className="text-center py-10 opacity-60">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium">{t('home.no_products')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <ProductCard
                key={product._id || i}
                product={product}
                currencyLabel={currencyLabel}
                addToCart={addToCart}
                toggleWishlist={toggleWishlist}
                isWishlisted={wishlistIds?.includes(product._id)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/portal/products" className="inline-flex items-center gap-2 text-sm font-bold text-white bg-black dark:bg-gray-700 px-8 py-4 rounded-2xl hover:bg-gray-800 transition-colors">
            {t('home.view_all_products')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ═══════════════ UPCOMING PAYMENTS ALERTS ═══════════════ */}
      {upcomingInstallments?.length > 0 && (
        <div className="px-1 transform transition-all hover:-translate-y-1">
          {(() => {
            const hasOverdue = upcomingInstallments.some(inst => new Date(inst.dueDate) < new Date());

            return (
              <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl relative overflow-hidden ${hasOverdue
                ? 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-900 border-red-200 dark:border-red-800/50 shadow-red-500/10'
                : 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-900 border-orange-200 dark:border-orange-800/50 shadow-orange-500/10'
                }`}>

                {/* Alert pulse dot */}
                <div className="absolute top-6 left-6 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasOverdue ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${hasOverdue ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${hasOverdue ? 'bg-red-500 text-white' : 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                    }`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-black tracking-tight text-lg ${hasOverdue ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'
                      }`}>
                      {hasOverdue ? t('home.alerts.overdue_installments') : t('home.alerts.payment_reminder')}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                      {hasOverdue ? t('home.alerts.overdue_desc') : t('home.alerts.reminder_desc')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {upcomingInstallments.slice(0, 2).map((inst, i) => (
                    <div key={i} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/50 p-4 rounded-2xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="font-black text-2xl text-gray-900 dark:text-white w-8 text-center">{new Date(inst.dueDate).getDate()}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-700 dark:text-gray-300">{t('home.alerts.installment_due')}</span>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(inst.dueDate).toLocaleDateString(t('common:locale') || 'ar-EG', { month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <span className={`font-black text-lg ${hasOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {inst.amount.toLocaleString()} {currencyLabel}
                      </span>
                    </div>
                  ))}

                  <Link to="/portal/invoices" className={`block w-full py-3 text-center text-sm font-bold rounded-xl transition-colors mt-2 ${hasOverdue ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                    : 'bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400'
                    }`}>
                    {t('home.alerts.pay_installments_now')}
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════ SEARCH MODAL ═══════════════ */}
      {
        isSearchOpen && (
          <div className="app-shell-bg fixed inset-0 z-50 flex flex-col animate-fade-in pb-safe">
            {/* Header */}
            <div className="app-surface px-4 py-3 shadow-sm flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="app-surface-muted w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتجات، أقسام..."
                  className="app-surface-muted w-full rounded-xl border border-transparent py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-primary-500/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/portal/products?q=${encodeURIComponent(searchQuery)}`);
                      setIsSearchOpen(false);
                    }
                  }}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="flex-1 overflow-y-auto p-4">
              {!searchQuery ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-3 px-1">{t('home.popular_searches')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {[t('home.offers'), t('home.new_items'), ...categories?.slice(0, 3).map(c => c.name) || []].map((term, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigate(`/portal/products?q=${encodeURIComponent(term)}`);
                            setIsSearchOpen(false);
                          }}
                          className="app-surface px-4 py-2 rounded-xl text-sm font-medium border border-gray-100/80 dark:border-white/10 shadow-sm"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Category Suggestions */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-3 px-1">{t('home.browse_by_category')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories?.slice(0, 4).map((cat, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigate(`/portal/products?category=${cat.slug}`);
                            setIsSearchOpen(false);
                          }}
                          className="app-surface flex items-center gap-3 p-3 rounded-xl border border-gray-100/80 dark:border-white/10"
                        >
                          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-lg flex items-center justify-center">
                            <Tag className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold text-right flex-1 line-clamp-1">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 opacity-60">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium">{t('home.press_enter_to_search')} "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        )
      }

    </div >
  );
}
