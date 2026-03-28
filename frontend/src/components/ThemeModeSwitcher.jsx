import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store';

const OPTIONS = [
  {
    value: 'light',
    label: 'فاتح',
    description: 'ألوان ثابتة ومظهر واضح طوال الوقت.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'داكن',
    description: 'مظهر مريح للعين في البيئات منخفضة الإضاءة.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'تلقائي',
    description: 'يتبع إعدادات الجهاز تلقائيًا.',
    icon: Monitor,
  },
];

const CYCLE_ORDER = ['light', 'dark', 'system'];

export default function ThemeModeSwitcher({ className = '', compact = false, minimal = false }) {
  const { dark, themeMode, setThemeMode } = useThemeStore();

  // Minimal mode: single circular icon button that cycles light → dark → system
  if (minimal) {
    const currentIndex = CYCLE_ORDER.indexOf(themeMode);
    const nextMode = CYCLE_ORDER[(currentIndex + 1) % CYCLE_ORDER.length];
    const CurrentIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor;

    return (
      <button
        type="button"
        onClick={() => setThemeMode(nextMode)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
        aria-label="تبديل المظهر"
        title={OPTIONS.find((o) => o.value === themeMode)?.label}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    );
  }

  // Full mode (default + compact)
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="app-surface-muted inline-flex flex-wrap gap-1 rounded-2xl p-1.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = themeMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemeMode(option.value)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                  : 'app-text-soft hover:bg-white dark:hover:bg-white/5',
              ].join(' ')}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="app-text-soft font-semibold">الوضع الحالي:</span>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
            {OPTIONS.find((option) => option.value === themeMode)?.label}
          </span>
          <span className="app-text-muted text-xs">
            {OPTIONS.find((option) => option.value === themeMode)?.description}
          </span>
          {themeMode === 'system' && (
            <span className="app-surface rounded-full px-3 py-1 text-[11px] font-bold app-text-body">
              {dark ? 'النظام على الداكن الآن' : 'النظام على الفاتح الآن'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
