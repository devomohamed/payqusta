import React, { useState, useEffect, useCallback } from 'react';
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
            toast.error('خطأ في تحميل المرتجعات');
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
        if (exists) return toast.error('المنتج مضاف بالفعل');

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
            return toast.error('يرجى ملء كافة البيانات والمنتجات');
        }
        setSaving(true);
        try {
            await purchaseReturnsApi.create(form);
            toast.success('تم تسجيل المرتجع بنجاح ✅');
            setShowModal(false);
            setForm({ supplierId: '', branchId: '', purchaseInvoiceId: '', reason: 'defective', notes: '', items: [] });
            loadReturns();
        } catch (err) {
            toast.error(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setSaving(false);
        }
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <RefreshCcw className="w-6 h-6 text-primary-600" />
                        مرتجعات الشراء (Debit Notes)
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">إدارة مرتجعات السلع للموردين وتسوية المديونيات</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4" /> تسجيل مرتجع جديد
                </Button>
            </div>

            {/* List */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                ) : returns.length === 0 ? (
                    <EmptyState
                        icon={RefreshCcw}
                        title="لا توجد مرتجعات مسجلة"
                        description="ابدأ بتسجيل أول عملية إرجاع للمورد لخصمها من المديونية"
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4">المرجع</th>
                                    <th className="px-6 py-4">المورد</th>
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">المبلغ</th>
                                    <th className="px-6 py-4">المنتجات</th>
                                    <th className="px-6 py-4 text-center">الإجراءات</th>
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
                title="تسجيل مرتجع شراء جديد"
                size="2xl"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="المورد *"
                            value={form.supplierId}
                            onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                            options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                        />
                        <Select
                            label="الفرع (المخزن المسترجع منه) *"
                            value={form.branchId}
                            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                            options={branches.map(b => ({ value: b._id, label: b.name }))}
                        />
                        <Select
                            label="سبب الإرجاع"
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            options={[
                                { value: 'defective', label: 'منتج تالف / عيب صناعة' },
                                { value: 'wrong_item', label: 'منتج خاطئ' },
                                { value: 'expired', label: 'منتهي الصلاحية' },
                                { value: 'other', label: 'أخرى (اكتب في الملاحظات)' },
                            ]}
                        />
                        <Input
                            label="ملاحظات"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    {/* Product Search */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">إضافة منتجات للمرتجع</p>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                                placeholder="ابحث عن المنتج بالاسم أو الباركود..."
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
                            <table className="w-full text-right text-xs">
                                <thead className="bg-gray-100/50 dark:bg-gray-800/80 font-bold text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">المنتج</th>
                                        <th className="px-4 py-3 text-center" style={{ width: '80px' }}>الكمية</th>
                                        <th className="px-4 py-3 text-center">التكلفة (الوحدة)</th>
                                        <th className="px-4 py-3 text-left">الإجمالي</th>
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
                                        <td colSpan={3} className="px-4 py-3 text-left">إجمالي قيمة المرتجع</td>
                                        <td className="px-4 py-3 text-left text-primary-600 dark:text-primary-400 text-sm">
                                            {fmt(form.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0))} ج.م
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
                        <Button onClick={handleSave} loading={saving}>
                            <Check className="w-4 h-4" /> تنفيذ الإرجاع
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
