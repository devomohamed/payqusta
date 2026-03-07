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
    { id: 'review', label: 'المراجعة والحفظ', desc: 'الملخص النهائي' }
];

export default function ProductComposer({
    open,
    onClose,
    mode = 'create',
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
    onImagesChange,
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
                'تأكيد الإغلاق'
            );
            if (approved) onClose();
        } else {
            onClose();
        }
    };

    // Reset wizard on open
    useEffect(() => {
        if (open) {
            setActiveStep('basics');
            setVisitedSteps(['basics']);
        }
    }, [open]);

    // 3.2 — Navigate to first step with error when validation fails
    useEffect(() => {
        if (!open) return;
        const errorStep = Object.keys(stepErrors).find(key => stepErrors[key]);
        if (errorStep) {
            setActiveStep(errorStep);
            if (!visitedSteps.includes(errorStep)) {
                setVisitedSteps(prev => [...prev, errorStep]);
            }
        }
    }, [stepErrors]);


    const handleStepClick = (stepId) => {
        setActiveStep(stepId);
        if (!visitedSteps.includes(stepId)) setVisitedSteps(prev => [...prev, stepId]);
    };

    const handleNext = () => {
        const currentIndex = COMPOSER_STEPS.findIndex(s => s.id === activeStep);
        if (currentIndex < COMPOSER_STEPS.length - 1) {
            handleStepClick(COMPOSER_STEPS[currentIndex + 1].id);
        }
    };

    const handlePrev = () => {
        const currentIndex = COMPOSER_STEPS.findIndex(s => s.id === activeStep);
        if (currentIndex > 0) {
            handleStepClick(COMPOSER_STEPS[currentIndex - 1].id);
        }
    };

    const isLastStep = activeStep === 'review';
    const hasGlobalErrors = Object.keys(stepErrors).some(k => stepErrors[k]);

    return (
        <Modal
            open={open}
            onClose={handleCloseRequest}
            size="fullscreen"
            showCloseButton={false}
            closeOnOutsideClick={false}
            bodyClassName="p-0 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50"
            contentClassName="h-[95vh] rounded-2xl"
            headerClassName="hidden" // Hiding the default header to use our custom composer header
            title="إضافة منتج"
        >
            <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900 overflow-hidden relative">
                <ProductComposerHeader
                    title={mode === 'edit' ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
                    subtitle="أدخل تفاصيل المنتج خطوة بخطوة واحفظ التعديلات"
                    onClose={handleCloseRequest}
                    steps={COMPOSER_STEPS}
                    activeStep={activeStep}
                    onStepClick={handleStepClick}
                    visitedSteps={visitedSteps}
                    stepErrors={stepErrors}
                />

                {/* 3.3 — Responsive Layout: Sidebar below form on mobile, side-by-side on desktop */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
                    {/* Main Form Area */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-0">
                        <div className="max-w-4xl mx-auto p-6 lg:p-8">
                            {activeStep === 'basics' && (
                                <ProductBasicsStep
                                    form={form}
                                    setForm={setForm}
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
                                    onImagesChange={onImagesChange}
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

                            {/* 3.3 — Mobile Sidebar: compact preview below form content */}
                            <div className="lg:hidden mt-8 border-t pt-6 border-gray-100 dark:border-gray-800">
                                <ProductComposerSidebar form={form} categories={categories} compact />
                            </div>
                        </div>
                    </div>

                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block h-full">
                        <ProductComposerSidebar form={form} categories={categories} />
                    </div>
                </div>

                {/* Sticky Footer Actions */}
                <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 lg:p-6 sticky bottom-0 z-40">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                                        variant={hasGlobalErrors ? 'danger' : 'primary'}
                                        onClick={onSubmit}
                                        loading={loading}
                                        icon={hasGlobalErrors ? <AlertCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    >
                                        {loading
                                            ? (mode === 'edit' ? 'جاري حفظ المنتج...' : 'جاري إضافة المنتج...')
                                            : (mode === 'edit' ? 'حفظ التعديلات' : 'إضافة المنتج')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/55 dark:bg-gray-900/55 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-lg flex items-center gap-2 text-sm font-bold">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                            <span>{mode === 'edit' ? 'جاري حفظ المنتج...' : 'جاري إضافة المنتج...'}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
