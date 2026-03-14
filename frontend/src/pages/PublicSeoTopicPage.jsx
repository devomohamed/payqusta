import React, { useEffect, useMemo, useState } from 'react';
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
  advanced_reports: 'تقارير متقدمة ومؤشرات تشغيل',
  pos: 'نظام نقطة بيع وكاشير',
  whatsapp_notifications: 'إشعارات وفواتير عبر واتساب',
  multi_branch: 'إدارة أكثر من فرع',
  api_access: 'تكاملات وربط API',
  barcode_scanner: 'باركود وماسح ضوئي',
  loyalty_program: 'نقاط وولاء للعملاء',
  customer_portal: 'بوابة عملاء بعد الشراء',
  inventory_management: 'إدارة مخزون متقدمة',
};

const PLAN_LIMIT_LABELS = [
  { key: 'maxBranches', label: 'الفروع' },
  { key: 'maxUsers', label: 'المستخدمون' },
  { key: 'maxProducts', label: 'المنتجات' },
  { key: 'maxCustomers', label: 'العملاء' },
];

const DEMO_STEPS = [
  {
    title: 'ابدأ من البيع والفاتورة',
    description: 'راجع كيف تتحرك الفاتورة والمدفوع والمتبقي بدل أن تكون شاشة البيع منفصلة عن المتابعة.',
    to: '/sales-management',
    icon: Receipt,
  },
  {
    title: 'راجع تأثير البيع على المخزون',
    description: 'افهم كيف ترتبط الكميات، التنبيهات، والمنتجات بالحركة اليومية داخل النشاط.',
    to: '/inventory-management',
    icon: Boxes,
  },
  {
    title: 'شاهد المتجر والطلب والتتبع',
    description: 'انتقل من الواجهة العامة إلى الطلب والتتبع لتقييم التجربة من منظور العميل.',
    to: '/ecommerce-platform',
    icon: MonitorSmartphone,
  },
  {
    title: 'اختم القرار بمراجعة الباقات',
    description: 'بعد فهم القيمة العملية، ارجع إلى صفحة الأسعار لاختيار الباقة الأنسب لمرحلتك.',
    to: '/pricing',
    icon: CreditCard,
  },
];

const DEMO_CHECKLIST = [
  'هل يمكن للفريق إصدار فاتورة ومتابعة المدفوع من نفس المسار؟',
  'هل المخزون يتأثر تلقائيًا بالحركة بدل المعالجة اليدوية لاحقًا؟',
  'هل المتجر العام والطلب والتتبع واضحان للعميل على الموبايل؟',
  'هل الباقة التي ستختارها تغطي حجم المنتجات والعملاء والفروع لديك؟',
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
  if (value === -1) return 'غير محدود';
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function PricingSection({ plans, loading, error }) {
  const activePlans = useMemo(
    () => (Array.isArray(plans) ? plans.filter((plan) => plan?.isActive !== false) : []).sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0)),
    [plans],
  );

  return (
    <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 text-right lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">الباقات الفعلية</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">اختر الباقة بناءً على حجم التشغيل لا على اسمها فقط</h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            هذه الباقات تُسحب من النظام نفسه حتى تكون الصفحة العامة مرتبطة بما سيجده العميل فعليًا بعد التسجيل.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to="/demo"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
          >
            راجع الديمو أولًا
          </Link>
          <Link
            to="/login?mode=register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
          >
            ابدأ الحساب
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingSpinner text="جاري تحميل الباقات الفعلية..." />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-right text-sm font-bold leading-7 text-amber-900">
          {error}
        </div>
      ) : activePlans.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-right text-sm font-bold leading-7 text-slate-700">
          لا توجد باقات منشورة حاليًا. يمكنك متابعة الديمو ثم إنشاء الحساب للتجربة الأولية.
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
                  ? 'border-emerald-300 bg-emerald-50/60 shadow-emerald-100'
                  : 'border-slate-200 bg-white'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left">
                    {isPopular && <Badge variant="success">الأكثر شيوعًا</Badge>}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">{plan?.name || 'باقة'}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{plan?.description || 'باقة تشغيل جاهزة للنشاط التجاري.'}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <p className="text-sm font-bold text-white/70">السعر</p>
                  <p className="mt-2 text-3xl font-black">
                    {price <= 0 ? 'مجانًا' : formatPrice(price, plan?.currency || 'EGP')}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    {price <= 0 ? 'للبداية والتجربة الأولية' : `لكل ${plan?.billingCycle === 'yearly' ? 'سنة' : 'شهر'}`}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {PLAN_LIMIT_LABELS.map((limit) => (
                    <div key={limit.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{limit.label}</p>
                      <p className="mt-2 text-sm font-black text-slate-800">{getPlanLimitValue(plan?.limits?.[limit.key])}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">أبرز ما داخل الباقة</p>
                  <div className="mt-3 grid gap-3">
                    {features.length > 0 ? features.map((feature) => (
                      <div key={feature} className="flex items-start justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700">
                        <span>{getFeatureLabel(feature)}</span>
                        <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700">
                        الباقة تشمل التجهيز الأساسي للتشغيل ويمكن توسيعها بحسب الخطة المعتمدة داخل المنصة.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Link
                    to={`/login?mode=register${plan?._id ? `&plan=${plan._id}` : ''}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
                  >
                    ابدأ بهذه الباقة
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/demo"
                    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
                  >
                    شاهد الديمو
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
      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">مسار تجربة واضح</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">جرّب المنصة كقرار تجاري لا كعرض واجهات فقط</h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
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
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-right transition-transform hover:-translate-y-1 hover:border-emerald-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">0{index + 1}</span>
                  <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-lg font-black text-slate-950">{step.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 text-right shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">ما الذي يجب أن تراه أثناء التقييم؟</p>
          <div className="mt-5 grid gap-3">
            {DEMO_CHECKLIST.map((item) => (
              <div key={item} className="flex items-start justify-end gap-3 rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
                <span>{item}</span>
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            نتيجة التقييم الجيد
          </div>
          <h2 className="mt-5 text-3xl font-black leading-tight">إذا اقتنعت خلال 15 إلى 20 دقيقة، انتقل مباشرة إلى الحساب والباقات</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            الهدف من هذه الصفحة أن تختصر التشتت: افهم البيع، راجع المخزون، شاهد تجربة العميل، ثم اختر الباقة المناسبة وابدأ على بيانات نشاطك.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/pricing"
              className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/10"
            >
              الأسعار والباقات
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              ابدأ الحساب الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PublicSeoTopicPage() {
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
        setPlansError('تعذر تحميل الباقات الآن. يمكنك متابعة الديمو أو إنشاء الحساب، ثم مراجعة الباقة من داخل المنصة.');
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
  const secondaryCtaLabel = isPricingPage ? 'شاهد الديمو' : 'الأسعار والباقات';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{page.heroTitle}</h1>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">{page.heroLead}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">{page.heroDescription}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
            >
              ابدأ حسابك
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              to={secondaryCtaLink}
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
            >
              {secondaryCtaLabel}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white">
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">كيف تظهر القيمة في التشغيل اليومي؟</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">كيف يظهر الأثر في يوم العمل؟</h2>
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
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">أمثلة من الاستخدام اليومي</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">مشاهد عملية يفهم منها العميل كيف تخدمه المنصة</h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {page.realCases.map((item) => (
            <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-right shadow-sm">
              <p className="text-lg font-black text-slate-950">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-right shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">ما الذي ستجده داخل المنصة؟</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">قدرات واضحة مرتبطة بنتيجة عملية</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              هذه القدرات مرتبطة بما يحتاجه النشاط فعليًا أثناء العمل: سرعة، وضوح، ومتابعة يمكن الاعتماد عليها يومًا بعد يوم.
            </p>
            <div className="mt-6 grid gap-3">
              {page.capabilities.map((item) => (
                <div key={item} className="rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">لماذا يختارها أصحاب الأنشطة؟</p>
            <div className="mt-4 grid gap-3">
              {page.outcomes.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
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
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">أسئلة قبل القرار</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">إجابات مباشرة تساعد الزائر على فهم المنصة بسرعة</h2>
        </div>

        <div className="mt-6 grid gap-4">
          {page.faqs.map((faq) => (
            <article key={faq.question} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-right shadow-sm">
              <h3 className="text-xl font-black text-slate-950">{faq.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="order-2 sm:order-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/pricing"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
              >
                الأسعار والباقات
              </Link>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
              >
                ابدأ الآن
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="order-1 sm:order-2">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">صفحات مرتبطة</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">إذا كان هذا الجزء هو الأقرب لاحتياجك، فهذه المسارات تكمل الصورة</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {relatedPages.map((related) => {
            const RelatedIcon = related.icon;
            return (
              <Link
                key={related.path}
                to={related.path}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-right transition-transform hover:-translate-y-1 hover:border-emerald-200 hover:bg-white"
              >
                <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                  <RelatedIcon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-black text-slate-950">{related.heroTitle}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{related.heroLead}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-6 text-right sm:p-8">
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">الخلاصة</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">خلاصة واضحة قبل مشاهدة الديمو أو بدء الحساب</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              إذا كانت طريقة العمل هنا قريبة من احتياجك، فالخطوة التالية هي مشاهدة الديمو أو بدء الحساب لتقييم المنصة على بياناتك أنت.
            </p>
          </div>
          <div className="grid gap-3">
            {page.proofPoints.slice(0, 2).map((point) => (
              <div key={point} className="flex items-start justify-end gap-3 rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
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

