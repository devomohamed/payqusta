const fs = require('fs');
const path = require('path');

const homeKeywords = [
  'PayQusta', 'payqusta', 'pay qusta', 'pay qousta', 'بيكوستا', 'باي كوستا',
  'منصة تجارة إلكترونية', 'منصة إنشاء متجر إلكتروني', 'برنامج إدارة متجر إلكتروني',
  'نظام إدارة المبيعات والمخزون', 'برنامج الفواتير والمخزون', 'منصة إدارة الطلبات والعملاء',
  'بوابة عملاء للمتجر', 'منصة متعددة المتاجر',
];

const pageKeywords = {
  '/sales-management': [
    'أفضل نظام إدارة المبيعات والمخزون', 'سعر نظام إدارة المبيعات والمخزون', 'تكلفة نظام إدارة المبيعات والمخزون', 'تجربة نظام إدارة المبيعات والمخزون',
    'أفضل برنامج الفواتير والمخزون', 'سعر برنامج الفواتير والمخزون', 'تكلفة برنامج الفواتير والمخزون', 'تجربة برنامج الفواتير والمخزون',
    'أفضل منصة إدارة الطلبات والعملاء', 'سعر منصة إدارة الطلبات والعملاء', 'تجربة منصة إدارة الطلبات والعملاء',
    'برنامج إدارة العملاء والفواتير', 'أفضل برنامج إدارة العملاء والفواتير', 'منصة تقارير المبيعات',
  ],
  '/inventory-management': [
    'برنامج إدارة متجر إلكتروني', 'أفضل برنامج إدارة متجر إلكتروني', 'سعر برنامج إدارة متجر إلكتروني', 'تجربة برنامج إدارة متجر إلكتروني',
    'نظام الموردين والمخزون', 'أفضل نظام الموردين والمخزون', 'سعر نظام الموردين والمخزون',
    'منصة إدارة المتجر أونلاين', 'أفضل منصة إدارة المتجر أونلاين', 'لوحة تحكم للتجار', 'أفضل لوحة تحكم للتجار',
    'برنامج الفواتير والمخزون', 'أفضل برنامج الفواتير والمخزون', 'نظام إدارة المبيعات والمخزون',
  ],
  '/installments-management': [
    'برنامج إدارة العملاء والفواتير', 'أفضل برنامج إدارة العملاء والفواتير', 'سعر برنامج إدارة العملاء والفواتير',
    'حل إدارة المتجر والفواتير', 'أفضل حل إدارة المتجر والفواتير', 'سعر حل إدارة المتجر والفواتير',
    'برنامج الفواتير والمخزون', 'تكلفة برنامج الفواتير والمخزون', 'تجربة برنامج الفواتير والمخزون',
    'منصة تقارير المبيعات', 'أفضل منصة تقارير المبيعات', 'منصة اشتراكات للتجار',
  ],
  '/pos-system': [
    'لوحة تحكم للتجار', 'أفضل لوحة تحكم للتجار', 'سعر لوحة تحكم للتجار',
    'برنامج متابعة الطلبات', 'أفضل برنامج متابعة الطلبات', 'سعر برنامج متابعة الطلبات',
    'نظام إدارة المبيعات والمخزون', 'شراء نظام إدارة المبيعات والمخزون', 'حل نظام إدارة المبيعات والمخزون',
    'برنامج إدارة العملاء والفواتير', 'شراء برنامج إدارة العملاء والفواتير', 'تجربة برنامج إدارة العملاء والفواتير',
  ],
  '/ecommerce-platform': [
    'منصة تجارة إلكترونية', 'أفضل منصة تجارة إلكترونية', 'سعر منصة تجارة إلكترونية', 'تكلفة منصة تجارة إلكترونية', 'تجربة منصة تجارة إلكترونية',
    'منصة إنشاء متجر إلكتروني', 'أفضل منصة إنشاء متجر إلكتروني', 'سعر منصة إنشاء متجر إلكتروني', 'تكلفة منصة إنشاء متجر إلكتروني', 'تجربة منصة إنشاء متجر إلكتروني',
    'برنامج إدارة متجر إلكتروني', 'أفضل برنامج إدارة متجر إلكتروني', 'سعر برنامج إدارة متجر إلكتروني',
    'برنامج catalog و cart', 'منصة checkout للمتاجر', 'حل storefront و customer portal',
  ],
  '/pricing': [
    'سعر منصة تجارة إلكترونية', 'تكلفة منصة تجارة إلكترونية', 'اشتراك منصة تجارة إلكترونية',
    'سعر منصة إنشاء متجر إلكتروني', 'تكلفة منصة إنشاء متجر إلكتروني', 'اشتراك منصة إنشاء متجر إلكتروني',
    'سعر برنامج إدارة متجر إلكتروني', 'تكلفة برنامج إدارة متجر إلكتروني', 'منصة اشتراكات للتجار',
  ],
  '/demo': [
    'تجربة منصة تجارة إلكترونية', 'مقارنة منصة تجارة إلكترونية', 'بديل منصة تجارة إلكترونية',
    'تجربة منصة إنشاء متجر إلكتروني', 'مقارنة منصة إنشاء متجر إلكتروني', 'بديل منصة إنشاء متجر إلكتروني',
    'تجربة برنامج إدارة متجر إلكتروني', 'مقارنة برنامج إدارة متجر إلكتروني', 'بديل برنامج إدارة متجر إلكتروني',
  ],
};

function formatKeywords(keywords, indent = '    ') {
  return `${indent}keywords: [\r\n${keywords.map((keyword) => `${indent}  ${JSON.stringify(keyword)},`).join('\r\n')}\r\n${indent}],\r\n`;
}

function injectHomeKeywords(source) {
  const start = source.indexOf("  '/': {");
  const end = source.indexOf("  '/features':", start);
  const segment = source.slice(start, end);
  if (segment.includes('keywords: [')) return source;
  const next = segment.replace(/(\s+description:\s*'[^']*',\r?\n)/, `$1${formatKeywords(homeKeywords)}`);
  if (next === segment) throw new Error('Home description line not found');
  return source.slice(0, start) + next + source.slice(end);
}

function injectPageKeywords(source, pagePath, keywords) {
  const pathNeedle = `    path: '${pagePath}',`;
  const start = source.indexOf(pathNeedle);
  if (start === -1) throw new Error(`Page ${pagePath} not found`);
  const end = source.indexOf('    heroTitle:', start);
  const segment = source.slice(start, end);
  if (segment.includes('keywords: [')) return source;
  const next = segment.replace(/(\s+description:\s*(?:`[^`]*`|'[^']*'),\r?\n)/, `$1${formatKeywords(keywords)}`);
  if (next === segment) throw new Error(`Description line for ${pagePath} not found`);
  return source.slice(0, start) + next + source.slice(end);
}

function updateIndexKeywords(source) {
  return source.replace(/<meta name="keywords" content="[^"]*" \/>/, '<meta name="keywords" content="PayQusta, payqusta, pay qusta, pay qousta, بيكوستا, باي كوستا, منصة تجارة إلكترونية, منصة إنشاء متجر إلكتروني, برنامج إدارة متجر إلكتروني, نظام إدارة المبيعات والمخزون, برنامج الفواتير والمخزون, منصة إدارة الطلبات والعملاء, بوابة عملاء للمتجر, منصة متعددة المتاجر" />');
}

const contentPath = path.join(process.cwd(), 'frontend', 'src', 'publicSite', 'content.js');
let contentSource = fs.readFileSync(contentPath, 'utf8');
contentSource = injectHomeKeywords(contentSource);
fs.writeFileSync(contentPath, contentSource, 'utf8');

const seoPath = path.join(process.cwd(), 'frontend', 'src', 'publicSite', 'seoLandingPages.js');
let seoSource = fs.readFileSync(seoPath, 'utf8');
for (const [pagePath, keywords] of Object.entries(pageKeywords)) {
  seoSource = injectPageKeywords(seoSource, pagePath, keywords);
}
fs.writeFileSync(seoPath, seoSource, 'utf8');

const indexPath = path.join(process.cwd(), 'frontend', 'index.html');
let indexSource = fs.readFileSync(indexPath, 'utf8');
indexSource = updateIndexKeywords(indexSource);
fs.writeFileSync(indexPath, indexSource, 'utf8');

console.log('Injected keyword clusters into homepage and SEO pages.');
