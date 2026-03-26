import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Plus, Minus, ShoppingCart, Zap, CreditCard, Calendar, Clock, Check, Trash2, Scan, RotateCcw, Package, AlertCircle, ChevronDown, ChevronRight, ChevronLeft, FolderTree, UserPlus, History, Wallet, Banknote, Store, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, productsApi, customersApi, invoicesApi, categoriesApi, useAuthStore, useShiftStore } from '../store';
import { Badge, LoadingSpinner } from '../components/UI';
import BarcodeScanner, { useBarcodeScanner } from '../components/BarcodeScanner';
import db, { syncProductsToLocal, syncCustomersToLocal, searchLocalProducts, searchLocalCustomers, savePendingInvoice } from '../db/posDatabase';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import { useLiveQuery } from 'dexie-react-hooks';
import { getBarcodeSearchText } from '../utils/barcodeUtils';

// --- Helpers ---
function findMatchedVariant(product, code) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode || !Array.isArray(product?.variants)) return null;
  return product.variants.find((variant) => (
    [variant?.localBarcode, variant?.internationalBarcode, variant?.barcode, variant?.sku].filter(Boolean).includes(normalizedCode)
  )) || null;
}

function getAvailableStock(entry) {
  return Number(entry?.stock?.quantity ?? entry?.stockQuantity ?? entry?.stock) || 0;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getCategoryId(category) {
  if (!category) return '';
  if (typeof category === 'string') return category;
  return category._id || category.id || category.name || '';
}

function getCategoryName(category) {
  if (!category) return '';
  if (typeof category === 'string') return category;
  return category.name || category.label || category._id || '';
}

function findCategoryById(items, id) {
  if (!Array.isArray(items) || !id) return null;
  for (const item of items) {
    if (getCategoryId(item) === id) return item;
    const foundChild = findCategoryById(item.children, id);
    if (foundChild) return foundChild;
  }
  return null;
}

function buildCategoryTreeFromProducts(items = []) {
  const categoryMap = new Map();
  items.forEach((product) => {
    const cid = getCategoryId(product?.category);
    const cname = getCategoryName(product?.category);
    const scid = getCategoryId(product?.subcategory);
    const scname = getCategoryName(product?.subcategory);
    if (!cid && !cname) return;
    const rootKey = cid || cname;
    if (!categoryMap.has(rootKey)) {
      categoryMap.set(rootKey, { _id: rootKey, name: cname || rootKey, icon: product?.category?.icon || '', children: [] });
    }
    if (scid || scname) {
      const root = categoryMap.get(rootKey);
      const subKey = scid || scname;
      if (!root.children.some(ch => getCategoryId(ch) === subKey)) {
        root.children.push({ _id: subKey, name: scname || subKey, icon: product?.subcategory?.icon || '', parent: rootKey });
      }
    }
  });
  return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

function filterCategoriesBySearch(items, term) {
  if (!Array.isArray(items) || !term) return items;
  const nt = normalizeText(term);
  return items.reduce((acc, cat) => {
    const matchP = normalizeText(cat?.name).includes(nt);
    const children = Array.isArray(cat?.children) ? cat.children : [];
    const filteredCh = children.filter(ch => normalizeText(ch?.name).includes(nt));
    if (matchP || filteredCh.length > 0) {
      acc.push({ ...cat, children: matchP ? children : filteredCh });
    }
    return acc;
  }, []);
}

function matchesCategorySelection(product, selCat, selSub) {
  const pcid = getCategoryId(product?.category);
  const pcname = getCategoryName(product?.category);
  const pscid = getCategoryId(product?.subcategory);
  const pscname = getCategoryName(product?.subcategory);
  if (selSub) return pscid === selSub._id || normalizeText(pscname) === normalizeText(selSub.name);
  if (!selCat) return true;
  return pcid === selCat._id || pscid === selCat._id || normalizeText(pcname) === normalizeText(selCat.name) || normalizeText(pscname) === normalizeText(selCat.name);
}

// --- Main Component ---
export default function QuickSalePage() {
  const [mode, setMode] = useState('sale');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [custSaving, setCustSaving] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', phone: '', password: 'customer123' });
  const [variantPicker, setVariantPicker] = useState({ open: false, product: null });
  const [creating, setCreating] = useState(false);
  const [productPage, setProductPage] = useState(0);
  const [custPage, setCustPage] = useState(0);
  const PRODUCTS_PER_PAGE = 18;
  const CUSTOMERS_PER_PAGE = 6;
  const [cameras, setCameras] = useState([]);
  const [showMonitor, setShowMonitor] = useState(false);
  const [activeCamIdx, setActiveCamIdx] = useState(0);
  const categoriesRef = useRef(null);
  const cartsRef = useRef(null);

  // Shift logic
  const { activeShift, loading: shiftLoading, openShift, fetchCurrentShift } = useShiftStore();
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingShift, setOpeningShift] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!activeShift?.autoCloseAt) return;
    const tick = () => {
      const ms = new Date(activeShift.autoCloseAt).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('مغلق');
      } else {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };
    tick();
    const inv = setInterval(tick, 1000);
    return () => clearInterval(inv);
  }, [activeShift]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const CART_STORAGE_KEY = 'payqusta_quicksale_carts';
  const ACTIVE_CART_STORAGE_KEY = 'payqusta_quicksale_active_cart';

  const getInitialCarts = () => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [{ id: Date.now(), title: 'العميل 1', items: [], customer: null, payments: [{ method: 'cash', amount: 0 }], installments: 3 }];
  };

  const [carts, setCarts] = useState(getInitialCarts);
  const [activeCartId, setActiveCartId] = useState(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_CART_STORAGE_KEY);
      const initialCarts = getInitialCarts();
      if (savedId && initialCarts.some(c => String(c.id) === savedId)) return Number(savedId);
      return initialCarts[0].id;
    } catch (e) { return getInitialCarts()[0].id; }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carts));
      localStorage.setItem(ACTIVE_CART_STORAGE_KEY, String(activeCartId));
    } catch (e) { /* ignore */ }
  }, [carts, activeCartId]);

  const activeCart = carts.find(c => c.id === activeCartId) || carts[0];
  const cart = activeCart.items || [];
  const selectedCustomer = activeCart.customer || null;
  const payments = activeCart.payments || [{ method: 'cash', amount: 0 }];
  const installments = activeCart.installments || 3;

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalProfit = cart.reduce((s, i) => s + (i.price - i.cost) * i.quantity, 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, total - totalPaid);

  const updateActiveCart = (updates) => {
    setCarts(prev => prev.map(c => c.id === activeCartId ? { ...c, ...updates } : c));
  };

  const setCart = (newItems) => updateActiveCart({ items: typeof newItems === 'function' ? newItems(cart) : newItems });
  const setSelectedCustomer = (customer) => updateActiveCart({ customer, title: customer?.name || `العميل ${carts.findIndex(c => c.id === activeCartId) + 1}` });
  const setPaymentMethod = (method) => updateActiveCart({ payments: [{ method, amount: total }] });
  const addPaymentMethod = (method) => {
    if (remainingAmount <= 0) return toast.error('المبلغ الإجمالي مغطى بالكامل');
    updateActiveCart({ payments: [...payments, { method, amount: remainingAmount }] });
  };
  const updatePaymentMethod = (idx, ups) => {
    const n = [...payments];
    n[idx] = { ...n[idx], ...ups };
    updateActiveCart({ payments: n });
  };
  const removePaymentMethod = (idx) => {
    const n = payments.filter((_, i) => i !== idx);
    if (n.length === 0) n.push({ method: 'cash', amount: total });
    updateActiveCart({ payments: n });
  };
  const setInstallments = (v) => updateActiveCart({ installments: v });

  const addNewCart = () => {
    const id = Date.now();
    setCarts([...carts, { id, title: `العميل ${carts.length + 1}`, items: [], customer: null, payments: [{ method: 'cash', amount: 0 }], installments: 3 }]);
    setActiveCartId(id);
  };
  const removeCart = (id) => {
    if (carts.length === 1) return toast.error('يجب بقاء سلة واحدة على الأقل');
    const newCarts = carts.filter(c => c.id !== id);
    setCarts(newCarts);
    if (activeCartId === id) setActiveCartId(newCarts[0].id);
  };

  const removeFromCart = (key) => {
    setCart(cart.filter(item => (item.variantId ? `${item.productId}-${item.variantId}` : item.productId) !== key));
  };

  const updateQty = (key, newQty) => {
    if (newQty < 1) return;
    setCart(cart.map(item => {
      const itemKey = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
      if (itemKey === key) {
        if (newQty > item.maxQty) {
          toast.error('الكمية المطلوبة تتجاوز المخزون المتاح');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleQuickAddCustomer = async () => {
    if (!custForm.name || !custForm.phone) return toast.error('الاسم والهاتف مطلوبان');
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

  const [returnInvoiceSearch, setReturnInvoiceSearch] = useState('');
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnCreating, setReturnCreating] = useState(false);

  const searchRef = useRef(null);

  const [syncStatus, setSyncStatus] = useState('online');
  const pendingInvoicesCount = useLiveQuery(() => db.pendingInvoices.count(), []);
  const syncPendingInvoices = async () => {
    if (!navigator.onLine) return;
    try {
      setSyncStatus('syncing');
      const pending = await db.pendingInvoices.toArray();
      if (pending.length === 0) { setSyncStatus('online'); return; }
      let count = 0;
      for (const inv of pending) {
        try {
          const { id, createdAt, status, totalAmount, ...apiPayload } = inv;
          await invoicesApi.create(apiPayload);
          await db.pendingInvoices.delete(inv.id);
          count++;
        } catch (err) { console.error(err); }
      }
      if (count > 0) {
        toast.success(`تمت مزامنة ${count} فاتورة ☁️`);
        productsApi.getAll({ limit: 200 }).then(r => setProducts(r.data.data || []));
      }
    } catch (e) { console.error(e); } finally { setSyncStatus('online'); }
  };

  useEffect(() => {
    const hOn = () => { setSyncStatus('online'); syncPendingInvoices(); };
    const hOff = () => setSyncStatus('offline');
    window.addEventListener('online', hOn); window.addEventListener('offline', hOff);
    setSyncStatus(navigator.onLine ? 'online' : 'offline');
    const interval = setInterval(() => { if (navigator.onLine) syncPendingInvoices(); }, 60000);
    return () => { window.removeEventListener('online', hOn); window.removeEventListener('offline', hOff); clearInterval(interval); };
  }, []);

  useEffect(() => {
    setLoading(true);
    if (navigator.onLine) {
      Promise.all([
        productsApi.getAll({ limit: 500 }),
        customersApi.getAll({ limit: 500 }),
        categoriesApi.getTree().catch(() => ({ data: { data: [] } })),
        api.get('/auth/me')
      ]).then(([p, c, cat, me]) => {
        const pr = p.data.data || []; const cu = c.data.data || []; const ca = cat?.data?.data || [];
        const cams = me?.data?.data?.tenant?.cameras || [];
        setProducts(pr); setCustomers(cu); setCameras(cams);
        setCategories(ca.length > 0 ? ca : buildCategoryTreeFromProducts(pr));
        syncProductsToLocal(pr); syncCustomersToLocal(cu);
      }).catch(() => toast.error('تعذر تحميل البيانات. حاول مرة أخرى.'))
        .finally(() => setLoading(false));
    } else {
      Promise.all([db.products.limit(200).toArray(), db.customers.limit(200).toArray()]).then(([p, c]) => {
        setProducts(p); setCustomers(c); setCategories(buildCategoryTreeFromProducts(p));
      }).finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => { if (!navigator.onLine) searchLocalProducts(search).then(setProducts); }, [search]);
  useEffect(() => { if (!navigator.onLine) searchLocalCustomers(custSearch).then(setCustomers); }, [custSearch]);
  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { setProductPage(0); }, [search, selectedCategoryId, selectedSubcategoryId]);
  useEffect(() => { setCustPage(0); }, [custSearch]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F5' && mode === 'sale') { e.preventDefault(); handleComplete(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, selectedCustomer, mode]);

  useUnsavedWarning(cart.length > 0, 'quick-sale');

  const addToCart = (p, v = null) => {
    if (p.variants?.length > 0 && !v) { setVariantPicker({ open: true, product: p }); return; }
    const target = v || p;
    const stock = getAvailableStock(target);
    if (stock <= 0) return toast.error('نفد من المخزون');
    const exists = cart.find(c => v ? c.variantId === v._id : c.productId === p._id);
    if (exists) {
      if (exists.quantity >= stock) return toast.error('الكمية غير متوفرة');
      setCart(cart.map(c => (v ? c.variantId === v._id : c.productId === p._id) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        productId: p._id, variantId: v?._id,
        name: v ? `${p.name} (${Object.values(v.attributes || {}).join(' - ')})` : p.name,
        price: v?.price || p.price, cost: p.cost || 0, quantity: 1, maxQty: stock,
        sku: v?.sku || p.sku || '', barcode: v?.barcode || p.barcode || ''
      }]);
    }
    setSearch(''); setVariantPicker({ open: false, product: null }); searchRef.current?.focus();
  };

  const handleBarcodeScan = async (val) => {
    const bc = val?.value || val;
    try {
      const res = await productsApi.getByBarcode(bc);
      const p = res.data.data; const v = findMatchedVariant(p, bc);
      toast.success(`📦 ${p.name} | ${fmt(v?.price || p.price)} ج.م`);
      addToCart(p, v);
    } catch (e) { toast.error('المنتج غير موجود'); }
  };
  useBarcodeScanner((p) => { if (mode === 'sale') handleBarcodeScan(p); }, mode === 'sale');

  const handleComplete = async () => {
    if (!selectedCustomer) return toast.error('اختر العميل');
    if (selectedCustomer.salesBlocked) return toast.error(`ممنوع: ${selectedCustomer.salesBlockedReason}`);
    if (cart.length === 0) return toast.error('السلة فارغة');
    setCreating(true);
    const { user } = useAuthStore.getState();
    const payload = {
      customerId: selectedCustomer._id,
      items: cart.map(c => ({ productId: c.productId, variantId: c.variantId, quantity: c.quantity })),
      paymentMethod: payments[0]?.method || 'cash',
      numberOfInstallments: payments.some(p => p.method === 'installment') ? installments : undefined,
      branchId: user?.branch, totalAmount: total,
      payments: payments.map(p => ({ method: p.method, amount: p.amount || total }))
    };
    try {
      if (navigator.onLine) await invoicesApi.create(payload);
      else await savePendingInvoice(payload);
      toast.success('تمت العملية بنجاح!'); finishSale();
    } catch (e) { toast.error(e.response?.data?.message || 'فشل حفظ العملية'); } finally { setCreating(false); }
  };

  const finishSale = () => {
    setCarts(prev => prev.map(c => c.id === activeCartId
      ? { ...c, items: [], customer: null, payments: [{ method: 'cash', amount: 0 }], title: `العميل ${prev.findIndex(x => x.id === activeCartId) + 1}` }
      : c
    ));
    if (carts.length <= 1) {
      try { localStorage.removeItem(CART_STORAGE_KEY); localStorage.removeItem(ACTIVE_CART_STORAGE_KEY); } catch (e) { /* ignore */ }
    }
    if (navigator.onLine) productsApi.getAll({ limit: 200 }).then(r => setProducts(r.data.data || []));
  };

  const selectedCategory = useMemo(() => findCategoryById(categories, selectedCategoryId), [categories, selectedCategoryId]);
  const selectedSubcategory = useMemo(() => findCategoryById(categories, selectedSubcategoryId), [categories, selectedSubcategoryId]);
  
  const allFilteredProducts = useMemo(() => products.filter(p => {
    if (p.isSuspended || p.isActive === false || p.status === 'pending') return false;
    const mS = !search || p.name.includes(search) || (p.sku || '').toLowerCase().includes(search.toLowerCase()) || getBarcodeSearchText(p).toLowerCase().includes(search.toLowerCase());
    const mC = matchesCategorySelection(p, selectedCategory, selectedSubcategory);
    return mS && mC;
  }), [products, search, selectedCategory, selectedSubcategory]);

  const filteredProducts = allFilteredProducts.slice(productPage * PRODUCTS_PER_PAGE, (productPage + 1) * PRODUCTS_PER_PAGE);
  const totalProductPages = Math.ceil(allFilteredProducts.length / PRODUCTS_PER_PAGE);

  const allFilteredCustomers = useMemo(() => customers.filter(c => c.name.includes(custSearch) || c.phone.includes(custSearch)), [customers, custSearch]);
  const pagedCustomers = allFilteredCustomers.slice(custPage * CUSTOMERS_PER_PAGE, (custPage + 1) * CUSTOMERS_PER_PAGE);
  const totalCustomerPages = Math.ceil(allFilteredCustomers.length / CUSTOMERS_PER_PAGE);

  const handleSearchInvoice = async () => {
    if (!returnInvoiceSearch) return; setReturnLoading(true);
    try {
      const res = await invoicesApi.getAll({ search: returnInvoiceSearch, limit: 1 });
      const inv = res.data.data?.[0]; if (!inv) return toast.error('لم يتم العثور');
      setReturnInvoice(inv); setReturnItems((inv.items || []).map(it => ({ ...it, returnQty: 0 })));
    } catch { toast.error('خطأ'); } finally { setReturnLoading(false); }
  };

  const handleReturn = async () => {
    const items = returnItems.filter(i => i.returnQty > 0);
    if (items.length === 0 || !returnReason) return toast.error('البيانات ناقصة');
    setReturnCreating(true);
    try {
      await api.post('/returns', { invoiceId: returnInvoice._id, items: items.map(i => ({ productId: i.product?._id || i.productId, quantity: i.returnQty })), reason: returnReason });
      toast.success('تم المرتجع'); setReturnInvoice(null);
    } catch { toast.error('فش'); } finally { setReturnCreating(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const catIcon = (n) => n?.includes('آيفون') ? '📱' : n?.includes('شاشة') ? '🖥️' : '📦';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="app-shell-bg app-text-soft relative flex min-h-[calc(100vh-100px)] flex-col gap-3 overflow-hidden rounded-[1.75rem] p-2 text-right animate-fade-in font-cairo sm:gap-4 sm:rounded-[2rem] sm:p-3 xl:h-[calc(100vh-100px)]" dir="rtl">
      {/* Background Dotted Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none dark:opacity-20 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      
      {/* HEADER SECTION: Cart Tabs, Mode Switch, Sync */}
      <div className="relative z-10 flex flex-col gap-3 border-b border-gray-200 p-2 pb-3 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        {/* RIGHT: Carts Tabs */}
        <div className="flex w-full items-center gap-1.5 py-1 xl:max-w-[30%]">
          <button onClick={() => cartsRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="app-surface rounded-full p-1.5 text-gray-400 shadow-sm transition-colors hover:text-primary-500 shrink-0"><ChevronRight className="w-4 h-4"/></button>
          
          <div ref={cartsRef} className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {carts.map(c => (
              <div key={c.id} className="relative group shrink-0">
                <button
                  onClick={() => setActiveCartId(c.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm transition-all whitespace-nowrap border ${activeCartId === c.id
                    ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/25 z-10'
                    : 'app-surface text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:border-primary-500'}`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {c.title || 'سلة جديدة'}
                </button>
                {carts.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeCart(c.id); }} className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-1 shadow-sm">
                    <X className="w-2 h-2" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addNewCart} className="app-surface rounded-full border-dashed p-2 text-gray-400 transition-colors hover:text-primary-500 shrink-0">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button onClick={() => cartsRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="app-surface rounded-full p-1.5 text-gray-400 shadow-sm transition-colors hover:text-primary-500 shrink-0"><ChevronLeft className="w-4 h-4"/></button>
        </div>
        {/* MIDDLE: Search Bar */}
        {mode === 'sale' ? (
          <div className="flex w-full items-center gap-2 xl:max-w-2xl xl:flex-1 xl:mx-auto">
             <div className="relative flex-1">
               <input
                 ref={searchRef}
                 value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الباركود (F2)..."
                 className="app-surface w-full rounded-2xl border-2 py-3 pl-4 pr-4 text-sm font-bold text-gray-900 shadow-sm transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:text-white font-cairo"
               />

               <div className="absolute left-2 top-1/2 -translate-y-1/2">
                 <button onClick={() => searchRef.current?.focus()} className="px-4 py-1.5 bg-primary-500 text-white rounded-xl text-xs font-bold hover:bg-primary-600 transition-colors shadow-md flex items-center gap-1.5 focus:outline-none">
                    <Search className="w-3.5 h-3.5" /> بحث
                 </button>
                </div>
              </div>
              <button onClick={() => setShowScanner(true)} className="app-surface rounded-2xl border-2 p-3 text-primary-500 shadow-sm transition-all hover:border-primary-500 hover:bg-primary-500 hover:text-white focus:outline-none" title="مسح باركود">
                <Scan className="w-6 h-6" />
              </button>
           </div>
         ) : <div className="flex-1" />}

        {/* LEFT: Mode Switch & Sync Status */}
        <div className="flex w-full flex-wrap items-center justify-between gap-3 xl:w-auto xl:flex-nowrap xl:justify-start xl:gap-4 xl:shrink-0">
          <div className="app-surface flex flex-1 rounded-full p-1 shadow-sm xl:flex-none">
            <button onClick={() => setMode('sale')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${mode === 'sale' ? 'bg-primary-500 shadow-md text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
              <Zap className="w-4 h-4" /> بيع مباشر
            </button>
            <button onClick={() => setMode('return')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${mode === 'return' ? 'bg-red-500 shadow-md text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
              <RotateCcw className="w-4 h-4" /> مرتجع
            </button>
          </div>
          <Badge variant={syncStatus === 'online' ? 'success' : 'danger'} className="text-[10px] py-1.5 px-3">
              {syncStatus === 'online' ? 'متصل' : 'غير متصل'}
           </Badge>

           {cameras.length > 0 && (
             <button
               onClick={() => setShowMonitor(!showMonitor)}
               className={`flex items-center gap-2 p-2.5 rounded-2xl transition-all shadow-sm border-2 ${showMonitor ? 'bg-primary-500 border-primary-500 text-white animate-pulse shadow-primary-500/20' : 'app-surface border-gray-100 dark:border-gray-800 text-primary-500'}`}
               title="المراقبة الحية"
             >
               <Camera className={`w-5 h-5 ${showMonitor ? 'fill-current' : ''}`} />
             </button>
           )}
        </div>
      </div>

      {/* SHIFT NEARLY OVER WARNING */}
      {activeShift && activeShift.autoCloseAt && timeLeft && timeLeft !== 'مغلق' && (
        <AnimatePresence>
          {(() => {
            const ms = new Date(activeShift.autoCloseAt).getTime() - Date.now();
            const mins = ms / 60000;
            if (mins > 60) return null;
            
            return (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`z-30 px-4 py-2 flex items-center justify-between border-b ${mins < 10 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}
              >
                <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${mins < 5 ? 'animate-pulse' : ''}`} />
                    <span className="text-sm font-black">
                        {mins < 10 ? 'تنبيه: سيتم إغلاق الوردية تلقائيا خلال دقائق قليلة' : 'تنبيه: اقترب موعد الإغلاق التلقائي للوردية'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full text-lg font-black tracking-widest" dir="ltr">
                        {timeLeft}
                    </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      )}

      {/* SHIFT OVERLAY */}
      {!shiftLoading && !activeShift && mode === 'sale' && (
        <div className="absolute inset-x-0 bottom-0 top-[80px] z-40 bg-white/70 dark:bg-[#0B1120]/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-b-2xl">
          <div className="app-surface mx-auto w-full max-w-sm rounded-3xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-none">
            <div className="w-16 h-16 bg-[#5C67E6]/10 dark:bg-[#5C67E6]/20 text-[#5C67E6] rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <Store className="w-8 h-8 -rotate-3" />
            </div>
            
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">تسجيل فتح وردية</h2>
            <p className="text-[11px] text-gray-500 mb-6 leading-relaxed px-4">يرجى إدخال الرصيد الافتتاحي الموجود في الدرج قبل بدء المبيعات.</p>
            
            <div className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 pr-1">الرصيد الافتتاحي بالدرج</label>
                <div className="relative">
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="app-surface-muted w-full rounded-xl px-4 py-3 text-lg font-black text-gray-900 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:text-white"
                    dir="ltr"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none select-none">ج.&</div>
                </div>
              </div>
              
              <button
                onClick={async () => {
                  if (openingBalance === '') return toast.error('يرجى إدخال الرصيد الافتتاحي أولا');
                  setOpeningShift(true);
                  try {
                    await openShift(Number(openingBalance));
                    toast.success('تم فتح الوردية بنجاح. يمكنك الآن بدء البيع.');
                  } catch (err) {
                  } finally {
                    setOpeningShift(false);
                  }
                }}
                disabled={openingShift}
                className="w-full flex justify-center items-center gap-2 bg-[#5C67E6] hover:bg-[#4C55D6] text-white py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {openingShift ? <LoadingSpinner size="sm" /> : <Play className="w-5 h-5 fill-current" />}
                فتح الوردية الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'sale' ? (
        <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-hidden pb-2 xl:flex-row">
          {/* MAIN COLUMN */}
          <div className="order-2 flex min-w-0 flex-1 flex-col gap-4 overflow-hidden xl:order-1 xl:flex-[3]">
            
            {/* Categories */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 w-full">
                <button onClick={() => categoriesRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="app-surface rounded-full p-2 text-gray-400 shadow-sm transition-colors hover:text-primary-500 shrink-0"><ChevronRight className="w-4 h-4"/></button>
                
                <div ref={categoriesRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-1 scroll-smooth">
                  <button
                    onClick={() => { setSelectedCategoryId(''); setSelectedSubcategoryId(''); }}
                    className={`px-5 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border ${!selectedCategoryId ? 'bg-primary-500 text-white border-primary-500 shadow-md' : 'app-surface text-gray-500 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:border-primary-500'}`}
                  >
                    اْ
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => { setSelectedCategoryId(cat._id); setSelectedSubcategoryId(''); }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border ${selectedCategoryId === cat._id ? 'bg-primary-500 text-white border-primary-500 shadow-xl scale-105 z-10' : 'app-surface text-gray-500 dark:text-white/60 hover:text-gray-800 dark:hover:text-white hover:border-primary-500'}`}
                    >
                      {cat.icon?.match(/^https?:\/\//) || cat.icon?.startsWith('/') ? (
                        <img src={cat.icon} alt={cat.name} className={`w-4 h-4 object-contain ${selectedCategoryId === cat._id ? 'brightness-200 dark:invert' : 'brightness-0 dark:invert opacity-70'}`} />
                      ) : (
                        <span className={`text-sm ${selectedCategoryId !== cat._id ? 'grayscale opacity-70' : ''}`}>{cat.icon || 'x'}</span>
                      )}
                      {cat.name}
                    </button>
                  ))}
                </div>
                
                <button onClick={() => categoriesRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="app-surface rounded-full p-2 text-gray-400 shadow-sm transition-colors hover:text-primary-500 shrink-0"><ChevronLeft className="w-4 h-4"/></button>
              </div>

              <AnimatePresence>
                {selectedCategory && selectedCategory.children?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button
                      onClick={() => setSelectedSubcategoryId('')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${!selectedSubcategoryId ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30' : 'app-surface-muted text-gray-500 dark:text-white/60'}`}
                    >
                      اْ
                    </button>
                    {selectedCategory.children.map(sub => (
                      <button
                        key={sub._id}
                        onClick={() => setSelectedSubcategoryId(sub._id)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${selectedSubcategoryId === sub._id ? 'bg-primary-500 text-white' : 'app-surface-muted text-gray-500 dark:text-white/60'}`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {filteredProducts.map(p => {
                  const hasVar = p.variants?.length > 0;
                  const stock = getAvailableStock(p);
                  return (
                    <motion.button
                      key={p._id} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                      onClick={() => addToCart(p)}
                      disabled={stock <= 0 && !hasVar}
                      className="app-surface group relative flex h-48 flex-col overflow-hidden rounded-[1.5rem] text-right shadow-sm transition-colors hover:border-primary-500 dark:hover:border-primary-500"
                    >
                      <div className="app-surface-muted relative flex h-28 w-full items-center justify-center border-b">
                        {p.thumbnail || p.images?.[0] ? (
                          <img src={p.thumbnail || p.images[0]} alt={p.name} className="w-full h-full object-cover opacity-90 dark:opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : null}
                        <span className={`text-4xl opacity-50 ${p.thumbnail || p.images?.[0] ? 'hidden' : ''}`}>{catIcon(p.name)}</span>
                        
                        {stock <= 5 && stock > 0 && <span className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-md">متبقي {stock}</span>}
                        {stock <= 0 && !hasVar && <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-[2px] flex items-center justify-center font-black text-red-500 dark:text-red-400 text-sm">نفدت الكمية</div>}
                        {hasVar && <span className="absolute bottom-2 right-2 bg-primary-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-sm">خيارات متاحة</span>}
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <h3 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1 leading-tight mb-1">{p.name}</h3>
                          <p className="text-[9px] text-gray-500 dark:text-white/50 font-bold tracking-wider">{p.sku || p.barcode || ''}</p>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <span className="text-primary-500 font-black text-sm">{fmt(p.price)} <span className="text-[8px] text-gray-400 dark:text-white/40">ج.&</span></span>
                          <div className="app-surface-muted flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors group-hover:bg-primary-500 group-hover:text-white dark:text-white/60">
                             <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {totalProductPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pb-2">
                  <button
                    disabled={productPage === 0}
                    onClick={() => setProductPage(p => p - 1)}
                    className="app-surface rounded-xl p-2.5 text-[#5C67E6] shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-30"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <span className="text-xs font-black text-gray-500 dark:text-white/60">صفحة {fmt(productPage + 1)} من {fmt(totalProductPages)}</span>
                  <button
                    disabled={productPage >= totalProductPages - 1}
                    onClick={() => setProductPage(p => p + 1)}
                    className="app-surface rounded-xl p-2.5 text-[#5C67E6] shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* CART COLUMN */}
          <div className="app-surface order-1 flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] shadow-xl xl:order-2 xl:min-w-[320px] xl:max-w-[380px] xl:flex-1 xl:rounded-[2rem]">
             {/* Customer Picker */}
             <div className="app-surface-muted border-b p-4">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-xs font-black flex items-center gap-2 text-gray-600 dark:text-gray-300">
                     <UserPlus className="w-4 h-4 text-primary-500" /> العميل
                   </h4>
                </div>
                <div className="relative">
                   <input
                     value={custSearch} onChange={(e) => setCustSearch(e.target.value)}
                     placeholder="رقم الهاتف أو الاسم..."
                     className="app-surface w-full rounded-xl border-2 py-2 pr-10 pl-4 text-xs font-bold text-gray-900 shadow-sm focus:border-primary-500 dark:text-white font-cairo"
                   />
                   <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                   <AnimatePresence>
                    {custSearch && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="app-surface absolute right-0 left-0 top-full z-50 mt-2 overflow-hidden rounded-xl p-1 shadow-2xl">
                               {pagedCustomers.map(c => (
                                 <button key={c._id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }} className="w-full flex items-center justify-between rounded-xl p-3 transition-all hover:bg-slate-50 dark:hover:bg-gray-700">
                                    <div className="text-right">
                                      <p className="text-xs font-black text-gray-900 dark:text-white">{c.name}</p>
                                      <p className="text-[10px] text-gray-500 dark:text-white/50 font-mono">{c.phone}</p>
                                    </div>
                                    {selectedCustomer?._id === c._id && <Check className="w-4 h-4 text-primary-500" />}
                                 </button>
                               ))}
                               {totalCustomerPages > 1 && (
                                 <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1 dark:border-gray-700">
                                   <button disabled={custPage === 0} onClick={() => setCustPage(p => p - 1)} className="p-1 disabled:opacity-30 text-primary-500"><ChevronRight className="w-4 h-4"/></button>
                                   <span className="text-[10px] font-bold text-gray-400 dark:text-white/50">{fmt(custPage + 1)} / {fmt(totalCustomerPages)}</span>
                                   <button disabled={custPage >= totalCustomerPages - 1} onClick={() => setCustPage(p => p + 1)} className="p-1 disabled:opacity-30 text-primary-500"><ChevronLeft className="w-4 h-4"/></button>
                                 </div>
                               )}
                               {allFilteredCustomers.length === 0 && (
                                 <button onClick={() => {
                                   const isPhone = /^\d+$/.test(custSearch);
                                   setCustForm({ name: isPhone ? '' : custSearch, phone: isPhone ? custSearch : '', password: 'customer123' });
                                   setShowAddCustModal(true); setCustSearch('');
                                 }} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-t border-gray-100 p-3 text-xs font-bold text-primary-500 transition-all hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-primary-500/10">
                                   <UserPlus className="w-4 h-4" /> إضافة عميل جديد
                                 </button>
                               )}
                      </motion.div>
                    )}
                   </AnimatePresence>
                </div>
                {selectedCustomer && (
                  <div className="app-surface mt-3 flex flex-col gap-2 rounded-xl p-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-black shadow-inner overflow-hidden">
                         <span className="drop-shadow-sm">{selectedCustomer.name[0]}</span>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs font-black text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold">{selectedCustomer.phone}</p>
                      </div>
                      <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
             </div>

             {/* Cart Items */}
             <div className="max-h-[45vh] flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 xl:max-h-none">
               {cart.length === 0 ? (
                 <div className="flex h-full flex-col items-center justify-center opacity-30">
                    <div className="app-surface-muted mb-4 flex h-20 w-20 items-center justify-center rounded-3xl">
                      <ShoppingCart className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-black text-gray-400">السلة فارغة</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                    {cart.map(item => {
                      const key = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                      return (
                        <motion.div layout key={key} className="app-surface-muted group relative flex items-center gap-3 rounded-2xl p-3 shadow-sm border border-transparent transition-all hover:border-primary-500/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-gray-900 dark:text-white line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-primary-500 font-black mt-0.5">{fmt(item.price)} ج.&</p>
                          </div>
                          <div className="flex items-center gap-1.5 app-surface rounded-xl p-1 shadow-sm border dark:border-gray-700">
                             <button onClick={() => updateQty(key, item.quantity - 1)} className="p-1 hover:text-red-500 transition-colors"><Minus className="w-3.5 h-3.5"/></button>
                             <span className="min-w-[24px] text-center text-xs font-black">{fmt(item.quantity)}</span>
                             <button onClick={() => updateQty(key, item.quantity + 1)} className="p-1 hover:text-primary-500 transition-colors"><Plus className="w-3.5 h-3.5"/></button>
                          </div>
                          <button onClick={() => removeFromCart(key)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4"/></button>
                        </motion.div>
                      );
                    })}
                 </div>
               )}
             </div>

             {/* Payment Footer */}
              <div className="app-surface-muted border-t p-4 space-y-4 sm:p-5">
                <div className="flex items-center justify-between px-1">
                   <span className="text-xs font-black text-gray-500 dark:text-gray-400">الإجمالي</span>
                   <span className="text-xl font-black text-primary-500">{fmt(total)} ج.&</span>
                </div>
                
                <div className="flex flex-col gap-2">
                   <div className="flex gap-2">
                     <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border-2 ${payments[0]?.method === 'cash' ? 'bg-primary-500 border-primary-500 text-white shadow-lg' : 'app-surface border-gray-100 dark:border-gray-700 text-gray-500'}`}>
                        <Banknote className="w-4 h-4"/> نقدا
                     </button>
                     <button onClick={() => setPaymentMethod('visa')} className={`flex-1 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border-2 ${payments[0]?.method === 'visa' ? 'bg-[#5C67E6] border-[#5C67E6] text-white shadow-lg' : 'app-surface border-gray-100 dark:border-gray-700 text-gray-500'}`}>
                        <CreditCard className="w-4 h-4"/> بطاقة
                     </button>
                   </div>
                   <button onClick={() => setPaymentMethod('installment')} className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border-2 ${payments[0]?.method === 'installment' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'app-surface border-gray-100 dark:border-gray-700 text-gray-500'}`}>
                      <Calendar className="w-4 h-4"/> تقسيط
                   </button>
                </div>

                <button
                  disabled={creating || cart.length === 0}
                  onClick={handleComplete}
                  className="w-full bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                  {creating ? <LoadingSpinner size="sm" /> : <Check className="w-5 h-5" />}
                  إتمام العملية (F5)
                </button>
             </div>
          </div>
        </div>
      ) : (
        /* RETURN MODE LAYOUT */
         <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-hidden p-2 sm:p-4">
           {/* Return search and details (omitted for brevity in part2, but including fixed version back) */}
           <div className="app-surface rounded-2xl p-6 max-w-2xl mx-auto w-full shadow-lg">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-500" /> نموذج المرتجعات
              </h2>
              <div className="flex gap-2 mb-6">
                <input
                  value={returnInvoiceSearch} onChange={(e) => setReturnInvoiceSearch(e.target.value)}
                  placeholder="رقم الفاتورة..."
                  className="app-surface flex-1 rounded-xl border-2 px-4 py-2.5 font-bold"
                />
                <button onClick={handleSearchInvoice} className="bg-primary-500 text-white px-6 rounded-xl font-bold">بحث</button>
              </div>
           </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {variantPicker.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVariantPicker({ open: false, product: null })} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="app-surface relative w-full max-w-lg overflow-hidden rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">اختر ا ع</h3>
                  <button onClick={() => setVariantPicker({ open: false, product: null })} className="app-surface-muted rounded-full p-2 text-gray-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-col gap-3">
                  {variantPicker.product?.variants.map(v => (
                    <button key={v._id} onClick={() => addToCart(variantPicker.product, v)} className="app-surface group flex items-center justify-between rounded-xl p-4 shadow-sm transition-all hover:border-[#5C67E6]">
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900 dark:text-white group-hover:text-[#5C67E6] transition-colors">{Object.values(v.attributes || {}).join(" / ")}</p>
                        <p className="text-[10px] text-gray-500 mt-1">SKU: {v.sku}</p>
                      </div>
                      <span className="font-black text-[#5C67E6]">{fmt(v.price || variantPicker.product.price)} ج.&</span>
                    </button>
                  ))}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showScanner ? (
        <BarcodeScanner onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />
      ) : null}

      {/* Floating Camera Monitor */}
      <AnimatePresence>
        {showMonitor && cameras.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-[80] w-72 overflow-hidden rounded-3xl bg-black shadow-2xl ring-4 ring-white/10 dark:ring-slate-900/50"
          >
            <div className="group relative aspect-video bg-black">
              {cameras[activeCamIdx].type === 'embed' ? (
                <iframe
                  src={cameras[activeCamIdx].url}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <LazyStreamPlayer
                  url={cameras[activeCamIdx].url}
                  type={cameras[activeCamIdx].type === 'mjpeg' ? 'mjpeg' : 'auto'}
                  width="100%"
                  height="100%"
                  playing={true}
                  controls={false}
                  volume={0}
                />
              )}

              {/* Monitor Controls Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-b from-black/60 via-transparent to-black/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{cameras[activeCamIdx].name}</span>
                  </div>
                  <button onClick={() => setShowMonitor(false)} className="rounded-full bg-white/10 p-1 text-white hover:bg-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {cameras.length > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setActiveCamIdx((activeCamIdx - 1 + cameras.length) % cameras.length)}
                      className="rounded-full bg-white/20 p-1.5 text-white hover:bg-primary-500 transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-bold text-white/80">{activeCamIdx + 1} / {cameras.length}</span>
                    <button
                      onClick={() => setActiveCamIdx((activeCamIdx + 1) % cameras.length)}
                      className="rounded-full bg-white/20 p-1.5 text-white hover:bg-primary-500 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
