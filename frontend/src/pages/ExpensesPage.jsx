import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Edit2, Trash2, Filter, X, Calendar, TrendingDown, RefreshCw, Download } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { expensesApi } from '../store';
import { Card, Button, Badge, EmptyState, Modal, LoadingSpinner } from '../components/UI';
import Pagination from '../components/Pagination';

const CATEGORY_COLORS = {
  rent: '#6366f1', salaries: '#10b981', utilities: '#f59e0b', supplies: '#ec4899',
  marketing: '#8b5cf6', transport: '#14b8a6', maintenance: '#f97316', other: '#6b7280',
};
const CATEGORY_LABELS = {
  rent: '🏠 إيجار', salaries: '👥 رواتب', utilities: '💡 كهرباء/ماء', supplies: '📦 مستلزمات',
  marketing: '📢 تسويق', transport: '🚗 نقل', maintenance: '🔧 صيانة', other: '📋 أخرى',
};
import { format } from 'date-fns';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ category: '', from: format(new Date().setDate(1), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') });
  const [form, setForm] = useState({
    title: '', description: '', category: 'other', amount: '', date: new Date().toISOString().split('T')[0],
    frequency: 'once', isRecurring: false, paymentMethod: 'cash', reference: '',
  });

  useEffect(() => {
    loadExpenses();
    loadSummary();
    loadCategories();
  }, [page, filter]);

  const loadExpenses = async () => {
    try {
      const res = await expensesApi.getAll({ page, limit: 12, ...filter });
      setExpenses(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error('خطأ في تحميل المصروفات'); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try {
      const res = await expensesApi.getSummary({ from: filter.from, to: filter.to });
      setSummary(res.data.data);
    } catch { }
  };

  const loadCategories = async () => {
    try {
      const res = await expensesApi.getCategories();
      setCategories(res.data.data?.categories || []);
    } catch { }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return toast.error('العنوان والمبلغ مطلوبين');
    try {
      if (editItem) {
        await expensesApi.update(editItem._id, { ...form, amount: parseFloat(form.amount) });
        toast.success('تم تحديث المصروف');
      } else {
        await expensesApi.create({ ...form, amount: parseFloat(form.amount) });
        toast.success('تم إضافة المصروف');
      }
      closeModal();
      loadExpenses();
      loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const handleDelete = async (id) => {
    notify.custom({
      type: 'error',
      title: 'تأكيد الحذف',
      message: 'هل تريد حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.',
      duration: 10000,
      action: {
        label: 'تأكيد الحذف',
        onClick: async () => {
          try {
            await expensesApi.delete(id);
            notify.success('تم حذف المصروف بنجاح', 'تم الحذف');
            loadExpenses();
            loadSummary();
          } catch (err) {
            notify.error('فشل حذف المصروف', 'خطأ في الحذف');
          }
        },
      },
    });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || '', category: item.category,
      amount: item.amount, date: item.date?.split('T')[0] || '', frequency: item.frequency || 'once',
      isRecurring: item.isRecurring || false, paymentMethod: item.paymentMethod || 'cash', reference: item.reference || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm({ title: '', description: '', category: 'other', amount: '', date: new Date().toISOString().split('T')[0], frequency: 'once', isRecurring: false, paymentMethod: 'cash', reference: '' });
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  const exportCSV = () => {
    if (expenses.length === 0) return toast.error('لا توجد بيانات');
    const headers = ['العنوان', 'الفئة', 'المبلغ', 'التاريخ', 'طريقة الدفع'];
    const rows = expenses.map(e => [e.title, CATEGORY_LABELS[e.category] || e.category, e.amount, new Date(e.date).toLocaleDateString('ar-EG'), e.paymentMethod]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  };

  const pieData = summary?.byCategory?.map(c => ({ name: CATEGORY_LABELS[c._id] || c._id, value: c.total, color: CATEGORY_COLORS[c._id] || '#6b7280' })) || [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-rose-600 via-fuchsia-600 to-slate-950 px-5 py-6 text-white shadow-[0_28px_80px_-46px_rgba(225,29,72,0.9)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Receipt className="h-3.5 w-3.5" />
              مراقبة المصروفات والتكاليف
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">المصروفات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              تتبع الإنفاق اليومي والتشغيلي بصريًا مع قراءة أسرع على الهاتف وملخص أوضح للاتجاه المالي.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[470px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">إجمالي الفترة</p>
              <p className="mt-2 text-lg font-black">{fmt(summary?.total)} ج.م</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">عدد المصروفات</p>
              <p className="mt-2 text-2xl font-black">{fmt(summary?.count)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">النتائج الحالية</p>
              <p className="mt-2 text-lg font-black">{fmt(total)} سجل ظاهر</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button onClick={exportCSV} variant="outline" size="sm" className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/15">
            <Download className="w-4 h-4 ml-1" /> تصدير
          </Button>
          <Button onClick={() => setShowModal(true)} className="justify-center bg-white text-rose-700 hover:bg-white/90">
            <Plus className="w-4 h-4 ml-1" /> إضافة مصروف
          </Button>
        </div>
      </section>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="app-surface-muted p-4 border-2 border-rose-100 dark:border-rose-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">إجمالي الشهر</p>
                <p className="text-2xl font-black text-rose-600">{fmt(summary.total)}<span className="text-sm mr-1">ج.م</span></p>
              </div>
              <TrendingDown className="w-8 h-8 text-rose-300" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{summary.count} مصروف</p>
          </Card>
          <Card className="app-surface-muted p-4">
            <p className="text-xs text-gray-400 mb-2">توزيع حسب الفئة</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v.toLocaleString('ar-EG')} ج.م`} contentStyle={{ borderRadius: 12, fontSize: 11, fontFamily: 'Cairo' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingDown}
                title="لا توجد بيانات"
                description="سيظهر توزيع المصروفات هنا بعد تسجيل بيانات كافية."
                className="py-4"
              />
            )}
          </Card>
          <Card className="app-surface-muted p-4">
            <p className="text-xs text-gray-400 mb-2">أعلى الفئات</p>
            <div className="space-y-2">
              {(summary.byCategory || []).slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c._id] }} />
                  <span className="text-xs flex-1">{CATEGORY_LABELS[c._id] || c._id}</span>
                  <span className="text-xs font-bold">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="app-surface-muted p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-black text-gray-900 dark:text-white">فلاتر المصروفات</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">اختر الفئة أو راجع الفترة الحالية بسرعة من الهاتف.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filter.category} onChange={(e) => { setFilter({ ...filter, category: e.target.value }); setPage(1); }}
            className="app-surface rounded-xl border-2 border-transparent px-3 py-2 text-sm">
            <option value="">كل الفئات</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {filter.category && (
            <button onClick={() => setFilter({ category: '' })} className="flex items-center gap-1 text-xs text-red-500 font-semibold">
              <X className="w-3 h-3" /> مسح الفلتر
            </button>
          )}
        </div>
      </Card>

      {/* Expenses List */}
      <Card className="p-5">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="لا توجد مصروفات"
            description="ابدأ بإضافة أول مصروف ليظهر السجل والتحليلات هنا."
            action={{ label: 'إضافة مصروف', onClick: () => setShowModal(true) }}
            className="px-4"
          />
        ) : (
          <div className="space-y-3">
            {expenses.map((exp) => (
              <div key={exp._id} className="app-surface-muted flex flex-col gap-4 rounded-2xl border-2 border-transparent p-4 transition-all duration-200 hover:border-gray-200/80 hover:-translate-y-0.5 dark:hover:border-white/10 sm:flex-row sm:items-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${CATEGORY_COLORS[exp.category] || '#6b7280'}20` }}>
                  {(CATEGORY_LABELS[exp.category] || '📋').split(' ')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{exp.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {CATEGORY_LABELS[exp.category] || exp.category} · {new Date(exp.date).toLocaleDateString('ar-EG')}
                    {exp.isRecurring && <Badge variant="info" className="mr-2">متكرر</Badge>}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <p className="text-lg font-extrabold text-rose-600">{fmt(exp.amount)}<span className="text-xs mr-0.5">ج.م</span></p>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(exp)} className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(exp._id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {total > 12 && <Pagination page={page} total={total} limit={12} onPageChange={setPage} />}
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal onClose={closeModal} title={editItem ? 'تعديل مصروف' : 'إضافة مصروف'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">العنوان *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: إيجار المحل"
                className="app-surface w-full rounded-xl border-2 border-transparent px-4 py-2.5 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">الفئة</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="app-surface w-full rounded-xl border-2 border-transparent px-3 py-2.5 text-sm">
                  {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">المبلغ *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0"
                  className="app-surface w-full rounded-xl border-2 border-transparent px-4 py-2.5 text-sm" required min="0" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">التاريخ</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="app-surface w-full rounded-xl border-2 border-transparent px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">طريقة الدفع</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="app-surface w-full rounded-xl border-2 border-transparent px-3 py-2.5 text-sm">
                  <option value="cash">نقد</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="card">بطاقة</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="w-4 h-4 rounded" />
              <label htmlFor="recurring" className="text-sm">مصروف متكرر</label>
              {form.isRecurring && (
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="app-surface rounded-lg border border-transparent px-2 py-1 text-xs">
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">ملاحظات</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                className="app-surface w-full resize-none rounded-xl border-2 border-transparent px-4 py-2.5 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">{editItem ? 'حفظ التعديلات' : 'إضافة المصروف'}</Button>
              <Button type="button" variant="outline" onClick={closeModal}>إلغاء</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
