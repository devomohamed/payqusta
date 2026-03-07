import React from 'react';
import { Modal, Badge, Button, Card } from './UI';
import { Package, Tag, Truck, Barcode, LayoutGrid, Store, ChevronLeft, MapPin } from 'lucide-react';
import { useAuthStore } from '../store';

export default function ProductDetailModal({ product, open, onClose }) {
    if (!product) return null;
    const tenantId = useAuthStore((state) => state.tenant?._id || state.tenant?.id || '');

    const resolveBranchName = (branchRef) => {
        const branchId = typeof branchRef === 'string' ? branchRef : (branchRef?._id || '');
        if (branchRef?.name) return branchRef.name;
        if (branchId && tenantId && String(branchId) === String(tenantId)) return 'الفرع الرئيسي';
        return branchId ? 'فرع غير معروف' : 'الفرع الرئيسي';
    };

    const availabilityRows = (Array.isArray(product.inventory) && product.inventory.length > 0)
        ? product.inventory.map((inv) => ({
            branchName: resolveBranchName(inv?.branch),
            quantity: Number(inv?.quantity) || 0,
            minQuantity: Number(inv?.minQuantity) || 5,
        }))
        : [{
            branchName: 'الفرع الرئيسي',
            quantity: Number(product.stock?.quantity) || 0,
            minQuantity: Number(product.stock?.minQuantity) || 5,
        }];

    const statusBadge = (s) => {
        if (s === 'in_stock') return <Badge variant="success" className="px-3 py-1.5 shadow-sm text-xs">متوفر بالمخزون</Badge>;
        if (s === 'low_stock') return <Badge variant="warning" className="px-3 py-1.5 shadow-sm text-xs">مخزون منخفض ⚠️</Badge>;
        return <Badge variant="danger" className="px-3 py-1.5 shadow-sm shadow-red-500/20 text-xs">نفذ من المخزون 🚨</Badge>;
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="تفاصيل المنتج"
            size="xl"
            bodyClassName="!p-0 flex flex-col"
        >
            <div className="flex flex-col lg:flex-row min-h-[50vh] max-h-[75vh]">
                {/* Right Side (Image Area) */}
                <div className="relative w-full lg:w-[45%] shrink-0 bg-gray-50/80 flex flex-col border-b lg:border-b-0 lg:border-l border-gray-100 dark:border-gray-800 dark:bg-gray-800/20">
                    <div className="absolute top-5 right-5 z-10">
                        {statusBadge(product.stockStatus)}
                    </div>

                    {/* Main Image */}
                    <div className="flex-1 flex items-center justify-center p-8 lg:p-12 min-h-[320px]">
                        {product.thumbnail || product.images?.length > 0 ? (
                            <img
                                src={product.thumbnail || product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-contain max-h-[400px] drop-shadow-xl hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                                <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm mb-4">
                                    <Package className="w-10 h-10" />
                                </div>
                                <p className="text-sm font-bold text-gray-400">لا توجد صور للمنتج</p>
                            </div>
                        )}
                    </div>

                    {/* Image Gallery Thumbnails */}
                    {product.images?.length > 1 && (
                        <div className="w-full overflow-x-auto pb-6 px-6 custom-scrollbar shrink-0">
                            <div className="flex gap-3 min-w-min">
                                {product.images.map((img, i) => {
                                    const isSelected = img === (product.thumbnail || product.images[0]);
                                    return (
                                        <div
                                            key={i}
                                            className={`w-20 h-20 rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-300 flex-shrink-0 bg-white dark:bg-gray-800 ${isSelected ? 'border-primary-500 ring-2 ring-primary-500/20 scale-[1.02]' : 'border-transparent hover:border-gray-200'}`}
                                        >
                                            <div className="w-full h-full p-1 bg-white dark:bg-gray-900 rounded-xl">
                                                <img src={img} className="w-full h-full object-contain rounded-lg" alt="" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Left Side (Content Area) */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-y-auto custom-scrollbar">
                    <div className="p-6 lg:p-8 space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="info" className="px-3 py-1 font-bold shadow-sm">{product.category?.name || 'بدون تصنيف'}</Badge>
                                {product.subcategory && <Badge variant="gray" className="px-3 py-1">{product.subcategory?.name}</Badge>}
                            </div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-5">
                                {product.name}
                            </h2>

                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <Barcode className="w-5 h-5 text-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase leading-none mb-0.5">الباركود / SKU</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{product.barcode || product.sku || 'غير متوفر'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                    تفاصيل إضافية
                                </h3>
                                <div
                                    className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed rtl-editor-content bg-gray-50/50 dark:bg-gray-800/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/50 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                            </div>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-5 bg-gradient-to-br from-white to-primary-50/30 dark:from-gray-900 dark:to-primary-900/10 border-primary-100 dark:border-primary-900/30 shadow-sm relative overflow-hidden group hover:border-primary-300 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary-500/10 transition-colors" />
                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-xl">
                                        <Tag className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">سعر البيع</p>
                                </div>
                                <div className="relative z-10 flex items-baseline gap-1 mt-1">
                                    <p className="text-3xl lg:text-4xl font-black text-primary-600 dark:text-primary-400">{(product.price || 0).toLocaleString()}</p>
                                    <p className="text-sm font-bold text-primary-600/60 dark:text-primary-400/60">EGP</p>
                                </div>
                            </Card>

                            <Card className="p-5 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:border-gray-300 transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-gray-500/10 transition-colors" />
                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl">
                                        <LayoutGrid className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">المخزون الكلي</p>
                                </div>
                                <div className="relative z-10 flex items-baseline gap-1 mt-1">
                                    <p className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">{product.stock?.quantity || 0}</p>
                                    <p className="text-sm font-medium text-gray-400 pb-1">/ {product.unit || 'ق'}</p>
                                </div>
                            </Card>
                        </div>

                        {/* Branch Distribution & Supplier */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Store className="w-4 h-4 text-gray-400" /> توفر المخزون بالفروع
                                </h4>
                                <div className="space-y-3">
                                    {availabilityRows.map((inv, idx) => {
                                        const isLow = inv.quantity <= (inv.minQuantity || 5);
                                        return (
                                            <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-700/50 group hover:shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLow ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'}`}>
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{inv.branchName}</span>
                                                </div>
                                                <span className={`text-base font-black px-2 ${isLow ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{inv.quantity}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {product.supplier && (
                                <div className="space-y-4 lg:pl-4 lg:border-r border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-gray-400" /> المورد الأساسي
                                    </h4>
                                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col justify-center h-[76px]">
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{product.supplier?.name || 'مورد عام'}</p>
                                        {product.supplier?.phone && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{product.supplier.phone}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="shrink-0 flex justify-end p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                <Button variant="ghost" className="px-8 font-bold text-gray-500 hover:text-gray-800" onClick={onClose}>إغلاق</Button>
            </div>
        </Modal>
    );
}

