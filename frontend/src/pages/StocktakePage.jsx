import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckSquare,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/UI';
import BarcodeScanner, { useBarcodeScanner } from '../components/BarcodeScanner';
import { confirm } from '../components/ConfirmDialog';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';

function getBranchQuantity(product, branchId) {
  if (!product) return 0;

  if (!branchId) {
    return Number(product?.stock?.quantity) || 0;
  }

  const inventoryItem = (product.inventory || []).find((item) => (
    String(item?.branch?._id || item?.branch || '') === String(branchId)
  ));

  return Number(inventoryItem?.quantity) || 0;
}

function getDisplayCode(product) {
  return product?.localBarcode || product?.internationalBarcode || product?.barcode || product?.sku || 'بدون كود';
}

export default function StocktakePage() {
  const user = useAuthStore((state) => state.user);
  const getBranches = useAuthStore((state) => state.getBranches);
  const userBranchId = user?.branch?._id || user?.branch || '';

  const [selectedBranchId, setSelectedBranchId] = useState(userBranchId);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockCounts, setStockCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setStockCounts({});
  }, [selectedBranchId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 1000, search: debouncedSearch };
      if (categoryFilter) params.category = categoryFilter;

      const [productsRes, categoriesRes, branchesRes] = await Promise.all([
        productsApi.getAll(params),
        productsApi.getCategories(),
        userBranchId ? Promise.resolve([]) : getBranches?.(),
      ]);

      const loadedProducts = productsRes?.data?.data || [];
      const loadedCategories = categoriesRes?.data?.data || [];
      const loadedBranches = Array.isArray(branchesRes) ? branchesRes : [];

      setProducts(loadedProducts);
      setCategories(loadedCategories);

      if (!userBranchId) {
        setBranches(loadedBranches);
        if (!selectedBranchId && loadedBranches.length > 0) {
          setSelectedBranchId(loadedBranches[0]._id);
        }
      }

      setStockCounts((prev) => {
        const next = { ...prev };
        loadedProducts.forEach((product) => {
          if (next[product._id] === undefined) {
            next[product._id] = getBranchQuantity(product, selectedBranchId || userBranchId);
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Stocktake load error:', error);
      toast.error('حدث خطأ أثناء تحميل بيانات الجرد');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, debouncedSearch, getBranches, selectedBranchId, userBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleProducts = useMemo(() => (
    products.map((product) => {
      const systemQty = getBranchQuantity(product, selectedBranchId || userBranchId);
      const actualQty = stockCounts[product._id] !== undefined ? stockCounts[product._id] : systemQty;
      return {
        ...product,
        systemQty,
        actualQty,
        diff: actualQty - systemQty,
      };
    })
  ), [products, selectedBranchId, stockCounts, userBranchId]);

  const hasChanges = visibleProducts.some((product) => product.actualQty !== product.systemQty);

  useUnsavedWarning(hasChanges, 'stocktake');

  const handleQuantityChange = (productId, value) => {
    setStockCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, Number(value) || 0),
    }));
  };

  const adjustQuantity = (productId, delta) => {
    setStockCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, (Number(prev[productId]) || 0) + delta),
    }));
  };

  const mergeScannedProduct = (product) => {
    setProducts((prev) => {
      if (prev.some((entry) => entry._id === product._id)) return prev;
      return [product, ...prev];
    });
  };

  const handleScannedBarcode = useCallback(async (payload) => {
    const code = payload?.value || payload;
    if (!code) return;

    if (!selectedBranchId && !userBranchId) {
      toast.error('اختر الفرع أولاً قبل بدء الجرد بالمسح');
      setShowScanner(false);
      return;
    }

    try {
      const response = await productsApi.getByBarcode(code);
      const product = response?.data?.data;
      if (!product?._id) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      mergeScannedProduct(product);
      const targetBranchId = selectedBranchId || userBranchId;
      const baselineQuantity = stockCounts[product._id] !== undefined
        ? Number(stockCounts[product._id]) || 0
        : getBranchQuantity(product, targetBranchId);

      setStockCounts((prev) => ({
        ...prev,
        [product._id]: baselineQuantity + 1,
      }));

      setLastScannedCode(code);
      setScanStatus(`تمت إضافة 1 إلى "${product.name}"`);
      setShowScanner(false);

      if (scanMode) {
        window.setTimeout(() => setShowScanner(true), 650);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'لم يتم العثور على منتج لهذا الباركود');
      setShowScanner(false);
      if (scanMode) {
        window.setTimeout(() => setShowScanner(true), 900);
      }
    }
  }, [scanMode, selectedBranchId, stockCounts, userBranchId]);

  useBarcodeScanner((payload) => {
    if (scanMode && !showScanner) {
      handleScannedBarcode(payload);
    }
  }, scanMode && !showScanner);

  const toggleScanMode = () => {
    if (!scanMode) {
      if (!selectedBranchId && !userBranchId) {
        toast.error('اختر الفرع أولاً قبل بدء الجرد بالمسح');
        return;
      }
      setScanMode(true);
      setScanStatus('وضع المسح المتتابع مفعل');
      setShowScanner(true);
      return;
    }

    setScanMode(false);
    setShowScanner(false);
    setScanStatus('تم إيقاف وضع المسح');
  };

  const handleBranchChange = async (nextBranchId) => {
    if (nextBranchId === selectedBranchId) return;

    if (hasChanges) {
      const approved = await confirm.warn(
        'سيتم فقد أي فروقات غير محفوظة عند تغيير الفرع. هل تريد المتابعة؟',
        'تغيير الفرع'
      );
      if (!approved) return;
    }

    setScanMode(false);
    setShowScanner(false);
    setScanStatus('');
    setLastScannedCode('');
    setSelectedBranchId(nextBranchId);
  };

  const handleSaveStocktake = async () => {
    const targetBranchId = selectedBranchId || userBranchId;
    if (!targetBranchId) {
      toast.error('يرجى تحديد الفرع أولاً قبل حفظ الجرد');
      return;
    }

    const discrepancies = visibleProducts
      .filter((product) => product.actualQty !== product.systemQty)
      .map((product) => ({
        productId: product._id,
        actualQuantity: product.actualQty,
      }));

    if (discrepancies.length === 0) {
      toast.success('لا توجد فروقات تحتاج إلى حفظ');
      return;
    }

    const approved = await confirm.warn(
      `سيتم حفظ فروقات ${discrepancies.length} صنف. هل تريد المتابعة؟`,
      'تأكيد حفظ الجرد'
    );

    if (!approved) return;

    setSaving(true);
    const loadingToast = toast.loading('جاري حفظ فروقات الجرد...');

    try {
      const response = await productsApi.stocktake({
        items: discrepancies,
        branchId: targetBranchId,
      });

      toast.success(response?.data?.message || 'تم حفظ الجرد بنجاح', { id: loadingToast });
      setScanMode(false);
      setShowScanner(false);
      setScanStatus('تم حفظ الجرد');
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'فشل حفظ الجرد', { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const resetCounts = async () => {
    if (hasChanges) {
      const approved = await confirm.warn(
        'سيتم فقد جميع التعديلات غير المحفوظة. هل تريد إعادة التعيين؟',
        'إعادة تعيين الجرد'
      );
      if (!approved) return;
    }

    setScanMode(false);
    setShowScanner(false);
    setScanStatus('');
    setLastScannedCode('');
    setStockCounts({});
    await loadData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative space-y-5 pb-24 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white">
            <CheckSquare className="w-6 h-6 text-primary-500" />
            الجرد الشامل للمخزون
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            عدّ فعلي يدوي أو بالمسح، ثم حفظ الفروقات على الفرع المحدد مباشرة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={scanMode ? 'primary' : 'outline'} onClick={toggleScanMode}>
            <Camera className="w-4 h-4" />
            {scanMode ? 'إيقاف المسح' : 'بدء المسح'}
          </Button>
          <Button variant="ghost" onClick={resetCounts}>
            <RefreshCw className="w-4 h-4" />
            إعادة التعيين
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!userBranchId && branches.length > 0 ? (
          <select
            value={selectedBranchId}
            onChange={(event) => { void handleBranchChange(event.target.value); }}
            className="min-w-[180px] rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <option value="" disabled>اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch._id} value={branch._id}>{branch.name}</option>
            ))}
          </select>
        ) : null}

        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">كل الفئات</option>
          {categories.map((category) => {
            const id = category?._id || category;
            const name = category?.name || category;
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>

        <div className="mr-auto rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          إجمالي الأصناف: <span className="text-primary-500">{visibleProducts.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <h4 className="font-bold text-amber-800">تنبيه الجرد</h4>
            <p className="mt-1 text-sm text-amber-700">
              كل مسحة ناجحة تزيد العدد الفعلي بمقدار 1. يمكنك بعد ذلك التصحيح يدويًا قبل الحفظ النهائي.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={scanMode ? 'success' : 'gray'}>
            {scanMode ? 'المسح المتتابع مفعل' : 'المسح غير مفعل'}
          </Badge>
          {lastScannedCode ? (
            <span className="rounded-full bg-white px-3 py-1 font-mono text-xs text-gray-600">
              {lastScannedCode}
            </span>
          ) : null}
        </div>
      </div>

      {scanStatus ? (
        <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300">
          {scanStatus}
        </div>
      ) : null}

      {visibleProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="لا توجد منتجات"
          description="لم يتم العثور على منتجات مطابقة للفلاتر الحالية."
        />
      ) : (
        <Card className="overflow-hidden border-2 border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/50 text-xs text-gray-500 dark:bg-gray-800/50">
                <tr>
                  <th className="rounded-tr-xl px-4 py-4 font-bold">المنتج والكود</th>
                  <th className="px-4 py-4 font-bold">الفئة</th>
                  <th className="px-4 py-4 text-center font-bold">الكمية النظامية</th>
                  <th className="px-4 py-4 text-center font-bold">الكمية الفعلية</th>
                  <th className="px-4 py-4 text-center font-bold">الفرق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {visibleProducts.map((product) => (
                  <tr key={product._id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="max-w-[240px] truncate font-bold text-gray-800 dark:text-gray-200" title={product.name}>
                        {product.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-gray-400">{getDisplayCode(product)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {product.category?.name || product.category || 'بدون فئة'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-lg bg-gray-100 px-3 py-1 font-mono font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {product.systemQty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQuantity(product._id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:bg-gray-800"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={product.actualQty}
                          onChange={(event) => handleQuantityChange(product._id, event.target.value)}
                          onFocus={(event) => event.target.select()}
                          className="w-20 rounded-lg border-2 border-primary-200 bg-white px-2 py-1.5 text-center font-mono font-bold transition-colors focus:border-primary-500 focus:outline-none dark:border-primary-800 dark:bg-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQuantity(product._id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-emerald-100 hover:text-emerald-600 dark:bg-gray-800"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.diff === 0 ? (
                        <Badge variant="gray">متطابق</Badge>
                      ) : product.diff > 0 ? (
                        <Badge variant="success">+{product.diff}</Badge>
                      ) : (
                        <Badge variant="danger">{product.diff}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasChanges ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-2xl border-2 border-primary-200 bg-white p-4 shadow-2xl dark:border-primary-800 dark:bg-gray-900">
          <div>
            <p className="font-bold text-primary-700 dark:text-primary-400">توجد فروقات غير محفوظة</p>
            <p className="text-xs text-gray-500">يمكنك متابعة المسح أو الحفظ الآن.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetCounts}>إعادة تعيين</Button>
            <Button icon={<Save className="h-4 w-4" />} onClick={handleSaveStocktake} loading={saving}>
              اعتماد الجرد
            </Button>
          </div>
        </div>
      ) : null}

      {showScanner ? (
        <BarcodeScanner
          onScan={handleScannedBarcode}
          onClose={() => {
            setShowScanner(false);
            if (!scanMode) setScanStatus('');
          }}
        />
      ) : null}
    </div>
  );
}
