import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import {
  brandArabicName,
  brandDisplayName,
  brandSearchAliases,
  featurePillars,
  platformHighlights,
  workflowSteps,
} from '../publicSite/content';
import { seoLandingCards } from '../publicSite/seoLandingPages';

const spotlightCards = [
  {
    icon: BarChart3,
    label: t('public_landing_page.ui.kirs4f7'),
    text: t('public_landing_page.ui.kqm0bi6'),
  },
  {
    icon: CreditCard,
    label: t('public_landing_page.ui.kcw46cg'),
    text: t('public_landing_page.ui.kitil5o'),
  },
  {
    icon: Store,
    label: t('public_landing_page.ui.k18pqep'),
    text: t('public_landing_page.ui.k5bjspm'),
  },
];

const heroMetrics = [
  { label: t('public_landing_page.ui.kd63pmc'), value: t('public_landing_page.ui.kibhtav') },
  { label: t('public_landing_page.ui.k797sof'), value: t('public_landing_page.ui.kczhrco') },
  { label: t('public_landing_page.ui.kabe24f'), value: t('public_landing_page.ui.k41vqdx') },
];

const brandAliasPreview = brandSearchAliases.slice(0, 10);

export default function PublicLandingPage() {
  const { t } = useTranslation('admin');
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.02fr,0.98fr] lg:items-center">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              {brandDisplayName} منصة تشغيل للمتاجر تربط البيع بالمخزون والتحصيل
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              {brandDisplayName} يقدم لك
              <span className="block bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_55%,#f59e0b_100%)] bg-clip-text text-transparent">
                {t('public_landing_page.ui.kox8vah')}
              </span>
            </h1>

            <p className="app-text-soft mt-5 max-w-3xl text-base leading-8 sm:text-lg">
              {brandDisplayName} لا يقدم شاشة إدارة فقط، بل منظومة كاملة تساعدك على البيع، متابعة المخزون، إدارة الأقساط، واستقبال الطلبات من واجهة يعرف منها العميل من أنت وماذا تقدم.
            </p>

            <div className="app-surface mt-5 rounded-[1.75rem] p-5 text-right">
              <p className="text-sm font-black text-slate-900 dark:text-white">{t('public_landing_page.ui.ky21zyb')}</p>
              <p className="app-text-soft mt-2 text-sm leading-7">
                إذا عرفت المنصة باسم <span className="font-black text-slate-950 dark:text-white">PayQusta</span> أو
                <span className="font-black text-slate-950 dark:text-white"> {brandArabicName}</span> فأنت تتحدث عن نفس البراند: منصة تساعد المتجر على البيع، المتابعة، والتحصيل مع واجهة احترافية للعميل.
              </p>
              <p className="app-text-soft mt-3 text-sm leading-7">
                وقد يبحث بعض المستخدمين أيضًا عن المنصة بهذه الكتابات: {brandAliasPreview.join(t('public_landing_page.ui.k111w'))}.
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {brandAliasPreview.map((alias) => (
                  <span
                    key={alias}
                    className="app-surface-muted rounded-full px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-100"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition-transform hover:-translate-y-0.5"
              >
                {t('public_landing_page.ui.khqnfld')}
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
              >
                {t('public_landing_page.ui.k21jqek')}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroMetrics.map((item) => (
                <div key={item.label} className="app-surface rounded-[1.5rem] p-4 text-right">
                  <p className="app-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</p>
                  <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-8 top-10 h-28 w-28 rounded-full bg-amber-200/45 blur-3xl" />
            <div className="absolute -left-4 bottom-4 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_32px_90px_rgba(15,23,42,0.20)] sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_32%)]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-300">{t('public_landing_page.ui.kqdaj16')}</p>
                    <p className="mt-1 text-2xl font-black">PayQusta Experience</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <ShieldCheck className="h-6 w-6 text-amber-300" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {spotlightCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-right backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-right">
                            <p className="text-base font-black sm:text-lg">{card.label}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-300">{card.text}</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-3">
                            <Icon className="h-5 w-5 text-emerald-300" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[1.75rem] bg-white p-5 text-right text-slate-900 dark:bg-white/10 dark:text-white">
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{t('public_landing_page.ui.kuhytnv')}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-200">
                    العميل يرى واجهة واضحة ومنظمة، بينما يرى الفريق في الداخل البيع والمخزون والتحصيل في صورة مترابطة أسهل في المتابعة.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="app-surface rounded-[2rem] p-6 sm:p-8">
          <div className="max-w-3xl text-right">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{t('public_landing_page.ui.ka5nzbg')}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {t('public_landing_page.ui.kmcunps')}
            </h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              الفكرة هنا أن تظهر قيمة المنصة كما هي في الواقع: جزء يخدم العميل أمامك، وجزء يخدم التشغيل داخل النشاط، وكلاهما يتحركان معًا.
            </p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-2">
            {featurePillars.map((pillar) => (
              <article
                key={pillar.slug}
                className="app-surface-muted rounded-[1.75rem] p-6 text-right transition-transform hover:-translate-y-1 hover:bg-white dark:hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{pillar.title}</p>
                    <p className="app-text-soft mt-2 text-sm leading-7">{pillar.summary}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3 text-white">
                    {pillar.slug === 'sales' ? <BarChart3 className="h-5 w-5" /> : null}
                    {pillar.slug === 'inventory' ? <Boxes className="h-5 w-5" /> : null}
                    {pillar.slug === 'installments' ? <CreditCard className="h-5 w-5" /> : null}
                    {pillar.slug === 'storefront' ? <Store className="h-5 w-5" /> : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {pillar.bullets.map((bullet) => (
                    <div key={bullet} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                      {bullet}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformHighlights.map((item) => (
            <div key={item} className="app-surface rounded-[1.5rem] p-5 text-right">
              <p className="app-text-muted text-[11px] font-black uppercase tracking-[0.18em]">Highlight</p>
              <p className="mt-3 text-base font-black text-slate-900 dark:text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="app-surface rounded-[2rem] p-6 text-right sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{t('public_landing_page.ui.k88kzkb')}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{t('public_landing_page.ui.kzcivxw')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              إذا كان تركيزك الآن على المبيعات، أو المخزون، أو الأقساط، أو المتجر الإلكتروني، ستجد صفحة تبدأ من نفس الزاوية التي تفكر منها.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seoLandingCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.path}
                  to={card.path}
                  className="app-surface-muted rounded-[1.75rem] p-5 text-right transition-transform hover:-translate-y-1 hover:bg-white dark:hover:bg-white/10"
                >
                  <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="app-text-muted mt-4 text-sm font-black uppercase tracking-[0.18em]">{card.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{card.title}</h3>
                  <p className="app-text-soft mt-3 text-sm leading-7">{card.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-4">
          {workflowSteps.map((item) => (
            <div key={item.step} className="app-surface rounded-[1.75rem] p-6 text-right">
              <span className="text-sm font-black text-amber-600">{item.step}</span>
              <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{item.title}</h3>
              <p className="app-text-soft mt-3 text-sm leading-7">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[2.25rem] border border-slate-200 bg-slate-950 px-6 py-8 text-right text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)] sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">{t('public_landing_page.ui.kdatzw0')}</p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{t('public_landing_page.ui.k7354by')}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
                الواجهة العامة هنا تعرّف العميل بالبراند بسرعة، والمتجر يساعده على الطلب، بينما يظل التشغيل الداخلي مرتبًا لفريقك من نفس المنصة.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
              >
                {t('public_landing_page.ui.kwfqesx')}
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/15"
              >
                {t('public_landing_page.ui.k21jqek')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
