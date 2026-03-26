import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Send, Calculator, Check, X, CreditCard, Filter, Link as LinkIcon, Copy, ExternalLink, Printer, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { api, invoicesApi, customersApi, productsApi, settingsApi, useAuthStore } from '../store';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState, OwnerTableSkeleton } from '../components/UI';
import Pagination from '../components/Pagination';
import { printDeliveryTicket, printReceiptDocument } from '../utils/invoicePrint';
import { useTranslation } from 'react-i18next';

const PAYMENT_GATEWAY_LABELS = {
  paymob: '💳 بطاقة بنكية (Paymob)',
  fawry: '🏪 فوري (Fawry)',
  instapay: '📱 إنستا باي (InstaPay)',
  vodafone: '🔴 فودافون كاش',
};

export default function InvoicesPage() {
  const { t } = useTranslation('admin');
  const FILTERS_STORAGE_KEY = 'owner_invoices_filters_v1';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(customerSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [customerSearch]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Payment Link States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInvoice, setLinkInvoice] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkGateway, setLinkGateway] = useState('paymob');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkGatewaysLoading, setLinkGatewaysLoading] = useState(false);
  const [availableLinkGateways, setAvailableLinkGateways] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cart, setCart] = useState([]);
  const [installments, setInstallments] = useState(3);
  const [frequency, setFrequency] = useState('monthly');
  const [downPayment, setDownPayment] = useState('');
  const LIMIT = 8;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStatusFilter(parsed.statusFilter || '');
        setBranchFilter(parsed.branchFilter || '');
        setCustomerSearch(parsed.customerSearch || '');
      }
    } catch (_) { }

    // Load branches from store
    useAuthStore.getState().getBranches()
      .then((result) => {
        const normalizedBranches = Array.isArray(result)
          ? result
          : Array.isArray(result?.branches)
            ? result.branches
            : Array.isArray(result?.data)
              ? result.data
              : [];
        setBranches(normalizedBranches);
      })
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      statusFilter,
      branchFilter,
      customerSearch,
    }));
  }, [statusFilter, branchFilter, customerSearch]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: '-createdAt' };
      if (statusFilter) params.status = statusFilter;
      if (branchFilter) params.branch = branchFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await invoicesApi.getAll(params);
      const data = res.data.data;
      // Ensure invoices is always an array
      setInvoices(Array.isArray(data) ? data : (data?.invoices || []));
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error(t('invoices_page.toasts.k17dowz')); }
    finally { setLoading(false); }
  }, [page, statusFilter, branchFilter, debouncedSearch]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { setPage(1); }, [statusFilter, branchFilter, debouncedSearch]);

  const resetFilters = () => {
    setStatusFilter('');
    setBranchFilter('');
    setCustomerSearch('');
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  };

  const openCreate = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 }),
      ]);
      setCustomers(custRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setCart([]); setSelectedCustomer(''); setPaymentMethod('cash'); setDownPayment(''); setProductSearch('');
      setShowCreate(true);
    } catch { toast.error(t('invoices_page.toasts.kalmpu2')); }
  };

  const addToCart = (product) => {
    const exists = cart.find((c) => c.productId === product._id);
    if (exists) setCart(cart.map((c) => c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c));
    else setCart([...cart, { productId: product._id, name: product.name, price: product.price, quantity: 1 }]);
  };
  const removeFromCart = (id) => setCart(cart.filter((c) => c.productId !== id));
  const updateQty = (id, qty) => setCart(cart.map((c) => c.productId === id ? { ...c, quantity: Math.max(1, qty) } : c));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const remaining = cartTotal - (Number(downPayment) || 0);
  const monthlyAmount = installments > 0 ? Math.ceil(remaining / installments) : 0;

  useUnsavedWarning(showCreate && cart.length > 0, 'invoices');

  const handleCreate = async () => {
    if (!selectedCustomer) return toast.error(t('invoices_page.toasts.kfe7g7p'));
    if (cart.length === 0) return toast.error(t('invoices_page.toasts.kqsk144'));
    setCreating(true);
    try {
      await invoicesApi.create({
        customerId: selectedCustomer,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod,
        numberOfInstallments: paymentMethod === 'installment' ? installments : undefined,
        frequency: paymentMethod === 'installment' ? frequency : undefined,
        downPayment: paymentMethod === 'installment' ? Number(downPayment) || 0 : undefined,
        sendWhatsApp: false, // Don't block on WhatsApp
      });
      toast.success(t('invoices_page.toasts.k3dljjs'));
      setShowCreate(false);
      loadInvoices();
    } catch (err) { toast.error(err.response?.data?.message || t('invoices_page.toasts.kqnzu9v')); }
    finally { setCreating(false); }
  };

  const openPay = (inv) => { setPayInvoice(inv); setPayAmount(''); setShowPayModal(true); };

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error(t('invoices_page.toasts.k6uy7s4'));
    try {
      await invoicesApi.pay(payInvoice._id, { amount: Number(payAmount) });
      toast.success(t('invoices_page.toasts.kjohmc'));
      setShowPayModal(false); loadInvoices();
    } catch (err) { toast.error(err.response?.data?.message || t('invoices_page.toasts.kxoca')); }
  };

  const handlePayAll = async (inv) => {
    const amount = (inv.remainingAmount || 0).toLocaleString('ar-EG');

    notify.custom({
      type: 'warning',
      title: t('invoices_page.ui.kbw6nzm'),
      message: `هل تريد تأكيد سداد ${amount} ج.م كاملة؟`,
      duration: 10000, // 10 ثواني
      action: {
        label: t('invoices_page.ui.k5h5smq'),
        onClick: async () => {
          try {
            await invoicesApi.payAll(inv._id);
            notify.success(t('invoices_page.ui.k85hfze'), t('invoices_page.ui.kn97dui'));
            loadInvoices();
          } catch (err) {
            notify.error(err.response?.data?.message || t('invoices_page.toasts.kdso0y8'), t('invoices_page.ui.kxoca'));
          }
        },
      },
    });
  };

  const handleGenerateLink = async () => {
    if (!linkInvoice) return;
    if (linkGatewaysLoading) return;
    if (!linkGateway || availableLinkGateways.length === 0) return toast.error(t('invoices_page.toasts.kq2ddzp'));
    if (!availableLinkGateways.some((gateway) => gateway.id === linkGateway)) {
      return toast.error(t('invoices_page.toasts.km54baw'));
    }
    setLinkLoading(true);
    setGeneratedLink('');
    try {
      const res = await invoicesApi.generatePaymentLink(linkInvoice._id, linkGateway);
      const payload = res.data?.data || {};
      const paymentLink = payload.paymentUrl || payload.paymentLink;
      if (!paymentLink) {
        throw new Error('PAYMENT_LINK_MISSING');
      }
      setGeneratedLink(paymentLink);
      toast.success(t('invoices_page.toasts.ksdjrji'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('invoices_page.toasts.kp53xve'));
    } finally {
      setLinkLoading(false);
    }
  };

  const openLinkModal = async (inv) => {
    setLinkInvoice(inv);
    setGeneratedLink('');
    setShowLinkModal(true);
    setLinkGatewaysLoading(true);

    try {
      const res = await api.get('/payments/gateways');
      const gateways = Array.isArray(res.data?.data)
        ? res.data.data.map((gateway) => ({
            ...gateway,
            displayLabel: PAYMENT_GATEWAY_LABELS[gateway.id] || gateway.name,
          }))
        : [];
      setAvailableLinkGateways(gateways);
      setLinkGateway((currentGateway) => {
        if (gateways.some((gateway) => gateway.id === currentGateway)) {
          return currentGateway;
        }
        return gateways[0]?.id || '';
      });
    } catch (err) {
      setAvailableLinkGateways([]);
      setLinkGateway('');
      toast.error(t('invoices_page.toasts.kucpn9e'));
    } finally {
      setLinkGatewaysLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success(t('invoices_page.toasts.kxqo5gi'));
  };

  const handleSendWhatsApp = async (inv) => {
    const tid = toast.loading(t('invoices_page.ui.ktnxbjh'));
    try {
      const res = await invoicesApi.sendWhatsApp(inv._id);
      if (res.data.data?.whatsappStatus === 'failed' || res.data.data?.whatsappStatus === 'error') {
        toast.error(res.data.message, { id: tid });
      } else {
        toast.success(t('invoices_page.ui.kxpwd8n'), { id: tid });
      }
    } catch { toast.error(t('invoices_page.ui.k1po208'), { id: tid }); }
  };

  const handleCreateWaybill = async (inv) => {
    const tid = toast.loading(t('invoices_page.ui.ka6ofdz'));
    try {
      const res = await invoicesApi.createBostaWaybill(inv._id, {});
      toast.success(`تم إنشاء البوليصة: ${res.data.data.waybillNumber}`, { id: tid });
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || t('invoices_page.toasts.ktmt7xo'), { id: tid });
    }
  };

  const handleTrackWaybill = async (inv) => {
    const tid = toast.loading(t('invoices_page.ui.kxkbj6z'));
    try {
      const res = await invoicesApi.trackBostaWaybill(inv._id);
      toast.success(`حالة الشحنة: ${res.data.data.status}`, { id: tid });
      loadInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || t('invoices_page.toasts.kjwawpc'), { id: tid });
    }
  };

  const handlePrintDocument = async (invoiceSummary, type = 'receipt') => {
    const printWindow = window.open('', '_blank', 'width=960,height=980');
    if (!printWindow) {
      toast.error(t('invoices_page.toasts.ky1p8ft'));
      return;
    }

    const loadingLabel = t('invoices_page.ui.kdoyda5');
    printWindow.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><title>Loading...</title></head><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;padding:24px">${loadingLabel}</body></html>`);
    printWindow.document.close();

    const loadingToast = toast.loading(type === 'receipt' ? t('invoices_page.ui.kz5ho3n') : t('invoices_page.ui.kttg6pi'));

    try {
      const [invoiceResponse, settingsResponse] = await Promise.all([
        invoicesApi.getById(invoiceSummary._id),
        settingsApi.get(),
      ]);

      const invoice = invoiceResponse?.data?.data;
      const tenant = settingsResponse?.data?.data?.tenant;
      const barcodeSettings = tenant?.settings?.barcode || {};

      if (!invoice?._id) {
        throw new Error('INVOICE_NOT_FOUND');
      }

      if (type === 'receipt') {
        printReceiptDocument({
          invoice,
          tenant,
          barcodeSource: barcodeSettings.receiptBarcodeSource || 'none',
          printWindow,
        });
      } else {
        printDeliveryTicket({
          invoice,
          tenant,
          barcodeSource: barcodeSettings.deliveryBarcodeSource || 'none',
          printWindow,
        });
      }

      toast.success(type === 'receipt' ? t('invoices_page.ui.kpryg0u') : t('invoices_page.ui.kwou0cb'), { id: loadingToast });
    } catch (err) {
      printWindow.close();
      toast.error(err.response?.data?.message || t('invoices_page.toasts.k8d53jp'), { id: loadingToast });
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const statusBadge = (s) => ({
    paid: <Badge variant="success">{t('invoices_page.ui.kpbinfs')}</Badge>,
    partially_paid: <Badge variant="warning">{t('invoices_page.ui.ksym7e')}</Badge>,
    pending: <Badge variant="gray">{t('invoices_page.ui.kteqs2')}</Badge>,
    overdue: <Badge variant="danger">{t('invoices_page.ui.kpbetmp')}</Badge>,
  }[s] || <Badge variant="gray">—</Badge>);

  const methodLabel = (m) => ({ cash: '💵 نقد', cash_on_delivery: '🚚 الدفع عند الاستلام', installment: '📅 أقساط', deferred: '⏳ آجل' }[m] || m);

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <div className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
              <FileText className="h-6 w-6 text-primary-600" />
              {t('invoices_page.ui.ka801pj')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('invoices_page.ui.k40uu82')}
            </p>
          </div>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={openCreate}
            className="w-full sm:w-auto shadow-lg shadow-primary-500/20"
          >
            {t('invoices_page.ui.k5kfln4')}
          </Button>
        </div>
      </div>

      {/* Header Actions */}
      <div className="app-surface-muted flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Customer Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('invoices_page.placeholders.krac6zc')}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="app-surface w-full rounded-2xl border border-transparent py-2.5 pl-4 pr-10 text-sm outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="app-surface w-full cursor-pointer appearance-none rounded-2xl border border-transparent py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
            >
              <option value="">{t('invoices_page.ui.k3mf4el')}</option>
              <option value="paid">✅ مدفوع بالكامل</option>
              <option value="partially_paid">🟡 مدفوع جزئياً</option>
              <option value="pending">⏳ معلق (غير مدفوع)</option>
              <option value="overdue">🔴 متأخر عن السداد</option>
            </select>
          </div>
        </div>

        {/* Branch Filter */}
        <div className="relative w-full sm:flex-1 sm:w-64">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="app-surface w-full cursor-pointer appearance-none rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
          >
            <option value="">🏢 كل الفروع</option>
            {(Array.isArray(branches) ? branches : []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="app-surface-muted w-full rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:border-primary-500/30 hover:text-primary-600 dark:hover:text-primary-300 sm:w-auto"
        >
          {t('invoices_page.ui.k957vid')}
        </button>
      </div>

      {loading ? <OwnerTableSkeleton rows={10} columns={8} /> : invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-gray-300" />}
          title={t('invoices_page.titles.kaahvot')}
          description="لم يتم إنشاء أي فواتير بعد. ابدأ بإنشاء فاتورة جديدة لعرضها هنا."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {invoices.map((inv) => (
              <Card key={inv._id} className="overflow-hidden rounded-[1.5rem] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-primary-600 dark:text-primary-400">{inv.invoiceNumber}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{inv.customer?.name || '—'}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-white/60">{inv.customer?.phone || t('invoices_page.toasts.k8cap02')}</p>
                  </div>
                  <div className="shrink-0">
                    {statusBadge(inv.status)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('invoices_page.ui.krh6w30')}</p>
                    <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{fmt(inv.totalAmount)} ج.م</p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('invoices_page.ui.kzaci6q')}</p>
                    <p className={`mt-1 text-sm font-black ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {inv.remainingAmount > 0 ? `${fmt(inv.remainingAmount)} ج.م` : 'مسدد'}
                    </p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('invoices_page.ui.kove7t8')}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{inv.branch?.name || '—'}</p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('invoices_page.ui.kfj3di7')}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{methodLabel(inv.paymentMethod)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 dark:text-white/60">
                  <span>{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span>{new Date(inv.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {inv.remainingAmount > 0 ? (
                    <>
                      <button
                        onClick={() => openPay(inv)}
                        className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        title={t('invoices_page.titles.kxequrp')}
                      >
                        <CreditCard className="mx-auto w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePayAll(inv)}
                        className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        title={t('invoices_page.titles.kydw5oh')}
                      >
                        <Check className="mx-auto w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openLinkModal(inv)}
                        className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                        title={t('invoices_page.titles.k7sp4f3')}
                      >
                        <LinkIcon className="mx-auto w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="col-span-3 flex items-center justify-center rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <button
                    onClick={() => handleSendWhatsApp(inv)}
                    className="rounded-xl bg-green-50 p-2.5 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                    title={t('invoices_page.titles.kywiuf1')}
                  >
                    <Send className="mx-auto w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintDocument(inv, 'receipt')}
                    className="rounded-xl bg-slate-50 p-2.5 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300"
                    title={t('invoices_page.titles.knn2wa2')}
                  >
                    <Printer className="mx-auto w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintDocument(inv, 'delivery')}
                    className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300"
                    title={t('invoices_page.titles.kocb0oz')}
                  >
                    <Truck className="mx-auto w-4 h-4" />
                  </button>
                  {!inv.shippingDetails?.waybillNumber ? (
                    <button
                      onClick={() => handleCreateWaybill(inv)}
                      className="rounded-xl bg-orange-50 p-2.5 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                      title={t('invoices_page.titles.kni9y5i')}
                    >
                      <Send className="mx-auto w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTrackWaybill(inv)}
                      className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      title={`تتبع الشحنة: ${inv.shippingDetails.waybillNumber}`}
                    >
                      <ExternalLink className="mx-auto w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden rounded-3xl md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm text-right">
                <thead>
                  <tr className="border-b border-gray-100/80 bg-black/[0.02] dark:border-white/5 dark:bg-white/[0.03]">
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.k3r1ew5')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.kab4izh')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.kzbvdnf')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.kove7t8')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.kabct8k')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.krh6w30')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90">{t('invoices_page.ui.kzaci6q')}</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-white/90 text-center">{t('invoices_page.ui.kvfmk6')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/70 dark:divide-white/5">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="group transition-all duration-200 hover:bg-primary-500/[0.03] dark:hover:bg-white/[0.03]">
                      <td className="px-6 py-4 font-bold text-primary-600 dark:text-primary-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{inv.customer?.name || '—'}</div>
                        <div className="text-xs text-gray-400 dark:text-white/60 mt-0.5">{inv.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-white/70">
                        {new Date(inv.createdAt).toLocaleDateString('ar-EG')}
                        <div className="text-[10px] text-gray-400 dark:text-white/50">{new Date(inv.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-white/70">{inv.branch?.name || '—'}</td>
                      <td className="px-6 py-4">
                        {statusBadge(inv.status)}
                        <div className="text-[10px] text-gray-400 dark:text-white/50 mt-1">{methodLabel(inv.paymentMethod)}</div>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {fmt(inv.totalAmount)} <span className="text-[10px] font-normal text-gray-400 dark:text-white/40">{t('invoices_page.ui.kwlxf')}</span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.remainingAmount > 0 ? (
                          <span className="font-bold text-red-500">{fmt(inv.remainingAmount)} <span className="text-[10px] font-normal">{t('invoices_page.ui.kwlxf')}</span></span>
                        ) : (
                          <span className="font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> مسدد</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2 min-w-[168px]">
                          {inv.remainingAmount > 0 ? (
                            <>
                              <button
                                onClick={() => openPay(inv)}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors"
                                title={t('invoices_page.titles.kxequrp')}
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePayAll(inv)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 transition-colors"
                                title={t('invoices_page.titles.kydw5oh')}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openLinkModal(inv)}
                                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                                title={t('invoices_page.titles.k7sp4f3')}
                              >
                                <LinkIcon className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-emerald-500"><Check className="w-5 h-5" /></span>
                          )}
                          {!inv.shippingDetails?.waybillNumber ? (
                            <button
                              onClick={() => handleCreateWaybill(inv)}
                              className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 transition-colors"
                              title={t('invoices_page.titles.kdvcg14')}
                            >
                              <Send className="w-4 h-4" /> {/* Or a Truck icon if imported */}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTrackWaybill(inv)}
                              className="p-2 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors"
                              title={`تتبع الشحنة: ${inv.shippingDetails.waybillNumber}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintDocument(inv, 'receipt')}
                            className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-500/10 dark:text-slate-300 dark:hover:bg-slate-500/20 transition-colors"
                            title={t('invoices_page.titles.knn2wa2')}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintDocument(inv, 'delivery')}
                            className="p-2 rounded-lg bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20 transition-colors"
                            title={t('invoices_page.titles.kocb0oz')}
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(inv)}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors"
                            title={t('invoices_page.titles.kywiuf1')}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
        </>
      )}

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('invoices_page.titles.k5kfln4')} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Select label={t('invoices_page.form.kxp75jn')} value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}
            options={[{ value: '', label: t('invoices_page.ui.kowuzyf') }, ...customers.map((c) => ({ value: c._id, label: `${c.name} — ${c.phone}` }))]} />
          <Select label={t('invoices_page.form.kfj3di7')} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            options={[{ value: 'cash', label: '💵 نقد كامل' }, { value: 'installment', label: '📅 أقساط' }, { value: 'deferred', label: '⏳ آجل' }]} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 dark:text-white/80 mb-2">{t('invoices_page.ui.kddbpbs')}</label>

          {/* Product Search */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={t('invoices_page.placeholders.khi9u1')}
              className="app-surface w-full rounded-2xl border border-transparent py-2 pl-4 pr-10 text-sm outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              autoFocus
            />
          </div>

          <div className="app-surface-muted max-h-48 overflow-y-auto overflow-hidden rounded-2xl border border-black/5 dark:border-white/5">
            {products
              .filter((p) => {
                const term = productSearch.toLowerCase();
                return (
                  (p.stock?.quantity || 0) > 0 &&
                  (p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
                );
              })
              .map((p) => {
                const inCart = cart.find((c) => c.productId === p._id);
                return (
                  <div key={p._id} className="flex items-start justify-between gap-3 border-b border-gray-100/80 p-2 transition-colors duration-200 last:border-0 hover:bg-white/70 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <div>
                      <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{p.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-white/60">
                        {p.sku && <span className="app-surface rounded-md px-1 py-0.5 font-mono text-[10px]">{p.sku}</span>}
                        <span>{fmt(p.price)} ج.م</span>
                        <span className={p.stock?.quantity < 5 ? 'text-red-500' : 'text-emerald-500'}>
                          ({p.stock?.quantity})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${inCart
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                        : 'app-surface border border-transparent text-gray-600 hover:border-primary-500/30 hover:text-primary-500 dark:text-gray-300'
                        }`}
                    >
                      {inCart ? `مضاف (${inCart.quantity})` : 'إضافة'}
                    </button>
                  </div>
                );
              })}
            {products.filter(p => (p.stock?.quantity || 0) > 0 && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))).length === 0 && (
              <div className="p-4 text-center text-gray-400 dark:text-white/50 text-xs">{t('invoices_page.ui.kgf0454')}</div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="app-surface-muted mb-4 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-400 dark:text-white/60 mb-3">{t('invoices_page.ui.kvg40an')}</p>
            {cart.map((item) => (
              <div key={item.productId} className="flex flex-col gap-3 border-b border-gray-100/80 py-2 last:border-0 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="app-surface flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-200 hover:text-primary-500">−</button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="app-surface flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-200 hover:text-primary-500">+</button>
                  </div>
                  <span className="text-sm font-bold w-24 text-left">{fmt(item.price * item.quantity)} ج.م</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-200/80 pt-3 dark:border-white/10 sm:flex-row sm:justify-between">
              <span className="font-extrabold">{t('invoices_page.ui.krh6w30')}</span>
              <span className="text-xl font-extrabold text-primary-500">{fmt(cartTotal)} ج.م</span>
            </div>
          </div>
        )}

        {paymentMethod === 'installment' && cartTotal > 0 && (
          <div className="mb-4 rounded-2xl border border-primary-200/80 bg-primary-50/80 p-4 dark:border-primary-500/20 dark:bg-primary-500/10">
            <div className="flex items-center gap-2 mb-3"><Calculator className="w-5 h-5 text-primary-500" /><span className="font-bold text-primary-600 dark:text-primary-400">{t('invoices_page.ui.k5gsx7l')}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Input label={t('invoices_page.form.k8vf2ci')} type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0" />
              <Select label={t('invoices_page.form.krme2qo')} value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                options={[3, 4, 6, 9, 12, 18, 24].map((n) => ({ value: n, label: `${n} قسط` }))} />
              <Select label={t('invoices_page.form.kzcd8g5')} value={frequency} onChange={(e) => setFrequency(e.target.value)}
                options={[{ value: 'weekly', label: t('invoices_page.ui.kcgyblr') }, { value: 'biweekly', label: t('invoices_page.ui.kgbqb1m') }, { value: 'monthly', label: t('invoices_page.ui.kt45xo') }, { value: 'bimonthly', label: t('invoices_page.ui.kxzkchn') }]} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="app-surface rounded-xl p-3"><p className="text-[10px] text-gray-400 dark:text-white/60">{t('invoices_page.ui.kaawy0g')}</p><p className="text-lg font-extrabold text-emerald-500">{fmt(Number(downPayment) || 0)}</p></div>
              <div className="app-surface rounded-xl p-3"><p className="text-[10px] text-gray-400 dark:text-white/60">{t('invoices_page.ui.kzaci6q')}</p><p className="text-lg font-extrabold text-amber-500">{fmt(remaining)}</p></div>
              <div className="app-surface rounded-xl p-3"><p className="text-[10px] text-gray-400 dark:text-white/60">{t('invoices_page.ui.kove8ll')}</p><p className="text-lg font-extrabold text-primary-500">{fmt(monthlyAmount)}</p></div>
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-white/60 mt-3">✨ بدون أي ضريبة أو رسوم إضافية</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('invoices_page.ui.cancel')}</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleCreate} loading={creating}>{t('invoices_page.ui.kfii0jw')}</Button>
        </div>
      </Modal>

      {/* Pay Modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title={t('invoices_page.titles.kxequrp')} size="sm">
        {payInvoice && (
          <div className="space-y-4">
            <div className="app-surface-muted rounded-2xl p-4 text-center">
              <p className="text-sm text-gray-400 dark:text-white/70">{t('invoices_page.ui.kzaci6q')}</p>
              <p className="text-2xl font-extrabold text-red-500">{fmt(payInvoice.remainingAmount)} ج.م</p>
            </div>
            <Input label={t('invoices_page.form.kankjb7')} type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={t('invoices_page.placeholders.k95nd0s')} />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPayModal(false)}>{t('invoices_page.ui.cancel')}</Button>
              <Button icon={<Check className="w-4 h-4" />} onClick={handlePay}>{t('invoices_page.ui.kksquah')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Link Modal */}
      <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} title={t('invoices_page.titles.kyr8psa')} size="sm">
        {linkInvoice && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/90 p-4 text-center dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <p className="text-sm text-indigo-800 dark:text-indigo-200">{t('invoices_page.ui.kdfghje')}</p>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{fmt(linkInvoice.remainingAmount)} ج.م</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-300 mt-1">{t('invoices_page.ui.krf319e')}</p>
            </div>

            {!generatedLink ? (
              <>
                <Select
                  label={t('invoices_page.form.kd1gwpe')}
                  value={linkGateway}
                  onChange={(e) => setLinkGateway(e.target.value)}
                  options={[
                    { value: 'paymob', label: '💳 بطاقة بنكية (Paymob)' },
                    { value: 'stripe', label: '💳 بطاقة دولية (Stripe)' },
                    { value: 'instapay', label: '📱 انستا باي (InstaPay)' },
                    { value: 'vodafone_cash', label: '🔴 فودافون كاش' }
                  ]}
                />

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
                  <Button variant="ghost" onClick={() => setShowLinkModal(false)}>{t('invoices_page.ui.cancel')}</Button>
                  <Button icon={<LinkIcon className="w-4 h-4" />} onClick={handleGenerateLink} loading={linkLoading}>
                    {t('invoices_page.ui.k19j5yt')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="flex justify-center mb-4">
                  <div className="app-surface rounded-2xl p-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedLink)}`}
                      alt="QR Code"
                      className="w-32 h-32"
                    />
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full rounded-2xl border border-emerald-200/80 bg-emerald-50/90 py-3 pl-4 pr-12 text-sm font-medium text-emerald-800 outline-none dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-emerald-200 p-2 text-emerald-700 transition-colors duration-200 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-700"
                    title={t('invoices_page.titles.k50osg1')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <Button variant="ghost" onClick={() => { setGeneratedLink(''); setShowLinkModal(false); }} className="flex-1">{t('invoices_page.ui.close')}</Button>
                  <Button
                    variant="primary"
                    onClick={() => window.open(generatedLink, '_blank')}
                    icon={<ExternalLink className="w-4 h-4" />}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {t('invoices_page.ui.kmndvgi')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
