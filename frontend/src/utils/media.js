import { API_URL } from '../store';

const ABSOLUTE_URL_PATTERN = /^(https?:)?\/\//i;

const getApiOrigin = () => {
  if (typeof API_URL === 'string' && ABSOLUTE_URL_PATTERN.test(API_URL)) {
    try {
      return new URL(API_URL).origin;
    } catch (error) {
      return '';
    }
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

export const resolveMediaUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const normalized = rawUrl.trim();
  if (!normalized) return null;

  if (
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    ABSOLUTE_URL_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return normalized;

  if (normalized.startsWith('/uploads/') || normalized.startsWith('/api/')) {
    return `${apiOrigin}${normalized}`;
  }

  if (normalized.startsWith('uploads/')) {
    return `${apiOrigin}/${normalized}`;
  }

  return normalized.startsWith('/') ? `${apiOrigin}${normalized}` : `${apiOrigin}/${normalized}`;
};

export const pickProductImage = (product) => {
  const candidates = [
    product?.thumbnail,
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
  ];

  for (const candidate of candidates) {
    const url = resolveMediaUrl(candidate);
    if (url) return url;
  }

  return null;
};

export const collectProductImages = (product) => {
  const candidates = [
    product?.thumbnail,
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
  ];

  return [...new Set(candidates.map(resolveMediaUrl).filter(Boolean))];
};
