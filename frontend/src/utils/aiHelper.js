/**
 * AI Helper Utility
 * Provides intelligent suggestions based on keywords
 */

const CATEGORY_ICONS = {
    // Arabic Keywords
    'ملابس': '👕',
    'أزياء': '👗',
    'رجالي': '👔',
    'حريمي': '👗',
    'أطفال': '👶',
    'أحذية': '👟',
    'شنط': '👜',
    'ساعات': '⌚',
    'نظارات': '🕶️',
    'إلكترونيات': '💻',
    'موبايل': '📱',
    'هواتف': '📱',
    'كمبيوتر': '💻',
    'لابتوب': '💻',
    'تابلت': '📱',
    'كاميرات': '📷',
    'ألعاب': '🎮',
    'سماعات': '🎧',
    'إكسسوارات': '💍',
    'عطور': '🧴',
    'مكياج': '💄',
    'تجميل': '💅',
    'عناية': '🧼',
    'منظفات': '🧴',
    'طعام': '🌯',
    'أغذية': '🍏',
    'خضروات': '🥦',
    'فواكه': '🍎',
    'لحوم': '🥩',
    'ألبان': '🥛',
    'مشروبات': '🥤',
    'حلويات': '🍰',
    'مخبوزات': '🍞',
    'أدوات': '🔧',
    'منزل': '🏠',
    'أثاث': '🛋️',
    'ديكور': '🖼️',
    'مطبخ': '🍳',
    'أجهزة': '🔌',
    'سيارات': '🚗',
    'دراجات': '🚲',
    'رياضة': '⚽',
    'صحة': '🏥',
    'صيدلية': '💊',
    'كتب': '📚',
    'قرطاسية': '✏️',
    'مكتبة': '📖',
    'هدايا': '🎁',
    'حيوانات': '🐶',
    'ألعاب أطفال': '🧸',
    'خدمات': '🛠️',
    'شحن': '🚚',
    'كهرباء': '⚡',
    'نجارة': '🔨',
    'سباكة': '🔧',

    // English Keywords
    'clothes': '👕',
    'clothing': '👕',
    'fashion': '👗',
    'men': '👔',
    'women': '👗',
    'kids': '👶',
    'shoes': '👟',
    'bags': '👜',
    'watch': '⌚',
    'glasses': '🕶️',
    'electronics': '💻',
    'mobile': '📱',
    'phone': '📱',
    'computer': '💻',
    'laptop': '💻',
    'tablet': '📱',
    'camera': '📷',
    'games': '🎮',
    'gaming': '🎮',
    'headphones': '🎧',
    'accessories': '💍',
    'perfume': '🧴',
    'makeup': '💄',
    'beauty': '💅',
    'care': '🧼',
    'cleaning': '🧴',
    'food': '🌯',
    'groceries': '🍏',
    'vegetables': '🥦',
    'fruits': '🍎',
    'meat': '🥩',
    'dairy': '🥛',
    'drinks': '🥤',
    'sweets': '🍰',
    'bakery': '🍞',
    'tools': '🔧',
    'home': '🏠',
    'furniture': '🛋️',
    'decor': '🖼️',
    'kitchen': '🍳',
    'appliances': '🔌',
    'car': '🚗',
    'bike': '🚲',
    'sports': '⚽',
    'health': '🏥',
    'pharmacy': '💊',
    'books': '📚',
    'stationery': '✏️',
    'gifts': '🎁',
    'pets': '🐶',
    'toys': '🧸',
    'services': '🛠️',
    'shipping': '🚚',
    'electricity': '⚡',
};

/**
 * Suggest an icon based on category name
 * @param {string} name 
 * @returns {string|null}
 */
export const getIconForCategory = (name) => {
    if (!name) return null;
    const lowerName = name.toLowerCase().trim();

    // Direct match
    if (CATEGORY_ICONS[lowerName]) return CATEGORY_ICONS[lowerName];

    // Word match
    const words = lowerName.split(/\s+/);
    for (const word of words) {
        if (CATEGORY_ICONS[word]) return CATEGORY_ICONS[word];
    }

    // Partial match
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return icon;
        }
    }

    return null;
};
