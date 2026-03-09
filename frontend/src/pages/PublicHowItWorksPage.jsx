import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workflowSteps } from '../publicSite/content';

export default function PublicHowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-right">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">كيف يعمل</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          رحلة واضحة من تجهيز النشاط إلى تشغيله ثم عرضه للزوار
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          الهدف هنا أن يفهم الزائر أن المشروع ليس فكرة نظرية، بل مسار عملي يبدأ من البيانات وينتهي بتجربة احترافية للجمهور.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {workflowSteps.map((step) => (
          <article key={step.step} className="rounded-[2rem] border border-slate-200 bg-white p-7 text-right shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-amber-600">{step.step}</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-8 text-right shadow-sm">
        <h2 className="text-3xl font-black text-slate-950">الخطوة الطبيعية التالية</h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
          بعد أن يفهم الزائر الفكرة والمزايا والحالات العملية، يبقى التحويل إلى تسجيل أو تجربة أولية. لهذا تم تنظيم الموقع العام ليقود الزائر بخطوات منطقية بدل صفحة وحيدة مزدحمة.
        </p>
        <div className="mt-6">
          <Link
            to="/login?mode=register"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
          >
            ابدأ الآن
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
