import React, { useState, useEffect } from 'react';
import {
  Save,
  Building2,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Truck,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore, api } from '../../store';
import { Button, Input, TextArea } from '../UI';
import { notify } from '../AnimatedNotification';
import { transliterateArabicToEnglish } from '../../utils/textUtils';
import { getUserFriendlyErrorMessage } from '../../utils/errorMapper';
import {
  PLATFORM_ROOT_DOMAIN,
  getPlatformStorefrontUrl,
  getStorefrontDomainUrl,
  isLocalStorefrontHost,
} from '../../utils/storefrontHost';

const createEmptyShippingZone = () => ({
  code: '',
  label: '',
  fee: 0,
  estimatedDaysMin: 1,
  estimatedDaysMax: 3,
  isActive: true,
});

export default function SettingsStore() {
  const { tenant, getMe, getBranches } = useAuthStore();
  const [branches, setBranches] = useState([]);
  const [storeForm, setStoreForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    watermarkEnabled: false,
    watermarkText: '',
    watermarkPosition: 'southeast',
    barcodeMode: 'both',
    autoGenerateLocalBarcode: false,
    receiptBarcodeSource: 'none',
    deliveryBarcodeSource: 'none',
    storefrontBarcodeSearchEnabled: false,
    shippingEnabled: false,
    shippingProvider: 'local',
    shippingProviderDisplayName: '',
    shippingApiKey: '',
    shippingMethodName: 'توصيل قياسي',
    shippingBaseFee: 0,
    shippingFreeThreshold: 0,
    shippingEstimatedDaysMin: 1,
    shippingEstimatedDaysMax: 3,
    shippingOriginGovernorate: '',
    shippingOriginCity: '',
    shippingWarehouseAddress: '',
    shippingSupportsCashOnDelivery: true,
    shippingAutoCreateShipment: false,
    shippingZones: [],
    onlineFulfillmentMode: 'branch_priority',
    defaultOnlineBranchId: '',
    branchPriorityOrder: [],
    allowCrossBranchOnlineAllocation: false,
    allowMixedBranchOrders: false,
    shiftDurationHours: 8,
  });
  const [saving, setSaving] = useState(false);
  const [applyingWatermark, setApplyingWatermark] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const [subdomain, setSubdomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [availabilityMsg, setAvailabilityMsg] = useState('');
  const [updatingSubdomain, setUpdatingSubdomain] = useState(false);
  const [subdomainFocused, setSubdomainFocused] = useState(false);

  useEffect(() => {
    if (!tenant) return;

    setStoreForm({
      name: tenant.name || '',
      email: tenant.businessInfo?.email || '',
      phone: tenant.businessInfo?.phone || '',
      address: tenant.businessInfo?.address || '',
      watermarkEnabled: tenant.settings?.watermark?.enabled || false,
      watermarkText: tenant.settings?.watermark?.text || '',
      watermarkPosition: tenant.settings?.watermark?.position || 'southeast',
      barcodeMode: tenant.settings?.barcode?.mode || 'both',
      autoGenerateLocalBarcode: tenant.settings?.barcode?.autoGenerateLocalBarcode || false,
      receiptBarcodeSource: tenant.settings?.barcode?.receiptBarcodeSource || 'none',
      deliveryBarcodeSource: tenant.settings?.barcode?.deliveryBarcodeSource || 'none',
      storefrontBarcodeSearchEnabled: tenant.settings?.barcode?.storefrontBarcodeSearchEnabled || false,
      shippingEnabled: tenant.settings?.shipping?.enabled || false,
      shippingProvider: tenant.settings?.shipping?.provider || 'local',
      shippingProviderDisplayName: tenant.settings?.shipping?.providerDisplayName || '',
      shippingApiKey: tenant.settings?.shipping?.apiKey || '',
      shippingMethodName: tenant.settings?.shipping?.defaultMethodName || 'توصيل قياسي',
      shippingBaseFee: tenant.settings?.shipping?.baseFee ?? 0,
      shippingFreeThreshold: tenant.settings?.shipping?.freeShippingThreshold ?? 0,
      shippingEstimatedDaysMin: tenant.settings?.shipping?.estimatedDaysMin ?? 1,
      shippingEstimatedDaysMax: tenant.settings?.shipping?.estimatedDaysMax ?? 3,
      shippingOriginGovernorate: tenant.settings?.shipping?.originGovernorate || '',
      shippingOriginCity: tenant.settings?.shipping?.originCity || '',
      shippingWarehouseAddress: tenant.settings?.shipping?.warehouseAddress || '',
      shippingSupportsCashOnDelivery: tenant.settings?.shipping?.supportsCashOnDelivery !== false,
      shippingAutoCreateShipment: tenant.settings?.shipping?.autoCreateShipment || false,
      shippingZones: Array.isArray(tenant.settings?.shipping?.zones) && tenant.settings.shipping.zones.length > 0
        ? tenant.settings.shipping.zones.map((zone) => ({
            code: zone.code || '',
            label: zone.label || '',
            fee: zone.fee ?? 0,
            estimatedDaysMin: zone.estimatedDaysMin ?? 1,
            estimatedDaysMax: zone.estimatedDaysMax ?? 3,
            isActive: zone.isActive !== false,
          }))
        : [],
      onlineFulfillmentMode: tenant.settings?.onlineFulfillment?.mode || 'branch_priority',
      defaultOnlineBranchId: tenant.settings?.onlineFulfillment?.defaultOnlineBranchId?._id
        || tenant.settings?.onlineFulfillment?.defaultOnlineBranchId
        || '',
      branchPriorityOrder: Array.isArray(tenant.settings?.onlineFulfillment?.branchPriorityOrder)
        ? tenant.settings.onlineFulfillment.branchPriorityOrder.map((branchItem) => branchItem?._id || branchItem).filter(Boolean)
        : [],
      allowCrossBranchOnlineAllocation: tenant.settings?.onlineFulfillment?.allowCrossBranchOnlineAllocation || false,
      allowMixedBranchOrders: tenant.settings?.onlineFulfillment?.allowMixedBranchOrders || false,
      shiftDurationHours: tenant.settings?.shiftDurationHours ?? 8,
    });
    setSubdomain(tenant.slug || '');
  }, [tenant]);

  useEffect(() => {
    let mounted = true;
    getBranches?.()
      .then((result) => {
        if (!mounted) return;
        setBranches(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (!mounted) return;
        setBranches([]);
      });

    return () => {
      mounted = false;
    };
  }, [getBranches]);

  const updateShippingZone = (index, key, value) => {
    setStoreForm((prev) => ({
      ...prev,
      shippingZones: prev.shippingZones.map((zone, zoneIndex) =>
        zoneIndex === index ? { ...zone, [key]: value } : zone
      ),
    }));
  };

  const addShippingZone = () => {
    setStoreForm((prev) => ({
      ...prev,
      shippingZones: [...prev.shippingZones, createEmptyShippingZone()],
    }));
  };

  const removeShippingZone = (index) => {
    setStoreForm((prev) => ({
      ...prev,
      shippingZones: prev.shippingZones.filter((_, zoneIndex) => zoneIndex !== index),
    }));
  };

  const togglePriorityBranch = (branchId, checked) => {
    setStoreForm((prev) => {
      const nextPriorityOrder = checked
        ? [...new Set([...(prev.branchPriorityOrder || []), branchId])]
        : (prev.branchPriorityOrder || []).filter((currentId) => currentId !== branchId);

      return {
        ...prev,
        branchPriorityOrder: nextPriorityOrder,
      };
    });
  };

  const handleSaveStore = async () => {
    if (!storeForm.name.trim()) {
      notify.error('اسم المتجر مطلوب');
      return;
    }

    setSaving(true);
    try {
      await api.put('/settings/store', {
        name: storeForm.name,
        businessInfo: {
          email: storeForm.email,
          phone: storeForm.phone,
          address: storeForm.address,
        },
        settings: {
          watermark: {
            enabled: storeForm.watermarkEnabled,
            text: storeForm.watermarkText,
            position: storeForm.watermarkPosition,
            opacity: 50,
          },
          barcode: {
            mode: storeForm.barcodeMode,
            autoGenerateLocalBarcode: storeForm.autoGenerateLocalBarcode,
            receiptBarcodeSource: storeForm.receiptBarcodeSource,
            deliveryBarcodeSource: storeForm.deliveryBarcodeSource,
            storefrontBarcodeSearchEnabled: storeForm.storefrontBarcodeSearchEnabled,
          },
          shipping: {
            enabled: storeForm.shippingEnabled,
            provider: storeForm.shippingProvider,
            providerDisplayName: storeForm.shippingProviderDisplayName,
            apiKey: storeForm.shippingApiKey,
            defaultMethodName: storeForm.shippingMethodName,
            baseFee: storeForm.shippingBaseFee,
            freeShippingThreshold: storeForm.shippingFreeThreshold,
            estimatedDaysMin: storeForm.shippingEstimatedDaysMin,
            estimatedDaysMax: storeForm.shippingEstimatedDaysMax,
            originGovernorate: storeForm.shippingOriginGovernorate,
            originCity: storeForm.shippingOriginCity,
            warehouseAddress: storeForm.shippingWarehouseAddress,
            supportsCashOnDelivery: storeForm.shippingSupportsCashOnDelivery,
            autoCreateShipment: storeForm.shippingAutoCreateShipment,
            zones: storeForm.shippingZones,
          },
          onlineFulfillment: {
            mode: storeForm.onlineFulfillmentMode,
            defaultOnlineBranchId: storeForm.defaultOnlineBranchId || null,
            branchPriorityOrder: storeForm.branchPriorityOrder || [],
            allowCrossBranchOnlineAllocation: storeForm.allowCrossBranchOnlineAllocation,
            allowMixedBranchOrders: storeForm.allowMixedBranchOrders,
          },
          shiftDurationHours: storeForm.shiftDurationHours,
        },
      });

      notify.success('تم حفظ بيانات المتجر');
      getMe();
    } catch (err) {
      notify.error(getUserFriendlyErrorMessage(err, 'خطأ في الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const handleApplyWatermarkToAll = async () => {
    if (!storeForm.watermarkEnabled || !storeForm.watermarkText) {
      notify.error('فعّل العلامة المائية وأدخل النص أولاً ثم احفظ');
      return;
    }
    setApplyingWatermark(true);
    setApplyResult(null);
    try {
      const res = await api.post('/settings/watermark/apply-to-all');
      const { processed, failed, skippedLegacy, totalProducts } = res.data?.data || {};
      setApplyResult({ processed, failed, skippedLegacy, totalProducts });
      notify.success(
        skippedLegacy > 0
          ? `تم تحديث ${processed} صورة، وتخطي ${skippedLegacy} صورة قديمة تحتاج إعادة رفع`
          : `تم تطبيق العلامة المائية على ${processed} صورة من ${totalProducts} منتج`
      );
    } catch (err) {
      notify.error('فشل تطبيق العلامة المائية — تأكد من حفظ الإعدادات أولاً');
    } finally {
      setApplyingWatermark(false);
    }
  };

  const checkAvailability = async (value) => {
    const converted = transliterateArabicToEnglish(value);
    const normalized = converted
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setSubdomain(normalized);

    if (!normalized || normalized.length < 3) {
      setIsAvailable(null);
      setAvailabilityMsg('');
      return;
    }

    if (normalized === tenant?.slug) {
      setIsAvailable(true);
      setAvailabilityMsg('هذا هو رابطك الحالي');
      return;
    }

    setChecking(true);
    try {
      const res = await api.get(`/settings/subdomain-availability?value=${normalized}`);
      const available = !!res.data?.data?.available;
      setIsAvailable(available);
      setAvailabilityMsg(
        available
          ? 'هذا الرابط متاح للاستخدام.'
          : 'عذرًا، هذا الرابط محجوز لمتجر آخر'
      );
    } catch (err) {
      setIsAvailable(false);
      setAvailabilityMsg(getUserFriendlyErrorMessage(err, 'خطأ في فحص التوفر'));
    } finally {
      setChecking(false);
    }
  };

  const handleUpdateSubdomain = async () => {
    if (!isAvailable || !subdomain) return;

    setUpdatingSubdomain(true);
    try {
      await api.put('/settings/subdomain', { subdomain });
      notify.success('تم تحديث رابط المتجر بنجاح');
      getMe();
    } catch (err) {
      notify.error(getUserFriendlyErrorMessage(err, 'فشل في تحديث الرابط'));
    } finally {
      setUpdatingSubdomain(false);
    }
  };

  const isLocalEnvironment = isLocalStorefrontHost();
  const localStoreUrl = getStorefrontDomainUrl(subdomain || tenant?.slug);
  const productionStoreUrl = subdomain ? getPlatformStorefrontUrl(subdomain) : '';
  const activeStoreUrl = tenant?.slug ? getStorefrontDomainUrl(tenant.slug) : '';
  const activeProductionStoreUrl = tenant?.slug ? getPlatformStorefrontUrl(tenant.slug) : '';

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">بيانات المتجر</h2>
            <p className="text-sm text-subtle">معلومات متجرك الأساسية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="اسم المتجر *"
            value={storeForm.name}
            onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
            placeholder="مثال: إلكترونيات المعادي"
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={storeForm.email}
            onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
            placeholder="info@store.com"
          />
          <Input
            label="رقم الهاتف"
            value={storeForm.phone}
            onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
            placeholder="01000000000"
          />
          <Input
            label="العنوان"
            value={storeForm.address}
            onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
            placeholder="المعادي، القاهرة"
          />
        </div>

        <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-5 dark:border-primary-900/30 dark:bg-primary-900/10">
          <div className="mb-4">
            <h3 className="text-base font-bold text-primary-700 dark:text-primary-300">إعدادات الباركود</h3>
            <p className="mt-1 text-sm text-muted">
              التحكم في واجهات الباركود المحلي والدولي، والبحث بالكاميرا، ومصادر الباركود المطبوعة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">وضع الباركود</label>
              <select
                value={storeForm.barcodeMode}
                onChange={(e) => setStoreForm({ ...storeForm, barcodeMode: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 transition-colors focus:border-primary-500 focus:ring-0 dark:border-gray-800 dark:text-white"
              >
                <option value="none">إخفاء واجهات الباركود</option>
                <option value="international_only">دولي فقط</option>
                <option value="local_only">محلي فقط</option>
                <option value="both">محلي + دولي</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <input
                type="checkbox"
                checked={storeForm.autoGenerateLocalBarcode}
                onChange={(e) => setStoreForm({ ...storeForm, autoGenerateLocalBarcode: e.target.checked })}
                className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">توليد الباركود المحلي تلقائيًا عند إنشاء المنتج</span>
            </label>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">باركود الإيصال</label>
              <select
                value={storeForm.receiptBarcodeSource}
                onChange={(e) => setStoreForm({ ...storeForm, receiptBarcodeSource: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 transition-colors focus:border-primary-500 focus:ring-0 dark:border-gray-800 dark:text-white"
              >
                <option value="none">بدون باركود</option>
                <option value="international">الباركود الدولي</option>
                <option value="local">الباركود المحلي</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">باركود تيكيت التوصيل</label>
              <select
                value={storeForm.deliveryBarcodeSource}
                onChange={(e) => setStoreForm({ ...storeForm, deliveryBarcodeSource: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 transition-colors focus:border-primary-500 focus:ring-0 dark:border-gray-800 dark:text-white"
              >
                <option value="none">بدون باركود</option>
                <option value="international">الباركود الدولي</option>
                <option value="local">الباركود المحلي</option>
              </select>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <input
              type="checkbox"
              checked={storeForm.storefrontBarcodeSearchEnabled}
              onChange={(e) => setStoreForm({ ...storeForm, storefrontBarcodeSearchEnabled: e.target.checked })}
              className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">تفعيل البحث بالكاميرا داخل المتجر الأمامي</span>
          </label>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-700 dark:text-amber-300">إعدادات الشحن</h3>
              <p className="mt-1 text-sm text-subtle">
                الرسوم الافتراضية، شركة الشحن، ومناطق التوصيل التي ستظهر في المتجر وتدخل ضمن ملخص الطلب.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-100 bg-gray-50 px-4 py-3 dark:border-amber-900/40 dark:bg-slate-950">
                <input
                  type="checkbox"
                  checked={storeForm.shippingEnabled}
                  onChange={(e) => setStoreForm({ ...storeForm, shippingEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">تفعيل الشحن داخل المتجر</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-100 bg-gray-50 px-4 py-3 dark:border-amber-900/40 dark:bg-slate-950">
                <input
                  type="checkbox"
                  checked={storeForm.shippingSupportsCashOnDelivery}
                  onChange={(e) => setStoreForm({ ...storeForm, shippingSupportsCashOnDelivery: e.target.checked })}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">السماح بالدفع عند الاستلام</span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-100 bg-gray-50 px-4 py-3 dark:border-amber-900/40 dark:bg-slate-950 md:col-span-2">
                <input
                  type="checkbox"
                  checked={storeForm.shippingAutoCreateShipment}
                  onChange={(e) => setStoreForm({ ...storeForm, shippingAutoCreateShipment: e.target.checked })}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">إنشاء الشحنة تلقائيًا بعد تأكيد الطلب عند تفعيل التكامل لاحقًا</span>
              </label>
            </div>

            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${!storeForm.shippingEnabled ? 'pointer-events-none opacity-60' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">شركة الشحن</label>
                <select
                  value={storeForm.shippingProvider}
                  onChange={(e) => setStoreForm({ ...storeForm, shippingProvider: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2.5 transition-colors focus:border-amber-500 focus:ring-0 dark:border-gray-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="local">شحن محلي</option>
                  <option value="bosta">Bosta</option>
                  <option value="aramex">Aramex</option>
                  <option value="manual">يدوي / شركة خارجية</option>
                  <option value="none">بدون مزود افتراضي</option>
                </select>
              </div>

              <Input
                label="الاسم الظاهر للمزود"
                value={storeForm.shippingProviderDisplayName}
                onChange={(e) => setStoreForm({ ...storeForm, shippingProviderDisplayName: e.target.value })}
                placeholder="مثال: Bosta Express"
              />

              <Input
                label="مسمى وسيلة الشحن"
                value={storeForm.shippingMethodName}
                onChange={(e) => setStoreForm({ ...storeForm, shippingMethodName: e.target.value })}
                placeholder="توصيل قياسي"
              />

              <Input
                label="API Key (اختياري)"
                value={storeForm.shippingApiKey}
                onChange={(e) => setStoreForm({ ...storeForm, shippingApiKey: e.target.value })}
                placeholder="يظهر للإدارة فقط"
              />

              <Input
                label="رسوم الشحن الأساسية"
                type="number"
                min="0"
                value={storeForm.shippingBaseFee}
                onChange={(e) => setStoreForm({ ...storeForm, shippingBaseFee: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="50"
              />

              <Input
                label="حد الشحن المجاني"
                type="number"
                min="0"
                value={storeForm.shippingFreeThreshold}
                onChange={(e) => setStoreForm({ ...storeForm, shippingFreeThreshold: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="500"
              />

              <Input
                label="أقل مدة متوقعة (أيام)"
                type="number"
                min="0"
                value={storeForm.shippingEstimatedDaysMin}
                onChange={(e) => setStoreForm({ ...storeForm, shippingEstimatedDaysMin: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="1"
              />

              <Input
                label="أقصى مدة متوقعة (أيام)"
                type="number"
                min="0"
                value={storeForm.shippingEstimatedDaysMax}
                onChange={(e) => setStoreForm({ ...storeForm, shippingEstimatedDaysMax: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="3"
              />

              <Input
                label="محافظة الشحن الأصلية"
                value={storeForm.shippingOriginGovernorate}
                onChange={(e) => setStoreForm({ ...storeForm, shippingOriginGovernorate: e.target.value })}
                placeholder="القاهرة"
              />

              <Input
                label="مدينة / فرع الانطلاق"
                value={storeForm.shippingOriginCity}
                onChange={(e) => setStoreForm({ ...storeForm, shippingOriginCity: e.target.value })}
                placeholder="مدينة نصر"
              />

              <div className="md:col-span-2">
                <TextArea
                  label="عنوان المستودع أو نقطة الاستلام"
                  value={storeForm.shippingWarehouseAddress}
                  onChange={(e) => setStoreForm({ ...storeForm, shippingWarehouseAddress: e.target.value })}
                  placeholder="العنوان الكامل الذي سيتم الاعتماد عليه عند إنشاء الشحنات"
                  rows={3}
                />
              </div>
            </div>

            <div className={`rounded-2xl border border-dashed border-amber-200 bg-white/70 p-4 dark:border-amber-800/40 dark:bg-gray-950/20 ${!storeForm.shippingEnabled ? 'pointer-events-none opacity-60' : ''}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">مناطق ورسوم الشحن</h4>
                  <p className="mt-1 text-xs text-muted">يمكنك تخصيص رسوم ومدة مختلفة لكل محافظة أو منطقة بدلًا من الرسوم الأساسية.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addShippingZone} icon={<Plus className="h-4 w-4" />}>
                  إضافة منطقة
                </Button>
              </div>

              <div className="space-y-3">
                {storeForm.shippingZones.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-muted dark:border-gray-800 dark:bg-slate-950">
                    لا توجد مناطق مخصصة الآن. سيتم استخدام الرسوم الأساسية في المتجر حتى تضيف مناطق شحن هنا.
                  </div>
                ) : (
                  storeForm.shippingZones.map((zone, index) => (
                    <div key={`${zone.code || 'zone'}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                        <Input
                          label="المنطقة"
                          value={zone.label}
                          onChange={(e) => updateShippingZone(index, 'label', e.target.value)}
                          placeholder="القاهرة"
                          className="md:col-span-2"
                        />
                        <Input
                          label="الكود"
                          value={zone.code}
                          onChange={(e) => updateShippingZone(index, 'code', e.target.value)}
                          placeholder="cairo"
                        />
                        <Input
                          label="الرسوم"
                          type="number"
                          min="0"
                          value={zone.fee}
                          onChange={(e) => updateShippingZone(index, 'fee', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="45"
                        />
                        <Input
                          label="من يوم"
                          type="number"
                          min="0"
                          value={zone.estimatedDaysMin}
                          onChange={(e) => updateShippingZone(index, 'estimatedDaysMin', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="1"
                        />
                        <Input
                          label="إلى يوم"
                          type="number"
                          min="0"
                          value={zone.estimatedDaysMax}
                          onChange={(e) => updateShippingZone(index, 'estimatedDaysMax', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="2"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={zone.isActive !== false}
                            onChange={(e) => updateShippingZone(index, 'isActive', e.target.checked)}
                            className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                          />
                          المنطقة مفعلة
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShippingZone(index)}
                          icon={<Trash2 className="h-4 w-4" />}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-sky-700 dark:text-sky-300">Online Fulfillment Policy</h3>
              <p className="mt-1 text-sm text-subtle">
                Choose which branch should handle online orders, whether fallback to other branches is allowed,
                and whether one order may be fulfilled from more than one branch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Routing Mode</label>
                <select
                  value={storeForm.onlineFulfillmentMode}
                  onChange={(e) => setStoreForm({ ...storeForm, onlineFulfillmentMode: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2.5 transition-colors focus:border-sky-500 focus:ring-0 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="branch_priority">Branch priority</option>
                  <option value="default_branch">Default branch</option>
                  <option value="customer_branch">Customer branch first</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Default Online Branch</label>
                <select
                  value={storeForm.defaultOnlineBranchId || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, defaultOnlineBranchId: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2.5 transition-colors focus:border-sky-500 focus:ring-0 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">No default branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={storeForm.allowCrossBranchOnlineAllocation}
                  onChange={(e) => setStoreForm({
                    ...storeForm,
                    allowCrossBranchOnlineAllocation: e.target.checked,
                    allowMixedBranchOrders: e.target.checked ? storeForm.allowMixedBranchOrders : false,
                  })}
                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Allow fallback to another branch when the preferred branch cannot fulfill the order
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={storeForm.allowMixedBranchOrders}
                  disabled={!storeForm.allowCrossBranchOnlineAllocation}
                  onChange={(e) => setStoreForm({ ...storeForm, allowMixedBranchOrders: e.target.checked })}
                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Allow one order to be fulfilled from more than one branch
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3">
                <h4 className="text-sm font-bold app-text-strong">Branch Priority</h4>
                <p className="mt-1 text-xs text-muted">
                  Select the branches that should be considered first for online orders. The branch commerce settings
                  still decide whether a branch is online-enabled.
                </p>
              </div>

              <div className="space-y-2">
                {branches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-muted dark:border-gray-800 dark:bg-slate-950">
                    No branches found yet. Create branches first, then return here to define the routing policy.
                  </div>
                ) : (
                  branches.map((branch) => {
                    const isChecked = (storeForm.branchPriorityOrder || []).includes(branch._id);
                    return (
                      <label
                        key={branch._id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-slate-950"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{branch.name}</p>
                          <p className="text-xs text-muted">
                            {branch.participatesInOnlineOrders ? 'Online enabled' : 'Not enabled for online orders'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => togglePriorityBranch(branch._id, e.target.checked)}
                          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveStore} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ بيانات المتجر
          </Button>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      <section className="space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">إعدادات التشغيل والورديات</h2>
            <p className="text-sm text-gray-400">التحكم في نظام الورديات وساعات العمل</p>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5 dark:border-purple-900/30 dark:bg-purple-900/10">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-purple-700 dark:text-purple-300">مدة الوردية الافتراضية</h3>
              <p className="mt-1 text-sm text-gray-500">
                حدد عدد الساعات التي تنتهي بعدها الوردية تلقائيًا. (من 1 إلى 24 ساعة)
              </p>
            </div>
            <div className="w-32">
              <Input
                type="number"
                min="1"
                max="24"
                value={storeForm.shiftDurationHours}
                onChange={(e) => setStoreForm({ ...storeForm, shiftDurationHours: Number(e.target.value) })}
                className="text-center font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveStore} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ إعدادات التشغيل
          </Button>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      <section className="space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              رابط المتجر (Subdomain)
            </h2>
            <p className="text-sm text-gray-500">
              الرابط المباشر الذي سيستخدمه عملاؤك للدخول والشراء
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-500/10 dark:bg-indigo-500/5">
          <div className="max-w-xl">
            <div className="mb-6 rounded-lg border border-indigo-100 bg-white p-4 text-right text-sm text-subtle dark:border-indigo-500/30 dark:bg-slate-950">
              <p className="mb-2 font-bold text-indigo-800 dark:text-indigo-200">
                ما هو رابط المتجر الأساسي؟
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-subtle dark:text-gray-300">
                <li>
                  هذا الرابط مجاني وسريع الإعداد، ويمنح عملاءك مدخلًا مباشرًا لمتجرك.
                </li>
                <li>
                  إذا كنت تريد ربط نطاقك الخاص مثل{' '}
                  <span dir="ltr" className="ml-1 font-mono text-[10px]">
                    www.myshop.com
                  </span>
                  ، انتقل إلى شاشة{' '}
                  <Link
                    to="/settings?tab=whitelabel"
                    className="font-bold text-indigo-600 underline dark:text-indigo-400"
                  >
                    إعدادات الهوية البصرية والنطاق المخصص
                  </Link>
                  .
                </li>
              </ul>
            </div>

            <label className="mb-2 block text-sm font-medium">
              اكتب رابط متجرك بالإنجليزية
            </label>
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => checkAvailability(e.target.value)}
                  onFocus={() => setSubdomainFocused(true)}
                  onBlur={() => setSubdomainFocused(false)}
                  placeholder={subdomainFocused ? '' : 'payqusta'}
                  dir="ltr"
                  className="w-full min-h-[46px] rounded-xl border-2 border-gray-200 bg-gray-50 px-4 pr-36 text-left font-mono text-indigo-600 transition-all duration-200 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-indigo-400 dark:focus:border-primary-400"
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-medium text-gray-400"
                  dir="ltr"
                >
                  .{PLATFORM_ROOT_DOMAIN}
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleUpdateSubdomain}
                disabled={!isAvailable || checking || subdomain === tenant?.slug}
                loading={updatingSubdomain}
                className="shadow-md"
              >
                تحديث الرابط
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-white/50 px-4 py-3 text-sm dark:border-indigo-800 dark:bg-gray-900/50">
              <span className="text-gray-500 dark:text-gray-400">الرابط النهائي:</span>{' '}
              {subdomain ? (
                <div className="mt-2 space-y-1.5">
                  <span
                    className="block font-semibold text-indigo-600 dark:text-indigo-400"
                    dir="ltr"
                    style={{ direction: 'ltr' }}
                  >
                    {isLocalEnvironment ? localStoreUrl : productionStoreUrl}
                  </span>
                  {isLocalEnvironment && productionStoreUrl && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      بعد النشر سيكون الرابط:
                      {' '}
                      <span dir="ltr" className="font-mono text-indigo-500 dark:text-indigo-300">
                        {productionStoreUrl}
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">
                  سيظهر الرابط هنا بعد كتابة اسم المتجر
                </span>
              )}
            </div>

            {(checking || isAvailable !== null) && subdomain && (
              <div
                className={`mt-3 flex items-center gap-2 text-sm font-medium ${isAvailable === true
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                ) : isAvailable === true ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {checking ? 'جارٍ فحص التوفر...' : availabilityMsg}
              </div>
            )}

            {tenant?.slug && (
              <div className="mt-6 border-t border-indigo-100 pt-6 dark:border-white/10">
                <p className="mb-2 text-sm text-subtle">رابط متجرك النشط حاليًا:</p>
                <a
                  href={activeStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 font-bold text-indigo-600 hover:underline dark:bg-indigo-500/10 dark:text-indigo-400"
                >
                  <Globe className="h-4 w-4" />
                  {isLocalEnvironment ? activeStoreUrl : activeProductionStoreUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {isLocalEnvironment && activeProductionStoreUrl && (
                  <p className="mt-2 text-xs text-muted">
                    بعد النشر سيعمل المتجر على:
                    {' '}
                    <span dir="ltr" className="font-mono text-indigo-500 dark:text-indigo-300">
                      {activeProductionStoreUrl}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      <section className="space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400">
              العلامة المائية للصور (Watermark)
            </h2>
            <p className="text-sm text-subtle">
              طبع اسم متجرك بشكل شفاف على صور المنتجات تلقائيًا لحفظ الحقوق
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6 dark:border-teal-500/10 dark:bg-teal-500/5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-teal-100 bg-gray-50 p-3 transition-colors hover:border-teal-300 dark:border-teal-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={storeForm.watermarkEnabled}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, watermarkEnabled: e.target.checked })
                  }
                  className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  تفعيل العلامة المائية للصور الجديدة
                </span>
              </label>

              <div
                className={`space-y-4 transition-opacity duration-300 ${!storeForm.watermarkEnabled ? 'pointer-events-none opacity-50' : ''
                  }`}
              >
                <Input
                  label="نص العلامة المائية"
                  value={storeForm.watermarkText}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, watermarkText: e.target.value })
                  }
                  placeholder="مثال: متجر الأناقة"
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">موقع العلامة المائية</label>
                  <select
                    value={storeForm.watermarkPosition}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, watermarkPosition: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2.5 transition-colors focus:border-teal-500 focus:ring-0 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="center">في المنتصف</option>
                    <option value="southeast">أسفل اليمين</option>
                    <option value="southwest">أسفل اليسار</option>
                    <option value="northeast">أعلى اليمين</option>
                    <option value="northwest">أعلى اليسار</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="relative flex min-h-[200px] flex-col items-center justify-center overflow-hidden rounded-xl border border-teal-100 bg-white p-4 dark:border-teal-800 dark:bg-gray-900">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 opacity-50 dark:bg-gray-800">
                <svg
                  className="h-20 w-20 text-gray-300 dark:text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </div>

              {storeForm.watermarkEnabled && storeForm.watermarkText && (
                <div
                  className="absolute z-10 text-xl font-bold text-white drop-shadow-md transition-all duration-500"
                  style={{
                    opacity: 0.7,
                    top:
                      storeForm.watermarkPosition.includes('north')
                        ? '20px'
                        : storeForm.watermarkPosition === 'center'
                          ? '50%'
                          : 'auto',
                    bottom: storeForm.watermarkPosition.includes('south') ? '20px' : 'auto',
                    left:
                      storeForm.watermarkPosition.includes('west')
                        ? '20px'
                        : storeForm.watermarkPosition === 'center'
                          ? '50%'
                          : 'auto',
                    right: storeForm.watermarkPosition.includes('east') ? '20px' : 'auto',
                    transform:
                      storeForm.watermarkPosition === 'center'
                        ? 'translate(-50%, -50%)'
                        : 'none',
                  }}
                >
                  {storeForm.watermarkText}
                </div>
              )}

              <div className="absolute bottom-2 right-2 rounded bg-gray-50/80 px-2 py-1 text-[10px] text-muted dark:bg-slate-950/80">
                معاينة تجريبية
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            <Button onClick={handleSaveStore} loading={saving} icon={<Save className="h-4 w-4" />}>
              حفظ إعدادات المتجر والعلامة المائية
            </Button>
            <button
              onClick={handleApplyWatermarkToAll}
              disabled={applyingWatermark || !storeForm.watermarkEnabled}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold text-white shadow transition-all active:scale-95"
            >
              {applyingWatermark ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> جاري التطبيق...</>
              ) : (
                <>🖼️ تطبيق على الصور الموجودة</>
              )}
            </button>
          </div>
          {applyResult && (
            <p className="mt-3 text-sm text-teal-700 dark:text-teal-300 font-medium text-left">
              ✅ تم معالجة {applyResult.processed} صورة من {applyResult.totalProducts} منتج
              {applyResult.skippedLegacy > 0 && ` (${applyResult.skippedLegacy} صورة قديمة تحتاج إعادة رفع)`}
              {applyResult.failed > 0 && ` (${applyResult.failed} فشلت)`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
