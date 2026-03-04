import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import { create } from 'zustand';

// ─── Store ───────────────────────────────────────────────────────────────────

const useConfirmStore = create((set) => ({
    dialog: null,
    show: ({ title, message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', type = 'danger', icon = null, onConfirm, onCancel }) => {
        set({
            dialog: { title, message, confirmLabel, cancelLabel, type, icon, onConfirm, onCancel },
        });
    },
    hide: () => set({ dialog: null }),
}));

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Promise-based confirm dialog — replaces window.confirm()
 * Usage: const ok = await confirm.show({ title: '...', message: '...' });
 */
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

    delete: (message = 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.') =>
        confirm.show({
            title: 'تأكيد الحذف',
            message,
            confirmLabel: 'حذف',
            cancelLabel: 'إلغاء',
            type: 'danger',
        }),

    warn: (message, title = 'تأكيد الإجراء') =>
        confirm.show({ title, message, type: 'warning', confirmLabel: 'متابعة' }),

    info: (message, title = 'تأكيد') =>
        confirm.show({ title, message, type: 'info', confirmLabel: 'موافق' }),
};

// ─── Color presets ────────────────────────────────────────────────────────────
const PRESETS = {
    danger: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-700',
        icon: 'text-red-500',
        iconBg: 'bg-red-100 dark:bg-red-900/40',
        confirmBtn: 'bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-red-500/30',
        Icon: Trash2,
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-700',
        icon: 'text-amber-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40',
        confirmBtn: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 shadow-amber-500/30',
        Icon: AlertTriangle,
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-700',
        icon: 'text-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        confirmBtn: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-blue-500/30',
        Icon: Info,
    },
    success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        icon: 'text-green-500',
        iconBg: 'bg-green-100 dark:bg-green-900/40',
        confirmBtn: 'bg-green-600 hover:bg-green-500 active:bg-green-700 shadow-green-500/30',
        Icon: CheckCircle,
    },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConfirmDialog() {
    const { dialog, hide } = useConfirmStore();
    const preset = PRESETS[dialog?.type] || PRESETS.danger;
    const IconComponent = dialog?.icon || preset.Icon;

    return (
        <AnimatePresence>
            {dialog && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
                        onClick={dialog.onCancel}
                    />

                    {/* Dialog */}
                    <motion.div
                        key="dialog"
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 40 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className={`
                pointer-events-auto w-full max-w-md rounded-3xl border shadow-2xl
                bg-white dark:bg-gray-900
                ${preset.border}
                overflow-hidden
              `}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header stripe */}
                            <div className={`${preset.bg} p-6 flex flex-col items-center text-center gap-4`}>
                                {/* Animated Icon */}
                                <motion.div
                                    initial={{ rotate: -180, scale: 0 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                                    className={`w-16 h-16 rounded-full ${preset.iconBg} flex items-center justify-center shadow-inner`}
                                >
                                    <IconComponent className={`w-8 h-8 ${preset.icon}`} />
                                </motion.div>

                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                        {dialog.title}
                                    </h2>
                                    {dialog.message && (
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                                            {dialog.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-900">
                                <button
                                    onClick={dialog.onCancel}
                                    className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                                >
                                    {dialog.cancelLabel}
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={dialog.onConfirm}
                                    className={`flex-1 h-12 rounded-2xl text-white font-bold text-sm shadow-lg transition-all ${preset.confirmBtn}`}
                                >
                                    {dialog.confirmLabel}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
