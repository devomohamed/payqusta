import React from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, FileText, ReceiptText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const termsBlocks = [
  {
    icon: FileText,
    title: 'نطاق الخدمة',
    points: [
      'PayQusta منصة SaaS تجمع الإدارة الداخلية، المتجر العام، وبوابة العملاء في نفس المنتج.',
      'المنصة موجهة لتشغيل المتاجر والنشاطات التي تحتاج مبيعات، مخزون، طلبات، أو تحصيل.',
      'أي تخصيصات أو تكاملات إضافية تخضع لما هو مفعل فعليًا داخل الباقة والبيئة التشغيلية.',
    ],
  },
  {
    icon: ReceiptText,
    title: 'الحسابات والاشتراكات',
    points: [
      'صاحب الحساب مسؤول عن صحة بيانات التسجيل، إدارة المستخدمين، ومراجعة صلاحيات فريقه.',
      'الباقات والمزايا المتاحة تحددها الخطة الفعلية المنشورة داخل المنصة وقت الاشتراك.',
      'طرق الدفع أو التفعيل اليدوي قد تختلف حسب البوابة المفعلة والإعدادات المتاحة في البيئة الحالية.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'الاستخدام المقبول',
    points: [
      'لا يجوز استخدام المنصة للوصول غير المصرح به أو تجاوز الصلاحيات أو تعطيل الخدمة.',
      'لا يجوز إدخال بيانات غير قانونية أو استخدامها لإرسال رسائل أو إشعارات بشكل مسيء.',
      'أي استخدام يؤثر على أمان المستأجرين أو سلامة النظام قد يؤدي إلى تقييد الوصول أو إيقافه.',
    ],
  },
];

const risks = [
  'النسخ الاحتياطي داخل المنصة مفيد تشغيليًا، لكنه ليس بديلًا تلقائيًا عن خطة تعافي شاملة لكل مكونات النشاط.',
  'بعض البوابات أو مسارات الدفع قد تكون مفعلة جزئيًا حسب البيئة، لذلك يجب التحقق من الإعدادات الفعلية قبل الإطلاق التجاري.',
  'تشغيل الخدمة على أكثر من نسخة أو بيئة يحتاج انضباطًا تشغيليًا في الإطلاق والمراقبة والنسخ الاحتياطي.',
];

export default function PublicTermsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">الشروط والأحكام</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">شروط استخدام مختصرة وواضحة قبل بدء التشغيل على PayQusta</h1>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            هذه الصفحة تضع الإطار العملي لاستخدام المنصة: ما الذي تقدمه، ما الذي يبقى ضمن مسؤولية المتجر، وما الذي يجب التأكد منه قبل الاعتماد عليها في التشغيل اليومي أو الإطلاق العام.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/privacy"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950"
            >
              سياسة الخصوصية
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              راجع الباقات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">قاعدة عملية</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">قبل الإطلاق، راجع ما هو مفعّل فعلًا داخل بيئتك وليس ما هو متوقع نظريًا</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            نجاح استخدام المنصة يعتمد على مطابقة الباقة، البوابات المفعلة، وسير العمل الحقيقي داخل نشاطك مع ما ستعتمد عليه في البيع والمتابعة وخدمة العملاء.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {termsBlocks.map((block) => {
          const Icon = block.icon;
          return (
            <article key={block.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-right shadow-sm">
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{block.title}</h2>
              <div className="mt-5 grid gap-3">
                {block.points.map((point) => (
                  <div key={point} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold leading-7 text-slate-700">
                    {point}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-10 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-right shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">تنبيهات مهمة</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">نقاط يجب فهمها قبل الاعتماد الكامل على المنصة</h2>
          </div>
          <div className="inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {risks.map((risk) => (
            <div key={risk} className="rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm">
              {risk}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">الخطوة التالية</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">إذا كانت الشروط مناسبة لطريقة عملك، انتقل إلى الديمو أو التسجيل</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              لا تجعل هذه الصفحة قانونية فقط. استخدمها كمرجع سريع قبل القرار: هل الباقة مناسبة؟ هل التشغيل واضح؟ هل فريقك سيعمل على المنصة كما تتوقع؟
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link to="/demo" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:border-slate-950 hover:text-slate-950">
              شاهد الديمو
            </Link>
            <Link to="/login?mode=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
              ابدأ الحساب
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
