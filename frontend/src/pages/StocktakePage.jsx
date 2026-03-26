import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  return product?.localBarcode || product?.internationalBarcode || product?.barcode || product?.sku || t('stocktake_page.toasts.kmn6twx');
}

export default function StocktakePage() {
  const { t } = useTranslation('admin');
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
      toast.error(t('stocktake_page.toasts.ksbovom'));
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
      toast.error(t('stocktake_page.toasts.khkkyx4'));
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
      toast.error(error?.response?.data?.message || t('stocktake_page.toasts.k2506z6'));
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
        toast.error(t('stocktake_page.toasts.khkkyx4'));
        return;
      }
      setScanMode(true);
      setScanStatus(t('stocktake_page.ui.kn90yhw'));
      setShowScanner(true);
      return;
    }

    setScanMode(false);
    setShowScanner(false);
    setScanStatus(t('stocktake_page.ui.k2ivtpb'));
  };

  const handleBranchChange = async (nextBranchId) => {
    if (nextBranchId === selectedBranchId) return;

    if (hasChanges) {
      const approved = await confirm.warn(
        t('stocktake_page.ui.kjj5sf3'),
        t('stocktake_page.ui.kkqvg37')
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
      toast.error(t('stocktake_page.toasts.ka6tdgz'));
      return;
    }

    const discrepancies = visibleProducts
      .filter((product) => product.actualQty !== product.systemQty)
      .map((product) => ({
        productId: product._id,
        actualQuantity: product.actualQty,
      }));

    if (discrepancies.length === 0) {
      toast.success(t('stocktake_page.toasts.kjjhibb'));
      return;
    }

    const approved = await confirm.warn(
      `سيتم حفظ فروقات ${discrepancies.length} صنف. هل تريد المتابعة؟`,
      t('stocktake_page.ui.k55m58g')
    );

    if (!approved) return;

    setSaving(true);
    const loadingToast = toast.loading(t('stocktake_page.ui.kn5byz8'));

    try {
      const response = await productsApi.stocktake({
        items: discrepancies,
        branchId: targetBranchId,
      });

      toast.success(response?.data?.message || t('stocktake_page.toasts.kah6ijk'), { id: loadingToast });
      setScanMode(false);
      setShowScanner(false);
      setScanStatus(t('stocktake_page.ui.kllz1cc'));
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || t('stocktake_page.toasts.kolhdxa'), { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const resetCounts = async () => {
    if (hasChanges) {
      const approved = await confirm.warn(
        t('stocktake_page.ui.kbn8pzl'),
        t('stocktake_page.ui.k7hbo9d')
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
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500/80">Stocktake Console</p>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('stocktake_page.ui.kg80utl')}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-7 text-gray-500">
                {t('stocktake_page.ui.kswb8ki')}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant={scanMode ? 'primary' : 'outline'} onClick={toggleScanMode} className="w-full sm:w-auto">
              <Camera className="w-4 h-4" />
              {scanMode ? t('stocktake_page.ui.kwshufb') : 'بدء المسح'}
            </Button>
            <Button variant="ghost" onClick={resetCounts} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4" />
              {t('stocktake_page.ui.k9i1fa1')}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {!userBranchId && branches.length > 0 ? (
          <select
            value={selectedBranchId}
            onChange={(event) => { void handleBranchChange(event.target.value); }}
            className="min-w-[180px] rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400"
          >
            <option value="" disabled>{t('stocktake_page.ui.ktagena')}</option>
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
            placeholder={t('stocktake_page.placeholders.kk99m7q')}
            className="w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">{t('stocktake_page.ui.ki151rw')}</option>
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
            <h4 className="font-bold text-amber-800">{t('stocktake_page.ui.kxmj12')}</h4>
            <p className="mt-1 text-sm text-amber-700">
              {t('stocktake_page.ui.kly2bwi')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={scanMode ? 'success' : 'gray'}>
            {scanMode ? t('stocktake_page.ui.kvj1hyx') : 'المسح غير مفعل'}
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
          title={t('stocktake_page.titles.k8fd1p4')}
          description="لم يتم العثور على منتجات مطابقة للفلاتر الحالية."
        />
      ) : (
        <Card className="overflow-hidden border-2 border-gray-200 dark:border-gray-800">
          <div className="space-y-3 p-4 md:hidden">
            {visibleProducts.map((product) => (
              <div key={product._id} className="rounded-3xl border border-white/60 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-gray-900 dark:text-white">{product.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-gray-400">{getDisplayCode(product)}</p>
                    <p className="mt-1 text-xs text-gray-500">{product.category?.name || product.category || t('stocktake_page.toasts.kmn6w7r')}</p>
                  </div>
                  {product.diff === 0 ? (
                    <Badge variant="gray">{t('stocktake_page.ui.k3hvkdr')}</Badge>
                  ) : product.diff > 0 ? (
                    <Badge variant="success">+{product.diff}</Badge>
                  ) : (
                    <Badge variant="danger">{product.diff}</Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/[0.03] p-3 text-center dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">{t('stocktake_page.ui.kz9jsg3')}</p>
                    <p className="mt-1 font-mono font-black text-gray-900 dark:text-white">{product.systemQty}</p>
                  </div>
                  <div className="rounded-2xl bg-black/[0.03] p-3 text-center dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">{t('stocktake_page.ui.kaazo4l')}</p>
                    <p className="mt-1 font-mono font-black text-primary-600">{product.actualQty}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(product._id, -1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:bg-gray-800"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={product.actualQty}
                    onChange={(event) => handleQuantityChange(product._id, event.target.value)}
                    onFocus={(event) => event.target.select()}
                    className="w-24 rounded-xl border-2 border-primary-200 bg-white px-2 py-2 text-center font-mono font-bold transition-colors focus:border-primary-500 focus:outline-none dark:border-primary-800 dark:bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQuantity(product._id, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-emerald-100 hover:text-emerald-600 dark:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/50 text-xs text-gray-500 dark:bg-gray-800/50">
                <tr>
                  <th className="rounded-tr-xl px-4 py-4 font-bold">{t('stocktake_page.ui.kpzrrid')}</th>
                  <th className="px-4 py-4 font-bold">{t('stocktake_page.ui.kove7jb')}</th>
                  <th className="px-4 py-4 text-center font-bold">{t('stocktake_page.ui.ka9bd2m')}</th>
                  <th className="px-4 py-4 text-center font-bold">{t('stocktake_page.ui.k8wr1v8')}</th>
                  <th className="px-4 py-4 text-center font-bold">{t('stocktake_page.ui.kove7th')}</th>
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
                      {product.category?.name || product.category || t('stocktake_page.toasts.kmn6w7r')}
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
                        <Badge variant="gray">{t('stocktake_page.ui.k3hvkdr')}</Badge>
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
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 flex-col items-start gap-4 rounded-2xl border-2 border-primary-200 bg-white p-4 shadow-2xl dark:border-primary-800 dark:bg-gray-900 sm:bottom-6 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
          <div>
            <p className="font-bold text-primary-700 dark:text-primary-400">{t('stocktake_page.ui.k2xt4rx')}</p>
            <p className="text-xs text-gray-500">{t('stocktake_page.ui.kiu0kd6')}</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="ghost" onClick={resetCounts} className="flex-1 sm:flex-none">{t('stocktake_page.ui.k2eox30')}</Button>
            <Button icon={<Save className="h-4 w-4" />} onClick={handleSaveStocktake} loading={saving} className="flex-1 sm:flex-none">
              {t('stocktake_page.ui.kteu66')}
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
