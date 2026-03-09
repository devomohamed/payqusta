import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Plus, Search, Edit, Trash2, Package, Check, Truck, MessageCircle, Send, AlertTriangle, Scan, X as XIcon, CheckSquare, Square, Tag, Clock, AlertCircle, ChevronDown, ChevronRight, PauseCircle, PlayCircle, Printer, Download, Hash, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { notify } from '../components/AnimatedNotification';
import { productsApi, suppliersApi, categoriesApi, api, useAuthStore } from '../store';
import { Button, Input, Select, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSearchModal from '../components/ProductSearchModal';
import ProductComposer from '../components/products/ProductComposer';
import { confirm } from '../components/ConfirmDialog';
import { formatFileSize, optimizeImageFilesForUpload } from '../utils/imageUpload';
import { resolveMediaUrl } from '../utils/media';
import { buildBarcodeSvg, downloadBarcodePng, printBarcodeLabel, resolveBarcodePayload } from '../utils/barcodeUtils';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';

const CategoriesPage = lazy(() => import('./CategoriesPage'));
const MAX_PRODUCT_IMAGES = 10;

const hasValue = (value) => value !== '' && value !== null && value !== undefined;

const toFiniteNumber = (value) => {
  if (!hasValue(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toServerMediaPath = (rawUrl) => {
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

const getPricingValidationErrors = (pricingForm = {}, options = {}) => {
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

const normalizeInventoryPayload = (rawInventory = []) => {
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

const createEmptyProductForm = () => ({
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
  primaryImagePreview: null,
  seoTitle: '',
  seoDescription: ''
});

const buildProductDraftStorageKey = (tenantId, userId) =>
  `payqusta:product-drafts:${tenantId || 'default'}:${userId || 'default'}`;

const buildProductRecoveryStorageKey = (tenantId, userId) =>
  `payqusta:product-recovery:${tenantId || 'default'}:${userId || 'default'}`;

const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sanitizeFormForDraft = (rawForm = {}) => {
  const normalized = { ...rawForm };
  if (typeof normalized.primaryImagePreview === 'string' && normalized.primaryImagePreview.startsWith('blob:')) {
    normalized.primaryImagePreview = null;
  }
  if (!Array.isArray(normalized.variants)) normalized.variants = [];
  if (!Array.isArray(normalized.inventory)) normalized.inventory = [];
  return normalized;
};

const normalizeDraftEntries = (parsed) => {
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

  // Backward compatibility: old single-draft format.
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

export default function ProductsPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, can, getBranches } = useAuthStore();
  const [activePageTab, setActivePageTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [stockFilter, setStockFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productTab, setProductTab] = useState('active');
  const [activeDraftId, setActiveDraftId] = useState('');
  const [incompleteDrafts, setIncompleteDrafts] = useState([]);
  const [togglingSuspendId, setTogglingSuspendId] = useState(null);
  const [sendingRestock, setSendingRestock] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState(createEmptyProductForm);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [stepErrors, setStepErrors] = useState({});
  const [recoveryDraftChecked, setRecoveryDraftChecked] = useState(false);
  const LIMIT = 8;
  const isIncompleteTab = productTab === 'incomplete';
  const isSuspendedTab = productTab === 'suspended';
  const pricingValidationErrors = getPricingValidationErrors(form, { requireSalePrice: stepErrors.pricing });
  const branchScopeId = String(user?.branch?._id || user?.branch || '');
  const draftStorageKey = useMemo(
    () => buildProductDraftStorageKey(tenant?._id, user?._id || user?.id),
    [tenant?._id, user?._id, user?.id]
  );
  const recoveryStorageKey = useMemo(
    () => buildProductRecoveryStorageKey(tenant?._id, user?._id || user?.id),
    [tenant?._id, user?._id, user?.id]
  );
  const mainBranchOption = useMemo(() => {
    if (!tenant?._id) return null;
    const storeName = tenant?.name || t('products.main_warehouse');
    return { _id: String(tenant._id), name: `${storeName} (${t('products.main_label')})` };
  }, [tenant?._id, tenant?.name, t]);
  const barcodeSettings = tenant?.settings?.barcode || {};
  const barcodeMode = barcodeSettings.mode || 'both';
  const localBarcodeEnabled = barcodeMode === 'both' || barcodeMode === 'local_only';
  const storeAutoGeneratesLocalBarcode = barcodeSettings.autoGenerateLocalBarcode === true;

  const isFormDirty = useMemo(() => {
    if (!showModal) return false;
    const emptyForm = createEmptyProductForm();
    return form.name !== emptyForm.name ||
      form.sku !== emptyForm.sku ||
      form.barcode !== emptyForm.barcode ||
      form.internationalBarcode !== emptyForm.internationalBarcode ||
      form.localBarcode !== emptyForm.localBarcode ||
      form.generateBarcodeAfterCreate !== emptyForm.generateBarcodeAfterCreate ||
      form.price !== emptyForm.price ||
      form.description !== emptyForm.description ||
      (form.variants && form.variants.length > 0) ||
      pendingImages.length > 0;
  }, [showModal, form, pendingImages.length]);

  const showBarcodeReadyToast = useCallback((product, { autoGenerated = false } = {}) => {
    const payload = resolveBarcodePayload(product, product?.localBarcode ? 'local' : 'international');
    if (!payload?.value) return;

    const productName = product?.name || 'منتج جديد';
    const sourceLabel = payload.source === 'local' ? 'باركود محلي' : 'باركود دولي';

    const runBarcodeAction = async (action, toastId) => {
      try {
        const svgMarkup = buildBarcodeSvg(
          payload.value,
          payload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'
        );

        if (!svgMarkup) {
          throw new Error('Missing barcode SVG');
        }

        if (action === 'download') {
          await downloadBarcodePng(svgMarkup, `${payload.source || 'barcode'}-${payload.value}.png`);
        } else {
          printBarcodeLabel({
            svgMarkup,
            title: productName,
            subtitle: sourceLabel,
            caption: payload.value,
          });
        }

        toast.dismiss(toastId);
      } catch {
        toast.error(action === 'download' ? 'تعذر تنزيل الباركود' : 'تعذر فتح نافذة الطباعة');
      }
    };

    toast((toastInstance) => (
      <div dir="rtl" className="w-[min(92vw,24rem)] overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-emerald-900/40 dark:bg-gray-950">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary-500" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-900 dark:text-white">
                {autoGenerated ? 'تم حفظ المنتج وتجهيز الباركود' : 'الباركود جاهز للطباعة'}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {productName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(toastInstance.id)}
              className="rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-3 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:via-gray-950 dark:to-teal-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">
                <Hash className="h-3.5 w-3.5" />
                {sourceLabel}
              </span>
              {autoGenerated ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  توليد تلقائي
                </span>
              ) : null}
            </div>
            <p className="mt-3 select-all break-all font-mono text-sm font-black tracking-[0.22em] text-gray-900 dark:text-white">
              {payload.value}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void runBarcodeAction('download', toastInstance.id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              تنزيل PNG
            </button>
            <button
              type="button"
              onClick={() => void runBarcodeAction('print', toastInstance.id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5"
            >
              <Printer className="h-4 w-4" />
              طباعة الآن
            </button>
          </div>
        </div>
      </div>
    ), { duration: 16000, position: 'top-center' });
  }, []);

  useUnsavedWarning(isFormDirty, 'products');

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoriesApi.getTree();
      const rows = res?.data?.data || [];
      setCategories(rows);
      return rows;
    } catch {
      return [];
    }
  }, []);

  const loadDraftsFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return normalizeDraftEntries(parsed);
    } catch {
      return [];
    }
  }, [draftStorageKey]);

  const saveDraftsToStorage = useCallback((draftsPayload) => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draftsPayload));
      return true;
    } catch {
      return false;
    }
  }, [draftStorageKey]);

  const loadRecoveryDraftFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(recoveryStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.form) return null;
      return {
        draftId: parsed.draftId || '',
        form: sanitizeFormForDraft(parsed.form),
        productImages: Array.isArray(parsed.productImages) ? parsed.productImages : [],
        savedAt: parsed.savedAt || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }, [recoveryStorageKey]);

  const saveRecoveryDraftToStorage = useCallback((draftPayload) => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem(recoveryStorageKey, JSON.stringify(draftPayload));
      return true;
    } catch {
      return false;
    }
  }, [recoveryStorageKey]);

  const clearRecoveryDraftFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(recoveryStorageKey);
    } catch {
      // ignore storage cleanup failures
    }
  }, [recoveryStorageKey]);

  const refreshIncompleteDrafts = useCallback(() => {
    setIncompleteDrafts(loadDraftsFromStorage());
  }, [loadDraftsFromStorage]);

  useEffect(() => {
    loadCategories();
    suppliersApi.getAll({ limit: 100 }).then((r) => setSuppliers(r.data.data || [])).catch(() => { });
    getBranches?.()
      .then((rows) => {
        if (Array.isArray(rows)) {
          setBranches(rows);
          return;
        }
        setBranches([]);
      })
      .catch(() => setBranches([]));
  }, [getBranches, loadCategories]);

  useEffect(() => {
    refreshIncompleteDrafts();
  }, [refreshIncompleteDrafts]);

  useEffect(() => {
    setRecoveryDraftChecked(false);
  }, [recoveryStorageKey]);

  useEffect(() => {
    if (recoveryDraftChecked || showModal || editId) return;

    const recoveryDraft = loadRecoveryDraftFromStorage();
    setRecoveryDraftChecked(true);

    if (!recoveryDraft) return;

    setEditId(null);
    setActiveDraftId(recoveryDraft.draftId || '');
    setForm({ ...createEmptyProductForm(), ...recoveryDraft.form });
    setProductImages(recoveryDraft.productImages);
    setPendingImages([]);
    setStepErrors({});
    setShowModal(true);
    toast.success('تم استعادة بيانات المنتج بعد إعادة تحميل الصفحة');
  }, [editId, loadRecoveryDraftFromStorage, recoveryDraftChecked, showModal]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(async () => {
    if (isIncompleteTab) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: debouncedSearch };
      params.scope = isSuspendedTab ? 'suspended' : 'active';
      if (stockFilter) params.stockStatus = stockFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (supplierFilter) params.supplier = supplierFilter;
      const res = await productsApi.getAll(params);
      setProducts(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.totalPages || 1,
        totalItems: res.data.pagination?.totalItems || 0
      });
    } catch {
      toast.error(t('products.load_error'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, stockFilter, categoryFilter, supplierFilter, isIncompleteTab, isSuspendedTab, t]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [debouncedSearch, stockFilter, categoryFilter, supplierFilter, isSuspendedTab, isIncompleteTab]);
  useEffect(() => { setSelectedIds([]); }, [isSuspendedTab, isIncompleteTab]);

  const openEdit = (prod) => {
    clearRecoveryDraftFromStorage();
    setEditId(prod._id);
    setActiveDraftId('');
    const formatImageUrl = (url) => resolveMediaUrl(url);

    setForm({
      ...createEmptyProductForm(),
      name: prod.name || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      internationalBarcode: prod.internationalBarcode || prod.barcode || '',
      internationalBarcodeType: prod.internationalBarcodeType || 'UNKNOWN',
      localBarcode: prod.localBarcode || '',
      localBarcodeType: prod.localBarcodeType || 'CODE128',
      generateBarcodeAfterCreate: false,
      category: prod.category?._id || prod.category || '',
      subcategory: prod.subcategory?._id || prod.subcategory || '',
      price: prod.price || '',
      compareAtPrice: prod.compareAtPrice || '',
      costPrice: prod.cost || '',
      wholesalePrice: prod.wholesalePrice || '',
      shippingCost: prod.shippingCost || '',
      isFreeShipping: prod.shippingCost === 0,
      stock: prod.stock?.quantity || '',
      minStockAlert: prod.stock?.minQuantity || '5',
      description: prod.description || '',
      supplier: prod.supplier?._id || prod.supplier || '',
      expiryDate: prod.expiryDate ? prod.expiryDate.split('T')[0] : '',
      variants: prod.variants || [],
      inventory: normalizeInventoryPayload(prod.inventory || []),
      primaryImagePreview: formatImageUrl(prod.thumbnail || prod.images?.[0] || null),
      seoTitle: prod.seoTitle || '',
      seoDescription: prod.seoDescription || ''
    });
    setProductImages((prod.images || []).map(formatImageUrl));
    setPendingImages([]);
    setStepErrors({});
    setShowModal(true);
  };

  const openNew = () => {
    clearRecoveryDraftFromStorage();
    setEditId(null);
    setActiveDraftId('');
    setForm(createEmptyProductForm());
    setProductImages([]);
    setPendingImages([]);
    setStepErrors({});
    setShowModal(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      openNew();
      navigate('/products', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate]);


  const openIncompleteDraft = (draftId) => {
    const draft = loadDraftsFromStorage().find((entry) => entry.id === draftId);
    if (!draft) {
      toast.error('لم يتم العثور على المنتج غير المستكمل');
      refreshIncompleteDrafts();
      return;
    }

    clearRecoveryDraftFromStorage();
    setEditId(null);
    setActiveDraftId(draft.id);
    setForm({ ...createEmptyProductForm(), ...draft.form });
    setProductImages(Array.isArray(draft.productImages) ? draft.productImages : []);
    setPendingImages([]);
    setStepErrors({});
    setShowModal(true);
    toast.success('تم فتح المنتج غير المستكمل');
  };

  const validateProductComposer = () => {
    const errors = { basics: false, pricing: false, media: false };
    const pricingErrors = getPricingValidationErrors(form, { requireSalePrice: true });
    if (!form.name) errors.basics = true;
    if (Object.keys(pricingErrors).length > 0) errors.pricing = true;
    if (form.variants && form.variants.length > 0) {
      const invalid = form.variants.some(v => !v.price);
      if (invalid) errors.pricing = true;
    }
    setStepErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const persistIncompleteDraft = useCallback((draftPayload) => {
    const currentDrafts = loadDraftsFromStorage();
    const nextDrafts = (() => {
      const existingIndex = currentDrafts.findIndex((entry) => entry.id === draftPayload.id);
      if (existingIndex >= 0) {
        const clone = [...currentDrafts];
        clone[existingIndex] = draftPayload;
        return clone;
      }
      return [draftPayload, ...currentDrafts].slice(0, 100);
    })();

    const saved = saveDraftsToStorage(nextDrafts);
    if (saved) {
      setIncompleteDrafts(nextDrafts);
    }
    return saved;
  }, [loadDraftsFromStorage, saveDraftsToStorage]);

  const removeIncompleteDraft = useCallback((draftId) => {
    if (!draftId) return true;
    const currentDrafts = loadDraftsFromStorage();
    const nextDrafts = currentDrafts.filter((entry) => entry.id !== draftId);
    const saved = saveDraftsToStorage(nextDrafts);
    if (saved) {
      setIncompleteDrafts(nextDrafts);
    }
    return saved;
  }, [loadDraftsFromStorage, saveDraftsToStorage]);

  const handleSave = async ({ suspendAfterCreate = false } = {}) => {
    if (!validateProductComposer()) {
      notify({ title: t('products.field_errors'), description: t('products.review_steps'), type: 'error' });
      return;
    }

    setSaving(true);
    let savingToastId = null;

    try {
      const formData = new FormData();
      const hadManualLocalBarcode = Boolean(String(form.localBarcode || '').trim());
      const normalizedCategory = form.category || '';
      formData.append('name', form.name);
      if (form.sku) formData.append('sku', form.sku);
      if (form.barcode || form.internationalBarcode) formData.append('barcode', form.internationalBarcode || form.barcode);
      if (form.internationalBarcode) formData.append('internationalBarcode', form.internationalBarcode);
      if (form.internationalBarcodeType) formData.append('internationalBarcodeType', form.internationalBarcodeType);
      if (form.localBarcode) formData.append('localBarcode', form.localBarcode);
      if (form.localBarcodeType) formData.append('localBarcodeType', form.localBarcodeType);
      formData.append('category', normalizedCategory);
      if (form.subcategory) formData.append('subcategory', form.subcategory);
      formData.append('description', form.description || '');
      if (form.supplier) formData.append('supplier', form.supplier);
      formData.append('price', form.price);
      if (hasValue(form.compareAtPrice)) formData.append('compareAtPrice', form.compareAtPrice);
      formData.append('cost', hasValue(form.costPrice) ? form.costPrice : 0);
      if (form.wholesalePrice) formData.append('wholesalePrice', form.wholesalePrice);
      if (form.isFreeShipping) {
        formData.append('shippingCost', 0);
      } else if (form.shippingCost) {
        formData.append('shippingCost', form.shippingCost);
      }
      formData.append('stock[quantity]', form.stock || 0);
      formData.append('stock[minQuantity]', form.minStockAlert || 5);
      const normalizedInventory = normalizeInventoryPayload(form.inventory || []);
      if (normalizedInventory.length > 0) {
        formData.append('inventory', JSON.stringify(normalizedInventory));
      } else if ((user?.role === 'admin' || !!user?.isSuperAdmin) && tenant?._id) {
        // Admin users without explicit inventory fall back to main branch context.
        formData.append('branchId', String(tenant._id));
      }
      if (form.expiryDate) formData.append('expiryDate', form.expiryDate);
      if (form.seoTitle) formData.append('seoTitle', form.seoTitle);
      if (form.seoDescription) formData.append('seoDescription', form.seoDescription);
      formData.append('variants', JSON.stringify(form.variants || []));

      // Sort existing images so the selected primary is first
      const sortedExisting = form.primaryImagePreview && productImages.includes(form.primaryImagePreview)
        ? [form.primaryImagePreview, ...productImages.filter(i => i !== form.primaryImagePreview)]
        : productImages;

      const getRelativeUrl = (url) => {
        return toServerMediaPath(url);
      };

      sortedExisting.forEach(img => formData.append('existingImages', getRelativeUrl(img)));
      if (editId && sortedExisting.length === 0) {
        // Explicitly signal that all existing images were removed.
        formData.append('existingImages', '');
      }

      // Sort pending images so the selected primary is first (identify by _previewUrl)
      const primaryPendingIdx = pendingImages.findIndex(f => f._previewUrl === form.primaryImagePreview);
      const sortedPending = primaryPendingIdx > 0
        ? [pendingImages[primaryPendingIdx], ...pendingImages.filter((_, i) => i !== primaryPendingIdx)]
        : pendingImages;
      const rawPendingBytes = sortedPending.reduce((sum, file) => sum + (Number(file?.size) || 0), 0);

      if (sortedPending.length > 0) {
        savingToastId = toast.loading(
          t('products.optimizing_images', {
            defaultValue: 'جار تجهيز صور المنتج قبل الرفع...',
          })
        );
      }

      const optimizedPending = sortedPending.length > 0
        ? await optimizeImageFilesForUpload(sortedPending, {
          maxDimension: 1280,
          maxTargetBytes: 1.1 * 1024 * 1024,
        })
        : [];
      const optimizedPendingBytes = optimizedPending.reduce((sum, file) => sum + (Number(file?.size) || 0), 0);

      if (savingToastId) {
        const optimizedMessage = optimizedPendingBytes > 0 && optimizedPendingBytes < rawPendingBytes
          ? t('products.optimized_images_ready', {
            defaultValue: 'تم تقليل الصور من {{before}} إلى {{after}}. جارٍ رفع المنتج...',
            before: formatFileSize(rawPendingBytes),
            after: formatFileSize(optimizedPendingBytes),
          })
          : t('products.uploading_after_prepare', {
            defaultValue: 'تم تجهيز الصور. جارٍ رفع المنتج...',
          });

        toast.loading(optimizedMessage, { id: savingToastId });
      }

      optimizedPending.forEach(file => formData.append('images', file));

      // Only send primaryImage if it's an existing server path (not a blob URL)
      const primaryIsExisting = form.primaryImagePreview && !form.primaryImagePreview.startsWith('blob:');
      if (primaryIsExisting) {
        formData.append('primaryImage', getRelativeUrl(form.primaryImagePreview));
      } else if (sortedExisting.length > 0 && sortedPending.length === 0) {
        // Fallback: only use the first existing image if there are no new uploads at all
        formData.append('primaryImage', getRelativeUrl(sortedExisting[0]));
      }
      // If primary is a pending image, don't send primaryImage. The backend uses the first uploaded image.

      const requestConfig = {
        timeout: Math.max(60000, optimizedPending.length * 30000),
        onUploadProgress: (event) => {
          if (!savingToastId) return;

          const total = Number(event.total) || 0;
          const loaded = Number(event.loaded) || 0;
          if (!total) return;

          const progress = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)));
          toast.loading(
            t('products.upload_progress', {
              defaultValue: 'جارٍ رفع المنتج... {{progress}}%',
              progress,
            }),
            { id: savingToastId }
          );
        },
      };

      if (editId) {
        await productsApi.update(editId, formData, requestConfig);
        toast.success(t('products.update_success'), savingToastId ? { id: savingToastId } : undefined);
      } else {
        let savedProduct = null;
        let autoGeneratedBarcode = false;

        if (suspendAfterCreate) {
          formData.append('isSuspended', true);
        }
        const createResponse = await productsApi.create(formData, requestConfig);
        savedProduct = createResponse?.data?.data || null;

        const shouldGenerateBarcodeAfterCreate = Boolean(
          localBarcodeEnabled &&
          !hadManualLocalBarcode &&
          (storeAutoGeneratesLocalBarcode || form.generateBarcodeAfterCreate !== false) &&
          savedProduct?._id &&
          !savedProduct?.localBarcode
        );

        if (shouldGenerateBarcodeAfterCreate) {
          try {
            const barcodeResponse = await productsApi.generateLocalBarcode(savedProduct._id);
            const barcodeData = barcodeResponse?.data?.data || {};
            savedProduct = barcodeData.product || {
              ...savedProduct,
              localBarcode: barcodeData.localBarcode,
              localBarcodeType: barcodeData.localBarcodeType || 'CODE128',
            };
            autoGeneratedBarcode = Boolean(savedProduct?.localBarcode);
          } catch (barcodeError) {
            toast.error(
              barcodeError?.response?.data?.message || 'تم حفظ المنتج لكن تعذر توليد الباركود المحلي تلقائيًا'
            );
          }
        } else if (!hadManualLocalBarcode && savedProduct?.localBarcode) {
          autoGeneratedBarcode = true;
        }

        if (activeDraftId) {
          removeIncompleteDraft(activeDraftId);
          setActiveDraftId('');
        }
        toast.success(t('products.create_success'), savingToastId ? { id: savingToastId } : undefined);
        if (savedProduct) {
          showBarcodeReadyToast(savedProduct, { autoGenerated: autoGeneratedBarcode });
        }
        if (suspendAfterCreate) {
          setProductTab('suspended');
        } else {
          setProductTab('active');
        }
        if (search || stockFilter || categoryFilter || supplierFilter) {
          setSearch('');
          setStockFilter('');
          setCategoryFilter('');
          setSupplierFilter('');
        }
      }
      clearRecoveryDraftFromStorage();
      setForm(createEmptyProductForm());
      setEditId(null);
      setActiveDraftId('');
      setShowModal(false);
      setPendingImages([]);
      setProductImages([]);
      setStepErrors({});
      // Reset to page 1 after adding so the new product is visible immediately
      if (!editId && page !== 1) {
        setPage(1); // the useEffect on page will trigger loadProducts
      } else {
        loadProducts();
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('products.save_error');
      toast.error(msg, savingToastId ? { id: savingToastId } : undefined);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!showModal || editId || !isFormDirty) return undefined;

    const persistRecoveryDraft = () => {
      saveRecoveryDraftToStorage({
        draftId: activeDraftId || '',
        form: sanitizeFormForDraft(form),
        productImages: Array.isArray(productImages) ? productImages : [],
        savedAt: new Date().toISOString(),
      });
    };

    window.addEventListener('beforeunload', persistRecoveryDraft);
    window.addEventListener('pagehide', persistRecoveryDraft);

    return () => {
      window.removeEventListener('beforeunload', persistRecoveryDraft);
      window.removeEventListener('pagehide', persistRecoveryDraft);
    };
  }, [activeDraftId, editId, form, isFormDirty, productImages, saveRecoveryDraftToStorage, showModal]);

  const handleSuspendDraft = useCallback(() => {
    if (editId) return;

    const draftId = activeDraftId || createDraftId();
    const draftPayload = {
      id: draftId,
      form: sanitizeFormForDraft(form),
      productImages: Array.isArray(productImages) ? productImages : [],
      savedAt: new Date().toISOString(),
    };

    const saved = persistIncompleteDraft(draftPayload);
    if (!saved) {
      toast.error(t('products.draft_save_error', { defaultValue: 'تعذر حفظ المسودة، حاول مرة أخرى' }));
      return;
    }

    if (pendingImages.length > 0) {
      toast(t('products.draft_saved_without_pending_images', { defaultValue: 'تم حفظ المسودة بدون الصور الجديدة. أعد رفع الصور عند استكمال المنتج.' }));
    }

    setShowModal(false);
    setPendingImages([]);
    setStepErrors({});
    setActiveDraftId(draftId);
    setProductTab('incomplete');
    toast.success('تم حفظ المنتج كغير مستكمل');
  }, [activeDraftId, editId, form, pendingImages.length, persistIncompleteDraft, productImages, t]);

  const handleComposerClose = () => {
    if (saving) return;
    clearRecoveryDraftFromStorage();
    setForm(createEmptyProductForm());
    setProductImages([]);
    setPendingImages([]);
    setStepErrors({});
    setEditId(null);
    setActiveDraftId('');
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    const approved = await confirm.delete('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!approved) return;

    try {
      await productsApi.delete(id);
      notify.success('تم حذف المنتج بنجاح', 'تم الحذف');
      loadProducts();
    } catch {
      notify.error('فشل حذف المنتج', 'خطأ في الحذف');
    }
  };

  const handleToggleSuspension = async (product, shouldSuspend) => {
    const approved = await confirm.show({
      type: 'warning',
      title: shouldSuspend ? 'تعليق المنتج' : 'إلغاء تعليق المنتج',
      message: shouldSuspend
        ? `هل تريد تعليق المنتج "${product.name}"؟ لن يظهر في المتجر بعد الآن.`
        : `هل تريد إلغاء تعليق المنتج "${product.name}"؟ سيظهر مرة أخرى في المتجر.`,
      confirmLabel: shouldSuspend ? 'تعليق المنتج' : 'إلغاء التعليق',
      cancelLabel: 'إلغاء',
    });

    if (!approved) return;

    setTogglingSuspendId(product._id);
    try {
      await productsApi.setSuspended(product._id, shouldSuspend);
      toast.success(shouldSuspend ? 'تم تعليق المنتج' : 'تم إلغاء تعليق المنتج');
      setSelectedIds(prev => prev.filter(id => id !== product._id));
      loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذر تحديث حالة المنتج');
    } finally {
      setTogglingSuspendId(null);
    }
  };

  const handleDeleteIncompleteDraft = async (draftId) => {
    const approved = await confirm.delete('هل أنت متأكد من حذف المنتج غير المستكمل؟');
    if (!approved) return;

    const removed = removeIncompleteDraft(draftId);
    if (!removed) {
      toast.error('تعذر حذف المنتج غير المستكمل');
      return;
    }

    if (activeDraftId === draftId) {
      setActiveDraftId('');
    }

    toast.success('تم حذف المنتج غير المستكمل');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map(p => p._id));
  };

  const handleBulkDelete = async () => {
    const total = selectedIds.length;
    const approved = await confirm.show({
      type: 'danger',
      title: 'تأكيد الحذف الجماعي',
      message: `هل أنت متأكد من حذف ${total} منتج؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: `حذف ${total} منتج`,
      cancelLabel: 'إلغاء',
    });
    if (!approved) return;

    setBulkDeleting(true);
    try {
      await api.post('/products/bulk-delete', { ids: selectedIds });
      notify.success(`تم حذف ${total} منتج بنجاح`);
      setSelectedIds([]);
      loadProducts();
    } catch {
      notify.error('حدث خطأ في الحذف الجماعي');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRequestRestock = async (supplierId) => {
    setSendingRestock(supplierId);
    try {
      const res = await suppliersApi.requestRestock(supplierId);
      if (res.data.data?.whatsappSent) {
        toast.success(t('products.whatsapp_sent_restock', { count: res.data.data.productsCount }));
      } else {
        toast.success(t('products.restock_prepared', { count: res.data.data?.productsCount || 0 }));
      }
    } catch {
      toast.error(t('products.restock_error'));
    } finally {
      setSendingRestock(null);
    }
  };

  const handleSelectFromSearch = (product) => {
    setForm({
      ...form,
      name: product.name,
      sku: product.sku || '',
      barcode: product.internationalBarcode || product.barcode || '',
      internationalBarcode: product.internationalBarcode || product.barcode || '',
      internationalBarcodeType: product.internationalBarcodeType || 'UNKNOWN',
      localBarcode: product.localBarcode || '',
      localBarcodeType: product.localBarcodeType || 'CODE128',
      generateBarcodeAfterCreate: !product.localBarcode,
      category: product.category?._id || product.category || '',
      price: String(product.price || 0),
      compareAtPrice: hasValue(product.compareAtPrice) ? String(product.compareAtPrice) : '',
      costPrice: String(product.cost || 0),
      description: product.description || '',
      supplier: product.supplier?._id || product.supplier || ''
    });
    setShowProductSearch(false);
    toast.success(t('products.import_success'));
  };

  const handleComposerImagesChange = (e) => {
    const files = e?.target?.files ? Array.from(e.target.files) : (Array.isArray(e) ? e : []);
    if (files.length === 0) return;

    const totalCurrentImages = (Array.isArray(productImages) ? productImages.length : 0) + pendingImages.length;
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - totalCurrentImages);

    if (remainingSlots <= 0) {
      toast.error(`يمكن رفع حتى ${MAX_PRODUCT_IMAGES} صور للمنتج في المرة الواحدة`);
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    if (acceptedFiles.length < files.length) {
      toast.error(`تمت إضافة أول ${acceptedFiles.length} صورة فقط. الحد الأقصى هو ${MAX_PRODUCT_IMAGES} صور`);
    }

    // Attach a stable preview URL to each file so we can reliably remove it later
    const filesWithUrls = acceptedFiles.map(file => {
      if (!file._previewUrl) {
        file._previewUrl = URL.createObjectURL(file);
      }
      return file;
    });
    setPendingImages(prev => [...prev, ...filesWithUrls]);
  };

  const handleComposerPrimarySelect = (imageUrl) => {
    setForm(prev => ({ ...prev, primaryImagePreview: imageUrl }));
  };

  // Called from ProductMediaStep as: onRemoveImage(type, url_or_index)
  const handleComposerRemoveImage = (type, urlOrIndex) => {
    if (type === 'pending') {
      // urlOrIndex is the index of the pending file
      setPendingImages(prev => {
        const removed = prev[urlOrIndex];
        if (removed?._previewUrl) {
          // Clear primary preview if this image was selected as primary
          if (form.primaryImagePreview === removed._previewUrl) {
            setForm(f => ({ ...f, primaryImagePreview: null }));
          }
          URL.revokeObjectURL(removed._previewUrl);
        }
        return prev.filter((_, i) => i !== urlOrIndex);
      });
    } else {
      // type === 'existing', urlOrIndex is the image URL
      const imageUrl = urlOrIndex;
      setProductImages(prev => prev.filter(img => img !== imageUrl));
      if (form.primaryImagePreview === imageUrl) {
        setForm(prev => ({ ...prev, primaryImagePreview: null }));
      }
    }
  };

  const handleComposerAddVariant = (variant) => {
    setForm(prev => ({ ...prev, variants: [...(prev.variants || []), variant] }));
  };

  const handleComposerUpdateVariant = (index, field, value) => {
    setForm(prev => {
      const variants = [...(prev.variants || [])];
      const nextVariant = { ...variants[index], [field]: value };
      if (field === 'internationalBarcode') nextVariant.barcode = value;
      if (field === 'barcode') nextVariant.internationalBarcode = value;
      if (field === 'localBarcode') nextVariant.localBarcodeType = value ? 'CODE128' : undefined;
      variants[index] = nextVariant;
      return { ...prev, variants };
    });
  };

  const handleComposerRemoveVariant = (index) => {
    setForm(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index)
    }));
  };

  const getStockBadge = (prod) => {
    const qty = prod.stock?.quantity ?? 0;
    const min = prod.stock?.minQuantity ?? 5;
    if (qty === 0) return <Badge variant="danger">{t('products.out_of_stock')}</Badge>;
    if (qty <= min) return <Badge variant="warning">{t('products.low_stock')}</Badge>;
    return <Badge variant="success">{t('products.available')} ({qty})</Badge>;
  };

  const headerProductsCount = isIncompleteTab ? incompleteDrafts.length : pagination.totalItems;

  if (activePageTab === 'categories') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <div>
          <button
            onClick={() => setActivePageTab('products')}
            className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" /> {t('products.all_products')}
          </button>
          <CategoriesPage />
        </div>
      </Suspense>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            {t('products.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('products.total_count', { count: headerProductsCount })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setActivePageTab('categories')}>
            <Tag className="w-4 h-4" />
            {t('products.manage_categories')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBarcodeScanner(true)}>
            <Scan className="w-4 h-4" />
            {t('products.scan_barcode')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowProductSearch(true)}>
            <Search className="w-4 h-4" />
            {t('products.import_product')}
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t('products.add_product')}
          </Button>
        </div>
      </div>

      {/* Products Tabs */}
      <div className="inline-flex rounded-2xl border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-900">
        <button
          onClick={() => setProductTab('active')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'active'
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          المنتجات النشطة
        </button>
        <button
          onClick={() => setProductTab('suspended')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'suspended'
            ? 'bg-amber-500 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          المنتجات المعلقة
        </button>
        <button
          onClick={() => setProductTab('incomplete')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'incomplete'
            ? 'bg-slate-700 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          المنتجات الغير مستكملة
        </button>
      </div>

      {/* Filters */}
      {!isIncompleteTab && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('products.search_placeholder')}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('products.all_stock')}</option>
            <option value="out">{t('products.out_of_stock')}</option>
            <option value="low">{t('products.low_stock')}</option>
            <option value="in">{t('products.available')}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('products.all_categories')}</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Bulk actions */}
      {!isIncompleteTab && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {t('products.selected_count', { count: selectedIds.length })}
          </span>
          <Button variant="danger" size="sm" loading={bulkDeleting} onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4" />
            {t('products.delete_selected')}
          </Button>
          <button onClick={() => setSelectedIds([])} className="text-sm text-gray-500 hover:text-gray-700">
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Product Grid */}
      {isIncompleteTab ? (
        incompleteDrafts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="لا توجد منتجات غير مستكملة"
            description="أي منتج تحفظه كغير مستكمل سيظهر هنا."
            action={{ label: t('products.add_product'), onClick: openNew }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {incompleteDrafts.map((draft) => {
              const imageUrl = draft?.productImages?.[0] || draft?.form?.primaryImagePreview || '';
              const displayUrl = resolveMediaUrl(imageUrl);
              const draftName = draft?.form?.name || 'منتج غير مسمى';
              const savedAtLabel = draft?.savedAt ? new Date(draft.savedAt).toLocaleString('ar-EG') : 'غير محدد';

              return (
                <Card key={draft.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden p-[2px]">
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={draftName}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-[calc(1rem-2px)] bg-white"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                        <Package className="w-12 h-12 mb-2" />
                        <span className="text-xs font-semibold">بدون صورة</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight">
                      {draftName}
                    </h3>
                    <p className="text-[11px] text-gray-500">آخر حفظ: {savedAtLabel}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => openIncompleteDraft(draft.id)}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        استكمال
                      </button>
                      <button
                        onClick={() => handleDeleteIncompleteDraft(draft.id)}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={isSuspendedTab ? 'لا توجد منتجات معلّقة' : t('products.no_products')}
          description={isSuspendedTab ? 'كل منتجاتك ظاهرة حالياً في المتجر.' : t('products.start_adding')}
          action={isSuspendedTab ? null : { label: t('products.add_product'), onClick: openNew }}
        />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600"
            >
              {selectedIds.length === products.length ? (
                <CheckSquare className="w-4 h-4 text-primary-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {t('products.select_all')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(prod => {
              const imageUrl = prod.thumbnail || prod.images?.[0];
              const displayUrl = resolveMediaUrl(imageUrl);

              return (
                <Card key={prod._id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-200">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(prod._id)}
                    className="absolute top-3 right-3 z-10"
                  >
                    {selectedIds.includes(prod._id) ? (
                      <CheckSquare className="w-5 h-5 text-primary-600 bg-white rounded" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>

                  {/* Image */}
                  <div
                    className="aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden p-[2px]"
                    onClick={() => { setSelectedProduct(prod); setShowDetailModal(true); }}
                  >
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={prod.name}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-[calc(1rem-2px)] group-hover:scale-105 transition-transform duration-300 bg-white"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                        <Package className="w-12 h-12 mb-2" />
                        <span className="text-xs font-semibold">{t('products.no_image')}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight">
                      {prod.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-primary-600">
                        {Number(prod.price || 0).toLocaleString('ar-EG')} {t('products.currency')}
                      </span>
                      {getStockBadge(prod)}
                    </div>

                    {/* Supplier restock */}
                    {!isSuspendedTab && prod.supplier && (
                      <button
                        onClick={() => handleRequestRestock(prod.supplier?._id || prod.supplier)}
                        disabled={sendingRestock === (prod.supplier?._id || prod.supplier)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
                      >
                        {sendingRestock === (prod.supplier?._id || prod.supplier) ? (
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                        {t('products.restock_request')}
                      </button>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <button
                        onClick={() => openEdit(prod)}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {t('products.edit')}
                      </button>
                      <button
                        onClick={() => {
                          const payload = resolveBarcodePayload(prod, barcodeMode === 'local_only' ? 'local' : 'international');
                          if (payload?.value) {
                            const svgMarkup = buildBarcodeSvg(
                              payload.value,
                              payload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'
                            );
                            printBarcodeLabel({
                              svgMarkup,
                              title: prod.name || 'Barcode Label',
                              subtitle: payload.source === 'local' ? 'Local Barcode' : 'International Barcode',
                              caption: payload.value,
                            });
                          } else {
                            toast.error('لا يوجد باركود متاح لهذا المنتج');
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        طباعة
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(prod, !isSuspendedTab)}
                        disabled={togglingSuspendId === prod._id}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${isSuspendedTab
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 hover:bg-amber-100'
                          }`}
                      >
                        {isSuspendedTab ? (
                          <PlayCircle className={`w-3.5 h-3.5 ${togglingSuspendId === prod._id ? 'animate-spin' : ''}`} />
                        ) : (
                          <PauseCircle className={`w-3.5 h-3.5 ${togglingSuspendId === prod._id ? 'animate-spin' : ''}`} />
                        )}
                        {isSuspendedTab ? 'تنشيط' : 'تعليق'}
                      </button>
                      <button
                        onClick={() => handleDelete(prod._id)}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('products.delete')}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Product Composer (Fullscreen Wizard) */}
      <ProductComposer
        open={showModal}
        onClose={handleComposerClose}
        mode={editId ? 'edit' : 'create'}
        productId={editId || ''}
        loading={saving}
        form={form}
        setForm={setForm}
        categories={categories}
        suppliers={suppliers}
        onCategoriesReload={loadCategories}
        branches={branches}
        user={user}
        can={can}
        branchScopeId={branchScopeId}
        mainBranchOption={mainBranchOption}
        productImages={productImages}
        pendingImages={pendingImages}
        maxImageCount={MAX_PRODUCT_IMAGES}
        onImagesChange={handleComposerImagesChange}
        onPrimaryImageSelect={handleComposerPrimarySelect}
        onRemoveImage={handleComposerRemoveImage}
        onSubmit={handleSave}
        onQuickSuspend={() => handleSave({ suspendAfterCreate: true })}
        onSuspendDraft={handleSuspendDraft}
        onAddVariant={handleComposerAddVariant}
        onUpdateVariant={handleComposerUpdateVariant}
        onRemoveVariant={handleComposerRemoveVariant}
        stepErrors={stepErrors}
        pricingErrors={pricingValidationErrors}
        isDirty={isFormDirty}
      />

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          open={showDetailModal}
          product={selectedProduct}
          onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
          onEdit={(productDetails) => { setShowDetailModal(false); openEdit(productDetails || selectedProduct); }}
        />
      )}

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={async (payload) => {
            const barcode = payload?.value || payload;
            setShowBarcodeScanner(false);
            const loadToast = toast.loading(t('products.searching_barcode'));
            try {
              try {
                const res = await productsApi.getByBarcode(barcode);
                if (res?.data?.data) {
                  toast.success(t('products.barcode_exists'), { id: loadToast });
                  const p = res.data.data;
                  openEdit(p);
                  return;
                }
              } catch { /* Not in local DB */ }

              const { barcodeService } = await import('../services/BarcodeService');
              const productData = await barcodeService.getProductByBarcode(barcode);

              if (productData) {
                toast.success(t('products.barcode_found'), { id: loadToast });
                setForm(prev => ({
                  ...prev,
                  barcode,
                  internationalBarcode: barcode,
                  internationalBarcodeType: payload?.format || prev.internationalBarcodeType || 'UNKNOWN',
                  name: productData.name || prev.name,
                  description: productData.brand ? `ماركة: ${productData.brand}` : prev.description
                }));
              } else {
                toast.error(t('products.barcode_not_found'), { id: loadToast });
                setForm(prev => ({
                  ...prev,
                  barcode,
                  internationalBarcode: barcode,
                  internationalBarcodeType: payload?.format || prev.internationalBarcodeType || 'UNKNOWN'
                }));
              }
            } catch (err) {
              console.error(err);
              toast.error(t('products.barcode_error'), { id: loadToast });
              setForm(prev => ({
                ...prev,
                barcode,
                internationalBarcode: barcode,
                internationalBarcodeType: payload?.format || prev.internationalBarcodeType || 'UNKNOWN'
              }));
            }
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Product Search Modal */}
      <ProductSearchModal
        open={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onSelect={handleSelectFromSearch}
      />
    </div>
  );
}
