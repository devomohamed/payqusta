import React from 'react';
import { ArrowLeft, Database, Eye, LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const privacyAreas = [
  {
    icon: Database,
    title: t('public_privacy_page.ui.k62byhu'),
    points: [
      t('public_privacy_page.ui.kxlv1nz'),
      t('public_privacy_page.ui.k20xmqy'),
      t('public_privacy_page.ui.k71c737'),
    ],
  },
  {
    icon: Eye,
    title: t('public_privacy_page.ui.knrxgf'),
    points: [
      t('public_privacy_page.ui.k87wdyv'),
      t('public_privacy_page.ui.k3hordh'),
      t('public_privacy_page.ui.ktvxnh6'),
    ],
  },
  {
    icon: LockKeyhole,
    title: t('public_privacy_page.ui.k78zha7'),
    points: [
      t('public_privacy_page.ui.kfk3wib'),
      t('public_privacy_page.ui.k6apc6w'),
      t('public_privacy_page.ui.k2z14j0'),
    ],
  },
];

const privacyNotes = [
  t('public_privacy_page.ui.kswyir1'),
  t('public_privacy_page.ui.k4olqwh'),
  t('public_privacy_page.ui.kjcooym'),
];

export default function PublicPrivacyPage() {
  const { t } = useTranslation('admin');
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{t('public_privacy_page.ui.kvvlufk')}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t('public_privacy_page.ui.keh5sd0')}</h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">
            هذه الصفحة تشرح بشكل عملي نوع البيانات التي قد تدخل إلى المنصة، وكيف تُستخدم لحماية التشغيل، وإدارة الطلبات، وربط المتجر العام بالنظام الداخلي.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/terms"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              {t('public_privacy_page.ui.ka9xb2h')}
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              {t('public_privacy_page.ui.kkvj629')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-amber-300">{t('public_privacy_page.ui.k8vpftn')}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">{t('public_privacy_page.ui.k331lfc')}</h2>
          <div className="mt-5 grid gap-3">
            {privacyNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-bold leading-7 text-white/90">
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {privacyAreas.map((area) => {
          const Icon = area.icon;
          return (
            <article key={area.title} className="app-surface rounded-[1.75rem] p-6 text-right">
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{area.title}</h2>
              <div className="mt-5 grid gap-3">
                {area.points.map((point) => (
                  <div key={point} className="app-surface-muted rounded-2xl px-4 py-4 text-sm font-bold leading-7 text-slate-700 dark:text-slate-100">
                    {point}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="app-surface mt-10 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_privacy_page.ui.k2tpje9')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_privacy_page.ui.kvtbfex')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              PayQusta توفر بنية تشغيل وعزل وصلاحيات ومراقبة، لكن إدارة الموظفين، دقة البيانات، ومشاركة الوصول داخل النشاط تبقى مسؤولية مالك المتجر وفريقه الإداري.
            </p>
          </div>

          <div className="app-surface rounded-[1.75rem] p-5">
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_privacy_page.ui.kh4xhig')}</p>
            <div className="mt-4 flex flex-col gap-3">
              <Link to="/terms" className="app-surface-muted rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
                {t('public_privacy_page.ui.k46ohis')}
              </Link>
              <Link to="/contact" className="app-surface-muted rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
                {t('public_privacy_page.ui.kubk5jx')}
              </Link>
              <Link to="/pricing" className="app-surface-muted rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
                {t('public_privacy_page.ui.kr550tn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="app-surface mt-10 rounded-[2rem] p-6 text-right sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_privacy_page.ui.kx5e31l')}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t('public_privacy_page.ui.kv4pnm2')}</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link to="/demo" className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
              {t('public_privacy_page.ui.k5uekyo')}
            </Link>
            <Link to="/features" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
              {t('public_privacy_page.ui.k21jqek')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
