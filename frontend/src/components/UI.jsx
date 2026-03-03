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
}) {
  if (open === false) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    fullscreen: 'max-w-none',
  };
  const isFullscreen = size === 'fullscreen';
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5'
    : 'fixed inset-0 z-50 flex items-start justify-center pt-20 p-4';
  const panelSizeClass = isFullscreen
    ? 'w-[min(96vw,1400px)] h-[92vh]'
    : `w-full ${widths[size] || widths.md} max-h-[85vh]`;
  const bodyBaseClass = isFullscreen
    ? 'flex-1 min-h-0 overflow-y-auto'
    : `overflow-y-auto ${stickyFooter ? 'flex-1 min-h-0' : 'max-h-[calc(85vh-130px)]'}`;

  return (
    <div className={containerClass} onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className={`relative ${panelSizeClass} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${headerClassName}`}>
          <h3 className="text-lg font-bold">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {/* Body */}
        <div className={`px-6 py-5 ${bodyBaseClass} ${bodyClassName}`}>{children}</div>
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ========== BUTTON ==========
export function Button({
  children, variant = 'primary', size = 'md', icon, loading, disabled, className = '', ...props
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

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ========== INPUT ==========
export function Input({ label, error, tooltip, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</label>
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
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 ${error
          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-400'
          }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========== TEXT AREA ==========
export function TextArea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 ${error
          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 dark:focus:border-primary-400'
          }`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ========== SELECT ==========
export function Select({ label, options = [], children, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      )}
      <select
        className={`w-full px-4 py-2.5 rounded-xl border-2 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 transition-all duration-200 appearance-none cursor-pointer ${
          error
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
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

// ========== LOADING SPINNER ==========
export function LoadingSpinner({ text = 'جاري التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

// ========== OWNER TABLE SKELETON ==========
export function OwnerTableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
