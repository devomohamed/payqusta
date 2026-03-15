import React from 'react';
import { X, Loader2, Info } from 'lucide-react';

// ========== MODAL ==========
export function Modal({
  open = true,
  onClose,
  title,
  children,
  size = 'md',
  bodyClassName = '',
  contentClassName = '',
  headerClassName = '',
  stickyFooter = false,
  showCloseButton = true,
  closeOnOutsideClick = true,
}) {
  const dialogRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const titleId = React.useId();
  const bodyId = React.useId();

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleBackdropClick = () => {
    if (closeOnOutsideClick && onClose) {
      onClose();
    }
  };

  React.useEffect(() => {
    if (open === false) return undefined;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const preferredFocusableSelectors = [
      '[autofocus]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
    ].join(', ');

    const focusableSelectors = [
      '[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusFirstElement = () => {
      const preferredElement = dialogRef.current?.querySelector(preferredFocusableSelectors);
      const focusableElements = dialogRef.current?.querySelectorAll(focusableSelectors) || [];
      const firstElement = preferredElement || focusableElements[0] || closeButtonRef.current || dialogRef.current;
      firstElement?.focus();
    };

    const rafId = window.requestAnimationFrame(focusFirstElement);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll(focusableSelectors) || [],
      );

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [open]);

  const widths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-3xl',
    xl: 'sm:max-w-5xl',
    '2xl': 'sm:max-w-6xl',
    fullscreen: 'max-w-none',
  };

  const isFullscreen = size === 'fullscreen';
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5'
    : 'fixed inset-0 z-50 flex items-end sm:items-start justify-center p-0 sm:pt-20 sm:p-4';
  const panelSizeClass = isFullscreen
    ? 'w-full h-svh sm:w-[min(96vw,1400px)] sm:h-[92vh]'
    : `w-full ${widths[size] || widths.md} max-h-svh sm:max-h-[85vh]`;
  const bodyBaseClass = isFullscreen
    ? 'flex-1 min-h-0 overflow-y-auto'
    : `overflow-y-auto ${stickyFooter ? 'flex-1 min-h-0' : 'max-h-[calc(85vh-130px)]'}`;

  if (open === false) return null;

  return (
    <div className={containerClass} onClick={handleBackdropClick} role="presentation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={bodyId}
        tabIndex={-1}
        className={`relative ${panelSizeClass} bg-white dark:bg-gray-900 rounded-t-[1.75rem] sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${headerClassName}`}>
          <h3 id={titleId} className="text-base sm:text-lg font-bold truncate">{title}</h3>
          {showCloseButton && (
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div id={bodyId} className={`px-4 sm:px-6 py-4 sm:py-5 ${bodyBaseClass} ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}

// ========== BADGE ==========
export function Badge({ children, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };

  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold tracking-[0.01em] ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ========== BUTTON ==========
export function Button({
  children, variant = 'primary', size = 'md', icon, loading, disabled, className = '', type = 'button', ...props
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25',
    whatsapp: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25',
    ghost: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    outline: 'border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };
  const spinnerSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className={`${spinnerSizes[size] || spinnerSizes.md} animate-spin`} /> : icon}
      {children}
    </button>
  );
}

// ========== INPUT ==========
export function Input({ label, error, tooltip, className = '', id: providedId, ...props }) {
  const inputId = providedId || React.useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</label>
          {tooltip && (
            <div className="group relative z-10">
              <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help transition-colors" />
              <div className="absolute bottom-full mb-2 right-0 w-48 p-2.5 bg-gray-900 border border-gray-700 text-white text-xs leading-relaxed rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {tooltip}
                <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </div>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 ${error
          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-400'
          }`}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========== TEXT AREA ==========
export function TextArea({ label, error, className = '', id: providedId, ...props }) {
  const inputId = providedId || React.useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      )}
      <textarea
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 ${error
          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-400'
          }`}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========== SELECT ==========
export function Select({ label, options = [], children, error, className = '', id: providedId, ...props }) {
  const inputId = providedId || React.useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      )}
      <select
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 transition-all duration-200 appearance-none cursor-pointer ${error
          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus:border-primary-500'
          }`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        {children}
      </select>
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========== STAT CARD ==========
export function StatCard({ title, value, icon, change, gradient, delay = 0, subtext }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-sm opacity-85 font-medium">{title}</p>
          <p className="text-2xl md:text-3xl font-extrabold mt-1">{value}</p>
          {subtext && (
            <p className="text-xs mt-1 opacity-90 font-medium">{subtext}</p>
          )}
          {change && (
            <p className="text-xs mt-2 opacity-80">{change}</p>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ========== CARD ==========
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm ${hover ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer' : ''
        } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ========== EMPTY STATE ==========
export function EmptyState({ icon, title, description, action, className = '' }) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
      const Icon = icon;
      return <Icon className="w-9 h-9" />;
    }
    return null;
  };

  const actionNode = React.isValidElement(action)
    ? action
    : action?.label
      ? (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'outline'}
          size={action.size || 'sm'}
          className={action.className || ''}
        >
          {action.label}
        </Button>
      )
      : null;

  return (
    <div className={`flex items-center justify-center py-10 sm:py-16 ${className}`}>
      <div className="w-full max-w-xl rounded-[1.75rem] border border-gray-100 bg-white/90 px-5 py-8 text-center shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 sm:px-8 sm:py-10">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-emerald-50 text-primary-500 shadow-inner dark:border-primary-500/20 dark:from-primary-500/10 dark:via-gray-900 dark:to-emerald-500/10">
          <div className="text-current [&_svg]:h-9 [&_svg]:w-9">
            {renderIcon()}
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {actionNode && (
          <div className="mt-6 flex justify-center">
            <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
              {actionNode}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== LOADING SPINNER ==========
export function LoadingSpinner({ text, size = 'md', className = '' }) {
  const sizes = {
    xs: {
      shell: '',
      spinner: 'h-4 w-4 border-2',
      wrapper: 'inline-flex items-center justify-center',
      text: 'text-[11px]',
    },
    sm: {
      shell: '',
      spinner: 'h-5 w-5 border-[3px]',
      wrapper: 'inline-flex items-center justify-center',
      text: 'text-xs',
    },
    md: {
      shell: 'h-14 w-14 rounded-2xl border border-primary-100 bg-white shadow-sm dark:border-primary-500/20 dark:bg-gray-900',
      spinner: 'h-8 w-8 border-[3px]',
      wrapper: 'flex flex-col items-center justify-center gap-3 py-12',
      text: 'text-sm',
    },
    lg: {
      shell: 'h-20 w-20 rounded-[1.75rem] border border-primary-100 bg-white shadow-sm dark:border-primary-500/20 dark:bg-gray-900',
      spinner: 'h-10 w-10 border-4',
      wrapper: 'flex flex-col items-center justify-center gap-4 py-16',
      text: 'text-sm',
    },
  };
  const config = sizes[size] || sizes.md;
  const fallbackText = 'جاري التحميل...';
  const shouldShowText = typeof text === 'string'
    ? text.length > 0
    : !['xs', 'sm'].includes(size);
  const label = typeof text === 'string' ? text : fallbackText;

  return (
    <div className={`${config.wrapper} ${className}`} role="status" aria-live="polite" aria-label={label}>
      {config.shell ? (
        <div className={`flex items-center justify-center ${config.shell}`}>
          <div className={`${config.spinner} rounded-full border-primary-200 border-t-primary-500 dark:border-primary-900 dark:border-t-primary-400 animate-spin`} aria-hidden="true" />
        </div>
      ) : (
        <div className={`${config.spinner} rounded-full border-primary-200 border-t-primary-500 dark:border-primary-900 dark:border-t-primary-400 animate-spin`} aria-hidden="true" />
      )}
      {shouldShowText && (
        <p className={`${config.text} font-medium text-gray-500 dark:text-gray-400`}>{label}</p>
      )}
    </div>
  );
}

// ========== OWNER TABLE SKELETON ==========
export function OwnerTableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, rowIdx) => (
          <div key={`mobile-${rowIdx}`} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="hidden space-y-3 p-4 sm:block">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
