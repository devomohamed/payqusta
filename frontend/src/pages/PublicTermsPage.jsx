import React from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, FileText, ReceiptText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const termsBlocks = [
  {
    icon: FileText,
    title: t('public_terms_page.ui.kb3cqy'),
    points: [
      'PayQusta منصة SaaS تجمع الإدارة الداخلية، المتجر العام، وبوابة العملاء في نفس المنتج.',
      t('public_terms_page.ui.kwq375f'),
      t('public_terms_page.ui.k135io1'),
    ],
  },
  {
    icon: ReceiptText,
    title: t('public_terms_page.ui.kii6q01'),
    points: [
      t('public_terms_page.ui.kqsjbyn'),
      t('public_terms_page.ui.k5tbi7f'),
      t('public_terms_page.ui.k80l2q1'),
    ],
  },
  {
    icon: ShieldCheck,
    title: t('public_terms_page.ui.k4tjnka'),
    points: [
      t('public_terms_page.ui.k6osgy0'),
      t('public_terms_page.ui.kxkr9jo'),
      t('public_terms_page.ui.kxpzr5e'),
    ],
  },
];

const risks = [
  'النسخ الاحتياطي داخل المنصة مفيد تشغيليًا، لكنه ليس بديلًا تلقائيًا عن خطة تعافي شاملة لكل مكونات النشاط.',
  'بعض البوابات أو مسارات الدفع قد تكون مفعلة جزئيًا حسب البيئة، لذلك يجب التحقق من الإعدادات الفعلية قبل الإطلاق التجاري.',
  t('public_terms_page.ui.kpjl8g1'),
];

export default function PublicTermsPage() {
  const { t } = useTranslation('admin');
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{t('public_terms_page.ui.ka9xb2h')}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t('public_terms_page.ui.kdoqxtj')}</h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">
            هذه الصفحة تضع الإطار العملي لاستخدام المنصة: ما الذي تقدمه، ما الذي يبقى ضمن مسؤولية المتجر، وما الذي يجب التأكد منه قبل الاعتماد عليها في التشغيل اليومي أو الإطلاق العام.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/privacy"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              {t('public_terms_page.ui.ks5p4y2')}
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              {t('public_terms_page.ui.kyihy7g')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">{t('public_terms_page.ui.k60zd0l')}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">{t('public_terms_page.ui.kquc3oo')}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            نجاح استخدام المنصة يعتمد على مطابقة الباقة، البوابات المفعلة، وسير العمل الحقيقي داخل نشاطك مع ما ستعتمد عليه في البيع والمتابعة وخدمة العملاء.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {termsBlocks.map((block) => {
          const Icon = block.icon;
          return (
            <article key={block.title} className="app-surface rounded-[1.75rem] p-6 text-right">
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{block.title}</h2>
              <div className="mt-5 grid gap-3">
                {block.points.map((point) => (
                  <div key={point} className="app-surface-muted rounded-2xl px-4 py-4 text-sm font-bold leading-7 text-slate-700 dark:text-slate-100">
                    {point}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-10 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-right shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">{t('public_terms_page.ui.k4t26zq')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_terms_page.ui.ktqlx0p')}</h2>
          </div>
          <div className="inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {risks.map((risk) => (
            <div key={risk} className="rounded-2xl border border-white bg-white px-4 py-4 text-sm font-bold leading-7 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
              {risk}
            </div>
          ))}
        </div>
      </section>

      <section className="app-surface mt-10 rounded-[2rem] p-6 text-right sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_terms_page.ui.kdatzw0')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_terms_page.ui.k45ezuk')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              لا تجعل هذه الصفحة قانونية فقط. استخدمها كمرجع سريع قبل القرار: هل الباقة مناسبة؟ هل التشغيل واضح؟ هل فريقك سيعمل على المنصة كما تتوقع؟
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link to="/demo" className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
              {t('public_terms_page.ui.k5uekyo')}
            </Link>
            <Link to="/login?mode=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
              {t('public_terms_page.ui.kkvj629')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
