/**
 * Smart category icon helpers.
 * The app stores icons as text, so we use curated icon suggestions based on the section name.
 */

const DEFAULT_CATEGORY_ICON = '📦';

const FALLBACK_ICON_SEQUENCE = ['🛍️', '💻', '👗', '🏠', '🎁', '🍽️', '🧴', '🧒', '🏃', '🔌'];

const ICON_LIBRARY = [
  { icon: '💻', keywords: ['الكترونيات', 'إلكترونيات', 'electronics', 'tech', 'technology', 'computer'] },
  { icon: '🖥️', keywords: ['شاشات', 'screen', 'screens', 'monitor', 'display', 'tv', 'television'] },
  { icon: '💼', keywords: ['لابتوب', 'لابتوبات', 'laptop', 'laptops', 'notebook'] },
  { icon: '📱', keywords: ['موبايل', 'هواتف', 'هاتف', 'جوال', 'mobile', 'phone', 'smartphone'] },
  { icon: '🎧', keywords: ['سماعات', 'headphones', 'earbuds', 'audio'] },
  { icon: '🔌', keywords: ['إكسسوارات', 'اكسسوارات', 'accessories', 'charger', 'cable', 'adapter'] },
  { icon: '⌚', keywords: ['ساعات', 'watch', 'watches', 'smartwatch'] },
  { icon: '📷', keywords: ['كاميرات', 'camera', 'cameras', 'lens'] },
  { icon: '🎮', keywords: ['العاب', 'ألعاب', 'gaming', 'games', 'console'] },

  { icon: '👗', keywords: ['ملابس', 'أزياء', 'ازياء', 'fashion', 'clothes', 'clothing', 'apparel'] },
  { icon: '👚', keywords: ['حريمي', 'نساء', 'نسائي', 'women', 'ladies', 'female'] },
  { icon: '🧥', keywords: ['رجالي', 'رجال', 'mens', 'men', 'male', 'جاكيت', 'coat'] },
  { icon: '🧒', keywords: ['اطفال', 'أطفال', 'kids', 'children', 'baby', 'babies'] },
  { icon: '👠', keywords: ['سواريه', 'سوارية', 'heels', 'evening', 'party dress'] },
  { icon: '🩱', keywords: ['لانجري', 'lingerie', 'sleepwear'] },
  { icon: '🛏️', keywords: ['بيتي', 'راحة', 'homewear', 'loungewear', 'pajama', 'nightwear'] },
  { icon: '🤵', keywords: ['بدل', 'بدل رسمية', 'formal', 'suits', 'suit'] },
  { icon: '👕', keywords: ['كاجول', 'كاجوال', 'casual', 'basic', 'tee', 'tshirt'] },
  { icon: '🧦', keywords: ['داخلية', 'ملابس داخلية', 'underwear', 'innerwear', 'socks'] },
  { icon: '🧢', keywords: ['شبابي', 'caps', 'sportwear', 'streetwear'] },
  { icon: '👟', keywords: ['احذية', 'أحذية', 'shoes', 'sneakers', 'boots'] },
  { icon: '👜', keywords: ['شنط', 'bags', 'bag', 'purse'] },
  { icon: '💍', keywords: ['اكسسوارات حريمي', 'jewelry', 'jewellery', 'bracelet', 'ring'] },

  { icon: '🏠', keywords: ['منزل', 'home', 'house', 'living'] },
  { icon: '🛋️', keywords: ['اثاث', 'أثاث', 'furniture', 'sofa', 'decor'] },
  { icon: '🍳', keywords: ['مطبخ', 'kitchen', 'cookware'] },
  { icon: '🛏️', keywords: ['غرف نوم', 'bedroom', 'mattress', 'bedding'] },
  { icon: '🪑', keywords: ['مكتب', 'office', 'desk', 'chair'] },

  { icon: '🍽️', keywords: ['مطاعم', 'restaurant', 'restaurants', 'food', 'dining'] },
  { icon: '☕', keywords: ['مشروبات', 'drinks', 'coffee', 'cafe', 'beverages'] },
  { icon: '🍰', keywords: ['حلويات', 'dessert', 'desserts', 'sweets', 'cake'] },
  { icon: '🥬', keywords: ['بقالة', 'groceries', 'grocery', 'vegetables', 'خضار', 'فواكه'] },

  { icon: '🧴', keywords: ['عناية', 'beauty', 'makeup', 'care', 'cosmetics', 'skincare'] },
  { icon: '🧼', keywords: ['منظفات', 'cleaning', 'sanitizer'] },
  { icon: '💄', keywords: ['مكياج', 'lipstick', 'palette'] },
  { icon: '🧴', keywords: ['عطور', 'perfume', 'fragrance'] },

  { icon: '🏃', keywords: ['رياضة', 'sports', 'fitness', 'gym'] },
  { icon: '🎒', keywords: ['مدرسة', 'school', 'stationery', 'قرطاسية', 'student'] },
  { icon: '📚', keywords: ['كتب', 'books', 'bookstore', 'library'] },
  { icon: '🎁', keywords: ['هدايا', 'gift', 'gifts'] },
  { icon: '🐾', keywords: ['حيوانات', 'pets', 'pet'] },
  { icon: '🚗', keywords: ['سيارات', 'car', 'cars', 'automotive'] },
  { icon: '🛠️', keywords: ['ادوات', 'أدوات', 'tools', 'hardware', 'service', 'services'] },
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ');
}

function scoreIcon(iconEntry, normalizedName, tokens) {
  let score = 0;

  for (const keyword of iconEntry.keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) continue;

    if (normalizedName === normalizedKeyword) {
      score += 8;
      continue;
    }

    if (tokens.includes(normalizedKeyword)) {
      score += 5;
      continue;
    }

    if (normalizedName.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedName)) {
      score += 3;
      continue;
    }

    if (tokens.some((token) => token.includes(normalizedKeyword) || normalizedKeyword.includes(token))) {
      score += 2;
    }
  }

  return score;
}

export function getCategoryIconSuggestions(name, limit = 8) {
  const normalizedName = normalizeText(name);
  const tokens = normalizedName ? normalizedName.split(' ') : [];

  const rankedIcons = ICON_LIBRARY
    .map((entry) => ({ icon: entry.icon, score: scoreIcon(entry, normalizedName, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const orderedIcons = [];
  const seen = new Set();

  for (const entry of rankedIcons) {
    if (seen.has(entry.icon)) continue;
    seen.add(entry.icon);
    orderedIcons.push(entry.icon);
  }

  for (const fallbackIcon of FALLBACK_ICON_SEQUENCE) {
    if (seen.has(fallbackIcon)) continue;
    seen.add(fallbackIcon);
    orderedIcons.push(fallbackIcon);
  }

  return orderedIcons.slice(0, Math.max(1, limit));
}

export function getIconForCategory(name) {
  return getCategoryIconSuggestions(name, 1)[0] || DEFAULT_CATEGORY_ICON;
}

export { DEFAULT_CATEGORY_ICON };
