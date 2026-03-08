import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  getStorefrontBasePath,
  isStorefrontSubdomainHost,
} from '../utils/storefrontHost';
import { applySeoMetadata } from '../utils/seo';

const PLATFORM_NAME = 'PayQusta';
const PLATFORM_DESCRIPTION = 'PayQusta منصة لإنشاء متجر إلكتروني وإدارة المبيعات والمخزون والأقساط والتحصيل من مكان واحد.';

function normalizePath(pathname = '/') {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isStorefrontNoindexPath(pathname) {
  return (
    pathname.endsWith('/cart') ||
    pathname.endsWith('/checkout') ||
    pathname.endsWith('/track-order') ||
    /\/order\/[^/]+$/i.test(pathname)
  );
}

export default function RouteMetadata() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin.replace(/\/+$/, '');
    const pathname = normalizePath(location.pathname || '/');
    const search = location.search || '';
    const currentUrl = `${origin}${pathname}${search}`;
    const rootUrl = `${origin}/`;
    const storeBasePath = normalizePath(getStorefrontBasePath(window.location.hostname) || '/store');
    const onStorefront =
      isStorefrontSubdomainHost(window.location.hostname) ||
      pathname === storeBasePath ||
      pathname.startsWith(`${storeBasePath}/`);

    const logoUrl = `${origin}/favicon.svg`;
    const socialImage = `${origin}/hero-banner.png`;

    if (pathname === '/' && !isAuthenticated) {
      applySeoMetadata({
        title: 'PayQusta | إنشاء متجر إلكتروني وإدارة المبيعات والأقساط',
        description: PLATFORM_DESCRIPTION,
        robots: 'index,follow',
        canonical: rootUrl,
        openGraph: {
          url: rootUrl,
          image: socialImage,
          siteName: PLATFORM_NAME,
        },
        twitter: {
          image: socialImage,
        },
        structuredData: [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: PLATFORM_NAME,
            url: rootUrl,
            logo: logoUrl,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: PLATFORM_NAME,
            url: rootUrl,
            description: PLATFORM_DESCRIPTION,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: PLATFORM_NAME,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EGP',
            },
            description: PLATFORM_DESCRIPTION,
          },
        ],
      });
      return;
    }

    if (onStorefront) {
      const shouldNoindex = isStorefrontNoindexPath(pathname);
      let title = `${PLATFORM_NAME} Store | تسوق أونلاين بسهولة`;
      let description = 'تصفح منتجات المتجر واطلب أونلاين بسهولة عبر تجربة شراء سريعة وواضحة.';

      if (pathname.endsWith('/products')) {
        title = `منتجات المتجر | ${PLATFORM_NAME}`;
        description = 'استعرض المنتجات المتاحة والعروض الجاهزة للطلب من متجر PayQusta.';
      } else if (pathname.endsWith('/about')) {
        title = `عن المتجر | ${PLATFORM_NAME}`;
        description = 'تعرف على معلومات المتجر ووسائل التواصل وسياسة الخدمة.';
      }

      applySeoMetadata({
        title,
        description,
        robots: shouldNoindex ? 'noindex,nofollow' : 'index,follow',
        canonical: shouldNoindex ? null : currentUrl,
        openGraph: {
          title,
          description,
          url: currentUrl,
          image: socialImage,
          siteName: PLATFORM_NAME,
        },
        twitter: {
          title,
          description,
          image: socialImage,
        },
      });
      return;
    }

    let privateTitle = PLATFORM_NAME;
    if (pathname === '/login') {
      privateTitle = `تسجيل الدخول | ${PLATFORM_NAME}`;
    } else if (pathname === '/forgot-password' || pathname.startsWith('/reset-password')) {
      privateTitle = `استعادة الحساب | ${PLATFORM_NAME}`;
    } else if (pathname.startsWith('/portal')) {
      privateTitle = `بوابة العملاء | ${PLATFORM_NAME}`;
    } else if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin')) {
      privateTitle = `لوحة التحكم | ${PLATFORM_NAME}`;
    }

    applySeoMetadata({
      title: privateTitle,
      description: PLATFORM_DESCRIPTION,
      robots: 'noindex,nofollow',
      canonical: null,
      openGraph: {
        title: PLATFORM_NAME,
        description: PLATFORM_DESCRIPTION,
        url: currentUrl,
        image: socialImage,
        siteName: PLATFORM_NAME,
      },
      twitter: {
        title: PLATFORM_NAME,
        description: PLATFORM_DESCRIPTION,
        image: socialImage,
      },
    });
  }, [isAuthenticated, location.pathname, location.search]);

  return null;
}
