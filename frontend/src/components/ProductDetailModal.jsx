import React from 'react';
import { Modal, Badge, Button, Card } from './UI';
import { Package, X, Tag, Truck, Info, Barcode, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductDetailModal({ product, open, onClose }) {
    if (!product) return null;

    const statusBadge = (s) => {
        if (s === 'in_stock') return <Badge variant="success">متوفر بالمخزون</Badge>;
        if (s === 'low_stock') return <Badge variant="warning">مخزون منخفض ⚠️</Badge>;
        return <Badge variant="danger">نفذ من المخزون 🚨</Badge>;
    };

    return (
        <Modal open={open} onClose={onClose} title="تفاصيل المنتج" size="lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Images/Gallery Section */}
                <div className="space-y-4">
                    <div className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-3xl overflow-hidden border-2 border-gray-100 dark:border-gray-800 relative group">
                        {product.thumbnail || product.images?.length > 0 ? (
                            <img
                                src={product.thumbnail || product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <Package className="w-20 h-20 mb-2" />
                                <p className="text-sm font-bold">لا توجد صور للمنتج</p>
                            </div>
                        )}
                        <div className="absolute top-4 right-4">
                            {statusBadge(product.stockStatus)}
                        </div>
                    </div>

                    {product.images?.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {product.images.map((img, i) => (
                                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border-2 border-transparent hover:border-primary-500 cursor-pointer transition-all flex-shrink-0">
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2 p-4 bg-primary-50 dark:bg-primary-500/5 rounded-2xl border border-primary-100 dark:border-primary-900/20">
                        <Barcode className="w-5 h-5 text-primary-500" />
                        <div className="text-right">
                            <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest leading-none mb-1">الباركود / SKU</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{product.barcode || product.sku || 'غير متوفر'}</p>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="info" className="px-3 py-1 text-[10px]">{product.category?.name || 'بدون تصنيف'}</Badge>
                            {product.subcategory && <Badge variant="gray" className="px-3 py-1 text-[10px]">{product.subcategory?.name}</Badge>}
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{product.name}</h2>
                        <div className="h-1.5 w-20 bg-primary-500 rounded-full mb-4" />

                        <div
                            className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar rtl-editor-content"
                            dangerouslySetInnerHTML={{ __html: product.description || 'لا يوجد وصف مفصل لهذا المنتج.' }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 border-2 border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/10">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> سعر البيع
                            </p>
                            <p className="text-2xl font-black text-primary-500">{(product.price || 0).toLocaleString()} <span className="text-xs">EGP</span></p>
                        </Card>
                        <Card className="p-4 border-2 border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/10">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <LayoutGrid className="w-3 h-3" /> المخزون الكلي
                            </p>
                            <p className="text-2xl font-black text-gray-800 dark:text-white">{product.stock?.quantity || 0} <span className="text-xs font-medium text-gray-400">/{product.unit || 'ق'}</span></p>
                        </Card>
                    </div>

                    {/* Branch Breakdown */}
                    {product.inventory?.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Truck className="w-4 h-4 text-primary-500" /> توزيع المخزون في الفروع
                            </h4>
                            <div className="space-y-2">
                                {product.inventory.map((inv, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-primary-500/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                                <ChevronRight className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{inv.branch?.name || 'فرع غير معروف'}</span>
                                        </div>
                                        <Badge variant={inv.quantity <= (inv.minQuantity || 5) ? 'danger' : 'success'} className="font-black">
                                            {inv.quantity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.supplier && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                    <Truck className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">المورد الأساسي</p>
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{product.supplier?.name || 'مورد عام'}</p>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">تواصل</Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                <Button variant="ghost" onClick={onClose}>إغلاق النافذة</Button>
            </div>
        </Modal>
    );
}
