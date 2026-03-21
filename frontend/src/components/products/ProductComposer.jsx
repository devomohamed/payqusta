import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../UI';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { confirm } from '../ConfirmDialog';
import ProductComposerHeader from './ProductComposerHeader';
import ProductComposerSidebar from './ProductComposerSidebar';
import ProductBasicsStep from './ProductBasicsStep';
import ProductPricingStep from './ProductPricingStep';
import ProductMediaStep from './ProductMediaStep';
import ProductReviewStep from './ProductReviewStep';

export const COMPOSER_STEPS = [
    { id: 'basics', label: 'الأساسيات', desc: 'الاسم والأقسام' },
    { id: 'pricing', label: 'التسعير والمخزون', desc: 'السعر والكميات' },
    { id: 'media', label: 'الصور والموديلات', desc: 'الوسائط والمتغيرات' },
    { id: 'review', label: 'المراجعة والحفظ', desc: 'الملخص النهائي' },
];

export default function ProductComposer({
    open,
    onClose,
    mode = 'create',
    productId = '',
    loading = false,
    form,
    setForm,
    categories = [],
    suppliers = [],
    onCategoriesReload,
    branches = [],
    user = null,
    can = () => false,
    branchScopeId = '',
    mainBranchOption = null,
    productImages = [],
    pendingImages = [],
    maxImageCount = 10,
    onImagesChange,
    onPendingImageReplace,
    onPrimaryImageSelect,
    onRemoveImage,
    onSubmit,
    onQuickSuspend,
    onSuspendDraft,
    onAddVariant,
    onUpdateVariant,
    onRemoveVariant,
    stepErrors = {},
    pricingErrors = {},
    isDirty = false,
}) {
    const [activeStep, setActiveStep] = useState('basics');
    const [visitedSteps, setVisitedSteps] = useState(['basics']);

    const handleCloseRequest = async () => {
        if (loading) return;

        if (isDirty) {
            const approved = await confirm.warn(
                'لديك تغييرات غير محفوظة، هل أنت متأكد من الإغلاق؟',
                'تأكيد الإغلاق',
            );

            if (approved) onClose();
            return;
        }

        onClose();
    };

    useEffect(() => {
        if (open) {
            setActiveStep('basics');
            setVisitedSteps(['basics']);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const errorStep = Object.keys(stepErrors).find((key) => stepErrors[key]);
        if (!errorStep) return;

        setActiveStep(errorStep);
        if (!visitedSteps.includes(errorStep)) {
            setVisitedSteps((prev) => [...prev, errorStep]);
        }
    }, [open, stepErrors, visitedSteps]);

    const handleStepClick = (stepId) => {
        setActiveStep(stepId);
        if (!visitedSteps.includes(stepId)) {
            setVisitedSteps((prev) => [...prev, stepId]);
        }
    };

    const handleNext = () => {
        const currentIndex = COMPOSER_STEPS.findIndex((step) => step.id === activeStep);
        if (currentIndex < COMPOSER_STEPS.length - 1) {
            handleStepClick(COMPOSER_STEPS[currentIndex + 1].id);
        }
    };

    const handlePrev = () => {
        const currentIndex = COMPOSER_STEPS.findIndex((step) => step.id === activeStep);
        if (currentIndex > 0) {
            handleStepClick(COMPOSER_STEPS[currentIndex - 1].id);
        }
    };

    const isLastStep = activeStep === 'review';
    const hasGlobalErrors = Object.keys(stepErrors).some((key) => stepErrors[key]);

    return (
        <Modal
            open={open}
            onClose={handleCloseRequest}
            size="fullscreen"
            showCloseButton={false}
            closeOnOutsideClick={false}
            bodyClassName="app-surface-muted flex h-full flex-col p-0"
            contentClassName="h-[95vh] rounded-2xl"
            headerClassName="hidden"
            title="إضافة منتج"
        >
            <div className="app-surface relative flex h-full w-full flex-col overflow-hidden">
                <ProductComposerHeader
                    title={mode === 'edit' ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
                    subtitle="أدخل تفاصيل المنتج خطوة بخطوة ثم احفظ التعديلات"
                    onClose={handleCloseRequest}
                    steps={COMPOSER_STEPS}
                    activeStep={activeStep}
                    onStepClick={handleStepClick}
                    visitedSteps={visitedSteps}
                    stepErrors={stepErrors}
                />

                <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
                    <div className="flex-1 overflow-y-auto pb-24 no-scrollbar lg:pb-0">
                        <div className="mx-auto max-w-4xl p-6 lg:p-8">
                            {activeStep === 'basics' && (
                                <ProductBasicsStep
                                    form={form}
                                    setForm={setForm}
                                    mode={mode}
                                    productId={productId}
                                    categories={categories}
                                    suppliers={suppliers}
                                    branches={branches}
                                    user={user}
                                    can={can}
                                    onCategoriesReload={onCategoriesReload}
                                />
                            )}

                            {activeStep === 'pricing' && (
                                <ProductPricingStep
                                    form={form}
                                    setForm={setForm}
                                    branches={branches}
                                    user={user}
                                    mode={mode}
                                    branchScopeId={branchScopeId}
                                    mainBranchOption={mainBranchOption}
                                    pricingErrors={pricingErrors}
                                />
                            )}

                            {activeStep === 'media' && (
                                <ProductMediaStep
                                    form={form}
                                    setForm={setForm}
                                    branches={branches}
                                    productImages={productImages}
                                    pendingImages={pendingImages}
                                    maxImageCount={maxImageCount}
                                    onImagesChange={onImagesChange}
                                    onPendingImageReplace={onPendingImageReplace}
                                    onPrimaryImageSelect={onPrimaryImageSelect}
                                    onRemoveImage={onRemoveImage}
                                    onAddVariant={onAddVariant}
                                    onUpdateVariant={onUpdateVariant}
                                    onRemoveVariant={onRemoveVariant}
                                />
                            )}

                            {activeStep === 'review' && (
                                <ProductReviewStep
                                    form={form}
                                    categories={categories}
                                    productImages={productImages}
                                    pendingImages={pendingImages}
                                    stepErrors={stepErrors}
                                    onStepClick={handleStepClick}
                                />
                            )}

                            <div className="mt-8 border-t border-gray-100/80 pt-6 dark:border-white/10 lg:hidden">
                                <ProductComposerSidebar form={form} categories={categories} compact />
                            </div>
                        </div>
                    </div>

                    <div className="hidden h-full lg:block">
                        <ProductComposerSidebar form={form} categories={categories} />
                    </div>
                </div>

                <div className="app-surface sticky bottom-0 z-40 shrink-0 border-t border-gray-100/80 p-4 dark:border-white/10 lg:p-6">
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        <Button variant="ghost" onClick={handleCloseRequest} disabled={loading}>
                            إلغاء
                        </Button>

                        <div className="flex items-center gap-3">
                            {mode === 'create' && typeof onSuspendDraft === 'function' && (
                                <Button variant="outline" onClick={onSuspendDraft} disabled={loading}>
                                    حفظ كغير مكتمل
                                </Button>
                            )}

                            {activeStep !== 'basics' && (
                                <Button variant="outline" onClick={handlePrev} disabled={loading}>
                                    السابق
                                </Button>
                            )}

                            {!isLastStep ? (
                                <Button variant="primary" onClick={handleNext} disabled={loading}>
                                    التالي
                                </Button>
                            ) : (
                                <>
                                    {mode === 'create' && typeof onQuickSuspend === 'function' && (
                                        <Button variant="warning" onClick={onQuickSuspend} disabled={loading}>
                                            توقيف مؤقت
                                        </Button>
                                    )}
                                    <Button
                                        variant={hasGlobalErrors ? 'danger' : 'success'}
                                        onClick={onSubmit}
                                        loading={loading}
                                        icon={hasGlobalErrors ? <AlertCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                    >
                                        {loading
                                            ? (mode === 'edit' ? 'جارٍ حفظ المنتج...' : 'جارٍ إضافة المنتج...')
                                            : (mode === 'edit' ? 'حفظ التعديلات' : 'إضافة المنتج')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/55 backdrop-blur-[1px] dark:bg-gray-900/55">
                        <div className="app-surface flex items-center gap-2 rounded-xl border border-gray-100/80 px-4 py-2.5 text-sm font-bold text-gray-800 shadow-lg dark:border-white/10 dark:text-gray-100">
                            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                            <span>{mode === 'edit' ? 'جارٍ حفظ المنتج...' : 'جارٍ إضافة المنتج...'}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
