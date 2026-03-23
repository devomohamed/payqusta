import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, MessageCircle, Package, Phone, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/UI';

function getStockStatus(product) {
  const qty = Number(product?.stock?.quantity) || 0;
  const minQty = Number(product?.stock?.minQuantity) || 5;
  if (qty <= 0) return 'out_of_stock';
  if (qty <= minQty) return 'low_stock';
  return 'in_stock';
}

function getNeededQuantity(product) {
  return Math.max(10, ((Number(product?.stock?.minQuantity) || 5) * 2) - (Number(product?.stock?.quantity) || 0));
}

export default function LowStockPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingOrders, setSendingOrders] = useState({});
  const [sendingBulk, setSendingBulk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getLowStock();
      setProducts(res?.data?.data || []);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل المنتجات منخفضة المخزون');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={load} icon={<RefreshCw className="h-4 w-4" />} className="w-full sm:w-auto">
              تحديث
            </Button>
            <Button
              variant="whatsapp"
              onClick={handleBulkRestock}
              loading={sendingBulk}
              disabled={products.every((product) => !product?.supplier)}
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
                            {Number(product?.stock?.quantity) || 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] text-gray-400">الحد الأدنى</p>
                          <p className="mt-1 font-black text-gray-900 dark:text-white">{Number(product?.stock?.minQuantity) || 5}</p>
                        </div>
                        <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                          <p className="text-[11px] text-gray-400">المطلوب</p>
                          <p className="mt-1 font-black text-primary-600">{needed}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        {supplierId !== 'no-supplier' ? (
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
                        ) : (
                          <span className="text-xs text-gray-400">أضف مورد أولاً قبل إنشاء الطلب</span>
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
                              {Number(product?.stock?.quantity) || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{Number(product?.stock?.minQuantity) || 5}</td>
                          <td className="px-4 py-3 font-bold text-primary-600">{needed}</td>
                          <td className="px-4 py-3">{stockBadge(product)}</td>
                          <td className="px-4 py-3">
                            {supplierId !== 'no-supplier' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestRestock(product)}
                                loading={sendingOrders[product._id]}
                                icon={<Send className="h-3 w-3" />}
                              >
                                طلب
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">أضف مورد أولاً</span>
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
    </div>
  );
}
