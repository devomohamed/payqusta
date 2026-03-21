export const MAX_PRODUCT_IMAGES = 10;

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

const toFiniteNumber = (value) => {
  if (!hasValue(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toServerMediaPath = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const normalized = rawUrl.trim();
  if (!normalized) return normalized;

  if (normalized.startsWith('/uploads/')) return normalized;
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  if (normalized.startsWith('blob:') || normalized.startsWith('data:')) return normalized;

  try {
    const parsed = new URL(
      normalized,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );
    const pathWithQuery = `${parsed.pathname || ''}${parsed.search || ''}`;
    if (!pathWithQuery) return normalized;

    const uploadsIndex = pathWithQuery.indexOf('/uploads/');
    if (uploadsIndex >= 0) {
      return pathWithQuery.slice(uploadsIndex);
    }

    if (/^(https?:)?\/\//i.test(normalized)) {
      return normalized;
    }

    return pathWithQuery;
  } catch {
    return normalized;
  }
};

export const getPricingValidationErrors = (pricingForm = {}, options = {}) => {
  const { requireSalePrice = false } = options;
  const errors = {};

  const salePriceProvided = hasValue(pricingForm.price);
  const salePrice = toFiniteNumber(pricingForm.price);
  const compareAtPrice = toFiniteNumber(pricingForm.compareAtPrice);
  const costPrice = toFiniteNumber(pricingForm.costPrice);
  const wholesalePrice = toFiniteNumber(pricingForm.wholesalePrice);

  if (requireSalePrice && !salePriceProvided) {
    errors.price = 'price_required';
  } else if (salePriceProvided && (salePrice === null || salePrice <= 0)) {
    errors.price = 'price_positive';
  }

  if (compareAtPrice !== null && salePrice !== null && salePrice > 0 && compareAtPrice < salePrice) {
    errors.compareAtPrice = 'compare_price_error';
  }

  if (costPrice !== null && salePrice !== null && salePrice > 0 && costPrice > salePrice) {
    errors.costPrice = 'cost_price_error';
  }

  if (wholesalePrice !== null && salePrice !== null && salePrice > 0 && wholesalePrice > salePrice) {
    errors.wholesalePrice = 'wholesale_price_error';
  }

  return errors;
};

export const normalizeInventoryPayload = (rawInventory = []) => {
  if (!Array.isArray(rawInventory)) return [];

  return rawInventory
    .map((item) => {
      const branch = item?.branch?._id || item?.branch;
      if (!branch) return null;

      const quantity = Number(item?.quantity);
      const minQuantity = Number(item?.minQuantity);

      return {
        branch: String(branch),
        quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
        minQuantity: Number.isFinite(minQuantity) && minQuantity >= 0 ? minQuantity : 5,
      };
    })
    .filter(Boolean);
};

export const normalizeBranchAvailabilityPayload = (rawAvailability = []) => {
  if (!Array.isArray(rawAvailability)) return [];

  return rawAvailability
    .map((item) => {
      const branch = item?.branch?._id || item?.branch;
      if (!branch) return null;

      const safetyStock = Number(item?.safetyStock);
      const onlineReserveQty = Number(item?.onlineReserveQty);
      const priorityRank = Number(item?.priorityRank);

      return {
        branch: String(branch),
        isAvailableInBranch: item?.isAvailableInBranch !== undefined ? Boolean(item.isAvailableInBranch) : true,
        isSellableInPos: item?.isSellableInPos !== undefined ? Boolean(item.isSellableInPos) : true,
        isSellableOnline: item?.isSellableOnline !== undefined ? Boolean(item.isSellableOnline) : false,
        safetyStock: Number.isFinite(safetyStock) && safetyStock >= 0 ? safetyStock : 0,
        onlineReserveQty: Number.isFinite(onlineReserveQty) && onlineReserveQty >= 0 ? onlineReserveQty : 0,
        priorityRank: Number.isFinite(priorityRank) && priorityRank >= 1 ? priorityRank : 100,
      };
    })
    .filter(Boolean);
};

export const createEmptyProductForm = () => ({
  name: '',
  sku: '',
  barcode: '',
  internationalBarcode: '',
  internationalBarcodeType: 'UNKNOWN',
  localBarcode: '',
  localBarcodeType: 'CODE128',
  generateBarcodeAfterCreate: true,
  category: '',
  subcategory: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  wholesalePrice: '',
  shippingCost: '',
  isFreeShipping: false,
  stock: '',
  minStockAlert: '5',
  description: '',
  supplier: '',
  expiryDate: '',
  variants: [],
  inventory: [],
  branchAvailability: [],
  primaryImagePreview: null,
  seoTitle: '',
  seoDescription: ''
});

export const buildProductDraftStorageKey = (tenantId, userId) =>
  `payqusta:product-drafts:${tenantId || 'default'}:${userId || 'default'}`;

export const buildProductRecoveryStorageKey = (tenantId, userId) =>
  `payqusta:product-recovery:${tenantId || 'default'}:${userId || 'default'}`;

export const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const sanitizeFormForDraft = (rawForm = {}) => {
  const normalized = { ...rawForm };
  if (typeof normalized.primaryImagePreview === 'string' && normalized.primaryImagePreview.startsWith('blob:')) {
    normalized.primaryImagePreview = null;
  }
  if (!Array.isArray(normalized.variants)) normalized.variants = [];
  if (!Array.isArray(normalized.inventory)) normalized.inventory = [];
  if (!Array.isArray(normalized.branchAvailability)) normalized.branchAvailability = [];
  return normalized;
};

export const normalizeDraftEntries = (parsed) => {
  if (Array.isArray(parsed)) {
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && entry.form)
      .map((entry) => ({
        id: entry.id || createDraftId(),
        form: entry.form,
        productImages: Array.isArray(entry.productImages) ? entry.productImages : [],
        savedAt: entry.savedAt || new Date().toISOString(),
      }));
  }

  if (parsed && typeof parsed === 'object' && parsed.form) {
    return [{
      id: parsed.id || createDraftId(),
      form: parsed.form,
      productImages: Array.isArray(parsed.productImages) ? parsed.productImages : [],
      savedAt: parsed.savedAt || new Date().toISOString(),
    }];
  }

  return [];
};
