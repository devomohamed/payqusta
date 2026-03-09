import React, { useRef, useState } from 'react';
import { Badge, Input, Button } from '../UI';
import { UploadCloud, Image as ImageIcon, Trash2, Star, Plus, Tag, ChevronDown, ChevronUp, AlertTriangle, Copy, Layers, TrendingUp, Package, Palette, Ruler, ChevronsUpDown } from 'lucide-react';

// Preset color swatches
const COLOR_SWATCHES = [
    { name: 'أسود', hex: '#1a1a1a' }, { name: 'أبيض', hex: '#f5f5f5' },
    { name: 'رمادي', hex: '#9ca3af' }, { name: 'أحمر', hex: '#ef4444' },
    { name: 'وردي', hex: '#ec4899' }, { name: 'برتقالي', hex: '#f97316' },
    { name: 'أصفر', hex: '#eab308' }, { name: 'أخضر', hex: '#22c55e' },
    { name: 'نعناعي', hex: '#10b981' }, { name: 'سماوي', hex: '#06b6d4' },
    { name: 'أزرق', hex: '#3b82f6' }, { name: 'بنفسجي', hex: '#8b5cf6' },
    { name: 'بني', hex: '#92400e' }, { name: 'ذهبي', hex: '#d97706' },
    { name: 'فضي', hex: '#64748b' },
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

function StockBadge({ stock }) {
    const qty = Number(stock) || 0;
    if (qty === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">نفد</span>;
    if (qty <= 5) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">منخفض</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">متاح</span>;
}

function ProfitBadge({ price, cost }) {
    const p = Number(price), c = Number(cost);
    if (!p || !c) return null;
    const margin = Math.round(((p - c) / p) * 100);
    const color = margin >= 30 ? 'text-emerald-600' : margin >= 10 ? 'text-amber-600' : 'text-red-500';
    return <span className={`text-[10px] font-bold ${color}`}>هامش {margin}%</span>;
}

function ColorSwatch({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const active = COLOR_SWATCHES.find(c => c.name === value);
    return (
        <div className="relative">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">اللون</label>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 transition-colors"
            >
                {active
                    ? <><span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ background: active.hex }} /><span className="text-sm font-medium text-gray-700 dark:text-gray-200">{active.name}</span></>
                    : <span className="text-sm text-gray-400">اختر لون...</span>
                }
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 mr-auto" />
            </button>
            {open && (
                <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3">
                    <div className="grid grid-cols-5 gap-2 mb-2">
                        {COLOR_SWATCHES.map(c => (
                            <button
                                key={c.name} type="button"
                                title={c.name}
                                onClick={() => { onChange(c.name); setOpen(false); }}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${value === c.name ? 'border-primary-500 scale-110 ring-2 ring-primary-300' : 'border-transparent'}`}
                                style={{ background: c.hex }}
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="لون مخصص..."
                        value={COLOR_SWATCHES.find(c => c.name === value) ? '' : value || ''}
                        onChange={e => onChange(e.target.value)}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-primary-400"
                    />
                </div>
            )}
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
    onPrimaryImageSelect,
    onRemoveImage,
    onAddVariant,
    onUpdateVariant,
    onRemoveVariant
}) {
    const fileInputRef = useRef(null);
    const [allExpanded, setAllExpanded] = useState(true);

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

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files?.length > 0) onImagesChange({ target: { files: e.dataTransfer.files } });
    };

    const safePending = Array.isArray(pendingImages) ? pendingImages : [];
    const allImages = [
        ...productImages.map(url => ({ type: 'existing', url })),
        ...safePending.map((file, idx) => ({ type: 'pending', file, url: file._previewUrl || URL.createObjectURL(file), index: idx }))
    ];

    const toggleVariant = (index) => {
        const newVariants = [...form.variants];
        newVariants[index].expanded = !newVariants[index].expanded;
        setForm({ ...form, variants: newVariants });
    };

    const toggleAllVariants = () => {
        const next = !allExpanded;
        setAllExpanded(next);
        setForm({ ...form, variants: form.variants.map(v => ({ ...v, expanded: next })) });
    };

    const duplicateVariant = (idx) => {
        const clone = { ...form.variants[idx], sku: '', expanded: true };
        const updated = [...form.variants];
        updated.splice(idx + 1, 0, clone);
        setForm({ ...form, variants: updated });
    };

    const addSizeSet = () => {
        const newVars = SIZE_PRESETS.map(size => ({
            attributes: { 'الحجم': size, 'اللون': '' },
            sku: '', barcode: '', internationalBarcode: '', internationalBarcodeType: 'UNKNOWN', localBarcode: '', localBarcodeType: 'CODE128',
            price: form.price || '', cost: form.costPrice || '',
            stock: form.stock || '', expanded: true,
            description: '', image: '',
        }));
        setForm({ ...form, variants: [...(form.variants || []), ...newVars] });
    };

    const addColorSet = () => {
        const colors = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر'];
        const newVars = colors.map(color => ({
            attributes: { 'الحجم': '', 'اللون': color },
            sku: '', barcode: '', internationalBarcode: '', internationalBarcodeType: 'UNKNOWN', localBarcode: '', localBarcodeType: 'CODE128',
            price: form.price || '', cost: form.costPrice || '',
            stock: form.stock || '', expanded: true,
            description: '', image: '',
        }));
        setForm({ ...form, variants: [...(form.variants || []), ...newVars] });
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

    const variantPrices = (form.variants || []).filter(v => v.price).map(v => Number(v.price));

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* ── 1. Media Section ── */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-purple-500" />
                            صور المنتج
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">أول صورة تم اختيارها ستكون هي الصورة الرئيسية.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-64 group"
                        >
                            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">اسحب الصور هنا أو اضغط للاختيار</h4>
                            <p className="text-sm text-gray-500 mb-4">يدعم JPG, PNG, WEBP حتى {maxImageCount} صور مع ضغط تلقائي قبل الحفظ</p>
                            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={onImagesChange} />
                            <Button type="button" variant="outline" size="sm">تصفح الملفات</Button>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="relative border-2 border-gray-100 dark:border-gray-800 rounded-2xl p-5 h-full flex flex-col bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-800/40 dark:to-gray-900/40 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[50px] rounded-full -z-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full -z-10" />

                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0 drop-shadow-sm" />
                                    الصورة الرئيسية
                                </h4>
                                {form.primaryImagePreview && (
                                    <Badge variant="primary" className="text-[10px] px-2 py-0.5 shadow-sm">المختارة</Badge>
                                )}
                            </div>

                            {form.primaryImagePreview ? (
                                <div className="flex-1 rounded-xl overflow-hidden border-2 border-primary-100 dark:border-primary-900/30 relative group shadow-sm bg-white dark:bg-gray-900/50">
                                    <img
                                        src={form.primaryImagePreview}
                                        alt="Primary"
                                        className="w-full h-full object-contain absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                        <span className="text-white text-xs font-semibold px-3 py-1 bg-black/40 backdrop-blur-md rounded-full">الصورة المختارة كغلاف</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 group-hover:border-primary-300 transition-colors backdrop-blur-sm relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100/50 to-transparent dark:from-gray-800/30 dark:to-transparent" />
                                    <ImageIcon className="w-10 h-10 opacity-40 mb-3 drop-shadow-sm" />
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 z-10 px-4 text-center">انقر على <Star className="w-3.5 h-3.5 inline text-amber-500 mx-1" /> على أي صورة لتعيينها كصورة رئيسية</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {allImages.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">الصور المحملة ({allImages.length})</h4>
                        <div className="flex flex-wrap gap-4">
                            {allImages.map((img, idx) => {
                                const isPrimary = img.url === form.primaryImagePreview;
                                return (
                                    <div key={idx}
                                        className={`relative group w-24 h-24 rounded-xl overflow-hidden cursor-pointer transition-all ${isPrimary ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : 'border border-gray-200 dark:border-gray-700 hover:border-primary-400'} ${img.type === 'pending' ? 'border-dashed' : ''}`}
                                        onClick={() => onPrimaryImageSelect(img.url)}
                                    >
                                        <img src={img.url} alt={`img-${idx}`} className="w-full h-full object-cover bg-white" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={e => { e.stopPropagation(); onPrimaryImageSelect(img.url); }} className="p-1.5 bg-white text-gray-900 rounded-lg hover:text-primary-600" title="رئيسية"><Star className="w-4 h-4" /></button>
                                            <button onClick={e => { e.stopPropagation(); onRemoveImage(img.type, img.type === 'existing' ? img.url : img.index); }} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        {img.type === 'pending' && !isPrimary && <div className="absolute top-1 right-1"><Badge variant="warning" className="text-[9px] px-1.5">معلقة</Badge></div>}
                                        {isPrimary && <div className="absolute top-1 right-1"><Badge variant="primary" className="text-[9px] px-1.5">رئيسية</Badge></div>}
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
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-rose-500" />
                            موديلات المنتج
                            {form.variants?.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                                    {form.variants.length} موديل
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">أضف مقاسات أو ألوان لتتبع مخزونها وسعرها بشكل منفصل.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {(form.variants?.length || 0) > 1 && (
                            <button type="button" onClick={toggleAllVariants}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <ChevronsUpDown className="w-3.5 h-3.5" />
                                {allExpanded ? 'طي الكل' : 'توسيع الكل'}
                            </button>
                        )}
                        <Button type="button" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addBlankVariant}>
                            إضافة موديل
                        </Button>
                    </div>
                </div>

                {/* Quick Template Bar */}
                <div className="px-6 py-3 bg-gray-50/70 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">إضافة سريعة:</span>
                    <button type="button" onClick={addSizeSet}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all">
                        <Ruler className="w-3.5 h-3.5" /> مقاسات XS→3XL
                    </button>
                    <button type="button" onClick={addColorSet}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-rose-400 hover:text-rose-600 transition-all">
                        <Palette className="w-3.5 h-3.5" /> ألوان أساسية (5)
                    </button>
                    <button type="button" onClick={addBlankVariant}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600 transition-all">
                        <Tag className="w-3.5 h-3.5" /> موديل مخصص
                    </button>
                </div>

                {/* Variants List */}
                <div className="p-4 space-y-3">
                    {(form.variants?.length || 0) > 0 ? (
                        form.variants.map((v, idx) => {
                            const expanded = v.expanded !== false;
                            const accent = VARIANT_ACCENTS[idx % VARIANT_ACCENTS.length];
                            const label = getVariantLabel(v);
                            const colorSwatch = COLOR_SWATCHES.find(c => c.name === v.attributes?.['اللون']);

                            return (
                                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-visible bg-white dark:bg-gray-900 shadow-sm">

                                    {/* Card Header */}
                                    <div className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none rounded-2xl`}
                                        onClick={() => toggleVariant(idx)}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 bg-${accent}-100 dark:bg-${accent}-900/30 text-${accent}-600`}>
                                            {idx + 1}
                                        </div>
                                        {colorSwatch && (
                                            <span className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow shrink-0"
                                                style={{ background: colorSwatch.hex }} title={colorSwatch.name} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                                    {label || <span className="text-gray-400 font-normal">موديل جديد #{idx + 1}</span>}
                                                </h4>
                                                <StockBadge stock={v.stock} />
                                                <ProfitBadge price={v.price} cost={v.cost} />
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                                                {v.sku && <span className="font-mono">{v.sku}</span>}
                                                {v.price && <span className="font-bold text-emerald-600">{Number(v.price).toLocaleString('en-US')} ج.م</span>}
                                                {v.stock !== undefined && v.stock !== '' && <span>مخزون: {v.stock}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button type="button" onClick={() => duplicateVariant(idx)}
                                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="نسخ">
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <button type="button" onClick={() => onRemoveVariant(idx)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="حذف">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="p-1 text-gray-300">
                                                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    {expanded && (
                                        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20">
                                            {/* Size quick-pick */}
                                            <div className="px-4 pt-3 pb-0">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">مقاس سريع</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {SIZE_PRESETS.map(s => (
                                                        <button key={s} type="button"
                                                            onClick={() => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'الحجم': s })}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${v.attributes?.['الحجم'] === s ? 'bg-primary-500 text-white border-primary-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600'}`}>
                                                            {s}
                                                        </button>
                                                    ))}
                                                    <button type="button"
                                                        onClick={() => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'الحجم': '' })}
                                                        className="px-2.5 py-1 rounded-lg text-xs border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-400">
                                                        مخصص
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
                                                {/* Size text */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">المقاس / الحجم</label>
                                                    <input type="text" placeholder="XL, 2Kg..." value={v.attributes?.['الحجم'] || ''}
                                                        onChange={e => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'الحجم': e.target.value })}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                                                </div>

                                                {/* Color swatch */}
                                                <div className="lg:col-span-1">
                                                    <ColorSwatch
                                                        value={v.attributes?.['اللون'] || ''}
                                                        onChange={val => onUpdateVariant(idx, 'attributes', { ...v.attributes, 'اللون': val })}
                                                    />
                                                </div>

                                                {/* SKU */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">كود SKU</label>
                                                    <input type="text" placeholder="SKU-001" value={v.sku || ''}
                                                        onChange={e => onUpdateVariant(idx, 'sku', e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" dir="ltr" />
                                                </div>

                                                {/* International Barcode */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">الباركود الدولي</label>
                                                    <input type="text" placeholder="6001234..." value={v.internationalBarcode || v.barcode || ''}
                                                        onChange={e => onUpdateVariant(idx, 'internationalBarcode', e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" dir="ltr" />
                                                </div>

                                                {/* Local Barcode */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">الباركود المحلي</label>
                                                    <input type="text" placeholder="000000000001" value={v.localBarcode || ''}
                                                        onChange={e => onUpdateVariant(idx, 'localBarcode', e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" dir="ltr" />
                                                </div>

                                                {/* Sale Price */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">سعر البيع</label>
                                                    <div className="relative">
                                                        <input type="number" placeholder="0.00" value={v.price || ''}
                                                            onChange={e => onUpdateVariant(idx, 'price', e.target.value)}
                                                            className="w-full px-3 py-2.5 pl-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors" dir="ltr" />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">ج.م</span>
                                                    </div>
                                                </div>

                                                {/* Cost Price */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                                        سعر التكلفة <ProfitBadge price={v.price} cost={v.cost} />
                                                    </label>
                                                    <div className="relative">
                                                        <input type="number" placeholder="0.00" value={v.cost || ''}
                                                            onChange={e => onUpdateVariant(idx, 'cost', e.target.value)}
                                                            className="w-full px-3 py-2.5 pl-10 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors" dir="ltr" />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">ج.م</span>
                                                    </div>
                                                </div>

                                                {/* Variant Stock */}
                                                <div className="lg:col-span-1">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                                        المخزون
                                                    </label>
                                                    <input type="number" placeholder="0" value={v.stock || ''}
                                                        onChange={e => onUpdateVariant(idx, 'stock', Number(e.target.value))}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" dir="ltr" />
                                                </div>

                                                {/* Variant Description */}
                                                <div className="col-span-2 md:col-span-3 lg:col-span-6 mt-4">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                                        وصف الموديل (اختياري)
                                                    </label>
                                                    <textarea rows={3} placeholder="أضف وصفاً خاصاً بهذا الموديل للعملاء.." value={v.description || ''}
                                                        onChange={e => onUpdateVariant(idx, 'description', e.target.value)}
                                                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                                                </div>

                                                {/* Variant Image */}
                                                <div className="col-span-2 md:col-span-3 lg:col-span-6 mt-4">
                                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                                        صورة الموديل (تظهر عند اختيار هذا الموديل)
                                                    </label>
                                                    <div className="flex items-start gap-4">
                                                        {v.image ? (
                                                            <div className="w-20 h-20 rounded-xl border-2 border-primary-100 dark:border-primary-900 overflow-hidden relative group">
                                                                <img src={v.image} className="w-full h-full object-cover" alt="Variant" />
                                                                <button type="button" onClick={() => onUpdateVariant(idx, 'image', '')} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 max-w-sm">
                                                                <label className="flex items-center justify-center w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <UploadCloud className="w-5 h-5 text-gray-400" />
                                                                        <span className="text-xs text-gray-500 font-semibold">اضغط لرفع صورة الموديل</span>
                                                                    </div>
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVariantImageUpload(idx, e.target.files[0])} />
                                                                </label>
                                                                <p className="text-[10px] text-gray-400 mt-1">يُنصح بصورة مربعة (مثل 600x600)</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        /* Empty State */
                        <div className="py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 flex items-center justify-center text-rose-400 mb-5 shadow-inner">
                                <Layers className="w-10 h-10" />
                            </div>
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-1.5">لا توجد موديلات بعد</h4>
                            <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
                                أضف موديلات إذا كان منتجك يتوفر بأكثر من لون أو مقاس.<br />
                                استخدم القوالب السريعة لتوفير الوقت.
                            </p>
                            <div className="flex items-center gap-3 flex-wrap justify-center">
                                <button type="button" onClick={addSizeSet}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-bold transition-all">
                                    <Ruler className="w-4 h-4" /> مقاسات جاهزة
                                </button>
                                <button type="button" onClick={addColorSet}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-bold transition-all">
                                    <Palette className="w-4 h-4" /> ألوان جاهزة
                                </button>
                                <Button type="button" variant="outline" icon={<Plus className="w-4 h-4" />} onClick={addBlankVariant}>
                                    موديل مخصص
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Summary */}
                {(form.variants?.length || 0) > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center gap-6 text-xs text-gray-500 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            إجمالي المخزون:
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                {form.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0).toLocaleString('en-US')} وحدة
                            </span>
                        </div>
                        {variantPrices.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5" />
                                نطاق السعر:
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                    {Math.min(...variantPrices).toLocaleString('en-US')} — {Math.max(...variantPrices).toLocaleString('en-US')} ج.م
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
