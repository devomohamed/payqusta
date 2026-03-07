import { getCategoryIconSuggestions } from '../utils/aiHelper';

const FALLBACK_CATEGORY_BLUEPRINTS = [
  {
    key: 'electronics',
    name: 'الإلكترونيات',
    icon: '💻',
    accent: 'from-sky-500/15 via-cyan-500/10 to-white',
    border: 'border-sky-100',
    children: ['شاشات', 'لابتوبات', 'إكسسوارات'],
    products: [
      { name: 'لابتوب أعمال', price: 28999, originalPrice: 31999 },
      { name: 'شاشة 27 بوصة', price: 8999, originalPrice: 9999 },
      { name: 'سماعات لاسلكية', price: 1499, originalPrice: 1799 },
    ],
  },
  {
    key: 'fashion',
    name: 'الأزياء',
    icon: '👗',
    accent: 'from-rose-500/15 via-pink-500/10 to-white',
    border: 'border-rose-100',
    children: ['حريمي', 'رجالي', 'أطفال'],
    products: [
      { name: 'فستان سواريه', price: 2499, originalPrice: 2899 },
      { name: 'بدلة رجالي', price: 3599, originalPrice: 4199 },
      { name: 'طقم أطفال', price: 899, originalPrice: 1099 },
    ],
  },
  {
    key: 'home',
    name: 'المنزل',
    icon: '🏠',
    accent: 'from-emerald-500/15 via-teal-500/10 to-white',
    border: 'border-emerald-100',
    children: ['مطبخ', 'ديكور', 'مفروشات'],
    products: [
      { name: 'طقم طاولة قهوة', price: 1799, originalPrice: 2199 },
      { name: 'إضاءة ديكور', price: 699, originalPrice: 849 },
      { name: 'مخدة ميموري فوم', price: 549, originalPrice: 699 },
    ],
  },
  {
    key: 'beauty',
    name: 'العناية والجمال',
    icon: '🧴',
    accent: 'from-amber-500/15 via-yellow-500/10 to-white',
    border: 'border-amber-100',
    children: ['عطور', 'مكياج', 'عناية'],
    products: [
      { name: 'مجموعة عناية يومية', price: 799, originalPrice: 999 },
      { name: 'عطر ثابت', price: 1299, originalPrice: 1499 },
      { name: 'باليت مكياج', price: 649, originalPrice: 799 },
    ],
  },
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ');
}

function dedupeById(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item?.id || item?._id || item?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flattenCategories(categories = []) {
  if (!Array.isArray(categories)) return [];

  return categories.flatMap((category) => {
    const children = Array.isArray(category?.children) ? category.children : [];
    return [category, ...children];
  });
}

function resolveBlueprint(categoryName, index = 0) {
  const normalizedCategoryName = normalizeText(categoryName);
  const exactMatch = FALLBACK_CATEGORY_BLUEPRINTS.find((blueprint) => (
    normalizeText(blueprint.name) === normalizedCategoryName
    || blueprint.children.some((child) => normalizeText(child) === normalizedCategoryName)
  ));

  if (exactMatch) return exactMatch;

  const partialMatch = FALLBACK_CATEGORY_BLUEPRINTS.find((blueprint) => (
    normalizedCategoryName.includes(normalizeText(blueprint.name))
    || normalizeText(blueprint.name).includes(normalizedCategoryName)
  ));

  if (partialMatch) return partialMatch;

  return FALLBACK_CATEGORY_BLUEPRINTS[index % FALLBACK_CATEGORY_BLUEPRINTS.length];
}

export function buildStorefrontCategorySections(categories = []) {
  const topLevelCategories = Array.isArray(categories) && categories.length > 0
    ? categories.filter((category) => category && !category.parent)
    : [];

  const sections = topLevelCategories.map((category, index) => {
    const blueprint = resolveBlueprint(category?.name, index);
    const icon = category?.icon || getCategoryIconSuggestions(category?.name, 1)[0] || blueprint.icon;
    const children = Array.isArray(category?.children) ? category.children : [];

    return {
      id: category?._id || category?.slug || `category-${index}`,
      _id: category?._id || category?.slug || `category-${index}`,
      name: category?.name || blueprint.name,
      icon,
      accent: blueprint.accent,
      border: blueprint.border,
      children: children.map((child) => ({
        id: child?._id || child?.slug || `${category?._id || index}-${child?.name || 'child'}`,
        _id: child?._id || child?.slug || `${category?._id || index}-${child?.name || 'child'}`,
        name: child?.name || '',
        icon: child?.icon || getCategoryIconSuggestions(child?.name, 1)[0] || icon,
      })),
      isFallback: false,
    };
  });

  if (sections.length > 0) {
    return sections;
  }

  return FALLBACK_CATEGORY_BLUEPRINTS.slice(0, 3).map((blueprint, index) => ({
    id: `showcase-category-${blueprint.key}-${index}`,
    _id: `showcase-category-${blueprint.key}-${index}`,
    name: blueprint.name,
    icon: blueprint.icon,
    accent: blueprint.accent,
    border: blueprint.border,
    children: blueprint.children.map((child, childIndex) => ({
      id: `showcase-category-${blueprint.key}-${childIndex}`,
      _id: `showcase-category-${blueprint.key}-${childIndex}`,
      name: child,
      icon: getCategoryIconSuggestions(child, 1)[0] || blueprint.icon,
    })),
    isFallback: true,
  }));
}

export function buildStorefrontShowcaseProducts(categories = [], limit = 8) {
  const sections = buildStorefrontCategorySections(categories);
  const products = [];

  sections.forEach((section, sectionIndex) => {
    const blueprint = resolveBlueprint(section.name, sectionIndex);
    const productTemplates = blueprint.products.length > 0 ? blueprint.products : FALLBACK_CATEGORY_BLUEPRINTS[0].products;

    productTemplates.forEach((template, templateIndex) => {
      products.push({
        _id: `showcase-product-${sectionIndex}-${templateIndex}`,
        slug: `showcase-product-${sectionIndex}-${templateIndex}`,
        name: template.name,
        price: template.price,
        originalPrice: template.originalPrice,
        stock: { quantity: 12 },
        category: {
          _id: section.id,
          name: section.name,
          icon: section.icon,
        },
        images: [],
        thumbnail: null,
        reviewCount: 0,
        avgRating: 0,
        hasVariants: false,
        isNew: templateIndex === 0,
        isShowcasePlaceholder: true,
        showcaseLabel: 'عرض توضيحي',
      });
    });
  });

  const uniqueProducts = dedupeById(products);

  if (uniqueProducts.length >= limit) {
    return uniqueProducts.slice(0, limit);
  }

  const allBlueprintProducts = FALLBACK_CATEGORY_BLUEPRINTS.flatMap((blueprint, blueprintIndex) => (
    blueprint.products.map((template, templateIndex) => ({
      _id: `fallback-showcase-${blueprintIndex}-${templateIndex}`,
      slug: `fallback-showcase-${blueprintIndex}-${templateIndex}`,
      name: template.name,
      price: template.price,
      originalPrice: template.originalPrice,
      stock: { quantity: 12 },
      category: {
        _id: `fallback-category-${blueprint.key}`,
        name: blueprint.name,
        icon: blueprint.icon,
      },
      images: [],
      thumbnail: null,
      reviewCount: 0,
      avgRating: 0,
      hasVariants: false,
      isNew: templateIndex === 0,
      isShowcasePlaceholder: true,
      showcaseLabel: 'عرض توضيحي',
    }))
  ));

  return dedupeById([...uniqueProducts, ...allBlueprintProducts]).slice(0, limit);
}

export function getStorefrontSuggestedSearchCategories(categories = []) {
  return flattenCategories(categories).slice(0, 8);
}
