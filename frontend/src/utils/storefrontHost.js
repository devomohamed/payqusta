export const PLATFORM_ROOT_DOMAIN = (import.meta.env.VITE_PLATFORM_ROOT_DOMAIN || 'payqusta.store')
  .trim()
  .toLowerCase();

const RESERVED_PLATFORM_SUBDOMAINS = new Set(
  (import.meta.env.VITE_RESERVED_PLATFORM_SUBDOMAINS || 'www,api,admin,app,portal,mail')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
);

const normalizeHostname = (hostname = window.location.hostname) =>
  String(hostname || '')
    .trim()
    .toLowerCase()
    .split(',')[0]
    .split(':')[0];

export function isLocalStorefrontHost(hostname = window.location.hostname) {
  const normalizedHost = normalizeHostname(hostname);
  return normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '0.0.0.0';
}

export function getStorefrontTenantSlugFromHost(hostname = window.location.hostname) {
  const normalizedHost = normalizeHostname(hostname);

  if (!normalizedHost || normalizedHost === PLATFORM_ROOT_DOMAIN) return null;
  if (!normalizedHost.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) return null;

  const candidate = normalizedHost.slice(0, -(PLATFORM_ROOT_DOMAIN.length + 1)).trim();
  if (!candidate || candidate.includes('.')) return null;
  if (RESERVED_PLATFORM_SUBDOMAINS.has(candidate)) return null;

  return candidate;
}

export function isStorefrontSubdomainHost(hostname = window.location.hostname) {
  return Boolean(getStorefrontTenantSlugFromHost(hostname));
}

export function getStorefrontBasePath(hostname = window.location.hostname) {
  return isStorefrontSubdomainHost(hostname) ? '' : '/store';
}

export function storefrontPath(path = '/', hostname = window.location.hostname) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = getStorefrontBasePath(hostname);

  if (!basePath) {
    return normalizedPath;
  }

  if (normalizedPath === '/') {
    return basePath;
  }

  return `${basePath}${normalizedPath}`;
}

export function getPlatformStorefrontUrl(tenantSlug) {
  if (!tenantSlug || !PLATFORM_ROOT_DOMAIN) return null;
  return `https://${tenantSlug}.${PLATFORM_ROOT_DOMAIN}`;
}

export function getStorefrontDomainUrl(
  tenantSlug,
  hostname = window.location.hostname,
  origin = window.location.origin
) {
  const normalizedOrigin = String(origin || '').trim().replace(/\/+$/, '');
  const normalizedHost = normalizeHostname(hostname);
  const fallbackPath = storefrontPath('/', normalizedHost);

  if (isLocalStorefrontHost(normalizedHost)) {
    return normalizedOrigin ? `${normalizedOrigin}${fallbackPath}` : fallbackPath;
  }

  if (tenantSlug) {
    return getPlatformStorefrontUrl(tenantSlug) || fallbackPath;
  }

  if (isStorefrontSubdomainHost(normalizedHost)) {
    return normalizedOrigin || `https://${normalizedHost}`;
  }

  return normalizedOrigin ? `${normalizedOrigin}${fallbackPath}` : fallbackPath;
}

export function getBackofficeDashboardUrl(
  hostname = window.location.hostname,
  protocol = window.location.protocol
) {
  const normalizedHost = normalizeHostname(hostname);
  const normalizedProtocol = protocol === 'http:' || protocol === 'https:' ? protocol : 'https:';

  if (!normalizedHost || isLocalStorefrontHost(normalizedHost)) {
    return '/';
  }

  return `${normalizedProtocol}//${PLATFORM_ROOT_DOMAIN}/`;
}
