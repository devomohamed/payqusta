import React, { useState, useEffect, useCallback } from 'react';
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

const termsLabel = {
  cash: 'نقد', deferred_15: 'آجل 15 يوم', deferred_30: 'آجل 30 يوم',
  deferred_45: 'آجل 45 يوم', deferred_60: 'آجل 60 يوم', installment: 'أقساط',
};

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'نشط' },
  { key: 'stopped', label: 'متوقف' },
  { key: 'balance', label: 'له مستحقات' },
];

export default function SuppliersPage() {
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
    } catch { toast.error('خطأ في تحميل الموردين'); }
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
    if (!form.name || form.name.trim().length < 2) return toast.error('اسم المورد يجب أن يكون حرفين على الأقل');
    if (!form.phone) return toast.error('رقم الهاتف مطلوب');

    // Phone format validation (starting with 010, 011, 012, 015 and 11 digits)
    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!phoneRegex.test(form.phone)) {
      return toast.error('رقم الهاتف غير صحيح (يجب أن يبدأ بـ 010/011/012/015 ويتكون من 11 رقم)');
    }

    // Email validation (if provided)
    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        return toast.error('البريد الإلكتروني غير صحيح');
      }
    }

    setSaving(true);
    try {
      if (editId) { await suppliersApi.update(editId, form); toast.success('تم تحديث المورد ✅'); }
      else { await suppliersApi.create(form); toast.success('تم إضافة المورد ✅'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handlePayAll = async (id) => {
    notify.custom({
      type: 'warning', title: 'تأكيد سداد المستحقات',
      message: 'هل تريد تأكيد سداد كل المستحقات لهذا المورد؟',
      duration: 10000,
      action: {
        label: 'تأكيد السداد',
        onClick: async () => {
          try { await suppliersApi.payAll(id); notify.success('تم سداد كل المستحقات بنجاح! ✅', 'تم السداد'); load(); }
          catch (err) { notify.error(err.response?.data?.message || 'فشل السداد', 'خطأ'); }
        },
      },
    });
  };

  const handleReminder = async (id) => {
    const tid = toast.loading('جاري الإرسال...');
    try {
      const res = await suppliersApi.sendReminder(id);
      if (res.data.data?.whatsappStatus) toast.error(res.data.message, { id: tid });
      else toast.success('تم إرسال التذكير ✅', { id: tid });
    } catch { toast.error('فشل في إرسال التذكير', { id: tid }); }
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
    } catch { toast.error('خطأ في تحميل بيانات المورد'); }
    finally { setProductsLoading(false); }
  };

  const handleStatement = async (id) => {
    setStatementLoading(true);
    setShowStatement(true);
    try {
      const res = await suppliersApi.getStatement(id);
      setStatementData(res.data.data);
    } catch (err) {
      toast.error('حدث خطأ أثناء تحميل كشف الحساب');
      setShowStatement(false);
    } finally {
      setStatementLoading(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary-600" />
            إدارة الموردين
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {pagination.totalItems} مورد مسجل
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> إضافة مورد
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === t.key
              ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">كل الفئات</option>
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

      {/* ── List ── */}
      {loading ? (
        <LoadingSpinner />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="لا يوجد موردين"
          description={search || categoryFilter ? 'لا نتائج للبحث الحالي' : 'ابدأ بإضافة أول مورد'}
          action={canEdit ? { label: 'إضافة مورد', onClick: openAdd } : undefined}
        />
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            {suppliers.map((s, idx) => (
              <div key={s._id} className={idx !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}>

                {/* ── Row ── */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">

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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{s.name}</span>
                      <Badge variant={s.isActive !== false ? 'success' : 'danger'} className="text-[10px]">
                        {s.isActive !== false ? 'نشط' : 'متوقف'}
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
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
                    <div>
                      <p className="text-[9px] text-gray-400">المشتريات</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmt(s.financials?.totalPurchases)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStatement(s._id)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 transition-colors"
                      title="كشف حساب"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
                        title="تعديل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleReminder(s._id)}
                      className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600 transition-colors"
                      title="تذكير WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (s.financials?.outstandingBalance || 0) > 0 && (
                      <button
                        onClick={() => handlePayAll(s._id)}
                        className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600 transition-colors"
                        title="سداد كامل"
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
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">بيانات التواصل</p>
                            <div className="space-y-2">
                              {es.contactPerson && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Check className="w-3 h-3 text-primary-500" /></span>
                                  <span className="font-medium text-gray-500">المسؤول:</span> {es.contactPerson}
                                </div>
                              )}
                              {es.phone && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Phone className="w-3 h-3 text-primary-500" /></span>
                                  <span className="font-medium text-gray-500">الهاتف:</span> {es.phone}
                                </div>
                              )}
                              {es.email && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><Mail className="w-3 h-3 text-blue-500" /></span>
                                  <span className="font-medium text-gray-500">الإيميل:</span> {es.email}
                                </div>
                              )}
                              {es.address && (
                                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="w-5 h-5 mt-0.5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><MapPin className="w-3 h-3 text-red-500" /></span>
                                  <div><span className="font-medium text-gray-500">العنوان:</span> {es.address}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">نظام العمل</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="w-5 h-5 rounded bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm"><CreditCard className="w-3 h-3 text-amber-500" /></span>
                                <span className="font-medium text-gray-500">شروط الدفع:</span> {termsLabel[es.paymentTerms] || es.paymentTerms}
                              </div>
                            </div>
                            {es.notes && (
                              <div className="mt-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mb-1">ملاحظات:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{es.notes}"</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">التصنيفات</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(es.productCategories || []).map((cat) => (
                                <span key={cat._id} className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-semibold text-gray-500 shadow-sm">
                                  {cat.icon || '📦'} {cat.name}
                                </span>
                              ))}
                              {(es.productCategories || []).length === 0 && <span className="text-xs text-gray-400">لا يوجد تصنيفات محددة</span>}
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
                        <p className="text-center text-xs text-gray-400 py-4 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">لا توجد منتجات مسجلة لهذا المورد</p>
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
                                    ? <Badge variant="danger" className="text-[9px]">نفذ</Badge>
                                    : p.stockStatus === 'low_stock'
                                      ? <Badge variant="warning" className="text-[9px]">منخفض</Badge>
                                      : <Badge variant="success" className="text-[9px]">متوفر</Badge>}
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'تعديل مورد' : 'إضافة مورد جديد'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="اسم المورد *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
          <Input label="جهة الاتصال" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <Input label="رقم الهاتف *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select
            label="شروط الدفع"
            value={form.paymentTerms}
            onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            options={Object.entries(termsLabel).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button onClick={handleSave} loading={saving}>
            <Check className="w-4 h-4" /> {editId ? 'تحديث' : 'إضافة'}
          </Button>
        </div>
      </Modal>

      {/* ── Statement Modal ── */}
      <Modal
        open={showStatement}
        onClose={() => setShowStatement(false)}
        title={statementLoading ? 'تحميل كشف الحساب...' : `كشف حساب معد برمجياً: ${statementData?.supplier?.name || ''}`}
        size="2xl"
      >
        {statementLoading || !statementData ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(statementData.summary.totalPurchases)} ج.م</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">إجمالي المدفوع</p>
                <p className="text-sm font-bold text-green-600">{fmt(statementData.summary.totalPaid)} ج.م</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-1">الرصيد المستحق الدفع</p>
                <p className={`text-sm font-bold ${statementData.summary.outstandingBalance > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {fmt(statementData.summary.outstandingBalance)} ج.م
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {statementData.statement.length === 0 ? (
                <EmptyState icon={FileText} title="لا توجد حركات" description="لم يتم تسجيل أي فواتير أو دفعات لهذا المورد حتى الآن." />
              ) : (
                <div className="w-full text-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/80 font-bold border-b border-gray-100 dark:border-gray-800 grid grid-cols-5 p-3 text-xs text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">التاريخ</div>
                    <div className="col-span-2">البيان / الحركة</div>
                    <div className="col-span-1 text-center">المبلغ</div>
                    <div className="col-span-1 text-left">الرصيد للمورد</div>
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
              <Button variant="ghost" onClick={() => setShowStatement(false)}>إغلاق</Button>
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
