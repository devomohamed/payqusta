import React, { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { faqItems } from '../publicSite/content';

export default function PublicFaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr] lg:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">الأسئلة الشائعة</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">إجابات يحتاجها الزائر قبل التسجيل أو التجربة الأولى</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            هنا ستجد إجابات مباشرة على الأسئلة التي تتكرر قبل اتخاذ قرار البدء أو طلب تجربة عملية.
          </p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/90">
              {faqItems.length} أسئلة أساسية يحتاجها صاحب النشاط قبل القرار
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/90">
              توضيح للبراند، الاستخدام اليومي، والواجهة التي يراها العميل
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">الوضوح قبل القرار</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            كل إجابة هنا تمهد لخطوة أوضح في رحلة الزائر
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            عندما تكون الإجابات واضحة، يصبح تقييم المنصة أسهل ويقل التردد قبل الانتقال إلى التجربة أو التسجيل.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {faqItems.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <article key={item.question} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right sm:px-6"
              >
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <span className="flex-1 text-base font-black text-slate-950 sm:text-lg">{item.question}</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-5 text-right text-sm leading-7 text-slate-600 sm:px-6">
                  {item.answer}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6 text-right shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-950">ما زال لديك سؤال قبل البدء؟</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              إذا بقيت نقطة غير واضحة بعد المزايا وطريقة العمل، فهذه الإجابات تساعدك على تكوين صورة أدق قبل البدء.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/features"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
            >
              ارجع إلى المزايا
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
