import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    RefreshCcw, Plus, Search, Truck, Calendar, DollarSign,
    ChevronRight, X, Eye, FileText, ArrowLeft, Trash2, Printer,
    Filter, Building2, Package, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { purchaseReturnsApi, suppliersApi, productsApi, useAuthStore } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';

export default function PurchaseReturnsPage() {
  const { t } = useTranslation('admin');
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // New Return Form
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [form, setForm] = useState({
        supplierId: '',
        branchId: '',
        purchaseInvoiceId: '',
        reason: 'defective',
        notes: '',
        items: []
    });

    const [searchProduct, setSearchProduct] = useState('');
    const [foundProducts, setFoundProducts] = useState([]);
    const [searchingProduct, setSearchingProduct] = useState(false);

    const { getBranches } = useAuthStore();
    const LIMIT = 10;

    const loadReturns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await purchaseReturnsApi.getAll({ page, limit: LIMIT });
            setReturns(res.data.data || []);
            setPagination({
                totalPages: res.data.pagination?.totalPages || 1,
                totalItems: res.data.pagination?.totalItems || 0
            });
        } catch {
            toast.error(t('purchase_returns_page.toasts.ke6wkd8'));
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        loadReturns();
    }, [loadReturns]);

    useEffect(() => {
        if (showModal) {
            suppliersApi.getAll({ limit: 100 }).then(res => setSuppliers(res.data.data || []));
            getBranches?.().then(data => setBranches(Array.isArray(data) ? data : [])).catch(() => setBranches([]));
        }
    }, [showModal, getBranches]);

    const handleProductSearch = async (val) => {
        setSearchProduct(val);
        if (val.length < 1) {
            setFoundProducts([]);
            return;
        }
        setSearchingProduct(true);
        try {
            const res = await productsApi.getAll({ search: val, limit: 10 });
            setFoundProducts(res.data.data || []);
        } catch { }
        finally { setSearchingProduct(false); }
    };

    const addItem = (p) => {
        const exists = form.items.find(i => i.productId === p._id);
        if (exists) return toast.error(t('purchase_returns_page.toasts.k2q3mfw'));

        setForm({
            ...form,
            items: [
                ...form.items,
                {
                    productId: p._id,
                    name: p.name,
                    sku: p.sku,
                    quantity: 1,
                    unitCost: p.cost || 0,
                    variantId: null
                }
            ]
        });
        setSearchProduct('');
        setFoundProducts([]);
    };

    const removeItem = (index) => {
        const newItems = [...form.items];
        newItems.splice(index, 1);
        setForm({ ...form, items: newItems });
    };

    const updateItem = (index, field, val) => {
        const newItems = [...form.items];
        newItems[index][field] = val;
        setForm({ ...form, items: newItems });
    };

    const handleSave = async () => {
        if (!form.supplierId || !form.branchId || form.items.length === 0) {
            return toast.error(t('purchase_returns_page.toasts.k6cr946'));
        }
        setSaving(true);
        try {
            await purchaseReturnsApi.create(form);
            toast.success(t('purchase_returns_page.toasts.k2bpy75'));
            setShowModal(false);
            setForm({ supplierId: '', branchId: '', purchaseInvoiceId: '', reason: 'defective', notes: '', items: [] });
            loadReturns();
        } catch (err) {
            toast.error(err.response?.data?.message || t('purchase_returns_page.toasts.ktcqm3h'));
        } finally {
            setSaving(false);
        }
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const summary = useMemo(() => ({
        total: returns.length,
        items: returns.reduce((count, item) => count + Number(item.items?.length || 0), 0),
        amount: returns.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
    }), [returns]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-amber-600 via-orange-600 to-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(217,119,6,0.9)] sm:px-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Debit Notes والمردودات
                        </div>
                        <h1 className="mt-4 text-2xl font-black sm:text-3xl">{t('purchase_returns_page.ui.kj45kme')}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">{t('purchase_returns_page.ui.kgdishv')}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[470px]">
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                            <p className="text-xs font-bold text-white/65">{t('purchase_returns_page.ui.kskchgb')}</p>
                            <p className="mt-2 text-2xl font-black">{summary.total}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                            <p className="text-xs font-bold text-white/65">{t('purchase_returns_page.ui.kyheixi')}</p>
                            <p className="mt-2 text-2xl font-black">{summary.items}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                            <p className="text-xs font-bold text-white/65">{t('purchase_returns_page.ui.k40l9i5')}</p>
                            <p className="mt-2 text-lg font-black">{fmt(summary.amount)} ج.م</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button onClick={() => setShowModal(true)} className="justify-center bg-white text-amber-700 hover:bg-white/90">
                        <Plus className="w-4 h-4" /> تسجيل مرتجع جديد
                    </Button>
                </div>
            </section>

            {/* List */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                ) : returns.length === 0 ? (
                    <EmptyState
                        icon={RefreshCcw}
                        title={t('purchase_returns_page.titles.k1yzg6p')}
                        description="ابدأ بتسجيل أول عملية إرجاع للمورد لخصمها من المديونية"
                    />
                ) : (
                    <>
                    <div className="space-y-3 p-4 md:hidden">
                        {returns.map(r => (
                            <div key={r._id} className="app-surface-muted rounded-2xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{r.supplier?.name}</p>
                                        <p className="mt-1 text-[11px] text-gray-400">{r.returnNumber} · {new Date(r.date).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                                        <p className="text-[10px] text-gray-400">{t('purchase_returns_page.ui.kaaxgsq')}</p>
                                        <p className="mt-1 text-xs font-black text-red-500">{fmt(r.totalAmount)} ج.م</p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                                        <p className="text-[10px] text-gray-400">{t('purchase_returns_page.ui.ks0nri5')}</p>
                                        <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{r.items?.length} صنف</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4">{t('purchase_returns_page.ui.kaaxap6')}</th>
                                    <th className="px-6 py-4">{t('purchase_returns_page.ui.kaawtj6')}</th>
                                    <th className="px-6 py-4">{t('purchase_returns_page.ui.kzbvdnf')}</th>
                                    <th className="px-6 py-4">{t('purchase_returns_page.ui.kaaxgsq')}</th>
                                    <th className="px-6 py-4">{t('purchase_returns_page.ui.ks0nri5')}</th>
                                    <th className="px-6 py-4 text-center">{t('purchase_returns_page.ui.kvfmk6')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {returns.map(r => (
                                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                                        <td className="px-6 py-4 font-bold text-xs">{r.returnNumber}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-300">{r.supplier?.name}</td>
                                        <td className="px-6 py-4 text-[10px] text-gray-400">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-4 font-bold text-sm text-red-500">{fmt(r.totalAmount)} ج.م</td>
                                        <td className="px-6 py-4 text-xs">
                                            {r.items?.length} صنف مسترجع
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}

                {!loading && pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={t('purchase_returns_page.titles.k8c1lo9')}
                size="2xl"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label={t('purchase_returns_page.form.krzgpa0')}
                            value={form.supplierId}
                            onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                            options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                        />
                        <Select
                            label={t('purchase_returns_page.form.k8odzj8')}
                            value={form.branchId}
                            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                            options={branches.map(b => ({ value: b._id, label: b.name }))}
                        />
                        <Select
                            label={t('purchase_returns_page.form.kbrfofc')}
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            options={[
                                { value: 'defective', label: t('purchase_returns_page.ui.ke4xowz') },
                                { value: 'wrong_item', label: t('purchase_returns_page.ui.k8z3717') },
                                { value: 'expired', label: t('purchase_returns_page.ui.kd9vb97') },
                                { value: 'other', label: t('purchase_returns_page.ui.kv4u6t0') },
                            ]}
                        />
                        <Input
                            label={t('purchase_returns_page.form.notes')}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    {/* Product Search */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('purchase_returns_page.ui.ko79i1f')}</p>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                                placeholder={t('purchase_returns_page.placeholders.kotv1t0')}
                                value={searchProduct}
                                onChange={(e) => handleProductSearch(e.target.value)}
                            />
                            {searchingProduct && <div className="absolute left-3 top-1/2 -translate-y-1/2"><LoadingSpinner size="xs" /></div>}

                            {foundProducts.length > 0 && (
                                <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {foundProducts.map(p => (
                                        <button
                                            key={p._id}
                                            onClick={() => addItem(p)}
                                            className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-center transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-xs">📦</div>
                                                <div>
                                                    <p className="text-sm font-bold">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">#{p.sku}</p>
                                                </div>
                                            </div>
                                            <Plus className="w-4 h-4 text-primary-500" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    {form.items.length > 0 && (
                        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm bg-gray-50/30 dark:bg-gray-800/20">
                            <div className="space-y-3 p-3 md:hidden">
                                {form.items.map((item, idx) => (
                                    <div key={idx} className="rounded-2xl bg-white p-4 dark:bg-gray-900/70">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{item.name}</p>
                                                <p className="mt-1 text-[11px] text-gray-400">#{item.sku}</p>
                                            </div>
                                            <button onClick={() => removeItem(idx)} className="rounded-lg p-1 text-red-500 hover:bg-red-50 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                className="w-full rounded border border-gray-200 bg-white p-2 text-center dark:border-gray-700 dark:bg-gray-900"
                                                value={item.quantity}
                                                min="1"
                                                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                className="w-full rounded border border-gray-200 bg-white p-2 text-center dark:border-gray-700 dark:bg-gray-900"
                                                value={item.unitCost}
                                                onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                                            />
                                        </div>
                                        <p className="mt-3 text-xs font-black text-primary-600 dark:text-primary-400">{fmt(item.quantity * item.unitCost)} ج.م</p>
                                    </div>
                                ))}
                                <div className="rounded-2xl bg-primary-500/5 px-4 py-3 text-sm font-black text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                                    إجمالي قيمة المرتجع: {fmt(form.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0))} ج.م
                                </div>
                            </div>
                            <div className="hidden md:block">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-gray-100/50 dark:bg-gray-800/80 font-bold text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">{t('purchase_returns_page.ui.kaawv6o')}</th>
                                        <th className="px-4 py-3 text-center" style={{ width: '80px' }}>{t('purchase_returns_page.ui.kaay54y')}</th>
                                        <th className="px-4 py-3 text-center">{t('purchase_returns_page.ui.k202okv')}</th>
                                        <th className="px-4 py-3 text-left">{t('purchase_returns_page.ui.krh6w30')}</th>
                                        <th className="px-4 py-3" style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {form.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3 font-bold">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    className="w-full text-center p-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                    value={item.quantity}
                                                    min="1"
                                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    className="w-full text-center p-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                    value={item.unitCost}
                                                    onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-left font-black">{fmt(item.quantity * item.unitCost)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-primary-500/5 dark:bg-primary-500/10 font-bold border-t border-primary-500/20">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-left">{t('purchase_returns_page.ui.km0mdyt')}</td>
                                        <td className="px-4 py-3 text-left text-primary-600 dark:text-primary-400 text-sm">
                                            {fmt(form.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0))} ج.م
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowModal(false)}>{t('purchase_returns_page.ui.cancel')}</Button>
                        <Button onClick={handleSave} loading={saving}>
                            <Check className="w-4 h-4" /> تنفيذ الإرجاع
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
