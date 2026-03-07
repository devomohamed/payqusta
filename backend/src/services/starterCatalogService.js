const Tenant = require('../models/Tenant');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { STOCK_STATUS } = require('../config/constants');

const STARTER_CATEGORY_SETTINGS = Object.freeze([
  { name: 'الإلكترونيات', isVisible: true },
  { name: 'الأزياء', isVisible: true },
  { name: 'المنزل', isVisible: true },
  { name: 'العناية والجمال', isVisible: true },
]);

const STARTER_CATALOG_BLUEPRINTS = [
  {
    key: 'electronics',
    name: 'الإلكترونيات',
    icon: '💻',
    description: 'قسم رئيسي للأجهزة الذكية والإكسسوارات التقنية.',
    children: [
      { key: 'screens', name: 'شاشات', icon: '🖥️', description: 'شاشات عرض ومتابعة احترافية.' },
      { key: 'laptops', name: 'لابتوبات', icon: '💼', description: 'أجهزة لابتوب للعمل والدراسة.' },
      { key: 'accessories', name: 'إكسسوارات', icon: '🎧', description: 'ملحقات وإكسسوارات إلكترونية.' },
    ],
    products: [
      {
        sku: 'ST-ELEC-LAP-001',
        barcode: '2800000001001',
        name: 'لابتوب أعمال 15 بوصة',
        subcategoryKey: 'laptops',
        price: 28999,
        compareAtPrice: 31999,
        cost: 24400,
        wholesalePrice: 27250,
        shippingCost: 150,
        stockQuantity: 14,
        minQuantity: 3,
        description: 'لابتوب عملي بمعالج سريع وذاكرة مناسبة للعمل المكتبي والدراسة اليومية.',
        seoTitle: 'لابتوب أعمال 15 بوصة',
        seoDescription: 'لابتوب عملي مناسب للشركات والدراسة بسعر جاهز للبيع داخل متجرك.',
        tags: ['لابتوب', 'أعمال', 'إلكترونيات'],
      },
      {
        sku: 'ST-ELEC-SCR-001',
        barcode: '2800000001002',
        name: 'شاشة احترافية 27 بوصة',
        subcategoryKey: 'screens',
        price: 8999,
        compareAtPrice: 9999,
        cost: 7450,
        wholesalePrice: 8350,
        shippingCost: 95,
        stockQuantity: 22,
        minQuantity: 4,
        description: 'شاشة عالية الوضوح مناسبة للمكاتب، نقاط البيع، والاستخدام الاحترافي.',
        seoTitle: 'شاشة احترافية 27 بوصة',
        seoDescription: 'شاشة واضحة وعملية لعرض المحتوى والعمل اليومي داخل متجر الإلكترونيات.',
        tags: ['شاشات', 'مكاتب', 'إلكترونيات'],
      },
      {
        sku: 'ST-ELEC-ACC-001',
        barcode: '2800000001003',
        name: 'سماعات لاسلكية بلوتوث',
        subcategoryKey: 'accessories',
        price: 1499,
        compareAtPrice: 1799,
        cost: 980,
        wholesalePrice: 1320,
        shippingCost: 45,
        stockQuantity: 36,
        minQuantity: 6,
        description: 'سماعات خفيفة بصوت نقي مناسبة للبيع السريع والعروض اليومية.',
        seoTitle: 'سماعات لاسلكية بلوتوث',
        seoDescription: 'سماعات بلوتوث عملية وهامش ربح جيد للعرض في المتجر الإلكتروني.',
        tags: ['سماعات', 'بلوتوث', 'إكسسوارات'],
      },
    ],
  },
  {
    key: 'fashion',
    name: 'الأزياء',
    icon: '👗',
    description: 'قسم رئيسي لمنتجات الملابس الرجالي والحريمي والأطفال.',
    children: [
      { key: 'women', name: 'حريمي', icon: '👠', description: 'ملابس وموديلات نسائية متنوعة.' },
      { key: 'men', name: 'رجالي', icon: '👔', description: 'ملابس رجالي كلاسيك وكاجوال.' },
      { key: 'kids', name: 'أطفال', icon: '🧒', description: 'ملابس عملية ومريحة للأطفال.' },
    ],
    products: [
      {
        sku: 'ST-FASH-WOM-001',
        barcode: '2800000002001',
        name: 'فستان سواريه راقٍ',
        subcategoryKey: 'women',
        price: 2499,
        compareAtPrice: 2899,
        cost: 1780,
        wholesalePrice: 2240,
        shippingCost: 60,
        stockQuantity: 18,
        minQuantity: 4,
        description: 'فستان مناسب للمناسبات بتصميم أنيق وخامة مريحة لعرض قسم الحريمي.',
        seoTitle: 'فستان سواريه راقٍ',
        seoDescription: 'منتج جاهز للبيع داخل قسم الحريمي ليظهر تنوع متجر الملابس بشكل احترافي.',
        tags: ['سواريه', 'حريمي', 'ملابس'],
      },
      {
        sku: 'ST-FASH-MEN-001',
        barcode: '2800000002002',
        name: 'بدلة رجالي كلاسيك',
        subcategoryKey: 'men',
        price: 3599,
        compareAtPrice: 4199,
        cost: 2860,
        wholesalePrice: 3340,
        shippingCost: 80,
        stockQuantity: 11,
        minQuantity: 2,
        description: 'بدلة رجالي رسمية مناسبة للمكاتب والمناسبات ضمن قسم الرجالي.',
        seoTitle: 'بدلة رجالي كلاسيك',
        seoDescription: 'بدلة رجالي أنيقة ترفع قيمة العرض داخل متجر الملابس وتظهر تنوع التصنيف.',
        tags: ['بدل', 'رجالي', 'رسمي'],
      },
      {
        sku: 'ST-FASH-KID-001',
        barcode: '2800000002003',
        name: 'طقم أطفال قطني',
        subcategoryKey: 'kids',
        price: 899,
        compareAtPrice: 1099,
        cost: 590,
        wholesalePrice: 780,
        shippingCost: 40,
        stockQuantity: 28,
        minQuantity: 5,
        description: 'طقم أطفال عملي ومريح مناسب للعرض السريع والمبيعات اليومية.',
        seoTitle: 'طقم أطفال قطني',
        seoDescription: 'منتج أطفال أساسي لبدء عرض قسم الأطفال داخل متجر الملابس.',
        tags: ['أطفال', 'قطن', 'ملابس'],
      },
    ],
  },
  {
    key: 'home',
    name: 'المنزل',
    icon: '🏠',
    description: 'قسم رئيسي لتجهيزات المنزل والديكور والمفروشات.',
    children: [
      { key: 'kitchen', name: 'مطبخ', icon: '🍽️', description: 'مستلزمات تقديم وتحضير للمطبخ.' },
      { key: 'decor', name: 'ديكور', icon: '🪴', description: 'قطع ديكور وإضاءة منزلية.' },
      { key: 'bedding', name: 'مفروشات', icon: '🛏️', description: 'مفروشات وأغطية للمنزل.' },
    ],
    products: [
      {
        sku: 'ST-HOME-KIT-001',
        barcode: '2800000003001',
        name: 'طقم تقديم للمطبخ',
        subcategoryKey: 'kitchen',
        price: 1799,
        compareAtPrice: 2199,
        cost: 1280,
        wholesalePrice: 1620,
        shippingCost: 70,
        stockQuantity: 16,
        minQuantity: 3,
        description: 'طقم تقديم أنيق يعطي قسم المنزل حضورًا واضحًا داخل المتجر.',
        seoTitle: 'طقم تقديم للمطبخ',
        seoDescription: 'منتج منزلي جاهز للبيع لإظهار قسم المطبخ بشكل واقعي وجذاب.',
        tags: ['مطبخ', 'تقديم', 'منزل'],
      },
      {
        sku: 'ST-HOME-DEC-001',
        barcode: '2800000003002',
        name: 'أباجورة ديكور عصرية',
        subcategoryKey: 'decor',
        price: 699,
        compareAtPrice: 849,
        cost: 420,
        wholesalePrice: 620,
        shippingCost: 35,
        stockQuantity: 24,
        minQuantity: 5,
        description: 'قطعة ديكور مناسبة للعروض البصرية وتضيف تنوعًا سريعًا لقسم المنزل.',
        seoTitle: 'أباجورة ديكور عصرية',
        seoDescription: 'قطعة ديكور عملية واقتصادية لعرض قسم الديكور داخل المتجر.',
        tags: ['ديكور', 'إضاءة', 'منزل'],
      },
      {
        sku: 'ST-HOME-BED-001',
        barcode: '2800000003003',
        name: 'مفرش سرير ناعم',
        subcategoryKey: 'bedding',
        price: 549,
        compareAtPrice: 699,
        cost: 360,
        wholesalePrice: 485,
        shippingCost: 30,
        stockQuantity: 31,
        minQuantity: 6,
        description: 'مفرش عملي بخامة ناعمة يوضح جاهزية قسم المفروشات للبيع.',
        seoTitle: 'مفرش سرير ناعم',
        seoDescription: 'منتج مفروشات أساسي لإظهار قسم المنزل بشكل متكامل داخل المتجر.',
        tags: ['مفروشات', 'سرير', 'منزل'],
      },
    ],
  },
  {
    key: 'beauty',
    name: 'العناية والجمال',
    icon: '🧴',
    description: 'قسم رئيسي للعطور ومنتجات العناية والمكياج.',
    children: [
      { key: 'perfumes', name: 'عطور', icon: '🌸', description: 'عطور ثابتة ومجموعات فاخرة.' },
      { key: 'makeup', name: 'مكياج', icon: '💄', description: 'منتجات تجميل واستخدام يومي.' },
      { key: 'care', name: 'عناية', icon: '🧼', description: 'منتجات عناية شخصية وروتين يومي.' },
    ],
    products: [
      {
        sku: 'ST-BEAU-PER-001',
        barcode: '2800000004001',
        name: 'عطر ثابت يومي',
        subcategoryKey: 'perfumes',
        price: 1299,
        compareAtPrice: 1499,
        cost: 860,
        wholesalePrice: 1160,
        shippingCost: 35,
        stockQuantity: 20,
        minQuantity: 4,
        description: 'عطر عملي بثبات جيد ومناسب للمبيعات السريعة داخل قسم العطور.',
        seoTitle: 'عطر ثابت يومي',
        seoDescription: 'عطر جاهز للبيع بهامش جيد لإظهار قسم العطور داخل متجرك.',
        tags: ['عطور', 'جمال', 'عناية'],
      },
      {
        sku: 'ST-BEAU-MAK-001',
        barcode: '2800000004002',
        name: 'طقم مكياج أساسي',
        subcategoryKey: 'makeup',
        price: 649,
        compareAtPrice: 799,
        cost: 390,
        wholesalePrice: 560,
        shippingCost: 25,
        stockQuantity: 27,
        minQuantity: 5,
        description: 'طقم مكياج أساسي مناسب للعرض السريع والعملاء الباحثين عن باقة جاهزة.',
        seoTitle: 'طقم مكياج أساسي',
        seoDescription: 'طقم مكياج جاهز يملأ قسم الجمال بمنتج حقيقي وسهل البيع.',
        tags: ['مكياج', 'تجميل', 'جمال'],
      },
      {
        sku: 'ST-BEAU-CAR-001',
        barcode: '2800000004003',
        name: 'مجموعة عناية يومية',
        subcategoryKey: 'care',
        price: 799,
        compareAtPrice: 999,
        cost: 510,
        wholesalePrice: 710,
        shippingCost: 30,
        stockQuantity: 25,
        minQuantity: 5,
        description: 'مجموعة عناية شخصية جاهزة للعرض في قسم العناية والجمال.',
        seoTitle: 'مجموعة عناية يومية',
        seoDescription: 'باقة عناية متكاملة لعرض قسم العناية بمنتج حقيقي ومناسب للبيع.',
        tags: ['عناية', 'بشرة', 'جمال'],
      },
    ],
  },
];

function getStarterCategorySettings() {
  return STARTER_CATEGORY_SETTINGS.map((item) => ({ ...item }));
}

function mergeCategorySettings(existingCategories = []) {
  const merged = [];
  const seen = new Set();

  [...getStarterCategorySettings(), ...existingCategories].forEach((item) => {
    const name = typeof item === 'string' ? String(item).trim() : String(item?.name || '').trim();
    if (!name || seen.has(name)) return;

    seen.add(name);
    merged.push({
      name,
      isVisible: typeof item === 'string' ? true : item?.isVisible !== false,
    });
  });

  return merged;
}

function resolveStockStatus(quantity, minQuantity) {
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= minQuantity) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

async function upsertCategory({ tenantId, name, slug, icon, parent = null, description = '' }) {
  return Category.findOneAndUpdate(
    {
      tenant: tenantId,
      name,
      parent,
    },
    {
      $setOnInsert: {
        tenant: tenantId,
        name,
        slug,
        icon,
        parent,
        description,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function upsertProduct({ tenantId, category, subcategory, categoryName, template }) {
  const quantity = Number(template.stockQuantity || 0);
  const minQuantity = Number(template.minQuantity || 5);

  return Product.findOneAndUpdate(
    {
      tenant: tenantId,
      sku: template.sku,
    },
    {
      $setOnInsert: {
        tenant: tenantId,
        name: template.name,
        sku: template.sku,
        barcode: template.barcode,
        description: template.description,
        category,
        subcategory,
        categoryName,
        price: template.price,
        compareAtPrice: template.compareAtPrice,
        cost: template.cost,
        wholesalePrice: template.wholesalePrice,
        shippingCost: template.shippingCost,
        stock: {
          quantity,
          minQuantity,
          unit: 'قطعة',
        },
        stockStatus: resolveStockStatus(quantity, minQuantity),
        tags: template.tags || [],
        seoTitle: template.seoTitle,
        seoDescription: template.seoDescription,
        images: [],
        isActive: true,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
}

async function seedStarterCatalogForTenant(tenantId) {
  if (!tenantId) {
    return { seeded: false, reason: 'missing-tenant' };
  }

  const tenant = await Tenant.findById(tenantId).select('settings');
  if (!tenant) {
    return { seeded: false, reason: 'tenant-not-found' };
  }

  if (tenant.settings?.catalogSeededAt) {
    return { seeded: false, reason: 'already-initialized' };
  }

  const existingProductsCount = await Product.countDocuments({ tenant: tenantId });
  if (existingProductsCount > 0) {
    tenant.set('settings.catalogSeededAt', new Date());
    await tenant.save();
    return { seeded: false, reason: 'products-already-exist' };
  }

  const categoryLookup = new Map();

  for (const blueprint of STARTER_CATALOG_BLUEPRINTS) {
    const parentCategory = await upsertCategory({
      tenantId,
      name: blueprint.name,
      slug: blueprint.key,
      icon: blueprint.icon,
      description: blueprint.description,
    });

    categoryLookup.set(blueprint.key, parentCategory);

    for (const child of blueprint.children) {
      const childCategory = await upsertCategory({
        tenantId,
        name: child.name,
        slug: `${blueprint.key}-${child.key}`,
        icon: child.icon || blueprint.icon,
        parent: parentCategory._id,
        description: child.description,
      });

      categoryLookup.set(`${blueprint.key}:${child.key}`, childCategory);
    }
  }

  for (const blueprint of STARTER_CATALOG_BLUEPRINTS) {
    const parentCategory = categoryLookup.get(blueprint.key);

    for (const productTemplate of blueprint.products) {
      const childCategory = categoryLookup.get(`${blueprint.key}:${productTemplate.subcategoryKey}`);

      await upsertProduct({
        tenantId,
        category: parentCategory?._id,
        subcategory: childCategory?._id,
        categoryName: blueprint.name,
        template: productTemplate,
      });
    }
  }

  tenant.set('settings.categories', mergeCategorySettings(tenant.settings?.categories || []));
  tenant.set('settings.catalogSeededAt', new Date());
  await tenant.save();

  return {
    seeded: true,
    categoriesCount: STARTER_CATALOG_BLUEPRINTS.length,
    productsCount: STARTER_CATALOG_BLUEPRINTS.reduce((sum, item) => sum + item.products.length, 0),
  };
}

module.exports = {
  getStarterCategorySettings,
  seedStarterCatalogForTenant,
};
