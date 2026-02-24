import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import {
    Search, Filter, ShoppingBag, Heart, Package,
    ArrowRight, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';
import ProductCard from './components/product/ProductCard';
import { MOCK_CATEGORIES } from './constants/portalConstants';

export default function PortalProducts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');
    const { fetchProducts, addToCart, toggleWishlist, wishlistIds } = usePortalStore();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('category') ? '' : (searchParams.get('search') || ''));
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const categories = MOCK_CATEGORIES;

    useEffect(() => {
        // If URL params change, reset and fetch
        const cat = searchParams.get('category') || '';
        const q = searchParams.get('search') || '';
        setSelectedCategory(cat);
        if (!cat) setSearch(q);

        setPage(1);
        setProducts([]);
        loadProducts(1, q, cat, true);
    }, [searchParams]);

    const loadProducts = async (pageNum, query, cat, isNewSearch = false) => {
        setLoading(true);
        const res = await fetchProducts(pageNum, query, cat);
        if (res) {
            if (isNewSearch) {
                setProducts(res.products || []);
            } else {
                setProducts(prev => [...prev, ...(res.products || [])]);
            }
            setHasMore(res.page < res.totalPages);
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams(search ? { search } : {});
    };

    const handleCategoryClick = (slug) => {
        setSearchParams(slug ? { category: slug } : {});
    };

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
                    <button className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800 relative">
                        <SlidersHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-gray-800"></div>
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute rtl:right-4 ltr:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('products.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 rtl:pr-12 rtl:pl-4 ltr:pl-12 ltr:pr-4 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm text-sm"
                    />
                </form>

                {/* Categories Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleCategoryClick(cat.slug)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedCategory === cat.slug
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            {loading && page === 1 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <PortalSkeleton key={i} className="h-64 rounded-3xl" />)}
                </div>
            ) : products.length === 0 ? (
                <PortalEmptyState
                    icon={Package}
                    title={t('products.no_results_title')}
                    message={search ? t('products.no_results_search', { query: search }) : t('products.no_results_category')}
                    actionLabel={t('products.view_all')}
                    onAction={() => handleCategoryClick('')}
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {products.map((product, i) => (
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
