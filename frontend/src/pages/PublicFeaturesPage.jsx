import React from 'react';
import { BarChart3, Boxes, CreditCard, MonitorSmartphone, ShieldCheck, Workflow } from 'lucide-react';

const modules = [
  {
    icon: BarChart3,
    title: 'إدارة المبيعات',
    points: ['فواتير أسرع', 'متابعة أداء يومي', 'ربط مباشر بحركة النشاط'],
    tone: 'from-amber-100 via-white to-white',
  },
  {
    icon: Boxes,
    title: 'المنتجات والمخزون',
    points: ['تنبيهات نقص المخزون', 'تنظيم الأقسام', 'إدارة الصور والأسعار'],
    tone: 'from-emerald-100 via-white to-white',
  },
  {
    icon: CreditCard,
    title: 'الأقساط والتحصيل',
    points: ['جداول سداد مرنة', 'تأخير ومستحقات', 'رؤية أوضح للمديونيات'],
    tone: 'from-sky-100 via-white to-white',
  },
  {
    icon: MonitorSmartphone,
    title: 'المتجر والواجهة العامة',
    points: ['صفحات عامة احترافية', 'روابط قابلة للمشاركة', 'تجربة مناسبة للموبايل'],
    tone: 'from-rose-100 via-white to-white',
  },
  {
    icon: Workflow,
    title: 'سير عمل متماسك',
    points: ['من المنتج إلى الفاتورة', 'من الفاتورة إلى التحصيل', 'من الإدارة إلى الموقع العام'],
    tone: 'from-slate-100 via-white to-white',
  },
  {
    icon: ShieldCheck,
    title: 'ثقة واستمرارية',
    points: ['هيكل واضح للمنصة', 'واجهة تعريفية احترافية', 'أساس جيد للفهرسة والانتشار'],
    tone: 'from-orange-100 via-white to-white',
  },
];

export default function PublicFeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl text-right">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">المزايا</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          PayQusta ليس أداة واحدة، بل منظومة مترابطة
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          الصفحة دي تشرح ماذا يقدمه المشروع فعليًا، وكيف تتكامل الأجزاء المختلفة بدل أن تكون مجرد قائمة خواص منفصلة.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article
              key={module.title}
              className={`rounded-[2rem] border border-slate-200 bg-gradient-to-br ${module.tone} p-6 text-right shadow-sm transition-transform hover:-translate-y-1`}
            >
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{module.title}</h2>
              <div className="mt-5 grid gap-3">
                {module.points.map((point) => (
                  <div key={point} className="rounded-2xl border border-white bg-white/90 px-4 py-3 text-sm font-bold text-slate-700">
                    {point}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 text-right shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">الصورة الكبيرة</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">الميزة الأقوى هي الترابط</h3>
          <p className="mt-4 text-base leading-8 text-slate-600">
            المنتج القوي ليس فقط في عدد الخواص، بل في كيف تتصل ببعضها. PayQusta يربط بين الداخل والخارج:
            بين الإدارة اليومية، والواجهة العامة، وحركة البيع، وسجل التحصيل.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">النتيجة</p>
          <h3 className="mt-3 text-3xl font-black">زائر يفهم المشروع بسرعة، وفريق يعمل براحة أكبر</h3>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            ده بالضبط الهدف من الموقع العام الجديد: شرح احترافي للمنصة، ثم تحويل الزائر إلى مستخدم أو عميل محتمل بخطوات واضحة.
          </p>
        </div>
      </div>
    </div>
  );
}
