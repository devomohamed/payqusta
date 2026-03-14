import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import {
  brandArabicName,
  brandDisplayName,
  featurePillars,
  platformHighlights,
  workflowSteps,
} from '../publicSite/content';
import { seoLandingCards } from '../publicSite/seoLandingPages';

const spotlightCards = [
  {
    icon: BarChart3,
    label: 'تشغيل يومي أوضح',
    text: 'تعرف ما الذي بيع اليوم، وما الذي يحتاج متابعة، وما الذي يستحق تدخلًا أسرع.',
  },
  {
    icon: CreditCard,
    label: 'أقساط وتحصيل',
    text: 'متابعة السداد، المستحقات، والتأخير من نفس النظام بدل الجداول والرسائل المتفرقة.',
  },
  {
    icon: Store,
    label: 'واجهة احترافية للعميل',
    text: 'صفحات واضحة تعرّف العميل بالبراند والمنتجات وتوصله مباشرة إلى الطلب أو التسجيل.',
  },
];

const heroMetrics = [
  { label: 'واجهة العميل', value: 'موقع ومتجر واضحان' },
  { label: 'تشغيل النشاط', value: 'بيع + مخزون + أقساط' },
  { label: 'التوسع', value: 'طلبات ومتابعة من نفس المنصة' },
];

export default function PublicLandingPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.02fr,0.98fr] lg:items-center">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              {brandDisplayName} منصة تشغيل للمتاجر تربط البيع بالمخزون والتحصيل
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {brandDisplayName} يقدم لك
              <span className="block bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_55%,#f59e0b_100%)] bg-clip-text text-transparent">
                تشغيل يومي أوضح + واجهة احترافية + متجر إلكتروني متصل
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {brandDisplayName} لا يقدم شاشة إدارة فقط، بل منظومة كاملة تساعدك على البيع، متابعة المخزون، إدارة الأقساط، واستقبال الطلبات من واجهة يعرف منها العميل من أنت وماذا تقدم.
            </p>

            <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 text-right shadow-sm">
              <p className="text-sm font-black text-slate-900">اسم البراند</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                إذا عرفت المنصة باسم <span className="font-black text-slate-950">PayQusta</span> أو
                <span className="font-black text-slate-950"> {brandArabicName}</span> فأنت تتحدث عن نفس البراند: منصة تساعد المتجر على البيع، المتابعة، والتحصيل مع واجهة احترافية للعميل.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition-transform hover:-translate-y-0.5"
              >
                ابدأ حسابك
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
              >
                استكشف المزايا
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroMetrics.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-white bg-white/90 p-4 text-right shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 top-10 h-28 w-28 rounded-full bg-amber-200/45 blur-3xl" />
            <div className="absolute -left-4 bottom-4 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_32px_90px_rgba(15,23,42,0.20)] sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_32%)]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-300">كيف تبدو التجربة للعميل وللفريق</p>
                    <p className="mt-1 text-2xl font-black">PayQusta Experience</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <ShieldCheck className="h-6 w-6 text-amber-300" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {spotlightCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-right backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-right">
                            <p className="text-base font-black sm:text-lg">{card.label}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{card.text}</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-3">
                            <Icon className="h-5 w-5 text-emerald-300" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[1.75rem] bg-white p-5 text-right text-slate-900">
                  <p className="text-sm font-black text-emerald-700">الفرق الحقيقي</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    العميل يرى واجهة واضحة ومنظمة، بينما يرى الفريق في الداخل البيع والمخزون والتحصيل في صورة مترابطة أسهل في المتابعة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl text-right">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">الركائز الأساسية</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              من أول زيارة عامة إلى إدارة التشغيل داخل المتجر
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              الفكرة هنا أن تظهر قيمة المنصة كما هي في الواقع: جزء يخدم العميل أمامك، وجزء يخدم التشغيل داخل النشاط، وكلاهما يتحركان معًا.
            </p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {featurePillars.map((pillar) => (
              <article
                key={pillar.slug}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-right transition-transform hover:-translate-y-1 hover:border-emerald-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-900">{pillar.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{pillar.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3 text-white">
                    {pillar.slug === 'sales' ? <BarChart3 className="h-5 w-5" /> : null}
                    {pillar.slug === 'inventory' ? <Boxes className="h-5 w-5" /> : null}
                    {pillar.slug === 'installments' ? <CreditCard className="h-5 w-5" /> : null}
                    {pillar.slug === 'storefront' ? <Store className="h-5 w-5" /> : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {pillar.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                      {bullet}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformHighlights.map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-right shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Highlight</p>
              <p className="mt-3 text-base font-black text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">ابدأ من الجزء الأقرب لاحتياجك</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">اختر المسار الذي يشبه طريقة عمل نشاطك الآن</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              إذا كان تركيزك الآن على المبيعات، أو المخزون، أو الأقساط، أو المتجر الإلكتروني، ستجد صفحة تبدأ من نفس الزاوية التي تفكر منها.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seoLandingCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.path}
                  to={card.path}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-right transition-transform hover:-translate-y-1 hover:border-emerald-200 hover:bg-white"
                >
                  <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">{card.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-4">
          {workflowSteps.map((item) => (
            <div key={item.step} className="rounded-[1.75rem] border border-white bg-white p-6 text-right shadow-sm">
              <span className="text-sm font-black text-amber-600">{item.step}</span>
              <h3 className="mt-3 text-xl font-black text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[2.25rem] border border-slate-200 bg-slate-950 px-6 py-8 text-right text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)] sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">الخطوة التالية</p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">جاهز لتجربة PayQusta</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
                الواجهة العامة هنا تعرّف العميل بالبراند بسرعة، والمتجر يساعده على الطلب، بينما يظل التشغيل الداخلي مرتبًا لفريقك من نفس المنصة.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
              >
                أنشئ حسابك
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/15"
              >
                استكشف المزايا
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
