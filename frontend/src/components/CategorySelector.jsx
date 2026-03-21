import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, FolderTree, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_CATEGORY_ICON } from '../utils/aiHelper';

/**
 * CategorySelector - A premium, searchable dropdown for category selection
 * Features: Searchable, Recursive Hierarchical display, Animations
 */

/** Recursive category item — renders itself and, when expanded, all its children */
function CategoryItem({ category, depth = 0, value, onSelect, search }) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = value === category._id;

    // Auto-expand when a descendant is selected
    const isDescendantSelected = (node, id) => {
        if (!node.children) return false;
        for (const child of node.children) {
            if (child._id === id || isDescendantSelected(child, id)) return true;
        }
        return false;
    };

    useEffect(() => {
        if (isDescendantSelected(category, value)) setExpanded(true);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    // When searching, expand to show matches
    useEffect(() => {
        if (search) setExpanded(true);
        else if (!isDescendantSelected(category, value)) setExpanded(false);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    const indent = depth * 16; // 16px per level

    return (
        <div className="space-y-0.5">
            <div className="flex items-center gap-1" style={{ paddingRight: `${indent}px` }}>
                {/* Expand/collapse toggle */}
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-1 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex-shrink-0"
                    >
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : (
                    <span className="w-5.5 flex-shrink-0" />
                )}

                {/* Category button */}
                <button
                    type="button"
                    onClick={() => { onSelect(category._id); }}
                    className={`
                        group flex flex-1 items-center justify-between rounded-xl p-2.5 transition-all duration-200
                        ${isSelected
                            ? (depth === 0
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'border border-primary-200 bg-primary-100 text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/20 dark:text-primary-400')
                            : 'app-text-soft hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}
                    `}
                >
                    <div className="flex items-center gap-3">
                        <span className={`transition-transform group-hover:scale-110 ${depth === 0 ? 'text-2xl' : 'text-lg'}`}>
                            {category.icon || DEFAULT_CATEGORY_ICON}
                        </span>
                        <div className="text-right">
                            <span className={`block font-black ${isSelected && depth === 0 ? 'text-white' : 'text-gray-800 dark:text-white'} ${depth > 0 ? 'text-sm' : ''}`}>
                                {category.name}
                            </span>
                            {hasChildren && !search && (
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected && depth === 0 ? 'text-white/70' : 'text-primary-500'}`}>
                                    {category.children.length} أقسام فرعية
                                </span>
                            )}
                        </div>
                    </div>
                    {isSelected && <Check className={`flex-shrink-0 ${depth === 0 ? 'h-5 w-5' : 'h-4 w-4'}`} />}
                </button>
            </div>

            {/* Children — recursive */}
            <AnimatePresence initial={false}>
                {hasChildren && expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="mr-3 border-r-2 border-primary-500/10 pr-1">
                            {category.children
                                .filter((child) => (
                                    !search
                                    || child.name.toLowerCase().includes(search.toLowerCase())
                                    || childMatchesSearch(child, search)
                                ))
                                .map((child) => (
                                    <CategoryItem
                                        key={child._id}
                                        category={child}
                                        depth={depth + 1}
                                        value={value}
                                        onSelect={onSelect}
                                        search={search}
                                    />
                                ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/** Check if any descendant matches the search term */
function childMatchesSearch(node, term) {
    if (!term) return true;
    if (node.name.toLowerCase().includes(term.toLowerCase())) return true;
    if (node.children) return node.children.some((c) => childMatchesSearch(c, term));
    return false;
}

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

    // Filter top-level categories — children filtering is handled recursively in CategoryItem
    const filteredTopLevel = categories.filter((cat) => (
        !search || childMatchesSearch(cat, search)
    ));

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
                        ? 'app-surface border-primary-500 shadow-lg ring-4 ring-primary-500/10'
                        : 'app-surface-muted hover:border-primary-500/30'}
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
                            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-red-500 dark:hover:bg-white/[0.05]"
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
                        className="app-surface absolute left-0 right-0 top-full z-[100] mt-3 flex max-h-[450px] flex-col overflow-hidden rounded-3xl border-2 shadow-2xl"
                    >
                        <div className="app-surface-muted border-b p-4">
                            <div className="relative">
                                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="ابحث عن قسم..."
                                    className="app-surface w-full rounded-xl border-2 py-3 pl-4 pr-11 text-sm font-bold outline-none transition-all focus:border-primary-500"
                                />
                            </div>
                        </div>

                        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
                            {filteredTopLevel.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FolderTree className="mx-auto mb-3 h-12 w-12 text-gray-200 dark:text-gray-800" />
                                    <p className="text-sm font-bold text-gray-400">لم يتم العثور على أقسام</p>
                                </div>
                            ) : (
                                filteredTopLevel.map((category) => (
                                    <CategoryItem
                                        key={category._id}
                                        category={category}
                                        depth={0}
                                        value={value}
                                        onSelect={(id) => {
                                            onChange(id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        search={search}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
