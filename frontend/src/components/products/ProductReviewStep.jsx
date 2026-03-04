import React from 'react';
import { Badge } from '../UI';
import { CheckCircle2, AlertCircle, FileText, Tag, Image as ImageIcon, Box } from 'lucide-react';

export default function ProductReviewStep({
    form,
    categories,
    productImages,
    pendingImages,
    stepErrors,
    onStepClick
}) {
    const hasErrors = Object.keys(stepErrors).some(k => stepErrors[k]);
    const categoryName = categories.find(c => c._id === form.category)?.name || 'غير محدد';
    const totalImages = productImages.length + pendingImages.length;
    const variantsCount = form.variants?.length || 0;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="text-center mb-8">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${hasErrors ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {hasErrors ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {hasErrors ? 'هناك أخطاء تمنع الحفظ' : 'المنتج جاهز للحفظ!'}
                </h2>
                <p className="text-gray-500 mt-2">
                    {hasErrors
                        ? 'يرجى مراجعة الخطوات التي تحتوي على أخطاء وتصحيحها قبل المتابعة.'
                        : 'قم بمراجعة الملخص الأخير للتأكد من صحة البيانات قبل الاعتماد.'}
                </p>
            </div>

            {hasErrors && (
                <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 rounded-2xl p-6">
                    <h3 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" /> المشاكل التي تحتاج إلى حل:
                    </h3>
                    <ul className="space-y-2">
                        {Object.keys(stepErrors).map(stepId => {
                            if (!stepErrors[stepId]) return null;

                            // Map step ID to readable name
                            const stepNames = {
                                basics: 'الأساسيات',
                                pricing: 'التسعير والمخزون',
                                media: 'الصور والموديلات'
                            };

                            return (
                                <li key={stepId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 dark:bg-gray-900/50 p-3 rounded-xl">
                                    <span className="text-red-600 dark:text-red-400 text-sm font-semibold">
                                        خطأ في خطوة "{stepNames[stepId] || stepId}"
                                    </span>
                                    <button
                                        onClick={() => onStepClick(stepId)}
                                        className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-bold rounded-lg hover:bg-red-200 transition-colors shrink-0"
                                    >
                                        الذهاب للتصحيح &larr;
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Basics Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" /> ملخص البيانات
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                            <span className="text-gray-500">الاسم</span>
                            <span className="font-bold">{form.name || '---'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                            <span className="text-gray-500">التصنيف</span>
                            <span className="font-bold">{categoryName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                            <span className="text-gray-500">SKU</span>
                            <span className="font-mono">{form.sku || 'تلقائي'}</span>
                        </div>
                        <div className="flex justify-between pb-2">
                            <span className="text-gray-500">الوصف الطويل</span>
                            <Badge variant={form.description ? 'success' : 'gray'}>
                                {form.description ? 'مضمن' : 'لا يوجد'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Pricing Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-500" /> التسعير والمخزون
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                            <span className="text-gray-500">سعر البيع الأساسي</span>
                            <span className="font-bold text-emerald-600">{Number(form.price || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                            <span className="text-gray-500">التكلفة</span>
                            <span className="font-bold">{Number(form.costPrice || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        {!variantsCount && (
                            <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                                <span className="text-gray-500">المخزون الأساسي</span>
                                <span className="font-bold">{form.stock || 0}</span>
                            </div>
                        )}
                        <div className="flex justify-between pb-2">
                            <span className="text-gray-500">الشحن</span>
                            <Badge variant={form.isFreeShipping ? 'success' : 'gray'}>
                                {form.isFreeShipping ? 'مجاني' : 'مدفوع'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Media & Variants Combo Card */}
                <div className="md:col-span-2 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-purple-500" /> الصور المرفقة
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    {form.primaryImagePreview ? (
                                        <img src={form.primaryImagePreview} className="w-full h-full object-cover" alt="Primary" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{totalImages} صورة</p>
                                    <p className="text-sm text-gray-500">منها {pendingImages.length} سيتم رفعها الآن.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <Box className="w-4 h-4 text-rose-500" /> המודيلات (Variants)
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 shrink-0 flex flex-col items-center justify-center text-rose-500">
                                    <span className="text-2xl font-black">{variantsCount}</span>
                                    <span className="text-xs font-bold">موديل</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {variantsCount > 0
                                            ? 'سيتم تتبع المخزون والأسعار لكل موديل بشكل منفصل متجاهلاً إعدادات المخزون الأساسية.'
                                            : 'هذا المنتج ليس له موديلات، سيتم الاعتماد على التسعير الأساسي والمخزون.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
