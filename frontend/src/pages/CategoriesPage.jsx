import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, FolderTree, Edit, Trash2, ChevronRight, ChevronDown, Package, Check, X, FolderPlus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi, productsApi, useAuthStore } from '../store';
import { Button, Input, Modal, Card, LoadingSpinner, EmptyState, Badge, TextArea } from '../components/UI';
import ProductDetailModal from '../components/ProductDetailModal';
import CategorySelector from '../components/CategorySelector';
import { getIconForCategory, getCategoryIconSuggestions, DEFAULT_CATEGORY_ICON } from '../utils/aiHelper';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { confirm } from '../components/ConfirmDialog';

export default function CategoriesPage() {
    const { t } = useTranslation('admin');
        const { can } = useAuthStore();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', parent: null, icon: DEFAULT_CATEGORY_ICON });
    const [sectionMode, setSectionMode] = useState('root');
    const [expandedIds, setExpandedIds] = useState(new Set());

    // New States for Tree Dropdown & Products
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isTreeOpen, setIsTreeOpen] = useState(false);
    const [treeSearch, setTreeSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const treeRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await categoriesApi.getTree();
            const data = res.data.data || [];

            // Add a virtual "Uncategorized" category if it doesn't exist in the tree
            const defaultCat = data.find(c => c.name === t('categories_page.ui.kpyx615') || c.name === t('categories_page.ui.kmn6v53') || c.isDefault);
            if (!defaultCat) {
                data.push({
                    _id: 'uncategorized',
                    name: t('categories_page.ui.kllccrx'),
                    icon: DEFAULT_CATEGORY_ICON,
                    description: t('categories_page.ui.k6wug8p'),
                    children: []
                });
            }

            setCategories(data);


            // Auto-select first category if none selected
            if (!selectedCategoryId && data.length > 0) {
                setSelectedCategoryId(data[0]._id);
            }
        } catch {
            toast.error(t('categories_page.toasts.k1vaig0'));
        } finally {
            setLoading(false);
        }
    }, [selectedCategoryId]);

    const fetchProductsForCategory = useCallback(async (catId) => {
        if (!catId) return;
        setLoadingProducts(true);
        try {
            const params = { limit: 100 };
            if (catId === 'uncategorized') {
                params.category = 'null'; // Use 'null' string to indicate no category for the API
            } else {
                params.category = catId;
            }
            const res = await productsApi.getAll(params);
            const data = res.data.data;
            setCategoryProducts(data?.products || (Array.isArray(data) ? data : []));
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCategoryId) {
            fetchProductsForCategory(selectedCategoryId);
        }
    }, [selectedCategoryId, fetchProductsForCategory]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (treeRef.current && !treeRef.current.contains(event.target)) {
                setIsTreeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggleExpand = (id) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const openAdd = (parentId = null) => {
        setEditId(null);
        setSectionMode(parentId ? 'child' : 'root');
        setForm({ name: '', description: '', parent: parentId, icon: DEFAULT_CATEGORY_ICON });
        setShowModal(true);
    };

    const openEdit = (cat) => {
        setEditId(cat._id);
        setSectionMode(cat.parent ? 'child' : 'root');
        setForm({
            name: cat.name,
            description: cat.description || '',
            parent: cat.parent?._id || cat.parent || null,
            icon: cat.icon || DEFAULT_CATEGORY_ICON
        });
        setShowModal(true);
        setIsTreeOpen(false);
    };

    const handleNameChange = (name) => {
        const icon = getIconForCategory(name);
        setForm(prev => ({ ...prev, name, icon: icon || prev.icon || DEFAULT_CATEGORY_ICON }));
    };

    const handleSave = async () => {
        if (!form.name) return toast.error(t('categories_page.toasts.kqwr711'));
        if (sectionMode === 'child' && !form.parent) return toast.error(t('categories_page.toasts.k6seaa1'));
        setSaving(true);
        try {
            const payload = {
                ...form,
                parent: sectionMode === 'child' ? form.parent : null,
            };

            if (editId) {
                await categoriesApi.update(editId, payload);
                toast.success(t('categories_page.toasts.k3a5y9'));
            } else {
                const res = await categoriesApi.create(payload);
                toast.success(t('categories_page.toasts.k1em20g'));
                // Auto-select new category
                if (res.data.data?._id) setSelectedCategoryId(res.data.data._id);
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || t('categories_page.toasts.kw4gtna'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id) return;
        const ok = await confirm.delete(t('categories_page.ui.kueqhi5'));
        if (!ok) return;
        try {
            await categoriesApi.delete(id);
            toast.success(t('categories_page.toasts.kivi9kg'));
            if (selectedCategoryId === id) setSelectedCategoryId(null);
            loadData();
        } catch {
            toast.error(t('categories_page.toasts.kw4gt8w'));
        }
    };

    const renderCategoryTree = (cat, depth = 0) => {
        const hasChildren = cat.children && cat.children.length > 0;
        const isExpanded = expandedIds.has(cat._id);
        const isSelected = selectedCategoryId === cat._id;
        const matchesSearch = cat.name.toLowerCase().includes(treeSearch.toLowerCase());

        if (treeSearch && !matchesSearch && !hasChildren) return null;

        return (
            <div key={cat._id} className="select-none">
                <div
                    onClick={() => {
                        setSelectedCategoryId(cat._id);
                        if (!hasChildren || treeSearch) setIsTreeOpen(false);
                    }}
                    className={`
                        group flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 cursor-pointer mb-1
                        ${isSelected ? 'bg-primary-500 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}
                    `}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl">{cat.icon || DEFAULT_CATEGORY_ICON}</span>
                        <span className={`font-bold truncate ${isSelected ? 'text-white' : ''}`}>{cat.name}</span>
                        {hasChildren && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggleExpand(cat._id); }}
                                className={`p-1 rounded-lg hover:bg-black/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`} onClick={e => e.stopPropagation()}>
                        {depth < 2 && can('products', 'create') && (
                            <button onClick={() => openAdd(cat._id)} className="p-1.5 rounded-lg hover:bg-black/10"><Plus className="w-3.5 h-3.5" /></button>
                        )}
                        {can('products', 'update') && (
                            <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-black/10"><Edit className="w-3.5 h-3.5" /></button>
                        )}
                        {can('products', 'delete') && (
                            <button onClick={() => handleDelete(cat._id)} className="p-1.5 rounded-lg hover:bg-black/10"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mr-4 pr-3 border-r-2 border-primary-500/10"
                        >
                            {cat.children.map(child => renderCategoryTree(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const selectedCategory = categories.flatMap(c => {
        const items = [c];
        if (c.children) {
            c.children.forEach(sub => {
                items.push(sub);
                if (sub.children) items.push(...sub.children);
            });
        }
        return items;
    }).find(c => c._id === selectedCategoryId);
    const iconSuggestions = getCategoryIconSuggestions(form.name, 10);
    const availableParents = categories.filter(c => c._id !== editId && c._id !== 'uncategorized');
    const isChildSection = sectionMode === 'child';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header with Search and Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-sm relative z-40">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-black font-mona text-gray-800 dark:text-white flex items-center gap-3 mb-1">
                        <FolderTree className="w-8 h-8 text-primary-500" />
                        {t('categories_page.ui.kxkuhbe')}
                    </h1>
                    <p className="text-sm text-gray-500">{t('categories_page.ui.kay3rqa')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    {can('products', 'create') && (
                        <Button
                            icon={<Plus className="w-5 h-5" />}
                            onClick={() => openAdd()}
                            className="bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 px-6 py-3.5 rounded-2xl font-black"
                        >
                            {t('categories_page.ui.kd5p0x6')}
                        </Button>
                    )}

                    <div className="relative w-full lg:w-80" ref={treeRef}>
                        <button
                            onClick={() => setIsTreeOpen(!isTreeOpen)}
                            className={`
                                w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all duration-300
                                ${isTreeOpen ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hover:border-primary-500/30'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{selectedCategory?.icon || DEFAULT_CATEGORY_ICON}</span>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-black text-primary-500 tracking-widest leading-none mb-1 text-right">{t('categories_page.ui.kdz403f')}</p>
                                    <p className="font-bold text-gray-800 dark:text-white leading-none truncate max-w-[120px] text-right">{selectedCategory?.name || t('categories_page.toasts.krwd7zg')}</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isTreeOpen ? 'rotate-180 text-primary-500' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isTreeOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-3 p-4 bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[500px] flex flex-col z-50 text-right"
                                >
                                    <div className="relative mb-4">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            autoFocus
                                            value={treeSearch}
                                            onChange={e => setTreeSearch(e.target.value)}
                                            placeholder={t('categories_page.placeholders.kglf77h')}
                                            className="w-full pr-10 pl-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                        {categories.map(cat => renderCategoryTree(cat))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Selected Category Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* Category Meta */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 border-2 border-gray-100 dark:border-gray-800 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                        <div className="relative flex flex-col items-center text-center p-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-primary-500/20 mb-4 transform group-hover:scale-105 transition-transform">
                                {selectedCategory?.icon || DEFAULT_CATEGORY_ICON}
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">{selectedCategory?.name || t('categories_page.toasts.k9mzwqm')}</h2>
                            <p className="text-sm text-gray-500 mb-6">{selectedCategory?.description || t('categories_page.toasts.kccibov')}</p>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('categories_page.ui.ks0nri5')}</p>
                                    <p className="text-xl font-black text-primary-500">{categoryProducts.length}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('categories_page.ui.kzceuvp')}</p>
                                    <p className="text-xl font-black text-blue-500">{selectedCategory?.children?.length || 0}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {can('products', 'update') && (
                                    <Button size="sm" variant="ghost" icon={<Edit className="w-4 h-4" />} onClick={() => openEdit(selectedCategory)}>{t('categories_page.ui.k2kzqjd')}</Button>
                                )}
                                {can('products', 'delete') && (
                                    <Button size="sm" variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(selectedCategoryId)}>{t('categories_page.ui.delete')}</Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {selectedCategory?.parent && (
                        <Card className="p-5 border-2 border-primary-500/10 bg-primary-50/10 dark:bg-primary-500/5">
                            <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-2 text-right">{t('categories_page.ui.ka0n9co')}</p>
                            <div
                                onClick={() => setSelectedCategoryId(selectedCategory.parent._id || selectedCategory.parent)}
                                className="flex items-center gap-3 cursor-pointer group"
                            >
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm border border-primary-500/20 group-hover:border-primary-500 transition-colors">
                                    <FolderTree className="w-5 h-5 text-primary-500" />
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-800 dark:text-white group-hover:text-primary-500 transition-colors text-right">
                                        {categories.find(c => c._id === (selectedCategory.parent._id || selectedCategory.parent))?.name || t('categories_page.toasts.k1hda1s')}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{t('categories_page.ui.kpndr2')}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Products Grid */}
                <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary-500" />
                            {t('categories_page.ui.kjhns1n')}
                        </h3>
                        <Badge variant="info">مجموع: {categoryProducts.length}</Badge>
                    </div>

                    <Card className="min-h-[400px] border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-6">
                        {loadingProducts ? (
                            <LoadingSpinner text="جاري جلب قائمة المنتجات..." />
                        ) : categoryProducts.length === 0 ? (
                            <EmptyState
                                icon={<Package className="w-16 h-16 opacity-20" />}
                                title={t('categories_page.titles.k8fd1p4')}
                                description="هذا القسم لا يحتوي على منتجات حاليًا. يمكنك إضافة منتجات جديدة من صفحة المنتجات."
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {categoryProducts.map((p, idx) => (
                                    <motion.div
                                        key={p._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => {
                                            setSelectedProduct(p);
                                            setShowDetailModal(true);
                                        }}
                                        className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-700 group-hover:border-primary-500/50 transition-colors">
                                                {p.thumbnail ? (
                                                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-right">
                                                <h4 className="font-black text-gray-800 dark:text-white truncate mb-1 text-right">{p.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-primary-500">{p.price?.toLocaleString()} EGP</p>
                                                    <Badge variant={p.stock?.quantity > 0 ? 'success' : 'danger'} className="text-[9px] px-1 py-0">
                                                        {p.stock?.quantity || 0} {p.unit || t('categories_page.toasts.ktcs1x')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? t('categories_page.ui.k2zzpf5') : 'إضافة قسم جديد'}>
                <div className="space-y-5">
                    <div className="rounded-3xl border border-primary-500/15 bg-gradient-to-br from-primary-950 via-slate-900 to-slate-950 px-4 py-4 text-white shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-900 shadow-xl">
                                {form.icon || DEFAULT_CATEGORY_ICON}
                            </div>
                            <div className="flex-1 text-right">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-primary-100">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {t('categories_page.ui.kj7a1rj')}
                                </div>
                                <p className="mt-2 text-sm font-bold leading-6 text-white">
                                    يتم اقتراح أيقونة مناسبة تلقائيًا حسب اسم القسم، ويمكنك تعديلها أو اختيار واحدة من الاقتراحات بالأسفل.
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                    {isChildSection
                                        ? t('categories_page.ui.kwqmixg') : 'سيظهر هذا العنصر كقسم رئيسي ويمكنك إضافة أقسام فرعية داخله لاحقًا.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <Input label={t('categories_page.form.kc3ug0g')} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder={DEFAULT_CATEGORY_ICON} />
                        </div>
                        <div className="col-span-3">
                            <Input
                                label={t('categories_page.form.kygdgre')}
                                value={form.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder={t('categories_page.placeholders.kwdbkcp')}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSectionMode('root');
                                setForm(prev => ({ ...prev, parent: null }));
                            }}
                            className={`rounded-2xl border px-4 py-3 text-right transition-all ${!isChildSection ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'}`}
                        >
                            <p className="text-sm font-black">{t('categories_page.ui.k1hda1s')}</p>
                            <p className="mt-1 text-[11px]">{t('categories_page.ui.kcs9o6v')}</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSectionMode('child')}
                            className={`rounded-2xl border px-4 py-3 text-right transition-all ${isChildSection ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'}`}
                        >
                            <p className="text-sm font-black">{t('categories_page.ui.kkkdjkj')}</p>
                            <p className="mt-1 text-[11px]">{t('categories_page.ui.ky3h19k')}</p>
                        </button>
                    </div>

                    {isChildSection ? (
                        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                            <CategorySelector
                                label={t('categories_page.form.ki5kzf4')}
                                value={form.parent}
                                onChange={(val) => setForm({ ...form, parent: val })}
                                categories={availableParents}
                                placeholder={t('categories_page.placeholders.kx8w841')}
                            />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/70 px-4 py-3 text-right">
                            <p className="text-sm font-black text-emerald-700">{t('categories_page.ui.kub296m')}</p>
                            <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                                {t('categories_page.ui.kltvefp')}
                            </p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-800 dark:text-white">{t('categories_page.ui.kceg4f8')}</p>
                                <p className="text-[11px] text-gray-500">{t('categories_page.ui.kghqq01')}</p>
                            </div>
                            <Sparkles className="h-4 w-4 text-primary-500" />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {iconSuggestions.map((icon) => (
                                <button
                                    key={`${form.name || 'default'}-${icon}`}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, icon }))}
                                    className={`flex h-12 items-center justify-center rounded-2xl border text-2xl transition-all ${form.icon === icon ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/40'}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <TextArea
                        label={t('categories_page.form.kb3kyfd')}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={t('categories_page.placeholders.k4ff536')}
                        rows={3}
                    />
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setShowModal(false)}>{t('categories_page.ui.cancel')}</Button>
                    <Button icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>{editId ? t('categories_page.ui.kowmk4t') : 'حفظ'}</Button>
                </div>
            </Modal>

            <ProductDetailModal
                product={selectedProduct}
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
            />
        </div>
    );
}

