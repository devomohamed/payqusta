import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Badge, Button } from '../UI';
import { DollarSign, TrendingUp, AlertTriangle, Truck, Plus, Trash2 } from 'lucide-react';

export default function ProductPricingStep({
    form,
    setForm,
    branches = [],
    user = null,
    mode = 'create',
    branchScopeId = '',
    mainBranchOption = null,
    pricingErrors = {}
}) {
    const { t } = useTranslation('admin');
    const getErrorText = (errKey) => errKey ? t(`products.validation.${errKey}`, errKey) : undefined;
    const price = Number(form.price) || 0;
    const cost = Number(form.costPrice) || 0;
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
    const compareAtPrice = Number(form.compareAtPrice) || 0;
    const discount = compareAtPrice > price ? ((compareAtPrice - price) / compareAtPrice) * 100 : 0;
    const currentUserBranchId = branchScopeId || user?.branch?._id || user?.branch || '';
    const mainBranchId = mainBranchOption?._id ? String(mainBranchOption._id) : '';

    // Determine if the user should be restricted to a single branch.
    // If they have a currentUserBranchId AND it is NOT the main branch (or they are not admin)
    const isAdminLikeUser = user?.role === 'admin' || !!user?.isSuperAdmin;
    const isBranchScopedUser = Boolean(currentUserBranchId) && (!isAdminLikeUser || String(currentUserBranchId) !== mainBranchId);

    const hasMainSelected = Boolean(mainBranchId) && (form.inventory || []).some((item) => String(item?.branch?._id || item?.branch || '') === mainBranchId);
    const branchOptions = [
        ...(mainBranchOption ? [mainBranchOption] : []),
        ...branches.filter((branch) => String(branch._id) !== mainBranchId)
    ];

    useEffect(() => {
        setForm((prev) => {
            const currentInventory = Array.isArray(prev.inventory) ? prev.inventory : [];
            let needsUpdate = false;
            let newInventory = [...currentInventory];

            // 1. If branch scoped, FORCE exactly one row for their branch
            if (isBranchScopedUser) {
                if (newInventory.length !== 1 || String(newInventory[0]?.branch?._id || newInventory[0]?.branch || '') !== String(currentUserBranchId)) {
                    const totalQuantity = newInventory.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
                    const resolvedMinQuantity = Math.max(0, Number(prev.minStockAlert ?? 5) || 5);
                    newInventory = [{
                        branch: currentUserBranchId,
                        quantity: Math.max(0, totalQuantity),
                        minQuantity: resolvedMinQuantity
                    }];
                    needsUpdate = true;
                }
            }
            // 2. If NOT branch scoped (admin/main), but inventory is empty, auto-add main branch
            else if (newInventory.length === 0) {
                newInventory = [{
                    branch: mainBranchId,
                    quantity: 0,
                    minQuantity: 5
                }];
                needsUpdate = true;
            }

            if (needsUpdate) {
                return { ...prev, inventory: newInventory };
            }
            return prev;
        });
    }, [isBranchScopedUser, currentUserBranchId, mainBranchId, setForm]);

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
                        error={getErrorText(pricingErrors.price)}
                        className="md:col-span-1"
                    />
                    <Input
                        type="number"
                        min="0"
                        label="السعر قبل الخصم (اختياري)"
                        value={form.compareAtPrice}
                        onChange={e => setForm({ ...form, compareAtPrice: e.target.value })}
                        placeholder="0.00"
                        error={getErrorText(pricingErrors.compareAtPrice)}
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
                        error={getErrorText(pricingErrors.costPrice)}
                        tooltip="لحساب الأرباح بدقة. هذا الحقل مخفي عن العملاء."
                    />
                    <Input
                        type="number"
                        min="0"
                        label="سعر الجملة (اختياري)"
                        value={form.wholesalePrice}
                        onChange={e => setForm({ ...form, wholesalePrice: e.target.value })}
                        placeholder="0.00"
                        error={getErrorText(pricingErrors.wholesalePrice)}
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
                {isBranchScopedUser && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300">
                        سيتم ربط المنتج تلقائيًا بالفرع الخاص بحسابك.
                    </div>
                )}

                {form.hasVariants ? (
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm font-medium">
                        بما أن هذا المنتج يحتوي على موديلات (مقاسات، ألوان)، يتم تتبع المخزون داخل إعدادات كل موديل بشكل منفصل. يمكنك تعديلها في خطوة "الصور والموديلات".
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">مخزون الفروع</h4>
                            {!isBranchScopedUser && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={(form.inventory || []).length >= branchOptions.length}
                                    onClick={() => {
                                        setForm({
                                            ...form,
                                            inventory: [...(form.inventory || []), { branch: '', quantity: 0, minQuantity: 5 }]
                                        });
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة فرع
                                </Button>
                            )}
                        </div>

                        {(form.inventory || []).map((inv, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="md:col-span-5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">الفرع</label>
                                    <select
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={inv.branch?._id || inv.branch || ''}
                                        disabled={isBranchScopedUser || (String(inv.branch?._id || inv.branch || '') === mainBranchId && isAdminLikeUser)}
                                        onChange={(e) => {
                                            const newInv = [...form.inventory];
                                            newInv[index].branch = e.target.value;
                                            setForm({ ...form, inventory: newInv });
                                        }}
                                    >
                                        <option value="">-- اختر فرع --</option>
                                        {branchOptions.map(b => {
                                            const optionId = String(b._id);
                                            const isMainOption = optionId === mainBranchId;
                                            const usedElsewhere = (form.inventory || []).some((i, idx) => idx !== index && (String(i.branch) === optionId || String(i.branch?._id) === optionId));
                                            const hasMainInAnotherRow = Boolean(mainBranchId) && (form.inventory || []).some((i, idx) => idx !== index && (String(i.branch) === mainBranchId || String(i.branch?._id) === mainBranchId));
                                            const hasOtherInAnotherRow = (form.inventory || []).some((i, idx) => idx !== index && String(i.branch?._id || i.branch || '') !== '');
                                            const disabled = usedElsewhere || (isMainOption && hasOtherInAnotherRow) || (!isMainOption && hasMainInAnotherRow);
                                            return (
                                                <option key={b._id} value={b._id} disabled={disabled}>{b.name}</option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="md:col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        label="الكمية"
                                        value={inv.quantity}
                                        onChange={e => {
                                            const newInv = [...form.inventory];
                                            newInv[index].quantity = Number(e.target.value);
                                            setForm({ ...form, inventory: newInv, stock: newInv.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) });
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        label="تنبيه المخزون"
                                        value={inv.minQuantity}
                                        onChange={e => {
                                            const newInv = [...form.inventory];
                                            newInv[index].minQuantity = Number(e.target.value);
                                            setForm({ ...form, inventory: newInv });
                                        }}
                                        placeholder="5"
                                    />
                                </div>
                                {!isBranchScopedUser && form.inventory.length > 1 && (
                                    <div className="md:col-span-1 flex justify-end pb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newInv = form.inventory.filter((_, i) => i !== index);
                                                setForm({ ...form, inventory: newInv, stock: newInv.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) });
                                            }}
                                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(form.inventory || []).length === 0 && (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{isBranchScopedUser ? 'جاري ربط المنتج بفرعك...' : 'لم يتم إضافة فروع. أضف فرعاً لتحديد الكميات.'}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800">
                            <span className="text-sm font-bold text-primary-700 dark:text-primary-300">إجمالي الكمية في جميع الفروع:</span>
                            <span className="text-lg font-black text-primary-700 dark:text-primary-300">
                                {(form.inventory || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} قطعة
                            </span>
                        </div>
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
