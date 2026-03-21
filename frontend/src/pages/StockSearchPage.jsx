import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Package, RefreshCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, useAuthStore } from '../store';
import { Badge, Card, EmptyState, LoadingSpinner } from '../components/UI';
import Pagination from '../components/Pagination';

function getCategoryName(category) {
  if (!category) return '—';
  if (typeof category === 'string') return category;
  if (typeof category === 'object') return category.name || '—';
  return String(category);
}

function getCategoryIcon(category) {
  if (category && typeof category === 'object' && typeof category.icon === 'string') {
    return category.icon;
  }

  const name = getCategoryName(category);
  if (name === 'هواتف') return '📱';
  if (name === 'لابتوب') return '💻';
  return '📦';
}

export default function StockSearchPage() {
  const getBranches = useAuthStore((state) => state.getBranches);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [branchesMap, setBranchesMap] = useState({});

  const LIMIT = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const branches = await getBranches?.();
      if (!mounted) return;
      const nextMap = Object.fromEntries(
        (Array.isArray(branches) ? branches : []).map((branch) => [String(branch._id), branch.name]),
      );
      setBranchesMap(nextMap);
    })();
    return () => {
      mounted = false;
    };
  }, [getBranches]);

  const resolveBranchName = useCallback((branchRef) => {
    if (branchRef?.name) return branchRef.name;
    const branchId = typeof branchRef === 'string' ? branchRef : (branchRef?._id || '');
    if (!branchId) return 'الفرع الرئيسي';
    return branchesMap[String(branchId)] || 'فرع غير معروف';
  }, [branchesMap]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: debouncedSearch };
      const res = await productsApi.getAll(params);
      const normalizedProducts = (res?.data?.data || []).map((product) => {
        const availabilityRows = Array.isArray(product.inventory) && product.inventory.length > 0
          ? product.inventory.map((inventoryItem) => ({
            branchName: resolveBranchName(inventoryItem?.branch),
            quantity: Number(inventoryItem?.quantity) || 0,
            minQuantity: Number(inventoryItem?.minQuantity) || 5,
          }))
          : [{
            branchName: 'الفرع الرئيسي',
            quantity: Number(product?.stock?.quantity) || 0,
            minQuantity: Number(product?.stock?.minQuantity) || 5,
          }];

        const totalQuantity = availabilityRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

        return {
          ...product,
          categoryName: getCategoryName(product.category),
          categoryIcon: getCategoryIcon(product.category),
          availabilityRows,
          totalQuantity,
        };
      });

      setProducts(normalizedProducts);
      setPagination({
        totalPages: res?.data?.pagination?.totalPages || 1,
        totalItems: res?.data?.pagination?.totalItems || 0,
      });
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل بيانات التوفر');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, resolveBranchName]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const totalLabel = useMemo(() => (
    pagination.totalItems > 0 ? pagination.totalItems : products.length
  ), [pagination.totalItems, products.length]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">البحث عن توفر المنتجات</h1>
          <p className="text-sm text-gray-500">ابحث عن أي منتج لمعرفة الكميات المتوفرة في الفروع المختلفة.</p>
        </div>
        <button
          onClick={() => void loadProducts()}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <Card className="border-2 border-primary-100 p-4 dark:border-primary-900/30">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم المنتج أو SKU أو الباركود..."
            className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 py-4 pl-4 pr-12 text-lg outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900/50"
          />
        </div>
        <p className="mt-3 text-xs text-gray-400">عدد النتائج: {totalLabel}</p>
      </Card>

      {loading && products.length === 0 ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="لم يتم العثور على منتجات"
          description={search ? `لا توجد نتائج مطابقة للبحث عن "${search}"` : 'ابدأ بكتابة اسم المنتج أو كوده للبحث.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product._id} className="overflow-hidden border-2 border-gray-100 transition-all hover:border-primary-300 dark:border-gray-800 dark:hover:border-primary-700">
              <div className="flex gap-4 border-b border-gray-50 p-5 dark:border-gray-800">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl dark:bg-primary-900/20">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} className="h-full w-full rounded-2xl object-cover" alt="" />
                  ) : (
                    product.categoryIcon
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black text-gray-800 dark:text-white">{product.name}</h3>
                    <Badge variant={product.totalQuantity > 0 ? 'success' : 'danger'}>
                      {product.totalQuantity > 0 ? 'متوفر إجمالًا' : 'غير متوفر'}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-mono">SKU: {product.sku || '—'}</span>
                    <span>•</span>
                    <span>{product.categoryName}</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/50 p-5 dark:bg-gray-800/20">
                <h4 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400">
                  <MapPin className="h-3.5 w-3.5" /> التوفر في الفروع
                </h4>

                <div className="space-y-3">
                  {(product.availabilityRows || []).map((row, index) => (
                    <div key={`${product._id}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{row.branchName}</span>
                      </div>
                      <div className="text-left">
                        <span className={`text-lg font-black ${row.quantity <= 0 ? 'text-red-500' : row.quantity <= row.minQuantity ? 'text-amber-500' : 'text-primary-600'}`}>
                          {row.quantity}
                        </span>
                        <span className="mr-1 text-[10px] font-bold text-gray-400">{product.stock?.unit || 'قطعة'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
                <span className="text-gray-400">إجمالي المخزون:</span>
                <span className="text-lg font-black text-gray-800 dark:text-white">{product.totalQuantity}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
