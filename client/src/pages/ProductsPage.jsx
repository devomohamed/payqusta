import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Package, Check, Truck, MessageCircle, Send, AlertTriangle, Scan, Upload, X as XIcon, Image as ImageIcon, CheckSquare, Square, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { productsApi, suppliersApi, api } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState, TextArea } from '../components/UI';
import Pagination from '../components/Pagination';
import BarcodeScanner from '../components/BarcodeScanner';
import RichTextEditor from '../components/RichTextEditor';

export default function ProductsPage() {
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
  const [sendingRestock, setSendingRestock] = useState(null); // supplier ID being sent
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', category: 'هواتف', price: '', cost: '',
    stockQuantity: '', minQuantity: '5', description: '', supplier: '', expiryDate: '',
  });
  const LIMIT = 8;

  const [pendingImages, setPendingImages] = useState([]);

  // Load categories & suppliers once
  useEffect(() => {
    productsApi.getCategories().then((r) => setCategories(r.data.data || [])).catch(() => { });
    suppliersApi.getAll({ limit: 100 }).then((r) => setSuppliers(r.data.data || [])).catch(() => { });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search };
      if (stockFilter) params.stockStatus = stockFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (supplierFilter) params.supplier = supplierFilter;
      const res = await productsApi.getAll(params);
      setProducts(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error('خطأ في تحميل المنتجات'); }
    finally { setLoading(false); }
  }, [page, search, stockFilter, categoryFilter, supplierFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [search, stockFilter, categoryFilter, supplierFilter]);

  const openAdd = () => { setEditId(null); setProductImages([]); setPendingImages([]); setForm({ name: '', sku: '', barcode: '', category: categories[0] || 'هواتف', price: '', cost: '', stockQuantity: '', minQuantity: '5', description: '', supplier: '', expiryDate: '' }); setShowModal(true); };
  const openEdit = (p) => { setEditId(p._id); setProductImages(p.images || []); setPendingImages([]); setForm({ name: p.name, sku: p.sku || '', barcode: p.barcode || '', category: p.category, price: String(p.price), cost: String(p.cost), stockQuantity: String(p.stock?.quantity || 0), minQuantity: String(p.stock?.minQuantity || 5), description: p.description || '', supplier: p.supplier?._id || p.supplier || '', expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error('الاسم والسعر مطلوبين');
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.supplier) delete data.supplier;
      let createdId = editId;

      if (editId) {
        await productsApi.update(editId, data);
        toast.success('تم تحديث المنتج ✅');
      } else {
        const res = await productsApi.create(data);
        createdId = res.data.data._id;
        toast.success('تم إضافة المنتج ✅');
      }

      // Upload pending images if any (only for new products or new images in edit mode if we supported it there too)
      if (pendingImages.length > 0 && createdId) {
        const loadToast = toast.loading('جاري رفع الصور...');
        try {
          const formData = new FormData();
          for (let i = 0; i < pendingImages.length; i++) {
            formData.append('images', pendingImages[i]);
          }
          formData.append('setAsThumbnail', (!editId || productImages.length === 0) ? 'true' : 'false');
          await productsApi.uploadImage(createdId, formData);
          toast.success('تم رفع الصور بنجاح', { id: loadToast });
        } catch (err) {
          toast.error('فشل رفع الصور', { id: loadToast });
        }
      }

      setShowModal(false);
      setPendingImages([]);
      loadProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
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
          } catch (err) {
            notify.error('فشل حذف المنتج', 'خطأ في الحذف');
          }
        },
      },
    });
  };

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map((p) => p._id));
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
          } catch { notify.error('حدث خطأ في الحذف الجماعي'); }
          finally { setBulkDeleting(false); }
        },
      },
    });
  };

  // Request restock from supplier
  const handleRequestRestock = async (supplierId) => {
    setSendingRestock(supplierId);
    try {
      const res = await suppliersApi.requestRestock(supplierId);
      if (res.data.data?.whatsappSent) {
        toast.success(`تم إرسال طلب إعادة التخزين للمورد عبر WhatsApp ✅\n${res.data.data.productsCount} منتج`);
      } else {
        toast.success(`تم إعداد طلب إعادة التخزين (${res.data.data?.productsCount || 0} منتج)`);
      }
    } catch (err) {
      toast.error('خطأ في إرسال طلب إعادة التخزين');
    } finally {
      setSendingRestock(null);
    }
  };

  // Upload image
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate files
    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) return toast.error('الملفات يجب أن تكون صور فقط');
      if (files[i].size > 5 * 1024 * 1024) return toast.error('حجم الصورة يجب ألا يتجاوز 5MB');
    }

    if (editId) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        // Append all files to 'images' field
        for (let i = 0; i < files.length; i++) {
          formData.append('images', files[i]);
        }
        formData.append('setAsThumbnail', productImages.length === 0 ? 'true' : 'false');

        const res = await productsApi.uploadImage(editId, formData);

        // Update state with new images (backend returns { images: [...] })
        const newImages = res.data.data.images || [res.data.data.image]; // Fallback for single
        setProductImages([...productImages, ...newImages]);

        toast.success(`تم رفع ${files.length > 1 ? files.length + ' صور' : 'الصورة'} بنجاح ✅`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'خطأ في رفع الصور');
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    } else {
      // Pending upload
      setPendingImages([...pendingImages, ...Array.from(files)]);
      toast.success(`تم اختيار ${files.length} صور (سيتم الرفع عند الحفظ)`);
      e.target.value = '';
    }
  };

  // Delete image
  const handleDeleteImage = async (imageUrl) => {
    if (!editId) return; // Should not happen for pending images via this function

    if (confirm('هل أنت متأكد من حذف الصورة؟')) {
      try {
        await productsApi.deleteImage(editId, imageUrl);
        setProductImages(productImages.filter(img => img !== imageUrl));
        toast.success('تم حذف الصورة');
      } catch (err) {
        toast.error('خطأ في حذف الصورة');
      }
    }
  };

  const removePendingImage = (index) => {
    setPendingImages(pendingImages.filter((_, i) => i !== index));
  };

  const statusBadge = (s) => s === 'in_stock' ? <Badge variant="success">متوفر</Badge> : s === 'low_stock' ? <Badge variant="warning">منخفض ⚠️</Badge> : <Badge variant="danger">نفذ 🚨</Badge>;
  const catIcon = (c) => c === 'هواتف' ? '📱' : c === 'لابتوب' ? '💻' : c === 'تابلت' ? '📟' : c === 'شاشات' ? '🖥️' : c === 'إكسسوارات' ? '🎧' : '📦';

  const getSupplierName = (p) => {
    if (p.supplier?.name) return p.supplier.name;
    const found = suppliers.find((s) => s._id === p.supplier);
    return found?.name || null;
  };

  const getSupplierPhone = (p) => {
    if (p.supplier?.phone) return p.supplier.phone;
    const found = suppliers.find((s) => s._id === p.supplier);
    return found?.phone || null;
  };

  const getSupplierId = (p) => {
    if (p.supplier?._id) return p.supplier._id;
    return p.supplier || null;
  };

  const activeFilters = [stockFilter, categoryFilter, supplierFilter].filter(Boolean).length;

  // Count low stock products by supplier
  const lowStockBySupplier = products.reduce((acc, p) => {
    if (p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock') {
      const suppId = getSupplierId(p);
      if (suppId) {
        if (!acc[suppId]) acc[suppId] = { count: 0, name: getSupplierName(p), phone: getSupplierPhone(p) };
        acc[suppId].count++;
      }
    }
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الكود..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary-500 transition-all" />
        </div>

        {/* Category Dropdown */}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">📂 كل الفئات</option>
          {categories.map((cat) => (<option key={cat} value={cat}>{catIcon(cat)} {cat}</option>))}
        </select>

        {/* Supplier Dropdown */}
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">🚛 كل الموردين</option>
          {suppliers.map((s) => (<option key={s._id} value={s._id}>{s.name}</option>))}
        </select>

        {/* Stock Filter */}
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">📦 كل المخزون</option>
          <option value="in_stock">✅ متوفر</option>
          <option value="low_stock">⚠️ منخفض</option>
          <option value="out_of_stock">🚨 نفذ</option>
        </select>

        {activeFilters > 0 && (
          <button onClick={() => { setStockFilter(''); setCategoryFilter(''); setSupplierFilter(''); setSearch(''); }}
            className="text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            مسح الفلاتر ({activeFilters})
          </button>
        )}

        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>إضافة منتج</Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-200 dark:border-primary-500/30 animate-fade-in">
          <button onClick={toggleSelectAll} className="p-1">
            {selectedIds.length === products.length ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-primary-500" />}
          </button>
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">تم تحديد {selectedIds.length} منتج</span>
          <div className="mr-auto flex gap-2">
            <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} loading={bulkDeleting} onClick={handleBulkDelete}>
              حذف المحدد
            </Button>
            <button onClick={() => setSelectedIds([])} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <XCircle className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Low Stock Supplier Alert */}
      {Object.keys(lowStockBySupplier).length > 0 && (
        <Card className="p-4 border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h4 className="font-bold text-amber-700 dark:text-amber-400">منتجات تحتاج إعادة تخزين</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(lowStockBySupplier).map(([suppId, info]) => (
              <div key={suppId} className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-sm">
                <div>
                  <p className="font-semibold text-sm">{info.name}</p>
                  <p className="text-xs text-red-500">{info.count} منتج منخفض</p>
                </div>
                <Button
                  size="sm"
                  variant="whatsapp"
                  loading={sendingRestock === suppId}
                  onClick={() => handleRequestRestock(suppId)}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  طلب تخزين
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Products Grid */}
      {loading ? <LoadingSpinner /> : products.length === 0 ? (
        <EmptyState icon={<Package className="w-8 h-8" />} title="لا توجد منتجات" description={search || activeFilters ? 'لا نتائج للفلاتر المحددة' : 'ابدأ بإضافة أول منتج'} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const supplierName = getSupplierName(p);
              return (
                <Card key={p._id} hover className={`p-5 animate-fade-in relative ${selectedIds.includes(p._id) ? 'ring-2 ring-primary-500' : ''}`}>
                  {/* Selection Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}
                    className="absolute top-3 left-3 z-10"
                  >
                    {selectedIds.includes(p._id)
                      ? <CheckSquare className="w-5 h-5 text-primary-500" />
                      : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-primary-400" />
                    }
                  </button>
                  {/* Product Image or Icon */}
                  <div className="flex justify-between items-start mb-3">
                    {p.thumbnail || (p.images && p.images.length > 0) ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={p.thumbnail || p.images[0]}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl">${catIcon(p.category)}</div>`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-500/10 dark:to-primary-500/5 flex items-center justify-center text-2xl">{catIcon(p.category)}</div>
                    )}
                    {statusBadge(p.stockStatus)}
                  </div>
                  <h4 className="font-bold text-sm mb-0.5 truncate" title={p.name}>{p.name}</h4>
                  <p className="text-xs text-gray-400 mb-1">SKU: {p.sku || '—'} · {p.category}</p>

                  {/* Supplier tag */}
                  {supplierName && (
                    <div className="flex items-center gap-1 mb-3">
                      <Truck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">{supplierName}</span>
                    </div>
                  )}

                  {/* Branch Inventory Breakdown */}
                  {p.inventory && p.inventory.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
                      <p className="font-bold text-gray-500 mb-1">توزيع المخزون:</p>
                      <div className="space-y-1">
                        {p.inventory.map((inv, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span>{inv.branch?.name || 'فرع غير معروف'}</span>
                            <span className={`font-bold ${inv.quantity <= inv.minQuantity ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {inv.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400">سعر البيع</p>
                      <p className="text-sm font-extrabold text-primary-500">{(p.price || 0).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400">المخزون</p>
                      <p className={`text-sm font-extrabold ${(p.stock?.quantity || 0) <= (p.stock?.minQuantity || 5) ? 'text-red-500' : ''}`}>{p.stock?.quantity || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-4 px-1">
                    <span className="text-gray-400">الربح:</span>
                    <span className="font-bold text-emerald-500">{(p.price - p.cost).toLocaleString('ar-EG')} ج.م</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> تعديل
                    </button>
                    {(p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock') && getSupplierId(p) && (
                      <button
                        onClick={() => handleRequestRestock(getSupplierId(p))}
                        disabled={sendingRestock === getSupplierId(p)}
                        className="px-3 py-2 rounded-xl border-2 border-green-200 dark:border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50"
                        title="طلب من المورد"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(p._id)}
                      className="px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="animate-fade-in sm:col-span-2" style={{ animationDelay: '50ms' }}>
            <Input label="اسم المنتج *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <Input label="كود SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="animate-fade-in sm:col-span-2" style={{ animationDelay: '150ms' }}>
            <RichTextEditor
              label="وصف المنتج"
              value={form.description}
              onChange={(content) => setForm({ ...form, description: content })}
            />
          </div>

          {/* Barcode input with scanner and search */}
          <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Input
              label="الباركود"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="أدخل الباركود أو امسحه"
            />
            <div className="absolute left-2 top-[34px] flex gap-1">
              <button
                type="button"
                onClick={async () => {
                  if (!form.barcode) return toast.error('أدخل الباركود أولاً');
                  const loadToast = toast.loading('جاري البحث...');
                  try {
                    // 1. Check local DB first
                    try {
                      const res = await productsApi.getByBarcode(form.barcode);
                      if (res?.data?.data) {
                        toast.success('هذا الباركود موجود بالفعل! جاري فتحه للتعديل...', { id: loadToast });
                        const p = res.data.data;
                        setEditId(p._id);
                        setForm({
                          name: p.name, sku: p.sku || '', barcode: p.barcode || '',
                          category: p.category, price: String(p.price), cost: String(p.cost),
                          stockQuantity: String(p.stock?.quantity || 0),
                          minQuantity: String(p.stock?.minQuantity || 5),
                          description: p.description || '', supplier: p.supplier?._id || p.supplier || '',
                          expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : ''
                        });
                        return;
                      }
                    } catch (err) { /* If 404, continue to OpenFoodFacts */ }

                    // 2. Fetch from OpenFoodFacts
                    const { barcodeService } = await import('../services/BarcodeService');
                    const productData = await barcodeService.getProductByBarcode(form.barcode);
                    if (productData) {
                      toast.success('تم العثور على المنتج!', { id: loadToast });
                      setForm(prev => ({
                        ...prev,
                        name: productData.name || prev.name,
                        description: productData.brand ? `ماركة: ${productData.brand}` : prev.description,
                      }));
                      if (productData.image) {
                        toast((t) => (
                          <div className="flex items-center gap-2">
                            <img src={productData.image} className="w-10 h-10 rounded" alt="Found" />
                            <div className="text-sm"><p className="font-bold">وجدنا صورة!</p><a href={productData.image} target="_blank" className="text-blue-500 underline text-xs">عرض</a></div>
                          </div>
                        ), { duration: 5000 });
                      }
                    } else {
                      toast.error('لم يتم العثور على المنتج', { id: loadToast });
                    }
                  } catch { toast.error('خطأ في البحث', { id: loadToast }); }
                }}
                className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                title="بحث عن بيانات المنتج"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                title="مسح بالكاميرا"
              >
                <Scan className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
            <Select label="الفئة" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[...(categories.length > 0 ? categories : ['هواتف', 'لابتوب', 'تابلت', 'إكسسوارات', 'شاشات', 'أخرى']).map((c) => ({ value: c, label: `${catIcon(c)} ${c}` }))]} />
          </div>

          {/* Supplier dropdown */}
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Select label="المورد" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              options={[{ value: '', label: 'بدون مورد' }, ...suppliers.map((s) => ({ value: s._id, label: `🚛 ${s.name}` }))]} />
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <Input label="سعر البيع *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Input label="سعر التكلفة *" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
            <Input label="الكمية بالمخزون" type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
            <Input label="الحد الأدنى (تنبيه)" type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 animate-fade-in" style={{ animationDelay: '550ms' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.checked ? new Date().toISOString().split('T')[0] : '' })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">للمنتج تاريخ صلاحية</span>
            </label>

            {form.expiryDate && (
              <Input
                type="date"
                value={form.expiryDate ? form.expiryDate.split('T')[0] : ''}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="animate-fade-in"
              />
            )}
          </div>
        </div>

        {/* Product Images */}
        <div className="mt-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            صور المنتج
          </label>

          {/* Image Upload Button */}
          <label className="flex items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-300">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="hidden"
            />
            {uploadingImage ? (
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800/50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {editId ? 'إضافة صور إضافية الموديل' : 'اختر صور (سيتم الرفع مع الحفظ)'}
                </span>
                <span className="text-xs text-gray-400">يمكنك سحب وإفلات الصور هنا</span>
              </div>
            )}
          </label>

          {/* Images Grid */}
          {(productImages.length > 0 || pendingImages.length > 0) && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {/* Existing Images */}
              {productImages.map((img, idx) => (
                <div key={`exist-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={img}
                    alt={`Product ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-primary-500 text-white text-xs font-bold">
                      رئيسية
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteImage(img)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Pending Images */}
              {pendingImages.map((file, idx) => (
                <div key={`pending-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 opacity-80 border-2 border-dashed border-primary-300">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Pending ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Free memory
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                    جديدة
                  </div>
                  <button
                    onClick={() => removePendingImage(idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {productImages.length === 0 && pendingImages.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد صور</p>
            </div>
          )}
        </div>

        {!editId && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            💡 احفظ المنتج أولاً ثم يمكنك إضافة الصور
          </div>
        )}
        {form.price && form.cost && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-center">
            <span className="text-xs text-gray-500">الربح المتوقع: </span>
            <span className="text-lg font-extrabold text-emerald-500">{(Number(form.price) - Number(form.cost)).toLocaleString('ar-EG')} ج.م</span>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>{editId ? 'تحديث' : 'إضافة'}</Button>
        </div>
      </Modal>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={async (barcode) => {
            setShowBarcodeScanner(false);
            const loadToast = toast.loading('جاري البحث عن بيانات المنتج...');

            try {
              // 1. Check local DB first
              try {
                const res = await productsApi.getByBarcode(barcode);
                if (res?.data?.data) {
                  toast.success('هذا الباركود موجود بالفعل! تم فتحه للتعديل...', { id: loadToast });
                  const p = res.data.data;
                  setEditId(p._id);
                  setForm({
                    name: p.name, sku: p.sku || '', barcode: barcode,
                    category: p.category, price: String(p.price), cost: String(p.cost),
                    stockQuantity: String(p.stock?.quantity || 0),
                    minQuantity: String(p.stock?.minQuantity || 5),
                    description: p.description || '', supplier: p.supplier?._id || p.supplier || '',
                    expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : ''
                  });
                  return;
                }
              } catch (err) { /* If 404, continue to OpenFoodFacts */ }

              // 2. Fetch from OpenFoodFacts
              // Dynamically import service on demand
              const { barcodeService } = await import('../services/BarcodeService');
              const productData = await barcodeService.getProductByBarcode(barcode);

              if (productData) {
                toast.success('تم العثور على بيانات المنتج! 🥫✨', { id: loadToast });
                setForm(prev => ({
                  ...prev,
                  barcode,
                  name: productData.name || prev.name,
                  description: productData.brand ? `ماركة: ${productData.brand}` : prev.description,
                  // We can't set image directly as file, but we could handle URL if backend supported it. 
                  // For now, we just auto-fill text fields.
                }));

                // If image URL found, user might want to download/upload it. 
                // Enhanced feature: Show the image to user to confirm?
                if (productData.image) {
                  toast((t) => (
                    <div className="flex items-center gap-2">
                      <img src={productData.image} className="w-10 h-10 rounded" alt="Found" />
                      <div className="text-sm">
                        <p className="font-bold">وجدنا صورة للمنتج!</p>
                        <a href={productData.image} target="_blank" className="text-blue-500 underline text-xs">عرض الصورة</a>
                      </div>
                    </div>
                  ), { duration: 5000 });
                }

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
    </div>
  );
}
