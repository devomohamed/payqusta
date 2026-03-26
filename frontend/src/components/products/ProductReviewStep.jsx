import React from 'react';
import { CheckCircle2, AlertCircle, FileText, Tag, Image as ImageIcon, Box } from 'lucide-react';
import { Badge } from '../UI';
import { analyzeSeoContent } from './SeoAnalyzer';
import { useTranslation } from 'react-i18next';

export default function ProductReviewStep({
    form,
    categories,
    productImages,
    pendingImages,
    stepErrors,
    onStepClick
}) {
  const { t } = useTranslation('admin');
    const hasErrors = Object.keys(stepErrors).some((key) => stepErrors[key]);
    const categoryName = categories.find((category) => category._id === form.category)?.name || t('product_review_step.toasts.kmn6v53');
    const totalImages = productImages.length + pendingImages.length;
    const variantsCount = form.variants?.length || 0;
    const seoTitle = (form.seoTitle || form.name || '').trim();
    const seoText = form.seoDescription || form.description || '';
    const seoScore = analyzeSeoContent({ title: seoTitle, text: seoText }).score;
    const seoQualityVariant = seoScore >= 80 ? 'success' : seoScore >= 50 ? 'warning' : 'danger';
    const seoQualityLabel = seoScore >= 80 ? t('product_review_step.ui.k3whpsk') : seoScore >= 50 ? t('product_review_step.ui.k3i6oea') : t('product_review_step.ui.kp3gawf');

    const stepNames = {
        basics: t('product_review_step.ui.kr269xo'),
        pricing: t('product_review_step.ui.k5m4q6w'),
        media: t('product_review_step.ui.kq2q7vn')
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="mb-8 text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${hasErrors ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {hasErrors ? <AlertCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {hasErrors ? t('product_review_step.ui.knjvvyp') : 'المنتج جاهز للحفظ'}
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    {hasErrors
                        ? t('product_review_step.ui.kh79hx4') : 'راجع الملخص النهائي للتأكد من صحة البيانات قبل اعتماد المنتج.'}
                </p>
            </div>

            {hasErrors && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/10">
                    <h3 className="mb-4 flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        {t('product_review_step.ui.klr9xsw')}
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
                                        {t('product_review_step.ui.kiluxjq')}
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
                        {t('product_review_step.ui.k5k0w1x')}
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">{t('product_review_step.ui.kovdol8')}</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{form.name || '---'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">{t('product_review_step.ui.kove8lz')}</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{categoryName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">SKU</span>
                            <span className="font-mono text-gray-900 dark:text-gray-100">{form.sku || t('product_review_step.toasts.k8vuk0t')}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">{t('product_review_step.ui.kep6dna')}</span>
                            <Badge variant={seoQualityVariant}>
                                {seoQualityLabel} ({seoScore}%)
                            </Badge>
                        </div>
                        <div className="flex justify-between pb-2">
                            <span className="text-gray-500">{t('product_review_step.ui.k6lq18x')}</span>
                            <Badge variant={form.description ? 'success' : 'gray'}>
                                {form.description ? t('product_review_step.ui.kpby6j4') : 'غير موجود'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="app-surface rounded-2xl border border-gray-100/80 p-5 shadow-sm dark:border-white/10">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <Tag className="h-4 w-4 text-emerald-500" />
                        {t('product_review_step.ui.k5m4q6w')}
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">{t('product_review_step.ui.k4764oa')}</span>
                            <span className="font-bold text-emerald-600">{Number(form.price || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                            <span className="text-gray-500">{t('product_review_step.ui.ksb0r33')}</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{Number(form.costPrice || 0).toLocaleString('en-US')} ج.م</span>
                        </div>
                        {!variantsCount && (
                            <div className="flex justify-between border-b border-gray-50/80 pb-2 dark:border-white/10">
                                <span className="text-gray-500">{t('product_review_step.ui.ku2vndn')}</span>
                                <span className="font-bold text-gray-900 dark:text-gray-100">{form.stock || 0}</span>
                            </div>
                        )}
                        <div className="flex justify-between pb-2">
                            <span className="text-gray-500">{t('product_review_step.ui.kovdy34')}</span>
                            <Badge variant={form.isFreeShipping ? 'success' : 'gray'}>
                                {form.isFreeShipping ? t('product_review_step.ui.kpbg75w') : 'مدفوع'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="app-surface rounded-2xl border border-gray-100/80 p-5 shadow-sm dark:border-white/10 md:col-span-2">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                <ImageIcon className="h-4 w-4 text-purple-500" />
                                {t('product_review_step.ui.klg3ew0')}
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
                                {t('product_review_step.ui.kf5q0wk')}
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 dark:border-rose-900/30 dark:bg-rose-900/10">
                                    <span className="text-2xl font-black">{variantsCount}</span>
                                    <span className="text-xs font-bold">{t('product_review_step.ui.kpby8ti')}</span>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {variantsCount > 0
                                            ? t('product_review_step.ui.kbk37e8') : 'هذا المنتج لا يحتوي على موديلات، وسيعتمد على السعر والمخزون الأساسيين.'}
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
