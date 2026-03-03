import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const stepTitles = {
  basics: 'الأساسيات',
  pricing: 'التسعير والمخزون',
  media: 'الصور والموديلات',
  review: 'المراجعة والحفظ',
};

export default function ProductComposerHeader({
  mode,
  steps,
  activeStep,
  onStepChange,
  stepErrors = {},
  visitedSteps = [],
}) {
  return (
    <div className="shrink-0 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white via-white to-primary-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/20 px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary-500">
              Product Composer
            </p>
            <h4 className="mt-1 text-2xl font-black text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              أدخل البيانات خطوة بخطوة وراجع الصور والتسعير قبل الحفظ النهائي.
            </p>
          </div>
          <div className="rounded-2xl border border-primary-100 bg-white/80 px-4 py-3 text-right shadow-sm dark:border-primary-900/40 dark:bg-gray-900/70">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-500">
              الخطوة الحالية
            </p>
            <p className="mt-1 text-base font-black text-gray-900 dark:text-gray-100">
              {stepTitles[activeStep] || 'الأساسيات'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const hasError = Boolean(stepErrors[step.id]);
            const isVisited = visitedSteps.includes(step.id);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={`rounded-2xl border-2 px-4 py-4 text-right transition-all duration-200 ${
                  isActive
                    ? 'border-primary-500 bg-primary-500 text-white shadow-xl shadow-primary-500/20'
                    : hasError
                      ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50/70 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-primary-800 dark:hover:bg-primary-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white/80' : 'text-primary-500'}`}>
                      0{index + 1}
                    </p>
                    <p className="mt-1 text-sm font-black">{step.label}</p>
                    <p className={`mt-1 text-xs leading-5 ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.description}
                    </p>
                  </div>

                  {hasError ? (
                    <AlertCircle className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-red-500'}`} />
                  ) : isVisited ? (
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                  ) : (
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
