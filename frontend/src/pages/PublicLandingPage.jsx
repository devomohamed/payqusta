import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Store,
} from 'lucide-react';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';

const featureCards = [
  {
    icon: LayoutDashboard,
    title: 'لوحة تحكم واحدة',
    description: 'تابع المبيعات والمخزون والعملاء والتحصيل من شاشة واحدة بدل التنقل بين أدوات منفصلة.',
  },
  {
    icon: CreditCard,
    title: 'إدارة الأقساط والتحصيل',
    description: 'سجل الأقساط، راقب المواعيد، واعرف المتأخرات والمدفوعات بدون جداول يدوية.',
  },
  {
    icon: Store,
    title: 'متجر إلكتروني جاهز',
    description: 'اعرض منتجاتك أونلاين واستقبل الطلبات من رابط متجر واضح يحمل اسم البراند الخاص بك.',
  },
  {
    icon: Boxes,
    title: 'مخزون ومنتجات',
    description: 'أدر المنتجات والصور والأسعار والتنبيهات ونقاط إعادة الطلب بشكل منظم.',
  },
];

const highlights = [
  'برنامج إدارة مبيعات ومخزون',
  'متابعة الأقساط والتحصيل',
  'إنشاء متجر إلكتروني باسمك',
  'تقارير تساعدك على القرار',
];

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#ffffff_100%)] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <AnimatedBrandLogo src="/logo.png" alt="PayQusta" size="sm" containerClassName="shrink-0" />
            <div className="text-right">
              <p className="text-lg font-black tracking-tight">PayQusta</p>
              <p className="text-xs font-medium text-slate-500">منصة إدارة المبيعات والأقساط</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/login?mode=register"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="text-right">
              <div className="inline-flex rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-black text-primary-700">
                PayQusta للمتاجر والمبيعات والأقساط
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                PayQusta منصة تساعدك على
                <span className="block bg-gradient-to-l from-primary-700 via-primary-500 to-sky-500 bg-clip-text text-transparent">
                  إنشاء متجر إلكتروني وإدارة المبيعات والأقساط
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                لو بتدير محل أو متجر وتحتاج تجمع بين المبيعات، المخزون، العملاء، الأقساط، والتحصيل في نظام واحد،
                فـ PayQusta مصمم عشان يسهّل التشغيل اليومي ويخلي اسم نشاطك حاضر أونلاين بشكل أوضح.
              </p>

              <div className="mt-8 flex flex-wrap justify-end gap-3">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition-transform hover:-translate-y-0.5"
                >
                  أنشئ حسابك
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-600"
                >
                  دخول لوحة التحكم
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-end gap-2">
                {highlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary-300/25 blur-3xl" />
              <div className="absolute -bottom-8 left-8 h-36 w-36 rounded-full bg-sky-300/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.24),_transparent_35%)]" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-300">نظرة سريعة على المنصة</p>
                      <p className="mt-1 text-2xl font-black">PayQusta Dashboard</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <BarChart3 className="h-6 w-6 text-sky-300" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">Sales</p>
                      <p className="mt-2 text-2xl font-black">متابعة يومية</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">تقارير سريعة للمبيعات والتحصيل والمخزون.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">Installments</p>
                      <p className="mt-2 text-2xl font-black">أقساط منظمة</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">مواعيد، مدفوعات، وتنبيهات على العملاء المتأخرين.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white p-5 text-right text-slate-900">
                    <p className="text-sm font-black text-primary-700">ليه الصفحة دي مهمة للظهور في جوجل؟</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      لأنها صفحة عامة تعرف بمحصول البراند PayQusta بشكل واضح بدل ما يكون أول شيء يراه جوجل صفحة دخول فقط.
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
              <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-600">ماذا يقدم PayQusta</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                صفحة براند واضحة + نظام تشغيل فعلي للمتجر
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600">
                وجود صفحة رئيسية عامة، ونص واضح عن البراند، وروابط منظمة، يساعد محركات البحث تفهم إن PayQusta اسم
                موقع ومنصة فعلية، مش مجرد شاشة تسجيل دخول.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-right transition-transform hover:-translate-y-1 hover:border-primary-200 hover:bg-white"
                  >
                    <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-xl font-black text-slate-950">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              'اكتب اسم نشاطك، وابدأ بتجهيز المتجر والمنتجات.',
              'تابع البيع والتحصيل والأقساط من داخل النظام.',
              'خلّي براند PayQusta والصفحة العامة يشتغلوا لصالح الظهور في البحث.',
            ].map((step, index) => (
              <div key={step} className="rounded-[1.75rem] border border-white bg-white p-6 text-right shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-primary-600">0{index + 1}</span>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-4 text-lg font-black text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-10 text-right text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)] sm:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">PayQusta</p>
                <h2 className="mt-3 text-3xl font-black leading-tight">
                  لو عاوز البراند يظهر بشكل أقوى، لازم الدومين الرئيسي يبقى له محتوى عام واضح وقابل للفهرسة.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  تم تجهيز الصفحة الرئيسية لهذا الغرض، مع ضبط أساسيات SEO مثل الروبوتس، السايت ماب، والعناوين الواضحة.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
                >
                  أنشئ حسابك الآن
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  الدخول للنظام
                </Link>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 text-sm text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              صفحة عامة قابلة للفهرسة ومناسبة لظهور اسم PayQusta في البحث
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
