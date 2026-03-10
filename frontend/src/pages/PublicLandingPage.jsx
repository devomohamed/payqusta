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

const spotlightCards = [
  {
    icon: BarChart3,
    label: 'تشغيل يومي أوضح',
    text: 'لوحة مؤشرات تساعد صاحب النشاط يعرف ما الذي يتحرك اليوم وما الذي يحتاج تدخل سريع.',
  },
  {
    icon: CreditCard,
    label: 'أقساط وتحصيل',
    text: 'متابعة السداد والمديونيات والمواعيد من غير جداول يدوية أو رسائل مشتتة.',
  },
  {
    icon: Store,
    label: 'هوية عامة للبراند',
    text: 'موقع عام احترافي يعرّف الزائر بالمشروع ويوصله مباشرة للخطوة التالية.',
  },
];

const heroMetrics = [
  { label: 'واجهة الزائر', value: 'موقع عام واضح' },
  { label: 'تشغيل النشاط', value: 'مبيعات + مخزون + أقساط' },
  { label: 'الخطوة التالية', value: 'متجر إلكتروني جاهز' },
];

export default function PublicLandingPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.02fr,0.98fr] lg:items-center">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              {brandDisplayName} منصة احترافية لإدارة المتاجر والمبيعات والأقساط
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {brandDisplayName} يقدم لك
              <span className="block bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_55%,#f59e0b_100%)] bg-clip-text text-transparent">
                نظام تشغيل فعلي + موقع عام محترف + متجر إلكتروني واضح
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              بدل أن يرى الزائر شاشة دخول فقط، صار لدى {brandDisplayName} موقع عام متعدد الصفحات يشرح المشروع
              ويعرض قيمته الحقيقية. وفي الداخل، المنصة تربط بين البيع، المخزون، العملاء، الأقساط، والتحصيل في تجربة
              تشغيل واحدة.
            </p>

            <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 text-right shadow-sm">
              <p className="text-sm font-black text-slate-900">اسم البراند</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                إذا بحثت عن <span className="font-black text-slate-950">PayQusta</span> أو
                <span className="font-black text-slate-950"> {brandArabicName}</span> فأنت تبحث عن نفس المنصة:
                نظام لإدارة المبيعات والمخزون والأقساط مع واجهة عامة احترافية.
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
                    <p className="text-sm font-bold text-slate-300">شكل المشروع من الخارج والداخل</p>
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
                            <p className="text-base sm:text-lg font-black">{card.label}</p>
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
                    الموقع العام يشرح المشروع، والراوتس العامة تخدم الظهور والفهم، بينما النظام نفسه يظل عمليًا
                    للاستخدام اليومي داخل النشاط.
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
              التصميم الجديد لا يكتفي بالتعريف، بل يعكس صورة مشروع متكامل ويقسم القيمة بوضوح حتى يفهمها أي زائر بسرعة.
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

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[2.25rem] border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 text-right shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">الخطوة التالية</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">هل تريد واجهة عامة تقود الزائر فعليًا إلى التسجيل؟</h2>
              <p className="mt-3 text-base leading-8 text-slate-600">
                هذه النسخة من الموقع العام بُنيت لتشرح البراند بسرعة، وتدعم البحث، وتحوّل الزائر إلى عميل محتمل أو مستخدم
                فعلي بخطوات أوضح من شاشة دخول تقليدية.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/how-it-works"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
              >
                كيف يعمل
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
        </div>
      </section>
    </>
  );
}
