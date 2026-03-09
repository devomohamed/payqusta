import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { faqItems } from '../publicSite/content';

export default function PublicFaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-right">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">الأسئلة الشائعة</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          أسئلة يحتاج الزائر إجابة واضحة لها قبل التسجيل
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          الصفحة دي موجودة لتكمل الصورة: ماذا يفعل المشروع، لمن يصلح، وكيف يستفيد منه النشاط بشكل عملي.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {faqItems.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <article key={item.question} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
              >
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <span className="flex-1 text-lg font-black text-slate-950">{item.question}</span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-6 py-5 text-right text-sm leading-7 text-slate-600">
                  {item.answer}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
