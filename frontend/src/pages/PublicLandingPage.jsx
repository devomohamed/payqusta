import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Boxes, CreditCard, Store } from 'lucide-react';
import { seoLandingCards } from '../publicSite/seoLandingPages';

/* -------------------------------------------------------------------------- */
/*                                ANIMATIONS                                  */
/* -------------------------------------------------------------------------- */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

/* -------------------------------------------------------------------------- */
/*                                CONSTANTS                                   */
/* -------------------------------------------------------------------------- */
const PILLAR_ICONS = {
  sales: BarChart3,
  inventory: Boxes,
  installments: CreditCard,
  storefront: Store,
};

const PILLAR_COLORS = {
  sales: {
    border: 'border-slate-200 dark:border-[#3b82f6]',
    shadow: 'shadow-lg shadow-blue-500/10 dark:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    hoverShadow: 'hover:shadow-blue-500/20 dark:hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]',
    iconBorder: 'border-blue-100 dark:border-[#3b82f6]',
    iconShadow: 'dark:shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    iconBg: 'bg-blue-50 dark:bg-[#3b82f6]/10',
    iconText: 'text-blue-600 dark:text-blue-400',
    cardBg: 'dark:bg-[#0B1120]',
    image: '/mockups/sales-blue.png'
  },
  inventory: {
    border: 'border-slate-200 dark:border-[#00e59b]',
    shadow: 'shadow-lg shadow-emerald-500/10 dark:shadow-[0_0_20px_rgba(0,229,155,0.15)]',
    hoverShadow: 'hover:shadow-emerald-500/20 dark:hover:shadow-[0_0_40px_rgba(0,229,155,0.3)]',
    iconBorder: 'border-emerald-100 dark:border-[#00e59b]',
    iconShadow: 'dark:shadow-[0_0_20px_rgba(0,229,155,0.5)]',
    iconBg: 'bg-emerald-50 dark:bg-[#00e59b]/10',
    iconText: 'text-emerald-600 dark:text-[#00e59b]',
    cardBg: 'dark:bg-[#0B1120]',
    image: '/mockups/inventory-green.png'
  },
  storefront: {
    border: 'border-slate-200 dark:border-[#a855f7]',
    shadow: 'shadow-lg shadow-purple-500/10 dark:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    hoverShadow: 'hover:shadow-purple-500/20 dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]',
    iconBorder: 'border-purple-100 dark:border-[#a855f7]',
    iconShadow: 'dark:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    iconBg: 'bg-purple-50 dark:bg-[#a855f7]/10',
    iconText: 'text-purple-600 dark:text-purple-400',
    cardBg: 'dark:bg-[#0B1120]',
    image: '/mockups/store-purple.png'
  },
  installments: {
    border: 'border-slate-200 dark:border-[#eab308]',
    shadow: 'shadow-lg shadow-yellow-500/10 dark:shadow-[0_0_20px_rgba(234,179,8,0.15)]',
    hoverShadow: 'hover:shadow-yellow-500/20 dark:hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]',
    iconBorder: 'border-yellow-100 dark:border-[#eab308]',
    iconShadow: 'dark:shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    iconBg: 'bg-yellow-50 dark:bg-[#eab308]/10',
    iconText: 'text-yellow-600 dark:text-yellow-400',
    cardBg: 'dark:bg-[#0B1120]',
    image: '/mockups/installments-yellow.png'
  },
};

const PILLAR_SLUGS = ['sales', 'inventory', 'storefront', 'installments'];

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const HeroSection = ({ t }) => (
  <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-28">
    <motion.div 
      className="text-center max-w-4xl mx-auto flex flex-col items-center"
      initial="hidden" animate="visible" variants={staggerContainer}
    >
      <motion.h1 variants={fadeInUp} className="text-4xl font-black leading-[1.12] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-[4.5rem]">
        {t('hero.title', 'مستقبل إدارة المتاجر هنا.')}
      </motion.h1>

      <motion.p variants={fadeInUp} className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400 sm:text-xl font-medium">
        {t('hero.subtitle', 'بسّط التشغيل، حسّن التعاون، وتوسّع بسهولة من خلال منصة واحدة ذكية.')}
      </motion.p>

      <motion.div variants={fadeInUp} className="mt-12 flex flex-col justify-center gap-4 sm:flex-row sm:items-center w-full sm:w-auto">
        <Link to="/login?mode=register" className="inline-flex items-center justify-center rounded-full bg-[#00e59b] px-8 py-4 text-base font-black text-slate-950 shadow-[0_0_30px_rgba(0,229,155,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(0,229,155,0.6)] w-full sm:w-auto">
          {t('hero.cta', 'ابدأ حسابك')}
        </Link>
        <Link to="/features" className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-white/20 bg-white/50 dark:bg-transparent backdrop-blur-md px-8 py-4 text-base font-black text-slate-800 dark:text-white transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/10 w-full sm:w-auto">
          {t('hero.learnMore', 'استكشف المزايا')}
        </Link>
      </motion.div>
    </motion.div>

    <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }} className="pointer-events-none mt-24 hidden lg:block">
      <div className="relative mx-auto h-[1px] max-w-5xl bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-500/70 shadow-[0_0_15px_rgba(0,229,155,0.6)]" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-500/70 shadow-[0_0_15px_rgba(0,229,155,0.6)]" />
      </div>
    </motion.div>
  </section>
);

const WorkflowSection = ({ t }) => (
  <motion.section 
    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
    className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-32"
  >
    <motion.div variants={fadeInUp} className="text-center mb-14 max-w-3xl mx-auto">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
        {t('workflow.eyebrow', 'كيف يعمل')}
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        {t('workflow.title', 'من التجهيز إلى النمو في 4 خطوات')}
      </h2>
    </motion.div>

    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((idx) => (
        <motion.div variants={fadeInUp} key={idx} className="rounded-[1.75rem] border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-md p-8 text-start transition-all duration-300 hover:shadow-xl hover:border-emerald-500/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 mb-6">
            <span className="text-lg font-black text-[#00e59b]">{`0${idx + 1}`}</span>
          </div>
          <h3 className="text-xl font-black text-slate-950 dark:text-white mb-3 tracking-tight">
            {t(`workflow.steps.${idx}.title`)}
          </h3>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {t(`workflow.steps.${idx}.text`)}
          </p>
        </motion.div>
      ))}
    </div>
  </motion.section>
);

const PillarsSection = ({ t }) => (
  <motion.section 
    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
    className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-32"
  >
    <motion.div variants={fadeInUp} className="text-center mb-16 max-w-3xl mx-auto">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
        {t('pillars.eyebrow', 'الركائز الأساسية')}
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
        {t('pillars.title', 'من أول فاتورة إلى إدارة التشغيل')}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
        {t('pillars.subtitle', 'جزء يخدم العميل أمامك، وجزء يخدم التشغيل داخل النشاط، وكلاهما يتحركان معًا.')}
      </p>
    </motion.div>

    <div className="grid gap-6 sm:grid-cols-2">
      {PILLAR_SLUGS.map((slug) => {
        const colors = PILLAR_COLORS[slug];
        const Icon = PILLAR_ICONS[slug];

        return (
          <motion.article
            variants={fadeInUp} key={slug}
            className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-500 hover:-translate-y-2 bg-white/70 backdrop-blur-xl ${colors.border} ${colors.shadow} ${colors.hoverShadow} ${colors.cardBg}`}
          >
            <div className="absolute top-8 bottom-8 end-4 sm:end-6 lg:end-10 w-1/2 overflow-hidden rounded-[1rem] pointer-events-none opacity-40 dark:opacity-80 mix-blend-screen transition-opacity duration-500 group-hover:opacity-100 flex items-center justify-end">
              <div className="absolute inset-y-0 start-0 w-24 bg-gradient-to-r from-white dark:from-[#0B1120] to-transparent z-10" />
              <img src={colors.image} alt="Dashboard UI" className="h-full w-auto object-cover object-left opacity-90 brightness-[1.8] contrast-125" />
            </div>

            <div className="relative z-20 flex flex-col h-full min-h-[16rem] p-6 sm:p-8 sm:pe-[40%] text-start">
              <div className={`flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-[1.25rem] border transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3 ${colors.iconBorder} ${colors.iconShadow} ${colors.iconBg} ${colors.iconText}`}>
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
              </div>

              <div className="mt-8 mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-[1.5rem] tracking-tight leading-snug">
                  {t(`pillars.${slug}.title`)}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300 w-full md:w-[90%]">
                  {t(`pillars.${slug}.summary`)}
                </p>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  </motion.section>
);

const PathsSection = ({ t }) => (
  <motion.section 
    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
    className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-32"
  >
    <motion.div variants={fadeInUp} className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1120] p-8 sm:p-12 shadow-2xl shadow-black/5 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div className="max-w-3xl text-start">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          {t('paths.eyebrow', 'ابدأ من الجزء الأقرب لاحتياجك')}
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {t('paths.title', 'اختر المسار الذي يشبه طريقة عمل نشاطك الآن')}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          {t('paths.subtitle', 'إذا كان تركيزك الآن على المبيعات، أو المخزون، أو الأقساط، أو المتجر الإلكتروني، ستجد صفحة تبدأ من نفس الزاوية التي تفكر منها.')}
        </p>
      </div>

      <motion.div variants={staggerContainer} className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {seoLandingCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div variants={fadeInUp} key={card.path}>
              <Link to={card.path} className="group block h-full rounded-[1.75rem] border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-6 text-start transition-all duration-300 hover:-translate-y-1 hover:bg-white dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/15 hover:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="inline-flex rounded-2xl bg-slate-900 dark:bg-white/10 p-3.5 text-white transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{card.eyebrow}</p>
                <h3 className="mt-2.5 text-xl font-black text-slate-950 dark:text-white">{card.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">{card.description}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  </motion.section>
);

const CtaSection = ({ t }) => (
  <motion.section 
    initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp}
    className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-32"
  >
    <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 border border-slate-800 dark:border-white/10 px-6 py-14 text-center text-white shadow-[0_32px_90px_rgba(15,23,42,0.18)] sm:px-12 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,229,155,0.15)_0%,_transparent_70%)] pointer-events-none" />
      
      <div className="relative z-10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#00e59b]">
          {t('finalCta.eyebrow', 'الخطوة التالية')}
        </p>
        <h2 className="mt-5 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl">
          {t('finalCta.title', 'جاهز لتجربة PayQusta؟')}
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-slate-400">
          {t('finalCta.description', 'الواجهة العامة تعرّف العميل بالبراند بسرعة، والمتجر يساعده على الطلب، بينما يظل التشغيل الداخلي مرتبًا لفريقك.')}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
          <Link to="/login?mode=register" className="inline-flex items-center justify-center rounded-full bg-[#00e59b] px-8 py-4 text-base font-black text-slate-950 shadow-[0_0_30px_rgba(0,229,155,0.4)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(0,229,155,0.6)]">
            {t('finalCta.cta', 'أنشئ حسابك')}
          </Link>
          <Link to="/features" className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-black text-white transition-all duration-300 hover:bg-white/10">
            {t('finalCta.explore', 'استكشف المزايا')}
          </Link>
        </div>
      </div>
    </div>
  </motion.section>
);

/* -------------------------------------------------------------------------- */
/*                                MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export default function PublicLandingPage() {
  const { t } = useTranslation('public');

  return (
    <main>
      <HeroSection t={t} />
      {/* Product Marketing Re-sort: How it Works -> Core Pillars -> Use Cases -> CTA */}
      <WorkflowSection t={t} />
      <PillarsSection t={t} />
      <PathsSection t={t} />
      <CtaSection t={t} />
    </main>
  );
}
