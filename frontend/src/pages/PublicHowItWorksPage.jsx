import React from 'react';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workflowSteps } from '../publicSite/content';

export default function PublicHowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr] lg:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">كيف يعمل</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">رحلة واضحة من تجهيز النشاط إلى تشغيله ثم عرضه للزوار</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            الهدف هنا أن يفهم الزائر أن المشروع ليس فكرة نظرية، بل مسار عملي يبدأ من البيانات وينتهي بتجربة احترافية للجمهور.
          </p>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              لماذا هذا الترتيب؟
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              لأن الزائر يحتاج أن يرى مسارًا منطقيًا: إعداد، تشغيل، عرض، ثم متابعة. هذا الترتيب هو ما يجعل الموقع
              العام يقود إلى فهم حقيقي بدل صفحة واحدة مزدحمة.
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">المسار</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            خطوات متتابعة توصل الزائر إلى صورة تشغيل كاملة
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            الصفحة هنا لا تعرض مراحل نظرية فقط، بل تشرح كيف يبدأ النشاط داخل المنصة ثم كيف يظهر للعالم الخارجي.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {workflowSteps.map((step, index) => (
          <article key={step.step} className="rounded-[2rem] border border-slate-200 bg-white p-5 text-right shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="order-2 sm:order-1 text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  الخطوة {step.step}
                </div>
                <h3 className="mt-4 text-2xl font-black text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
              </div>

              <div className="order-1 sm:order-2 flex items-center justify-end gap-3 sm:min-w-[132px]">
                <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-sm font-black">
                  {step.step}
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            {index < workflowSteps.length - 1 && (
              <div className="mt-5 h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
            )}
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 text-right shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-950">الخطوة الطبيعية التالية</h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              بعد أن يفهم الزائر الفكرة والمزايا والحالات العملية، يبقى التحويل إلى تسجيل أو تجربة أولية. لذلك تم تنظيم
              الموقع العام ليقود الزائر بخطوات منطقية بدل صفحة واحدة مزدحمة.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/faq"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
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
