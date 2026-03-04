import React, { useState, useEffect } from 'react';
import {
  Save,
  Building2,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore, api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';
import { transliterateArabicToEnglish } from '../../utils/textUtils';
import { getUserFriendlyErrorMessage } from '../../utils/errorMapper';

export default function SettingsStore() {
  const { tenant, getMe } = useAuthStore();
  const [storeForm, setStoreForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    watermarkEnabled: false,
    watermarkText: '',
    watermarkPosition: 'southeast',
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
    });
    setSubdomain(tenant.slug || '');
  }, [tenant]);

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
      const { processed, failed, totalProducts } = res.data?.data || {};
      setApplyResult({ processed, failed, totalProducts });
      notify.success(`تم تطبيق العلامة المائية على ${processed} صورة من ${totalProducts} منتج`);
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

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">بيانات المتجر</h2>
            <p className="text-sm text-gray-400">معلومات متجرك الأساسية</p>
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

        <div className="flex justify-end">
          <Button onClick={handleSaveStore} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ بيانات المتجر
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
            <div className="mb-6 rounded-lg border border-indigo-100 bg-white p-4 text-right text-sm text-gray-500 dark:border-indigo-500/30 dark:bg-gray-900 dark:text-gray-400">
              <p className="mb-2 font-bold text-indigo-800 dark:text-indigo-200">
                ما هو رابط المتجر الأساسي؟
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
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
                  .payqusta.store
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
                <span
                  className="inline-block font-semibold text-indigo-600 dark:text-indigo-400"
                  dir="ltr"
                  style={{ direction: 'ltr' }}
                >
                  https://{subdomain}.payqusta.store
                </span>
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
              <div className="mt-6 border-t border-indigo-100 pt-6 dark:border-indigo-500/10">
                <p className="mb-2 text-sm text-gray-500">رابط متجرك النشط حاليًا:</p>
                <a
                  href={`https://${tenant.slug}.payqusta.store`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 font-bold text-indigo-600 hover:underline dark:bg-indigo-500/10 dark:text-indigo-400"
                >
                  <Globe className="h-4 w-4" />
                  {tenant.slug}.payqusta.store
                  <ExternalLink className="h-3 w-3" />
                </a>
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
            <p className="text-sm text-gray-500">
              طبع اسم متجرك بشكل شفاف على صور المنتجات تلقائيًا لحفظ الحقوق
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6 dark:border-teal-500/10 dark:bg-teal-500/5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-teal-100 bg-white p-3 transition-colors hover:border-teal-300 dark:border-teal-800 dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={storeForm.watermarkEnabled}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, watermarkEnabled: e.target.checked })
                  }
                  className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-bold text-gray-800 dark:text-gray-200">
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
                  <label className="text-sm font-medium">موقع العلامة المائية</label>
                  <select
                    value={storeForm.watermarkPosition}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, watermarkPosition: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 transition-colors focus:border-teal-500 focus:ring-0 dark:border-gray-700 dark:bg-gray-900"
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

              <div className="absolute bottom-2 right-2 rounded bg-white/80 px-2 py-1 text-[10px] text-gray-400 dark:bg-gray-900/80">
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
              {applyResult.failed > 0 && ` (${applyResult.failed} فشلت)`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
