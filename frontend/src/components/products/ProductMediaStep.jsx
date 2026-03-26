import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card } from '../UI';
import ImageEditorModal from './ImageEditorModal';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, Trash2, Star, Plus, Tag, ChevronDown, ChevronUp, AlertTriangle, Copy, Layers, TrendingUp, Package, Palette, Ruler, ChevronsUpDown, Pencil, Sparkles, Hash, Search } from 'lucide-react';

function getColorSwatches(t) {
    return [
        { name: t('product_media_step.ui.ksswuv'), hex: '#1a1a1a' }, { name: t('product_media_step.ui.kssor5'), hex: '#f5f5f5' },
        { name: t('product_media_step.ui.kp0w9f2'), hex: '#9ca3af' }, { name: t('product_media_step.ui.ksssc6'), hex: '#ef4444' },
        { name: t('product_media_step.ui.ktghb8'), hex: '#ec4899' }, { name: t('product_media_step.ui.ku086hg'), hex: '#f97316' },
        { name: t('product_media_step.ui.kssy6a'), hex: '#eab308' }, { name: t('product_media_step.ui.kssspy'), hex: '#22c55e' },
        { name: t('product_media_step.ui.k47fow5'), hex: '#10b981' }, { name: t('product_media_step.ui.kp1zv7b'), hex: '#06b6d4' },
        { name: t('product_media_step.ui.kssvkw'), hex: '#3b82f6' }, { name: t('product_media_step.ui.k9sulki'), hex: '#8b5cf6' },
        { name: t('product_media_step.ui.kxka4'), hex: '#92400e' }, { name: t('product_media_step.ui.kt1lrt'), hex: '#d97706' },
        { name: t('product_media_step.ui.ky2fp'), hex: '#64748b' },
    ];
}

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

function StockBadge({ stock, t }) {
    const qty = Number(stock) || 0;
    if (qty === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">{t('product_media_step.ui.ky6dw')}</span>;
    if (qty <= 5) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">{t('product_media_step.ui.kpbwxvm')}</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">{t('product_media_step.ui.kteey3')}</span>;
}

function ProfitBadge({ price, cost }) {
    const p = Number(price), c = Number(cost);
    if (!p || !c) return null;
    const margin = Math.round(((p - c) / p) * 100);
    const color = margin >= 30 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-600' : 'text-red-500';
    return <span className={`text-[10px] font-bold ${color}`}>هامش {margin}%</span>;
}

function ColorSwatch({ value, onChange, t, colorSwatches }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const active = colorSwatches.find(c => c.name === value);
    const filteredSwatches = colorSwatches.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 mb-1.5">{t('product_media_step.ui.kovealh')}</label>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`app-surface w-full flex items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all outline-none ${
                    open 
                        ? 'border-primary-500 ring-4 ring-primary-500/10' 
                        : 'border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {active ? (
                        <>
                            <span 
                                className="w-4 h-4 rounded-full border border-gray-200 dark:border-white/10 shrink-0 shadow-sm" 
                                style={{ background: active.hex }} 
                            />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{active.name}</span>
                        </>
                    ) : value ? (
                        <>
                            <Palette className="w-4 h-4 text-primary-500 shrink-0" />
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400 truncate">{value}</span>
                        </>
                    ) : (
                        <span className="text-sm font-bold text-gray-400">{t('product_media_step.ui.kt60s7y')}</span>
                    )}
                </div>
                <ChevronDown 
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary-500' : ''}`} 
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div 
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 left-0 top-[calc(100%+8px)] z-[100] rounded-2xl border border-gray-100/50 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
                    >
                        {/* Search Input */}
                        <div className="relative mb-3">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('product_media_step.placeholders.kn8jna6')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50/50 pr-9 pl-3 py-2 text-sm transition-colors focus:border-primary-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:focus:bg-slate-800"
                                dir="rtl"
                            />
                        </div>

                        {/* Swatches Grid */}
                        <div className="grid grid-cols-5 gap-2 mb-3 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredSwatches.map(c => {
                                const isSelected = value === c.name;
                                return (
                                    <button
                                        key={c.name} 
                                        type="button"
                                        title={c.name}
                                        onClick={() => { onChange(c.name); setOpen(false); }}
                                        className="group relative flex aspect-square items-center justify-center rounded-xl"
                                    >
                                        <div 
                                            className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                                                isSelected 
                                                    ? 'scale-100 opacity-100 bg-primary-100 dark:bg-primary-900/30' 
                                                    : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-hover:bg-gray-100 dark:group-hover:bg-white/5'
                                            }`}
                                        />
                                        <div 
                                            className={`relative z-10 w-6 h-6 rounded-full border shadow-sm transition-transform duration-300 ${
                                                isSelected 
                                                    ? 'scale-110 border-primary-500/50 ring-2 ring-primary-500/20' 
                                                    : 'border-gray-200/50 dark:border-white/10 group-hover:scale-105'
                                            }`}
                                            style={{ background: c.hex }}
                                        />
                                    </button>
                                );
                            })}
                            {filteredSwatches.length === 0 && (
                                <div className="col-span-5 py-4 text-center text-xs text-gray-400">
                                    {t('product_media_step.ui.kh3azm5')}
                                </div>
                            )}
                        </div>

                        {/* Custom Color Input */}
                        <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                            <h6 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{t('product_media_step.ui.k9d8smx')}</h6>
                            <div className="relative">
                                <Palette className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500/50" />
                                <input
                                    type="text"
                                    placeholder={t('product_media_step.placeholders.kqaawno')}
                                    value={!active ? (value || '') : ''}
                                    onChange={e => onChange(e.target.value)}
                                    className="w-full rounded-xl border border-gray-100 bg-gray-50/50 pr-9 pl-3 py-2 text-sm font-bold text-primary-600 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-primary-400 dark:focus:bg-slate-800"
                                    dir="rtl"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Accent colors for variant cards
const VARIANT_ACCENTS = ['rose', 'violet', 'blue', 'emerald', 'amber', 'pink', 'cyan', 'orange'];

export default function ProductMediaStep({
    form,
    setForm,
    branches = [],
    productImages = [],
    pendingImages = [],
    maxImageCount = 10,
    onImagesChange,
    onPendingImageReplace,
    onPrimaryImageSelect,
    onRemoveImage,
    onAddVariant,
    onUpdateVariant,
    onRemoveVariant,
    fieldErrors = {}
}) {
    const { t } = useTranslation('admin');
    const colorSwatches = React.useMemo(() => getColorSwatches(t), [t]);
    const getErrorText = (errKey) => errKey ? t(`products.validation.${errKey}`, errKey) : undefined;
    const fileInputRef = useRef(null);
    const [allExpanded, setAllExpanded] = useState(true);
    const [cropFiles, setCropFiles] = useState([]);
    const [editingPendingIndex, setEditingPendingIndex] = useState(null);

    const handleVariantImageUpload = (idx, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 600;
                let width = img.width;
                let height = img.height;
                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64Str = canvas.toDataURL('image/jpeg', 0.8);
                onUpdateVariant(idx, 'image', base64Str);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleCropClose = () => {
        setCropFiles([]);
        setEditingPendingIndex(null);
    };

    const handleCropComplete = (processedFiles) => {
        if (typeof editingPendingIndex === 'number') {
            onPendingImageReplace?.(editingPendingIndex, processedFiles?.[0] || null);
        } else {
            onImagesChange(processedFiles);
        }
        handleCropClose();
    };

    const handleFileSelection = (event) => {
        const nextFiles = Array.from(event?.target?.files || []);
        if (nextFiles.length === 0) return;
        onImagesChange(nextFiles);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        const nextFiles = Array.from(e.dataTransfer.files || []);
        if (nextFiles.length > 0) {
            onImagesChange(nextFiles);
        }
    };

    const handleEditPendingImage = (index) => {
        const targetFile = safePending[index];
        if (!targetFile) return;
        setEditingPendingIndex(index);
        setCropFiles([targetFile]);
    };

    const safePending = Array.isArray(pendingImages) ? pendingImages : [];
    const safeVariants = Array.isArray(form.variants) ? form.variants : [];
    const primaryPendingIndex = safePending.findIndex((file) => file?._previewUrl === form.primaryImagePreview);
    const allImages = React.useMemo(() => ([
        ...productImages.map((url) => ({ type: 'existing', url })),
        ...safePending
            .filter((file) => file?._previewUrl)
            .map((file, idx) => ({ type: 'pending', file, url: file._previewUrl, index: idx }))
    ]), [productImages, safePending]);

    const toggleVariant = (index) => {
        setForm((prev) => {
            const nextVariants = [...(prev.variants || [])];
            if (!nextVariants[index]) return prev;
            nextVariants[index] = {
                ...nextVariants[index],
                expanded: !nextVariants[index].expanded,
            };
            return { ...prev, variants: nextVariants };
        });
    };

    const toggleAllVariants = () => {
        const next = !allExpanded;
        setAllExpanded(next);
        setForm((prev) => ({
            ...prev,
            variants: (prev.variants || []).map((variant) => ({ ...variant, expanded: next })),
        }));
    };

    const duplicateVariant = (idx) => {
        setForm((prev) => {
            const currentVariants = [...(prev.variants || [])];
            if (!currentVariants[idx]) return prev;
            const clone = { ...currentVariants[idx], sku: '', expanded: true };
            currentVariants.splice(idx + 1, 0, clone);
            return { ...prev, variants: currentVariants };
        });
    };

    const addSizeSet = () => {
        const newVars = SIZE_PRESETS.map(size => ({
            attributes: { 'الحجم': size, 'اللون': '' },
            sku: '', barcode: '', internationalBarcode: '', internationalBarcodeType: 'UNKNOWN', localBarcode: '', localBarcodeType: 'CODE128',
            price: form.price || '', cost: form.costPrice || '',
            stock: form.stock || '', expanded: true,
            description: '', image: '',
        }));
        setForm((prev) => ({ ...prev, variants: [...(prev.variants || []), ...newVars] }));
    };

    const addColorSet = () => {
        const colors = [t('product_media_step.ui.ksswuv'), t('product_media_step.ui.kssor5'), t('product_media_step.ui.ksssc6'), t('product_media_step.ui.kssvkw'), t('product_media_step.ui.kssspy')];
        const newVars = colors.map(color => ({
            attributes: { 'الحجم': '', 'اللون': color },
            sku: '', barcode: '', internationalBarcode: '', internationalBarcodeType: 'UNKNOWN', localBarcode: '', localBarcodeType: 'CODE128',
            price: form.price || '', cost: form.costPrice || '',
            stock: form.stock || '', expanded: true,
            description: '', image: '',
        }));
        setForm((prev) => ({ ...prev, variants: [...(prev.variants || []), ...newVars] }));
    };

    const addBlankVariant = () => onAddVariant({
        attributes: { 'الحجم': '', 'اللون': '' },
        sku: '', barcode: '', internationalBarcode: '', internationalBarcodeType: 'UNKNOWN', localBarcode: '', localBarcodeType: 'CODE128',
        price: form.price || '', cost: form.costPrice || '',
        stock: form.stock || '', expanded: true,
        description: '', image: '',
    });

    const getVariantLabel = (v) => {
        const size = v.attributes?.['الحجم'];
        const color = v.attributes?.['اللون'];
        if (size && color) return `${size} — ${color}`;
        if (size) return size;
        if (color) return color;
        return null;
    };

    const variantPrices = React.useMemo(
        () => safeVariants.filter((variant) => variant.price).map((variant) => Number(variant.price)),
        [safeVariants],
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* ── 1. Media Section ── */}
            <section className="app-surface rounded-2xl border border-gray-100/80 p-6 shadow-sm dark:border-white/10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-purple-500" />
                            {t('product_media_step.ui.kg8cz36')}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{t('product_media_step.ui.ks39zh7')}</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-primary-200/70 bg-primary-50/80 px-3 py-2 text-xs font-semibold text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-300">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {t('product_media_step.ui.k3qvvua')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="app-surface-muted group flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300/80 p-8 text-center transition-all hover:border-primary-500 hover:bg-primary-50/50 dark:border-white/10 dark:hover:bg-primary-900/10"
                        >
                            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{t('product_media_step.ui.kft6y86')}</h4>
                            <p className="text-sm text-gray-500 mb-4">يدعم JPG, PNG, WEBP حتى {maxImageCount} صور. الرفع يتم مباشرة ثم التعديل اختياري من زر القلم.</p>
                            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelection} />
                            <Button type="button" variant="outline" size="sm">{t('product_media_step.ui.kyjjzi9')}</Button>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="app-surface-muted relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-gray-100/80 p-5 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)] transition-all duration-300 dark:border-white/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[50px] rounded-full -z-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full -z-10" />

                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0 drop-shadow-sm" />
                                    {t('product_media_step.ui.kz0nzbi')}
                                </h4>
                                {form.primaryImagePreview && (
                                    <Badge variant="primary" className="text-[10px] px-2 py-0.5 shadow-sm">{t('product_media_step.ui.ksdux7p')}</Badge>
                                )}
                            </div>

                            {form.primaryImagePreview ? (
                                <div className="app-surface relative flex-1 overflow-hidden rounded-xl border-2 border-primary-100 shadow-sm dark:border-primary-900/30">
                                    {primaryPendingIndex >= 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleEditPendingImage(primaryPendingIndex)}
                                            className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-xl bg-slate-950/75 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] hover:bg-primary-600"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            {t('product_media_step.ui.klyezji')}
                                        </button>
                                    )}
                                    <div className="absolute left-3 top-3 z-20 rounded-full border border-amber-300/50 bg-amber-50/90 px-3 py-1 text-[11px] font-bold text-amber-700 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-300">
                                        {t('product_media_step.ui.ky2icvk')}
                                    </div>
                                    <img
                                        src={form.primaryImagePreview}
                                        alt="Primary"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-contain absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                        <span className="text-white text-xs font-semibold px-3 py-1 bg-black/40 backdrop-blur-md rounded-full">{t('product_media_step.ui.kjg3ymy')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="app-surface-muted relative flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200/80 text-gray-400 backdrop-blur-sm transition-colors group-hover:border-primary-300 dark:border-white/10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100/50 to-transparent dark:from-gray-800/30 dark:to-transparent" />
                                    <ImageIcon className="w-10 h-10 opacity-40 mb-3 drop-shadow-sm" />
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 z-10 px-4 text-center">{t('product_media_step.ui.k15ym2c')} <Star className="w-3.5 h-3.5 inline text-amber-500 mx-1" /> على أي صورة لتعيينها كصورة رئيسية</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {allImages.length > 0 && (
                    <div className="mt-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">الصور المحملة ({allImages.length})</h4>
                            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                {t('product_media_step.ui.kfxuj69')}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            {allImages.map((img, idx) => {
                                const isPrimary = img.url === form.primaryImagePreview;
                                return (
                                    <div key={idx}
                                        className={`relative group aspect-square overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ${isPrimary ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900 shadow-[0_18px_50px_rgba(59,130,246,0.18)]' : 'border border-gray-200/80 dark:border-white/10 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-[0_16px_35px_rgba(15,23,42,0.12)]'} ${img.type === 'pending' ? 'border-dashed' : ''}`}
                                        onClick={() => onPrimaryImageSelect(img.url)}
                                    >
                                        <img src={img.url} alt={`img-${idx}`} loading="lazy" decoding="async" className="h-full w-full object-cover bg-white transition-transform duration-500 group-hover:scale-105" />
                                        {img.type === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleEditPendingImage(img.index);
                                                }}
                                                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/75 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-primary-600"
                                                title={t('product_media_step.titles.klyezji')}
                                                aria-label={t('product_media_step.form.klyezji')}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                                                <div>
                                                    <div className="text-[11px] font-bold text-white">
                                                        {isPrimary ? t('product_media_step.ui.kwq973k') : 'اضغط لاختيارها كغلاف'}
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-medium text-white/75">
                                                        {img.type === 'pending' ? t('product_media_step.ui.kr7l6y6') : 'صورة محفوظة'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={e => { e.stopPropagation(); onPrimaryImageSelect(img.url); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-900 shadow-lg transition-colors hover:text-primary-600" title={t('product_media_step.titles.k60vnfn')}><Star className="w-4 h-4" /></button>
                                                    <button onClick={e => { e.stopPropagation(); onRemoveImage(img.type, img.type === 'existing' ? img.url : img.index); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600" title={t('product_media_step.titles.delete')}><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        {img.type === 'pending' && !isPrimary && <div className="absolute top-2 left-2"><Badge variant="warning" className="text-[9px] px-1.5">{t('product_media_step.ui.kpbp3dj')}</Badge></div>}
                                        {isPrimary && <div className="absolute top-2 left-2"><Badge variant="primary" className="text-[9px] px-1.5">{t('product_media_step.ui.k60vnfn')}</Badge></div>}
                                    </div>
                                );
                            })}
                        </div>
                        {safePending.length > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-4 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                سيتم ضغط الصور المعلقة ورفعها تلقائياً عند حفظ المنتج لتسريع الحفظ. الحد الأقصى {maxImageCount} صور.
                            </p>
                        )}
                    </div>
                )}
            </section>

            {/* ── 2. Variants Section — Advanced ── */}
            <section className="app-surface overflow-hidden rounded-2xl border border-gray-100/80 shadow-sm dark:border-white/10">

                {/* Header */}
                <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100/80 p-6 dark:border-white/10 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-rose-500" />
                            {t('product_media_step.ui.keo6hrd')}
                            {form.variants?.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                                    {form.variants.length} موديل
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{t('product_media_step.ui.k9ctovg')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {(form.variants?.length || 0) > 1 && (
                            <button type="button" onClick={toggleAllVariants}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <ChevronsUpDown className="w-3.5 h-3.5" />
                                {allExpanded ? t('product_media_step.ui.kyq03px') : 'توسيع الكل'}
                            </button>
                        )}
                        <Button type="button" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addBlankVariant}>
                            {t('product_media_step.ui.ktculd0')}
                        </Button>
                    </div>
                </div>

                {/* Quick Template Bar */}
                <div className="app-surface-muted flex flex-wrap items-center gap-3 border-b border-gray-100/80 px-6 py-3 dark:border-white/10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('product_media_step.ui.km73wsg')}</span>
                    <button type="button" onClick={addSizeSet}
                        className="app-surface flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-white/10 px-3 py-1.5 text-xs font-black text-gray-600 transition-all hover:border-blue-400 hover:text-blue-600 dark:text-gray-300">
                        <Ruler className="w-3.5 h-3.5" /> مقاسات XS→3XL
                    </button>
                    <button type="button" onClick={addColorSet}
                        className="app-surface flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-white/10 px-3 py-1.5 text-xs font-black text-gray-600 transition-all hover:border-rose-400 hover:text-rose-600 dark:text-gray-300">
                        <Palette className="w-3.5 h-3.5" /> ألوان أساسية (5)
                    </button>
                    <button type="button" onClick={addBlankVariant}
                        className="app-surface flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-white/10 px-3 py-1.5 text-xs font-black text-gray-600 transition-all hover:border-emerald-400 hover:text-emerald-600 dark:text-gray-300">
                        <Tag className="w-3.5 h-3.5" /> موديل مخصص
                    </button>
                </div>

                {/* Variants List */}
                <div className="p-4 space-y-4">
                    <AnimatePresence initial={false}>
                        {(form.variants?.length || 0) > 0 ? (
                            form.variants.map((v, idx) => {
                                const expanded = v.expanded !== false;
                                const accent = VARIANT_ACCENTS[idx % VARIANT_ACCENTS.length];
                                const label = getVariantLabel(v);
                                const currentSwatch = colorSwatches.find(c => c.name === v.attributes?.['اللون']);

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                        layout
                                        className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                                            expanded 
                                            ? 'border-primary-500 shadow-[0_12px_40px_rgba(59,130,246,0.12)] bg-white dark:bg-slate-900/50 ring-1 ring-primary-500/20' 
                                            : 'border-gray-100/80 bg-slate-50/50 hover:bg-white hover:border-gray-200 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        {/* Card Header */}
                                        <div 
                                            className={`flex items-center gap-4 p-4 cursor-pointer select-none transition-colors ${expanded ? 'bg-primary-50/30 dark:bg-primary-500/5 border-b border-primary-100/50 dark:border-primary-500/10' : ''}`}
                                            onClick={() => toggleVariant(idx)}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 shadow-sm
                                                ${expanded 
                                                    ? 'bg-primary-600 text-white' 
                                                    : `bg-${accent}-100 dark:bg-${accent}-900/30 text-${accent}-600`}`}
                                            >
                                                {idx + 1}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                    {currentSwatch && (
                                                        <span className="w-3 h-3 rounded-full border border-white dark:border-gray-700 shadow-sm" style={{ backgroundColor: currentSwatch.hex }} />
                                                    )}
                                                    <h4 className="font-black text-gray-900 dark:text-gray-100 text-[15px]">
                                                        {label || <span className="text-gray-400 font-bold italic text-sm">{t('product_media_step.ui.k7jjkto')}</span>}
                                                    </h4>
                                                    <StockBadge stock={v.stock} t={t} />
                                                    <ProfitBadge price={v.price} cost={v.cost} />
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-bold text-gray-400 flex-wrap">
                                                    {v.sku ? (
                                                        <span className="flex items-center gap-1 text-slate-500">
                                                            <Hash className="w-3 h-3" /> {v.sku}
                                                        </span>
                                                    ) : null}
                                                    {v.price && <span className="text-emerald-600"> {Number(v.price).toLocaleString('en-US')} ج.م</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                <button type="button" onClick={() => duplicateVariant(idx)}
                                                    className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-xl transition-all active:scale-95" title={t('product_media_step.titles.ky61t')}>
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => onRemoveVariant(idx)}
                                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-95" title={t('product_media_step.titles.delete')}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className={`p-1.5 transition-transform duration-300 ${expanded ? 'rotate-180 text-primary-500' : 'text-gray-300'}`}>
                                                    <ChevronDown className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <AnimatePresence>
                                            {expanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-6 space-y-6">
                                                        {/* Quick Config */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-[22px] bg-slate-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 shadow-inner">
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                                                                    <Ruler className="w-3.5 h-3.5" /> المقاس / الحجم
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {SIZE_PRESETS.map(s => (
                                                                        <button key={s} type="button"
                                                                            onClick={() => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'الحجم': s })}
                                                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${v.attributes?.['الحجم'] === s ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-200 dark:shadow-none' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600'}`}>
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="relative mt-3.5">
                                                                    <Pencil className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                                    <input type="text" placeholder={t('product_media_step.placeholders.k7bsoly')} value={v.attributes?.['الحجم'] || ''}
                                                                        onChange={e => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'الحجم': e.target.value })}
                                                                        className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 pr-10 pl-4 py-2.5 text-sm font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 placeholder:text-gray-400" />
                                                                </div>
                                                            </div>

                                                            <div className="border-r border-gray-200/50 dark:border-white/5 pr-6 hidden md:block">
                                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                                                                    <Palette className="w-3.5 h-3.5" /> اللون
                                                                </p>
                                                                <ColorSwatch
                                                                    value={v.attributes?.['اللون'] || ''}
                                                                    t={t}
                                                                    colorSwatches={colorSwatches}
                                                                    onChange={val => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'اللون': val })}
                                                                />
                                                            </div>
                                                            <div className="md:hidden">
                                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                                                                    <Palette className="w-3.5 h-3.5" /> اللون
                                                                </p>
                                                                <ColorSwatch
                                                                    value={v.attributes?.['اللون'] || ''}
                                                                    t={t}
                                                                    colorSwatches={colorSwatches}
                                                                    onChange={val => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'اللون': val })}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Technical Details */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1">{t('product_media_step.ui.klaz87b')}</label>
                                                                <div className="relative group">
                                                                    <Hash className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-primary-500 transition-colors" />
                                                                    <input type="text" placeholder={t('product_media_step.placeholders.kexepce')} value={v.sku || ''}
                                                                        onChange={e => onUpdateVariant(idx, 'sku', e.target.value)}
                                                                        className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 pr-10 pl-4 py-3 text-sm font-mono font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10" dir="ltr" />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1">{t('product_media_step.ui.knt29k7')}</label>
                                                                <input type="text" placeholder={t('product_media_step.placeholders.k8bkp28')} value={v.internationalBarcode || v.barcode || ''}
                                                                    onChange={e => onUpdateVariant(idx, 'internationalBarcode', e.target.value)}
                                                                    className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 px-4 py-3 text-sm font-mono font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10" dir="ltr" />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1">{t('product_media_step.ui.kntfr92')}</label>
                                                                <input type="text" placeholder={t('product_media_step.placeholders.kqdwe65')} value={v.localBarcode || ''}
                                                                    onChange={e => onUpdateVariant(idx, 'localBarcode', e.target.value)}
                                                                    className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 px-4 py-3 text-sm font-mono font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10" dir="ltr" />
                                                            </div>
                                                        </div>

                                                        {/* Pricing & Inventory */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-gray-100 dark:border-white/10 pt-8">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1">{t('product_media_step.ui.kq1oz2z')}</label>
                                                                    <div className="relative group">
                                                                        <input
                                                                            id={`variants.${idx}.price`}
                                                                            name={`variants.${idx}.price`}
                                                                            type="number"
                                                                            placeholder="0.00"
                                                                            value={v.price || ''}
                                                                            onChange={e => onUpdateVariant(idx, 'price', e.target.value)}
                                                                            className={`app-surface w-full rounded-xl border-2 pl-12 pr-4 py-3 text-[17px] font-black transition-all focus:outline-none focus:ring-4 text-emerald-600 ${
                                                                                fieldErrors[`variants.${idx}.price`] 
                                                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                                                                                    : 'border-gray-100 dark:border-white/10 focus:border-emerald-500 focus:ring-emerald-500/10'
                                                                            }`}
                                                                            dir="ltr"
                                                                        />
                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-black">{t('product_media_step.ui.kwlxf')}</span>
                                                                    </div>
                                                                    {fieldErrors[`variants.${idx}.price`] && (
                                                                        <p className="mt-1 text-xs font-bold text-red-500">
                                                                            {getErrorText(fieldErrors[`variants.${idx}.price`])}
                                                                        </p>
                                                                    )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                                                                    {t('product_media_step.ui.ksb0r33')}
                                                                    <ProfitBadge price={v.price} cost={v.cost} />
                                                                </label>
                                                                <div className="relative group">
                                                                    <input type="number" placeholder="0.00" value={v.cost || ''}
                                                                        onChange={e => onUpdateVariant(idx, 'cost', e.target.value)}
                                                                        className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 pl-12 pr-4 py-3 text-[17px] font-black transition-all focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 text-amber-600" dir="ltr" />
                                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-black">{t('product_media_step.ui.kwlxf')}</span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                                                                    {t('product_media_step.ui.k8uu2ht')}
                                                                    <StockBadge stock={v.stock} t={t} />
                                                                </label>
                                                                <div className="relative group">
                                                                    <Package className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                                                                    <input type="number" placeholder="0" value={v.stock || ''}
                                                                        onChange={e => onUpdateVariant(idx, 'stock', Number(e.target.value))}
                                                                        className="app-surface w-full rounded-xl border-2 border-gray-100 dark:border-white/10 pr-10 pl-4 py-3 text-[17px] font-black transition-all focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-indigo-600" dir="ltr" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Description & Media */}
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-white/10">
                                                            <div className="space-y-3">
                                                                <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400">
                                                                    <Pencil className="w-3.5 h-3.5" /> ملاحظات خاصة بالموديل
                                                                </label>
                                                                <textarea rows={4} placeholder={t('product_media_step.placeholders.kvgksrw')} value={v.description || ''}
                                                                    onChange={e => onUpdateVariant(idx, 'description', e.target.value)}
                                                                    className="app-surface w-full rounded-[20px] border-2 border-gray-100 dark:border-white/10 px-4 py-3.5 text-sm font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 no-scrollbar" />
                                                            </div>

                                                            <div className="space-y-3">
                                                                <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400">
                                                                    <ImageIcon className="w-3.5 h-3.5" /> صورة الموديل المميزة
                                                                </label>
                                                                {v.image ? (
                                                                    <div className="relative group w-full h-[116px] rounded-[22px] border-2 border-primary-100 dark:border-primary-900/50 overflow-hidden shadow-sm">
                                                                        <img src={v.image} className="w-full h-full object-cover" alt="Variant" />
                                                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 gap-4">
                                                                            <button type="button" onClick={() => onUpdateVariant(idx, 'image', '')} className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:bg-red-600 active:scale-90 transition-all">
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </button>
                                                                            <label className="p-3 bg-white text-gray-900 rounded-2xl shadow-xl cursor-pointer hover:bg-gray-50 active:scale-90 transition-all">
                                                                                <Pencil className="w-5 h-5" />
                                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVariantImageUpload(idx, e.target.files[0])} />
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <label className="app-surface-muted flex h-[116px] w-full cursor-pointer items-center justify-center rounded-[22px] border-2 border-dashed border-gray-200 dark:border-white/5 transition-all hover:border-primary-400 hover:bg-primary-50/50 group">
                                                                        <div className="flex flex-col items-center gap-2 transition-transform group-hover:scale-105">
                                                                            <div className="w-9 h-9 rounded-xl bg-gray-100/80 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600 transition-colors">
                                                                                <UploadCloud className="w-5 h-5" />
                                                                            </div>
                                                                            <span className="text-[11px] text-gray-500 font-black">{t('product_media_step.ui.khuy16l')}</span>
                                                                        </div>
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVariantImageUpload(idx, e.target.files[0])} />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })
                        ) : (
                            /* Empty State */
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-24 flex flex-col items-center justify-center text-center px-4"
                            >
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-rose-500/20 blur-[45px] rounded-full animate-pulse" />
                                    <div className="relative w-24 h-24 rounded-[34px] bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-2xl rotate-3">
                                        <Layers className="w-12 h-12" strokeWidth={2.5} />
                                        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-lg">
                                            <Sparkles className="w-5 h-5 text-rose-500 animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                                <h4 className="font-black text-gray-900 dark:text-gray-100 text-2xl mb-3 underline decoration-rose-500/30 underline-offset-8">{t('product_media_step.ui.k6fi8ak')}</h4>
                                <p className="text-sm font-bold text-gray-400 max-w-sm mb-10 leading-relaxed">
                                    أضف موديلات إذا كان منتجك يتوفر بأكثر من لون، مقاس، أو خامة. <br/>
                                    {t('product_media_step.ui.krrynxn')}
                                </p>
                                <div className="flex items-center gap-4 flex-wrap justify-center">
                                    <button type="button" onClick={addSizeSet}
                                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 text-gray-900 dark:text-white hover:border-blue-500 hover:text-blue-600 text-sm font-black transition-all shadow-sm hover:shadow-lg active:scale-95">
                                        <Ruler className="w-4 h-4" /> مقاسات جاهزة
                                    </button>
                                    <button type="button" onClick={addColorSet}
                                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 text-gray-900 dark:text-white hover:border-rose-500 hover:text-rose-600 text-sm font-black transition-all shadow-sm hover:shadow-lg active:scale-95">
                                        <Palette className="w-4 h-4" /> ألوان جاهزة
                                    </button>
                                    <Button type="button" variant="primary" size="lg" icon={<Plus className="w-5 h-5" />} onClick={addBlankVariant} className="px-10 shadow-primary-200">
                                        {t('product_media_step.ui.krcf6n1')}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Summary */}
                {(form.variants?.length || 0) > 0 && (
                    <div className="app-surface-muted flex flex-wrap items-center gap-8 border-t border-gray-100/80 px-8 py-4 text-xs font-black text-gray-500 dark:border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                <Package className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('product_media_step.ui.khtoix3')}</span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {form.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0).toLocaleString('en-US')} وحدة
                                </span>
                            </div>
                        </div>
                        {variantPrices.length > 0 && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('product_media_step.ui.kmx89xi')}</span>
                                    <span className="text-gray-900 dark:text-gray-100">
                                        {Math.min(...variantPrices).toLocaleString('en-US')} — {Math.max(...variantPrices).toLocaleString('en-US')} ج.م
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
            <ImageEditorModal
                isOpen={cropFiles.length > 0}
                onClose={handleCropClose}
                files={cropFiles}
                onComplete={handleCropComplete}
            />
        </div>
    );
}
