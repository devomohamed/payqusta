import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Check, Loader2 } from 'lucide-react';
import { Modal, Input, Card, Badge, LoadingSpinner, EmptyState } from './UI';
import { productsApi } from '../store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ProductSearchModal({ open, onClose, onSelect }) {
    const { t } = useTranslation('admin');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef(null); // Track in-flight request so we can cancel it

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
            setLoading(false);
            if (abortRef.current) abortRef.current.abort();
        }
    }, [open]);

    // Search effect
    useEffect(() => {
        // Cancel any previous in-flight request immediately
        if (abortRef.current) abortRef.current.abort();

        // Clear results right away when query is too short
        if (!query || query.length < 1) {
            setResults([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await productsApi.getAll({ search: query, limit: 10 });
                // Only update state if this request was NOT aborted
                if (!controller.signal.aborted) {
                    setResults(res.data.data || []);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    toast.error(t('product_search_modal.toasts.kw4gpg8'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort(); // Cancel in-flight request on cleanup
        };
    }, [query]);

    return (
        <Modal open={open} onClose={onClose} title={t('product_search_modal.titles.kec5kbt')} size="lg">
            <div className="space-y-4">
                <div className="relative">
                    <Input
                        autoFocus
                        placeholder={t('product_search_modal.placeholders.kozw53k')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                    {loading && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                        </div>
                    )}
                </div>

                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                    {loading && results.length === 0 ? (
                        <LoadingSpinner />
                    ) : results.length === 0 ? (
                        <EmptyState
                            icon={<Package className="w-8 h-8" />}
                            title={!query ? "ابدأ الكتابة للبحث" : "لم يتم العثور على نتائج"}
                            description={!query ? "اكتب اسم المنتج الذي تريد استيراد بياناته" : `لا توجد نتائج للبحث عن "${query}"`}
                        />
                    ) : (
                        results.map((p) => (
                            <Card
                                key={p._id}
                                hover
                                onClick={() => onSelect(p)}
                                className="p-3 flex items-center gap-4 group cursor-pointer border-gray-100 dark:border-gray-800"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-xl flex-shrink-0">
                                    {p.thumbnail ? <img src={p.thumbnail} className="w-full h-full object-cover rounded-xl" alt="" /> : '📦'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate text-gray-900 dark:text-white">
                                        {p.name || '—'}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        SKU: {p.sku || '—'} · {typeof p.category === 'object' ? p.category?.name : p.category || t('product_search_modal.toasts.kmn6v53')}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-black text-primary-600">{(p.price || 0).toLocaleString('ar-EG')} ج.م</p>
                                    <Badge variant={p.stock?.quantity > 0 ? 'success' : 'danger'} className="text-[10px]">
                                        {p.stock?.quantity || 0} متوفر
                                    </Badge>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <Check className="w-4 h-4 text-primary-600" />
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/50 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        💡 <strong>{t('product_search_modal.ui.k45b5c3')}</strong> اختيار منتج موجود سيقوم بتعبئة كافة البيانات (الاسم، القسم، الوصف، السعر، والتكلفة) تلقائياً لتوفير وقتك.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
