import React from 'react';
import { ArrowLeft, Briefcase, CreditCard, PackageSearch, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCaseGroups } from '../publicSite/content';

const useCaseIcons = [Briefcase, Users, CreditCard, PackageSearch];

const useCaseSummary = [
  'لصاحب النشاط الذي يريد قرارًا أسرع',
  'لفريق البيع الذي يحتاج واجهة عملية يومية',
  'لإدارة الأقساط والتحصيل التي تريد متابعة أوضح',
];

export default function PublicUseCasesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr] lg:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">لمن هذا النظام؟</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">PayQusta يخاطب التشغيل الحقيقي داخل النشاط</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            ستظهر لك هنا قيمة المنصة حسب طبيعة العمل داخل النشاط: من يتخذ القرار، ومن يبيع، ومن يتابع الأقساط، ومن يستقبل الطلبات.
          </p>

          <div className="mt-6 grid gap-3">
            {useCaseSummary.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/90">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950"
            >
              كيف يعمل
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="app-surface rounded-[2rem] p-6 text-right sm:p-8">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">أين تظهر الفائدة؟</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">كل حالة استخدام هنا مرتبطة بجزء تشغيل فعلي</h2>
          <p className="app-text-soft mt-3 text-base leading-8">
            كل حالة استخدام هنا مرتبطة بموقف حقيقي يتكرر داخل المتجر أو النشاط التجاري، وليس مجرد تقسيم نظري للأدوار.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {useCaseGroups.map((group, index) => {
          const Icon = useCaseIcons[index % useCaseIcons.length];
          return (
            <article key={group.title} className="app-surface rounded-[2rem] p-6 text-right">
              <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{group.title}</h2>
              <p className="app-text-soft mt-3 text-sm leading-7">{group.description}</p>
              <div className="mt-5 grid gap-2">
                {group.items.map((item) => (
                  <div key={item} className="app-surface-muted rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-100">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="app-surface mt-10 rounded-[2rem] bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">الهدف النهائي</p>
            <h3 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">أن يفهم كل طرف أين سيستفيد فعليًا من المنصة</h3>
            <p className="app-text-soft mt-3 text-base leading-8">
              عندما يفهم كل طرف أين سيوفر وقتًا أو يقلل أخطاء أو يتابع الحركة بشكل أفضل، يصبح قرار الاعتماد على المنصة أسهل وأكثر واقعية.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/faq"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              الأسئلة الشائعة
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
    </div>
  );
}
