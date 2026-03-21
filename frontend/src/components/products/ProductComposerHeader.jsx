import React from 'react';
import { Check, X } from 'lucide-react';

export default function ProductComposerHeader({
  title,
  subtitle,
  onClose,
  steps,
  activeStep,
  onStepClick,
  visitedSteps,
  stepErrors
}) {
  return (
    <div className="app-surface shrink-0 border-b border-gray-100/80 dark:border-white/10 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="app-surface-muted p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stepper */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isVisited = visitedSteps.includes(step.id);
            const hasError = !!stepErrors[step.id];
            const isPast = steps.findIndex(s => s.id === activeStep) > idx;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onStepClick(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-2 border-primary-100 dark:border-primary-500/20'
                      : hasError
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-2 border-red-100 dark:border-red-500/20'
                        : isVisited
                          ? 'app-surface-muted text-gray-700 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border-2 border-transparent'
                          : 'bg-transparent text-gray-500 border-2 border-dashed border-gray-200/80 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] border-opacity-80'
                    }
                  `}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0
                    ${isActive ? 'bg-primary-600 text-white' :
                      hasError ? 'bg-red-600 text-white' :
                        isPast ? 'bg-emerald-500 text-white' :
                          'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                  >
                    {isPast && !hasError ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  {step.label}
                </button>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-0.5 rounded shrink-0 ${isPast ? 'bg-primary-200 dark:bg-primary-800' : 'bg-gray-100/90 dark:bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
