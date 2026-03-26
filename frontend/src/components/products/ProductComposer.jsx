import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '../UI';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { confirm } from '../ConfirmDialog';
import ProductComposerHeader from './ProductComposerHeader';
import ProductComposerSidebar from './ProductComposerSidebar';
import ProductBasicsStep from './ProductBasicsStep';
import ProductPricingStep from './ProductPricingStep';
import ProductMediaStep from './ProductMediaStep';
import ProductReviewStep from './ProductReviewStep';
import { useTranslation } from 'react-i18next';

const getComposerSteps = (t) => [
    { id: 'basics', label: t('product_composer.ui.kr269xo'), desc: t('product_composer.ui.kxzywy9') },
    { id: 'pricing', label: t('product_composer.ui.k5m4q6w'), desc: t('product_composer.ui.khtsyu0') },
    { id: 'media', label: t('product_composer.ui.kq2q7vn'), desc: t('product_composer.ui.kegga8a') },
    { id: 'review', label: t('product_composer.ui.k18rv5r'), desc: t('product_composer.ui.ktg8ik0') },
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
    fieldErrors = {},
    pricingErrors = {},
    isDirty = false,
}) {
  const { t } = useTranslation('admin');
        const composerSteps = useMemo(() => getComposerSteps(t), [t]);
    const [activeStep, setActiveStep] = useState('basics');
    const [visitedSteps, setVisitedSteps] = useState(['basics']);

    const scrollToError = () => {
        const errorFields = Object.keys(fieldErrors);
        if (errorFields.length === 0) return;

        // Give React a moment to switch steps and render the fields
        requestAnimationFrame(() => {
            const firstErrorField = errorFields[0];
            const element = document.getElementsByName(firstErrorField)[0] 
                || document.getElementById(firstErrorField)
                || document.querySelector(`[data-field="${firstErrorField}"]`);

            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus?.();
                // Add a temporary highlight effect
                element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
                }, 3000);
            }
        });
    };

    useEffect(() => {
        if (Object.keys(fieldErrors).length > 0) {
            scrollToError();
        }
    }, [fieldErrors]);

    const handleCloseRequest = async () => {
        if (loading) return;

        if (isDirty) {
            const approved = await confirm.warn(
                t('product_composer.ui.k659qyy'),
                t('product_composer.ui.kria2po'),
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
        const currentIndex = composerSteps.findIndex((step) => step.id === activeStep);
        if (currentIndex < composerSteps.length - 1) {
            handleStepClick(composerSteps[currentIndex + 1].id);
        }
    };

    const handlePrev = () => {
        const currentIndex = composerSteps.findIndex((step) => step.id === activeStep);
        if (currentIndex > 0) {
            handleStepClick(composerSteps[currentIndex - 1].id);
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
            contentClassName="h-[92vh] max-h-[900px] rounded-[2rem] shadow-2xl overflow-hidden"
            headerClassName="hidden"
            title={t('product_composer.titles.kq5gbc5')}
        >
            <div className="app-surface relative flex h-full w-full flex-col overflow-hidden">
                <ProductComposerHeader
                    title={mode === 'edit' ? t('product_composer.ui.kaxytre') : 'إضافة منتج جديد'}
                    subtitle="أدخل تفاصيل المنتج خطوة بخطوة ثم احفظ التعديلات"
                    onClose={handleCloseRequest}
                    steps={composerSteps}
                    activeStep={activeStep}
                    onStepClick={handleStepClick}
                    visitedSteps={visitedSteps}
                    stepErrors={stepErrors}
                />

                <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row bg-slate-50/30 dark:bg-transparent">
                    <div className="flex-1 overflow-y-auto pb-24 no-scrollbar lg:pb-0">
                        <div className="mx-auto max-w-3xl p-6 lg:p-10">
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
                                    fieldErrors={fieldErrors}
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
                                    fieldErrors={fieldErrors}
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
                                    fieldErrors={fieldErrors}
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
                            {t('product_composer.ui.cancel')}
                        </Button>

                        <div className="flex items-center gap-3">
                            {mode === 'create' && typeof onSuspendDraft === 'function' && (
                                <Button variant="outline" onClick={onSuspendDraft} disabled={loading}>
                                    {t('product_composer.ui.kgwktk5')}
                                </Button>
                            )}

                            {activeStep !== 'basics' && (
                                <Button variant="outline" onClick={handlePrev} disabled={loading}>
                                    {t('product_composer.ui.kab8zyt')}
                                </Button>
                            )}

                            {!isLastStep ? (
                                <Button variant="primary" onClick={handleNext} disabled={loading}>
                                    {t('product_composer.ui.kabeq68')}
                                </Button>
                            ) : (
                                <>
                                    {mode === 'create' && typeof onQuickSuspend === 'function' && (
                                        <Button variant="warning" onClick={onQuickSuspend} disabled={loading}>
                                            {t('product_composer.ui.kwnqn78')}
                                        </Button>
                                    )}
                                    <Button
                                        variant={hasGlobalErrors ? 'danger' : 'success'}
                                        onClick={onSubmit}
                                        loading={loading}
                                        icon={hasGlobalErrors ? <AlertCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                    >
                                        {loading
                                            ? (mode === 'edit' ? t('product_composer.ui.kciounr') : t('product_composer.ui.ku0je03'))
                                            : (mode === 'edit' ? t('product_composer.ui.km6ld24') : t('product_composer.ui.krla6ce'))}
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
                            <span>{mode === 'edit' ? t('product_composer.ui.kciounr') : 'جارٍ إضافة المنتج...'}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
