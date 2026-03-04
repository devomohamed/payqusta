import axios from 'axios';
import { API_URL } from '../store';
import { getStorefrontTenantSlugFromHost } from '../utils/storefrontHost';

const storefrontHttp = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const DEFAULT_TTL_MS = 12000;
const RESPONSE_CACHE = new Map();
const IN_FLIGHT_REQUESTS = new Map();
const CONTEXT_STORAGE_KEY = 'payqusta_storefront_context';

function safeParseJSON(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function decodeJwtPayload(token) {
  if (!token || typeof window === 'undefined' || typeof window.atob !== 'function') {
    return null;
  }

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    return JSON.parse(window.atob(paddedPayload));
  } catch (_) {
    return null;
  }
}

function readStoredContext() {
  if (typeof window === 'undefined') return null;
  return safeParseJSON(window.localStorage.getItem(CONTEXT_STORAGE_KEY));
}

function persistStorefrontContext(context = {}) {
  if (typeof window === 'undefined') return;

  const current = readStoredContext() || {};
  const next = {
    tenantId: context.tenantId || current.tenantId || '',
    slug: context.slug || current.slug || '',
  };

  if (!next.tenantId && !next.slug) return;

  window.localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(next));
}

function getUrlTenantContext() {
  if (typeof window === 'undefined') {
    return { tenantId: '', slug: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    tenantId: (params.get('tenant') || '').trim(),
    slug: (params.get('slug') || params.get('tenantSlug') || params.get('storeCode') || '').trim().toLowerCase(),
  };
}

function resolveStorefrontTenantContext() {
  if (typeof window === 'undefined') {
    return { tenantId: '', slug: '' };
  }

  const queryContext = getUrlTenantContext();
  const hostSlug = getStorefrontTenantSlugFromHost();
  const storedContext = readStoredContext() || {};
  const portalTenant = safeParseJSON(window.localStorage.getItem('portal_tenant')) || {};
  const backofficeTokenPayload = decodeJwtPayload(window.localStorage.getItem('payqusta_token')) || {};

  const tenantId =
    queryContext.tenantId ||
    backofficeTokenPayload.tenant ||
    portalTenant._id ||
    storedContext.tenantId ||
    '';

  const slug =
    queryContext.slug ||
    hostSlug ||
    portalTenant.slug ||
    storedContext.slug ||
    '';

  return { tenantId, slug };
}

export function getStorefrontTenantRequestConfig(options = {}) {
  const context = resolveStorefrontTenantContext();
  const params = { ...(options.params || {}) };
  const headers = { ...(options.headers || {}) };

  if (!params.tenant && context.tenantId) {
    params.tenant = context.tenantId;
  }

  if (!params.slug && !params.tenant && context.slug) {
    params.slug = context.slug;
  }

  if (!headers['x-tenant-id'] && context.tenantId) {
    headers['x-tenant-id'] = context.tenantId;
  } else if (!headers['x-tenant-slug'] && !headers['x-tenant-id'] && context.slug) {
    headers['x-tenant-slug'] = context.slug;
  }

  return {
    ...options,
    params,
    headers,
  };
}

function buildCacheKey(path, options = {}) {
  const params = Object.entries(options.params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right));

  const headers = {
    'x-tenant-id': options.headers?.['x-tenant-id'] || '',
    'x-tenant-slug': options.headers?.['x-tenant-slug'] || '',
  };

  return JSON.stringify({ path, params, headers });
}

function persistContextFromResponse(requestOptions, response) {
  const responseData = response?.data?.data || {};
  const tenantData = responseData.tenant || {};

  persistStorefrontContext({
    tenantId:
      tenantData._id ||
      responseData.tenantId ||
      requestOptions.params?.tenant ||
      requestOptions.headers?.['x-tenant-id'] ||
      '',
    slug:
      tenantData.slug ||
      responseData.slug ||
      requestOptions.params?.slug ||
      requestOptions.headers?.['x-tenant-slug'] ||
      '',
  });
}

export async function storefrontGet(path, options = {}) {
  const { ttlMs = DEFAULT_TTL_MS, ...requestOptions } = getStorefrontTenantRequestConfig(options);
  const cacheKey = buildCacheKey(path, requestOptions);
  const now = Date.now();
  const cached = RESPONSE_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.response;
  }

  if (IN_FLIGHT_REQUESTS.has(cacheKey)) {
    return IN_FLIGHT_REQUESTS.get(cacheKey);
  }

  const request = storefrontHttp.get(path, requestOptions)
    .then((response) => {
      persistContextFromResponse(requestOptions, response);
      RESPONSE_CACHE.set(cacheKey, {
        response,
        expiresAt: Date.now() + Math.max(0, ttlMs),
      });
      return response;
    })
    .finally(() => {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    });

  IN_FLIGHT_REQUESTS.set(cacheKey, request);
  return request;
}

export function clearStorefrontResponseCache() {
  RESPONSE_CACHE.clear();
  IN_FLIGHT_REQUESTS.clear();
}

export function loadStorefrontSettings(options = {}) {
  return storefrontGet('/settings', {
    ttlMs: 20000,
    ...options,
  });
}

export function loadStorefrontCategories(options = {}) {
  return storefrontGet('/products/categories', {
    ttlMs: 20000,
    ...options,
  });
}

export function loadStorefrontProducts(params = {}, options = {}) {
  return storefrontGet('/products', {
    ttlMs: 10000,
    ...options,
    params,
  });
}
