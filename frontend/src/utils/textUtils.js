export const transliterateArabicToEnglish = (text) => {
    if (!text) return '';

    const arabicToEnglishMap = {
        'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ء': '', 'ؤ': 'o', 'ئ': 'e',
        'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'g', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
        'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
        'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'ه': 'h', 'ة': 'a', 'و': 'w', 'ي': 'y', 'ى': 'a',
        ' ': '-'
    };

    return text
        .split('')
        .map(char => {
            // If it's an Arabic character in our map, transliterate it
            if (arabicToEnglishMap[char] !== undefined) {
                return arabicToEnglishMap[char];
            }
            // Otherwise, keep the original character if it's alphanumeric or '-'
            return char;
        })
        .join('')
        .toLowerCase()
        // Replace multiple spaces or hyphens with a single hyphen
        .replace(/\s+/g, '-')
        // Clean up anything that isn't a letter, number, or hyphen
        .replace(/[^a-z0-9-]/g, '')
        // Format repeated hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
};
