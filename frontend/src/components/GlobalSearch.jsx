import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Package, Users, FileText, Truck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, useThemeStore } from '../store';

const ICON_MAP = {
  product: Package,
  customer: Users,
  invoice: FileText,
  supplier: Truck,
};

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { dark } = useThemeStore();
  const { t, i18n } = useTranslation('admin');
  const isRTL = i18n.dir() === 'rtl';

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search on query change (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data.data);
        setSelectedIndex(0);
      } catch (err) {
        toast.error(t('search.search_failed'));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (!results) return;

      const allResults = [
        ...results.products,
        ...results.customers,
        ...results.invoices,
        ...results.suppliers,
      ];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(allResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelectResult = (result) => {
    navigate(result.link);
    onClose();
    setQuery('');
    setResults(null);
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults(null);
  };

  if (!isOpen) return null;

  const allResults = results
    ? [
      ...results.products,
      ...results.customers,
      ...results.invoices,
      ...results.suppliers,
    ]
    : [];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
      />

      {/* Search Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className={`fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl rounded-2xl shadow-2xl z-[100] overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'
          }`}
      >
        {/* Search Input */}
        <div className={`relative p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <Search className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 w-5 h-5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.search_placeholder')}
            className={`w-full ${isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'} py-3 text-lg border-none focus:outline-none ${dark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900'
              }`}
            dir={i18n.dir()}
          />
          {loading && (
            <Loader2 className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin`} />
          )}
          {!loading && query && (
            <button
              onClick={() => setQuery('')}
              className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 p-1 rounded-full ${dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
            >
              <X className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('search.start_typing')}</p>
            </div>
          ) : loading ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-blue-500" />
              <p>{t('search.searching')}</p>
            </div>
          ) : results && allResults.length === 0 ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('search.no_results', { query })}</p>
            </div>
          ) : results ? (
            <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {/* Products */}
              {results.products.length > 0 && (
                <ResultSection
                  title={t('search.products')}
                  icon={Package}
                  results={results.products}
                  selectedIndex={selectedIndex}
                  offset={0}
                  onSelect={handleSelectResult}
                  dark={dark}
                  isRTL={isRTL}
                />
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <ResultSection
                  title={t('search.customers')}
                  icon={Users}
                  results={results.customers}
                  selectedIndex={selectedIndex}
                  offset={results.products.length}
                  onSelect={handleSelectResult}
                  dark={dark}
                  isRTL={isRTL}
                />
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <ResultSection
                  title={t('search.invoices')}
                  icon={FileText}
                  results={results.invoices}
                  selectedIndex={selectedIndex}
                  offset={results.products.length + results.customers.length}
                  onSelect={handleSelectResult}
                  dark={dark}
                  isRTL={isRTL}
                />
              )}

              {/* Suppliers */}
              {results.suppliers.length > 0 && (
                <ResultSection
                  title={t('search.suppliers')}
                  icon={Truck}
                  results={results.suppliers}
                  selectedIndex={selectedIndex}
                  offset={
                    results.products.length +
                    results.customers.length +
                    results.invoices.length
                  }
                  onSelect={handleSelectResult}
                  dark={dark}
                  isRTL={isRTL}
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {results && allResults.length > 0 && (
          <div className={`p-3 border-t flex items-center justify-between text-xs ${dark
            ? 'bg-gray-900 border-gray-700 text-gray-400'
            : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  }`}>↑</kbd>
                <kbd className={`px-2 py-1 border rounded ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  }`}>↓</kbd>
                {t('search.navigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  }`}>Enter</kbd>
                {t('search.select')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  }`}>Esc</kbd>
                {t('search.close')}
              </span>
            </div>
            <span>{t('search.results_count', { count: results.total })}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ResultSection({ title, icon: Icon, results, selectedIndex, offset, onSelect, dark, isRTL }) {
  return (
    <div className="p-3">
      <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase ${dark ? 'text-gray-400' : 'text-gray-500'
        }`}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="space-y-1">
        {results.map((result, idx) => {
          const globalIndex = offset + idx;
          const isSelected = selectedIndex === globalIndex;
          const ResultIcon = ICON_MAP[result.type];

          return (
            <button
              key={result._id}
              onClick={() => onSelect(result)}
              className={`w-full ${isRTL ? 'text-right' : 'text-left'} p-3 rounded-lg transition-colors ${isSelected
                ? dark
                  ? 'bg-blue-900 border border-blue-700'
                  : 'bg-blue-50 border border-blue-200'
                : dark
                  ? 'hover:bg-gray-700 border border-transparent'
                  : 'hover:bg-gray-50 border border-transparent'
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isSelected
                    ? dark
                      ? 'bg-blue-800'
                      : 'bg-blue-100'
                    : dark
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                    }`}
                >
                  <ResultIcon
                    className={`w-4 h-4 ${isSelected
                      ? dark
                        ? 'text-blue-300'
                        : 'text-blue-600'
                      : dark
                        ? 'text-gray-300'
                        : 'text-gray-600'
                      }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${dark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {result.displayText}
                  </p>
                  {result.type === 'product' && result.category && (
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {result.category}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
