import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, FolderTree, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_CATEGORY_ICON } from '../utils/aiHelper';

/**
 * CategorySelector - A premium, searchable dropdown for category selection
 * Features: Searchable, Hierarchical display, Animations
 */
export default function CategorySelector({
    label,
    value,
    onChange,
    categories = [],
    placeholder = 'اختر قسم...',
    error,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const filterBySearch = (items, term) => {
        if (!Array.isArray(items)) return [];
        if (!term) return items;

        return items.reduce((acc, category) => {
            const matchesParent = category.name.toLowerCase().includes(term.toLowerCase());
            const filteredChildren = category.children ? filterBySearch(category.children, term) : [];
            const hasMatchingChild = filteredChildren.length > 0;

            if (matchesParent || hasMatchingChild) {
                acc.push({
                    ...category,
                    children: matchesParent ? category.children : filteredChildren,
                });
            }
            return acc;
        }, []);
    };

    const filteredCategories = filterBySearch(categories, search);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="mb-1.5 flex items-center justify-end gap-2 text-right text-sm font-extrabold text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all duration-300
                    ${isOpen
                        ? 'border-primary-500 bg-white shadow-lg ring-4 ring-primary-500/10 dark:bg-gray-900'
                        : 'border-gray-100 bg-gray-50/50 hover:border-primary-500/30 dark:border-gray-800 dark:bg-gray-800/30'}
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
                            <span className="text-2xl drop-shadow-sm">{selected.icon || DEFAULT_CATEGORY_ICON}</span>
                            <div className="text-right">
                                <span className="block leading-tight font-black text-gray-800 dark:text-white">{selected.name}</span>
                                {selected.parent && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-500">قسم فرعي</span>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <span className="font-bold text-gray-400">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {selected && (
                        <button
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange(null);
                            }}
                            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary-500' : ''}`} />
                </div>
            </button>

            {error && <p className="mt-1.5 text-right text-[10px] font-black uppercase tracking-wider text-red-500">{error}</p>}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full z-[100] mt-3 flex max-h-[450px] flex-col overflow-hidden rounded-3xl border-2 border-gray-100 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/80"
                    >
                        <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                            <div className="relative">
                                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="ابحث عن قسم..."
                                    className="w-full rounded-xl border-2 border-gray-100 bg-white py-3 pl-4 pr-11 text-sm font-bold outline-none transition-all focus:border-primary-500 dark:border-gray-800 dark:bg-gray-900"
                                />
                            </div>
                        </div>

                        <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-3">
                            {filteredCategories.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FolderTree className="mx-auto mb-3 h-12 w-12 text-gray-200 dark:text-gray-800" />
                                    <p className="text-sm font-bold text-gray-400">لم يتم العثور على أقسام</p>
                                </div>
                            ) : (
                                filteredCategories.map((category) => (
                                    <div key={category._id} className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange(category._id);
                                                setIsOpen(false);
                                            }}
                                            className={`
                                                group flex w-full items-center justify-between rounded-2xl p-3 transition-all duration-200
                                                ${value === category._id
                                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50'}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`text-2xl transition-transform group-hover:scale-110 ${value === category._id ? '' : 'grayscale-[0.5] group-hover:grayscale-0'}`}>
                                                    {category.icon || DEFAULT_CATEGORY_ICON}
                                                </span>
                                                <div className="text-right">
                                                    <span className={`block font-black ${value === category._id ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{category.name}</span>
                                                    {category.children && category.children.length > 0 && !search && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${value === category._id ? 'text-white/70' : 'text-primary-500'}`}>
                                                            {category.children.length} أقسام فرعية
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {value === category._id && <Check className="h-5 w-5" />}
                                        </button>

                                        {category.children && category.children.length > 0 && (
                                            <div className="mr-6 mt-1 space-y-1 border-r-2 border-primary-500/10 pr-4">
                                                {category.children
                                                    .filter((child) => (
                                                        child.name.toLowerCase().includes(search.toLowerCase())
                                                        || category.name.toLowerCase().includes(search.toLowerCase())
                                                    ))
                                                    .map((child) => (
                                                        <button
                                                            key={child._id}
                                                            type="button"
                                                            onClick={() => {
                                                                onChange(child._id);
                                                                setIsOpen(false);
                                                            }}
                                                            className={`
                                                                group flex w-full items-center justify-between rounded-xl p-2.5 transition-all duration-200
                                                                ${value === child._id
                                                                    ? 'border border-primary-200 bg-primary-100 text-primary-600 dark:border-primary-500/30 dark:bg-primary-500/20 dark:text-primary-400'
                                                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-lg transition-transform group-hover:scale-110">{child.icon || DEFAULT_CATEGORY_ICON}</span>
                                                                <span className="text-sm font-bold">{child.name}</span>
                                                            </div>
                                                            {value === child._id && <Check className="h-4 w-4" />}
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
