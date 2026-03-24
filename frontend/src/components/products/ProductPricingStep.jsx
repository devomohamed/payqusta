import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, DollarSign, Plus, Store, Trash2, TrendingUp, Truck } from 'lucide-react';
import { Badge, Button, Input } from '../UI';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildDefaultAvailability(branchId) {
  return {
    branch: branchId,
    isAvailableInBranch: true,
    isSellableInPos: true,
    isSellableOnline: false,
    safetyStock: 0,
    onlineReserveQty: 0,
    priorityRank: 100,
  };
}

function ToggleChip({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        checked
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
          : 'app-surface border border-[color:var(--surface-border)] app-text-muted hover:border-primary-400'
      }`}
    >
      {label}
    </button>
  );
}

export default function ProductPricingStep({
  form,
  setForm,
  branches = [],
  user = null,
  branchScopeId = '',
  mainBranchOption = null,
  pricingErrors = {},
  fieldErrors = {},
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
  const isAdminLikeUser = user?.role === 'admin' || !!user?.isSuperAdmin;
  const isBranchScopedUser = Boolean(currentUserBranchId) && (!isAdminLikeUser || String(currentUserBranchId) !== mainBranchId);

  const branchOptions = [
    ...(mainBranchOption ? [mainBranchOption] : []),
    ...branches.filter((branch) => String(branch._id) !== mainBranchId),
  ];

  useEffect(() => {
    setForm((prev) => {
      const currentInventory = Array.isArray(prev.inventory) ? prev.inventory : [];
      const currentAvailability = Array.isArray(prev.branchAvailability) ? prev.branchAvailability : [];
      let nextInventory = [...currentInventory];
      let changed = false;

      if (isBranchScopedUser) {
        const scopedBranchId = String(currentUserBranchId);
        const totalQuantity = nextInventory.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
        const resolvedMinQuantity = Math.max(0, Number(prev.minStockAlert ?? 5) || 5);

        if (
          nextInventory.length !== 1
          || String(nextInventory[0]?.branch?._id || nextInventory[0]?.branch || '') !== scopedBranchId
        ) {
          nextInventory = [{
            branch: scopedBranchId,
            quantity: Math.max(0, totalQuantity),
            minQuantity: resolvedMinQuantity,
          }];
          changed = true;
        }
      } else if (nextInventory.length === 0 && mainBranchId) {
        nextInventory = [{
          branch: mainBranchId,
          quantity: 0,
          minQuantity: 5,
        }];
        changed = true;
      }

      const inventoryBranchIds = nextInventory
        .map((item) => String(item?.branch?._id || item?.branch || ''))
        .filter(Boolean);
      const availabilityBranchIds = currentAvailability
        .map((item) => String(item?.branch?._id || item?.branch || ''))
        .filter(Boolean);
      const effectiveBranchIds = inventoryBranchIds.length > 0
        ? inventoryBranchIds
        : availabilityBranchIds.length > 0
          ? availabilityBranchIds
          : mainBranchId
            ? [mainBranchId]
            : [];

      const nextAvailability = effectiveBranchIds.map((branchId) => {
        const existing = currentAvailability.find((item) => String(item?.branch?._id || item?.branch || '') === branchId);
        return existing
          ? {
            branch: branchId,
            isAvailableInBranch: existing.isAvailableInBranch ?? true,
            isSellableInPos: existing.isSellableInPos ?? true,
            isSellableOnline: existing.isSellableOnline ?? false,
            safetyStock: toNumber(existing.safetyStock, 0),
            onlineReserveQty: toNumber(existing.onlineReserveQty, 0),
            priorityRank: Math.max(1, toNumber(existing.priorityRank, 100)),
          }
          : buildDefaultAvailability(branchId);
      });

      if (JSON.stringify(nextInventory) !== JSON.stringify(currentInventory)) {
        changed = true;
      }
      if (JSON.stringify(nextAvailability) !== JSON.stringify(currentAvailability)) {
        changed = true;
      }

      if (!changed) return prev;

      return {
        ...prev,
        inventory: nextInventory,
        branchAvailability: nextAvailability,
      };
    });
  }, [currentUserBranchId, isBranchScopedUser, mainBranchId, setForm]);

  const updateInventoryRow = (index, field, value) => {
    setForm((prev) => {
      const nextInventory = [...(prev.inventory || [])];
      nextInventory[index] = {
        ...nextInventory[index],
        [field]: field === 'branch' ? value : toNumber(value, field === 'minQuantity' ? 5 : 0),
      };

      return {
        ...prev,
        inventory: nextInventory,
        stock: nextInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      };
    });
  };

  const removeInventoryRow = (index) => {
    setForm((prev) => {
      const nextInventory = (prev.inventory || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        inventory: nextInventory,
        stock: nextInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      };
    });
  };

  const updateAvailabilityRow = (branchId, field, value) => {
    setForm((prev) => ({
      ...prev,
      branchAvailability: (prev.branchAvailability || []).map((item) => (
        String(item.branch?._id || item.branch || '') === String(branchId)
          ? {
            ...item,
            [field]: typeof value === 'boolean'
              ? value
              : field === 'priorityRank'
                ? Math.max(1, toNumber(value, 100))
                : toNumber(value, 0),
          }
          : item
      )),
    }));
  };

  const getAvailabilityForBranch = (branchId) => (
    (form.branchAvailability || []).find((item) => String(item.branch?._id || item.branch || '') === String(branchId))
    || buildDefaultAvailability(branchId)
  );

  const totalBranchQuantity = (form.inventory || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <section className="app-surface rounded-2xl border border-gray-100/80 p-6 shadow-sm dark:border-white/10">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold app-text-strong">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          التسعير الأساسي
        </h3>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            label="سعر البيع *"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
            error={getErrorText(fieldErrors.price || pricingErrors.price)}
          />
          <Input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min="0"
            label="السعر قبل الخصم"
            value={form.compareAtPrice}
            onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
            placeholder="0.00"
            error={getErrorText(fieldErrors.compareAtPrice || pricingErrors.compareAtPrice)}
            tooltip="سيظهر كسعر مشطوب لإبراز الخصم أمام العميل."
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input
            id="costPrice"
            name="costPrice"
            type="number"
            min="0"
            label="سعر التكلفة"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            placeholder="0.00"
            error={getErrorText(fieldErrors.costPrice || pricingErrors.costPrice)}
            tooltip="يستخدم لحساب الربحية داخليًا، ولا يظهر للعميل."
          />
          <Input
            id="wholesalePrice"
            name="wholesalePrice"
            type="number"
            min="0"
            label="سعر الجملة"
            value={form.wholesalePrice}
            onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
            placeholder="0.00"
            error={getErrorText(fieldErrors.wholesalePrice || pricingErrors.wholesalePrice)}
          />
        </div>

        <div className="app-surface-muted mt-8 rounded-xl border border-gray-100/80 p-4 dark:border-white/10">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold app-text-muted">
            <TrendingUp className="h-4 w-4" />
            ملخص الربحية
          </h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="mb-1 text-xs app-text-muted">صافي الربح</p>
              <p className={`text-lg font-black ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-500' : 'app-text-strong'}`}>
                {profit > 0 ? '+' : ''}
                {profit.toLocaleString('en-US')} ج.م
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs app-text-muted">هامش الربح</p>
              <p className={`text-lg font-black ${margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-red-500' : 'app-text-strong'}`}>
                {margin}%
              </p>
            </div>
            {discount > 0 && (
              <div>
                <p className="mb-1 text-xs app-text-muted">نسبة الخصم</p>
                <Badge variant="danger" className="py-1 text-sm">-{discount.toFixed(0)}%</Badge>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="app-surface rounded-2xl border border-gray-100/80 p-6 shadow-sm dark:border-white/10">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold app-text-strong">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              المخزون والتوفر حسب الفرع
            </h3>
            <p className="mt-2 text-sm leading-7 app-text-muted">
              الكمية لا تعني وحدها أن المنتج متاح للبيع. من هنا تحدد لكل فرع هل المنتج ظاهر ومتّاح في نقطة البيع أو الأونلاين.
            </p>
          </div>

          {!isBranchScopedUser && !form.hasVariants && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={(form.inventory || []).length >= branchOptions.length}
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  inventory: [...(prev.inventory || []), { branch: '', quantity: 0, minQuantity: 5 }],
                }));
              }}
            >
              <Plus className="h-4 w-4" />
              إضافة فرع
            </Button>
          )}
        </div>

        {isBranchScopedUser && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300">
            سيتم ربط المنتج تلقائيًا بفرعك الحالي فقط، ويمكنك التحكم في بيعه داخل الأونلاين أو نقطة البيع من نفس البطاقة.
          </div>
        )}

        {form.hasVariants ? (
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/10 dark:text-primary-300">
            هذا المنتج يحتوي على موديلات. في هذه المرحلة نُطبّق التوفر حسب الفرع على مستوى المنتج الأساسي، بينما إدارة توافر الموديلات نفسها ستأتي في مرحلة لاحقة.
          </div>
        ) : (
          <div className="space-y-4">
            {(form.inventory || []).map((inv, index) => {
              const branchId = String(inv.branch?._id || inv.branch || '');
              const availability = getAvailabilityForBranch(branchId);

              return (
                <div key={`${branchId || 'branch'}-${index}`} className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] app-surface-muted">
                  <div className="grid grid-cols-1 gap-4 border-b border-[color:var(--surface-border)] p-4 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <label className="mb-1.5 block text-sm font-medium app-text-soft">الفرع</label>
                      <select
                        className="app-surface app-field w-full rounded-xl px-3 py-2.5 text-sm app-text-body"
                        value={branchId}
                        disabled={isBranchScopedUser}
                        onChange={(e) => updateInventoryRow(index, 'branch', e.target.value)}
                      >
                        <option value="">اختر فرعًا</option>
                        {branchOptions.map((branch) => {
                          const optionId = String(branch._id);
                          const usedElsewhere = (form.inventory || []).some(
                            (item, itemIndex) => itemIndex !== index && String(item.branch?._id || item.branch || '') === optionId
                          );
                          return (
                            <option key={branch._id} value={branch._id} disabled={usedElsewhere}>
                              {branch.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="lg:col-span-3">
                      <Input
                        type="number"
                        min="0"
                        label="الكمية"
                        value={inv.quantity}
                        onChange={(e) => updateInventoryRow(index, 'quantity', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <Input
                        type="number"
                        min="0"
                        label="حد التنبيه"
                        value={inv.minQuantity}
                        onChange={(e) => updateInventoryRow(index, 'minQuantity', e.target.value)}
                        placeholder="5"
                      />
                    </div>
                    {!isBranchScopedUser && (form.inventory || []).length > 1 && (
                      <div className="flex items-end justify-end lg:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeInventoryRow(index)}
                          className="rounded-xl p-3 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ToggleChip
                        label="متاح في الفرع"
                        checked={availability.isAvailableInBranch}
                        onChange={(value) => updateAvailabilityRow(branchId, 'isAvailableInBranch', value)}
                      />
                      <ToggleChip
                        label="يُباع في POS"
                        checked={availability.isSellableInPos}
                        onChange={(value) => updateAvailabilityRow(branchId, 'isSellableInPos', value)}
                      />
                      <ToggleChip
                        label="يُباع أونلاين"
                        checked={availability.isSellableOnline}
                        onChange={(value) => updateAvailabilityRow(branchId, 'isSellableOnline', value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Input
                        type="number"
                        min="0"
                        label="Safety Stock"
                        value={availability.safetyStock}
                        onChange={(e) => updateAvailabilityRow(branchId, 'safetyStock', e.target.value)}
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        min="0"
                        label="احتياطي الأونلاين"
                        value={availability.onlineReserveQty}
                        onChange={(e) => updateAvailabilityRow(branchId, 'onlineReserveQty', e.target.value)}
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        min="1"
                        label="أولوية الفرع"
                        value={availability.priorityRank}
                        onChange={(e) => updateAvailabilityRow(branchId, 'priorityRank', e.target.value)}
                        placeholder="100"
                      />
                    </div>

                    <div className="rounded-xl border border-dashed border-[color:var(--surface-border)] px-4 py-3 text-xs leading-6 app-text-muted">
                      إذا كان المنتج موجودًا في المخزون لكن <strong className="app-text-body">غير متاح في الفرع</strong> فلن يعتبره النظام صالحًا للبيع من هذا الفرع.
                      ويمكنك تعطيل البيع الأونلاين فقط مع الإبقاء على البيع في POS أو العكس حسب احتياج التشغيل.
                    </div>
                  </div>
                </div>
              );
            })}

            {(form.inventory || []).length === 0 && (
              <div className="app-surface-muted rounded-xl border border-dashed border-gray-300/80 py-8 text-center dark:border-white/10">
                <Store className="mx-auto mb-3 h-8 w-8 app-text-muted" />
                <p className="text-sm app-text-muted">
                  {isBranchScopedUser ? 'جارٍ تجهيز ربط المنتج بفرعك...' : 'أضف فرعًا أولًا لتحديد المخزون وإعدادات التوفر الخاصة به.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/10">
              <span className="text-sm font-bold text-primary-700 dark:text-primary-300">إجمالي الكمية في كل الفروع</span>
              <span className="text-lg font-black text-primary-700 dark:text-primary-300">{totalBranchQuantity} قطعة</span>
            </div>
          </div>
        )}

        <div className="mt-6 md:w-1/2">
          <Input
            type="date"
            label="تاريخ الصلاحية"
            value={form.expiryDate ? new Date(form.expiryDate).toISOString().split('T')[0] : ''}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
        </div>
      </section>

      <section className="app-surface rounded-2xl border border-gray-100/80 p-6 shadow-sm dark:border-white/10">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold app-text-strong">
          <Truck className="h-5 w-5 text-blue-500" />
          الشحن والتوصيل
        </h3>

        <div className="flex flex-col gap-6">
          <label className="app-surface-muted flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200/80 p-4 transition-colors hover:border-primary-500/30 dark:border-white/10">
            <input
              type="checkbox"
              checked={form.isFreeShipping}
              onChange={(e) => setForm({ ...form, isFreeShipping: e.target.checked, shippingCost: 0 })}
              className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <p className="font-bold app-text-strong">هذا المنتج يشحن مجانًا</p>
              <p className="text-sm app-text-muted">
                سيظهر للعميل كشحن مجاني، ولن تُضاف تكلفة شحن مستقلة لهذا المنتج.
              </p>
            </div>
          </label>

          {!form.isFreeShipping && (
            <div className="mt-2 md:w-1/2">
              <Input
                type="number"
                min="0"
                label="تكلفة الشحن الثابتة"
                value={form.shippingCost}
                onChange={(e) => setForm({ ...form, shippingCost: e.target.value })}
                placeholder="0.00"
                tooltip="إذا كان الشحن يُحسب من إعدادات السلة أو الوزن العام، اترك هذا الحقل بصفر."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
