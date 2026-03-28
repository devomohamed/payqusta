import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  MapPinned,
  PackageCheck,
  Plus,
  Save,
  Settings2,
  ShieldAlert,
  TestTube2,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, useAuthStore } from '../../store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
  Select,
  Switch,
  TextArea,
} from '../UI';
import { notify } from '../AnimatedNotification';

const BRANCH_TYPE_LABELS = {
  store: 'فرع بيع',
  warehouse: 'مخزن',
  fulfillment_center: 'مركز تنفيذ',
  hybrid: 'فرع هجين',
};

const ERROR_BEHAVIOR_OPTIONS = [
  { value: 'show_error', label: 'إظهار خطأ' },
  { value: 'use_fallback_price', label: 'استخدام سعر احتياطي' },
  { value: 'block_checkout', label: 'منع إتمام الطلب' },
];

const createEmptyZone = (sortOrder = 0) => ({
  code: '',
  label: '',
  governoratesText: '',
  areasText: '',
  fee: 0,
  estimatedDaysMin: 2,
  estimatedDaysMax: 3,
  sortOrder,
  isActive: true,
});

function splitCommaList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapShippingToForm(shipping) {
  return {
    enabled: shipping?.enabled ?? false,
    pricingMode: shipping?.pricingMode || 'fixed_zones',
    defaultShippingBranchId: shipping?.defaultShippingBranchId || '',
    defaultMethodName: shipping?.defaultMethodName || 'توصيل قياسي',
    supportsCashOnDelivery: shipping?.supportsCashOnDelivery !== false,
    estimatedDaysMin: shipping?.estimatedDaysMin ?? 2,
    estimatedDaysMax: shipping?.estimatedDaysMax ?? 3,
    dynamicApi: {
      endpoint: shipping?.dynamicApi?.endpoint || '',
      apiKey: shipping?.dynamicApi?.apiKey || '',
      timeoutMs: shipping?.dynamicApi?.timeoutMs ?? 8000,
      errorBehavior: shipping?.dynamicApi?.errorBehavior || 'show_error',
      fallbackPrice: shipping?.dynamicApi?.fallbackPrice ?? 0,
    },
    transferReminders: {
      enabled: shipping?.transferReminders?.enabled !== false,
      hoursToOverdue: shipping?.transferReminders?.hoursToOverdue ?? 6,
      reminderIntervalHours: shipping?.transferReminders?.reminderIntervalHours ?? 4,
    },
    zones: Array.isArray(shipping?.zones)
      ? shipping.zones.map((zone, index) => ({
          code: zone.code || '',
          label: zone.label || '',
          governoratesText: Array.isArray(zone.governorates) ? zone.governorates.join(', ') : '',
          areasText: Array.isArray(zone.areas) ? zone.areas.join(', ') : '',
          fee: zone.fee ?? 0,
          estimatedDaysMin: zone.estimatedDaysMin ?? 2,
          estimatedDaysMax: zone.estimatedDaysMax ?? 3,
          sortOrder: zone.sortOrder ?? index,
          isActive: zone.isActive !== false,
        }))
      : [],
  };
}

function serializeForm(form) {
  return {
    enabled: Boolean(form.enabled),
    pricingMode: form.pricingMode === 'dynamic_api' ? 'dynamic_api' : 'fixed_zones',
    defaultShippingBranchId: form.defaultShippingBranchId || null,
    defaultMethodName: form.defaultMethodName,
    supportsCashOnDelivery: Boolean(form.supportsCashOnDelivery),
    estimatedDaysMin: Number(form.estimatedDaysMin) || 0,
    estimatedDaysMax: Number(form.estimatedDaysMax) || 0,
    dynamicApi: {
      endpoint: form.dynamicApi.endpoint,
      apiKey: form.dynamicApi.apiKey,
      timeoutMs: Number(form.dynamicApi.timeoutMs) || 8000,
      errorBehavior: form.dynamicApi.errorBehavior,
      fallbackPrice: Number(form.dynamicApi.fallbackPrice) || 0,
    },
    transferReminders: {
      enabled: Boolean(form.transferReminders?.enabled),
      hoursToOverdue: Number(form.transferReminders?.hoursToOverdue) || 6,
      reminderIntervalHours: Number(form.transferReminders?.reminderIntervalHours) || 4,
    },
    zones: (form.zones || []).map((zone, index) => ({
      code: zone.code,
      label: zone.label,
      governorates: splitCommaList(zone.governoratesText),
      areas: splitCommaList(zone.areasText),
      fee: Number(zone.fee) || 0,
      estimatedDaysMin: Number(zone.estimatedDaysMin) || 0,
      estimatedDaysMax: Number(zone.estimatedDaysMax) || 0,
      sortOrder: index,
      isActive: zone.isActive !== false,
    })),
  };
}

function ModeTile({ active, title, description, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.75rem] border p-5 text-right transition-all ${
        active
          ? 'border-primary-300 bg-primary-50/80 shadow-sm ring-1 ring-primary-200 dark:border-primary-500/30 dark:bg-primary-500/10 dark:ring-primary-500/20'
          : 'app-surface-muted border-[color:var(--surface-border)] hover:border-primary-200 dark:hover:border-primary-500/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            active
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'app-surface text-primary-500'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="app-text-strong text-base font-black">{title}</p>
            {active && <Badge variant="primary">النشط الآن</Badge>}
          </div>
          <p className="mt-2 text-sm leading-7 app-text-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}

function InlineAlert({ tone = 'info', title, description }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
  };

  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? ShieldAlert : AlertCircle;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles[tone] || styles.info}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">{title}</p>
          {description && <p className="mt-1 text-sm leading-6">{description}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SettingsShipping() {
  const { getMe } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [eligibleBranches, setEligibleBranches] = useState([]);
  const [form, setForm] = useState(() => mapShippingToForm(null));
  const [statusAlert, setStatusAlert] = useState(null);
  const [testAlert, setTestAlert] = useState(null);

  const selectedBranch = useMemo(
    () => eligibleBranches.find((branch) => branch._id === form.defaultShippingBranchId) || null,
    [eligibleBranches, form.defaultShippingBranchId]
  );

  const loadShippingSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/shipping');
      const payload = res.data?.data || {};
      setForm(mapShippingToForm(payload.shipping));
      setEligibleBranches(Array.isArray(payload.eligibleBranches) ? payload.eligibleBranches : []);
      setStatusAlert(null);
    } catch (error) {
      setStatusAlert({
        tone: 'danger',
        title: 'فشل تحميل إعدادات الشحن',
        description: error.response?.data?.message || 'تعذر جلب بيانات إعدادات الشحن الحالية.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShippingSettings();
  }, []);

  const updateZone = (index, key, value) => {
    setForm((current) => ({
      ...current,
      zones: current.zones.map((zone, zoneIndex) =>
        zoneIndex === index ? { ...zone, [key]: value } : zone
      ),
    }));
  };

  const addZone = () => {
    setForm((current) => ({
      ...current,
      zones: [...current.zones, createEmptyZone(current.zones.length)],
    }));
  };

  const removeZone = (index) => {
    setForm((current) => ({
      ...current,
      zones: current.zones.filter((_, zoneIndex) => zoneIndex !== index),
    }));
  };

  const moveZone = (index, direction) => {
    setForm((current) => {
      const nextZones = [...current.zones];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextZones.length) return current;
      [nextZones[index], nextZones[targetIndex]] = [nextZones[targetIndex], nextZones[index]];
      return { ...current, zones: nextZones };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusAlert(null);
    try {
      const shipping = serializeForm(form);
      await api.put('/settings/shipping', { shipping });
      await getMe();
      await loadShippingSettings();
      setStatusAlert({
        tone: 'success',
        title: 'تم حفظ إعدادات الشحن',
        description: 'أصبحت إعدادات Branch X ونمط التسعير محدثة وجاهزة للاستخدام في الخطوات القادمة.',
      });
      notify.success('تم حفظ إعدادات الشحن');
    } catch (error) {
      const message = error.response?.data?.message || 'تعذر حفظ إعدادات الشحن';
      setStatusAlert({
        tone: 'danger',
        title: 'تعذر حفظ إعدادات الشحن',
        description: message,
      });
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestAlert(null);
    try {
      const shipping = serializeForm(form);
      const res = await api.post('/settings/shipping/test-connection', { shipping });
      setTestAlert({
        tone: 'success',
        title: 'تم اختبار الاتصال بنجاح',
        description: `استجابت الخدمة برمز ${res.data?.data?.statusCode ?? 200}.`,
      });
      notify.success('تم اختبار اتصال شركة الشحن');
    } catch (error) {
      const message = error.response?.data?.message || 'فشل اختبار الاتصال';
      setTestAlert({
        tone: 'danger',
        title: 'فشل اختبار الاتصال',
        description: message,
      });
      notify.error(message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="جاري تحميل إعدادات الشحن..." />;
  }

  if (!eligibleBranches.length) {
    return (
      <EmptyState
        icon={Truck}
        title="لا توجد فروع مؤهلة للشحن"
        description="يجب أولاً تفعيل المشاركة في الطلبات الأونلاين داخل الفروع ثم العودة لاختيار Branch X."
        action={(
          <Link to="/branches">
            <Button variant="primary">إدارة الفروع</Button>
          </Link>
        )}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-500 via-indigo-600 to-slate-950 px-6 py-7 text-white shadow-2xl">
        <div className="absolute -left-8 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
              <PackageCheck className="h-3.5 w-3.5" />
              إعدادات الشحن وتنفيذ الطلبات
            </div>
            <h2 className="text-2xl font-black">تحديد Branch X وتسعير الشحن</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">
              من هنا تحدد فرع الشحن الافتراضي للطلبات الأونلاين، وتختار بين التسعير الثابت بالمناطق أو التسعير الديناميكي عبر API شركة الشحن.
            </p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <p className="font-bold">سياسة V1</p>
            <p className="mt-1 text-white/80">كل طلب عميل يُسلَّم لشركة الشحن من Branch X فقط.</p>
          </div>
        </div>
      </div>

      {statusAlert && (
        <InlineAlert
          tone={statusAlert.tone}
          title={statusAlert.title}
          description={statusAlert.description}
        />
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-black app-text-strong">تفعيل الشحن الأونلاين</h3>
            <p className="mt-2 text-sm leading-7 app-text-muted">
              عند التفعيل سيُطلب من كل طلب أونلاين المرور عبر Branch X وسيظهر تسعير الشحن في الـ checkout.
            </p>
          </div>
          <div className="min-w-[260px]">
            <Switch
              checked={form.enabled}
              onChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
              label="تفعيل إعدادات الشحن"
              description="إيقافه يعطل منطق تسعير الشحن الجديد مؤقتًا."
            />
          </div>
        </div>
      </Card>

      <div className={`${!form.enabled ? 'pointer-events-none opacity-60' : ''} space-y-8`}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <MapPinned className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-black app-text-strong">اختيار فرع الشحن الافتراضي</h3>
              <p className="text-sm app-text-muted">الفروع الظاهرة هنا هي الفروع المفعلة للطلبات الأونلاين فقط.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Select
              label="Branch X"
              value={form.defaultShippingBranchId}
              onChange={(event) => setForm((current) => ({ ...current, defaultShippingBranchId: event.target.value }))}
              options={[
                { value: '', label: 'اختر فرع الشحن' },
                ...eligibleBranches.map((branch) => ({
                  value: branch._id,
                  label: `${branch.name} - ${branch.shippingOrigin?.governorate || 'بدون محافظة'}`,
                })),
              ]}
            />

            <div className="rounded-[1.75rem] border border-dashed border-primary-200 bg-primary-50/60 p-4 dark:border-primary-500/20 dark:bg-primary-500/10">
              {selectedBranch ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-primary-700 dark:text-primary-300">{selectedBranch.name}</p>
                    <Badge variant="primary">{BRANCH_TYPE_LABELS[selectedBranch.branchType] || 'فرع'}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-primary-700/80 dark:text-primary-200/80">
                    <p>{selectedBranch.address || 'لا يوجد عنوان فرع مسجل بعد'}</p>
                    <p>المحافظة: {selectedBranch.shippingOrigin?.governorate || 'غير محددة'}</p>
                    <p>المدينة: {selectedBranch.shippingOrigin?.city || 'غير محددة'}</p>
                    <p>الأولوية الأونلاين: {selectedBranch.onlinePriority ?? '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm app-text-muted">اختر فرعًا أولًا لعرض ملخص Branch X هنا.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-black app-text-strong">نمط التسعير النشط</h3>
              <p className="text-sm app-text-muted">اختر وضعًا واحدًا فقط ليظهر للعميل في خطوة الشحن.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModeTile
              active={form.pricingMode === 'fixed_zones'}
              title="Fixed Zones"
              description="كل زون لها سعر ثابت، ويُطابق النظام المحافظة أو المنطقة على الزون المناسبة."
              icon={MapPinned}
              onClick={() => setForm((current) => ({ ...current, pricingMode: 'fixed_zones' }))}
            />
            <ModeTile
              active={form.pricingMode === 'dynamic_api'}
              title="Dynamic API Pricing"
              description="يتم طلب التكلفة مباشرة من شركة الشحن باستخدام عنوان العميل وعنوان Branch X قبل تأكيد الطلب."
              icon={Truck}
              onClick={() => setForm((current) => ({ ...current, pricingMode: 'dynamic_api' }))}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="اسم طريقة الشحن"
              value={form.defaultMethodName}
              onChange={(event) => setForm((current) => ({ ...current, defaultMethodName: event.target.value }))}
              placeholder="توصيل قياسي"
            />
            <Input
              label="أقل مدة متوقعة"
              type="number"
              min="0"
              value={form.estimatedDaysMin}
              onChange={(event) => setForm((current) => ({ ...current, estimatedDaysMin: event.target.value }))}
            />
            <Input
              label="أقصى مدة متوقعة"
              type="number"
              min="0"
              value={form.estimatedDaysMax}
              onChange={(event) => setForm((current) => ({ ...current, estimatedDaysMax: event.target.value }))}
            />
          </div>
          <div className="mt-4">
            <Switch
              checked={form.supportsCashOnDelivery}
              onChange={(checked) => setForm((current) => ({ ...current, supportsCashOnDelivery: checked }))}
              label="السماح بالدفع عند الاستلام"
              description="يستخدم لاحقًا لتحديد ما إذا كانت طريقة الشحن الحالية تدعم الدفع عند الاستلام."
            />
          </div>
        </Card>

        {form.pricingMode === 'fixed_zones' ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black app-text-strong">إدارة الزونات</h3>
                <p className="text-sm app-text-muted">في V1 العناوين غير المطابقة لأي زون يتم منعها من الـ checkout.</p>
              </div>
              <Button onClick={addZone} icon={<Plus className="h-4 w-4" />}>
                إضافة زون
              </Button>
            </div>

            {form.zones.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={MapPinned}
                  title="لا توجد زونات بعد"
                  description="أضف أول زون لتحديد المحافظات أو المناطق وسعر الشحن الثابت."
                  action={{
                    label: 'إضافة زون',
                    onClick: addZone,
                    variant: 'primary',
                  }}
                />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {form.zones.map((zone, index) => (
                  <div key={`zone-${index}`} className="rounded-[1.75rem] border border-[color:var(--surface-border)] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={zone.isActive ? 'success' : 'gray'}>
                          {zone.isActive ? 'مفعلة' : 'غير مفعلة'}
                        </Badge>
                        <p className="font-bold app-text-strong">زون #{index + 1}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveZone(index, 'up')}
                          className="rounded-xl p-2 app-surface-muted disabled:opacity-40"
                          disabled={index === 0}
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveZone(index, 'down')}
                          className="rounded-xl p-2 app-surface-muted disabled:opacity-40"
                          disabled={index === form.zones.length - 1}
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeZone(index)}
                          className="rounded-xl bg-red-50 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                          title="حذف الزون"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Input
                        label="اسم الزون"
                        value={zone.label}
                        onChange={(event) => updateZone(index, 'label', event.target.value)}
                        placeholder="القاهرة الكبرى"
                      />
                      <Input
                        label="كود الزون"
                        value={zone.code}
                        onChange={(event) => updateZone(index, 'code', event.target.value)}
                        placeholder="greater-cairo"
                      />
                      <Input
                        label="سعر الشحن"
                        type="number"
                        min="0"
                        value={zone.fee}
                        onChange={(event) => updateZone(index, 'fee', event.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="أقل مدة"
                          type="number"
                          min="0"
                          value={zone.estimatedDaysMin}
                          onChange={(event) => updateZone(index, 'estimatedDaysMin', event.target.value)}
                        />
                        <Input
                          label="أقصى مدة"
                          type="number"
                          min="0"
                          value={zone.estimatedDaysMax}
                          onChange={(event) => updateZone(index, 'estimatedDaysMax', event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <TextArea
                        label="المحافظات المشمولة"
                        rows={4}
                        value={zone.governoratesText}
                        onChange={(event) => updateZone(index, 'governoratesText', event.target.value)}
                        placeholder="القاهرة, الجيزة, القليوبية"
                      />
                      <TextArea
                        label="المناطق أو الأحياء المشمولة"
                        rows={4}
                        value={zone.areasText}
                        onChange={(event) => updateZone(index, 'areasText', event.target.value)}
                        placeholder="مدينة نصر, التجمع, الشيخ زايد"
                      />
                    </div>

                    <div className="mt-4">
                      <Switch
                        checked={zone.isActive}
                        onChange={(checked) => updateZone(index, 'isActive', checked)}
                        label="تفعيل الزون"
                        description="الزون غير المفعلة لا تدخل في المطابقة داخل الـ checkout."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black app-text-strong">ربط التسعير الديناميكي</h3>
                <p className="text-sm app-text-muted">يُستخدم عنوان Branch X كعنوان المصدر وعنوان العميل كوجهة التسعير.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="API Endpoint"
                value={form.dynamicApi.endpoint}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  dynamicApi: { ...current.dynamicApi, endpoint: event.target.value },
                }))}
                placeholder="https://api.shipping-company.com/rates"
              />
              <Input
                label="API Key"
                type="password"
                value={form.dynamicApi.apiKey}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  dynamicApi: { ...current.dynamicApi, apiKey: event.target.value },
                }))}
                placeholder="••••••••••••"
              />
              <Input
                label="مهلة الاتصال بالمللي ثانية"
                type="number"
                min="1000"
                step="500"
                value={form.dynamicApi.timeoutMs}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  dynamicApi: { ...current.dynamicApi, timeoutMs: event.target.value },
                }))}
              />
              <Select
                label="سلوك الفشل"
                value={form.dynamicApi.errorBehavior}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  dynamicApi: { ...current.dynamicApi, errorBehavior: event.target.value },
                }))}
                options={ERROR_BEHAVIOR_OPTIONS}
              />
            </div>

            {form.dynamicApi.errorBehavior === 'use_fallback_price' && (
              <div className="mt-4 max-w-sm">
                <Input
                  label="السعر الاحتياطي"
                  type="number"
                  min="0"
                  value={form.dynamicApi.fallbackPrice}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    dynamicApi: { ...current.dynamicApi, fallbackPrice: event.target.value },
                  }))}
                />
              </div>
            )}

            <div className="mt-5 rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                <div className="text-sm text-amber-700 dark:text-amber-200">
                  <p className="font-bold">قرار MVP</p>
                  <p className="mt-1 leading-7">
                    التسعير الديناميكي يحتاج على الأقل `المحافظة + المدينة/المنطقة`. إذا كانت بيانات العنوان ناقصة، يتم إيقاف حساب الشحن حتى يستكمل العميل الحقول المطلوبة.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                loading={testing}
                icon={<TestTube2 className="h-4 w-4" />}
              >
                اختبار الاتصال
              </Button>
              {testAlert && (
                <Badge variant={testAlert.tone === 'success' ? 'success' : 'danger'}>
                  {testAlert.tone === 'success' ? 'الاتصال ناجح' : 'الاتصال فشل'}
                </Badge>
              )}
            </div>

            {testAlert && (
              <div className="mt-4">
                <InlineAlert
                  tone={testAlert.tone}
                  title={testAlert.title}
                  description={testAlert.description}
                />
              </div>
            )}
          </Card>
        )}

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-black app-text-strong">تذكيرات التحويلات المتأخرة</h3>
              <p className="text-sm app-text-muted">تُستخدم لمتابعة طلبات التحويل التي توقفت عند الفرع المرسل أو في مرحلة التجهيز.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Switch
              checked={form.transferReminders.enabled}
              onChange={(checked) => setForm((current) => ({
                ...current,
                transferReminders: { ...current.transferReminders, enabled: checked },
              }))}
              label="تفعيل التذكيرات التشغيلية"
              description="يرسل النظام تنبيهًا لمدير الفرع المرسل وللإدارة عند تأخر التحويل عن المهلة المحددة."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="مهلة التأخير بالساعات"
                type="number"
                min="1"
                value={form.transferReminders.hoursToOverdue}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  transferReminders: { ...current.transferReminders, hoursToOverdue: event.target.value },
                }))}
              />
              <Input
                label="فاصل التذكير بالساعات"
                type="number"
                min="1"
                value={form.transferReminders.reminderIntervalHours}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  transferReminders: { ...current.transferReminders, reminderIntervalHours: event.target.value },
                }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <InlineAlert
              tone="info"
              title="سياسة المنصة"
              description="القيم الافتراضية هي 6 ساعات للتأخير و4 ساعات بين كل تذكير، ويمكن تخصيصها لكل Tenant من هنا."
            />
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} size="lg" icon={<Save className="h-4 w-4" />}>
          حفظ إعدادات الشحن
        </Button>
      </div>
    </div>
  );
}
