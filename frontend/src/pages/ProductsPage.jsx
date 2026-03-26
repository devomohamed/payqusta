import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Plus, Search, Edit, Trash2, Package, Check, Truck, MessageCircle, Send, AlertTriangle, Scan, X as XIcon, CheckSquare, Square, Tag, Clock, AlertCircle, ChevronDown, ChevronRight, PauseCircle, PlayCircle, Printer, Download, Hash, Sparkles, Barcode, FileSpreadsheet } from 'lucide-react';
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
import ProductImportModal from '../components/ProductImportModal';
import { confirm } from '../components/ConfirmDialog';
import { formatFileSize, optimizeImageFilesForUpload } from '../utils/imageUpload';
import { resolveMediaUrl } from '../utils/media';
import { buildBarcodeSvg, downloadBarcodePng, printBarcodeLabel, resolveBarcodePayload } from '../utils/barcodeUtils';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import {
  MAX_PRODUCT_IMAGES,
  buildProductDraftStorageKey,
  buildProductRecoveryStorageKey,
  createDraftId,
  createEmptyProductForm,
  getPricingValidationErrors,
  hasValue,
  normalizeBranchAvailabilityPayload,
  normalizeDraftEntries,
  normalizeInventoryPayload,
  sanitizeFormForDraft,
  toServerMediaPath,
} from './productsPageHelpers';

const CategoriesPage = lazy(() => import('./CategoriesPage'));

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [stepErrors, setStepErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
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

  const clearPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      prev.forEach((file) => {
        if (file?._previewUrl) {
          URL.revokeObjectURL(file._previewUrl);
        }
      });
      return [];
    });
  }, []);

  useEffect(() => () => {
    clearPendingImages();
  }, [clearPendingImages]);

  const showBarcodeReadyToast = useCallback((product, { autoGenerated = false } = {}) => {
    const payload = resolveBarcodePayload(product, product?.localBarcode ? 'local' : 'international');
    if (!payload?.value) return;

    const productName = product?.name || t('products_page.toasts.k8z4am3');
    const sourceLabel = payload.source === 'local' ? t('products_page.ui.kadubca') : t('products_page.ui.kae7t15');

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
        toast.error(action === 'download' ? t('products_page.ui.kve3g5') : t('products_page.ui.k2zj7vu'));
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
                {autoGenerated ? t('products_page.ui.kl7kq4v') : 'الباركود جاهز للطباعة'}
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
                  {t('products_page.ui.kugiijs')}
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
              {t('products_page.ui.ktjyneh')}
            </button>
            <button
              type="button"
              onClick={() => void runBarcodeAction('print', toastInstance.id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5"
            >
              <Printer className="h-4 w-4" />
              {t('products_page.ui.kff4gsl')}
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
    clearPendingImages();
    setStepErrors({});
    setShowModal(true);
    toast.success(t('products_page.toasts.khp51pb'));
  }, [clearPendingImages, editId, loadRecoveryDraftFromStorage, recoveryDraftChecked, showModal]);

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
      branchAvailability: normalizeBranchAvailabilityPayload(prod.branchAvailability || []),
      primaryImagePreview: formatImageUrl(prod.thumbnail || prod.images?.[0] || null),
      seoTitle: prod.seoTitle || '',
      seoDescription: prod.seoDescription || ''
    });
    setProductImages((prod.images || []).map(formatImageUrl));
    clearPendingImages();
    setStepErrors({});
    setShowModal(true);
  };

  const openNew = () => {
    clearRecoveryDraftFromStorage();
    setEditId(null);
    setActiveDraftId('');
    setForm(createEmptyProductForm());
    setProductImages([]);
    clearPendingImages();
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
      toast.error(t('products_page.toasts.k5jn69e'));
      refreshIncompleteDrafts();
      return;
    }

    clearRecoveryDraftFromStorage();
    setEditId(null);
    setActiveDraftId(draft.id);
    setForm({ ...createEmptyProductForm(), ...draft.form });
    setProductImages(Array.isArray(draft.productImages) ? draft.productImages : []);
    clearPendingImages();
    setStepErrors({});
    setShowModal(true);
    toast.success(t('products_page.toasts.k2f8hmp'));
  };

  const validateProductComposer = () => {
    const nextFieldErrors = {};
    const currentPricingErrors = getPricingValidationErrors(form, { requireSalePrice: true });

    if (!form.name?.trim()) {
      nextFieldErrors.name = 'name_required';
    }

    if (Object.keys(currentPricingErrors).length > 0) {
      Object.assign(nextFieldErrors, currentPricingErrors);
    }

    if (form.variants && form.variants.length > 0) {
      const invalidVariantIndex = form.variants.findIndex((v) => !v.price);
      if (invalidVariantIndex >= 0) {
        nextFieldErrors[`variants.${invalidVariantIndex}.price`] = 'variant_price_required';
      }
    }

    const nextStepErrors = {
      basics: !!nextFieldErrors.name,
      pricing: !!(nextFieldErrors.price || nextFieldErrors.costPrice || nextFieldErrors.wholesalePrice || nextFieldErrors.compareAtPrice),
      media: Object.keys(nextFieldErrors).some((key) => key.startsWith('variants')),
    };

    setStepErrors(nextStepErrors);
    setFieldErrors(nextFieldErrors);

    return Object.keys(nextFieldErrors).length === 0;
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
      notify.error(t('products.review_steps'), t('products.field_errors'));
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
      const normalizedBranchAvailability = normalizeBranchAvailabilityPayload(form.branchAvailability || []);
      if (normalizedInventory.length > 0) {
        formData.append('inventory', JSON.stringify(normalizedInventory));
      } else if ((user?.role === 'admin' || !!user?.isSuperAdmin) && tenant?._id) {
        // Admin users without explicit inventory fall back to main branch context.
        formData.append('branchId', String(tenant._id));
      }
      if (normalizedBranchAvailability.length > 0) {
        formData.append('branchAvailability', JSON.stringify(normalizedBranchAvailability));
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
            defaultValue: t('products_page.ui.khfw1tx'),
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
            defaultValue: t('products_page.ui.kfaf5vq'),
            before: formatFileSize(rawPendingBytes),
            after: formatFileSize(optimizedPendingBytes),
          })
          : t('products.uploading_after_prepare', {
            defaultValue: t('products_page.ui.kcw97ux'),
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
              defaultValue: t('products_page.ui.ksc1jy2'),
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
              barcodeError?.response?.data?.message || t('products_page.toasts.k719ija')
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
      clearPendingImages();
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
      toast.error(t('products.draft_save_error', { defaultValue: t('products_page.ui.kc667e7') }));
      return;
    }

    if (pendingImages.length > 0) {
      toast(t('products.draft_saved_without_pending_images', { defaultValue: t('products_page.ui.kce0zt6') }));
    }

    setShowModal(false);
    clearPendingImages();
    setStepErrors({});
    setActiveDraftId(draftId);
    setProductTab('incomplete');
    toast.success(t('products_page.toasts.kwba2nd'));
  }, [activeDraftId, clearPendingImages, editId, form, pendingImages.length, persistIncompleteDraft, productImages, t]);

  const handleComposerClose = () => {
    if (saving) return;
    clearRecoveryDraftFromStorage();
    setForm(createEmptyProductForm());
    setProductImages([]);
    clearPendingImages();
    setStepErrors({});
    setEditId(null);
    setActiveDraftId('');
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    const approved = await confirm.delete(t('products_page.ui.kp90yd'));
    if (!approved) return;

    try {
      await productsApi.delete(id);
      notify.success(t('products_page.ui.k293nb9'), t('products_page.ui.kwtu2as'));
      loadProducts();
    } catch {
      notify.error(t('products_page.ui.k5302nl'), t('products_page.ui.kw4gt8w'));
    }
  };

  const handleToggleSuspension = async (product, shouldSuspend) => {
    const approved = await confirm.show({
      type: 'warning',
      title: shouldSuspend ? t('products_page.ui.kwwf12l') : t('products_page.ui.kib64ke'),
      message: shouldSuspend
        ? `هل تريد تعليق المنتج "${product.name}"؟ لن يظهر في المتجر بعد الآن.`
        : `هل تريد إلغاء تعليق المنتج "${product.name}"؟ سيظهر مرة أخرى في المتجر.`,
      confirmLabel: shouldSuspend ? t('products_page.ui.kwwf12l') : t('products_page.ui.k1emzzv'),
      cancelLabel: t('products_page.ui.kouah6d'),
    });

    if (!approved) return;

    setTogglingSuspendId(product._id);
    try {
      await productsApi.setSuspended(product._id, shouldSuspend);
      toast.success(shouldSuspend ? t('products_page.ui.km51shk') : t('products_page.ui.kb5py0t'));
      setSelectedIds(prev => prev.filter(id => id !== product._id));
      loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || t('products_page.toasts.k6qn126'));
    } finally {
      setTogglingSuspendId(null);
    }
  };

  const handleDeleteIncompleteDraft = async (draftId) => {
    const approved = await confirm.delete(t('products_page.ui.ka2ypsc'));
    if (!approved) return;

    const removed = removeIncompleteDraft(draftId);
    if (!removed) {
      toast.error(t('products_page.toasts.kbf93qo'));
      return;
    }

    if (activeDraftId === draftId) {
      setActiveDraftId('');
    }

    toast.success(t('products_page.toasts.kqmcfej'));
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
      title: t('products_page.ui.k1k43hu'),
      message: `هل أنت متأكد من حذف ${total} منتج؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: `حذف ${total} منتج`,
      cancelLabel: t('products_page.ui.kouah6d'),
    });
    if (!approved) return;

    setBulkDeleting(true);
    try {
      await api.post('/products/bulk-delete', { ids: selectedIds });
      notify.success(`تم حذف ${total} منتج بنجاح`);
      setSelectedIds([]);
      loadProducts();
    } catch {
      notify.error(t('products_page.toasts.kbb66c7'));
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
    setShowModal(true); // Open the product composer after importing data
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
    if (!form.primaryImagePreview && filesWithUrls[0]?._previewUrl) {
      setForm(prev => ({
        ...prev,
        primaryImagePreview: prev.primaryImagePreview || filesWithUrls[0]._previewUrl,
      }));
    }
  };

  const handleComposerPendingImageReplace = (index, nextFile) => {
    if (!nextFile) return;

    setPendingImages(prev => {
      if (!prev[index]) return prev;

      const next = [...prev];
      const previousFile = next[index];
      const previousPreview = previousFile?._previewUrl || '';
      const replacementFile = nextFile;
      replacementFile._previewUrl = URL.createObjectURL(replacementFile);
      next[index] = replacementFile;

      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
        setForm(currentForm => ({
          ...currentForm,
          primaryImagePreview: currentForm.primaryImagePreview === previousPreview
            ? replacementFile._previewUrl
            : currentForm.primaryImagePreview,
        }));
      }

      return next;
    });
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
        const remainingPending = prev.filter((_, i) => i !== urlOrIndex);
        if (removed?._previewUrl) {
          // Clear primary preview if this image was selected as primary
          if (form.primaryImagePreview === removed._previewUrl) {
            setForm(f => ({
              ...f,
              primaryImagePreview: remainingPending[0]?._previewUrl || productImages[0] || null,
            }));
          }
          URL.revokeObjectURL(removed._previewUrl);
        }
        return remainingPending;
      });
    } else {
      // type === 'existing', urlOrIndex is the image URL
      const imageUrl = urlOrIndex;
      setProductImages(prev => {
        const remainingExisting = prev.filter(img => img !== imageUrl);
        if (form.primaryImagePreview === imageUrl) {
          setForm(currentForm => ({
            ...currentForm,
            primaryImagePreview: remainingExisting[0] || pendingImages[0]?._previewUrl || null,
          }));
        }
        return remainingExisting;
      });
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
    <div className="space-y-6 app-text-soft">
      <div className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
              <Package className="w-7 h-7 text-primary-600" />
              {t('products.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('products_page.ui.ku3cks0')}
            </p>
            <p className="mt-1 text-xs font-bold text-primary-600 dark:text-primary-300">
              {t('products.total_count', { count: headerProductsCount })}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setActivePageTab('categories')} className="w-full sm:w-auto justify-center">
              <Tag className="w-4 h-4" />
              {t('products.manage_categories')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBarcodeScanner(true)} className="w-full sm:w-auto justify-center">
              <Scan className="w-4 h-4" />
              {t('products.scan_barcode')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowProductSearch(true)} className="w-full sm:w-auto justify-center">
              <Search className="w-4 h-4" />
              {t('products.import_product')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)} className="w-full sm:w-auto justify-center">
              <FileSpreadsheet className="w-4 h-4" />
              {t('products_page.ui.kovwyt8')}
            </Button>
            <Button onClick={openNew} className="col-span-2 w-full justify-center sm:col-span-1 sm:w-auto">
              <Plus className="w-4 h-4" />
              {t('products.add_product')}
            </Button>
          </div>
        </div>
      </div>

      {/* Products Tabs */}
      <div className="app-surface flex w-full sm:w-auto overflow-x-auto no-scrollbar rounded-2xl p-1">
        <button
          onClick={() => setProductTab('active')}
          className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'active'
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          {t('products_page.ui.k8wwbwa')}
        </button>
        <button
          onClick={() => setProductTab('suspended')}
          className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'suspended'
            ? 'bg-amber-500 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          {t('products_page.ui.k7t29b7')}
        </button>
        <button
          onClick={() => setProductTab('incomplete')}
          className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 text-sm font-bold rounded-xl transition-colors ${productTab === 'incomplete'
            ? 'bg-slate-700 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          {t('products_page.ui.k1pr0fe')}
        </button>
      </div>

      {/* Filters */}
      {!isIncompleteTab && (
        <div className="app-surface-muted grid grid-cols-1 gap-3 rounded-2xl p-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('products.search_placeholder')}
              className="app-surface w-full rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="app-surface w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto"
          >
            <option value="">{t('products.all_stock')}</option>
            <option value="out_of_stock">{t('products.out_of_stock')}</option>
            <option value="low_stock">{t('products.low_stock')}</option>
            <option value="in_stock">{t('products.available')}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="app-surface w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto"
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
        <div className="app-surface-muted flex flex-col items-start gap-3 rounded-xl border border-primary-200 p-3 dark:border-primary-800 sm:flex-row sm:items-center">
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
            title={t('products_page.titles.kpk4w44')}
            description="أي منتج تحفظه كغير مستكمل سيظهر هنا."
            action={{ label: t('products.add_product'), onClick: openNew }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {incompleteDrafts.map((draft) => {
              const imageUrl = draft?.productImages?.[0] || draft?.form?.primaryImagePreview || '';
              const displayUrl = resolveMediaUrl(imageUrl);
              const draftName = draft?.form?.name || t('products_page.toasts.kimm1si');
              const savedAtLabel = draft?.savedAt ? new Date(draft.savedAt).toLocaleString('ar-EG') : t('products_page.ui.k5xt5xj');

              return (
                <Card key={draft.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
                  <div className="app-surface-muted aspect-square overflow-hidden p-[2px]">
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
                        <span className="text-xs font-semibold">{t('products_page.ui.k8bzvuu')}</span>
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
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-50 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/20"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {t('products_page.ui.kram2l9')}
                      </button>
                      <button
                        onClick={() => handleDeleteIncompleteDraft(draft.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('products_page.ui.delete')}
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
          title={isSuspendedTab ? t('products_page.ui.ktjrwg0') : t('products.no_products')}
          description={isSuspendedTab ? t('products_page.ui.k5dyq1m') : t('products.start_adding')}
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
                    className="app-surface-muted aspect-square cursor-pointer overflow-hidden p-[2px]"
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <button
                        onClick={() => openEdit(prod)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-50 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/20"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {t('products.edit')}
                      </button>
                      <button
                        title={t('products_page.titles.kqrpd9u')}
                        onClick={() => {
                          const payload = resolveBarcodePayload(prod, barcodeMode === 'local_only' ? 'local' : 'international');
                          if (payload?.value) {
                            const svgMarkup = buildBarcodeSvg(
                              payload.value,
                              payload.type === 'QR_CODE' ? 'QR_CODE' : 'CODE128'
                            );
                            printBarcodeLabel({
                              svgMarkup,
                              title: prod.name || t('products_page.toasts.k53y2ms'),
                              subtitle: payload.source === 'local' ? t('products_page.ui.kadubca') : t('products_page.ui.kae7t15'),
                              caption: payload.value,
                            });
                          } else {
                            toast.error(t('products_page.toasts.ktg0z9z'));
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-50 py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100 dark:bg-purple-900/20"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        {t('products_page.ui.print')}
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(prod, !isSuspendedTab)}
                        disabled={togglingSuspendId === prod._id}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isSuspendedTab
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 hover:bg-amber-100'
                          }`}
                      >
                        {isSuspendedTab ? (
                          <PlayCircle className={`w-3.5 h-3.5 ${togglingSuspendId === prod._id ? 'animate-spin' : ''}`} />
                        ) : (
                          <PauseCircle className={`w-3.5 h-3.5 ${togglingSuspendId === prod._id ? 'animate-spin' : ''}`} />
                        )}
                        {isSuspendedTab ? t('products_page.ui.kox2mit') : 'تعليق'}
                      </button>
                      <button
                        onClick={() => handleDelete(prod._id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20"
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
        onPendingImageReplace={handleComposerPendingImageReplace}
        onPrimaryImageSelect={handleComposerPrimarySelect}
        onRemoveImage={handleComposerRemoveImage}
        onSubmit={handleSave}
        onQuickSuspend={() => handleSave({ suspendAfterCreate: true })}
        onSuspendDraft={handleSuspendDraft}
        onAddVariant={handleComposerAddVariant}
        onUpdateVariant={handleComposerUpdateVariant}
        onRemoveVariant={handleComposerRemoveVariant}
        stepErrors={stepErrors}
        fieldErrors={fieldErrors}
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

      {/* Product Import Modal */}
      <ProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadProducts}
      />
    </div>
  );
}
