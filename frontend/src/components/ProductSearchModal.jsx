import React, { useState, useEffect } from 'react';
import { Search, Package, Check, X, Loader2 } from 'lucide-react';
import { Modal, Input, Card, Badge, LoadingSpinner, EmptyState } from './UI';
import { productsApi } from '../store';
import toast from 'react-hot-toast';

export default function ProductSearchModal({ open, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
            return;
        }
    }, [open]);

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await productsApi.getAll({ search: query, limit: 10 });
                setResults(res.data.data || []);
            } catch (err) {
                toast.error('خطأ في البحث');
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <Modal open={open} onClose={onClose} title="البحث عن منتج لاستيراد البيانات" size="lg">
            <div className="space-y-4">
                <div className="relative">
                    <Input
                        autoFocus
                        placeholder="ابحث باسم المنتج أو الباركود..."
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
                            title={query.length < 2 ? "ابدأ الكتابة للبحث" : "لم يتم العثور على نتائج"}
                            description={query.length < 2 ? "اكتب اسم المنتج الذي تريد استيراد بياناته" : `لا توجد نتائج للبحث عن "${query}"`}
                        />
                    ) : (
                        results.map((p) => (
                            <Card
                                key={p._id}
                                hover
                                onClick={() => onSelect(p)}
                                className="p-3 flex items-center gap-4 group cursor-pointer border-gray-100 dark:border-gray-800"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-xl">
                                    {p.thumbnail ? <img src={p.thumbnail} className="w-full h-full object-cover rounded-xl" alt="" /> : '📦'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate">{p.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">SKU: {p.sku || '—'} · {p.category?.name || 'بدون قسم'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary-600">{(p.price || 0).toLocaleString('ar-EG')} ج.م</p>
                                    <Badge variant={p.stock?.quantity > 0 ? 'success' : 'danger'} className="text-[10px]">
                                        {p.stock?.quantity || 0} متوفر
                                    </Badge>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                        💡 <strong>نصيحة:</strong> اختيار منتج موجود سيقوم بتعبئة كافة البيانات (الاسم، القسم، الوصف، السعر، والتكلفة) تلقائياً لتوفير وقتك.
                    </p>
                </div>
            </div>
        </Modal>
    );
}
