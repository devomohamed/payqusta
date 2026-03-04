import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Plus, Search, Edit, Trash2, Package, Check, Truck, MessageCircle, Send, AlertTriangle, Scan, X as XIcon, CheckSquare, Square, Tag, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { productsApi, suppliersApi, categoriesApi, api, useAuthStore } from '../store';
import { Button, Input, Select, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSearchModal from '../components/ProductSearchModal';
import ProductComposer from '../components/products/ProductComposer';

const CategoriesPage = lazy(() => import('./CategoriesPage'));

export default function ProductsPage() {
  const { user, can } = useAuthStore();
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
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingRestock, setSendingRestock] = useState(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', category: '', subcategory: '', price: '', costPrice: '',
    wholesalePrice: '', shippingCost: '', isFreeShipping: false,
    stock: '', minStockAlert: '5', description: '', supplier: '', expiryDate: '',
    variants: [], primaryImagePreview: null, seoTitle: '', seoDescription: ''
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [stepErrors, setStepErrors] = useState({});
  const LIMIT = 8;

  useEffect(() => {
    categoriesApi.getTree().then((r) => setCategories(r.data.data || [])).catch(() => { });
    suppliersApi.getAll({ limit: 100 }).then((r) => setSuppliers(r.data.data || [])).catch(() => { });
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: debouncedSearch };
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
      toast.error('خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, stockFilter, categoryFilter, supplierFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [debouncedSearch, stockFilter, categoryFilter, supplierFilter]);

  const openEdit = (prod) => {
    setEditId(prod._id);
    const formatImageUrl = (url) => url?.startsWith('/uploads/')
      ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${url}`
      : url;

    setForm({
      name: prod.name || '',
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      category: prod.category?._id || prod.category || '',
      subcategory: prod.subcategory?._id || prod.subcategory || '',
      price: prod.price || '',
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
    setEditId(null);
    setForm({
      name: '', sku: '', barcode: '', category: '', subcategory: '', price: '', costPrice: '',
      wholesalePrice: '', shippingCost: '', isFreeShipping: false,
      stock: '', minStockAlert: '5', description: '', supplier: '', expiryDate: '',
      variants: [], primaryImagePreview: null, seoTitle: '', seoDescription: ''
    });
    setProductImages([]);
    setPendingImages([]);
    setStepErrors({});
    setShowModal(true);
  };

  const validateProductComposer = () => {
    const errors = { basics: false, pricing: false, media: false };
    if (!form.name || !form.category) errors.basics = true;
    if (!form.price || Number(form.price) <= 0) errors.pricing = true;
    if (form.variants && form.variants.length > 0) {
      const invalid = form.variants.some(v => !v.price);
      if (invalid) errors.pricing = true;
    }
    setStepErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const handleSave = async () => {
    if (!validateProductComposer()) {
      notify({ title: 'أخطاء في الحقول', description: 'يرجى مراجعة الخطوات المميزة باللون الأحمر', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.sku) formData.append('sku', form.sku);
      if (form.barcode) formData.append('barcode', form.barcode);
      formData.append('category', form.category);
      if (form.subcategory) formData.append('subcategory', form.subcategory);
      formData.append('description', form.description || '');
      if (form.supplier) formData.append('supplier', form.supplier);
      formData.append('price', form.price);
      if (form.costPrice) formData.append('cost', form.costPrice);
      if (form.wholesalePrice) formData.append('wholesalePrice', form.wholesalePrice);
      if (form.isFreeShipping) {
        formData.append('shippingCost', 0);
      } else if (form.shippingCost) {
        formData.append('shippingCost', form.shippingCost);
      }
      formData.append('stock[quantity]', form.stock || 0);
      formData.append('stock[minQuantity]', form.minStockAlert || 5);
      if (form.expiryDate) formData.append('expiryDate', form.expiryDate);
      if (form.seoTitle) formData.append('seoTitle', form.seoTitle);
      if (form.seoDescription) formData.append('seoDescription', form.seoDescription);
      formData.append('variants', JSON.stringify(form.variants || []));

      // Sort existing images so the selected primary is first
      const sortedExisting = form.primaryImagePreview && productImages.includes(form.primaryImagePreview)
        ? [form.primaryImagePreview, ...productImages.filter(i => i !== form.primaryImagePreview)]
        : productImages;

      const getRelativeUrl = (url) => {
        if (!url) return url;
        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
          return url.startsWith(apiBaseUrl) ? url.replace(apiBaseUrl, '') : url;
        } catch { return url; }
      };

      sortedExisting.forEach(img => formData.append('existingImages', getRelativeUrl(img)));

      // Sort pending images so the selected primary is first (identify by _previewUrl)
      const primaryPendingIdx = pendingImages.findIndex(f => f._previewUrl === form.primaryImagePreview);
      const sortedPending = primaryPendingIdx > 0
        ? [pendingImages[primaryPendingIdx], ...pendingImages.filter((_, i) => i !== primaryPendingIdx)]
        : pendingImages;
      sortedPending.forEach(file => formData.append('images', file));

      // Only send primaryImage if it's an existing server path (not a blob URL)
      const primaryIsExisting = form.primaryImagePreview && !form.primaryImagePreview.startsWith('blob:');
      if (primaryIsExisting) {
        formData.append('primaryImage', getRelativeUrl(form.primaryImagePreview));
      } else if (sortedExisting.length > 0 && sortedPending.length === 0) {
        // Fallback: only use the first existing image if there are no new uploads at all
        formData.append('primaryImage', getRelativeUrl(sortedExisting[0]));
      }
      // If primary is a pending image, don't send primaryImage. The backend uses the first uploaded image.

      if (editId) {
        await productsApi.update(editId, formData);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await productsApi.create(formData);
        toast.success('تم اضافة المنتج بنجاح');
      }
      setShowModal(false);
      setPendingImages([]);
      setProductImages([]);
      loadProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ غير متوقع أثناء الحفظ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    notify.custom({
      type: 'error',
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.',
      duration: 10000,
      action: {
        label: 'تأكيد الحذف',
        onClick: async () => {
          try {
            await productsApi.delete(id);
            notify.success('تم حذف المنتج بنجاح', 'تم الحذف');
            loadProducts();
          } catch {
            notify.error('فشل حذف المنتج', 'خطأ في الحذف');
          }
        }
      }
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map(p => p._id));
  };
  const handleBulkDelete = () => {
    notify.custom({
      type: 'error',
      title: 'تأكيد الحذف الجماعي',
      message: `هل أنت متأكد من حذف ${selectedIds.length} منتج؟`,
      duration: 10000,
      action: {
        label: `حذف ${selectedIds.length} منتج`,
        onClick: async () => {
          setBulkDeleting(true);
          try {
            await api.post('/products/bulk-delete', { ids: selectedIds });
            notify.success(`تم حذف ${selectedIds.length} منتج بنجاح`);
            setSelectedIds([]);
            loadProducts();
          } catch {
            notify.error('حدث خطأ في الحذف الجماعي');
          } finally {
            setBulkDeleting(false);
          }
        }
      }
    });
  };

  const handleRequestRestock = async (supplierId) => {
    setSendingRestock(supplierId);
    try {
      const res = await suppliersApi.requestRestock(supplierId);
      if (res.data.data?.whatsappSent) {
        toast.success(`تم إرسال طلب إعادة التخزين للمورد عبر WhatsApp\n${res.data.data.productsCount} منتج`);
      } else {
        toast.success(`تم إعداد طلب إعادة التخزين (${res.data.data?.productsCount || 0} منتج)`);
      }
    } catch {
      toast.error('خطأ في إرسال طلب إعادة التخزين');
    } finally {
      setSendingRestock(null);
    }
  };

  const handleSelectFromSearch = (product) => {
    setForm({
      ...form,
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      category: product.category?._id || product.category || '',
      price: String(product.price || 0),
      costPrice: String(product.cost || 0),
      description: product.description || '',
      supplier: product.supplier?._id || product.supplier || ''
    });
    setShowProductSearch(false);
    toast.success('تم استيراد بيانات المنتج بنجاح');
  };

  const handleComposerImagesChange = (e) => {
    const files = e?.target?.files ? Array.from(e.target.files) : (Array.isArray(e) ? e : []);
    // Attach a stable preview URL to each file so we can reliably remove it later
    const filesWithUrls = files.map(file => {
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
      variants[index] = { ...variants[index], [field]: value };
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
    if (qty === 0) return <Badge variant="danger">نفد المخزون</Badge>;
    if (qty <= min) return <Badge variant="warning">مخزون منخفض</Badge>;
    return <Badge variant="success">متاح ({qty})</Badge>;
  };

  if (activePageTab === 'categories') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <div>
          <button
            onClick={() => setActivePageTab('products')}
            className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" /> العودة للمنتجات
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
            إدارة المنتجات
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {pagination.totalItems} منتج في المخزون
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setActivePageTab('categories')}>
            <Tag className="w-4 h-4" />
            إدارة التصنيفات
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBarcodeScanner(true)}>
            <Scan className="w-4 h-4" />
            مسح باركود
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowProductSearch(true)}>
            <Search className="w-4 h-4" />
            استيراد منتج
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">كل المخزون</option>
          <option value="out">نفد المخزون</option>
          <option value="low">مخزون منخفض</option>
          <option value="in">متاح</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">كل التصنيفات</option>
          {categories.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedIds.length} منتج محدد
          </span>
          <Button variant="danger" size="sm" loading={bulkDeleting} onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4" />
            حذف المحدد
          </Button>
          <button onClick={() => setSelectedIds([])} className="text-sm text-gray-500 hover:text-gray-700">
            إلغاء
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد منتجات"
          description="ابدأ بإضافة منتجك الأول للمتجر"
          action={{ label: 'إضافة منتج', onClick: openNew }}
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
              تحديد الكل
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(prod => {
              const imageUrl = prod.thumbnail || prod.images?.[0];
              const displayUrl = imageUrl?.startsWith('/uploads/')
                ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${imageUrl}`
                : imageUrl;

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
                        <span className="text-xs font-semibold">بدون صورة</span>
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
                        {Number(prod.price || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                      {getStockBadge(prod)}
                    </div>

                    {/* Supplier restock */}
                    {prod.supplier && (
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
                        طلب إعادة تخزين
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEdit(prod)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(prod._id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors"
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
        onClose={() => setShowModal(false)}
        mode={editId ? 'edit' : 'create'}
        loading={saving}
        form={form}
        setForm={setForm}
        categories={categories}
        suppliers={suppliers}
        productImages={productImages}
        pendingImages={pendingImages}
        onImagesChange={handleComposerImagesChange}
        onPrimaryImageSelect={handleComposerPrimarySelect}
        onRemoveImage={handleComposerRemoveImage}
        onSubmit={handleSave}
        onAddVariant={handleComposerAddVariant}
        onUpdateVariant={handleComposerUpdateVariant}
        onRemoveVariant={handleComposerRemoveVariant}
        stepErrors={stepErrors}
      />

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
          onEdit={() => { setShowDetailModal(false); openEdit(selectedProduct); }}
        />
      )}

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={async (barcode) => {
            setShowBarcodeScanner(false);
            const loadToast = toast.loading('جاري البحث عن بيانات المنتج...');
            try {
              try {
                const res = await productsApi.getByBarcode(barcode);
                if (res?.data?.data) {
                  toast.success('هذا الباركود موجود بالفعل! تم فتحه للتعديل...', { id: loadToast });
                  const p = res.data.data;
                  openEdit(p);
                  return;
                }
              } catch { /* Not in local DB */ }

              const { barcodeService } = await import('../services/BarcodeService');
              const productData = await barcodeService.getProductByBarcode(barcode);

              if (productData) {
                toast.success('تم العثور على بيانات المنتج!', { id: loadToast });
                setForm(prev => ({
                  ...prev,
                  barcode,
                  name: productData.name || prev.name,
                  description: productData.brand ? `ماركة: ${productData.brand}` : prev.description
                }));
              } else {
                toast.error('لم يتم العثور على بيانات للمنتج، لكن تم تسجيل الباركود.', { id: loadToast });
                setForm(prev => ({ ...prev, barcode }));
              }
            } catch (err) {
              console.error(err);
              toast.error('خطأ في البحث، تم تسجيل الباركود فقط', { id: loadToast });
              setForm(prev => ({ ...prev, barcode }));
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
