import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, MessageCircle, Package, Phone, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, supplierReplenishmentRequestsApi, suppliersApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal } from '../components/UI';

function getStockStatus(product) {
  const qty = Number(product?.branchStock?.quantity ?? product?.stock?.quantity) || 0;
  const minQty = Number(product?.branchStock?.minQuantity ?? product?.stock?.minQuantity) || 5;
  if (qty <= 0) return 'out_of_stock';
  if (qty <= minQty) return 'low_stock';
  return 'in_stock';
}

function getNeededQuantity(product) {
  return Math.max(
    10,
    ((Number(product?.branchStock?.minQuantity ?? product?.stock?.minQuantity) || 5) * 2)
      - (Number(product?.branchStock?.quantity ?? product?.stock?.quantity) || 0)
  );
}

export default function LowStockPage() {
  const { user, tenant, can, getBranches } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingOrders, setSendingOrders] = useState({});
  const [sendingBulk, setSendingBulk] = useState(false);
  const [supplierModalProduct, setSupplierModalProduct] = useState(null);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [supplierOptionsLoading, setSupplierOptionsLoading] = useState(false);
  const [supplierRequestLoading, setSupplierRequestLoading] = useState(false);
  const [supplierRequestForm, setSupplierRequestForm] = useState({
    supplierId: '',
    requestedQty: 1,
    notes: '',
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const branchScopeId = String(user?.branch?._id || user?.branch || '');
  const isAdminLikeUser = user?.role === 'admin' || !!user?.isSuperAdmin;
  const canSwitchBranchView = !branchScopeId && (isAdminLikeUser || can('branches', 'read'));
  const activeBranchId = branchScopeId || selectedBranchId || '';
  const isPseudoMainBranch = Boolean(
    !branchScopeId && tenant?._id && String(activeBranchId) === String(tenant._id)
  );
  const canSendSupplierOrders = !activeBranchId && (isAdminLikeUser || user?.role === 'vendor');
  const canCreateSupplierRequests = can('supplier_replenishment_requests', 'create');
  const canOpenBranchSupplierRequest = Boolean(activeBranchId && !isPseudoMainBranch && canCreateSupplierRequests);
  const branchOptions = useMemo(() => {
    const mainBranch = tenant?._id ? [{ _id: String(tenant._id), name: `${tenant?.name || 'المخزن الرئيسي'} (الرئيسي)` }] : [];
    return [
      { _id: '', name: 'كل الفروع' },
      ...mainBranch,
      ...(Array.isArray(branches) ? branches.map((branch) => ({ _id: String(branch._id), name: branch.name })) : []),
    ];
  }, [branches, tenant?._id, tenant?.name]);
  const activeBranchLabel = useMemo(() => {
    const match = branchOptions.find((option) => String(option._id) === String(activeBranchId));
    return match?.name || 'كل الفروع';
  }, [activeBranchId, branchOptions]);

  useEffect(() => {
    if (branchScopeId) setSelectedBranchId(branchScopeId);
  }, [branchScopeId]);

  useEffect(() => {
    getBranches?.()
      .then((rows) => setBranches(Array.isArray(rows) ? rows : []))
      .catch(() => setBranches([]));
  }, [getBranches]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getLowStock(activeBranchId ? { branchId: activeBranchId } : undefined);
      setProducts(res?.data?.data || []);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل المنتجات منخفضة المخزون');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRequestRestock = async (product) => {
    if (!product?.supplier) {
      toast.error('هذا المنتج ليس له مورد محدد');
      return;
    }

    setSendingOrders((prev) => ({ ...prev, [product._id]: true }));

    try {
      const needed = getNeededQuantity(product);
      const res = await productsApi.requestRestock(product._id, needed);

      if (res?.data?.data?.success) {
        toast.success(`تم إرسال طلب ${needed} قطعة من "${product.name}" للمورد`);
      } else {
        toast.success('تم تجهيز طلب إعادة التخزين لكن قناة الإرسال غير متصلة حالياً');
      }
    } catch (error) {
      toast.error('فشل إرسال طلب إعادة التخزين');
    } finally {
      setSendingOrders((prev) => ({ ...prev, [product._id]: false }));
    }
  };

  const handleBulkRestock = async () => {
    const productsWithSuppliers = products.filter((product) => product?.supplier);
    if (productsWithSuppliers.length === 0) {
      toast.error('لا توجد منتجات مرتبطة بموردين');
      return;
    }

    setSendingBulk(true);
    try {
      const res = await productsApi.requestRestockBulk();
      const data = res?.data?.data;

      if (Array.isArray(data?.results)) {
        const successful = data.results.filter((entry) => entry.success).length;
        toast.success(`تم إرسال ${data.totalProducts || productsWithSuppliers.length} طلب إلى ${successful}/${data.totalSuppliers || 0} مورد`);
      } else {
        toast.success('تم تجهيز طلبات إعادة التخزين للموردين');
      }
    } catch (error) {
      toast.error('فشل إرسال الطلبات المجمعة');
    } finally {
      setSendingBulk(false);
    }
  };

  const loadSupplierOptions = useCallback(async () => {
    setSupplierOptionsLoading(true);
    try {
      const res = await suppliersApi.getAll({ limit: 200 });
      setSupplierOptions(res?.data?.data || []);
    } catch (error) {
      toast.error('تعذر تحميل الموردين');
      setSupplierOptions([]);
    } finally {
      setSupplierOptionsLoading(false);
    }
  }, []);

  const openSupplierRequestModal = useCallback(async (product) => {
    if (!product?._id || !activeBranchId || !canCreateSupplierRequests) return;

    const defaultSupplierId = String(product?.supplier?._id || product?.supplier || '');
    if (!defaultSupplierId) {
      await loadSupplierOptions();
    } else {
      setSupplierOptions([]);
    }

    setSupplierModalProduct(product);
    setSupplierRequestForm({
      supplierId: defaultSupplierId,
      requestedQty: getNeededQuantity(product),
      notes: '',
    });
  }, [activeBranchId, canCreateSupplierRequests, loadSupplierOptions]);

  const closeSupplierRequestModal = useCallback(() => {
    setSupplierModalProduct(null);
    setSupplierOptions([]);
    setSupplierOptionsLoading(false);
    setSupplierRequestLoading(false);
    setSupplierRequestForm({
      supplierId: '',
      requestedQty: 1,
      notes: '',
    });
  }, []);

  const submitSupplierRequest = useCallback(async () => {
    if (!supplierModalProduct?._id || !activeBranchId) return;
    if (!supplierRequestForm.supplierId) {
      toast.error('اختر المورد أولاً');
      return;
    }

    setSupplierRequestLoading(true);
    try {
      await supplierReplenishmentRequestsApi.create({
        branch: activeBranchId,
        product: supplierModalProduct._id,
        supplier: supplierRequestForm.supplierId,
        requestedQty: supplierRequestForm.requestedQty,
        currentQty: Number(supplierModalProduct?.branchStock?.quantity ?? supplierModalProduct?.stock?.quantity) || 0,
        minQty: Number(supplierModalProduct?.branchStock?.minQuantity ?? supplierModalProduct?.stock?.minQuantity) || 0,
        notes: supplierRequestForm.notes || '',
        source: 'low_stock_page',
      });
      toast.success('تم إنشاء طلب المورد بنجاح');
      closeSupplierRequestModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'فشل إنشاء طلب المورد');
    } finally {
      setSupplierRequestLoading(false);
    }
  }, [activeBranchId, closeSupplierRequestModal, supplierModalProduct, supplierRequestForm]);

  const groupedBySupplier = useMemo(() => {
    const groups = products.reduce((accumulator, product) => {
      const supplierId = product?.supplier?._id || 'no-supplier';
      const supplierName = product?.supplier?.name || 'بدون مورد';
      if (!accumulator[supplierId]) {
        accumulator[supplierId] = { supplier: product?.supplier || null, name: supplierName, products: [] };
      }
      accumulator[supplierId].products.push(product);
      return accumulator;
    }, {});

    return Object.entries(groups).sort(([leftId], [rightId]) => {
      if (leftId === 'no-supplier') return 1;
      if (rightId === 'no-supplier') return -1;
      return 0;
    });
  }, [products]);

  const summary = useMemo(() => ({
    outOfStock: products.filter((product) => getStockStatus(product) === 'out_of_stock').length,
    lowStock: products.filter((product) => getStockStatus(product) === 'low_stock').length,
    suppliers: groupedBySupplier.filter(([supplierId]) => supplierId !== 'no-supplier').length,
    withoutSupplier: groupedBySupplier.find(([supplierId]) => supplierId === 'no-supplier')?.[1]?.products.length || 0,
  }), [groupedBySupplier, products]);

  const stockBadge = (product) => {
    const status = getStockStatus(product);
    if (status === 'out_of_stock') return <Badge variant="danger">نفذ</Badge>;
    if (status === 'low_stock') return <Badge variant="warning">منخفض</Badge>;
    return <Badge variant="success">متوفر</Badge>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500/80">Restock Radar</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">المنتجات منخفضة المخزون</h2>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                متابعة فورية للنواقص الحرجة حسب المورد، مع أوامر إعادة تخزين أسرع وتصميم أوضح على الهاتف.
              </p>
              {activeBranchId ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  عرض الفرع: {activeBranchLabel}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {canSwitchBranchView ? (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="app-surface w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto"
              >
                {branchOptions.map((option) => (
                  <option key={String(option._id || 'all')} value={String(option._id || '')}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button variant="outline" onClick={load} icon={<RefreshCw className="h-4 w-4" />} className="w-full sm:w-auto">
              تحديث
            </Button>
            <Button
              variant="whatsapp"
              onClick={handleBulkRestock}
              loading={sendingBulk}
              disabled={!canSendSupplierOrders || products.every((product) => !product?.supplier)}
              icon={<Send className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              إرسال طلبات لكل الموردين
            </Button>
          </div>
        </div>
      </section>

      {loading ? <LoadingSpinner /> : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="لا توجد منتجات منخفضة المخزون"
          description="جميع المنتجات المتاحة حالياً فوق الحد الأدنى المطلوب."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-2 border-red-100 p-4 dark:border-red-500/20">
              <p className="text-xs text-gray-400">نفد من المخزون</p>
              <p className="text-2xl font-black text-red-600">{summary.outOfStock}</p>
            </Card>
            <Card className="border-2 border-amber-100 p-4 dark:border-amber-500/20">
              <p className="text-xs text-gray-400">مخزون منخفض</p>
              <p className="text-2xl font-black text-amber-600">{summary.lowStock}</p>
            </Card>
            <Card className="border-2 border-primary-100 p-4 dark:border-primary-500/20">
              <p className="text-xs text-gray-400">عدد الموردين</p>
              <p className="text-2xl font-black text-primary-600">{summary.suppliers}</p>
            </Card>
            <Card className="border-2 border-gray-100 p-4 dark:border-gray-700">
              <p className="text-xs text-gray-400">بدون مورد</p>
              <p className="text-2xl font-black text-gray-600">{summary.withoutSupplier}</p>
            </Card>
          </div>

          {groupedBySupplier.map(([supplierId, group]) => (
            <Card key={supplierId} className="overflow-hidden">
              <div className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${supplierId === 'no-supplier' ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-primary-50 dark:bg-primary-500/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${supplierId === 'no-supplier' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary-100 dark:bg-primary-500/20'}`}>
                    <Building2 className={`h-5 w-5 ${supplierId === 'no-supplier' ? 'text-gray-500' : 'text-primary-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.products.length} منتج</p>
                  </div>
                </div>
                {supplierId !== 'no-supplier' && group.supplier?.phone ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${group.supplier.phone}`}
                      className="rounded-lg bg-white p-2 text-gray-500 transition-colors hover:text-primary-500 dark:bg-gray-900"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://wa.me/${String(group.supplier.phone).replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-50 p-2 text-green-500 transition-colors hover:bg-green-100 dark:bg-green-500/10"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {group.products.map((product) => {
                  const needed = getNeededQuantity(product);
                  const status = getStockStatus(product);
                  return (
                    <div key={product._id} className="app-surface rounded-3xl border border-white/60 p-4 dark:border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${status === 'out_of_stock' ? 'bg-red-100 text-red-500 dark:bg-red-500/20' : 'bg-amber-100 text-amber-500 dark:bg-amber-500/20'}`}>
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                            <p className="mt-1 font-mono text-xs text-gray-400">{product.sku || 'بدون SKU'}</p>
                          </div>
                        </div>
                        {stockBadge(product)}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                        <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] text-gray-400">الحالي</p>
                          <p className={`mt-1 font-black ${status === 'out_of_stock' ? 'text-red-500' : 'text-amber-500'}`}>
                            {Number(product?.branchStock?.quantity ?? product?.stock?.quantity) || 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] text-gray-400">الحد الأدنى</p>
                          <p className="mt-1 font-black text-gray-900 dark:text-white">{Number(product?.branchStock?.minQuantity ?? product?.stock?.minQuantity) || 5}</p>
                        </div>
                        <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] text-gray-400">المطلوب</p>
                          <p className="mt-1 font-black text-primary-600">{needed}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        {supplierId !== 'no-supplier' && canSendSupplierOrders ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestRestock(product)}
                            loading={sendingOrders[product._id]}
                            icon={<Send className="h-3 w-3" />}
                            className="w-full"
                          >
                            إرسال طلب إعادة تخزين
                          </Button>
                        ) : canOpenBranchSupplierRequest ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSupplierRequestModal(product)}
                            icon={<Send className="h-3 w-3" />}
                            className="w-full"
                          >
                            طلب من المورد
                          </Button>
                        ) : isPseudoMainBranch ? (
                          <span className="text-xs text-gray-400">طلب المورد المباشر متاح عند اختيار فرع فعلي فقط</span>
                        ) : supplierId === 'no-supplier' ? (
                          <span className="text-xs text-gray-400">
                            {activeBranchId && canCreateSupplierRequests ? 'اختر المورد من الطلب قبل الإرسال' : 'أضف مورد أولاً قبل إنشاء الطلب'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {activeBranchId ? 'هذا الحساب يرى النقص فقط ولا يملك طلب المورد' : 'طلبات المورد المباشرة من العرض العام فقط'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">المنتج</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحالي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحد الأدنى</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">المطلوب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => {
                      const needed = getNeededQuantity(product);
                      const status = getStockStatus(product);
                      return (
                        <tr key={product._id} className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${status === 'out_of_stock' ? 'bg-red-100 text-red-500 dark:bg-red-500/20' : 'bg-amber-100 text-amber-500 dark:bg-amber-500/20'}`}>
                                <Package className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{product.sku || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${status === 'out_of_stock' ? 'text-red-500' : 'text-amber-500'}`}>
                              {Number(product?.branchStock?.quantity ?? product?.stock?.quantity) || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{Number(product?.branchStock?.minQuantity ?? product?.stock?.minQuantity) || 5}</td>
                          <td className="px-4 py-3 font-bold text-primary-600">{needed}</td>
                          <td className="px-4 py-3">{stockBadge(product)}</td>
                          <td className="px-4 py-3">
                            {supplierId !== 'no-supplier' && canSendSupplierOrders ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestRestock(product)}
                                loading={sendingOrders[product._id]}
                                icon={<Send className="h-3 w-3" />}
                              >
                                طلب
                              </Button>
                            ) : canOpenBranchSupplierRequest ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSupplierRequestModal(product)}
                                icon={<Send className="h-3 w-3" />}
                              >
                                طلب من المورد
                              </Button>
                            ) : isPseudoMainBranch ? (
                              <span className="text-xs text-gray-400">اختر فرعًا فعليًا لطلب المورد</span>
                            ) : supplierId === 'no-supplier' ? (
                              <span className="text-xs text-gray-400">
                                {activeBranchId && canCreateSupplierRequests ? 'اختر المورد من الطلب' : 'أضف مورد أولاً'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {activeBranchId ? 'هذا الحساب يرى النقص فقط ولا يملك طلب المورد' : 'طلبات المورد المباشرة من العرض العام فقط'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(supplierModalProduct)}
        onClose={closeSupplierRequestModal}
        title={supplierModalProduct ? `طلب مورد • ${supplierModalProduct.name}` : 'طلب مورد جديد'}
        size="md"
      >
        {supplierModalProduct ? (
          <div className="space-y-4">
            <Card className="rounded-3xl border-0 p-4 shadow-none app-surface-muted">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">الفرع</span>
                  <span className="font-black">{activeBranchLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">الصنف</span>
                  <span className="font-black">{supplierModalProduct.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SKU</span>
                  <span className="font-black">{supplierModalProduct.sku || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">المخزون الحالي</span>
                  <span className="font-black">{Number(supplierModalProduct?.branchStock?.quantity ?? supplierModalProduct?.stock?.quantity) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">الحد الأدنى</span>
                  <span className="font-black">{Number(supplierModalProduct?.branchStock?.minQuantity ?? supplierModalProduct?.stock?.minQuantity) || 0}</span>
                </div>
              </div>
            </Card>

            <label className="block rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">المورد</span>
              <select
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                value={supplierRequestForm.supplierId}
                onChange={(event) => setSupplierRequestForm((current) => ({ ...current, supplierId: event.target.value }))}
                disabled={supplierOptionsLoading || Boolean(supplierModalProduct?.supplier?._id || supplierModalProduct?.supplier)}
              >
                <option value="">
                  {supplierOptionsLoading ? 'جاري تحميل الموردين...' : 'اختر المورد'}
                </option>
                {supplierModalProduct?.supplier ? (
                  <option value={String(supplierModalProduct.supplier?._id || supplierModalProduct.supplier)}>
                    {supplierModalProduct.supplier?.name || 'المورد الافتراضي'}
                  </option>
                ) : null}
                {supplierOptions.map((supplier) => (
                  <option key={supplier._id} value={String(supplier._id)}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">الكمية المطلوبة</span>
              <input
                type="number"
                min="1"
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                value={supplierRequestForm.requestedQty}
                onChange={(event) => setSupplierRequestForm((current) => ({
                  ...current,
                  requestedQty: Math.max(1, Number(event.target.value) || 1),
                }))}
              />
            </label>

            <label className="block rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">ملاحظات</span>
              <textarea
                rows={3}
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                placeholder="مثال: المنتج نفد من الفرع ونحتاج التوريد خلال 48 ساعة"
                value={supplierRequestForm.notes}
                onChange={(event) => setSupplierRequestForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={closeSupplierRequestModal}>
                إلغاء
              </Button>
              <Button loading={supplierRequestLoading} onClick={submitSupplierRequest}>
                إنشاء طلب المورد
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
