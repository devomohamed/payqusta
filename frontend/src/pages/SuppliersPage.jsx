import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Truck, MessageCircle, Check, CreditCard, Package, ChevronDown, ChevronUp, X, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { suppliersApi, productsApi, api } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';

const termsLabel = {
  cash: 'نقد', deferred_15: 'آجل 15 يوم', deferred_30: 'آجل 30 يوم',
  deferred_45: 'آجل 45 يوم', deferred_60: 'آجل 60 يوم', installment: 'أقساط',
};

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

  // Products panel
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const LIMIT = 8;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search };
      const res = await suppliersApi.getAll(params);
      setSuppliers(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error('خطأ في تحميل الموردين'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  // Load categories
  useEffect(() => {
    productsApi.getCategories().then((res) => setCategories(res.data.data || [])).catch(() => { });
  }, []);

  const openAdd = () => { setEditId(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: 'cash', notes: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditId(s._id); setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone, email: s.email || '', address: s.address || '', paymentTerms: s.paymentTerms || 'cash', notes: s.notes || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error('الاسم والهاتف مطلوبين');
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
      type: 'warning',
      title: 'تأكيد سداد المستحقات',
      message: 'هل تريد تأكيد سداد كل المستحقات لهذا المورد؟',
      duration: 10000,
      action: {
        label: 'تأكيد السداد',
        onClick: async () => {
          try {
            await suppliersApi.payAll(id);
            notify.success('تم سداد كل المستحقات بنجاح! ✅', 'تم السداد');
            load();
          } catch (err) {
            notify.error(err.response?.data?.message || 'فشل السداد', 'خطأ');
          }
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

  // Toggle products panel for a supplier
  const toggleProducts = async (supplierId) => {
    if (expandedSupplier === supplierId) { setExpandedSupplier(null); return; }
    setExpandedSupplier(supplierId);
    setProductsLoading(true);
    try {
      const res = await suppliersApi.getById(supplierId);
      setSupplierProducts(res.data.data?.products || []);
    } catch { toast.error('خطأ في تحميل منتجات المورد'); }
    finally { setProductsLoading(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const statusBadge = (s) => s === 'in_stock' ? <Badge variant="success">متوفر</Badge> : s === 'low_stock' ? <Badge variant="warning">منخفض</Badge> : <Badge variant="danger">نفذ</Badge>;

  // Filter suppliers by category if a filter is selected
  const filteredSuppliers = categoryFilter
    ? suppliers.filter((s) => (s.productCategories || []).includes(categoryFilter))
    : suppliers;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary-500 transition-all" />
        </div>

        {/* Category Filter */}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">كل الفئات</option>
          {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>

        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>إضافة مورد</Button>
      </div>

      {/* Suppliers Grid */}
      {loading ? <LoadingSpinner /> : filteredSuppliers.length === 0 ? (
        <EmptyState icon={<Truck className="w-8 h-8" />} title="لا يوجد موردين" description={search || categoryFilter ? 'لا نتائج للبحث' : 'أضف أول مورد'} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSuppliers.map((s) => (
              <Card key={s._id} className="overflow-hidden animate-fade-in">
                <div className="p-5">
                  {/* Supplier Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20">{s.name?.charAt(0)}</div>
                      <div>
                        <h4 className="font-bold">{s.name}</h4>
                        <p className="text-xs text-gray-400">{s.contactPerson || '—'} · {s.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={s.isActive !== false ? 'success' : 'danger'}>{s.isActive !== false ? 'نشط' : 'متوقف'}</Badge>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-500 transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                      <p className="text-[10px] text-gray-400">شروط الدفع</p>
                      <p className="text-xs font-bold mt-0.5">{termsLabel[s.paymentTerms] || s.paymentTerms}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                      <p className="text-[10px] text-gray-400">المشتريات</p>
                      <p className="text-xs font-bold mt-0.5">{fmt(s.financials?.totalPurchases)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center">
                      <p className="text-[10px] text-gray-400">المستحق</p>
                      <p className={`text-xs font-bold mt-0.5 ${(s.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {(s.financials?.outstandingBalance || 0) > 0 ? fmt(s.financials.outstandingBalance) : '✓'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-center">
                      <p className="text-[10px] text-gray-400">المنتجات</p>
                      <p className="text-xs font-extrabold text-primary-500 mt-0.5">{s.productsCount || 0}</p>
                    </div>
                  </div>

                  {/* Category Tags */}
                  {(s.productCategories || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.productCategories.map((cat) => (
                        <span key={cat} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold text-gray-500">
                          {cat === 'هواتف' ? '📱' : cat === 'لابتوب' ? '💻' : cat === 'تابلت' ? '📟' : cat === 'شاشات' ? '🖥️' : cat === 'إكسسوارات' ? '🎧' : '📦'} {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked Products Preview */}
                  {(s.productNames || []).length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-900/30">
                      <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <Package className="w-3 h-3" /> المنتجات المرتبطة ({s.productsCount || s.productNames.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.productNames.map((p, i) => (
                          <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${p.stockStatus === 'out_of_stock'
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                              : p.stockStatus === 'low_stock'
                                ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }`}>
                            {p.name}
                            <span className={`text-[9px] ${p.stockStatus === 'out_of_stock' ? 'text-red-400' :
                                p.stockStatus === 'low_stock' ? 'text-yellow-500' : 'text-gray-400'
                              }`}>
                              ({p.stockQty || 0})
                            </span>
                          </span>
                        ))}
                        {(s.productsCount || 0) > 10 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400">
                            +{s.productsCount - 10} أخرى
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => toggleProducts(s._id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${expandedSupplier === s._id
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                          : 'border-2 border-gray-200 dark:border-gray-700 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10'
                        }`}>
                      <Package className="w-3.5 h-3.5" />
                      {expandedSupplier === s._id ? 'إخفاء المنتجات' : `عرض المنتجات (${s.productsCount || 0})`}
                      {expandedSupplier === s._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleReminder(s._id)}
                      className="px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-600 hover:bg-green-100 transition-colors" title="تذكير WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    {(s.financials?.outstandingBalance || 0) > 0 && (
                      <button onClick={() => handlePayAll(s._id)}
                        className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 hover:bg-amber-100 transition-colors" title="سداد كامل">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Products Panel (expandable) */}
                {expandedSupplier === s._id && (
                  <div className="border-t-2 border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 px-5 py-4 animate-slide-up">
                    <h5 className="text-xs font-bold text-gray-400 mb-3">📦 منتجات {s.name}</h5>
                    {productsLoading ? (
                      <div className="flex items-center justify-center py-6"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
                    ) : supplierProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">لا توجد منتجات مسجلة لهذا المورد</p>
                    ) : (
                      <div className="space-y-2">
                        {supplierProducts.map((p) => (
                          <div key={p._id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-sm">
                                {p.name?.includes('آيفون') || p.name?.includes('سامسونج') ? '📱' : p.name?.includes('ماك') ? '💻' : p.name?.includes('آيباد') ? '📟' : p.name?.includes('شاشة') ? '🖥️' : '📦'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{p.name}</p>
                                <p className="text-[10px] text-gray-400">SKU: {p.sku || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <p className="text-sm font-bold text-primary-500">{fmt(p.price)} ج.م</p>
                                <p className="text-[10px] text-gray-400">مخزون: {p.stock?.quantity || 0}</p>
                              </div>
                              {statusBadge(p.stockStatus)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'تعديل مورد' : 'إضافة مورد جديد'} size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="اسم المورد *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
          <Input label="جهة الاتصال" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <Input label="رقم الهاتف *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="شروط الدفع" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            options={Object.entries(termsLabel).map(([v, l]) => ({ value: v, label: l }))} />
          <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>{editId ? 'تحديث' : 'إضافة'}</Button>
        </div>
      </Modal>
    </div>
  );
}
