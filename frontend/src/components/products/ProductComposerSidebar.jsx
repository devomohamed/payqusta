import React from 'react';
import { Package, Tag, DollarSign, Layers } from 'lucide-react';
import { Badge } from '../UI';

export default function ProductComposerSidebar({ form, categories = [] }) {
    // Find category name
    const categoryName = categories.find(c => c._id === form.category)?.name || 'بدون قسم';

    // Calculate Profit
    const price = Number(form.price) || 0;
    const cost = Number(form.costPrice) || 0;
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;

    // Count Variants
    const variantsCount = form.variants?.length || 0;

    return (
        <div className="app-surface-muted w-full lg:w-80 shrink-0 border-l border-gray-100/80 dark:border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">ملخص المنتج</h3>

                {/* Main Preview Card */}
                <div className="app-surface rounded-2xl p-4 shadow-sm border border-gray-100/80 dark:border-white/10 mb-6">
                    <div className="app-surface-muted aspect-square rounded-xl flex items-center justify-center text-gray-400 mb-4 overflow-hidden border border-gray-100/80 dark:border-white/10">
                        {form.primaryImagePreview ? (
                            <img src={form.primaryImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-12 h-12 opacity-20" />
                        )}
                    </div>

                    <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                        {form.name || 'اسم المنتج...'}
                    </h4>
                    <p className="text-primary-600 font-black text-lg">
                        {price.toLocaleString('en-US')} ج.م
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3">
                    <div className="app-surface flex items-center justify-between p-3 rounded-xl border border-gray-100/80 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">القسم</span>
                        </div>
                        <span className="text-sm font-bold truncate max-w-[120px]">{categoryName}</span>
                    </div>

                    <div className="app-surface flex items-center justify-between p-3 rounded-xl border border-gray-100/80 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الموديلات</span>
                        </div>
                        <Badge variant={variantsCount > 0 ? 'primary' : 'gray'}>
                            {variantsCount} موديل
                        </Badge>
                    </div>

                    <div className="app-surface flex items-center justify-between p-3 rounded-xl border border-gray-100/80 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الربح المتوقع</span>
                        </div>
                        <div className="text-left">
                            <p className={`text-sm font-bold ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {profit > 0 ? '+' : ''}{profit.toLocaleString('en-US')} ج.م
                            </p>
                            {profit > 0 && <p className="text-[10px] text-emerald-600/70 font-semibold">{margin}% هامش</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Validation Hints can go here */}
        </div>
    );
}
