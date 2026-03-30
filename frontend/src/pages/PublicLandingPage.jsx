import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*                                ANIMATIONS                                  */
/* -------------------------------------------------------------------------- */

const revealVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

/* -------------------------------------------------------------------------- */
/*                                SUBCOMPONENTS                               */
/* -------------------------------------------------------------------------- */

const HeroSection = ({ t, isRtl }) => {
  return (
    <section className="hero relative overflow-hidden bg-[color:var(--c-bg)] py-24 sm:py-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(13,155,122,1) 1px, transparent 1px), linear-gradient(90deg, rgba(13,155,122,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
        {/* Orb 1 */}
        <div 
          className="absolute -left-[100px] -top-[100px] h-[500px] w-[500px] rounded-full blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.12) 0%, transparent 70%)' }}
        />
        {/* Orb 2 */}
        <div 
          className="absolute -right-[100px] -bottom-[80px] h-[400px] w-[400px] rounded-full blur-[60px]"
          style={{ background: 'radial-gradient(circle, rgba(13,155,122,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          
          {/* Left Column (Content) */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col text-start"
          >
            {/* Eyebrow Pill */}
            <motion.div variants={revealVariants} className="inline-flex items-center self-start rounded-full border border-[color:var(--c-teal-md)] bg-[color:var(--c-teal-lt)] px-4 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--c-teal)] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--c-teal)]"></span>
              </span>
              <span className="ms-2 font-display text-[13px] font-[600] text-[color:var(--c-teal)]">
                {t('hero.eyebrow')}
              </span>
            </motion.div>

            {/* H1 Title */}
            <motion.h1 
              variants={revealVariants}
              className="mt-8 font-display text-[clamp(2.25rem,4.5vw,3.625rem)] font-[900] leading-[1.18] text-[color:var(--c-navy)]"
            >
              {isRtl ? (
                <>
                  برنامج <span className="relative text-[color:var(--c-teal)]">نقطة البيع<span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-sm bg-gradient-to-r from-[color:var(--c-teal)] to-[color:var(--c-accent)]"></span></span> <br /> 
                  والمتجر الإلكتروني <br /> 
                  في منصة واحدة
                </>
              ) : (
                <>
                  Unified <span className="relative text-[color:var(--c-teal)]">POS<span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-sm bg-gradient-to-r from-[color:var(--c-teal)] to-[color:var(--c-accent)]"></span></span> <br /> 
                  & E-commerce <br /> 
                  Platform
                </>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p 
              variants={revealVariants}
              className="mt-8 max-w-[500px] font-body text-[17px] leading-[1.85] text-[color:var(--c-text2)]"
            >
              {t('hero.description')}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={revealVariants} className="mt-10 flex flex-wrap gap-4">
              <Link 
                to="/login?mode=register"
                className="group flex items-center gap-2 rounded-[var(--r-md)] bg-[color:var(--c-accent)] px-7 py-3.5 font-display text-[15px] font-[700] text-[color:var(--c-navy)] shadow-[var(--shadow-teal)] transition-all hover:translate-y-[-2px] hover:bg-[#00d494] hover:shadow-[0_12px_40px_rgba(0,229,160,0.35)]"
              >
                {t('hero.cta')}
                <svg className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <button className="flex items-center gap-2 rounded-[var(--r-md)] border-[1.5px] border-[color:var(--c-border2)] bg-[color:var(--c-surface)] px-7 py-3.5 font-display text-[15px] font-[600] text-[color:var(--c-navy)] transition-all hover:border-[color:var(--c-teal)] hover:bg-[color:var(--c-teal-lt)] hover:text-[color:var(--c-teal)]">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--c-teal-lt)] text-[color:var(--c-teal)]">
                  <div className="h-0 w-0 border-y-[4px] border-y-transparent border-s-[7px] border-s-current ms-0.5" />
                </div>
                {t('hero.demo')}
              </button>
            </motion.div>

            {/* Micro-copy */}
            <motion.div variants={revealVariants} className="mt-8 flex flex-wrap gap-6">
              {t('hero.microCopy', { returnObjects: true })?.map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--c-teal-lt)]">
                    <svg className="h-2.5 w-2.5 text-[color:var(--c-teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="font-body text-[12px] text-[color:var(--c-text3)]">{text}</span>
                </div>
              ))}
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              variants={revealVariants}
              className="mt-12 flex flex-wrap gap-12 border-t border-[color:var(--c-border)] pt-8"
            >
              {Object.entries(t('hero.stats', { returnObjects: true }) || {}).map(([key, stat]) => (
                <div key={key}>
                  <div className="font-display text-[28px] font-[800] text-[color:var(--c-teal)]">{stat.value}</div>
                  <div className="font-body text-[13px] text-[color:var(--c-text3)]">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column (Visual) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex justify-center"
          >
            {/* Main Dashboard Card */}
            <div className="relative z-10 w-full max-w-[420px] rounded-[var(--r-xl)] bg-[color:var(--c-navy)] p-7 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between">
                <span className="font-display text-[15px] font-[900] text-white">PayQuota</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,229,160,0.3)] bg-[rgba(0,229,160,0.15)] px-3 py-1 text-[11px] font-bold text-[color:var(--c-accent)]">
                   <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--c-accent)]"></span>
                   {t('hero.card.live')}
                </span>
              </div>

              {/* Metric Card */}
              <div className="mt-8 rounded-[var(--r-md)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] p-5">
                <div className="text-[12px] text-[rgba(255,255,255,0.5)]">{t('hero.card.salesTitle')}</div>
                <div className="mt-1 flex items-end justify-between">
                   <div className="font-display text-[22px] font-[800] text-white">{t('hero.card.salesValue')}</div>
                   <div className="rounded-md bg-[rgba(0,229,160,0.12)] px-2 py-0.5 text-[12px] font-[700] text-[color:var(--c-accent)]">{t('hero.card.salesChange')}</div>
                </div>

                {/* Bar Chart Mockup */}
                <div className="mt-6 flex h-[60px] items-end gap-1.5">
                   {[40, 55, 45, 70, 60, 90, 75].map((h, i) => (
                     <motion.div 
                       key={i}
                       initial={{ scaleY: 0 }}
                       animate={{ scaleY: 1 }}
                       transition={{ duration: 1, delay: 0.5 + (i * 0.05), ease: "easeOut" }}
                       style={{ height: `${h}%` }}
                       className={`w-full rounded-t-[4px] ${i === 5 ? 'bg-[color:var(--c-accent)]' : 'bg-[rgba(255,255,255,0.12)]'}`}
                     />
                   ))}
                </div>
              </div>

              <div className="my-6 h-[1px] bg-[rgba(255,255,255,0.08)]" />

              {/* Branch Data */}
              <div className="flex flex-col gap-4">
                {t('hero.card.branches', { returnObjects: true })?.map((branch, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-[color:var(--c-accent)]' : i === 1 ? 'bg-blue-500' : 'bg-amber-500'}`} />
                       <span className="text-[13px] text-white/70">{branch.name}</span>
                    </div>
                    <span className="font-display text-[13px] font-bold text-white">{branch.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Cards */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -top-6 ${isRtl ? 'left-4' : 'right-4'} z-20 flex gap-3 rounded-[var(--r-md)] border border-[color:var(--c-border)] bg-[color:var(--c-surface)] p-3.5 shadow-[var(--shadow-md)]`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--c-teal-lt)] text-[20px]">📦</div>
              <div>
                 <div className="text-[11px] text-[color:var(--c-text3)]">{t('hero.card.inventory.label')}</div>
                 <div className="font-display text-[13px] font-bold text-[color:var(--c-navy)]">{t('hero.card.inventory.value')}</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -bottom-6 ${isRtl ? 'right-0' : 'left-0'} z-20 flex gap-3 rounded-[var(--r-md)] border border-[color:var(--c-border)] bg-[color:var(--c-surface)] p-3.5 shadow-[var(--shadow-md)]`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-[20px]">💳</div>
              <div>
                 <div className="text-[11px] text-[color:var(--c-text3)]">{t('hero.card.installments.label')}</div>
                 <div className="font-display text-[13px] font-bold text-[color:var(--c-navy)]">{t('hero.card.installments.value')}</div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

const TrustBar = ({ t }) => {
  return (
     <div className="trust-bar border-y border-[color:var(--c-border)] bg-[color:var(--c-surface)] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
           <div className="font-display text-[12px] font-[600] uppercase tracking-[0.08em] text-[color:var(--c-text3)]">
              {t('trust.label')}
           </div>
           
           <div className="flex flex-wrap items-center gap-8 md:gap-12">
              {t('trust.brands', { returnObjects: true })?.map((brand, i) => (
                <div key={i} className="font-display text-[14px] font-[700] text-[color:var(--c-text3)] opacity-60 transition-all hover:text-[color:var(--c-navy)] hover:opacity-100">
                  {brand}
                </div>
              ))}
           </div>

           <div className="flex items-center gap-2">
              <div className="flex text-[color:var(--c-amber)]">★★★★★</div>
              <div className="font-display text-[13px] font-[600] text-[color:var(--c-text2)]">
                {t('trust.rating')}
              </div>
           </div>
        </div>
     </div>
  );
};

const HowItWorks = ({ t, isRtl }) => {
  return (
    <section className="how-it-works relative bg-[color:var(--c-bg)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
          className="text-center"
        >
          <motion.div variants={revealVariants} className="font-display text-[14px] font-[600] uppercase tracking-[0.08em] text-[color:var(--c-teal)]">
            {t('workflow.eyebrow')}
          </motion.div>
          <motion.h2 variants={revealVariants} className="mt-4 font-display text-[32px] font-[900] tracking-tight text-[color:var(--c-navy)] sm:text-[40px]">
            {t('workflow.title')}
          </motion.h2>
        </motion.div>

        <div className="relative mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-10 left-[12%] right-[12%] z-0 hidden h-[1px] bg-gradient-to-r from-[color:var(--c-teal-md)] via-[color:var(--c-teal)] to-[color:var(--c-teal-md)] lg:block" />

          {t('workflow.steps', { returnObjects: true })?.map((step, i) => (
            <motion.div 
              key={i}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
              className="relative z-10 rounded-[var(--r-lg)] border border-[color:var(--c-border)] bg-[color:var(--c-surface)] p-8 transition-all hover:-translate-y-1 hover:border-[color:var(--c-teal-md)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--c-teal)] font-display text-[18px] font-[800] text-white shadow-[0_4px_16px_rgba(13,155,122,0.35)]">
                {step.number}
              </div>
              <div className="mt-6 text-[24px]">
                {i === 0 ? '📝' : i === 1 ? '🏪' : i === 2 ? '🛒' : '📈'}
              </div>
              <h3 className="mt-4 font-display text-[18px] font-[700] text-[color:var(--c-navy)]">
                {step.title}
              </h3>
              <p className="mt-3 font-body text-[14px] leading-relaxed text-[color:var(--c-text2)]">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Features = ({ t, isRtl }) => {
  const pillars = ['pos', 'inventory', 'installments', 'store'];
  const colors = {
    pos: 'teal',
    inventory: 'amber',
    installments: 'blue',
    store: 'purple'
  };
  const icons = { pos: '🏪', inventory: '📦', installments: '💳', store: '🛒' };

  return (
    <section className="features bg-[color:var(--c-surface)] py-24 sm:py-32" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {pillars.map((key) => (
            <motion.div 
               key={key}
               initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
               className="group relative overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--c-border)] bg-[color:var(--c-bg)] p-8 transition-all hover:-translate-y-1 hover:border-[color:var(--c-teal-md)] hover:shadow-[var(--shadow-md)]"
            >
               <div className={`flex h-14 w-14 items-center justify-center rounded-[var(--r-md)] border text-[24px] ${
                 key === 'pos' ? 'border-[color:var(--c-teal-md)] bg-[color:var(--c-teal-lt)]' : 
                 key === 'inventory' ? 'border-amber-200 bg-amber-50' : 
                 key === 'installments' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'
               }`}>
                 {icons[key]}
               </div>
               
               <h3 className="mt-6 font-display text-[20px] font-[700] text-[color:var(--c-navy)]">
                 {t(`pillars.${key}.title`)}
               </h3>
               <p className="mt-4 font-body text-[15px] leading-relaxed text-[color:var(--c-text2)]">
                 {t(`pillars.${key}.body`)}
               </p>

               <div className="mt-6 flex items-center justify-between">
                  <div className="rounded-full border border-[color:var(--c-border)] bg-[color:var(--c-surface)] px-3 py-1 font-display text-[13px] font-[700] text-[color:var(--c-teal)]">
                    {t(`pillars.${key}.stat`)}
                  </div>
                  <div className="flex gap-2">
                    {t(`pillars.${key}.tags`, { returnObjects: true })?.map((tag, i) => (
                      <span key={i} className="rounded-full border border-[color:var(--c-teal-md)] bg-[color:var(--c-teal-lt)] px-3 py-0.5 font-body text-[12px] font-[600] text-[color:var(--c-teal)]">
                        {tag}
                      </span>
                    ))}
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const WhyPayQuota = ({ t, isRtl }) => {
  return (
    <section className="why-us relative overflow-hidden bg-[color:var(--c-navy)] py-24 sm:py-32" id="why-us">
      {/* Background Orb */}
      <div 
        className="absolute -left-[10%] top-[10%] h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.1) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          
          {/* Left: Content */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="text-start"
          >
            <motion.div variants={revealVariants} className="inline-flex rounded-full border border-[rgba(0,229,160,0.25)] bg-[rgba(0,229,160,0.1)] px-4 py-1.5 font-display text-[13px] font-[600] text-[color:var(--c-accent)]">
               {t('whyPayQuota.eyebrow')}
            </motion.div>
            <motion.h2 variants={revealVariants} className="mt-6 font-display text-[32px] font-[900] leading-tight text-white sm:text-[40px]">
               {t('whyPayQuota.title')}
            </motion.h2>
            <motion.p variants={revealVariants} className="mt-4 font-body text-[16px] leading-[1.65] text-white/60">
               {t('whyPayQuota.subtitle')}
            </motion.p>

            <div className="mt-10 grid gap-6">
               {t('whyPayQuota.items', { returnObjects: true })?.map((item, i) => (
                 <motion.div key={i} variants={revealVariants} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(0,229,160,0.3)] bg-[rgba(0,229,160,0.15)] text-[color:var(--c-accent)] font-bold">✓</div>
                    <div>
                       <h4 className="font-display text-[15px] font-[700] text-white">{item.title}</h4>
                       <p className="mt-1 font-body text-[14px] leading-relaxed text-white/55">{item.body}</p>
                    </div>
                 </motion.div>
               ))}
            </div>
          </motion.div>

          {/* Right: Comparison Table */}
          <motion.div 
             initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
             className="rounded-[var(--r-xl)] border border-white/10 bg-white/5 p-1 shadow-2xl"
          >
             <div className="overflow-hidden rounded-[calc(var(--r-xl)-4px)]">
                <table className="w-full text-[14px]">
                   <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                         <th className="py-4 ps-6 text-start font-display text-[12px] font-bold uppercase tracking-wider text-white/40">{t('whyPayQuota.comparison.label')}</th>
                         <th className="py-4 text-center font-display text-[12px] font-bold uppercase tracking-wider text-white/40">{t('whyPayQuota.comparison.competitors')}</th>
                         <th className="py-4 pe-6 text-center font-display text-[12px] font-bold uppercase tracking-wider text-[color:var(--c-accent)]">{t('whyPayQuota.comparison.payQuota')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/10">
                      {t('whyPayQuota.comparison.rows', { returnObjects: true })?.map((row, i) => (
                        <tr key={i} className="transition-colors hover:bg-white/5">
                           <td className="py-4 ps-6 text-start font-body font-[600] text-white/80">{row}</td>
                           <td className="py-4 text-center text-[18px] opacity-25">✗</td>
                           <td className="py-4 pe-6 text-center text-[18px] font-bold text-[color:var(--c-accent)]">✓</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

const Pricing = ({ t, isRtl }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  return (
    <section className="pricing bg-[color:var(--c-bg)] py-24 sm:py-32" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}>
          <div className="font-display text-[14px] font-[600] uppercase tracking-[0.08em] text-[color:var(--c-teal)]">
            {t('pricing.eyebrow')}
          </div>
          <h2 className="mt-4 font-display text-[32px] font-[900] tracking-tight text-[color:var(--c-navy)] sm:text-[40px]">
            {t('pricing.title')}
          </h2>
        </motion.div>

        {/* Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="relative flex rounded-full border border-[color:var(--c-border)] bg-[color:var(--c-surface)] p-1">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 rounded-full px-6 py-2 font-display text-[14px] font-[600] transition-all ${billingCycle === 'monthly' ? 'text-white' : 'text-[color:var(--c-text2)]'}`}
            >
              {t('pricing.toggle.monthly')}
            </button>
            <button 
              onClick={() => setBillingCycle('annual')}
              className={`relative z-10 rounded-full px-6 py-2 font-display text-[14px] font-[600] transition-all ${billingCycle === 'annual' ? 'text-white' : 'text-[color:var(--c-text2)]'}`}
            >
              {t('pricing.toggle.annual')}
            </button>
            <motion.div 
               animate={{ x: billingCycle === 'monthly' ? (isRtl ? '100%' : '0%') : (isRtl ? '0%' : '100%') }}
               className="absolute top-1 bottom-1 start-1 w-[calc(50%-4px)] rounded-full bg-[color:var(--c-navy)]"
            />
          </div>
          {billingCycle === 'annual' && (
            <div className="ms-4 flex items-center gap-1.5 rounded-full bg-[color:var(--c-teal-lt)] px-3 py-1 font-display text-[12px] font-[700] text-[color:var(--c-teal)] scale-95">
               {t('pricing.toggle.save')}
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {['starter', 'growth', 'enterprise'].map((planKey) => {
            const plan = t(`pricing.plans.${planKey}`, { returnObjects: true });
            const isFeatured = planKey === 'growth';

            return (
              <motion.div 
                 key={planKey}
                 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
                 className={`relative flex flex-col rounded-[var(--r-xl)] border p-8 text-start transition-all ${
                   isFeatured ? 'border-[color:var(--c-teal)] bg-[color:var(--c-surface)] shadow-[var(--shadow-lg)] scale-105 z-10' : 'border-[color:var(--c-border)] bg-[color:var(--c-surface)] shadow-[var(--shadow-sm)]'
                 }`}
              >
                 {isFeatured && (
                   <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--c-teal)] px-4 py-1 font-display text-[12px] font-[700] text-white">
                      {plan.badge}
                   </div>
                 )}
                 <h3 className="font-display text-[18px] font-[700] text-[color:var(--c-navy)]">{plan.name}</h3>
                 <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-[36px] font-[900] text-[color:var(--c-navy)]">
                       {planKey === 'enterprise' ? plan.price.monthly : plan.price[billingCycle]}
                    </span>
                    {planKey !== 'enterprise' && <span className="font-body text-[14px] text-[color:var(--c-text3)]">ر.س / {t('pricing.toggle.monthly')}</span>}
                 </div>
                 <p className="mt-2 font-body text-[13px] text-[color:var(--c-text3)]">{plan.period}</p>

                 <div className="mt-8 flex flex-col gap-4">
                    {plan.features?.map((feat, i) => (
                      <div key={i} className="flex items-center gap-3">
                         <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--c-teal-lt)] text-[color:var(--c-teal)]">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                         </div>
                         <span className="font-body text-[14px] text-[color:var(--c-text2)]">{feat}</span>
                      </div>
                    ))}
                 </div>

                 <div className="mt-auto pt-10">
                    <Link 
                      to="/login?mode=register"
                      className={`block w-full rounded-[var(--r-md)] py-4 text-center font-display text-[15px] font-[700] transition-all ${
                        isFeatured 
                          ? 'bg-[color:var(--c-teal)] text-white shadow-[var(--shadow-teal)] hover:bg-[color:var(--c-navy)]' 
                          : 'border-[1.5px] border-[color:var(--c-border2)] bg-transparent text-[color:var(--c-navy)] hover:border-[color:var(--c-teal)] hover:bg-[color:var(--c-teal-lt)]'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                 </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Testimonials = ({ t, isRtl }) => {
  const gradients = [
    'from-[#0D9B7A] to-[#00E5A0]',
    'from-[#3B82F6] to-[#8B5CF6]',
    'from-[#F59E0B] to-[#EF4444]'
  ];

  return (
    <section className="testimonials bg-[color:var(--c-surface)] py-24 sm:py-32" id="testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="font-display text-[14px] font-[600] uppercase tracking-[0.08em] text-[color:var(--c-teal)]">
            {t('testimonials.eyebrow')}
          </div>
          <h2 className="mt-4 font-display text-[32px] font-[900] tracking-tight text-[color:var(--c-navy)] sm:text-[40px]">
             {t('testimonials.title')}
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {t('testimonials.items', { returnObjects: true })?.map((item, i) => (
             <motion.div 
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
                className="rounded-[var(--r-xl)] border border-[color:var(--c-border)] bg-[color:var(--c-bg)] p-8 transition-all hover:border-[color:var(--c-teal-md)] hover:shadow-[var(--shadow-md)]"
             >
                <div className="flex gap-1 text-[color:var(--c-amber)] text-[14px] tracking-wider">★★★★★</div>
                <p className="mt-6 font-body text-[15px] italic leading-[1.8] text-[color:var(--c-text2)]">
                   "{item.quote}"
                </p>
                <div className="mt-8 flex items-center gap-4">
                   <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${gradients[i]} font-display text-[16px] font-[800] text-white`}>
                      {item.initials}
                   </div>
                   <div>
                      <div className="font-display text-[14px] font-[700] text-[color:var(--c-navy)]">{item.name}</div>
                      <div className="font-body text-[12px] text-[color:var(--c-text3)]">{item.role}</div>
                   </div>
                </div>
             </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Faq = ({ t, isRtl }) => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="faq bg-[color:var(--c-bg)] py-24 sm:py-32" id="faq">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-20 lg:grid-cols-[1fr,2fr]">
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}>
            <div className="font-display text-[14px] font-[600] uppercase tracking-[0.08em] text-[color:var(--c-teal)]">
               {t('faq.eyebrow')}
            </div>
            <h2 className="mt-4 font-display text-[32px] font-[900] tracking-tight text-[color:var(--c-navy)]">
               {t('faq.title')}
            </h2>
            <div className="mt-10 flex flex-col gap-4">
               <button className="rounded-full bg-[color:var(--c-teal)] px-6 py-3 font-display text-[14px] font-[700] text-white shadow-[var(--shadow-teal)] hover:bg-[color:var(--c-navy)]">
                  {t('faq.supportCta')}
               </button>
               <button className="rounded-full border border-[color:var(--c-border)] bg-[color:var(--c-surface)] px-6 py-3 font-display text-[14px] font-[700] text-[color:var(--c-navy)] hover:bg-[color:var(--c-teal-lt)] hover:text-[color:var(--c-teal)]">
                  {t('faq.helpCenter')}
               </button>
            </div>
          </motion.div>

          <div className="flex flex-col gap-2">
             {t('faq.items', { returnObjects: true })?.map((item, i) => (
               <motion.div 
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
                  className="overflow-hidden rounded-[var(--r-md)] border border-[color:var(--c-border)] bg-[color:var(--c-surface)]"
               >
                  <button 
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="flex w-full items-center justify-between p-6 text-start"
                  >
                    <span className="font-display text-[16px] font-[700] text-[color:var(--c-navy)]">{item.q}</span>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--c-teal-lt)] text-[color:var(--c-teal)] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}>
                       ▾
                    </div>
                  </button>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                      >
                         <div className="px-6 pb-6 font-body text-[15px] leading-relaxed text-[color:var(--c-text2)] border-t border-[color:var(--c-border)] pt-4">
                            {item.a}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </motion.div>
             ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const CtaBanner = ({ t, isRtl }) => {
  return (
    <section className="cta-banner relative bg-[color:var(--c-surface)] py-20 px-4 sm:px-6 lg:px-8">
       <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariants}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--r-xl)] bg-[color:var(--c-navy)] py-16 px-8 text-center sm:py-20 sm:px-16"
       >
          {/* Decorative Orb */}
          <div 
             className="absolute top-0 left-1/2 -translate-x-1/2 h-[200px] w-full max-w-[500px] rounded-full blur-[80px]"
             style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.12) 0%, transparent 70%)' }}
          />

          <h2 className="relative z-10 font-display text-[clamp(28px,3.5vw,44px)] font-[900] leading-tight text-white">
             {isRtl ? (
               <>أدر تجارتك بشكل <span className="text-[color:var(--c-accent)]">أذكى</span> اليوم</>
             ) : (
               <>Manage Your Business <span className="text-[color:var(--c-accent)]">Smarter</span> Today</>
             )}
          </h2>
          <p className="relative z-10 mt-6 font-body text-[16px] text-white/60">
             {t('ctaBanner.subtitle')}
          </p>

          <div className="relative z-10 mt-10 flex flex-wrap justify-center gap-4">
             <Link 
               to="/login?mode=register"
               className="rounded-full bg-[color:var(--c-accent)] px-8 py-4 font-display text-[15px] font-[700] text-[color:var(--c-navy)] shadow-[0_8px_32px_rgba(0,229,160,0.35)] transition-all hover:translate-y-[-2px] hover:bg-[#00d494]"
             >
                {t('ctaBanner.cta')}
             </Link>
             <button className="rounded-full border border-white/20 px-8 py-4 font-display text-[15px] font-[600] text-white transition-all hover:bg-white/10">
                {t('ctaBanner.demo')}
             </button>
          </div>

          <div className="relative z-10 mt-8 font-body text-[12px] text-[rgba(255,255,255,0.35)]">
             {t('ctaBanner.microCopy')}
          </div>
       </motion.div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export default function PublicLandingPage() {
  const { t, i18n } = useTranslation('public');
  const isRtl = i18n.language === 'ar';

  return (
    <div className="landing-page font-body">
      <HeroSection t={t} isRtl={isRtl} />
      <TrustBar t={t} />
      <HowItWorks t={t} isRtl={isRtl} />
      <Features t={t} isRtl={isRtl} />
      <WhyPayQuota t={t} isRtl={isRtl} />
      <Pricing t={t} isRtl={isRtl} />
      <Testimonials t={t} isRtl={isRtl} />
      <Faq t={t} isRtl={isRtl} />
      <CtaBanner t={t} isRtl={isRtl} />
    </div>
  );
}


