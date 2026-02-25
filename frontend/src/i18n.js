import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
    .use(HttpApi)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        supportedLngs: ['ar', 'en'],
        fallbackLng: 'ar',
        detection: {
            order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage', 'cookie'],
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        ns: ['common'],
        defaultNS: 'common',
        partialBundledLanguages: true,
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

// Set document direction helper
const setDirection = (lng) => {
    const dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
};

// Set direction on language change
i18n.on('languageChanged', setDirection);

// Also set on initialization
i18n.on('initialized', () => {
    setDirection(i18n.language || 'ar');
});

// Immediately set if already initialized
if (i18n.isInitialized) {
    setDirection(i18n.language || 'ar');
}

export default i18n;

