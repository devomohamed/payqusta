import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import {
    Search, Package,
    ArrowRight, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';
import ProductCard from './components/product/ProductCard';

export default function PortalProducts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');
    const { fetchProducts, addToCart, toggleWishlist, wishlistIds } = usePortalStore();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('category') ? '' : (searchParams.get('search') || ''));
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [categories, setCategories] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [stockFilter, setStockFilter] = useState('all');
    const [priceFilter, setPriceFilter] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const isArabic = i18n.language?.startsWith('ar');
    const labels = {
        filters: isArabic ? 'الفلاتر' : 'Filters',
        all: isArabic ? 'الكل' : 'All',
        stockAll: isArabic ? 'جميع حالات المخزون' : 'All stock statuses',
        stockAvailable: isArabic ? 'متاح فقط' : 'In stock only',
        stockUnavailable: isArabic ? 'غير متاح فقط' : 'Out of stock only',
        priceAll: isArabic ? 'جميع الأسعار' : 'All prices',
        priceUnder500: isArabic ? 'أقل من 500 ج.م' : 'Under 500 EGP',
        price500To2000: isArabic ? 'من 500 إلى 2000 ج.م' : '500 to 2000 EGP',
        priceAbove2000: isArabic ? 'أكثر من 2000 ج.م' : 'Above 2000 EGP',
        sortLatest: isArabic ? 'الأحدث' : 'Newest',
        sortPriceLow: isArabic ? 'السعر: من الأقل للأعلى' : 'Price: Low to High',
        sortPriceHigh: isArabic ? 'السعر: من الأعلى للأقل' : 'Price: High to Low',
        sortName: isArabic ? 'الاسم: أ-ي' : 'Name: A-Z',
        resetFilters: isArabic ? 'إعادة تعيين الفلاتر' : 'Reset filters',
    };

    useEffect(() => {
        // If URL params change, reset and fetch
        const cat = searchParams.get('category') || '';
        const q = searchParams.get('search') || '';
        setSelectedCategory(cat);
        setSearch(q);

        setPage(1);
        setProducts([]);
        loadProducts(1, q, cat, true);
    }, [searchParams]);

    const loadProducts = async (pageNum, query, cat, isNewSearch = false) => {
        setLoading(true);
        const res = await fetchProducts(pageNum, query, cat);
        if (res) {
            const serverCategories = (res.categories || [])
                .map((item) => (typeof item === 'string' ? item : item?.name))
                .filter(Boolean);

            if (isNewSearch || pageNum === 1) {
                setCategories(serverCategories);
            } else if (categories.length === 0 && serverCategories.length > 0) {
                setCategories(serverCategories);
            }

            if (isNewSearch) {
                setProducts(res.products || []);
            } else {
                setProducts(prev => [...prev, ...(res.products || [])]);
            }

            const currentPage = Number(res?.pagination?.page ?? res.page ?? pageNum);
            const totalPages = Number(res?.pagination?.pages ?? res.totalPages ?? 1);
            setHasMore(currentPage < totalPages);
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const next = {};
        if (search?.trim()) next.search = search.trim();
        if (selectedCategory) next.category = selectedCategory;
        setSearchParams(next);
    };

    const handleCategoryClick = (categoryName) => {
        const next = {};
        if (search?.trim()) next.search = search.trim();
        if (categoryName) next.category = categoryName;
        setSearchParams(next);
    };

    const visibleProducts = useMemo(() => {
        let output = [...products];

        if (stockFilter === 'in_stock') {
            output = output.filter((p) => Number(p?.stock?.quantity || 0) > 0);
        } else if (stockFilter === 'out_of_stock') {
            output = output.filter((p) => Number(p?.stock?.quantity || 0) <= 0);
        }

        if (priceFilter !== 'all') {
            output = output.filter((p) => {
                const price = Number(p?.price || 0);
                if (priceFilter === 'under_500') return price < 500;
                if (priceFilter === '500_2000') return price >= 500 && price <= 2000;
                if (priceFilter === 'above_2000') return price > 2000;
                return true;
            });
        }

        output.sort((a, b) => {
            if (sortBy === 'price_asc') return Number(a?.price || 0) - Number(b?.price || 0);
            if (sortBy === 'price_desc') return Number(b?.price || 0) - Number(a?.price || 0);
            if (sortBy === 'name_asc') return String(a?.name || '').localeCompare(String(b?.name || ''), i18n.language);
            return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
        });

        return output;
    }, [products, stockFilter, priceFilter, sortBy, i18n.language]);

    const hasActiveFilters = stockFilter !== 'all' || priceFilter !== 'all' || sortBy !== 'latest';

    return (
        <div className="pb-24 animate-fade-in space-y-6" dir={i18n.dir()}>
            {/* Header & Search */}
            <div className="sticky top-0 z-20 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800"
                    >
                        <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white flex-1">{t('products.title')}</h1>
                </div>

                <div className="flex items-center gap-2">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute rtl:right-4 ltr:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('products.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 rtl:pr-12 rtl:pl-4 ltr:pl-12 ltr:pr-4 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm text-sm"
                        />
                    </form>
                    <button
                        type="button"
                        onClick={() => setShowFilters((prev) => !prev)}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700 relative"
                        aria-label={labels.filters}
                        title={labels.filters}
                    >
                        <SlidersHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        {hasActiveFilters && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-gray-800"></div>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                className="h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 text-sm"
                            >
                                <option value="all">{labels.stockAll}</option>
                                <option value="in_stock">{labels.stockAvailable}</option>
                                <option value="out_of_stock">{labels.stockUnavailable}</option>
                            </select>
                            <select
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className="h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 text-sm"
                            >
                                <option value="all">{labels.priceAll}</option>
                                <option value="under_500">{labels.priceUnder500}</option>
                                <option value="500_2000">{labels.price500To2000}</option>
                                <option value="above_2000">{labels.priceAbove2000}</option>
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 text-sm"
                            >
                                <option value="latest">{labels.sortLatest}</option>
                                <option value="price_asc">{labels.sortPriceLow}</option>
                                <option value="price_desc">{labels.sortPriceHigh}</option>
                                <option value="name_asc">{labels.sortName}</option>
                            </select>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setStockFilter('all');
                                    setPriceFilter('all');
                                    setSortBy('latest');
                                }}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700"
                            >
                                {labels.resetFilters}
                            </button>
                        </div>
                    </div>
                )}

                {/* Categories Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => handleCategoryClick('')}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${!selectedCategory
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                            : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        {labels.all}
                    </button>
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleCategoryClick(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedCategory === cat
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            {loading && page === 1 ? (
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <PortalSkeleton key={i} className="h-64 rounded-3xl" />)}
                    </div>
            ) : visibleProducts.length === 0 ? (
                <PortalEmptyState
                    icon={Package}
                    title={t('products.no_results_title')}
                    message={search ? t('products.no_results_search', { query: search }) : t('products.no_results_category')}
                    actionLabel={t('products.view_all')}
                    onAction={() => handleCategoryClick('')}
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {visibleProducts.map((product, i) => (
                            <ProductCard
                                key={product._id || i}
                                product={product}
                                addToCart={addToCart}
                                toggleWishlist={toggleWishlist}
                                isWishlisted={wishlistIds?.includes(product._id)}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => {
                                    setPage(p => p + 1);
                                    loadProducts(page + 1, search, selectedCategory);
                                }}
                                disabled={loading}
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                {loading ? <LoadingSpinner size="sm" /> : t('products.load_more')}
                                {!loading && <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
