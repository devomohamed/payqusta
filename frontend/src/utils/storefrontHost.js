const PLATFORM_ROOT_DOMAIN = (import.meta.env.VITE_PLATFORM_ROOT_DOMAIN || 'payqusta.store')
  .trim()
  .toLowerCase();

const RESERVED_PLATFORM_SUBDOMAINS = new Set(
  (import.meta.env.VITE_RESERVED_PLATFORM_SUBDOMAINS || 'www,api,admin,app,portal,mail')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
);

export function getStorefrontTenantSlugFromHost(hostname = window.location.hostname) {
  const normalizedHost = String(hostname || '')
    .trim()
    .toLowerCase()
    .split(':')[0];

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
