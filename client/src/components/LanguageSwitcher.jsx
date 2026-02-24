import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

    const toggleLanguage = useCallback(() => {
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        const newDir = newLang === 'ar' ? 'rtl' : 'ltr';

        // Set document direction IMMEDIATELY before language change
        document.documentElement.dir = newDir;
        document.documentElement.lang = newLang;

        // Then change the language (this triggers React re-renders)
        i18n.changeLanguage(newLang);
    }, [currentLang, i18n]);

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-2 p-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shadow-sm"
            title={currentLang === 'ar' ? 'Switch to English' : 'التبديل للغة العربية'}
        >
            <Globe className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {currentLang === 'ar' ? 'EN' : 'عربي'}
            </span>
        </button>
    );
}
