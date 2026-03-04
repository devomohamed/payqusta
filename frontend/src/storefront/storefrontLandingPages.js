import { storefrontPath } from '../utils/storefrontHost';

const STOREFRONT_LANDING_VIEWS_KEY = 'payqusta-storefront-landing-views';
const MAX_STOREFRONT_LANDING_VIEWS = 40;
const INSTALLMENT_PRICE_FLOOR = 750;

const LANDING_PAGE_DEFINITIONS = {
  seasonal: {
    slug: 'seasonal',
    eyebrow: 'عروض الموسم',
    title: 'عروض موسمية جاهزة للطلب السريع',
    description: 'منتجات عليها خصومات واضحة وتتحرك بسرعة خلال الموسم الحالي.',
    badge: 'خصومات واضحة',
    accent: 'from-amber-500 via-orange-500 to-rose-500',
    panelClass: 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-rose-50',
    benefits: ['خصومات مباشرة', 'اختيارات سريعة', 'مناسبة للشراء الفوري'],
    emptyTitle: 'لا توجد عروض موسمية متاحة الآن',
    emptyDescription: 'جرّب صفحة المنتجات العامة أو ارجع لاحقًا بعد تحديث العروض.',
  },
  'best-sellers': {
    slug: 'best-sellers',
    eyebrow: 'الأكثر طلبًا',
    title: 'منتجات يختارها العملاء باستمرار',
    description: 'ترشيحات مبنية على التفاعل والتقييمات والمنتجات التي تتحرك أفضل داخل المتجر.',
    badge: 'الأكثر شعبية',
    accent: 'from-sky-500 via-indigo-500 to-blue-600',
    panelClass: 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50',
    benefits: ['موصى بها', 'ثقة أعلى', 'جاهزة للإضافة السريعة'],
    emptyTitle: 'لا توجد بيانات كافية للأكثر طلبًا الآن',
    emptyDescription: 'سنملأ هذه الصفحة تلقائيًا مع زيادة التفاعل والمبيعات.',
  },
  installments: {
    slug: 'installments',
    eyebrow: 'مناسبة للتقسيط',
    title: 'منتجات أعلى قيمة مناسبة للتقسيط',
    description: 'اختيارات مرتفعة القيمة تناسب الشراء المرن وتعرضها الصفحة كمجموعة مستقلة.',
    badge: 'شراء مرن',
    accent: 'from-emerald-500 via-teal-500 to-cyan-600',
    panelClass: 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50',
    benefits: ['قيمة أعلى', 'جاهزة للمقارنة', 'مناسبة للميزانيات المرنة'],
    emptyTitle: 'لا توجد منتجات مناسبة للتقسيط حاليًا',
    emptyDescription: 'أضف منتجات بسعر أعلى أو عد لاحقًا بعد تحديث التشكيلة.',
  },
  campaign: {
    slug: 'campaign',
    eyebrow: 'صفحة الحملة',
    title: 'صفحة حملة مخصصة للزوار القادمين من الإعلانات',
    description: 'تعرض لك باقة جاهزة للشراء مع الحفاظ على مصدر الحملة الحالي داخل الرحلة.',
    badge: 'موجهة للحملات',
    accent: 'from-fuchsia-500 via-pink-500 to-rose-500',
    panelClass: 'border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-rose-50',
    benefits: ['رسالة مخصصة', 'متابعة المصدر', 'جاهزة للمشاركة'],
    emptyTitle: 'لا توجد تشكيلة حملة جاهزة الآن',
    emptyDescription: 'يمكنك تخصيص هذه الصفحة عبر روابط الحملات أو العودة لتصفح المنتجات.',
  },
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeString(value, maxLength = 180) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeNumericValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getProductTimestamp(product) {
  if (!product?.createdAt) return 0;

  const timestamp = new Date(product.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDiscountAmount(product) {
  const compareAtPrice = normalizeNumericValue(product?.compareAtPrice);
  const price = normalizeNumericValue(product?.price);

  if (compareAtPrice <= price || price <= 0) return 0;
  return compareAtPrice - price;
}

function getDiscountRate(product) {
  const compareAtPrice = normalizeNumericValue(product?.compareAtPrice);
  const discountAmount = getDiscountAmount(product);

  if (compareAtPrice <= 0 || discountAmount <= 0) return 0;
  return discountAmount / compareAtPrice;
}

function getPopularityScore(product) {
  const reviewCount = normalizeNumericValue(product?.reviewCount);
  const avgRating = normalizeNumericValue(product?.avgRating);
  const discountRate = getDiscountRate(product);

  return (reviewCount * 12) + (avgRating * 15) + (discountRate * 100);
}

function getInstallmentFitScore(product) {
  const price = normalizeNumericValue(product?.price);
  const reviewCount = normalizeNumericValue(product?.reviewCount);
  const avgRating = normalizeNumericValue(product?.avgRating);

  return price + (reviewCount * 30) + (avgRating * 50);
}

function sortByScore(products, scoreGetter) {
  return [...products].sort((left, right) => scoreGetter(right) - scoreGetter(left));
}

function dedupeProducts(products = []) {
  const seen = new Set();

  return products.filter((product) => {
    if (!product?._id || seen.has(product._id)) return false;
    seen.add(product._id);
    return true;
  });
}

function getProductCategoryName(product) {
  if (!product?.category) return '';
  if (typeof product.category === 'object') {
    return normalizeString(product.category?.name);
  }

  return normalizeString(product.category);
}

function getCampaignSourceLabel(campaignAttribution = null) {
  const source = normalizeString(campaignAttribution?.utmSource || campaignAttribution?.ref || '', 120);
  return source || 'direct';
}

function buildCampaignLandingTitle(definition, campaignAttribution = null) {
  const message = normalizeString(campaignAttribution?.campaignMessage, 180);
  const campaignName = normalizeString(campaignAttribution?.utmCampaign, 180);

  if (message) {
    return {
      title: message,
      description: 'تم تجهيز هذه الصفحة لتخدم رسالة الحملة الحالية مع الاحتفاظ بمصدر الزيارة حتى لحظة الطلب.',
    };
  }

  if (campaignName) {
    return {
      title: `حملة ${campaignName.replace(/[-_]+/g, ' ')}`,
      description: 'صفحة مخصصة تربط الزيارة الحالية بالحملة وتعرض أفضل المنتجات المناسبة للقرار السريع.',
    };
  }

  return {
    title: definition.title,
    description: definition.description,
  };
}

export function getStorefrontLandingPagePath(slug) {
  return storefrontPath(`/collections/${slug}`);
}

export function getStorefrontLandingPages(campaignAttribution = null) {
  return Object.values(LANDING_PAGE_DEFINITIONS).map((definition) => {
    const isCampaignPage = definition.slug === 'campaign';
    const dynamicCampaignCopy = isCampaignPage
      ? buildCampaignLandingTitle(definition, campaignAttribution)
      : null;

    return {
      ...definition,
      title: dynamicCampaignCopy?.title || definition.title,
      description: dynamicCampaignCopy?.description || definition.description,
      path: getStorefrontLandingPagePath(definition.slug),
    };
  });
}

export function getStorefrontLandingPage(slug, campaignAttribution = null) {
  if (!slug) return null;

  const definition = LANDING_PAGE_DEFINITIONS[slug];
  if (!definition) return null;

  const dynamicCampaignCopy = definition.slug === 'campaign'
    ? buildCampaignLandingTitle(definition, campaignAttribution)
    : null;

  return {
    ...definition,
    title: dynamicCampaignCopy?.title || definition.title,
    description: dynamicCampaignCopy?.description || definition.description,
    path: getStorefrontLandingPagePath(definition.slug),
    sourceLabel: getCampaignSourceLabel(campaignAttribution),
  };
}

export function selectStorefrontLandingProducts(slug, products = [], campaignAttribution = null) {
  const normalizedProducts = dedupeProducts(products).filter((product) => product?.isActive !== false);

  if (normalizedProducts.length === 0) return [];

  if (slug === 'seasonal') {
    const discountedProducts = sortByScore(
      normalizedProducts.filter((product) => getDiscountAmount(product) > 0),
      (product) => (getDiscountRate(product) * 1000) + getPopularityScore(product) + getProductTimestamp(product)
    );

    return dedupeProducts([
      ...discountedProducts,
      ...sortByScore(normalizedProducts, (product) => getProductTimestamp(product)),
    ]).slice(0, 12);
  }

  if (slug === 'best-sellers') {
    return sortByScore(
      normalizedProducts,
      (product) => getPopularityScore(product) + (normalizeNumericValue(product?.stock?.quantity) > 0 ? 25 : 0)
    ).slice(0, 12);
  }

  if (slug === 'installments') {
    const installmentProducts = normalizedProducts.filter((product) => {
      const price = normalizeNumericValue(product?.price);
      return price >= INSTALLMENT_PRICE_FLOOR && normalizeNumericValue(product?.stock?.quantity) > 0;
    });

    return sortByScore(
      installmentProducts.length > 0 ? installmentProducts : normalizedProducts,
      (product) => getInstallmentFitScore(product)
    ).slice(0, 12);
  }

  if (slug === 'campaign') {
    const preferredCategory = normalizeString(campaignAttribution?.utmContent, 120).toLowerCase();
    const campaignSortedProducts = sortByScore(normalizedProducts, (product) => {
      const categoryName = getProductCategoryName(product).toLowerCase();
      const categoryBoost = preferredCategory && categoryName && categoryName.includes(preferredCategory) ? 80 : 0;
      return categoryBoost + getPopularityScore(product) + (getDiscountRate(product) * 80) + getProductTimestamp(product);
    });

    return campaignSortedProducts.slice(0, 12);
  }

  return normalizedProducts.slice(0, 12);
}

export function trackStorefrontLandingPageView(slug, campaignAttribution = null) {
  if (!canUseStorage() || !slug) return;

  try {
    const rawViews = window.localStorage.getItem(STOREFRONT_LANDING_VIEWS_KEY);
    const existingViews = rawViews ? JSON.parse(rawViews) : [];
    const nextViews = [
      ...(Array.isArray(existingViews) ? existingViews : []),
      {
        slug: normalizeString(slug, 80),
        source: getCampaignSourceLabel(campaignAttribution),
        medium: normalizeString(campaignAttribution?.utmMedium, 120) || 'storefront',
        campaign: normalizeString(campaignAttribution?.utmCampaign || campaignAttribution?.campaignMessage, 180),
        viewedAt: new Date().toISOString(),
      },
    ].slice(-MAX_STOREFRONT_LANDING_VIEWS);

    window.localStorage.setItem(STOREFRONT_LANDING_VIEWS_KEY, JSON.stringify(nextViews));
  } catch (error) {
    // Ignore storage quota / privacy mode failures.
  }
}
