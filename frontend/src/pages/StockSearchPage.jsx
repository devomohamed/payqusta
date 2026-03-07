import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, MapPin, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, useAuthStore } from '../store';
import { Card, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import Pagination from '../components/Pagination';

export default function StockSearchPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
    const LIMIT = 10;
    const tenantId = useAuthStore((state) => state.tenant?._id || state.tenant?.id || '');

    const resolveBranchName = useCallback((branchRef) => {
        const branchId = typeof branchRef === 'string' ? branchRef : (branchRef?._id || '');
        if (branchRef?.name) return branchRef.name;
        if (branchId && tenantId && String(branchId) === String(tenantId)) return 'الفرع الرئيسي';
        return branchId ? 'فرع غير معروف' : 'الفرع الرئيسي';
    }, [tenantId]);

    const toCategoryName = (category) => {
        if (!category) return '—';
        if (typeof category === 'string') return category;
        if (typeof category === 'object') return category.name || '—';
        return String(category);
    };

    const toCategoryIcon = (category) => {
        if (category && typeof category === 'object' && typeof category.icon === 'string') {
            return category.icon;
        }
        const name = toCategoryName(category);
        if (name === 'هواتف') return '📱';
        if (name === 'لابتوب') return '💻';
        return '📦';
    };

    const loadProducts = useCallback(async () => {
        if (!search && page === 1 && products.length > 0) return;
        setLoading(true);
        try {
            const params = { page, limit: LIMIT, search };
            const res = await productsApi.getAll(params);
            const normalizedProducts = (res.data.data || []).map((product) => ({
                ...product,
                categoryName: toCategoryName(product.category),
                categoryIcon: toCategoryIcon(product.category),
                availabilityRows: (Array.isArray(product.inventory) && product.inventory.length > 0)
                    ? product.inventory.map((inv) => ({
                        branchName: resolveBranchName(inv?.branch),
                        quantity: Number(inv?.quantity) || 0,
                        minQuantity: Number(inv?.minQuantity) || 5,
                    }))
                    : [{
                        branchName: 'الفرع الرئيسي',
                        quantity: Number(product.stock?.quantity) || 0,
                        minQuantity: Number(product.stock?.minQuantity) || 5,
                    }],
            }));
            setProducts(normalizedProducts);
            setPagination({
                totalPages: res.data.pagination?.totalPages || 1,
                totalItems: res.data.pagination?.totalItems || 0
            });
        } catch {
            toast.error('خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, [page, search, resolveBranchName]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadProducts();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, page, loadProducts]);

    const getCategoryName = (category) => {
        if (!category) return '—';
        if (typeof category === 'string') return category;
        if (typeof category === 'object') return category.name || '—';
        return String(category);
    };

    const catIcon = (category) => {
        const c = getCategoryName(category);
        return c === 'هواتف' ? '📱' : c === 'لابتوب' ? '💻' : '📦';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white">البحث عن توفر المنتجات</h1>
                    <p className="text-gray-500 text-sm">ابحث عن أي منتج لمعرفة الكميات المتوفرة في جميع الفروع</p>
                </div>
                <button
                    onClick={() => loadProducts()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-all text-sm font-bold"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                </button>
            </div>

            <Card className="p-4 border-2 border-primary-100 dark:border-primary-900/30">
                <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        autoFocus
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="ابحث باسم المنتج، SKU، أو الباركود..."
                        className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-lg focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none"
                    />
                </div>
            </Card>

            {loading && products.length === 0 ? (
                <LoadingSpinner />
            ) : products.length === 0 ? (
                <EmptyState
                    icon={<Package className="w-12 h-12" />}
                    title="لم يتم العثور على منتجات"
                    description={search ? `لا توجد نتائج للبحث عن "${search}"` : "ابدأ بكتابة اسم المنتج للبحث"}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.map((product) => (
                        <Card key={product._id} className="overflow-hidden border-2 border-gray-100 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                            <div className="p-5 flex gap-4 border-b border-gray-50 dark:border-gray-800">
                                <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-3xl">
                                    {product.thumbnail ? (
                                        <img src={product.thumbnail} className="w-full h-full object-cover rounded-2xl" alt="" />
                                    ) : (
                                        product.categoryIcon || toCategoryIcon(product.category)
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-black text-lg text-gray-800 dark:text-white">{product.name}</h3>
                                        <Badge variant={product.stock?.quantity > 0 ? 'success' : 'danger'}>
                                            {product.stock?.quantity > 0 ? 'متوفر إجمالاً' : 'غير متوفر'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <span className="font-mono">SKU: {product.sku || '—'}</span>
                                        <span>•</span>
                                        <span>{product.categoryName || toCategoryName(product.category)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 bg-gray-50/50 dark:bg-gray-800/20">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> التوفر في الفروع
                                </h4>

                                <div className="space-y-3">
                                    {(product.availabilityRows || []).map((inv, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                                    {inv.branchName}
                                                </span>
                                            </div>
                                            <div className="text-left">
                                                <span className={`text-lg font-black ${inv.quantity <= 0 ? 'text-red-500' :
                                                        inv.quantity <= (inv.minQuantity || 5) ? 'text-amber-500' : 'text-primary-600'
                                                    }`}>
                                                    {inv.quantity}
                                                </span>
                                                <span className="text-[10px] text-gray-400 mr-1 font-bold">{product.stock?.unit || 'قطعة'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-white dark:bg-gray-900 flex justify-between items-center text-sm border-t border-gray-50 dark:border-gray-800">
                                <span className="text-gray-400">إجمالي المخزون:</span>
                                <span className="font-black text-gray-800 dark:text-white text-lg">
                                    {product.stock?.quantity || 0}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className="mt-8">
                    <Pagination
                        currentPage={page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}

