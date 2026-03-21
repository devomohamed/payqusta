import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;

  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const NavBtn = ({ onClick, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="app-surface w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100/80 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-300 dark:hover:border-primary-500/40 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-gray-100/80 dark:disabled:hover:border-white/10 disabled:hover:text-gray-500 transition-all shadow-sm"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-5 pb-1">
      {/* Info pill */}
      <div className="flex items-center gap-2">
        <div className="app-surface-muted inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100/80 dark:border-white/10">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            صفحة{' '}
            <span className="font-bold text-gray-800 dark:text-gray-200">{currentPage}</span>
            {' '}من{' '}
            <span className="font-bold text-gray-800 dark:text-gray-200">{totalPages}</span>
          </span>
          {totalItems > 0 && (
            <>
              <span className="w-px h-3.5 bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {totalItems.toLocaleString('ar-EG')}
                </span>{' '}
                عنصر
              </span>
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-1.5">
        {/* First */}
        <NavBtn onClick={() => onPageChange(1)} disabled={currentPage === 1} title="الأولى">
          <ChevronsRight className="w-4 h-4" />
        </NavBtn>

        {/* Previous */}
        <NavBtn onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} title="السابقة">
          <ChevronRight className="w-4 h-4" />
        </NavBtn>

        {/* Ellipsis left */}
        {start > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="app-surface w-9 h-9 rounded-xl text-sm font-semibold border border-gray-100/80 dark:border-white/10 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-300 dark:hover:border-primary-500/40 text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-all shadow-sm"
            >
              1
            </button>
            {start > 2 && (
              <span className="w-9 h-9 flex items-center justify-center text-gray-400 dark:text-gray-600 font-bold tracking-widest select-none">
                ···
              </span>
            )}
          </>
        )}

        {/* Page numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-xl text-sm font-bold transition-all shadow-sm ${page === currentPage
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40 scale-105'
                : 'app-surface border border-gray-100/80 dark:border-white/10 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-300 dark:hover:border-primary-500/40 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
          >
            {page}
          </button>
        ))}

        {/* Ellipsis right */}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="w-9 h-9 flex items-center justify-center text-gray-400 dark:text-gray-600 font-bold tracking-widest select-none">
                ···
              </span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="app-surface w-9 h-9 rounded-xl text-sm font-semibold border border-gray-100/80 dark:border-white/10 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:border-primary-300 dark:hover:border-primary-500/40 text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-all shadow-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next */}
        <NavBtn onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} title="التالية">
          <ChevronLeft className="w-4 h-4" />
        </NavBtn>

        {/* Last */}
        <NavBtn onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} title="الأخيرة">
          <ChevronsLeft className="w-4 h-4" />
        </NavBtn>
      </div>
    </div>
  );
}
