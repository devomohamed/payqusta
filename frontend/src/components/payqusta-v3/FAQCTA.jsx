import React, { useRef, useState } from 'react';
import { ChevronDown, ArrowRight, Zap, ShieldCheck, Clock } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { publicHomepageActions } from '../../lib/payqusta-v3/public-links';
import { homepageCredibilityCopy, homepageCtaProofAvatars, homepageFinalCtaMessaging } from '../../lib/payqusta-v3/homepage-config';

const FrequentlyAskedQuestions = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(0);
  const panelRefs = useRef({});

  return (
    <section className="py-24 bg-v3-bg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[380px] h-[380px] bg-brand-gold/5 blur-[84px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <header ref={reveal} className="reveal text-center mb-20">
          <span className="text-brand-gold text-[13px] font-black uppercase tracking-[0.2em] mb-4 block">
            {lang === 'ar' ? '\u0644\u062f\u064a\u0643 \u0627\u0633\u062a\u0641\u0633\u0627\u0631\u061f' : 'HAVE QUESTIONS?'}
          </span>
          <h2 className="v3-h2 text-v3-text">{t.faq.h2}</h2>
        </header>

        <div className="space-y-4">
          {t.faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            const num = (idx + 1).toString().padStart(2, '0');
            const triggerId = `homepage-faq-trigger-${idx}`;
            const panelId = `homepage-faq-panel-${idx}`;
            return (
              <div
                key={idx}
                ref={reveal}
                className={`reveal group border rounded-3xl transition-all duration-500 ${
                  isOpen ? 'bg-v3-bg2 border-brand-gold/30 shadow-xl' : 'bg-transparent border-v3-border hover:border-brand-gold/30'
                }`}
                style={{ transitionDelay: `${idx * 0.05}s` }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  id={triggerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full p-6 md:p-8 flex items-center justify-between text-start gap-4"
                >
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <span
                      className={`text-xl font-black italic flex-shrink-0 transition-colors ${
                        isOpen ? 'text-brand-gold' : 'text-v3-text3 opacity-30 group-hover:opacity-100'
                      }`}
                    >
                      {num}
                    </span>
                    <span
                      className={`font-bold text-[14px] md:text-[17px] transition-colors leading-snug ${
                        isOpen ? 'text-v3-text' : 'text-v3-text2 group-hover:text-v3-text'
                      }`}
                    >
                      {item.q}
                    </span>
                  </div>
                  <div
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${
                      isOpen ? 'bg-brand-gold text-v3-bg border-brand-gold rotate-180' : 'border-v3-border text-v3-text3 group-hover:border-brand-gold group-hover:text-brand-gold'
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                <div
                  id={panelId}
                  ref={(node) => {
                    if (node) {
                      panelRefs.current[panelId] = node;
                    } else {
                      delete panelRefs.current[panelId];
                    }
                  }}
                  role="region"
                  aria-labelledby={triggerId}
                  className="overflow-hidden transition-all duration-700 ease-in-out"
                  style={{ maxHeight: isOpen ? `${panelRefs.current[panelId]?.scrollHeight || 0}px` : '0px' }}
                >
                  <div className="px-6 pb-6 pt-0 md:px-8 md:pb-8 md:ps-[86px]">
                    <p className="v3-body text-v3-text2 leading-relaxed text-sm md:text-base max-w-2xl">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const proofAvatars = homepageCtaProofAvatars[lang] || homepageCtaProofAvatars.en;
  const credibilityCopy = homepageCredibilityCopy[lang] || homepageCredibilityCopy.en;
  const finalCtaCopy = homepageFinalCtaMessaging[lang] || homepageFinalCtaMessaging.en;

  return (
    <section className="py-24 bg-v3-bg2 relative overflow-hidden px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div
          ref={reveal}
          className="reveal relative bg-v3-bg3 border border-brand-gold-bdr rounded-[40px] md:rounded-[56px] p-8 md:p-14 overflow-hidden shadow-2xl group"
        >
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(var(--brand-gold) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="absolute -top-24 w-[420px] h-[420px] bg-brand-gold/8 blur-[88px] rounded-full group-hover:scale-105 transition-transform duration-1000 pointer-events-none" style={{ insetInlineEnd: '-96px' }} />

          <div className="relative z-10 grid lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[12px] font-black uppercase tracking-wider mb-8">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0D9B7A,#5C67E6)', color: '#FFFFFF' }}
                >
                  {lang === 'ar' ? '\u0628' : 'P'}
                </div>
                {finalCtaCopy.badge}
              </span>

              <h2
                className="v3-h2 text-v3-text mb-6 leading-[1.15]"
                dangerouslySetInnerHTML={{ __html: t.ctaSection.h2 }}
              />
              <p className="v3-h3 text-v3-text3 text-lg md:text-xl mb-10 max-w-xl">{t.ctaSection.h2Alt}</p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
                <button
                  onClick={() => window.location.assign(publicHomepageActions.registerPath)}
                  className="btn-v3 btn-v3-primary h-14 md:h-16 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto shadow-2xl shadow-brand-gold/20 flex items-center justify-center gap-2"
                >
                  {t.ctaSection.primary}
                  <ArrowRight size={18} className="ms-1 flex-shrink-0" />
                </button>
                <button
                  onClick={() => window.location.assign(publicHomepageActions.contactSalesPath)}
                  className="btn-v3 btn-v3-secondary h-14 md:h-16 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto flex items-center justify-center"
                >
                  {t.ctaSection.secondary}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {proofAvatars.map((avatar, idx) => (
                    <div
                      key={idx}
                      className="w-9 h-9 rounded-full border-2 border-v3-bg3 bg-v3-surface flex items-center justify-center text-[10px] font-black text-v3-text shadow-sm"
                    >
                      {avatar}
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full border-2 border-brand-gold bg-brand-gold flex items-center justify-center text-[9px] font-black text-v3-bg shadow-sm uppercase">
                    {credibilityCopy.cta.badge}
                  </div>
                </div>
                <div className="text-v3-text3 text-[13px] font-bold">
                  <span className="text-v3-text">{credibilityCopy.cta.title}</span>
                  <br />
                  <span className="opacity-60">{credibilityCopy.cta.note}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-v3-bg/65 rounded-[28px] border border-v3-border p-6 md:p-8 space-y-6">
                {t.ctaSection.features?.map((item, idx) => {
                  const Icon = item.icon === 'Zap' ? Zap : item.icon === 'ShieldCheck' ? ShieldCheck : Clock;
                  return (
                    <div key={idx} className="flex items-start gap-4 group/item">
                      <div className="w-11 h-11 rounded-2xl bg-v3-surface border border-v3-border flex items-center justify-center text-brand-gold group-hover/item:bg-brand-gold group-hover/item:text-v3-bg transition-all shadow-sm flex-shrink-0">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className="v3-h3 text-[15px] mb-1 group-hover/item:text-brand-gold transition-colors">{item.text}</h4>
                        <p className="text-v3-text3 text-[12px] leading-relaxed opacity-70">
                          {lang === 'ar'
                            ? '\u0644\u0627 \u064a\u062a\u0637\u0644\u0628 \u0623\u064a \u0645\u0647\u0627\u0631\u0627\u062a \u062a\u0642\u0646\u064a\u0629\u060c \u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646 \u0641\u064a \u0623\u0642\u0644 \u0645\u0646 \u062f\u0642\u064a\u0642\u0629.'
                            : 'No technical skills required, start now in under a minute.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .cta-note { font-size: 11px; }
        }
        @media (max-width: 480px) {
          .cta-note { font-size: 11px; }
        }
      `}</style>
    </section>
  );
};

export { FrequentlyAskedQuestions as FAQ, CTASection as CTA };
