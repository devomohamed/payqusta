import React from 'react';
import { CheckCircle2, AlertCircle, FileText, Tag, Image as ImageIcon, Box } from 'lucide-react';
import { Badge } from '../UI';
import { analyzeSeoContent } from './SeoAnalyzer';

export default function ProductReviewStep({
    form,
    categories,
    productImages,
    pendingImages,
    stepErrors,
    onStepClick
}) {
    const hasErrors = Object.keys(stepErrors).some((key) => stepErrors[key]);
    const categoryName = categories.find((category) => category._id === form.category)?.name || 'بدون قسم';
    const totalImages = productImages.length + pendingImages.length;
    const variantsCount = form.variants?.length || 0;
    const seoTitle = (form.seoTitle || form.name || '').trim();
    const seoText = form.seoDescription || form.description || '';
    const seoScore = analyzeSeoContent({ title: seoTitle, text: seoText }).score;
    const seoQualityVariant = seoScore >= 80 ? 'success' : seoScore >= 50 ? 'warning' : 'danger';
    const seoQualityLabel = seoScore >= 80 ? 'ممتازة' : seoScore >= 50 ? 'متوسطة' : 'ضعيفة';

    const stepNames = {
        basics: 'الأساسيات',
        pricing: 'التسعير والمخزون',
        media: 'الصور والموديلات'
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="mb-8 text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${hasErrors ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {hasErrors ? <AlertCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {hasErrors ? 'هناك أخطاء تمنع حفظ المنتج' : 'المنتج جاهز للحفظ'}
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    {hasErrors
                        ? 'راجع الخطوات التي تحتوي على أخطاء ثم صححها قبل إكمال الحفظ.'
                        : 'راجع الملخص النهائي للتأكد من صحة البيانات قبل اعتماد المنتج.'}
                </p>
            </div>

            {hasErrors && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        المشاكل التي تحتاج إلى حل
                    </h3>
                    <ul className="space-y-2">
                        {Object.keys(stepErrors).map((stepId) => {
                            if (!stepErrors[stepId]) return null;

                            return (
                                <li key={stepId} className="app-surface flex flex-col justify-between gap-3 rounded-xl border border-gray-100/80 p-3 dark:border-white/10 sm:flex-row sm:items-center">
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                        يوجد خطأ في خطوة &quot;{stepNames[stepId] || stepId}&quot;
                                    </span>
                                    <button
                                        onClick={() => onStepClick(stepId)}
                                        className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300"
                                    >
                                        الانتقال للتصحيح
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="app-surface rounded-2xl border border-gray-100/80 p-5 shadow-sm dark:border-white/10">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <FileText className="h-4 w-4 text-blue-500" />
                        ملخص البيانات
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">الاسم</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{form.name || '---'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">القسم</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{categoryName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">SKU</span>
                            <span className="font-mono text-gray-900 dark:text-gray-100">{form.sku || 'تلقائي'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">جودة السيو</span>
                            <Badge variant={seoQualityVariant}>
                                {seoQualityLabel} ({seoScore}%)
                            </Badge>
                        </div>
                        <div className="flex justify-between pb-2">
                            <span className="text-gray-500">الوصف الطويل</span>
                            <Badge variant={form.description ? 'success' : 'gray'}>
                                {form.description ? 'موجود' : 'غير موجود'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="app-surface rounded-2xl border border-gray-100/80 p-5 shadow-sm dark:border-white/10">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <Tag className="h-4 w-4 text-emerald-500" />
                        التسعير والمخزون
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">سعر البيع الأساسي</span>
                            <span className="font-bold text-emerald-600">{Number(form.price || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">سعر التكلفة</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{Number(form.costPrice || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        {!variantsCount && (
                            <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                                <span className="text-gray-500">المخزون الأساسي</span>
                                <span className="font-bold text-gray-900 dark:text-gray-100">{form.stock || 0}</span>
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

                <div className="app-surface rounded-2xl border border-gray-100/80 p-5 shadow-sm dark:border-white/10 md:col-span-2">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                <ImageIcon className="h-4 w-4 text-purple-500" />
                                الصور المرفقة
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="app-surface-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200/80 dark:border-white/10">
                                    {form.primaryImagePreview ? (
                                        <img src={form.primaryImagePreview} className="h-full w-full object-cover" alt="Primary" />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-gray-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalImages} صورة</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">منها {pendingImages.length} صورة سيتم رفعها عند الحفظ.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                <Box className="h-4 w-4 text-rose-500" />
                                الموديلات
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 dark:border-rose-900/30 dark:bg-rose-900/10">
                                    <span className="text-2xl font-black">{variantsCount}</span>
                                    <span className="text-xs font-bold">موديل</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {variantsCount > 0
                                            ? 'سيتم تتبع السعر والمخزون لكل موديل بشكل مستقل، ولن يعتمد المنتج على الكمية الأساسية فقط.'
                                            : 'هذا المنتج لا يحتوي على موديلات، وسيعتمد على السعر والمخزون الأساسيين.'}
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
