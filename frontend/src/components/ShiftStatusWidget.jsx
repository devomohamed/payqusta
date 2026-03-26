import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { Clock, Play, Square, AlertCircle, ChevronDown, Activity, DollarSign, History } from 'lucide-react';
import { useShiftStore, useAuthStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShiftStatusWidget() {
  const { t } = useTranslation('admin');
  const location = useLocation();
  const { user } = useAuthStore();
  const { activeShift, fetchCurrentShift, loading } = useShiftStore();
  const [timeLeft, setTimeLeft] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Exclude storefront and auth pages from showing the widget
  const isExcluded = location.pathname.startsWith('/portal') || location.pathname.startsWith('/login');

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  useEffect(() => {
    let interval;
    if (activeShift?.autoCloseAt && activeShift.status === 'open') {
      const updateTimer = () => {
        const now = new Date().getTime();
        const end = new Date(activeShift.autoCloseAt).getTime();
        const diff = end - now;

        if (diff <= 0) {
          setTimeLeft('00:00:00');
          setIsWarning(true);
          if (timeLeft !== '00:00:00') {
             fetchCurrentShift();
          }
          return;
        }

        if (diff <= 30 * 60 * 1000) setIsWarning(true);
        else setIsWarning(false);

        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft('');
      setIsWarning(false);
    }

    return () => clearInterval(interval);
  }, [activeShift, fetchCurrentShift, timeLeft]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownOpen && !e.target.closest('.shift-widget-container')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);


  const isOpen = activeShift?.status === 'open';

  if (isExcluded) return null;

  return (
    <div className="relative shift-widget-container">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-sm ${
          isOpen
            ? isWarning
              ? 'bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300'
            : 'bg-rose-50/80 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-300'
        }`}
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          {isOpen ? (
            <>
              <motion.span 
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0.3, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`absolute inline-flex w-4 h-4 rounded-full ${isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}
              ></motion.span>
              <Activity className="w-4 h-4 relative z-10" />
            </>
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
        </div>

        <div className="hidden sm:flex flex-col items-start px-1 border-r border-current/10 mr-1 pr-2">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            {isOpen ? t('shift_status_widget.ui.ky62x') : 'مغلق'}
          </span>
          {isOpen && timeLeft && (
            <span className="text-[11px] font-black font-mono leading-none tracking-tighter">
              {timeLeft}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''} opacity-60`} />
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute left-0 mt-3 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-[100] text-right"
            dir="rtl"
          >
            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-primary-500" />
                </div>
                {t('shift_status_widget.ui.ky4vycd')}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {isOpen ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-100 dark:hover:bg-gray-950/60">
                      <span className="block text-[10px] text-gray-400 mb-1">{t('shift_status_widget.ui.kbu3ryl')}</span>
                      <strong className="text-sm font-black text-gray-900 dark:text-white">
                        {activeShift.openingBalance?.toLocaleString() || '0.00'}
                      </strong>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/10 transition-colors hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10">
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">{t('shift_status_widget.ui.ka3wglt')}</span>
                      <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        {activeShift.currentSales?.toLocaleString() || '0.00'}
                      </strong>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 px-1">
                     <span className="text-xs text-gray-500 font-medium tracking-wide">{t('shift_status_widget.ui.kchivvq')}</span>
                     <span className="text-lg font-black text-primary-600 dark:text-primary-400 font-mono">
                        {activeShift.expectedNow?.toLocaleString() || '0.00'}
                     </span>
                  </div>

                  {timeLeft && (
                     <div className={`flex items-center gap-2 text-[11px] p-2.5 rounded-xl border ${
                       isWarning 
                       ? 'text-amber-700 bg-amber-50/50 border-amber-100 dark:text-amber-400 dark:bg-amber-500/5 dark:border-amber-500/10' 
                       : 'text-gray-500 bg-gray-50/50 border-gray-100 dark:text-gray-400 dark:bg-gray-950/40 dark:border-gray-800'
                     }`}>
                        <Clock className={`w-3.5 h-3.5 ${isWarning ? 'animate-pulse' : ''}`} />
                        <span className="flex-1">{t('shift_status_widget.ui.kfmh8gw')}</span>
                        <span className="font-mono font-black tracking-widest">{timeLeft}</span>
                     </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Link
                      to="/shift"
                      className="flex items-center justify-center gap-1.5 p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      {t('shift_status_widget.ui.close')}
                    </Link>
                    <Link
                      to="/shift"
                      className="app-surface-muted flex items-center justify-center gap-1.5 p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <History className="w-3.5 h-3.5" />
                      {t('shift_status_widget.ui.ku5ftfg')}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-subtle">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed px-2">
                    لا توجد وردية مفتوحة حالياً. <br/> يرجى فتح وردية لبدء تلقي المبيعات.
                  </p>
                  <Link
                    to="/shift"
                    className="flex w-full items-center justify-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {t('shift_status_widget.ui.kvwgy2y')}
                  </Link>
                </div>
              )}
            </div>
            
            {(user?.role === 'admin' || user?.role === 'vendor' || user?.role === 'super_admin') && (
              <Link
                to="/admin-shifts"
                className="app-surface-muted flex items-center justify-center gap-2 p-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors border-t border-gray-100/80 dark:border-white/10"
                onClick={() => setDropdownOpen(false)}
              >
                <Activity className="w-3.5 h-3.5" />
                {t('shift_status_widget.ui.kx9487a')}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
