import { storefrontPath } from '../../utils/storefrontHost';

const PORTAL_SECTION_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/returns',
  '/statement',
  '/calculator',
  '/documents',
  '/addresses',
  '/profile',
  '/orders',
  '/wishlist',
  '/support',
  '/notifications',
  '/points',
  '/reviews',
  '/products',
  '/checkout',
  '/payment',
];

const normalizePortalBasePath = (portalBasePath) => {
  if (!portalBasePath || typeof portalBasePath !== 'string') return '/portal';
  return portalBasePath.startsWith('/') ? portalBasePath : `/${portalBasePath}`;
};

const toPortalPath = (path, portalBasePath) => {
  const basePath = normalizePortalBasePath(portalBasePath);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
};

export function resolvePortalNotificationLink(rawLink, portalBasePath = '/portal') {
  if (!rawLink || typeof rawLink !== 'string') return null;

  const link = rawLink.trim();
  if (!link) return null;

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  const basePath = normalizePortalBasePath(portalBasePath);

  if (link === '/portal' || link.startsWith('/portal/')) {
    return basePath === '/portal' ? link : link.replace('/portal', basePath);
  }

  if (link === '/account' || link.startsWith('/account/')) {
    return basePath === '/account' ? link : link.replace('/account', basePath);
  }

  const normalizedLink = link.startsWith('/') ? link : `/${link}`;
  const isPortalSection = PORTAL_SECTION_PREFIXES.some(
    (sectionPrefix) =>
      normalizedLink === sectionPrefix || normalizedLink.startsWith(`${sectionPrefix}/`)
  );

  if (isPortalSection) {
    return toPortalPath(normalizedLink, basePath);
  }

  return storefrontPath(normalizedLink);
}
