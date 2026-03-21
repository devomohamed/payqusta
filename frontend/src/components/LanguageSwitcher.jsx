import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';

    const toggleLanguage = useCallback(() => {
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        const newDir = newLang === 'ar' ? 'rtl' : 'ltr';

        document.documentElement.dir = newDir;
        document.documentElement.lang = newLang;
        i18n.changeLanguage(newLang);
    }, [currentLang, i18n]);

    return (
        <button
            onClick={toggleLanguage}
            className="app-surface-muted flex items-center justify-center gap-1.5 rounded-xl border border-gray-100/80 p-2 shadow-sm transition-all hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.05] sm:px-3"
            title={currentLang === 'ar' ? 'Switch to English' : 'Switch to Arabic'}
        >
            <Globe className="w-4 h-4 text-primary-500" />
            <span className="hidden sm:inline text-sm font-bold text-gray-700 dark:text-gray-300">
                {currentLang === 'ar' ? 'EN' : 'AR'}
            </span>
        </button>
    );
}
