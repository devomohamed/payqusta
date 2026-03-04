import React, { useRef, useState } from 'react';
import { Input, Select, TextArea } from '../UI';
import RichTextEditor from '../RichTextEditor';
import BarcodeScanner from '../BarcodeScanner';
import CategorySelector from '../CategorySelector';
import SeoAnalyzer from './SeoAnalyzer';
import { FileText, Hash, Tag, User, Search } from 'lucide-react';

export default function ProductBasicsStep({ form, setForm, categories, suppliers }) {
    const [showScanner, setShowScanner] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in pb-12">

            {/* ─── Section 1: Core Info ─── */}
            <section>
                <SectionHeader icon={FileText} title="المعلومات الأساسية" subtitle="الاسم والتصنيف هما أهم بيانات المنتج" />
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
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Tag className="w-4 h-4 text-primary-500" />
                                التصنيف
                                <span className="text-red-500">*</span>
                            </label>
                            <CategorySelector
                                categories={categories}
                                value={form.category}
                                onChange={(catId) => setForm({ ...form, category: catId, subcategory: '' })}
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
                                        التصنيف الفرعي
                                        <span className="text-xs font-normal text-gray-400">(اختياري)</span>
                                    </label>
                                    <select
                                        value={form.subcategory || ''}
                                        onChange={e => setForm({ ...form, subcategory: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                                        dir="rtl"
                                    >
                                        <option value="">— بدون تصنيف فرعي —</option>
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

            {/* ─── Section 2: Description ─── */}
            <section>
                <SectionHeader
                    icon={FileText}
                    title="وصف المنتج"
                    subtitle="اكتب وصفاً شاملاً — يدعم كل تنسيقات النص والصور"
                    badge="Word-like Editor"
                />
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
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
