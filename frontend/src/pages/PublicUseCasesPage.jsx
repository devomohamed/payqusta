import React from 'react';
import { Briefcase, CreditCard, PackageSearch, Users } from 'lucide-react';
import { useCaseGroups } from '../publicSite/content';

const useCaseIcons = [Briefcase, Users, CreditCard, PackageSearch];

export default function PublicUseCasesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr,1.05fr] lg:items-start">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">لمن هذا النظام؟</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">PayQusta يخاطب التشغيل الحقيقي داخل النشاط</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            بدل الكلام العام فقط، الصفحة دي توضّح أين تظهر قيمة المشروع حسب الدور أو الاحتياج داخل النشاط التجاري.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {useCaseGroups.map((group, index) => {
            const Icon = useCaseIcons[index % useCaseIcons.length];
            return (
              <article key={group.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-sm">
                <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">{group.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{group.description}</p>
                <div className="mt-5 grid gap-2">
                  {group.items.map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
