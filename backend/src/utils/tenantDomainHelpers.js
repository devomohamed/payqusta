const AppError = require('./AppError');

const getPlatformRootDomain = () =>
  (process.env.PLATFORM_ROOT_DOMAIN || 'payqusta.store')
    .trim()
    .toLowerCase();

const getReservedPlatformSubdomains = () =>
  new Set(
    (process.env.RESERVED_PLATFORM_SUBDOMAINS || 'www,api,admin,app,portal,mail')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );

const getRequestHost = (req) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = forwardedHost || req.headers.host || '';
  return rawHost.split(',')[0].trim().split(':')[0].toLowerCase();
};

const getPlatformSubdomain = (host) => {
  const platformRootDomain = getPlatformRootDomain();
  const reservedPlatformSubdomains = getReservedPlatformSubdomains();

  if (!host || !platformRootDomain || host === platformRootDomain) return null;

  const suffix = `.${platformRootDomain}`;
  if (!host.endsWith(suffix)) return null;

  const candidate = host.slice(0, -suffix.length).trim().toLowerCase();
  if (!candidate || candidate.includes('.')) return null;
  if (reservedPlatformSubdomains.has(candidate)) return null;

  return candidate;
};

const isLocalOrRunHost = (host) =>
  !host ||
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host.endsWith('.run.app') ||
  host.endsWith('.a.run.app');

const isPlatformHost = (host) => {
  const platformRootDomain = getPlatformRootDomain();
  if (!host) return true;

  return host === 'localhost' ||
    host === '127.0.0.1' ||
    host === platformRootDomain ||
    !!getPlatformSubdomain(host) ||
    host.endsWith('.run.app') ||
    host.endsWith('.a.run.app');
};

const markCustomDomainConnected = (Tenant, tenantId) => {
  if (!tenantId) return;
  Tenant.updateOne(
    { _id: tenantId },
    {
      $set: {
        customDomainStatus: 'connected',
        customDomainLastCheckedAt: new Date(),
      },
    }
  ).catch(() => { });
};

const normalizeCustomDomain = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const hostOnly = withoutProtocol.split('/')[0].split(':')[0].trim();

  if (!hostOnly || !hostOnly.includes('.')) {
    throw AppError.badRequest('يرجى إدخال نطاق صحيح مثل shop.example.com');
  }

  return hostOnly;
};

const normalizeSubdomain = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const reservedPlatformSubdomains = getReservedPlatformSubdomains();
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!normalized) {
    throw AppError.badRequest('Please enter a valid store subdomain');
  }

  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(normalized)) {
    throw AppError.badRequest('Store subdomain must be 3-63 characters and use letters, numbers, or hyphens');
  }

  if (reservedPlatformSubdomains.has(normalized)) {
    throw AppError.badRequest('This store subdomain is reserved');
  }

  return normalized;
};

const buildStoreUrl = (slug) => {
  const platformRootDomain = getPlatformRootDomain();
  if (!slug || !platformRootDomain) return null;
  return `https://${slug}.${platformRootDomain}`;
};

module.exports = {
  buildStoreUrl,
  getPlatformRootDomain,
  getPlatformSubdomain,
  getRequestHost,
  getReservedPlatformSubdomains,
  isLocalOrRunHost,
  isPlatformHost,
  markCustomDomainConnected,
  normalizeCustomDomain,
  normalizeSubdomain,
};
