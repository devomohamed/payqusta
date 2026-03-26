import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Users, MessageCircle, Star, Check, X, Eye, Printer,
  FileText, Send, Phone, Calendar, CreditCard, TrendingUp, TrendingDown,
  ShieldAlert, ShieldCheck, Ban, CheckCircle, Clock, AlertTriangle,
  Download, History, DollarSign, ChevronDown, ChevronUp, Package,
  RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square, XCircle, Trash2, Bell, BellOff, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { customersApi, creditApi, api, useAuthStore } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState, OwnerTableSkeleton } from '../components/UI';
import Pagination from '../components/Pagination';

export default function CustomersPage() {
  const { t, i18n } = useTranslation('admin');
  const FILTERS_STORAGE_KEY = 'owner_customers_filters_v1';
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [tierFilter, setTierFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    creditLimit: 10000,
    barcode: '',
    activationChannel: 'auto',
  });

  // Customer Details Modal
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [transactionsPagination, setTransactionsPagination] = useState({ page: 1, totalPages: 1 });
  const [creditAssessment, setCreditAssessment] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Date Range State
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [showDateModal, setShowDateModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'print' or 'whatsapp'

  const printRef = useRef(null);
  const LIMIT = 8;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSearch(parsed.search || '');
        setTierFilter(parsed.tierFilter || '');
        setBranchFilter(parsed.branchFilter || '');
      }
    } catch (_) { }

    // Load branches
    customersApi.getAll({}).then(() => { }); // Just to wake up
    // We need a way to get branches. Typically useAuthStore or a dedicated API.
    // Assuming we can get it from an API or just mocking for now since we added it to model.
    // Let's use the one from store if available or just fetch manually.
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
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      search,
      tierFilter,
      branchFilter,
    }));
  }, [search, tierFilter, branchFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search: debouncedSearch };
      if (tierFilter) params.tier = tierFilter;
      if (branchFilter) params.branch = branchFilter;
      const res = await customersApi.getAll(params);
      setCustomers(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error(t('customers_page.toasts.load_error')); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, tierFilter, branchFilter, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, tierFilter, branchFilter]);

  const resetFilters = () => {
    setSearch('');
    setTierFilter('');
    setBranchFilter('');
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      creditLimit: 10000,
      barcode: '',
      activationChannel: 'auto',
    });
    setShowModal(true);
  };
  const openEdit = (c, e) => {
    e?.stopPropagation();
    setEditId(c._id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
      creditLimit: c.financials?.creditLimit || 10000,
      barcode: c.barcode || '',
      activationChannel: c.phone && c.email ? 'auto' : c.phone ? 'sms' : 'email',
    });
    setShowModal(true);
  };

  // Open customer details with transactions
  const openDetails = async (customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
    setLoadingDetails(true);
    setCreditAssessment(null);
    setCustomerTransactions([]);
    setExpandedInvoice(null);

    try {
      const [transRes, creditRes] = await Promise.all([
        customersApi.getTransactions(customer._id),
        creditApi.getAssessment(customer._id).catch(() => null),
      ]);
      setCustomerTransactions(transRes.data.data?.invoices || []);
      setTransactionsPagination({
        page: transRes.data.data?.pagination?.page || 1,
        totalPages: transRes.data.data?.pagination?.totalPages || 1,
      });
      if (creditRes?.data?.data) setCreditAssessment(creditRes.data.data);
    } catch (err) {
      toast.error(t('customers_page.toasts.load_details_error'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error(t('customers_page.toasts.required_name_phone'));
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes,
        creditLimit: form.creditLimit,
        barcode: form.barcode,
      };

      if (!editId) {
        payload.activationChannel = form.activationChannel || 'auto';
      }

      if (editId) {
        await customersApi.update(editId, payload);
        toast.success(t('customers_page.toasts.customer_updated'));
      } else {
        await customersApi.create(payload);
        toast.success(t('customers_page.toasts.customer_added'));
      }

      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers_page.toasts.generic_error'));
    } finally {
      setSaving(false);
    }
  };

  // Block/Unblock sales
  const handleBlockSales = async (customerId, block) => {
    try {
      if (block) {
        await creditApi.blockSales(customerId, t('customers_page.credit.block_reason'));
        toast.success(t('customers_page.toasts.sales_blocked'));
      } else {
        await creditApi.unblockSales(customerId);
        toast.success(t('customers_page.toasts.sales_unblocked'));
      }
      const creditRes = await creditApi.getAssessment(customerId);
      if (creditRes?.data?.data) setCreditAssessment(creditRes.data.data);
      load();
    } catch (err) {
      toast.error(t('customers_page.toasts.status_update_error'));
    }
  };

  const handleRedeemPoints = async (points) => {
    if (!points || points <= 0) return;
    try {
      const res = await api.post(`/customers/${selectedCustomer._id}/redeem-points`, { points });
      toast.success(res.data.message);

      // Update local state
      setSelectedCustomer(prev => ({
        ...prev,
        gamification: { ...prev.gamification, points: res.data.data.remainingPoints },
        financials: { ...prev.financials, outstandingBalance: res.data.data.outstandingBalance }
      }));

      // Refresh list
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers_page.toasts.redeem_failed'));
    }
  };

  // Open Date Modal before action
  const preAction = (type) => {
    setActionType(type);
    setShowDateModal(true);
  };

  // Execute Action after Date Selection
  const executeAction = () => {
    setShowDateModal(false);
    if (actionType === 'print') confirmPrint();
    if (actionType === 'whatsapp') confirmWhatsApp();
  };

  // Print statement with Date Filter (Client-Side HTML)
  const confirmPrint = () => {
    // We use the existing printRef content which matches the user's preferred design.
    const printContent = printRef.current;
    if (!printContent) return;

    // Create a hidden iframe or window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${selectedCustomer?.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          .info-box label { font-size: 10px; color: #666; display: block; }
          .info-box span { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #333; color: white; font-size: 11px; }
          .paid { color: green; }
          .overdue { color: red; }
          .total-row { background: #eee !important; font-weight: bold; }
          .items-table { margin: 10px 0; background: #fafafa; }
          .items-table th { background: #666; }
          .summary-box { 
             margin-top: 30px; 
             padding: 15px; 
             background: #f1f5f9; 
             border: 1px solid #ddd; 
             display: flex; 
             justify-content: space-around; 
             text-align: center;
          }
          .summary-item h3 { margin-bottom: 5px; font-size: 14px; color: #666; }
          .summary-item p { font-size: 18px; font-weight: bold; }
          @media print { body { print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        
        <div class="summary-box">
          <div class="summary-item">
             <h3>{t('customers_page.ui.k861ybb')}</h3>
             <p>${fmt(selectedCustomer.financials?.totalPurchases)} ج.م</p>
          </div>
          <div class="summary-item">
             <h3>{t('customers_page.ui.khtnkti')}</h3>
             <p style="color: green">${fmt(selectedCustomer.financials?.totalPaid)} ج.م</p>
          </div>
          <div class="summary-item">
             <h3>{t('customers_page.ui.kzc2oun')}</h3>
             <p style="color: ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'red' : 'green'}">${fmt(selectedCustomer.financials?.outstandingBalance)} ج.م</p>
          </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999;">
          تم إنشاء هذا الكشف بواسطة PayQusta — ${new Date().toLocaleString('ar-EG')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Send statement via WhatsApp API (as PDF)
  const confirmWhatsApp = async () => {
    if (!selectedCustomer?.phone) return toast.error(t('customers_page.toasts.phone_missing'));
    setSendingWhatsApp(true);

    try {
      const response = await customersApi.sendStatementPDF(selectedCustomer._id, dateFilter);
      if (response.data.data?.whatsappSent) {
        toast.success(response.data.message || t('customers_page.toasts.pdf_sent'));
      } else if (response.data.data?.needsTemplate) {
        toast.error(response.data.message);
      } else {
        toast.success(response.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('customers_page.toasts.send_error'));
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const tierBadge = (tier) => {
    if (tier === 'vip') return <Badge variant="warning">VIP</Badge>;
    if (tier === 'premium') return <Badge variant="success">{t('customers_page.tiers.premium')}</Badge>;
    return <Badge variant="gray">{t('customers_page.tiers.normal')}</Badge>;
  };

  const statusBadge = (status) => {
    const map = {
      paid: { variant: 'success', label: t('customers_page.invoice_status.paid'), icon: CheckCircle },
      pending: { variant: 'warning', label: t('customers_page.invoice_status.pending'), icon: Clock },
      partially_paid: { variant: 'primary', label: t('customers_page.invoice_status.partially_paid'), icon: Clock },
      overdue: { variant: 'danger', label: t('customers_page.invoice_status.overdue'), icon: AlertTriangle },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}><s.icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
  };

  const riskBadge = (level) => {
    const map = {
      low: { variant: 'success', label: t('customers_page.risk.low'), icon: ShieldCheck },
      medium: { variant: 'warning', label: t('customers_page.risk.medium'), icon: ShieldAlert },
      high: { variant: 'danger', label: t('customers_page.risk.high'), icon: ShieldAlert },
      blocked: { variant: 'danger', label: t('customers_page.risk.blocked'), icon: Ban },
    };
    const r = map[level] || map.low;
    return <Badge variant={r.variant}><r.icon className="w-3 h-3 ml-1" />{r.label}</Badge>;
  };

  const fmt = (n) => (n || 0).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US');

  // Toggle invoice expansion to show items
  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) setSelectedIds([]);
    else setSelectedIds(customers.map((c) => c._id));
  };
  const handleBulkDelete = () => {
    notify.custom({
      type: 'error',
      title: t('customers_page.bulk.confirm_title'),
      message: t('customers_page.bulk.confirm_message', { count: selectedIds.length }),
      duration: 10000,
      action: {
        label: t('customers_page.bulk.confirm_action', { count: selectedIds.length }),
        onClick: async () => {
          setBulkDeleting(true);
          try {
            await api.post('/customers/bulk-delete', { ids: selectedIds });
            notify.success(t('customers_page.bulk.success', { count: selectedIds.length }));
            setSelectedIds([]);
            load();
          } catch { notify.error(t('customers_page.bulk.error')); }
          finally { setBulkDeleting(false); }
        },
      },
    });
  };

  const handleDelete = (customer) => {
    const hasBalance = (customer.financials?.outstandingBalance || 0) > 0;
    
    notify.custom({
      type: 'error',
      title: t('customers_page.delete.confirm_title'),
      message: hasBalance 
        ? t('customers_page.delete.confirm_with_balance', { amount: fmt(customer.financials.outstandingBalance), name: customer.name })
        : t('customers_page.delete.confirm_message', { name: customer.name }),
      duration: 10000,
      action: {
        label: t('customers_page.delete.confirm_action'),
        onClick: async () => {
          try {
            await customersApi.delete(customer._id);
            notify.success(t('customers_page.delete.success'));
            load();
          } catch (err) {
            notify.error(err.response?.data?.message || t('customers_page.delete.error'));
          }
        },
      },
    });
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/customers/${id}/duplicate`);
      notify.success(t('customers_page.duplicate.success'));
      load();
      // Optionally open the edit modal for the new customer
      if (res.data?.data?._id) {
        // Wait a bit for the list to refresh then open edit
        setTimeout(() => {
          openEdit(res.data.data);
        }, 500);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || t('customers_page.duplicate.error'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <div className="app-surface rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
              <Users className="h-6 w-6 text-primary-600" />
              {t('customers_page.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('customers_page.subtitle')}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              onClick={() => window.location.href = '/marketing'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-100 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-600 transition-colors hover:bg-primary-100 sm:w-auto sm:py-2.5"
            >
              <TrendingUp className="w-4 h-4" />
              {t('customers_page.actions.marketing_dashboard')}
            </button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd} className="w-full sm:w-auto">
              {t('customers_page.actions.add_customer')}
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="app-surface-muted flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-none sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('customers_page.filters.search_placeholder')}
            className="app-surface w-full rounded-xl border-2 py-2.5 pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 transition-all focus:border-primary-500 dark:text-gray-100" />
        </div>

        {/* Branch Filter */}
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
          className="app-surface w-full cursor-pointer rounded-xl border-2 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 sm:w-auto">
          <option value="">{t('customers_page.filters.all_branches')}</option>
          {(Array.isArray(branches) ? branches : []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>

        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
          className="app-surface w-full cursor-pointer rounded-xl border-2 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 sm:w-auto">
          <option value="">{t('customers_page.filters.all_customers')}</option>
          <option value="vip">VIP</option>
          <option value="premium">{t('customers_page.tiers.premium')}</option>
          <option value="normal">{t('customers_page.tiers.normal')}</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="app-surface w-full rounded-xl border-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
        >
          {t('customers_page.filters.reset')}
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="app-surface-muted flex flex-col items-start gap-3 rounded-xl border-2 border-primary-200 p-3 animate-fade-in dark:border-primary-500/30 sm:flex-row sm:items-center">
          <button onClick={toggleSelectAll} className="p-1">
            {selectedIds.length === customers.length ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-primary-500" />}
          </button>
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{t('customers_page.bulk.selected_count', { count: selectedIds.length })}</span>
          <div className="mr-auto flex flex-wrap gap-2">
            <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} loading={bulkDeleting} onClick={handleBulkDelete}>
              {t('customers_page.bulk.delete_selected')}
            </Button>
            <button onClick={() => setSelectedIds([])} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <XCircle className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {loading ? <OwnerTableSkeleton rows={10} columns={8} /> : customers.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title={t('customers_page.empty.title')} description={search ? t('customers_page.empty.search_no_results', { search }) : t('customers_page.empty.start')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {customers.map((c) => (
              <Card key={c._id} className={`overflow-hidden rounded-[1.5rem] p-4 ${selectedIds.includes(c._id) ? 'ring-2 ring-primary-500/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button onClick={() => toggleSelect(c._id)} className="mt-1">
                      {selectedIds.includes(c._id)
                        ? <CheckSquare className="w-5 h-5 text-primary-500" />
                        : <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                      }
                    </button>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${c.salesBlocked ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600'}`}>
                      {c.salesBlocked ? <Ban className="w-4 h-4" /> : c.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-gray-900 dark:text-white">{c.name}</p>
                        {tierBadge(c.tier)}
                        {c.salesBlocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('customers_page.ui.kpbwsuv')}</span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" dir="ltr">{c.phone}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-gray-400 dark:text-gray-500">{c.address || t('customers_page.common.no_address')}</p>
                    </div>
                  </div>
                  <button onClick={() => openDetails(c)} className="rounded-xl bg-primary-50 p-2 text-primary-500 dark:bg-primary-500/10">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('customers_page.columns.purchases')}</p>
                    <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{fmt(c.financials?.totalPurchases)} {t('customers_page.common.currency')}</p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('customers_page.columns.outstanding')}</p>
                    <p className={`mt-1 text-sm font-black ${(c.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {(c.financials?.outstandingBalance || 0) > 0 ? `${fmt(c.financials?.outstandingBalance)} ${t('customers_page.common.currency')}` : t('customers_page.invoice_status.paid')}
                    </p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('customers_page.columns.branch')}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{c.branch?.name || t('customers_page.common.dash')}</p>
                  </div>
                  <div className="app-surface-muted rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400">{t('customers_page.columns.points')}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-black text-amber-500"><Star className="w-3.5 h-3.5" fill="currentColor" />{c.gamification?.points || 0}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button onClick={(e) => openEdit(c, e)} className="app-surface-muted flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    {t('customers_page.actions.edit')}
                  </button>
                  <button onClick={() => window.open(`https://wa.me/${c.phone}`, '_blank')} className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 px-3 py-2.5 text-xs font-bold text-green-600 dark:bg-green-500/10 dark:text-green-400">
                    <MessageCircle className="w-4 h-4" />
                    {t('customers_page.actions.whatsapp')}
                  </button>
                  <button onClick={() => openDetails(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-50 px-3 py-2.5 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <Eye className="w-4 h-4" />
                    {t('customers_page.actions.details')}
                  </button>
                  <button onClick={() => handleDuplicate(c._id)} className="app-surface-muted flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Copy className="w-4 h-4" />
                    {t('customers_page.actions.duplicate')}
                  </button>
                  <button onClick={() => handleDelete(c)} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <Trash2 className="w-4 h-4" />
                    {t('customers_page.actions.delete')}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100 dark:border-gray-800">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleSelectAll}>
                        {selectedIds.length === customers.length && customers.length > 0 ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                    </th>
                    {[t('customers_page.columns.customer'), t('customers_page.columns.phone'), t('customers_page.columns.branch'), t('customers_page.columns.purchases'), t('customers_page.columns.outstanding'), t('customers_page.columns.points'), t('customers_page.columns.status'), t('customers_page.columns.actions')].map((h) => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id} className={`border-b border-gray-50 transition-colors dark:border-gray-800/50 ${c.salesBlocked ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-gray-800/30'} ${selectedIds.includes(c._id) ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(c._id)}>
                          {selectedIds.includes(c._id)
                            ? <CheckSquare className="w-4 h-4 text-primary-500" />
                            : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-primary-400" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${c.salesBlocked ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600'}`}>
                            {c.salesBlocked ? <Ban className="w-4 h-4" /> : c.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              {c.name}
                              {c.salesBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">{t('customers_page.statuses.blocked')}</span>}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.address || t('customers_page.common.dash')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 font-mono text-xs" dir="ltr">{c.phone}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-300 font-medium">{c.branch?.name || t('customers_page.common.dash')}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{fmt(c.financials?.totalPurchases)} {t('customers_page.common.currency')}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${(c.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {(c.financials?.outstandingBalance || 0) > 0 ? `${fmt(c.financials.outstandingBalance)} ${t('customers_page.common.currency')}` : `✓ ${t('customers_page.invoice_status.paid')}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="w-3.5 h-3.5" fill="currentColor" />{c.gamification?.points || 0}</span>
                      </td>
                      <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <button onClick={() => openDetails(c)} className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 hover:bg-primary-100 transition-colors" title={t('customers_page.actions.view_details')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => openEdit(c, e)} className="app-surface-muted p-2 rounded-lg text-gray-500 transition-colors hover:bg-gray-100" title={t('customers_page.actions.edit')}>
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicate(c._id)} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 transition-colors" title={t('customers_page.actions.duplicate')}>
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => window.open(`https://wa.me/${c.phone}`, '_blank')} className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-500 hover:bg-green-100 transition-colors" title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c)} className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors" title={t('customers_page.actions.delete')}>
                            <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? t('customers_page.modal.edit_title') : t('customers_page.modal.add_title')}>
        <div className="space-y-4">
          <Input label={t('customers_page.form.name_required')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('customers_page.form.phone_required')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('customers_page.form.phone_placeholder')} />
          {!editId && (
            <div>
              <label className="mb-2 block text-sm font-bold app-text-strong">{t('customers_page.form.activation_channel')}</label>
              <select
                value={form.activationChannel}
                onChange={(e) => setForm({ ...form, activationChannel: e.target.value })}
                className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="auto">{t('customers_page.form.activation_options.auto')}</option>
                <option value="whatsapp">{t('customers_page.form.activation_options.whatsapp')}</option>
                <option value="sms">{t('customers_page.form.activation_options.sms')}</option>
                <option value="email">{t('customers_page.form.activation_options.email')}</option>
              </select>
            </div>
          )}
          <Input label={t('customers_page.form.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={t('customers_page.form.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label={t('customers_page.form.barcode')} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder={t('customers_page.form.barcode_placeholder')} />
          <Input label={t('customers_page.form.credit_limit')} type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t('customers_page.actions.cancel')}</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>{editId ? t('customers_page.actions.update') : t('customers_page.actions.add')}</Button>
        </div>
      </Modal>

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowDetails(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
          <div className="app-surface relative mx-auto my-0 flex max-h-svh w-full max-w-5xl flex-col overflow-hidden rounded-none shadow-2xl animate-slide-up sm:my-4 sm:max-h-[95vh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-l from-primary-500/5 to-transparent px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${selectedCustomer.salesBlocked ? 'bg-red-100 text-red-600' : 'bg-primary-100 dark:bg-primary-500/20 text-primary-600'}`}>
                  {selectedCustomer.salesBlocked ? <Ban className="w-7 h-7" /> : selectedCustomer.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                    {selectedCustomer.name}
                    {tierBadge(selectedCustomer.tier)}
                    {selectedCustomer.salesBlocked && <Badge variant="danger"><Ban className="w-3 h-3 ml-1" />{t('customers_page.statuses.sales_blocked')}</Badge>}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedCustomer.phone}</span>
                    <span className="app-surface-muted flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono"><Users className="w-3 h-3" />{selectedCustomer.barcode || t('customers_page.common.no_barcode')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => preAction('print')}><Printer className="w-4 h-4 ml-1" />{t('customers_page.actions.print')}</Button>
                <Button variant="whatsapp" size="sm" onClick={() => preAction('whatsapp')} loading={sendingWhatsApp}><Send className="w-4 h-4 ml-1" />{t('customers_page.actions.send_whatsapp')}</Button>
                <button onClick={() => setShowDetails(false)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingDetails ? <LoadingSpinner /> : (
                <div className="space-y-6">
                  {/* Financial Summary */}
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-xs font-medium text-primary-100">{t('customers_page.columns.purchases')}</p>
                      </div>
                      <p className="text-2xl font-black">{fmt(selectedCustomer.financials?.totalPurchases)}</p>
                    </div>

                    <div className="app-surface-muted rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-400">{t('customers_page.financial.paid')}</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(selectedCustomer.financials?.totalPaid)}</p>
                    </div>

                    <div className="app-surface-muted rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                          <TrendingDown className={`w-4 h-4 ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-400">{t('customers_page.columns.outstanding')}</p>
                      </div>
                      <p className={`text-2xl font-black ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {fmt(selectedCustomer.financials?.outstandingBalance)}
                      </p>
                    </div>

                    <div className="app-surface-muted rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-400">{t('customers_page.financial.credit_limit')}</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(selectedCustomer.financials?.creditLimit || 10000)}</p>
                    </div>

                    <div className="app-surface-muted rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-400">{t('customers_page.financial.wallet_balance')}</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(selectedCustomer.wallet?.balance || 0)}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 shadow-sm col-span-1 sm:col-span-2 xl:col-span-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <Star className="w-4 h-4 text-amber-600" fill="currentColor" />
                          </div>
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('customers_page.financial.loyalty_points')}</p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{fmt(selectedCustomer.gamification?.points)}</p>
                        <span className="text-[10px] text-amber-600 font-bold">{t('customers_page.financial.point_unit')}</span>
                      </div>
                      {selectedCustomer.gamification?.points >= 100 && (
                        <button
                          onClick={() => handleRedeemPoints(100)}
                          className="mt-2 w-full py-1.5 text-[10px] bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors"
                        >
                          {t('customers_page.actions.redeem_points')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Credit Assessment */}
                  {creditAssessment && (
                    <Card className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 dark:text-white"><CreditCard className="w-5 h-5 text-primary-500" />{t('customers_page.ui.kklhsvw')}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {riskBadge(creditAssessment.creditEngine?.riskLevel)}
                          {!creditAssessment.salesBlocked ? (
                            <Button variant="danger" size="sm" onClick={() => handleBlockSales(selectedCustomer._id, true)}><Ban className="w-4 h-4 ml-1" />{t('customers_page.actions.block_sales')}</Button>
                          ) : (
                            <Button variant="success" size="sm" onClick={() => handleBlockSales(selectedCustomer._id, false)}><CheckCircle className="w-4 h-4 ml-1" />{t('customers_page.actions.allow_sales')}</Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="app-surface-muted rounded-xl p-3 text-center">
                          <p className="text-3xl font-black" style={{ color: (creditAssessment.creditEngine?.score || 0) >= 70 ? '#10b981' : (creditAssessment.creditEngine?.score || 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {creditAssessment.creditEngine?.score || 0}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-300">{t('customers_page.credit.score')}</p>
                        </div>
                        <div className="app-surface-muted rounded-xl p-3 text-center">
                          <p className="text-xl font-bold dark:text-white">{creditAssessment.creditEngine?.maxInstallments || 0}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-300">{t('customers_page.credit.max_installments')}</p>
                        </div>
                        <div className="app-surface-muted rounded-xl p-3 text-center">
                          <p className="text-xl font-bold dark:text-white">{creditAssessment.paymentBehavior?.onTimePayments || 0}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-300">{t('customers_page.credit.on_time_payments')}</p>
                        </div>
                        <div className="app-surface-muted rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-red-500 dark:text-red-400">{creditAssessment.paymentBehavior?.latePayments || 0}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-300">{t('customers_page.credit.late_payments')}</p>
                        </div>
                      </div>
                      {creditAssessment.recommendation && (
                        <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-sm dark:text-gray-200">
                          {creditAssessment.recommendation}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* WhatsApp Notification Preferences */}
                  <Card className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2 dark:text-white">
                        <MessageCircle className="w-5 h-5 text-green-500" />
                        {t('customers_page.whatsapp.title')}
                      </h3>
                      <button
                        onClick={async () => {
                          const newEnabled = !(selectedCustomer.whatsapp?.enabled !== false);
                          try {
                            await customersApi.updateWhatsAppPreferences(selectedCustomer._id, { enabled: newEnabled });
                            setSelectedCustomer(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: newEnabled } }));
                            notify.success(newEnabled ? t('customers_page.whatsapp.enabled') : t('customers_page.whatsapp.disabled'));
                          } catch { notify.error(t('customers_page.whatsapp.update_error')); }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedCustomer.whatsapp?.enabled !== false ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        dir="ltr"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${selectedCustomer.whatsapp?.enabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {selectedCustomer.whatsapp?.enabled !== false && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { key: 'invoices', label: t('customers_page.ui.ktvslhu'), icon: FileText, color: 'text-blue-500' },
                          { key: 'reminders', label: t('customers_page.ui.k3o578q'), icon: Clock, color: 'text-amber-500' },
                          { key: 'statements', label: t('customers_page.ui.kzakz9w'), icon: DollarSign, color: 'text-purple-500' },
                          { key: 'payments', label: t('customers_page.ui.kksquah'), icon: Check, color: 'text-emerald-500' },
                        ].map(({ key, label, icon: Icon, color }) => {
                          const isOn = selectedCustomer.whatsapp?.notifications?.[key] !== false;
                          return (
                            <button
                              key={key}
                              onClick={async () => {
                                try {
                                  await customersApi.updateWhatsAppPreferences(selectedCustomer._id, { notifications: { [key]: !isOn } });
                                  setSelectedCustomer(prev => ({
                                    ...prev,
                                    whatsapp: {
                                      ...prev.whatsapp,
                                      notifications: { ...(prev.whatsapp?.notifications || {}), [key]: !isOn },
                                    },
                                  }));
                                  notify.success(t('customers_page.whatsapp.toggle_success', { action: !isOn ? t('customers_page.whatsapp.activate') : t('customers_page.whatsapp.deactivate'), label }));
                                } catch { notify.error(t('customers_page.whatsapp.update_error')); }
                              }}
                              className={`p-3 rounded-xl border-2 transition-all text-center ${isOn
                                ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
                                : 'app-surface-muted border-gray-200 dark:border-gray-700 opacity-60'}`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-1 ${isOn ? color : 'text-gray-400'}`} />
                              <p className="text-xs font-medium">{label}</p>
                              <p className={`text-[10px] mt-0.5 ${isOn ? 'text-green-600' : 'text-gray-400'}`}>{isOn ? t('customers_page.whatsapp.on') : t('customers_page.whatsapp.off')}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Transaction History with Invoice Details */}
                  <Card className="p-5">
                    <h3 className="font-bold flex flex-wrap items-center gap-2 mb-4 dark:text-white">
                      <History className="w-5 h-5 text-primary-500" />
                      {t('customers_page.transactions.title', { count: customerTransactions.length })}
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-normal mr-2">{t('customers_page.transactions.hint')}</span>
                    </h3>
                    {customerTransactions.length === 0 ? (
                      <p className="text-center text-gray-400 py-6 dark:text-gray-500">{t('customers_page.transactions.empty')}</p>
                    ) : (
                      <div className="space-y-3">
                        {customerTransactions.map((inv) => (
                          <div key={inv._id} className="app-surface rounded-xl overflow-hidden">
                            {/* Invoice Header - Clickable */}
                            <div
                              className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/30 sm:flex-row sm:items-center sm:justify-between"
                              onClick={() => toggleInvoiceExpand(inv._id)}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : inv.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-primary-600 dark:text-primary-400">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(inv.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="text-left">
                                  <p className="font-bold dark:text-white">{fmt(inv.totalAmount)} ج.م</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{inv.items?.length || 0} منتج</p>
                                </div>
                                <div className="text-left">
                                  {statusBadge(inv.status)}
                                </div>
                                <div className="text-left min-w-[80px]">
                                  {inv.remainingAmount > 0 ? (
                                    <p className="text-red-500 dark:text-red-400 font-semibold text-sm">متبقي: {fmt(inv.remainingAmount)}</p>
                                  ) : (
                                    <p className="text-emerald-500 dark:text-emerald-400 font-semibold text-sm">✓ مسدد</p>
                                  )}
                                </div>
                                {expandedInvoice === inv._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                              </div>
                            </div>

                            {/* Invoice Details - Expandable */}
                            {expandedInvoice === inv._id && (
                              <div className="app-surface-muted border-t p-4 dark:border-gray-800">
                                {/* Items Table */}
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2 dark:text-white"><Package className="w-4 h-4" />{t('customers_page.ui.kg740vd')}</h4>
                                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2 dark:text-white"><Package className="w-4 h-4" />{t('customers_page.transactions.products_title')}</h4>
                                  <div className="app-surface rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                    <table className="w-full min-w-[520px] text-sm">
                                      <thead>
                                        <tr className="app-surface-muted border-b dark:border-gray-800">
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{t('customers_page.ui.kaawv6o')}</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{t('customers_page.ui.kaay54y')}</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{t('customers_page.ui.kovdxm6')}</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{t('customers_page.ui.krh6w30')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(inv.items || []).map((item, idx) => (
                                          <tr key={idx} className="border-b border-gray-50 dark:border-gray-800">
                                            <td className="px-3 py-2">
                                              <span className="font-semibold dark:text-white">{item.productName || item.product?.name || t('customers_page.toasts.ktezs3')}</span>
                                              {item.sku && <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">({item.sku})</span>}
                                            </td>
                                            <td className="px-3 py-2 dark:text-gray-200">{item.quantity}</td>
                                            <td className="px-3 py-2 dark:text-gray-200">{fmt(item.unitPrice)} ج.م</td>
                                            <td className="px-3 py-2 font-bold dark:text-white">{fmt(item.totalPrice)} ج.م</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                                  <div className="app-surface rounded-lg p-2 dark:bg-gray-800/40">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('customers_page.ui.krh6w30')}</p>
                                    <p className="font-bold dark:text-white">{fmt(inv.totalAmount)} ج.م</p>
                                  </div>
                                  <div className="app-surface rounded-lg p-2 dark:bg-gray-800/40">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('customers_page.ui.kza8sl1')}</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(inv.paidAmount)} ج.م</p>
                                  </div>
                                  <div className="app-surface rounded-lg p-2 dark:bg-gray-800/40">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('customers_page.ui.kzaci6q')}</p>
                                    <p className="font-bold text-red-500 dark:text-red-400">{fmt(inv.remainingAmount)} ج.م</p>
                                  </div>
                                  <div className="app-surface rounded-lg p-2 dark:bg-gray-800/40">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('customers_page.ui.kfj3di7')}</p>
                                    <p className="font-bold dark:text-white">{inv.paymentMethod === 'cash' ? t('customers_page.ui.ky6er') : inv.paymentMethod === 'cash_on_delivery' ? t('customers_page.ui.kwcxwov') : inv.paymentMethod === 'installment' ? t('customers_page.ui.kot5guc') : 'آجل'}</p>
                                  </div>
                                </div>

                                {/* Installments if any */}
                                {inv.paymentMethod === 'installment' && inv.installments?.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-bold mb-2 dark:text-white">{t('customers_page.ui.kscov5g')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {inv.installments.map((inst, idx) => (
                                        <div key={idx} className={`px-3 py-2 rounded-lg text-xs ${inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : inst.status === 'overdue' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                          <span className="font-bold">قسط {inst.installmentNumber}</span>
                                          <span className="mx-2">•</span>
                                          <span>{fmt(inst.amount)} ج.م</span>
                                          <span className="mx-2">•</span>
                                          <span>{new Date(inst.dueDate).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>

            {/* Hidden Print Content */}
            <div className="hidden">
              <div ref={printRef}>
                <div className="header">
                  <h1>{t('customers_page.ui.ktnkg0c')}</h1>
                  <p>PayQusta — نظام إدارة المبيعات والأقساط</p>
                </div>
                <div className="info-grid">
                  <div className="info-box"><label>{t('customers_page.ui.kcn27ee')}</label><span>{selectedCustomer.name}</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.k3pahhc')}</label><span dir="ltr">{selectedCustomer.phone}</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.kabct8k')}</label><span>{selectedCustomer.tier === 'vip' ? '⭐ VIP' : selectedCustomer.tier === 'premium' ? t('customers_page.ui.ktezt4') : 'عادي'}</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.k861ybb')}</label><span>{fmt(selectedCustomer.financials?.totalPurchases)} ج.م</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.khtnkti')}</label><span style={{ color: 'green' }}>{fmt(selectedCustomer.financials?.totalPaid)} ج.م</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.kzaci6q')}</label><span style={{ color: (selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'red' : 'green' }}>{fmt(selectedCustomer.financials?.outstandingBalance)} ج.م</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.k9zpd1v')}</label><span>{fmt(selectedCustomer.financials?.creditLimit || 10000)} ج.م</span></div>
                  <div className="info-box"><label>{t('customers_page.ui.kxf0jhy')}</label><span>{fmt(selectedCustomer.wallet?.balance || 0)} ج.م</span></div>
                </div>
                <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>{t('customers_page.ui.kegflcz')}</h3>
                {customerTransactions.map((inv) => (
                  <div key={inv._id} style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '10px' }}>
                    <p><strong>فاتورة: {inv.invoiceNumber}</strong> — {new Date(inv.createdAt).toLocaleDateString('ar-EG')}</p>
                    <table className="items-table" style={{ marginTop: '10px' }}>
                      <thead><tr><th>{t('customers_page.ui.kaawv6o')}</th><th>{t('customers_page.ui.kaay54y')}</th><th>{t('customers_page.ui.kovdxm6')}</th><th>{t('customers_page.ui.krh6w30')}</th></tr></thead>
                      <tbody>
                        {(inv.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.productName || t('customers_page.toasts.ktezs3')}</td>
                            <td>{item.quantity}</td>
                            <td>{fmt(item.unitPrice)} ج.م</td>
                            <td>{fmt(item.totalPrice)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ marginTop: '5px' }}>
                      <strong>{t('customers_page.ui.kkf12q')}</strong> {fmt(inv.totalAmount)} ج.م |
                      <strong className="paid"> المدفوع:</strong> {fmt(inv.paidAmount)} ج.م |
                      <strong className={inv.remainingAmount > 0 ? 'overdue' : 'paid'}> المتبقي:</strong> {fmt(inv.remainingAmount)} ج.م
                    </p>
                  </div>
                ))}
                <div className="footer" style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px', color: '#999' }}>
                  <p>تم إنشاء هذا الكشف بواسطة PayQusta — {new Date().toLocaleString('ar-EG')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Date Range Modal - Moved to end for Z-Index */}
      <Modal open={showDateModal} onClose={() => setShowDateModal(false)} title={t('customers_page.date_modal.title')}>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-sm">
            <p>{t('customers_page.date_modal.hint_before')} <b>{t('customers_page.date_modal.hint_bold')}</b>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('customers_page.date_modal.from')}
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
            />
            <Input
              label={t('customers_page.date_modal.to')}
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowDateModal(false)}>{t('customers_page.actions.cancel')}</Button>
          <Button onClick={executeAction}>{t('customers_page.date_modal.confirm')} {actionType === 'print' ? t('customers_page.actions.print') : t('customers_page.actions.send')}</Button>
        </div>
      </Modal>
    </div>
  );
}
