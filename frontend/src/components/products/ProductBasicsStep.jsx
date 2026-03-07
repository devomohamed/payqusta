import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Input, Modal, TextArea } from '../UI';
import RichTextEditor from '../RichTextEditor';
import BarcodeScanner from '../BarcodeScanner';
import CategorySelector from '../CategorySelector';
import SeoAnalyzer from './SeoAnalyzer';
import { FileText, Hash, Tag, User, Search, Check, Sparkles } from 'lucide-react';
import { categoriesApi } from '../../store';
import { getIconForCategory, getCategoryIconSuggestions, DEFAULT_CATEGORY_ICON } from '../../utils/aiHelper';

export default function ProductBasicsStep({ form, setForm, categories, suppliers, onCategoriesReload }) {
    const [showScanner, setShowScanner] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [savingCategory, setSavingCategory] = useState(false);
    const [sectionMode, setSectionMode] = useState('root');
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        parent: null,
        icon: DEFAULT_CATEGORY_ICON,
    });

    const openAddCategoryModal = () => {
        setSectionMode('root');
        setCategoryForm({
            name: '',
            description: '',
            parent: null,
            icon: DEFAULT_CATEGORY_ICON,
        });
        setShowCategoryModal(true);
    };

    const handleCategoryNameChange = (name) => {
        const suggestedIcon = getIconForCategory(name);
        setCategoryForm((prev) => ({
            ...prev,
            name,
            icon: suggestedIcon || prev.icon || DEFAULT_CATEGORY_ICON,
        }));
    };

    const handleCreateCategory = async () => {
        if (!categoryForm.name.trim()) {
            toast.error('يرجى إدخال اسم القسم');
            return;
        }
        if (sectionMode === 'child' && !categoryForm.parent) {
            toast.error('اختر القسم الرئيسي أولاً');
            return;
        }

        setSavingCategory(true);
        try {
            const payload = {
                name: categoryForm.name.trim(),
                description: categoryForm.description || '',
                icon: categoryForm.icon || DEFAULT_CATEGORY_ICON,
                parent: sectionMode === 'child' ? categoryForm.parent : null,
            };

            const res = await categoriesApi.create(payload);
            const createdCategory = res?.data?.data;
            const createdCategoryId = createdCategory?._id;

            if (typeof onCategoriesReload === 'function') {
                await onCategoriesReload();
            }
            if (createdCategoryId) {
                setForm((prev) => ({ ...prev, category: createdCategoryId, subcategory: '' }));
            }

            toast.success('تم إضافة القسم واختياره تلقائيًا');
            setShowCategoryModal(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'تعذر إنشاء القسم');
        } finally {
            setSavingCategory(false);
        }
    };

    const iconSuggestions = getCategoryIconSuggestions(categoryForm.name, 10);
    const availableParents = categories.filter((cat) => cat?._id && cat._id !== 'uncategorized');
    const isChildSection = sectionMode === 'child';

    return (
        <div className="space-y-6 animate-fade-in pb-12">

            {/* ─── Section 1: Core Info ─── */}
            <section>
                <SectionHeader icon={FileText} title="المعلومات الأساسية" subtitle="الاسم والأقسام من أهم بيانات المنتج" />
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5">

                    {/* Product Name */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            اسم المنتج
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="مثال: تيشرت بولو قطن مصري 100%"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-base focus:outline-none focus:border-primary-500 transition-colors font-medium"
                            dir="rtl"
                        />
                        {form.name && (
                            <p className="text-xs text-gray-400">{form.name.length}/200 حرف</p>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                    <Tag className="w-4 h-4 text-primary-500" />
                                    الأقسام
                                    <span className="text-xs font-normal text-gray-400">(اختياري - الافتراضي: بدون قسم)</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={openAddCategoryModal}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors whitespace-nowrap"
                                >
                                    إضافة قسم جديد
                                </button>
                            </div>
                            <CategorySelector
                                categories={categories}
                                value={form.category}
                                placeholder="بدون قسم (افتراضي)"
                                onChange={(catId) => setForm({ ...form, category: catId || '', subcategory: '' })}
                            />
                        </div>

                        {/* Subcategory — shown only when selected category has children */}
                        {(() => {
                            const parentCat = categories.find(c => c._id === form.category);
                            const subs = parentCat?.children || [];
                            if (!form.category || subs.length === 0) return null;
                            return (
                                <div className="space-y-1.5 animate-fade-in">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        <Tag className="w-4 h-4 text-primary-400" />
                                        القسم الفرعي
                                        <span className="text-xs font-normal text-gray-400">(اختياري)</span>
                                    </label>
                                    <select
                                        value={form.subcategory || ''}
                                        onChange={e => setForm({ ...form, subcategory: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        dir="rtl"
                                    >
                                        <option value="">— بدون قسم فرعي —</option>
                                        {subs.map(sub => (
                                            <option key={sub._id} value={sub._id}>
                                                {sub.icon ? `${sub.icon} ` : ''}{sub.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Supplier */}
                    {suppliers?.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-primary-500" />
                                المورد (اختياري)
                            </label>
                            <select
                                value={form.supplier}
                                onChange={e => setForm({ ...form, supplier: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                                dir="rtl"
                            >
                                <option value="">بدون مورد</option>
                                {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </section>

            <Modal
                open={showCategoryModal}
                onClose={() => !savingCategory && setShowCategoryModal(false)}
                title="إضافة قسم جديد"
                size="2xl"
            >
                <div className="space-y-5 pb-32">
                    <div className="rounded-3xl border border-primary-500/15 bg-gradient-to-br from-primary-950 via-slate-900 to-slate-950 px-4 py-4 text-white shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-slate-900 shadow-xl">
                                {categoryForm.icon || DEFAULT_CATEGORY_ICON}
                            </div>
                            <div className="flex-1 text-right">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-primary-100">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    اقتراح ذكي للأيقونة
                                </div>
                                <p className="mt-2 text-sm font-bold leading-6 text-white">
                                    يتم اقتراح أيقونة مناسبة تلقائيًا حسب اسم القسم، ويمكنك تعديلها أو اختيار واحدة من الاقتراحات بالأسفل.
                                </p>
                                <p className="mt-1 text-xs text-slate-300">
                                    {isChildSection
                                        ? 'سيُحفظ هذا العنصر كقسم فرعي داخل قسم رئيسي.'
                                        : 'سيظهر هذا العنصر كقسم رئيسي ويمكنك إضافة أقسام فرعية داخله لاحقًا.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <Input
                                label="أيقونة"
                                value={categoryForm.icon}
                                onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                                placeholder={DEFAULT_CATEGORY_ICON}
                            />
                        </div>
                        <div className="col-span-3">
                            <Input
                                label="اسم القسم *"
                                value={categoryForm.name}
                                onChange={(e) => handleCategoryNameChange(e.target.value)}
                                placeholder="مثال: إلكترونيات، ملابس، حريمي..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSectionMode('root');
                                setCategoryForm((prev) => ({ ...prev, parent: null }));
                            }}
                            className={`rounded-2xl border px-4 py-3 text-right transition-all ${!isChildSection ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'}`}
                        >
                            <p className="text-sm font-black">قسم رئيسي</p>
                            <p className="mt-1 text-[11px]">يظهر كقسم أساسي في المتجر.</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSectionMode('child')}
                            className={`rounded-2xl border px-4 py-3 text-right transition-all ${isChildSection ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'}`}
                        >
                            <p className="text-sm font-black">قسم فرعي</p>
                            <p className="mt-1 text-[11px]">يرتبط بقسم رئيسي موجود.</p>
                        </button>
                    </div>

                    {isChildSection ? (
                        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                            <CategorySelector
                                label="القسم الرئيسي *"
                                value={categoryForm.parent}
                                onChange={(val) => setCategoryForm((prev) => ({ ...prev, parent: val }))}
                                categories={availableParents}
                                placeholder="اختر القسم الرئيسي الذي سيتبع له هذا القسم"
                            />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/70 px-4 py-3 text-right">
                            <p className="text-sm font-black text-emerald-700">هذا قسم رئيسي</p>
                            <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                                بعد الحفظ يمكنك إضافة أقسام فرعية داخله مثل شاشات، لابتوبات، حريمي، رجالي، أطفال وغيرها.
                            </p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-800 dark:text-white">أيقونات مقترحة</p>
                                <p className="text-[11px] text-gray-500">اختيارات أكثر وضوحًا حسب نوع القسم.</p>
                            </div>
                            <Sparkles className="h-4 w-4 text-primary-500" />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {iconSuggestions.map((icon) => (
                                <button
                                    key={`${categoryForm.name || 'default'}-${icon}`}
                                    type="button"
                                    onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                                    className={`flex h-12 items-center justify-center rounded-2xl border text-2xl transition-all ${categoryForm.icon === icon ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-500/10' : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/40'}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <TextArea
                        label="وصف مختصر (اختياري)"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="أضف وصفًا مختصرًا يوضح محتوى هذا القسم للعميل..."
                        rows={3}
                    />
                </div>

                <div className="sticky bottom-20 z-30 mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3 flex justify-end gap-3 shadow-lg">
                    <Button variant="ghost" onClick={() => setShowCategoryModal(false)} disabled={savingCategory}>
                        إلغاء
                    </Button>
                    <Button icon={<Check className="w-4 h-4" />} onClick={handleCreateCategory} loading={savingCategory}>
                        حفظ
                    </Button>
                </div>
            </Modal>

            {/* ─── Section 2: Description ─── */}
            <section>
                <SectionHeader
                    icon={FileText}
                    title="وصف المنتج"
                    subtitle="اكتب وصفاً شاملاً — يدعم كل تنسيقات النص والصور"
                    badge="Word-like Editor"
                />
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-visible">
                    <RichTextEditor
                        value={form.description}
                        onChange={content => setForm({ ...form, description: content })}
                        minHeight={320}
                    />
                    {form.description && (
                        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3">
                            <SeoAnalyzer text={form.description} title={form.name} />
                        </div>
                    )}
                </div>
            </section>

            {/* ─── Section 3: Identification ─── */}
            <section>
                <SectionHeader icon={Hash} title="التنظيم والتعريف" subtitle="الباركود، كود الصنف، وتاريخ الانتهاء" />
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* SKU */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                كود الصنف (SKU)
                            </label>
                            <input
                                type="text"
                                value={form.sku}
                                onChange={e => setForm({ ...form, sku: e.target.value })}
                                placeholder="اتركه فارغاً للتوليد التلقائي"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors font-mono"
                                dir="ltr"
                            />
                            <p className="text-xs text-gray-400">الرمز التعريفي الفريد للمنتج في المستودع</p>
                        </div>

                        {/* Barcode */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                الباركود
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.barcode}
                                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                                    placeholder="امسح الباركود أو أدخله يدوياً"
                                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors font-mono"
                                    dir="ltr"
                                />
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-4 py-3 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 rounded-xl transition-colors shrink-0"
                                    type="button"
                                >
                                    <Search className="w-5 h-5 inline-block" />
                                </button>
                                {showScanner && (
                                    <BarcodeScanner
                                        onScan={code => {
                                            setForm({ ...form, barcode: code });
                                            setShowScanner(false);
                                        }}
                                        onClose={() => setShowScanner(false)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                تاريخ الانتهاء (اختياري)
                            </label>
                            <input
                                type="date"
                                value={form.expiryDate}
                                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                            />
                        </div>

                    </div>
                </div>
            </section>

            {/* ─── Section 4: SEO ─── */}
            <section>
                <SectionHeader
                    icon={Search}
                    title="تحسين محركات البحث (SEO)"
                    subtitle="اجعل منتجك يظهر في Google وعند مشاركة الرابط"
                    badge="اختياري"
                />
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5">

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            عنوان SEO
                        </label>
                        <input
                            type="text"
                            value={form.seoTitle || ''}
                            onChange={e => setForm({ ...form, seoTitle: e.target.value })}
                            placeholder="مثال: تيشرت بولو قطن مصري - أفضل سعر"
                            maxLength={70}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
                            dir="rtl"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>يظهر في نتائج Google — يفضل أقل من 60 حرف</span>
                            <span className={`font-mono ${(form.seoTitle?.length || 0) > 60 ? 'text-orange-500' : ''}`}>
                                {form.seoTitle?.length || 0}/70
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            وصف SEO
                        </label>
                        <textarea
                            value={form.seoDescription || ''}
                            onChange={e => setForm({ ...form, seoDescription: e.target.value })}
                            placeholder="اكتب وصفاً مختصراً وجذاباً ليظهر في نتائج البحث ومعاينة الروابط..."
                            rows={3}
                            maxLength={180}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors resize-none text-sm leading-relaxed"
                            dir="rtl"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>يظهر أسفل العنوان في Google — يفضل بين 150-160 حرف</span>
                            <span className={`font-mono ${(form.seoDescription?.length || 0) > 160 ? 'text-orange-500' : ''}`}>
                                {form.seoDescription?.length || 0}/180
                            </span>
                        </div>
                    </div>

                    {/* Google Preview */}
                    {(form.seoTitle || form.name) && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-400 mb-2 font-semibold">معاينة في Google</p>
                            <p className="text-base text-blue-600 font-medium leading-tight truncate">
                                {form.seoTitle || form.name}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                                {window.location.hostname}/store/products/...
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {form.seoDescription || (form.description ? form.description.replace(/<[^>]*>/g, '').slice(0, 155) : 'لا يوجد وصف بعد...')}
                            </p>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
}

/* ─── Helper: Section Header ─── */
function SectionHeader({ icon: Icon, title, subtitle, badge }) {
    return (
        <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">{title}</h3>
                    {badge && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                            {badge}
                        </span>
                    )}
                </div>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}
