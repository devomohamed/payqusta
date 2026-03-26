import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Truck, MessageCircle, Check, CreditCard, Package,
  ChevronDown, ChevronRight, X, Edit, Phone, Mail, MapPin, Tag,
  FileText, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { suppliersApi, categoriesApi, useAuthStore } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';

const getTermsLabel = (t) => ({
  cash: t('suppliers_page.ui.ky6er'), deferred_15: t('suppliers_page.ui.k5aqxyp'), deferred_30: t('suppliers_page.ui.k6637sa'),
  deferred_45: t('suppliers_page.ui.k6pvt5a'), deferred_60: t('suppliers_page.ui.k7l82yv'), installment: t('suppliers_page.ui.kot5guc'),
});

const getTabs = (t) => [
  { key: 'all', label: t('suppliers_page.ui.ksvtb2') },
  { key: 'active', label: t('suppliers_page.ui.ky62x') },
  { key: 'stopped', label: t('suppliers_page.ui.kpbflk2') },
  { key: 'balance', label: t('suppliers_page.ui.k6vpnu1') },
];

export default function SuppliersPage() {
  const { t } = useTranslation('admin');
  const termsLabel = useMemo(() => getTermsLabel(t), [t]);
  const tabs = useMemo(() => getTabs(t), [t]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: 'cash', notes: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showStatement, setShowStatement] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const { can } = useAuthStore();
  const canEdit = can('admin') || can('purchases');

  const LIMIT = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search, tab: activeTab, category: categoryFilter };
      const res = await suppliersApi.getAll(params);
      setSuppliers(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error(t('suppliers_page.toasts.k33qo33')); }
    finally { setLoading(false); }
  }, [page, search, activeTab, categoryFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, activeTab, categoryFilter]);
  useEffect(() => {
    categoriesApi.getTree().then((res) => setCategories(res.data.data || [])).catch(() => { });
  }, []);

  const openAdd = () => { setEditId(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: 'cash', notes: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditId(s._id); setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone, email: s.email || '', address: s.address || '', paymentTerms: s.paymentTerms || 'cash', notes: s.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    // Basic validations
    if (!form.name || form.name.trim().length < 2) return toast.error(t('suppliers_page.toasts.kj5zf4y'));
    if (!form.phone) return toast.error(t('suppliers_page.toasts.ktvs3le'));

    // Phone format validation (starting with 010, 011, 012, 015 and 11 digits)
    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!phoneRegex.test(form.phone)) {
      return toast.error(t('suppliers_page.toasts.kw8xn2f'));
    }

    // Email validation (if provided)
    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        return toast.error(t('suppliers_page.toasts.kdmeoqv'));
      }
    }

    setSaving(true);
    try {
      if (editId) { await suppliersApi.update(editId, form); toast.success(t('suppliers_page.toasts.kfbk8kl')); }
      else { await suppliersApi.create(form); toast.success(t('suppliers_page.toasts.kqltpu2')); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || t('suppliers_page.toasts.ktcqm3h')); }
    finally { setSaving(false); }
  };

  const handlePayAll = async (id) => {
    notify.custom({
      type: 'warning', title: t('suppliers_page.ui.kskk8fg'),
      message: t('suppliers_page.ui.k9r41l5'),
      duration: 10000,
      action: {
        label: t('suppliers_page.ui.k5h5smq'),
        onClick: async () => {
          try { await suppliersApi.payAll(id); notify.success(t('suppliers_page.ui.ky6i1wj'), t('suppliers_page.ui.kn97dui')); load(); }
          catch (err) { notify.error(err.response?.data?.message || t('suppliers_page.toasts.kdso0y8'), t('suppliers_page.ui.kxoca')); }
        },
      },
    });
  };

  const handleReminder = async (id) => {
    const tid = toast.loading(t('suppliers_page.ui.ktnxbjh'));
    try {
      const res = await suppliersApi.sendReminder(id);
      if (res.data.data?.whatsappStatus) toast.error(res.data.message, { id: tid });
      else toast.success(t('suppliers_page.ui.kup0m9h'), { id: tid });
    } catch { toast.error(t('suppliers_page.ui.kib6uxp'), { id: tid }); }
  };

  const toggleExpand = async (supplierId) => {
    if (expandedId === supplierId) {
      setExpandedId(null);
      setExpandedSupplier(null);
      setExpandedProducts([]);
      return;
    }
    setExpandedId(supplierId);
    setExpandedProducts([]);
    setExpandedSupplier(null);
    setProductsLoading(true);
    try {
      const res = await suppliersApi.getById(supplierId);
      const data = res.data.data;
      setExpandedSupplier(data);
      setExpandedProducts(data?.products || []);
    } catch { toast.error(t('suppliers_page.toasts.kh9f8l7')); }
    finally { setProductsLoading(false); }
  };

  const handleStatement = async (id) => {
    setStatementLoading(true);
    setShowStatement(true);
    try {
      const res = await suppliersApi.getStatement(id);
      setStatementData(res.data.data);
    } catch (err) {
      toast.error(t('suppliers_page.toasts.kawisd9'));
      setShowStatement(false);
    } finally {
      setStatementLoading(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const activeSuppliersCount = suppliers.filter((supplier) => supplier.isActive !== false).length;
  const outstandingSuppliersCount = suppliers.filter((supplier) => (supplier.financials?.outstandingBalance || 0) > 0).length;
  const visibleOutstandingBalance = suppliers.reduce((sum, supplier) => sum + Number(supplier.financials?.outstandingBalance || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">

      <section className="overflow-hidden rounded-[1.75rem] border border-white/50 bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-950 px-5 py-6 text-white shadow-[0_28px_70px_-42px_rgba(13,148,136,0.9)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Truck className="h-3.5 w-3.5" />
              {t('suppliers_page.ui.kdry1x9')}
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">{t('suppliers_page.ui.k8bn2jf')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              {t('suppliers_page.ui.k3hckmj')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[460px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('suppliers_page.ui.keurtk8')}</p>
              <p className="mt-2 text-2xl font-black">{pagination.totalItems.toLocaleString('ar-EG')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('suppliers_page.ui.k5iei53')}</p>
              <p className="mt-2 text-2xl font-black">{activeSuppliersCount.toLocaleString('ar-EG')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('suppliers_page.ui.kouvx4j')}</p>
              <p className="mt-2 text-lg font-black">{fmt(visibleOutstandingBalance)} ج.م</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {canEdit && (
            <Button onClick={openAdd} className="justify-center bg-white text-emerald-700 hover:bg-white/90">
              <Plus className="w-4 h-4" /> إضافة مورد
            </Button>
          )}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
            <CreditCard className="h-4 w-4" />
            {outstandingSuppliersCount.toLocaleString('ar-EG')} مورد لديهم مستحقات
          </div>
        </div>
      </section>

      {/* ── Tabs ── */}
      <div className="app-surface-muted overflow-x-auto rounded-2xl p-1 no-scrollbar">
        <div className="flex min-w-max items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`min-w-[118px] rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:flex-1 ${activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="app-surface rounded-[1.5rem] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-gray-900 dark:text-white">{t('suppliers_page.ui.km8ieyj')}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('suppliers_page.ui.k2zu5ee')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)]">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('suppliers_page.placeholders.kfyg5an')}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('suppliers_page.ui.ki151rw')}</option>
            {categories.map((cat) => (
              <React.Fragment key={cat._id}>
                <option value={cat._id}>{cat.icon} {cat.name}</option>
                {(cat.children || []).map(sub => (
                  <option key={sub._id} value={sub._id}>&nbsp;&nbsp;&nbsp;{sub.icon} {sub.name}</option>
                ))}
              </React.Fragment>
            ))}
          </select>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <LoadingSpinner />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={t('suppliers_page.titles.kz1yxrz')}
          description={search || categoryFilter ? t('suppliers_page.ui.k4vex1n') : 'ابدأ بإضافة أول مورد'}
          action={canEdit ? { label: t('suppliers_page.ui.kq5gczn'), onClick: openAdd } : undefined}
        />
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            {suppliers.map((s, idx) => (
              <div key={s._id} className={idx !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>

                {/* ── Row ── */}
                <div className="group flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 sm:flex-nowrap sm:items-center">

                  {/* Expand chevron */}
                  <button
                    onClick={() => toggleExpand(s._id)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    {expandedId === s._id
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                    {s.name?.charAt(0)}
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{s.name}</span>
                      <Badge variant={s.isActive !== false ? 'success' : 'danger'} className="text-[10px]">
                        {s.isActive !== false ? t('suppliers_page.ui.ky62x') : 'متوقف'}
                      </Badge>
                      {(s.financials?.outstandingBalance || 0) > 0 && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                          مستحق: {fmt(s.financials.outstandingBalance)} ج.م
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {s.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </span>
                      )}
                      {s.contactPerson && (
                        <span className="text-[11px] text-gray-400">{s.contactPerson}</span>
                      )}
                      <span className="text-[11px] text-gray-400">{termsLabel[s.paymentTerms] || s.paymentTerms}</span>
                      <span className="flex items-center gap-1 text-[11px] text-primary-500 font-semibold">
                        <Package className="w-3 h-3" /> {s.productsCount || 0} منتج
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:hidden">
                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center dark:bg-gray-800/60">
                        <p className="text-[10px] text-gray-400">{t('suppliers_page.ui.kopt9za')}</p>
                        <p className="mt-1 text-xs font-black text-gray-700 dark:text-gray-200">{fmt(s.financials?.totalPurchases)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center dark:bg-gray-800/60">
                        <p className="text-[10px] text-gray-400">{t('suppliers_page.ui.kza6qbw')}</p>
                        <p className="mt-1 text-xs font-black text-red-500">{fmt(s.financials?.outstandingBalance)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-2 py-2 text-center dark:bg-gray-800/60">
                        <p className="text-[10px] text-gray-400">{t('suppliers_page.ui.ks0nri5')}</p>
                        <p className="mt-1 text-xs font-black text-primary-600">{fmt(s.productsCount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
                    <div>
                      <p className="text-[9px] text-gray-400">{t('suppliers_page.ui.kopt9za')}</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmt(s.financials?.totalPurchases)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex w-full flex-wrap items-center justify-end gap-1 pt-1 sm:w-auto sm:flex-nowrap sm:pt-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      onClick={() => handleStatement(s._id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20"
                      title={t('suppliers_page.titles.kl13zfb')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-500 dark:hover:bg-gray-700"
                        title={t('suppliers_page.titles.edit')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleReminder(s._id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/20"
                      title={t('suppliers_page.titles.k7721e6')}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (s.financials?.outstandingBalance || 0) > 0 && (
                      <button
                        onClick={() => handlePayAll(s._id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/20"
                        title={t('suppliers_page.titles.kydw5oh')}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Expanded dropdown ── */}
                {expandedId === s._id && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 px-4 py-5 animate-fade-in space-y-6">

                    {/* -- Supplier Details Section -- */}
                    {(() => {
                      const es = expandedSupplier || s;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('suppliers_page.ui.kinzinz')}</p>
                            <div className="space-y-2">
                              {es.contactPerson && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Check className="w-3 h-3 text-primary-500" /></span>
                                  <span className="font-medium text-gray-500">{t('suppliers_page.ui.ksb74ez')}</span> {es.contactPerson}
                                </div>
                              )}
                              {es.phone && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Phone className="w-3 h-3 text-primary-500" /></span>
                                  <span className="font-medium text-gray-500">{t('suppliers_page.ui.kz9atp6')}</span> {es.phone}
                                </div>
                              )}
                              {es.email && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Mail className="w-3 h-3 text-blue-500" /></span>
                                  <span className="font-medium text-gray-500">{t('suppliers_page.ui.krxpen1')}</span> {es.email}
                                </div>
                              )}
                              {es.address && (
                                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 mt-0.5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><MapPin className="w-3 h-3 text-red-500" /></span>
                                  <div><span className="font-medium text-gray-500">{t('suppliers_page.ui.kxoo6rn')}</span> {es.address}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('suppliers_page.ui.k8s5bat')}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><CreditCard className="w-3 h-3 text-amber-500" /></span>
                                <span className="font-medium text-gray-500">{t('suppliers_page.ui.kvz2cn8')}</span> {termsLabel[es.paymentTerms] || es.paymentTerms}
                              </div>
                            </div>
                            {es.notes && (
                              <div className="mt-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mb-1">{t('suppliers_page.ui.kua4x18')}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{es.notes}"</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('suppliers_page.ui.k6310uw')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(es.productCategories || []).map((cat) => (
                                <span key={cat._id} className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-semibold text-gray-500 shadow-sm">
                                  {cat.icon || '📦'} {cat.name}
                                </span>
                              ))}
                              {(es.productCategories || []).length === 0 && <span className="text-xs text-gray-400">{t('suppliers_page.ui.k3u6lhw')}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* -- Products Section -- */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> قائمة المنتجات ({s.productsCount || 0})
                      </p>

                      {productsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                      ) : expandedProducts.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">{t('suppliers_page.ui.kfivjgv')}</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {expandedProducts.map((p) => (
                            <div
                              key={p._id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transition-colors shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-sm flex-shrink-0 opacity-80">
                                  📦
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                                  {p.sku && <p className="text-[10px] text-gray-400 font-mono">#{p.sku}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-xs font-bold text-primary-600 truncate">{fmt(p.price)} ج.م</p>
                                  <p className="text-[10px] text-gray-400">المخزون: {p.stock?.quantity ?? 0}</p>
                                </div>
                                <div className="hidden xs:block">
                                  {p.stockStatus === 'out_of_stock'
                                    ? <Badge variant="danger" className="text-[9px]">{t('suppliers_page.ui.ky6dx')}</Badge>
                                    : p.stockStatus === 'low_stock'
                                      ? <Badge variant="warning" className="text-[9px]">{t('suppliers_page.ui.kpbwxvm')}</Badge>
                                      : <Badge variant="success" className="text-[9px]">{t('suppliers_page.ui.kpbflir')}</Badge>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? t('suppliers_page.ui.kbkgdwn') : 'إضافة مورد جديد'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('suppliers_page.form.k4e4bqn')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
          <Input label={t('suppliers_page.form.ki589wg')} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <Input label={t('suppliers_page.form.k6l9xqi')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('suppliers_page.form.k8lvosz')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select
            label={t('suppliers_page.form.ka72x6e')}
            value={form.paymentTerms}
            onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            options={Object.entries(termsLabel).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Input label={t('suppliers_page.form.kzgfilf')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t('suppliers_page.ui.cancel')}</Button>
          <Button onClick={handleSave} loading={saving}>
            <Check className="w-4 h-4" /> {editId ? t('suppliers_page.ui.kowmk4t') : 'إضافة'}
          </Button>
        </div>
      </Modal>

      {/* ── Statement Modal ── */}
      <Modal
        open={showStatement}
        onClose={() => setShowStatement(false)}
        title={statementLoading ? t('suppliers_page.ui.k6vee96') : `كشف حساب معد برمجياً: ${statementData?.supplier?.name || ''}`}
        size="2xl"
      >
        {statementLoading || !statementData ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('suppliers_page.ui.k861ybb')}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(statementData.summary.totalPurchases)} ج.م</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('suppliers_page.ui.khtnkti')}</p>
                <p className="text-sm font-bold text-green-600">{fmt(statementData.summary.totalPaid)} ج.م</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-1">{t('suppliers_page.ui.ky8v8v8')}</p>
                <p className={`text-sm font-bold ${statementData.summary.outstandingBalance > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {fmt(statementData.summary.outstandingBalance)} ج.م
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {statementData.statement.length === 0 ? (
                <EmptyState icon={FileText} title={t('suppliers_page.titles.kjz1p5s')} description="لم يتم تسجيل أي فواتير أو دفعات لهذا المورد حتى الآن." />
              ) : (
                <div className="w-full text-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/80 font-bold border-b border-gray-100 dark:border-gray-800 grid grid-cols-5 p-3 text-xs text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">{t('suppliers_page.ui.kzbvdnf')}</div>
                    <div className="col-span-2">{t('suppliers_page.ui.krdjz96')}</div>
                    <div className="col-span-1 text-center">{t('suppliers_page.ui.kaaxgsq')}</div>
                    <div className="col-span-1 text-left">{t('suppliers_page.ui.kh6cfff')}</div>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 border-x border-b border-gray-100 dark:border-gray-800 rounded-b-xl bg-white dark:bg-gray-900">
                    {statementData.statement.map((t) => (
                      <div key={t._id} className="grid grid-cols-5 items-center p-3 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="col-span-1 text-gray-500">{new Date(t.date).toLocaleDateString('ar-EG')}</div>
                        <div className="col-span-2 flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white">{t.description}</span>
                          {t.reference && <span className="text-[10px] text-gray-400">المرجع: {t.reference}</span>}
                        </div>
                        <div className="col-span-1 text-center font-mono">
                          {t.type === 'invoice'
                            ? <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-1 py-0.5 rounded font-bold">+{fmt(t.amount)}</span>
                            : <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-1 py-0.5 rounded font-bold">-{fmt(t.amount)}</span>}
                        </div>
                        <div className="col-span-1 text-left font-bold text-gray-700 dark:text-gray-300 font-mono" dir="ltr">
                          {fmt(t.runningBalance)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowStatement(false)}>{t('suppliers_page.ui.close')}</Button>
              <Button onClick={() => window.print()} className="hidden sm:flex" variant="outline">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
