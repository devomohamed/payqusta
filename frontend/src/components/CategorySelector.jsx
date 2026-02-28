import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, FolderTree, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CategorySelector - A premium, searchable dropdown for category selection
 * Features: Searchable, Hierarchical display, Animations
 */
export default function CategorySelector({
    label,
    value,
    onChange,
    categories = [],
    placeholder = "اختر تصنيف...",
    error,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Find selected category name and icon (search recursively)
    const findCategory = (items, id) => {
        for (const item of items) {
            if (item._id === id) return item;
            if (item.children) {
                const found = findCategory(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const selected = findCategory(categories, value);

    // Filter categories by search
    const filterBySearch = (items, term) => {
        if (!term) return items;

        return items.reduce((acc, cat) => {
            const matchesParent = cat.name.toLowerCase().includes(term.toLowerCase());
            const filteredChildren = cat.children ? filterBySearch(cat.children, term) : [];
            const hasMatchingChild = filteredChildren.length > 0;

            if (matchesParent || hasMatchingChild) {
                acc.push({
                    ...cat,
                    children: matchesParent ? cat.children : filteredChildren
                });
            }
            return acc;
        }, []);
    };

    const filteredCategories = filterBySearch(categories, search);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 text-right flex items-center gap-2 justify-end">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
          w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-300
          ${isOpen
                        ? 'border-primary-500 ring-4 ring-primary-500/10 bg-white dark:bg-gray-900 shadow-lg'
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:border-primary-500/30'}
          ${error ? 'border-red-500' : ''}
        `}
            >
                <div className="flex items-center gap-3">
                    {selected ? (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3"
                        >
                            <span className="text-2xl drop-shadow-sm">{selected.icon || '📦'}</span>
                            <div className="text-right">
                                <span className="block font-black text-gray-800 dark:text-white leading-tight">{selected.name}</span>
                                {selected.parent && (
                                    <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider">تصنيف فرعي</span>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <span className="text-gray-400 font-bold">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selected && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary-500' : ''}`} />
                </div>
            </button>

            {error && <p className="mt-1.5 text-[10px] font-black text-red-500 text-right uppercase tracking-wider">{error}</p>}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] top-full left-0 right-0 mt-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[450px]"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="relative">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="ابحث عن تصنيف..."
                                    className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold focus:border-primary-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar p-3 space-y-1.5">
                            {filteredCategories.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FolderTree className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm font-bold">لم يتم العثور على نتائج</p>
                                </div>
                            ) : (
                                filteredCategories.map(cat => (
                                    <div key={cat._id} className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={() => { onChange(cat._id); setIsOpen(false); }}
                                            className={`
                        w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group
                        ${value === cat._id
                                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'}
                      `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`text-2xl transition-transform group-hover:scale-110 ${value === cat._id ? '' : 'grayscale-[0.5] group-hover:grayscale-0'}`}>
                                                    {cat.icon || '📦'}
                                                </span>
                                                <div className="text-right">
                                                    <span className={`block font-black ${value === cat._id ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{cat.name}</span>
                                                    {cat.children && cat.children.length > 0 && !search && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${value === cat._id ? 'text-white/70' : 'text-primary-500'}`}>
                                                            {cat.children.length} تصنيفات فرعية
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {value === cat._id && <Check className="w-5 h-5" />}
                                        </button>

                                        {cat.children && cat.children.length > 0 && (
                                            <div className="mr-6 pr-4 border-r-2 border-primary-500/10 space-y-1 mt-1">
                                                {cat.children
                                                    .filter(child => child.name.toLowerCase().includes(search.toLowerCase()) || cat.name.toLowerCase().includes(search.toLowerCase()))
                                                    .map(child => (
                                                        <button
                                                            key={child._id}
                                                            type="button"
                                                            onClick={() => { onChange(child._id); setIsOpen(false); }}
                                                            className={`
                                w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group
                                ${value === child._id
                                                                    ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'}
                              `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg group-hover:scale-110 transition-transform">{child.icon || '📦'}</span>
                                                                <span className="text-sm font-bold">{child.name}</span>
                                                            </div>
                                                            {value === child._id && <Check className="w-4 h-4" />}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
