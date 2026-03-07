import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Minus, ShoppingCart, Zap, CreditCard, Calendar, Clock, Check, Trash2, Scan, RotateCcw, Package, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, customersApi, invoicesApi, useAuthStore } from '../store';
import { Button, Badge, LoadingSpinner } from '../components/UI';
import BarcodeScanner, { useBarcodeScanner } from '../components/BarcodeScanner';
import db, { syncProductsToLocal, syncCustomersToLocal, searchLocalProducts, searchLocalCustomers, savePendingInvoice } from '../db/posDatabase';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import { useLiveQuery } from 'dexie-react-hooks';

export default function QuickSalePage() {
  const [mode, setMode] = useState('sale'); // 'sale' | 'return'
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustPicker, setShowCustPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installments, setInstallments] = useState(3);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [custSaving, setCustSaving] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', phone: '', password: 'customer123' });
  const [variantPicker, setVariantPicker] = useState({ open: false, product: null });

  // Return mode state
  const [returnInvoiceSearch, setReturnInvoiceSearch] = useState('');
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnCreating, setReturnCreating] = useState(false);

  const searchRef = useRef(null);

  // Sync status
  const [syncStatus, setSyncStatus] = useState('online'); // online, offline, syncing

  // Real-time pending invoices count from Dexie
  const pendingInvoicesCount = useLiveQuery(() => db.pendingInvoices.count(), []);

  // Background Sync Function
  const syncPendingInvoices = async () => {
    if (!navigator.onLine) return;

    try {
      setSyncStatus('syncing');
      const pending = await db.pendingInvoices.toArray();
      if (pending.length === 0) {
        setSyncStatus('online');
        return;
      }

      console.log(`[POS SYNC] Attempting to sync ${pending.length} invoices...`);
      let successCount = 0;

      for (const invoice of pending) {
        try {
          // Remove local-only fields before sending to API
          const { id, createdAt, status, totalAmount, ...apiPayload } = invoice;

          await invoicesApi.create(apiPayload);
          await db.pendingInvoices.delete(invoice.id);
          successCount++;
        } catch (err) {
          console.error(`[POS SYNC] Failed to sync invoice ${invoice.id}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`تمت مزامنة ${successCount} فاتورة بنجاح ☁️`);
        productsApi.getAll({ limit: 200 }).then((r) => setProducts(r.data.data || []));
      }
    } catch (error) {
      console.error('[POS SYNC] Sync process error:', error);
    } finally {
      setSyncStatus('online');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('online');
      syncPendingInvoices();
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setSyncStatus(navigator.onLine ? 'online' : 'offline');

    // Interval check every minute for pending invoices
    const syncInterval = setInterval(() => {
      if (navigator.onLine) syncPendingInvoices();
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    // Attempt to load from API, fallback to local DB if offline
    if (navigator.onLine) {
      Promise.all([
        productsApi.getAll({ limit: 500 }),
        customersApi.getAll({ limit: 500 }),
      ]).then(([pRes, cRes]) => {
        const prods = pRes.data.data || [];
        const custs = cRes.data.data || [];
        setProducts(prods);
        setCustomers(custs);
        // Background sync to local DB
        syncProductsToLocal(prods);
        syncCustomersToLocal(custs);
      }).catch(() => toast.error('خطأ في التحميل من الخادم. يتم استخدام البيانات المحلية.'))
        .finally(() => setLoading(false));
    } else {
      // Offline: load exactly from local IndexedDB
      Promise.all([
        db.products.limit(200).toArray(),
        db.customers.limit(200).toArray()
      ]).then(([pRes, cRes]) => {
        setProducts(pRes);
        setCustomers(cRes);
        toast.success('تم تحميل البيانات المحلية (وضع عدم الاتصال)');
      }).finally(() => setLoading(false));
    }
  }, []);

  // Update local search
  useEffect(() => {
    if (!navigator.onLine) {
      searchLocalProducts(search).then(setProducts);
    }
  }, [search]);

  useEffect(() => {
    if (!navigator.onLine) {
      searchLocalCustomers(custSearch).then(setCustomers);
    }
  }, [custSearch]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F5' && mode === 'sale') { e.preventDefault(); handleComplete(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, selectedCustomer, mode]);

  useUnsavedWarning(cart.length > 0, 'quick-sale');

  const addToCart = (product, variant = null) => {
    if (product.variants?.length > 0 && !variant) {
      setVariantPicker({ open: true, product });
      return;
    }

    const target = variant || product;
    const stockQty = target.stock?.quantity ?? target.stockQuantity ?? 0;
    if (stockQty <= 0) return toast.error('المنتج نفذ من المخزون');

    const cartKey = variant ? `${product._id}-${variant._id}` : product._id;
    const exists = cart.find((c) => (variant ? c.variantId === variant._id : c.productId === product._id));

    if (exists) {
      if (exists.quantity >= stockQty) return toast.error('الكمية غير متوفرة');
      setCart(cart.map((c) => (variant ? c.variantId === variant._id : c.productId === product._id) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        productId: product._id,
        variantId: variant?._id,
        name: variant ? `${product.name} (${Object.values(variant.attributes || {}).join(' - ')})` : product.name,
        price: variant?.price || product.price,
        cost: product.cost || 0,
        quantity: 1,
        maxQty: stockQty,
        sku: variant?.sku || product.sku || '',
        barcode: variant?.barcode || product.barcode || '',
      }]);
    }
    setSearch('');
    setVariantPicker({ open: false, product: null });
    searchRef.current?.focus();
  };

  // Handle barcode scan — shows full product info toast
  const handleBarcodeScan = async (barcode) => {
    try {
      const res = await productsApi.getByBarcode(barcode);
      const product = res.data.data;
      const stockQty = product.stock?.quantity ?? 0;

      // Show full product details
      toast.success(
        `📦 ${product.name}\n` +
        `السعر: ${product.price?.toLocaleString('ar-EG')} ج.م | المخزون: ${stockQty} ${product.stock?.unit || 'قطعة'}` +
        (product.sku ? ` | ${product.sku}` : ''),
        { duration: 3000 }
      );

      addToCart(product);
      setShowScanner(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'المنتج غير موجود');
    }
  };

  // USB Barcode Scanner Hook (works globally)
  useBarcodeScanner((barcode) => {
    if (!showScanner && mode === 'sale') handleBarcodeScan(barcode);
  }, !showScanner && mode === 'sale');

  const updateQty = (key, qty) => {
    if (qty <= 0) removeFromCart(key);
    else setCart(cart.map((c) => {
      const cKey = c.variantId ? `${c.productId}-${c.variantId}` : c.productId;
      return cKey === key ? { ...c, quantity: Math.min(qty, c.maxQty) } : c;
    }));
  };
  const removeFromCart = (key) => setCart(cart.filter((c) => {
    const cKey = c.variantId ? `${c.productId}-${c.variantId}` : c.productId;
    return cKey !== key;
  }));

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalProfit = cart.reduce((s, i) => s + (i.price - i.cost) * i.quantity, 0);

  const filteredProducts = search.length > 0 ? products.filter((p) =>
    p.name.includes(search) || (p.sku || '').toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
  ).slice(0, 8) : [];

  const filteredCustomers = custSearch.length > 0 ? customers.filter((c) =>
    c.name.includes(custSearch) || c.phone.includes(custSearch)
  ).slice(0, 5) : customers.slice(0, 5);

  const handleComplete = async () => {
    if (!selectedCustomer) return toast.error('اختر العميل أولاً');
    if (selectedCustomer.salesBlocked) return toast.error(`⛔ البيع ممنوع لهذا العميل: ${selectedCustomer.salesBlockedReason || 'تم منع البيع'}`);
    if (cart.length === 0) return toast.error('السلة فارغة');

    setCreating(true);
    const { user } = useAuthStore.getState();
    const invoicePayload = {
      customerId: selectedCustomer._id,
      items: cart.map((c) => ({
        productId: c.productId,
        variantId: c.variantId,
        quantity: c.quantity
      })),
      paymentMethod,
      numberOfInstallments: paymentMethod === 'installment' ? installments : undefined,
      branchId: user?.branch,
      sendWhatsApp: false,
      totalAmount: total, // Helper for local display
    };

    if (navigator.onLine) {
      try {
        await invoicesApi.create(invoicePayload);
        toast.success('تم البيع بنجاح! 🎉', { icon: '⚡' });
        finishSale();
      } catch (err) {
        toast.error(err.response?.data?.message || 'خطأ في إنشاء الفاتورة');
      } finally {
        setCreating(false);
      }
    } else {
      // Offline mode: save locally
      try {
        await savePendingInvoice(invoicePayload);
        toast.success('تم حفظ الفاتورة محلياً (وضع عدم الاتصال) 💾', { icon: '⚡' });
        finishSale();
      } catch (err) {
        toast.error('خطأ في حفظ الفاتورة محلياً');
      } finally {
        setCreating(false);
      }
    }
  };

  const finishSale = () => {
    setCart([]); setSelectedCustomer(null); setPaymentMethod('cash');
    searchRef.current?.focus();
    if (navigator.onLine) {
      productsApi.getAll({ limit: 200 }).then((r) => setProducts(r.data.data || []));
    } else {
      searchLocalProducts('').then(setProducts);
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!custForm.name || !custForm.phone) return toast.error('الاسم والهاتف مطلوبين');
    setCustSaving(true);
    try {
      const res = await customersApi.create(custForm);
      const newCustomer = res.data.data;
      setCustomers([...customers, newCustomer]);
      setSelectedCustomer(newCustomer);
      setShowAddCustModal(false);
      setCustForm({ name: '', phone: '', password: 'customer123' });
      toast.success('تم إضافة العميل بنجاح');
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ في إضافة العميل');
    } finally {
      setCustSaving(false);
    }
  };

  // Return mode handlers
  const handleSearchInvoice = async () => {
    if (!returnInvoiceSearch) return;
    setReturnLoading(true);
    try {
      const res = await invoicesApi.getAll({ search: returnInvoiceSearch, limit: 5 });
      const invoices = res.data.data || res.data?.data?.invoices || [];
      if (invoices.length === 0) return toast.error('لا توجد فواتير بهذا البحث');
      // Take first match
      const inv = invoices[0];
      setReturnInvoice(inv);
      setReturnItems((inv.items || []).map(item => ({
        ...item,
        returnQty: 0,
      })));
    } catch {
      toast.error('خطأ في البحث عن الفاتورة');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReturn = async () => {
    const itemsToReturn = returnItems.filter(i => i.returnQty > 0);
    if (itemsToReturn.length === 0) return toast.error('حدد كمية الاسترجاع أولاً');
    if (!returnReason) return toast.error('سبب الاسترجاع مطلوب');
    setReturnCreating(true);
    try {
      const { api } = await import('../store');
      await api.post('/returns', {
        invoiceId: returnInvoice._id,
        items: itemsToReturn.map(i => ({
          productId: i.product?._id || i.productId,
          quantity: i.returnQty,
        })),
        reason: returnReason,
      });
      toast.success('تم تسجيل الاسترجاع بنجاح ✅');
      setReturnInvoice(null);
      setReturnItems([]);
      setReturnInvoiceSearch('');
      setReturnReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ في تسجيل الاسترجاع');
    } finally {
      setReturnCreating(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const catIcon = (n) => n?.includes('آيفون') || n?.includes('سامسونج') ? '📱' : n?.includes('ماك') ? '💻' : n?.includes('آيباد') ? '📟' : n?.includes('شاشة') ? '🖥️' : '📦';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('sale')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'sale'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
              }`}
          >
            <Zap className="w-4 h-4" /> بيع سريع
          </button>
          <button
            onClick={() => setMode('return')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'return'
              ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
              }`}
          >
            <RotateCcw className="w-4 h-4" /> استرجاع
          </button>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-3">
          {pendingInvoicesCount > 0 && (
            <button
              onClick={syncPendingInvoices}
              disabled={syncStatus !== 'online'}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="مزامنة الآن"
            >
              <Clock className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {pendingInvoicesCount} معلقة
            </button>
          )}
          <Badge variant={syncStatus === 'online' ? 'success' : syncStatus === 'syncing' ? 'warning' : 'danger'} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
            {syncStatus === 'online' ? 'متصل بالخادم' : syncStatus === 'syncing' ? 'جاري المزامنة...' : 'وضع عدم الاتصال (محلي)'}
          </Badge>
        </div>
      </div>

      {/* SALE MODE */}
      {mode === 'sale' && (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
          {/* RIGHT: Product Search + Cart */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold">بيع سريع</h2>
                <p className="text-xs text-gray-400">F2: بحث · F5: إتمام البيع</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الباركود..."
                  className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-primary-200 dark:border-primary-500/30 bg-white dark:bg-gray-900 text-base font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm" autoFocus />
              </div>
              <button onClick={() => setShowScanner(true)}
                className="px-4 py-3.5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all flex items-center gap-2 font-bold">
                <Scan className="w-5 h-5" /> مسح
              </button>
            </div>
            <div className="relative">
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-2xl z-50 overflow-hidden">
                  {filteredProducts.map((p) => (
                    <button key={p._id} onClick={() => addToCart(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <span className="text-xl">{catIcon(p.name)}</span>
                      <div className="flex-1 text-right">
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.sku || '—'} · المخزون: {p.stock?.quantity || 0} {p.stock?.unit || 'قطعة'}</p>
                        {p.variants?.length > 0 && <Badge variant="primary" className="mt-1 text-[8px] py-0">متوفر بموديلات</Badge>}
                      </div>
                      <span className="text-sm font-extrabold text-primary-500">{fmt(p.price)} ج.م</span>
                      {(p.stock?.quantity || 0) <= 0 && <Badge variant="danger">نفذ</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700">
                  <ShoppingCart className="w-16 h-16 mb-3" />
                  <p className="text-sm font-medium">السلة فارغة — ابدأ بالبحث عن منتج</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const itemKey = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                  return (
                    <div key={itemKey} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 shadow-sm animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                      <span className="text-lg">{catIcon(item.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{fmt(item.price)} × {item.quantity} = <span className="font-bold text-primary-500">{fmt(item.price * item.quantity)} ج.م</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(itemKey, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors text-gray-500 hover:text-red-500"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-8 text-center text-sm font-extrabold">{item.quantity}</span>
                        <button onClick={() => updateQty(itemKey, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-500/10 transition-colors text-gray-500 hover:text-primary-500"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => removeFromCart(itemKey)} className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })
              )}
            </div>

            {search.length === 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {products.filter((p) => (p.stock?.quantity || 0) > 0).slice(0, 8).map((p) => (
                  <button key={p._id} onClick={() => addToCart(p)}
                    className="px-3 py-2 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all">
                    {catIcon(p.name)} {p.name.substring(0, 15)} — <span className="text-primary-500">{fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LEFT: Checkout Panel */}
          <div className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden">
            <div className="p-4 border-b-2 border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold text-gray-400 mb-2 block">العميل</label>
              {selectedCustomer ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${selectedCustomer.salesBlocked ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${selectedCustomer.salesBlocked ? 'bg-red-500' : 'bg-primary-500'}`}>{selectedCustomer.salesBlocked ? '⛔' : selectedCustomer.name?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm flex items-center gap-2">
                      {selectedCustomer.name}
                      {selectedCustomer.salesBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">ممنوع البيع</span>}
                    </p>
                    <p className="text-[10px] text-gray-400" dir="ltr">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setShowCustPicker(true); }} onFocus={() => setShowCustPicker(true)} placeholder="بحث بالاسم أو الهاتف..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                  {showCustPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-100 dark:border-gray-800 shadow-xl z-50 max-h-64 overflow-y-auto">
                      {filteredCustomers.length === 0 && custSearch.length > 0 && (
                        <button onClick={() => {
                          const isNumeric = /^\d+$/.test(custSearch);
                          setCustForm({
                            ...custForm,
                            name: isNumeric ? '' : custSearch,
                            phone: isNumeric ? custSearch : ''
                          });
                          setShowAddCustModal(true);
                          setShowCustPicker(false);
                        }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-right border-b border-gray-50 dark:border-gray-800 text-sm font-bold">
                          <Plus className="w-4 h-4" /> إضافة عميل جديد: {custSearch}
                        </button>
                      )}
                      {filteredCustomers.map((c) => (
                        <button key={c._id} onClick={() => { setSelectedCustomer(c); setShowCustPicker(false); setCustSearch(''); }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-right border-b border-gray-50 dark:border-gray-800 last:border-0 ${c.salesBlocked ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${c.salesBlocked ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            {c.salesBlocked ? '⛔' : c.name?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{c.name}</p>
                            <p className="text-[10px] text-gray-400">{c.phone}</p>
                          </div>
                          {c.tier === 'vip' && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">VIP</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-b-2 border-gray-100 dark:border-gray-800">
              <label className="text-xs font-bold text-gray-400 mb-2 block">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'cash', l: '💵 نقد', i: CreditCard }, { v: 'visa', l: '💳 فيزا', i: CreditCard }, { v: 'installment', l: '📅 أقساط', i: Calendar }, { v: 'deferred', l: '⏳ آجل', i: Clock }].map((m) => (
                  <button key={m.v} onClick={() => setPaymentMethod(m.v)}
                    className={`py-2.5 px-1 rounded-xl text-[10px] font-bold transition-all ${paymentMethod === m.v
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'}`}>
                    {m.l}
                  </button>
                ))}
              </div>
              {paymentMethod === 'installment' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">عدد الأقساط:</span>
                  <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800">
                    {[2, 3, 4, 6, 9, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-xs font-bold text-primary-500">{fmt(Math.ceil(total / installments))} ج.م/قسط</span>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 flex flex-col justify-end">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-400">العناصر</span><span className="font-bold">{cart.reduce((s, c) => s + c.quantity, 0)} قطعة</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">الربح المتوقع</span><span className="font-bold text-emerald-500">+{fmt(totalProfit)} ج.م</span></div>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <div className="flex justify-between items-end">
                  <span className="text-sm text-gray-400">الإجمالي</span>
                  <span className="text-3xl font-black text-primary-500">{fmt(total)}<span className="text-base mr-1">ج.م</span></span>
                </div>
              </div>

              <button onClick={handleComplete} disabled={creating || cart.length === 0 || !selectedCustomer}
                className={`w-full py-4 rounded-2xl text-lg font-extrabold transition-all flex items-center justify-center gap-2 ${creating || cart.length === 0 || !selectedCustomer
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0'
                  }`}>
                {creating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Zap className="w-5 h-5" /> إتمام البيع (F5)</>
                )}
              </button>

              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="w-full mt-2 py-2 text-xs text-red-400 hover:text-red-500 font-semibold">
                  مسح السلة
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODE */}
      {mode === 'return' && (
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">استرجاع منتج</h2>
              <p className="text-xs text-gray-400">ابحث برقم الفاتورة أو اسم العميل</p>
            </div>
          </div>

          {/* Search Invoice */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={returnInvoiceSearch}
                onChange={(e) => setReturnInvoiceSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                placeholder="رقم الفاتورة أو اسم العميل..."
                className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-white dark:bg-gray-900 text-base font-medium focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
              />
            </div>
            <button
              onClick={handleSearchInvoice}
              disabled={returnLoading}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold flex items-center gap-2 shadow-lg"
            >
              {returnLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              بحث
            </button>
          </div>

          {/* Invoice Details */}
          {returnInvoice && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden">
              {/* Invoice Header */}
              <div className="p-4 border-b-2 border-gray-100 dark:border-gray-800 bg-rose-50 dark:bg-rose-500/5">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="font-bold text-sm">فاتورة: {returnInvoice.invoiceNumber || returnInvoice._id?.slice(-6)}</p>
                    <p className="text-xs text-gray-400">العميل: {returnInvoice.customer?.name || '—'} · {new Date(returnInvoice.createdAt).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <button onClick={() => setReturnInvoice(null)} className="mr-auto text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 mb-2">اختر الكميات المراد استرجاعها:</p>
                {returnItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="text-lg">{catIcon(item.product?.name || '')}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.product?.name || 'منتج محذوف'}</p>
                      <p className="text-xs text-gray-400">الكمية المباعة: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReturnItems(returnItems.map((ri, i) => i === idx ? { ...ri, returnQty: Math.max(0, ri.returnQty - 1) } : ri))}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-rose-100 transition-colors text-gray-500 hover:text-rose-500"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-8 text-center text-sm font-extrabold ${item.returnQty > 0 ? 'text-rose-500' : 'text-gray-400'}`}>{item.returnQty}</span>
                      <button
                        onClick={() => setReturnItems(returnItems.map((ri, i) => i === idx ? { ...ri, returnQty: Math.min(item.quantity, ri.returnQty + 1) } : ri))}
                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-primary-100 transition-colors text-gray-500 hover:text-primary-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Return Reason */}
                <div className="mt-4">
                  <label className="text-xs font-bold text-gray-400 mb-2 block">سبب الاسترجاع *</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">اختر السبب...</option>
                    <option value="defective">منتج معيب</option>
                    <option value="wrong_item">منتج خاطئ</option>
                    <option value="customer_changed_mind">العميل غيّر رأيه</option>
                    <option value="damaged_packaging">تالف التغليف</option>
                    <option value="other">سبب آخر</option>
                  </select>
                </div>

                {/* Submit Return */}
                <button
                  onClick={handleReturn}
                  disabled={returnCreating || returnItems.every(i => i.returnQty === 0) || !returnReason}
                  className={`w-full py-3.5 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2 mt-2 ${returnCreating || returnItems.every(i => i.returnQty === 0) || !returnReason
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/30 hover:-translate-y-0.5'
                    }`}
                >
                  {returnCreating
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><RotateCcw className="w-5 h-5" /> تأكيد الاسترجاع</>
                  }
                </button>
              </div>
            </div>
          )}

          {!returnInvoice && !returnLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300 dark:text-gray-700">
              <AlertCircle className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">ابحث عن فاتورة لبدء عملية الاسترجاع</p>
            </div>
          )}
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddCustModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-black">إضافة عميل جديد</h3>
              <button onClick={() => setShowAddCustModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">اسم العميل</label>
                <input
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 focus:border-primary-500 transition-all font-bold"
                  placeholder="الاسم الثلاثي..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">رقم الهاتف</label>
                <input
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 focus:border-primary-500 transition-all font-mono"
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                />
              </div>
              <button
                onClick={handleQuickAddCustomer}
                disabled={custSaving}
                className="w-full py-4 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                {custSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Plus className="w-6 h-6" /> إضافة وتحديد </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Picker Modal */}
      {variantPicker.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVariantPicker({ open: false, product: null })} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-primary-50/50 dark:bg-primary-500/10">
              <div>
                <h3 className="text-xl font-black">{variantPicker.product?.name}</h3>
                <p className="text-xs text-gray-400 mt-1">اختر الموديل المطلوب (المقاس / اللون)</p>
              </div>
              <button onClick={() => setVariantPicker({ open: false, product: null })} className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {variantPicker.product?.variants.map((v) => {
                const stock = v.stock?.quantity || 0;
                const attrText = Object.values(v.attributes || {}).join(' - ');
                return (
                  <button
                    key={v._id}
                    disabled={stock <= 0}
                    onClick={() => addToCart(variantPicker.product, v)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${stock <= 0
                      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-primary-500 hover:shadow-lg active:scale-[0.98]'}`}
                  >
                    <div className="text-right">
                      <p className="font-bold text-sm">{attrText || 'موديل افتراضي'}</p>
                      <p className="text-[10px] text-gray-400">SKU: {v.sku} · المخزون: {stock}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-primary-500">{fmt(v.price || variantPicker.product.price)} ج.م</p>
                      {stock <= 0 && <span className="text-[8px] text-red-500 font-bold">غير متوفر</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
