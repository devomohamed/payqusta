import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Flame, Trophy, CreditCard, Megaphone, ShoppingCart, Sparkles,
} from 'lucide-react';
import { Card, Badge, Button, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useCommerceStore } from '../store/commerceStore';
import { pickProductImage } from '../utils/media';
import { storefrontPath } from '../utils/storefrontHost';
import { createBuyNowItem } from './buyNowItem';
import { loadStorefrontCampaignAttribution } from './storefrontCampaignAttribution';
import { trackStorefrontFunnelEvent } from './storefrontFunnelAnalytics';
import {
  getStorefrontLandingPage,
  getStorefrontLandingPages,
  getStorefrontLandingPagePath,
  selectStorefrontLandingProducts,
  trackStorefrontLandingPageView,
} from './storefrontLandingPages';
import {
  loadStorefrontProducts,
  loadStorefrontSettings,
} from './storefrontDataClient';

function getLandingIcon(slug) {
  if (slug === 'seasonal') return Flame;
  if (slug === 'best-sellers') return Trophy;
  if (slug === 'installments') return CreditCard;
  if (slug === 'campaign') return Megaphone;
  return Sparkles;
}

function getPriceLabel(product) {
  const price = Number(product?.price) || 0;
  return `${price.toLocaleString()} ج.م`;
}

function getComparePriceLabel(product) {
  const compareAtPrice = Number(product?.compareAtPrice) || 0;
  const price = Number(product?.price) || 0;
  if (compareAtPrice <= price || compareAtPrice <= 0) return '';

  return `${compareAtPrice.toLocaleString()} ج.م`;
}

function getInstallmentHint(product) {
  const price = Number(product?.price) || 0;
  if (price <= 0) return '';

  return `تقسيط استرشادي: 4 دفعات من ${(price / 4).toLocaleString()} ج.م`;
}

function LandingProductCard({ product, landingSlug }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { addToCart } = useCommerceStore((state) => ({
    addToCart: state.addToCart,
  }));
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const outOfStock = (product?.stock?.quantity ?? 0) <= 0;
  const comparePriceLabel = getComparePriceLabel(product);

  const handleQuickAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (outOfStock) {
      notify.error(t('storefront_landing_page.toasts.kk8kjeg'));
      return;
    }

    if (product.hasVariants) {
      navigate(storefrontPath(`/products/${product._id}`));
      return;
    }

    setAdding(true);
    addToCart(product, 1);
    trackStorefrontFunnelEvent('add_to_cart', {
      productId: product._id,
      itemCount: 1,
      cartSize: 1,
      source: `landing:${landingSlug}`,
    });
    notify.success(`تمت إضافة "${product.name}" للسلة`);
    window.setTimeout(() => setAdding(false), 500);
  };

  const handleBuyNow = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (outOfStock) {
      notify.error(t('storefront_landing_page.toasts.kk8kjeg'));
      return;
    }

    const buyNowItem = createBuyNowItem(product);
    if (!buyNowItem) {
      notify.error(t('storefront_landing_page.toasts.kuqj79l'));
      return;
    }

    setBuying(true);
    navigate(storefrontPath('/checkout'), {
      state: { buyNowItem },
    });
  };

  return (
    <Link to={storefrontPath(`/products/${product._id}`)} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-800">
          {pickProductImage(product) ? (
            <img
              src={pickProductImage(product)}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <Sparkles className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <Badge variant={outOfStock ? 'danger' : 'success'} className="rounded-full px-3 py-1 text-[11px] font-black">
              {outOfStock ? t('storefront_landing_page.ui.k5xt3ii') : 'جاهز للطلب'}
            </Badge>
            {landingSlug === 'installments' && (
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-emerald-700 shadow-sm">
                {t('storefront_landing_page.ui.kn8xeut')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 text-right" dir="rtl">
          <p className="text-[11px] font-black uppercase tracking-wider text-primary-500">
            {(typeof product.category === 'object' ? product.category?.name : product.category) || t('storefront_landing_page.toasts.k69go1a')}
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg font-black text-gray-900 dark:text-white">{product.name}</h3>
          <p className="mt-2 line-clamp-2 text-xs font-medium leading-6 text-gray-500 dark:text-gray-400">
            {product.description || t('storefront_landing_page.toasts.k51la0k')}
          </p>

          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{getPriceLabel(product)}</p>
                {comparePriceLabel && (
                  <p className="text-xs font-bold text-gray-400 line-through">{comparePriceLabel}</p>
                )}
              </div>
              {landingSlug === 'installments' && (
                <p className="max-w-[9rem] text-[11px] font-bold leading-5 text-emerald-600">
                  {getInstallmentHint(product)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <ShoppingCart className="h-4 w-4" />
              {adding ? t('storefront_landing_page.ui.kq77xre') : 'إضافة سريعة'}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={buying}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-black text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300"
            >
              {buying ? t('storefront_landing_page.ui.k1l8sj9') : 'اشترِ الآن'}
            </button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function StorefrontLandingPage() {
  const { t } = useTranslation('admin');
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const campaignAttribution = loadStorefrontCampaignAttribution();
  const landingPage = getStorefrontLandingPage(slug, campaignAttribution);
  const landingLinks = getStorefrontLandingPages(campaignAttribution);
  const LandingIcon = getLandingIcon(slug);
  const selectedProducts = landingPage
    ? selectStorefrontLandingProducts(slug, products, campaignAttribution)
    : [];

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [productsRes, settingsRes] = await Promise.all([
          loadStorefrontProducts({ isActive: true, limit: 80 }, { ttlMs: 15000 }),
          loadStorefrontSettings(),
        ]);

        if (cancelled) return;

        setProducts(productsRes.data?.data || []);
        setSettings(settingsRes.data?.data || null);
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setSettings(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!landingPage) return;
    trackStorefrontLandingPageView(landingPage.slug, campaignAttribution);
  }, [
    landingPage?.slug,
    campaignAttribution?.utmSource,
    campaignAttribution?.utmMedium,
    campaignAttribution?.utmCampaign,
    campaignAttribution?.campaignMessage,
  ]);

  if (!landingPage) {
    return (
      <div className="mx-auto max-w-4xl py-12" dir="rtl">
        <Card className="rounded-[2.5rem] border border-gray-100 p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-black text-primary-500">{t('storefront_landing_page.ui.kv9weiv')}</p>
          <h1 className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{t('storefront_landing_page.ui.kkch8ap')}</h1>
          <p className="mt-3 text-sm font-medium text-gray-500">
            {t('storefront_landing_page.ui.k5wrifi')}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate(getStorefrontLandingPagePath('seasonal'))}>{t('storefront_landing_page.ui.kk8w74b')}</Button>
            <Button variant="outline" onClick={() => navigate(storefrontPath('/products'))}>{t('storefront_landing_page.ui.k2yacg')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-16" dir="rtl">
      <section className={`overflow-hidden rounded-[2.5rem] border p-8 shadow-sm ${landingPage.panelClass}`}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-gray-900 dark:text-gray-900 shadow-sm">
                {landingPage.eyebrow}
              </Badge>
              <Badge className="rounded-full bg-gray-900 px-3 py-1 text-xs font-black text-white">
                {landingPage.badge}
              </Badge>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-gray-950 dark:text-white">
              {landingPage.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-gray-600 dark:text-gray-300">
              {landingPage.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              {landingPage.benefits.map((benefit) => (
                <span key={benefit} className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-black text-gray-700">
                  {benefit}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
              <Link
                to={storefrontPath('/products')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-gray-800"
              >
                {t('storefront_landing_page.ui.k6qcliq')}
              </Link>
              <Link
                to={storefrontPath('/cart')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600"
              >
                {t('storefront_landing_page.ui.k2volwk')}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`rounded-3xl bg-gradient-to-br ${landingPage.accent} p-6 text-white shadow-xl`}>
              <LandingIcon className="h-8 w-8" />
              <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-white/75">{t('storefront_landing_page.ui.kl4d8pk')}</p>
              <p className="mt-2 text-4xl font-black">{selectedProducts.length}</p>
              <p className="mt-2 text-xs font-medium leading-6 text-white/85">
                {t('storefront_landing_page.ui.kjv78kl')}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">{t('storefront_landing_page.ui.ktz4s81')}</p>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-gray-900">{landingPage.sourceLabel}</p>
              <p className="mt-2 text-xs font-medium leading-6 text-gray-500">
                {t('storefront_landing_page.ui.kebogj3')}
              </p>
              {campaignAttribution?.utmCampaign && (
                <p className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
                  الحملة الحالية: {campaignAttribution.utmCampaign}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-primary-500">{t('storefront_landing_page.ui.k6z5a2u')}</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              {landingPage.slug === 'campaign'
                ? `منتجات مناسبة لـ ${settings?.store?.name || t('storefront_landing_page.toasts.kaaxfw9')}`
                : 'اختيارات جاهزة للطلب الآن'}
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {t('storefront_landing_page.ui.krfwtp2')}
            </p>
          </div>
          <Link
            to={storefrontPath('/products')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-900 hover:text-white"
          >
            {t('storefront_landing_page.ui.k5hjyea')}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {selectedProducts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {selectedProducts.map((product) => (
              <LandingProductCard key={product._id} product={product} landingSlug={landingPage.slug} />
            ))}
          </div>
        ) : (
          <Card className="rounded-[2rem] border border-gray-100 p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-lg font-black text-gray-900 dark:text-white">{landingPage.emptyTitle}</p>
            <p className="mt-3 text-sm font-medium text-gray-500">{landingPage.emptyDescription}</p>
            <div className="mt-5">
              <Button onClick={() => navigate(storefrontPath('/products'))}>{t('storefront_landing_page.ui.kq2s1iu')}</Button>
            </div>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-6 text-right">
          <p className="text-xs font-black uppercase tracking-widest text-primary-500">{t('storefront_landing_page.ui.k5czxlr')}</p>
          <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{t('storefront_landing_page.ui.kjxd0iq')}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {landingLinks
            .filter((page) => page.slug !== landingPage.slug)
            .map((page) => (
              <Link key={page.slug} to={page.path} className="group block">
                <Card className="h-full rounded-[2rem] border border-gray-100 p-6 text-right shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-[11px] font-black uppercase tracking-widest text-primary-500">{page.eyebrow}</p>
                  <h3 className="mt-3 text-lg font-black text-gray-900 dark:text-white">{page.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-6 text-gray-500">{page.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary-600">
                    {t('storefront_landing_page.ui.kjl4cqg')}
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
