import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Globe2,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { api, backupApi, productsApi, settingsApi, useAuthStore } from '../store';
import { notify } from '../components/AnimatedNotification';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner } from '../components/UI';
import { getStorefrontDomainUrl } from '../utils/storefrontHost';

function formatDateTime(value) {
  if (!value) return 'لم يتم بعد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'لم يتم بعد';
  return date.toLocaleString('ar-EG');
}

function buildEvidenceList(items = []) {
  return items.filter(Boolean);
}

function normalizeSubdomain(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function WizardStepItem({ step, isActive, onClick, index }) {
  const Icon = step.icon;
  const stateClass = step.complete
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
    : isActive
      ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200'
      : 'border-[color:var(--surface-border)] app-surface-muted app-text-soft';

  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border px-4 py-4 text-right transition-all ${stateClass}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70 dark:bg-black/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gray">الخطوة {index}</Badge>
            {step.complete ? <Badge variant="success">مكتملة</Badge> : isActive ? <Badge>الحالية</Badge> : null}
          </div>
          <p className="mt-3 text-sm font-black">{step.title}</p>
          <p className="mt-1 text-xs leading-6 opacity-80">{step.shortText}</p>
        </div>
      </div>
    </button>
  );
}

function EvidenceList({ items }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] px-4 py-4 text-sm app-text-muted">
        لم يتم تسجيل مؤشرات كافية لهذه الخطوة بعد.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4 text-sm app-text-body">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span className="leading-7">{item}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepFrame({ icon: Icon, stepNumber, title, description, children }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] app-text-muted">الخطوة {stepNumber}</p>
          <h2 className="mt-1 text-2xl font-black app-text-strong">{title}</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 app-text-muted">{description}</p>
      <div className="mt-6 space-y-6">{children}</div>
    </>
  );
}

export default function OnboardingPage() {
  const { user, tenant, getMe } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [activeStepId, setActiveStepId] = useState('store-profile');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [brandingForm, setBrandingForm] = useState({ primaryColor: '#6366f1', secondaryColor: '#10b981', customDomain: '' });
  const [subdomainDraft, setSubdomainDraft] = useState('');
  const [subdomainAvailability, setSubdomainAvailability] = useState({ available: null, message: '', checking: false });
  const [keepLastDraft, setKeepLastDraft] = useState('14');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const canManageOnboarding = user?.role === 'admin' || user?.role === 'vendor' || !!user?.isSuperAdmin;
  const storefrontUrl = getStorefrontDomainUrl(tenant?.slug);

  const loadSnapshot = async () => {
    const settled = await Promise.allSettled([
      settingsApi.get(),
      backupApi.getStats(),
      backupApi.getAutoSettings(),
      productsApi.getAll({ page: 1, limit: 1 }),
      tenant?._id ? api.get('/storefront/settings', { params: { tenant: tenant._id } }) : Promise.resolve(null),
    ]);

    const [settingsResult, backupStatsResult, autoBackupResult, productsResult, storefrontResult] = settled;
    const nextSnapshot = {
      settings: settingsResult.status === 'fulfilled' ? settingsResult.value?.data?.data : null,
      backupStats: backupStatsResult.status === 'fulfilled' ? backupStatsResult.value?.data?.data : null,
      autoBackup: autoBackupResult.status === 'fulfilled' ? autoBackupResult.value?.data?.data : null,
      productPage: productsResult.status === 'fulfilled' ? productsResult.value?.data : null,
      storefrontOk:
        storefrontResult.status === 'fulfilled' &&
        storefrontResult.value?.status === 200 &&
        storefrontResult.value?.data?.success !== false,
    };

    setSnapshot(nextSnapshot);

    const settingsTenant = nextSnapshot.settings?.tenant || {};
    const store = settingsTenant.businessInfo || {};
    const branding = settingsTenant.branding || {};
    setProfileForm({
      name: settingsTenant.name || '',
      email: store.email || '',
      phone: store.phone || '',
      address: store.address || '',
    });
    setBrandingForm({
      primaryColor: branding.primaryColor || '#6366f1',
      secondaryColor: branding.secondaryColor || '#10b981',
      customDomain: settingsTenant.customDomain || '',
    });
    setSubdomainDraft(settingsTenant.slug || '');
    setConsentChecked(Boolean(nextSnapshot.autoBackup?.enabled || nextSnapshot.autoBackup?.consentAcceptedAt));
    setKeepLastDraft(String(nextSnapshot.autoBackup?.retentionPolicy?.keepLast || 14));
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!tenant?._id) {
        setLoading(false);
        return;
      }
      try {
        await loadSnapshot();
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [tenant?._id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSnapshot();
      await getMe();
    } finally {
      setRefreshing(false);
    }
  };

  const derived = useMemo(() => {
    const settingsTenant = snapshot?.settings?.tenant || {};
    const store = settingsTenant.businessInfo || {};
    const branding = settingsTenant.branding || {};
    const backupStats = snapshot?.backupStats || {};
    const autoBackup = snapshot?.autoBackup || {};
    const products = Array.isArray(snapshot?.productPage?.data) ? snapshot.productPage.data : [];

    const profileComplete = Boolean(settingsTenant.name?.trim() && (store.phone?.trim() || store.email?.trim()) && store.address?.trim());
    const brandingComplete = Boolean(settingsTenant.slug?.trim() && branding.primaryColor && branding.secondaryColor);
    const catalogCount = Number(backupStats.products || products.length || 0);
    const catalogComplete = catalogCount > 0;
    const branchesCount = Number(backupStats.branches || 0);
    const usersCount = Number(backupStats.users || 0);
    const rolesCount = Number(backupStats.roles || 0);
    const operationsComplete = branchesCount > 0 && usersCount > 0 && rolesCount > 0;
    const backupComplete = Boolean(backupStats.lastBackup) || Boolean(autoBackup.enabled);
    const storefrontComplete = Boolean(snapshot?.storefrontOk && settingsTenant.slug);

    const steps = [
      { id: 'store-profile', icon: Building2, title: 'بيانات المتجر', shortText: 'الاسم، التواصل، والعنوان.', complete: profileComplete, evidence: buildEvidenceList([settingsTenant.name ? `الاسم: ${settingsTenant.name}` : null, store.phone ? `الهاتف: ${store.phone}` : null, store.email ? `البريد: ${store.email}` : null, store.address ? 'العنوان محفوظ' : null]) },
      { id: 'branding-domain', icon: Palette, title: 'الهوية والرابط', shortText: 'الألوان، الرابط، والدومين.', complete: brandingComplete, evidence: buildEvidenceList([settingsTenant.slug ? `الرابط: ${settingsTenant.slug}` : null, branding.primaryColor ? `اللون الأساسي: ${branding.primaryColor}` : null, branding.secondaryColor ? `اللون الثانوي: ${branding.secondaryColor}` : null, settingsTenant.customDomain ? `الدومين المخصص: ${settingsTenant.customDomain}` : null]) },
      { id: 'backup', icon: ShieldCheck, title: 'الحماية والنسخ', shortText: 'نسخة أولى أو نسخ تلقائي.', complete: backupComplete, evidence: buildEvidenceList([autoBackup.enabled ? `النسخ التلقائي: ${autoBackup.status || 'مفعل'}` : 'النسخ التلقائي غير مفعل', backupStats.lastBackup ? `آخر نسخة: ${formatDateTime(backupStats.lastBackup)}` : 'لا توجد نسخة مسجلة بعد']) },
      { id: 'catalog', icon: Package, title: 'المنتجات', shortText: 'إضافة أو استيراد الكتالوج.', complete: catalogComplete, evidence: buildEvidenceList([`عدد المنتجات: ${catalogCount.toLocaleString('ar-EG')}`, products[0]?.name ? `أول منتج: ${products[0].name}` : null]) },
      { id: 'operations', icon: Users, title: 'الفريق والفروع', shortText: 'المستخدمون، الأدوار، والفروع.', complete: operationsComplete, evidence: buildEvidenceList([`المستخدمون: ${usersCount.toLocaleString('ar-EG')}`, `الأدوار: ${rolesCount.toLocaleString('ar-EG')}`, `الفروع: ${branchesCount.toLocaleString('ar-EG')}`]) },
      { id: 'launch', icon: Globe2, title: 'الإطلاق والتجربة', shortText: 'فحص المتجر العام والروابط.', complete: storefrontComplete, evidence: buildEvidenceList([snapshot?.storefrontOk ? 'إعدادات المتجر العام تستجيب بنجاح' : 'فحص المتجر العام لم يكتمل بعد', storefrontUrl || null]) },
    ];

    return {
      settingsTenant,
      branding,
      autoBackup,
      backupStats,
      products,
      steps,
      completedSteps: steps.filter((step) => step.complete).length,
      progress: Math.round((steps.filter((step) => step.complete).length / steps.length) * 100),
      firstIncomplete: steps.find((step) => !step.complete)?.id || steps[0].id,
      planName: settingsTenant.subscription?.planName || settingsTenant.subscription?.plan || 'الخطة الحالية',
    };
  }, [snapshot, storefrontUrl]);

  useEffect(() => {
    if (!activeStepId) setActiveStepId(derived.firstIncomplete);
  }, [activeStepId, derived.firstIncomplete]);

  const currentStepIndex = Math.max(0, derived.steps.findIndex((step) => step.id === activeStepId));
  const currentStep = derived.steps[currentStepIndex] || derived.steps[0];

  const checkSubdomainAvailability = async (rawValue) => {
    const normalized = normalizeSubdomain(rawValue);
    setSubdomainDraft(normalized);

    if (!normalized || normalized.length < 3) {
      setSubdomainAvailability({ available: null, message: 'أدخل 3 أحرف على الأقل.', checking: false });
      return;
    }

    if (normalized === derived.settingsTenant.slug) {
      setSubdomainAvailability({ available: true, message: 'هذا هو الرابط الحالي لمتجرك.', checking: false });
      return;
    }

    setSubdomainAvailability((prev) => ({ ...prev, checking: true }));
    try {
      const res = await api.get(`/settings/subdomain-availability?value=${encodeURIComponent(normalized)}`);
      const available = Boolean(res.data?.data?.available);
      setSubdomainAvailability({
        available,
        checking: false,
        message: available ? 'الرابط متاح ويمكن استخدامه.' : 'هذا الرابط محجوز لمتجر آخر.',
      });
    } catch (error) {
      setSubdomainAvailability({
        available: false,
        checking: false,
        message: error?.response?.data?.message || 'تعذر التحقق من توفر الرابط.',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      notify.error('اسم المتجر مطلوب.');
      return;
    }
    setSavingProfile(true);
    try {
      await settingsApi.updateStore({
        name: profileForm.name,
        businessInfo: {
          email: profileForm.email,
          phone: profileForm.phone,
          address: profileForm.address,
        },
      });
      notify.success('تم حفظ بيانات المتجر.');
      await handleRefresh();
    } catch (error) {
      notify.error(error?.response?.data?.message || 'تعذر حفظ بيانات المتجر.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBranding = async () => {
    if (subdomainDraft.trim().length < 3) {
      notify.error('الرابط المختصر يجب أن يحتوي على 3 أحرف على الأقل.');
      return;
    }

    setSavingBranding(true);
    try {
      if (subdomainDraft !== derived.settingsTenant.slug) {
        await api.put('/settings/subdomain', { subdomain: subdomainDraft });
      }

      await settingsApi.updateBranding({
        primaryColor: brandingForm.primaryColor,
        secondaryColor: brandingForm.secondaryColor,
        logo: derived.branding.logo,
        darkMode: Boolean(derived.branding.darkMode),
        customDomain: brandingForm.customDomain.trim() || '',
      });

      notify.success('تم حفظ الهوية والرابط.');
      await handleRefresh();
    } catch (error) {
      notify.error(error?.response?.data?.message || 'تعذر حفظ إعدادات الهوية والرابط.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSaveBackup = async (enabled = true) => {
    const keepLast = Math.min(90, Math.max(1, Number(keepLastDraft || 14)));
    if (enabled && !consentChecked) {
      notify.error('فعّل الموافقة أولًا قبل تشغيل النسخ التلقائي.');
      return;
    }
    setSavingBackup(true);
    try {
      await backupApi.updateAutoSettings({
        enabled,
        retentionPolicy: { keepLast },
      });
      notify.success('تم حفظ إعدادات النسخ الاحتياطي.');
      await handleRefresh();
    } catch (error) {
      notify.error(error?.response?.data?.message || 'تعذر حفظ إعدادات النسخ الاحتياطي.');
    } finally {
      setSavingBackup(false);
    }
  };

  const goNext = () => {
    if (currentStepIndex < derived.steps.length - 1) {
      setActiveStepId(derived.steps[currentStepIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setActiveStepId(derived.steps[currentStepIndex - 1].id);
    }
  };

  if (!canManageOnboarding) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="هذه الصفحة مخصصة لمالك المتجر أو المدير"
        description="يمكنك الرجوع إلى لوحة التحكم أو التواصل مع المسؤول الإداري لإكمال الإعداد الأولي."
        action={{ label: 'العودة إلى اللوحة', onClick: () => window.history.back(), variant: 'outline' }}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="جاري تجهيز معالج الإعداد الأولي..." />;
  }

  if (!snapshot) {
    return (
      <EmptyState
        icon={Sparkles}
        title="تعذر تحميل بيانات الإعداد الأولي"
        description="أعد المحاولة بعد لحظات. إذا استمرت المشكلة فراجع الاتصال أو صلاحيات الحساب."
        action={{ label: 'إعادة المحاولة', onClick: handleRefresh }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 px-6 py-7 text-white">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
                <Store className="h-3.5 w-3.5" />
                معالج الإعداد الأولي
              </div>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">ابدأ تشغيل متجرك بخطوات واضحة</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                أكمل أهم الإعدادات من هنا خطوة بخطوة، ثم انتقل إلى الصفحات التشغيلية عند الحاجة بدل التنقل العشوائي بين
                الشاشات المختلفة.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">نسبة الجاهزية</p>
                <p className="mt-2 text-3xl font-black">{derived.progress}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">الخطوات المكتملة</p>
                <p className="mt-2 text-3xl font-black">
                  {derived.completedSteps}/{derived.steps.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">الخطة الحالية</p>
                <p className="mt-2 text-lg font-black">{derived.planName}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-white to-emerald-300 transition-all duration-500" style={{ width: `${derived.progress}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {derived.steps.map((step, index) => (
            <WizardStepItem key={step.id} step={step} index={index + 1} isActive={step.id === currentStep?.id} onClick={() => setActiveStepId(step.id)} />
          ))}
        </div>

        <Card className="p-6">
          {currentStep?.id === 'store-profile' ? (
            <StepFrame icon={Building2} stepNumber={1} title="بيانات المتجر الأساسية" description="أدخل الاسم والعنوان ووسيلة تواصل واحدة على الأقل حتى يظهر متجرك بشكل صحيح في الواجهة العامة والفواتير.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="اسم المتجر" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
                <Input label="البريد الإلكتروني" type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
                <Input label="رقم الهاتف" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
                <Input label="العنوان" value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} />
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button loading={savingProfile} onClick={handleSaveProfile}>حفظ والمتابعة</Button>
                <Button variant="outline" onClick={goNext} icon={<ArrowLeft className="h-4 w-4" />}>التالي</Button>
              </div>
            </StepFrame>
          ) : null}

          {currentStep?.id === 'branding-domain' ? (
            <StepFrame icon={Palette} stepNumber={2} title="الهوية والرابط" description="اضبط الرابط والألوان الأساسية من هنا. رفع الشعار والتخصيصات الأوسع يمكن إكمالها لاحقًا من صفحة الإعدادات.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input label="الرابط المختصر للمتجر" value={subdomainDraft} onChange={(e) => checkSubdomainAvailability(e.target.value)} placeholder="my-store" />
                  <p className={`mt-2 text-xs font-semibold ${
                    subdomainAvailability.available === true
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : subdomainAvailability.available === false
                        ? 'text-rose-600 dark:text-rose-300'
                        : 'app-text-muted'
                  }`}>
                    {subdomainAvailability.checking ? 'جاري فحص توفر الرابط...' : subdomainAvailability.message || 'اكتب رابطًا قصيرًا بالأحرف الإنجليزية أو الأرقام.'}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold app-text-soft">اللون الأساسي</label>
                  <input type="color" value={brandingForm.primaryColor} onChange={(e) => setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))} className="h-12 w-full rounded-xl border border-[color:var(--surface-border)] app-surface" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold app-text-soft">اللون الثانوي</label>
                  <input type="color" value={brandingForm.secondaryColor} onChange={(e) => setBrandingForm((prev) => ({ ...prev, secondaryColor: e.target.value }))} className="h-12 w-full rounded-xl border border-[color:var(--surface-border)] app-surface" />
                </div>
                <div className="md:col-span-2">
                  <Input label="دومين مخصص اختياري" value={brandingForm.customDomain} onChange={(e) => setBrandingForm((prev) => ({ ...prev, customDomain: e.target.value }))} placeholder="store.example.com" />
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4 text-sm app-text-muted">
                <p className="font-black app-text-strong">الرابط الحالي</p>
                <p className="mt-2 break-all">{getStorefrontDomainUrl(subdomainDraft || derived.settingsTenant.slug)}</p>
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={goPrev} icon={<ArrowRight className="h-4 w-4" />}>السابق</Button>
                <Button loading={savingBranding} onClick={handleSaveBranding}>حفظ والمتابعة</Button>
                {storefrontUrl ? (
                  <a href={storefrontUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost" icon={<ArrowUpRight className="h-4 w-4" />}>فتح المتجر</Button>
                  </a>
                ) : null}
              </div>
            </StepFrame>
          ) : null}

          {currentStep?.id === 'backup' ? (
            <StepFrame icon={ShieldCheck} stepNumber={3} title="الحماية والنسخ الاحتياطي" description="يمكنك تشغيل النسخ التلقائي مباشرة من هنا. وإذا احتجت تصديرًا أو استعادة يدوية فصفحة النسخ الكاملة ما زالت متاحة.">
              <label className="flex items-start gap-3 text-sm leading-7 app-text-muted">
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span>أوافق على إنشاء نسخ JSON تلقائية لهذا المتجر داخل تخزين المنصة الداخلي.</span>
              </label>
              <div className="max-w-xs">
                <Input type="number" min="1" max="90" label="عدد النسخ المحتفَظ بها" value={keepLastDraft} onChange={(e) => setKeepLastDraft(e.target.value)} />
              </div>
              <div className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4 text-sm app-text-muted">
                <p>الحالة الحالية: <span className="font-black app-text-strong">{derived.autoBackup?.enabled ? 'مفعل' : 'غير مفعل'}</span></p>
                <p className="mt-2">آخر نجاح: <span className="font-black app-text-strong">{formatDateTime(derived.autoBackup?.lastSuccessAt)}</span></p>
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={goPrev} icon={<ArrowRight className="h-4 w-4" />}>السابق</Button>
                <Button loading={savingBackup} onClick={() => handleSaveBackup(true)}>تفعيل وحفظ</Button>
                <Button variant="ghost" onClick={() => handleSaveBackup(false)} loading={savingBackup}>إيقاف</Button>
                <Link to="/backup"><Button variant="outline">فتح شاشة النسخ الكاملة</Button></Link>
              </div>
            </StepFrame>
          ) : null}

          {currentStep?.id === 'catalog' ? (
            <StepFrame icon={Package} stepNumber={4} title="بناء الكتالوج الأول" description="أضف أول منتج أو ابدأ بالاستيراد الجماعي. وجود منتج واحد على الأقل يجعل المتجر صالحًا للعرض والتجربة.">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">عدد المنتجات الحالي</p>
                  <p className="mt-2 text-3xl font-black app-text-strong">{Number(derived.backupStats?.products || derived.products?.length || 0).toLocaleString('ar-EG')}</p>
                </div>
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">أول منتج ظاهر</p>
                  <p className="mt-2 text-sm font-black app-text-strong">{derived.products?.[0]?.name || 'لا يوجد بعد'}</p>
                </div>
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">الحالة</p>
                  <p className="mt-2 text-sm font-black text-emerald-500">{currentStep.complete ? 'جاهز للعرض' : 'يحتاج إضافة أول منتج'}</p>
                </div>
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={goPrev} icon={<ArrowRight className="h-4 w-4" />}>السابق</Button>
                <Link to="/products"><Button>إضافة المنتجات</Button></Link>
                <Button variant="outline" onClick={goNext} icon={<ArrowLeft className="h-4 w-4" />}>التالي</Button>
              </div>
            </StepFrame>
          ) : null}

          {currentStep?.id === 'operations' ? (
            <StepFrame icon={Users} stepNumber={5} title="الفريق والفروع" description="جهز التشغيل الداخلي بإضافة المستخدمين والفروع ومراجعة الأدوار. هذه الخطوة مهمة قبل بدء العمل الفعلي اليومي.">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">المستخدمون</p>
                  <p className="mt-2 text-3xl font-black app-text-strong">{Number(derived.backupStats?.users || 0).toLocaleString('ar-EG')}</p>
                </div>
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">الأدوار</p>
                  <p className="mt-2 text-3xl font-black app-text-strong">{Number(derived.backupStats?.roles || 0).toLocaleString('ar-EG')}</p>
                </div>
                <div className="app-surface-muted rounded-2xl p-4">
                  <p className="text-xs font-bold app-text-muted">الفروع</p>
                  <p className="mt-2 text-3xl font-black app-text-strong">{Number(derived.backupStats?.branches || 0).toLocaleString('ar-EG')}</p>
                </div>
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={goPrev} icon={<ArrowRight className="h-4 w-4" />}>السابق</Button>
                <Link to="/admin/users"><Button>إدارة المستخدمين</Button></Link>
                <Link to="/branches"><Button variant="outline">إدارة الفروع</Button></Link>
                <Button variant="ghost" onClick={goNext} icon={<ArrowLeft className="h-4 w-4" />}>متابعة الإطلاق</Button>
              </div>
            </StepFrame>
          ) : null}

          {currentStep?.id === 'launch' ? (
            <StepFrame icon={Globe2} stepNumber={6} title="مراجعة الإطلاق" description="هذه هي المراجعة النهائية قبل مشاركة الرابط مع العملاء. افحص الرابط العام، ثم حدّث الحالة للتأكد من أن كل شيء يعمل.">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4">
                  <p className="text-xs font-bold app-text-muted">جاهزية المتجر العام</p>
                  <p className="mt-2 text-lg font-black app-text-strong">{snapshot?.storefrontOk ? 'مستجيب بنجاح' : 'ما زال يحتاج مراجعة'}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4">
                  <p className="text-xs font-bold app-text-muted">الرابط النهائي</p>
                  <p className="mt-2 break-all text-sm font-black app-text-strong">{storefrontUrl || 'غير متاح بعد'}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--surface-border)] px-4 py-4">
                  <p className="text-xs font-bold app-text-muted">النتيجة</p>
                  <p className="mt-2 text-lg font-black text-emerald-500">{currentStep.complete ? 'المتجر جاهز للمشاركة' : 'أكمل ما تبقى ثم أعد الفحص'}</p>
                </div>
              </div>

              <EvidenceList items={currentStep.evidence} />

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={goPrev} icon={<ArrowRight className="h-4 w-4" />}>السابق</Button>
                {storefrontUrl ? (
                  <a href={storefrontUrl} target="_blank" rel="noreferrer">
                    <Button icon={<ArrowUpRight className="h-4 w-4" />}>فتح المتجر الآن</Button>
                  </a>
                ) : null}
                <Button variant="ghost" onClick={handleRefresh} loading={refreshing}>تحديث الحالة</Button>
              </div>
            </StepFrame>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
