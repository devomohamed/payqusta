import React from 'react';
import { Input, Badge, Card } from '../UI';
import { DollarSign, Percent, TrendingUp, AlertTriangle, Truck } from 'lucide-react';

export default function ProductPricingStep({ form, setForm }) {
    const price = Number(form.price) || 0;
    const cost = Number(form.costPrice) || 0;
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
    const compareAtPrice = Number(form.compareAtPrice) || 0;
    const discount = compareAtPrice > price ? ((compareAtPrice - price) / compareAtPrice) * 100 : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* 1. Pricing Section */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    التسعير الأساسي
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Input
                        type="number"
                        min="0"
                        label="سعر البيع *"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        placeholder="0.00"
                        className="md:col-span-1"
                    />
                    <Input
                        type="number"
                        min="0"
                        label="السعر قبل الخصم (اختياري)"
                        value={form.compareAtPrice}
                        onChange={e => setForm({ ...form, compareAtPrice: e.target.value })}
                        placeholder="0.00"
                        tooltip="سيظهر مشطوباً لإظهار الخصم للعملاء."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        type="number"
                        min="0"
                        label="سعر التكلفة (اختياري)"
                        value={form.costPrice}
                        onChange={e => setForm({ ...form, costPrice: e.target.value })}
                        placeholder="0.00"
                        tooltip="لحساب الأرباح بدقة. هذا الحقل مخفي عن العملاء."
                    />
                    <Input
                        type="number"
                        min="0"
                        label="سعر الجملة (اختياري)"
                        value={form.wholesalePrice}
                        onChange={e => setForm({ ...form, wholesalePrice: e.target.value })}
                        placeholder="0.00"
                        tooltip="الحدود الدنيا وسعر الجملة للموديلات يمكن تخصيصها في صفحة إعدادات المنتجات."
                    />
                </div>

                {/* Profit Insight Card */}
                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> ملخص الربحية
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-1">الربح الصافي</p>
                            <p className={`text-lg font-black ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                {profit > 0 ? '+' : ''}{profit.toLocaleString('en-US')} ج.م
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">هامش الربح</p>
                            <p className={`text-lg font-black ${margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                {margin}%
                            </p>
                        </div>
                        {discount > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-1">نسبة الخصم للعميل</p>
                                <div className="flex items-center gap-1">
                                    <Badge variant="danger" className="text-sm py-1">-{discount.toFixed(0)}%</Badge>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. Inventory & Stock Section */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    المخزون والكميات
                </h3>

                {form.hasVariants ? (
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-medium">
                        بما أن هذا المنتج يحتوي على موديلات (مقاسات، ألوان)، يتم تتبع المخزون داخل إعدادات كل موديل بشكل منفصل. يمكنك تعديلها في خطوة "الصور والموديلات".
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            type="number"
                            min="0"
                            label="الكمية المتاحة ككل *"
                            value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            placeholder="0"
                        />
                        <Input
                            type="number"
                            min="0"
                            label="تنبيه المخزون المنخفض"
                            value={form.minStockAlert}
                            onChange={e => setForm({ ...form, minStockAlert: e.target.value })}
                            placeholder="5"
                            tooltip="الرقم الذي سيتم تنبيهك عنده لإعادة طلب المنتج."
                        />
                    </div>
                )}

                <div className="mt-6 md:w-1/2">
                    <Input
                        type="date"
                        label="تاريخ الصلاحية (اختياري)"
                        value={form.expiryDate ? new Date(form.expiryDate).toISOString().split('T')[0] : ''}
                        onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                    />
                </div>
            </section>

            {/* 3. Shipping Section */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-500" />
                    الشحن والتوصيل
                </h3>

                <div className="flex flex-col gap-6">
                    <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <input
                            type="checkbox"
                            checked={form.isFreeShipping}
                            onChange={e => setForm({ ...form, isFreeShipping: e.target.checked, shippingCost: 0 })}
                            className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">هذا المنتج يشحن مجاناً</p>
                            <p className="text-sm text-gray-500">سيظهر بادج "شحن مجاني" للعملاء ولن تُضاف تكلفة شحن على هذا المنتج في السلة.</p>
                        </div>
                    </label>

                    {!form.isFreeShipping && (
                        <div className="md:w-1/2 mt-2">
                            <Input
                                type="number"
                                min="0"
                                label="تكلفة الشحن الثابتة لهذا المنتج"
                                value={form.shippingCost}
                                onChange={e => setForm({ ...form, shippingCost: e.target.value })}
                                placeholder="0.00"
                                tooltip="إذا كان الشحن يتم احتسابه بناءً على وزن السلة ككل في الإعدادات، اترك هذا الحقل 0 للالتزام بالتكلفة الكلية."
                            />
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
