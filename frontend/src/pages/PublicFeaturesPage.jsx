import React from 'react';
import { ArrowLeft, BarChart3, Boxes, CreditCard, MonitorSmartphone, ShieldCheck, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    points: ['هيكل واضح للمنصة', 'واجهة تعريفية احترافية', 'أساس جيد للتوسع والانتظام'],
    tone: 'from-orange-100 via-white to-white',
  },
];

const valueOutcomes = [
  'صورة أوضح للعميل قبل الطلب أو التسجيل',
  'تشغيل يومي أسرع لفريق البيع والتحصيل',
  'ربط أفضل بين ما يراه العميل وما يحدث داخل النظام',
];

export default function PublicFeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">المزايا</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            PayQusta ليس أداة واحدة، بل منظومة مترابطة
          </h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">
            المنصة هنا ليست مجموعة شاشات منفصلة، بل أجزاء تخدم بعضها: البيع ينعكس على المخزون، والتحصيل يرتبط بالعميل، والواجهة العامة تدعم الطلب والثقة.
          </p>

          <div className="app-surface mt-6 rounded-[2rem] p-6">
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">الصورة الكبيرة</p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">الميزة الأقوى هي الترابط</h2>
            <p className="app-text-soft mt-3 text-sm leading-7">
              قيمة المنصة ليست في كثرة المزايا فقط، بل في أن كل خطوة تكمل الأخرى: الفاتورة، العميل، المخزون، والتحصيل لا يعيش كل واحد منها في مكان منفصل.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">النتيجة</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">زائر يفهم المشروع بسرعة، وفريق يعمل براحة أكبر</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            النتيجة التي يراها العميل أمامه يجب أن تنعكس أيضًا على راحة الفريق في الداخل، وهذا ما تبني عليه هذه المنظومة.
          </p>
          <div className="mt-6 grid gap-3">
            {valueOutcomes.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/90">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              to="/login?mode=register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950"
            >
              ابدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article
              key={module.title}
              className={`rounded-[2rem] border border-slate-200 bg-gradient-to-br ${module.tone} p-6 text-right shadow-sm transition-transform hover:-translate-y-1 dark:border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:shadow-none`}
            >
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{module.title}</h2>
              <div className="mt-5 grid gap-3">
                {module.points.map((point) => (
                  <div key={point} className="rounded-2xl border border-white bg-white/90 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                    {point}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="app-surface mt-10 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">ما الذي يتحسن فعليًا؟</p>
            <h3 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">من عرض البراند إلى متابعة التحصيل، نفس المنظومة تخدمك</h3>
            <p className="app-text-soft mt-3 text-base leading-8">
              الهدف أن يرى العميل مشروعًا منظمًا، وأن يعمل الفريق على بيانات واضحة، وأن يتحول ذلك إلى مبيعات ومتابعة أدق مع الوقت.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/use-cases"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              الحالات العملية
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              جرّب الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
