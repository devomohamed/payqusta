import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Save, AlertTriangle, CheckSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, useAuthStore } from '../store';
import { Button, Card, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import { confirm } from '../components/ConfirmDialog';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';

export default function StocktakePage() {
    const { user } = useAuthStore();
    const [selectedBranchId, setSelectedBranchId] = useState(user?.branch || '');

    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [categories, setCategories] = useState([]);
    const [stockCounts, setStockCounts] = useState({});
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState({ totalItems: 0, pendingReview: 0 });

    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Get all products. We use a high limit to get everything for stocktake.
            const params = { limit: 1000, search: debouncedSearch };
            if (categoryFilter) params.category = categoryFilter;

            const [prodRes, catRes] = await Promise.all([
                productsApi.getAll(params),
                productsApi.getCategories()
            ]);

            const data = prodRes.data.data || [];
            setProducts(data);
            setCategories(catRes.data.data || []);

            // Fetch branches if not locked to one
            if (!user?.branch) {
                const branchRes = await api.get('/settings/branches');
                const fetchedBranches = branchRes.data.data || [];
                setBranches(fetchedBranches);

                // Set default branch if clear
                if (!selectedBranchId && fetchedBranches.length > 0) {
                    // Update state, the actual data load will rely on the next effect cycle, 
                    // but we can compute counts here manually if needed.
                    setSelectedBranchId(fetchedBranches[0]._id);
                }
            }

            // Initialize stockCounts with current system quantities (branch-aware)
            // Use the currently targeted branch for counts
            setStockCounts((prev) => {
                const newCounts = { ...prev };
                data.forEach((p) => {
                    const currentTargetBranch = selectedBranchId || (branches.length > 0 ? branches[0]._id : null);

                    if (currentTargetBranch) {
                        const branchInv = p.inventory?.find(inv =>
                            (inv.branch?._id || inv.branch) === currentTargetBranch
                        );
                        newCounts[p._id] = branchInv ? branchInv.quantity : 0;
                    } else {
                        // Fallback if absolutely no branch is set yet globally
                        newCounts[p._id] = p.stock?.quantity || 0;
                    }
                });
                return newCounts;
            });

            setStats({
                totalItems: data.length,
                pendingReview: data.length // Initially all pending
            });

        } catch (err) {
            console.error('Stocktake load error:', err);
            toast.error('خطأ في تحميل بيانات المنتجات للجرد');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, categoryFilter, selectedBranchId, user?.branch]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleQuantityChange = (id, value) => {
        setStockCounts({ ...stockCounts, [id]: Number(value) || 0 });
    };

    const handleSaveStocktake = async () => {
        if (!selectedBranchId) {
            return toast.error('يرجى تحديد الفرع أولاً قبل حفظ الجرد.');
        }

        // Find products where actual quantity differs from system quantity
        const discrepancies = products.map((p) => {
            let current = 0;
            const branchInv = p.inventory?.find(inv => inv.branch === selectedBranchId || inv.branch?._id === selectedBranchId);
            current = branchInv ? branchInv.quantity : 0;

            const actual = stockCounts[p._id];
            if (actual !== undefined && current !== actual) {
                return { productId: p._id, actualQuantity: actual };
            }
            return null;
        }).filter(Boolean);

        if (discrepancies.length === 0) {
            return toast.success('جميع الكميات مطابقة للمخزون النظامي، لا يوجد ما يتم تحديثه.');
        }

        const ok = await confirm.warn(`هل أنت متأكد من حفظ الجرد المكون من ${discrepancies.length} صنف مختلف؟`, 'تأكيد حفظ الجرد');
        if (!ok) return;

        setSaving(true);
        const loadToast = toast.loading('جاري تحديث المخزون...');

        try {
            const res = await productsApi.stocktake({ items: discrepancies, branchId: selectedBranchId });
            toast.success(res.data.message || 'تم تحديث المخزون بنجاح', { id: loadToast });
            // Reset local counts so they sync back with server
            setStockCounts({});
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فضل تحديث عملية الجرد', { id: loadToast });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = products.some(p => {
        if (!selectedBranchId) return false;

        const act = stockCounts[p._id];
        const branchInv = p.inventory?.find(inv => inv.branch === selectedBranchId || inv.branch?._id === selectedBranchId);
        const current = branchInv ? branchInv.quantity : 0;

        return act !== undefined && act !== current;
    });

    useUnsavedWarning(hasChanges, 'stocktake');

    return (
        <div className="space-y-5 animate-fade-in relative pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-mona text-gray-800 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-6 h-6 text-primary-500" />
                        الجرد الشامل للمخزن
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">سجل الكميات الفعلية الموجودة لتحديث النظام مرة واحدة.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {!user?.branch && branches.length > 0 && (
                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 font-bold text-primary-700 dark:text-primary-400 text-sm cursor-pointer min-w-[150px]"
                    >
                        <option value="" disabled>🏪 اختر الفرع לגرد</option>
                        {branches.map(b => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                    </select>
                )}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالكود أو الاسم..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary-500 transition-all"
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer"
                >
                    <option value="">📂 كل الفئات</option>
                    {categories.map((cat) => {
                        const id = cat?._id || cat;
                        const name = cat?.name || cat;
                        return (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        );
                    })}
                </select>

                <div className="mr-auto text-sm text-gray-500 font-semibold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
                    إجمالي الأصناف: <span className="text-primary-500">{stats.totalItems}</span>
                </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                    <h4 className="font-bold text-amber-800">تنبيه الجرد</h4>
                    <p className="text-sm text-amber-700 mt-1">سيتم استبدال كل كميات المخزون للنظام بالكمية "الفعلية" التي تدخلها هنا. تحقق جيداً قبل الحفظ النهائي.</p>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : products.length === 0 ? (
                <EmptyState icon={<Package className="w-8 h-8" />} title="لا توجد منتجات" description="لا نتائج للفلاتر المحددة" />
            ) : (
                <Card className="overflow-hidden border-2 border-gray-200 dark:border-gray-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-gray-500 bg-gray-50/50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-4 font-bold rounded-tr-xl">المنتج & الكود</th>
                                    <th className="px-4 py-4 font-bold">الفئة</th>
                                    <th className="px-4 py-4 font-bold text-center">الكمية النظامية</th>
                                    <th className="px-4 py-4 font-bold text-center">الكمية الفعلية</th>
                                    <th className="px-4 py-4 font-bold text-center rounded-tl-xl truncate">الفرق</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                {products.map((p) => {
                                    const branchInv = p.inventory?.find(inv => inv.branch === selectedBranchId || inv.branch?._id === selectedBranchId);
                                    const systemQty = branchInv ? branchInv.quantity : 0;
                                    const actualQty = stockCounts[p._id] !== undefined ? stockCounts[p._id] : systemQty;
                                    const diff = actualQty - systemQty;

                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px]" title={p.name}>{p.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.sku || p.barcode || 'بدون كود'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {p.category?.name || p.category || 'بدون فئة'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono font-bold text-gray-700 dark:text-gray-300">
                                                    {systemQty}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center w-32">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={actualQty}
                                                    onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-20 text-center py-1.5 px-2 rounded-lg border-2 border-primary-200 focus:border-primary-500 bg-white dark:bg-gray-900 font-mono font-bold dark:border-primary-800 transition-colors"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center w-24">
                                                {diff === 0 ? (
                                                    <Badge variant="gray">متطابق</Badge>
                                                ) : diff > 0 ? (
                                                    <Badge variant="success">+{diff}</Badge>
                                                ) : (
                                                    <Badge variant="danger">{diff}</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Floating Action Bar - Only visible if changes made */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-2xl border-2 border-primary-200 dark:border-primary-800 flex items-center gap-6 animate-fade-in-up">
                    <div>
                        <p className="font-bold text-primary-700 dark:text-primary-400">توجد تعديلات غير محفوظة</p>
                        <p className="text-xs text-gray-500">تم تسجيل اختلافات عن النظام.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={loadData}>إعادة تعيين</Button>
                        <Button icon={<Save className="w-4 h-4" />} onClick={handleSaveStocktake} loading={saving}>اعتماد الجرد</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
