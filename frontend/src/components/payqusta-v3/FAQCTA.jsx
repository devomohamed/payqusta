import React, { useState } from 'react';
import { ChevronDown, ArrowRight, Zap, ShieldCheck, Clock } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/* ── FAQ Section ─────────────────────────────────────────────────────── */
const FrequentlyAskedQuestions = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 bg-v3-bg relative overflow-hidden">
      {/* Background ornament */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <header ref={reveal} className="reveal text-center mb-20">
          <span className="text-brand-gold text-[13px] font-black uppercase tracking-[0.2em] mb-4 block">
            {lang === 'ar' ? 'لديك استفسار؟' : 'HAVE QUESTIONS?'}
          </span>
          <h2 className="v3-h2 text-v3-text">{t.faq.h2}</h2>
        </header>

        <div className="space-y-4">
          {t.faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            const num = (idx + 1).toString().padStart(2, '0');
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
                  className="w-full p-6 md:p-8 flex items-center justify-between text-start gap-4"
                >
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <span className={`text-xl font-black italic flex-shrink-0 transition-colors ${isOpen ? 'text-brand-gold' : 'text-v3-text3 opacity-30 group-hover:opacity-100'}`}>
                      {num}
                    </span>
                    <span className={`font-bold text-[14px] md:text-[17px] transition-colors leading-snug ${isOpen ? 'text-v3-text' : 'text-v3-text2 group-hover:text-v3-text'}`}>
                      {item.q}
                    </span>
                  </div>
                  {/* Arrow — flex-shrink-0 prevents compression */}
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${
                    isOpen ? 'bg-brand-gold text-v3-bg border-brand-gold rotate-180' : 'border-v3-border text-v3-text3 group-hover:border-brand-gold group-hover:text-brand-gold'
                  }`}>
                    <ChevronDown size={18} />
                  </div>
                </button>

                <div
                  className="overflow-hidden transition-all duration-700 ease-in-out"
                  style={{ maxHeight: isOpen ? '240px' : '0' }}
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

/* ── CTA Section ─────────────────────────────────────────────────────── */
const CTASection = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();

  return (
    <section className="py-24 bg-v3-bg2 relative overflow-hidden px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div
          ref={reveal}
          className="reveal relative bg-v3-bg3 border border-brand-gold-bdr rounded-[40px] md:rounded-[56px] p-8 md:p-14 overflow-hidden shadow-2xl group"
        >
          {/* Decorative mesh */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(var(--brand-gold) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="absolute -top-32 w-[600px] h-[600px] bg-brand-gold/10 blur-[140px] rounded-full group-hover:scale-110 transition-transform duration-1000 pointer-events-none" style={{ insetInlineEnd: '-128px' }} />

          <div className="relative z-10 grid lg:grid-cols-5 gap-12 items-center">

            {/* Left Column */}
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[12px] font-black uppercase tracking-wider mb-8">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#C8A84B,#A8832A)', color: '#0D1B2A' }}
                >
                  {lang === 'ar' ? 'ب' : 'P'}
                </div>
                {lang === 'ar' ? 'ابدأ اليوم مجاناً' : 'START FREE TODAY'}
              </span>

              <h2
                className="v3-h2 text-v3-text mb-6 leading-[1.15]"
                dangerouslySetInnerHTML={{ __html: t.ctaSection.h2 }}
              />
              <p className="v3-h3 text-v3-text3 text-lg md:text-xl mb-10 max-w-xl">{t.ctaSection.h2Alt}</p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
                <button
                  onClick={() => window.location.href = '/login?mode=register'}
                  className="btn-v3 btn-v3-primary h-14 md:h-16 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto shadow-2xl shadow-brand-gold/20 flex items-center justify-center gap-2"
                >
                  {t.ctaSection.primary}
                  <ArrowRight size={18} className="ms-1 flex-shrink-0" />
                </button>
                <button
                  onClick={() => window.open('https://wa.me/201000000000', '_blank')}
                  className="btn-v3 btn-v3-secondary h-14 md:h-16 px-8 md:px-10 text-base md:text-lg w-full sm:w-auto backdrop-blur-sm flex items-center justify-center"
                >
                  {t.ctaSection.secondary}
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-v3-bg3 bg-v3-surface flex items-center justify-center text-[10px] font-black text-v3-text shadow-sm overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i+10}`} alt="user" className="w-full h-full object-cover opacity-60" />
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full border-2 border-brand-gold bg-brand-gold flex items-center justify-center text-[10px] font-black text-v3-bg shadow-sm">+5k</div>
                </div>
                <div className="text-v3-text3 text-[13px] font-bold">
                  <span className="text-v3-text">{lang === 'ar' ? 'انضم لـ +5000 تاجر' : 'Join +5000 merchants'}</span><br/>
                  <span className="opacity-60">{lang === 'ar' ? 'يعتمدون على بيكوستا يومياً' : 'rely on PayQusta daily'}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Feature list */}
            <div className="lg:col-span-2">
              <div className="bg-v3-bg/40 backdrop-blur-md rounded-[28px] border border-v3-border p-6 md:p-8 space-y-6">
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
                          {lang === 'ar' ? 'لا يتطلب أي مهارات تقنية، ابدأ الآن في أقل من دقيقة.' : 'No technical skills required, start now in under a minute.'}
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

      {/* Mobile CTA fixes */}
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
