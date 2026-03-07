import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import { create } from 'zustand';

const useConfirmStore = create((set) => ({
  dialog: null,
  show: ({
    title,
    message,
    confirmLabel = '\u062a\u0623\u0643\u064a\u062f',
    cancelLabel = '\u0625\u0644\u063a\u0627\u0621',
    type = 'danger',
    icon = null,
    onConfirm,
    onCancel,
  }) => {
    set({
      dialog: { title, message, confirmLabel, cancelLabel, type, icon, onConfirm, onCancel },
    });
  },
  hide: () => set({ dialog: null }),
}));

export const confirm = {
  show: (options) =>
    new Promise((resolve) => {
      useConfirmStore.getState().show({
        ...options,
        onConfirm: () => {
          useConfirmStore.getState().hide();
          resolve(true);
        },
        onCancel: () => {
          useConfirmStore.getState().hide();
          resolve(false);
        },
      });
    }),

  delete: (
    message = '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u062d\u0630\u0641\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.'
  ) =>
    confirm.show({
      title: '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0630\u0641',
      message,
      confirmLabel: '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0630\u0641',
      cancelLabel: '\u0625\u0644\u063a\u0627\u0621',
      type: 'danger',
    }),

  warn: (
    message,
    title = '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0625\u062c\u0631\u0627\u0621'
  ) =>
    confirm.show({
      title,
      message,
      type: 'warning',
      confirmLabel: '\u0645\u062a\u0627\u0628\u0639\u0629',
    }),

  info: (
    message,
    title = '\u062a\u0623\u0643\u064a\u062f'
  ) =>
    confirm.show({
      title,
      message,
      type: 'info',
      confirmLabel: '\u0645\u0648\u0627\u0641\u0642',
    }),
};

const PRESETS = {
  danger: {
    panel:
      'border-red-500/60 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.35),rgba(127,29,29,0.94)_65%,rgba(69,10,10,0.98))] text-white shadow-[0_28px_90px_rgba(69,10,10,0.55)]',
    iconWrap: 'border border-red-300/40 bg-white/10 text-red-100',
    title: 'text-white',
    message: 'text-red-50/90',
    cancelBtn:
      'bg-slate-300 text-slate-900 hover:bg-slate-200 shadow-[0_14px_35px_rgba(148,163,184,0.35)]',
    confirmBtn:
      'bg-red-600 text-white hover:bg-red-500 shadow-[0_18px_40px_rgba(220,38,38,0.45)]',
    Icon: AlertTriangle,
  },
  warning: {
    panel:
      'border-amber-200 bg-white text-slate-950 shadow-2xl dark:border-amber-400/30 dark:bg-slate-900 dark:text-white',
    iconWrap: 'border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    title: 'text-slate-950 dark:text-white',
    message: 'text-slate-600 dark:text-slate-300',
    cancelBtn:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    confirmBtn:
      'bg-amber-500 text-white hover:bg-amber-400 shadow-[0_18px_40px_rgba(245,158,11,0.25)]',
    Icon: AlertTriangle,
  },
  info: {
    panel:
      'border-blue-200 bg-white text-slate-950 shadow-2xl dark:border-blue-400/30 dark:bg-slate-900 dark:text-white',
    iconWrap: 'border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    title: 'text-slate-950 dark:text-white',
    message: 'text-slate-600 dark:text-slate-300',
    cancelBtn:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    confirmBtn:
      'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_18px_40px_rgba(37,99,235,0.25)]',
    Icon: Info,
  },
  success: {
    panel:
      'border-emerald-200 bg-white text-slate-950 shadow-2xl dark:border-emerald-400/30 dark:bg-slate-900 dark:text-white',
    iconWrap: 'border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    title: 'text-slate-950 dark:text-white',
    message: 'text-slate-600 dark:text-slate-300',
    cancelBtn:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    confirmBtn:
      'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_18px_40px_rgba(5,150,105,0.25)]',
    Icon: CheckCircle,
  },
};

export default function ConfirmDialog() {
  const { dialog } = useConfirmStore();
  const preset = PRESETS[dialog?.type] || PRESETS.danger;
  const IconComponent = dialog?.icon || preset.Icon;
  const showDeleteIcon = dialog?.type === 'danger';

  return (
    <AnimatePresence>
      {dialog && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-md"
            onClick={dialog.onCancel}
          />

          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            dir="rtl"
          >
            <div
              className={`pointer-events-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border ${preset.panel}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-row-reverse items-start justify-between gap-4 sm:gap-6">
                  <motion.div
                    initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.25 }}
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${preset.iconWrap}`}
                  >
                    <IconComponent className="h-8 w-8" />
                  </motion.div>

                  <div className="flex-1 text-right">
                    <h2 className={`text-3xl font-black tracking-tight sm:text-4xl ${preset.title}`}>
                      {dialog.title}
                    </h2>
                    {dialog.message && (
                      <p className={`mt-4 text-lg leading-relaxed sm:text-2xl ${preset.message}`}>
                        {dialog.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={dialog.onConfirm}
                    className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-black transition-colors ${preset.confirmBtn}`}
                  >
                    {showDeleteIcon && <Trash2 className="h-5 w-5" />}
                    <span>{dialog.confirmLabel}</span>
                  </motion.button>

                  <button
                    onClick={dialog.onCancel}
                    className={`h-14 min-w-[9rem] rounded-2xl px-6 text-lg font-black transition-colors ${preset.cancelBtn}`}
                  >
                    {dialog.cancelLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
