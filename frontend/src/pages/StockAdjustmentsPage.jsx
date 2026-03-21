import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, Plus, RefreshCw, Search } from 'lucide-react';
import { api, productsApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, Select } from '../components/UI';
import Pagination from '../components/Pagination';

const TYPES = {
  damage: { label: 'تالف', color: 'danger' },
  theft: { label: 'سرقة أو عجز', color: 'danger' },
  loss: { label: 'فقد', color: 'warning' },
  internal_use: { label: 'استخدام داخلي', color: 'info' },
  correction_increase: { label: 'تسوية بزيادة', color: 'success' },
  correction_decrease: { label: 'تسوية بنقص', color: 'danger' },
};

function getProductCode(product) {
  return product?.localBarcode || product?.internationalBarcode || product?.barcode || product?.sku || 'بدون كود';
}

export default function StockAdjustmentsPage() {
  const user = useAuthStore((state) => state.user);
  const getBranches = useAuthStore((state) => state.getBranches);
  const userBranchId = user?.branch?._id || user?.branch || '';

  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({
    productId: '',
    type: 'damage',
    quantity: 1,
    reason: '',
    branchId: userBranchId,
  });
  const [productSearch, setProductSearch] = useState('');

  const resetForm = () => {
    setForm({
      productId: '',
      type: 'damage',
      quantity: 1,
      reason: '',
      branchId: userBranchId || (branches[0]?._id || ''),
    });
    setProductSearch('');
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock-adjustments', { params: { page, limit: 8 } });
      setAdjustments(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('فشل تحميل تسويات المخزون');
      setAdjustments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll({ limit: 1000 });
      setProducts(res?.data?.data || []);
    } catch (error) {
      setProducts([]);
    }
  };

  const fetchBranches = async () => {
    if (userBranchId) return;
    const branchData = await getBranches?.();
    const normalizedBranches = Array.isArray(branchData) ? branchData : [];
    setBranches(normalizedBranches);
    setForm((prev) => ({
      ...prev,
      branchId: prev.branchId || normalizedBranches[0]?._id || '',
    }));
  };

  useEffect(() => {
    void fetchAdjustments();
  }, [page]);

  useEffect(() => {
    void fetchProducts();
    void fetchBranches();
  }, [userBranchId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    if (!normalizedSearch) return products.slice(0, 20);

    return products.filter((product) => {
      const haystack = [
        product?.name,
        product?.sku,
        product?.barcode,
        product?.localBarcode,
        product?.internationalBarcode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    }).slice(0, 20);
  }, [productSearch, products]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product._id) === String(form.productId)) || null,
    [form.productId, products],
  );

  const summary = useMemo(() => ({
    total: adjustments.length,
    increases: adjustments.filter((adj) => adj.type === 'correction_increase').length,
    decreases: adjustments.filter((adj) => adj.type !== 'correction_increase').length,
  }), [adjustments]);

  const handleSubmit = async () => {
    if (!form.productId || !form.branchId) {
      toast.error('اختر المنتج والفرع أولاً');
      return;
    }

    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) {
      toast.error('أدخل كمية صحيحة أكبر من صفر');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/stock-adjustments', {
        ...form,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
      });
      toast.success('تم تسجيل التسوية بنجاح');
      closeModal();
      await fetchAdjustments();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'حدث خطأ أثناء حفظ التسوية');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-2xl font-black text-transparent dark:from-white dark:to-gray-300">
            تسويات المخزون
          </h1>
          <p className="mt-1 text-sm text-gray-500">سجل التالف والعجز والفقد والتسويات اليدوية لكل فرع.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchAdjustments()} icon={<RefreshCw className="h-4 w-4" />}>
            تحديث
          </Button>
          <Button icon={<Plus className="h-5 w-5" />} onClick={() => setShowModal(true)}>
            تسوية جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-blue-500 p-4">
          <p className="text-xs font-bold text-gray-500">إجمالي العمليات المعروضة</p>
          <p className="text-2xl font-black text-blue-600">{summary.total}</p>
        </Card>
        <Card className="border-l-4 border-emerald-500 p-4">
          <p className="text-xs font-bold text-gray-500">تسويات بزيادة</p>
          <p className="text-2xl font-black text-emerald-600">{summary.increases}</p>
        </Card>
        <Card className="border-l-4 border-red-500 p-4">
          <p className="text-xs font-bold text-gray-500">تسويات بنقص أو فاقد</p>
          <p className="text-2xl font-black text-red-600">{summary.decreases}</p>
        </Card>
      </div>

      {loading ? <LoadingSpinner /> : adjustments.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-12 w-12 text-gray-300" />}
          title="لا توجد تسويات مسجلة"
          description="ابدأ بإضافة أول عملية تسوية للمخزون."
        />
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-bold">التاريخ</th>
                  <th className="px-6 py-4 font-bold">الفرع</th>
                  <th className="px-6 py-4 font-bold">المنتج</th>
                  <th className="px-6 py-4 font-bold">النوع</th>
                  <th className="px-6 py-4 font-bold">الكمية</th>
                  <th className="px-6 py-4 font-bold">الملاحظات</th>
                  <th className="px-6 py-4 font-bold">بواسطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {adjustments.map((adjustment) => (
                  <tr key={adjustment._id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(adjustment.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">
                      {adjustment.branch?.name || 'الفرع الرئيسي'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">
                      {adjustment.product?.name || 'منتج غير معروف'}
                      <div className="text-xs font-normal text-gray-400">{getProductCode(adjustment.product)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={TYPES[adjustment.type]?.color || 'gray'}>
                        {TYPES[adjustment.type]?.label || adjustment.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      <span dir="ltr">{adjustment.quantity}</span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-gray-500" title={adjustment.reason || ''}>
                      {adjustment.reason || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {adjustment.user?.name || 'غير محدد'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}

      <Modal open={showModal} onClose={closeModal} title="تسوية مخزون جديدة">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">بحث عن منتج</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2 pl-4 pr-10 outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-800"
                placeholder="بحث بالاسم أو SKU أو الباركود..."
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            {filteredProducts.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border-2 border-gray-100 dark:border-gray-800">
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, productId: product._id }));
                      setProductSearch(product.name);
                    }}
                    className={`flex w-full items-center justify-between p-3 text-right transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10 ${form.productId === product._id ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{product.name}</p>
                      <p className="text-xs text-gray-400">{getProductCode(product)}</p>
                    </div>
                    <span className="text-xs text-gray-400">متاح إجمالًا: {Number(product.stock?.quantity) || 0}</span>
                  </button>
                ))}
              </div>
            ) : productSearch ? (
              <p className="mt-2 text-xs text-gray-400">لا توجد منتجات مطابقة لهذا البحث.</p>
            ) : null}
          </div>

          {selectedProduct ? (
            <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300">
              المنتج المحدد: <span className="font-bold">{selectedProduct.name}</span>
            </div>
          ) : null}

          {!userBranchId && branches.length > 0 ? (
            <Select
              label="الفرع"
              value={form.branchId}
              onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
              options={branches.map((branch) => ({ value: branch._id, label: branch.name }))}
            />
          ) : null}

          <Select
            label="نوع التسوية"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            options={Object.entries(TYPES).map(([key, value]) => ({ value: key, label: value.label }))}
          />

          <Input
            label="الكمية"
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))}
          />

          <Input
            label="ملاحظات أو سبب التسوية"
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          />

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">حفظ التسوية</Button>
            <Button variant="ghost" onClick={closeModal}>إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
