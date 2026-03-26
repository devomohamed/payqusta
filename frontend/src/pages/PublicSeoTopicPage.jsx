import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  CreditCard,
  MonitorSmartphone,
  MousePointerClick,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { findSeoLandingPage } from '../publicSite/seoLandingPages';
import { api } from '../store';
import { Badge, LoadingSpinner } from '../components/UI';

const FEATURE_LABELS = {
  advanced_reports: t('public_seo_topic_page.ui.k4y6azi'),
  pos: t('public_seo_topic_page.ui.klui6u2'),
  whatsapp_notifications: t('public_seo_topic_page.ui.k3my6q1'),
  multi_branch: t('public_seo_topic_page.ui.knvzntz'),
  api_access: t('public_seo_topic_page.ui.kzag26a'),
  barcode_scanner: t('public_seo_topic_page.ui.k3lo8g6'),
  loyalty_program: t('public_seo_topic_page.ui.k4vd6dg'),
  customer_portal: t('public_seo_topic_page.ui.kc6rpj0'),
  inventory_management: t('public_seo_topic_page.ui.kpv48uy'),
};

const PLAN_LIMIT_LABELS = [
  { key: 'maxBranches', label: t('public_seo_topic_page.ui.kaaztz6') },
  { key: 'maxUsers', label: t('public_seo_topic_page.ui.kdirwj') },
  { key: 'maxProducts', label: t('public_seo_topic_page.ui.ks0nri5') },
  { key: 'maxCustomers', label: t('public_seo_topic_page.ui.kzgg8kr') },
];

const DEMO_STEPS = [
  {
    title: t('public_seo_topic_page.ui.k7kq8p'),
    description: t('public_seo_topic_page.ui.kfnd56n'),
    to: '/sales-management',
    icon: Receipt,
  },
  {
    title: t('public_seo_topic_page.ui.khu5g1q'),
    description: t('public_seo_topic_page.ui.ktdmvaz'),
    to: '/inventory-management',
    icon: Boxes,
  },
  {
    title: t('public_seo_topic_page.ui.k2sn3pc'),
    description: t('public_seo_topic_page.ui.k5hm7x3'),
    to: '/ecommerce-platform',
    icon: MonitorSmartphone,
  },
  {
    title: t('public_seo_topic_page.ui.kiphvsq'),
    description: t('public_seo_topic_page.ui.kiho4bo'),
    to: '/pricing',
    icon: CreditCard,
  },
];

const DEMO_CHECKLIST = [
  t('public_seo_topic_page.ui.kiwsuum'),
  t('public_seo_topic_page.ui.kzqqzk'),
  t('public_seo_topic_page.ui.k9r5cu5'),
  t('public_seo_topic_page.ui.kedgz8u'),
];

function formatPrice(value, currency = 'EGP') {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('ar-EG').format(amount) + ' ' + currency;
}

function getFeatureLabel(feature) {
  return FEATURE_LABELS[feature] || String(feature || '').replace(/_/g, ' ');
}

function getPlanFeatures(plan) {
  if (!Array.isArray(plan?.features)) return [];
  return plan.features.filter(Boolean).slice(0, 6);
}

function getPlanLimitValue(value) {
  if (value === -1) return t('public_seo_topic_page.ui.ksz808h');
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function PricingSection({ plans, loading, error }) {
  const activePlans = useMemo(
    () => (Array.isArray(plans) ? plans.filter((plan) => plan?.isActive !== false) : []).sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0)),
    [plans],
  );

  return (
    <section className="app-surface mt-10 rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col gap-4 text-right lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.ke89o3t')}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.krw3lsn')}</h2>
          <p className="app-text-soft mt-3 max-w-3xl text-base leading-8">
            {t('public_seo_topic_page.ui.kvy2n2g')}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to="/demo"
            className="app-surface-muted rounded-full px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
          >
            {t('public_seo_topic_page.ui.kyg01pv')}
          </Link>
          <Link
            to="/login?mode=register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
          >
            {t('public_seo_topic_page.ui.kkvj629')}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingSpinner text="جاري تحميل الباقات الفعلية..." />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-right text-sm font-bold leading-7 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          {error}
        </div>
      ) : activePlans.length === 0 ? (
        <div className="app-surface-muted mt-8 rounded-[1.75rem] p-5 text-right text-sm font-bold leading-7 text-slate-700 dark:text-slate-100">
          {t('public_seo_topic_page.ui.kdqojf')}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 xl:grid-cols-4 md:grid-cols-2">
          {activePlans.map((plan, index) => {
            const features = getPlanFeatures(plan);
            const isPopular = Boolean(plan?.isPopular) || index === 1;
            const price = Number(plan?.price || 0);
            return (
              <article
                key={plan?._id || plan?.name || index}
                className={`flex h-full flex-col rounded-[1.75rem] border p-6 text-right shadow-sm transition-transform hover:-translate-y-1 ${isPopular
                  ? 'border-emerald-300 bg-emerald-50/60 shadow-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:shadow-none'
                  : 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left">
                    {isPopular && <Badge variant="success">{t('public_seo_topic_page.ui.keykkps')}</Badge>}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">{plan?.name || t('public_seo_topic_page.toasts.ksvuqu')}</h3>
                    <p className="app-text-soft mt-2 text-sm leading-7">{plan?.description || t('public_seo_topic_page.toasts.kxyn7vm')}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <p className="text-sm font-bold text-white/70">{t('public_seo_topic_page.ui.kovdxm6')}</p>
                  <p className="mt-2 text-3xl font-black">
                    {price <= 0 ? t('public_seo_topic_page.ui.k3iplky') : formatPrice(price, plan?.currency || 'EGP')}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    {price <= 0 ? t('public_seo_topic_page.ui.kv8sa6r') : `لكل ${plan?.billingCycle === 'yearly' ? t('public_seo_topic_page.ui.kxseu') : 'شهر'}`}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {PLAN_LIMIT_LABELS.map((limit) => (
                    <div key={limit.key} className="app-surface-muted rounded-2xl px-4 py-3">
                      <p className="app-text-muted text-xs font-black uppercase tracking-[0.14em]">{limit.label}</p>
                      <p className="mt-2 text-sm font-black text-slate-800 dark:text-white">{getPlanLimitValue(plan?.limits?.[limit.key])}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex-1">
                  <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.k2ez85t')}</p>
                  <div className="mt-3 grid gap-3">
                    {features.length > 0 ? features.map((feature) => (
                      <div key={feature} className="flex items-start justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                        <span>{getFeatureLabel(feature)}</span>
                        <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                        {t('public_seo_topic_page.ui.kg5fem2')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Link
                    to={`/login?mode=register${plan?._id ? `&plan=${plan._id}` : ''}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
                  >
                    {t('public_seo_topic_page.ui.knevvdu')}
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/demo"
                    className="app-surface-muted rounded-full px-5 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
                  >
                    {t('public_seo_topic_page.ui.k5uekyo')}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DemoSection() {
  return (
    <>
      <section className="app-surface mt-10 rounded-[2rem] p-6 sm:p-8">
        <div className="text-right">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.kw16372')}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.k9cw68b')}</h2>
          <p className="app-text-soft mt-3 max-w-3xl text-base leading-8">
            إذا أردت تقييم PayQusta بسرعة، امشِ في هذا التسلسل. بهذه الطريقة ستعرف هل المنصة تناسب طريقتك في العمل فعلًا أم لا.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {DEMO_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                to={step.to}
                className="app-surface-muted rounded-[1.75rem] p-5 text-right transition-transform hover:-translate-y-1 hover:bg-white dark:hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="app-text-muted text-xs font-black uppercase tracking-[0.18em]">0{index + 1}</span>
                  <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-lg font-black text-slate-950 dark:text-white">{step.title}</p>
                <p className="app-text-soft mt-3 text-sm leading-7">{step.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="app-surface rounded-[2rem] bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.kig1yk8')}</p>
          <div className="mt-5 grid gap-3">
            {DEMO_CHECKLIST.map((item) => (
              <div key={item} className="flex items-start justify-end gap-3 rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                <span>{item}</span>
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            {t('public_seo_topic_page.ui.kh4lpk7')}
          </div>
          <h2 className="mt-5 text-3xl font-black leading-tight">{t('public_seo_topic_page.ui.k821hzf')}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            الهدف من هذه الصفحة أن تختصر التشتت: افهم البيع، راجع المخزون، شاهد تجربة العميل، ثم اختر الباقة المناسبة وابدأ على بيانات نشاطك.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/pricing"
              className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/10"
            >
              {t('public_seo_topic_page.ui.kr550tn')}
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              {t('public_seo_topic_page.ui.kwfqrce')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PublicSeoTopicPage() {
  const { t } = useTranslation('admin');
  const location = useLocation();
  const page = findSeoLandingPage(location.pathname);
  const isPricingPage = location.pathname === '/pricing';
  const isDemoPage = location.pathname === '/demo';
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    if (!isPricingPage) return undefined;

    let cancelled = false;

    const loadPlans = async () => {
      setPlansLoading(true);
      setPlansError('');
      try {
        const response = await api.get('/plans');
        if (cancelled) return;
        setPlans(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (error) {
        if (cancelled) return;
        setPlansError(t('public_seo_topic_page.ui.kh1je09'));
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, [isPricingPage]);

  if (!page) {
    return null;
  }

  const Icon = page.icon;
  const relatedPages = (page.relatedPaths || []).map((path) => findSeoLandingPage(path)).filter(Boolean);
  const secondaryCtaLink = isPricingPage ? '/demo' : '/pricing';
  const secondaryCtaLabel = isPricingPage ? t('public_seo_topic_page.ui.k5uekyo') : t('public_seo_topic_page.ui.kr550tn');

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{page.heroTitle}</h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">{page.heroLead}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">{page.heroDescription}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
            >
              {t('public_seo_topic_page.ui.khqnfld')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              to={secondaryCtaLink}
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              {secondaryCtaLabel}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white">
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">{t('public_seo_topic_page.ui.kcce1ze')}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">{t('public_seo_topic_page.ui.ks0dpa')}</h2>
          <div className="mt-5 grid gap-3">
            {page.proofPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-bold leading-7 text-white/90">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="text-right">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.k5ad8nn')}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.k8eqqbv')}</h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {page.realCases.map((item) => (
            <article key={item.title} className="app-surface rounded-[1.75rem] p-6 text-right">
              <p className="text-lg font-black text-slate-950 dark:text-white">{item.title}</p>
              <p className="app-text-soft mt-4 text-sm leading-7">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="app-surface mt-10 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.k6azaft')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.k43sl4g')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              هذه القدرات مرتبطة بما يحتاجه النشاط فعليًا أثناء العمل: سرعة، وضوح، ومتابعة يمكن الاعتماد عليها يومًا بعد يوم.
            </p>
            <div className="mt-6 grid gap-3">
              {page.capabilities.map((item) => (
                <div key={item} className="rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.kzfr4q8')}</p>
            <div className="mt-4 grid gap-3">
              {page.outcomes.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isPricingPage && <PricingSection plans={plans} loading={plansLoading} error={plansError} />}
      {isDemoPage && <DemoSection />}

      <section className="mt-10">
        <div className="text-right">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.kj7o4xp')}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.kpa2gpt')}</h2>
        </div>

        <div className="mt-6 grid gap-4">
          {page.faqs.map((faq) => (
            <article key={faq.question} className="app-surface rounded-[1.75rem] p-6 text-right">
              <h3 className="text-xl font-black text-slate-950 dark:text-white">{faq.question}</h3>
              <p className="app-text-soft mt-3 text-sm leading-7">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="app-surface mt-10 rounded-[2rem] p-6 text-right sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="order-2 sm:order-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/pricing"
                className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
              >
                {t('public_seo_topic_page.ui.kr550tn')}
              </Link>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
              >
                {t('public_seo_topic_page.ui.kl6w4j0')}
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="order-1 sm:order-2">
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_seo_topic_page.ui.kh4xhig')}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.kt42glr')}</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {relatedPages.map((related) => {
            const RelatedIcon = related.icon;
            return (
              <Link
                key={related.path}
                to={related.path}
                className="app-surface-muted rounded-[1.5rem] p-5 text-right transition-transform hover:-translate-y-1 hover:bg-white dark:hover:bg-white/10"
              >
                <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                  <RelatedIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-black text-slate-950 dark:text-white">{related.heroTitle}</p>
                <p className="app-text-soft mt-2 text-sm leading-7">{related.heroLead}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-6 text-right dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:p-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">{t('public_seo_topic_page.ui.kzekuq0')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_seo_topic_page.ui.kpc9alp')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              إذا كانت طريقة العمل هنا قريبة من احتياجك، فالخطوة التالية هي مشاهدة الديمو أو بدء الحساب لتقييم المنصة على بياناتك أنت.
            </p>
          </div>
          <div className="grid gap-3">
            {page.proofPoints.slice(0, 2).map((point) => (
              <div key={point} className="flex items-start justify-end gap-3 rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                <span>{point}</span>
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

