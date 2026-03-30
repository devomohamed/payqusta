import React, { useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Pricing = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="bg-v3-bg2 py-24 border-y border-v3-border overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <h2 className="v3-h2 text-v3-text mb-12">{t.pricing.h2}</h2>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className={`text-[13px] font-black uppercase tracking-wider transition-colors ${!isAnnual ? 'text-v3-text' : 'text-v3-text3'}`}>
              {t.pricing.billing.monthly}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-8 bg-brand-gold rounded-full p-1 shadow-inner flex-shrink-0"
              aria-label="Toggle billing period"
            >
              <div
                className="w-6 h-6 bg-v3-bg rounded-full shadow-lg transition-transform duration-300"
                style={{
                  transform: isAnnual
                    ? (lang === 'ar' ? 'translateX(-24px)' : 'translateX(24px)')
                    : 'translateX(0)',
                }}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-black uppercase tracking-wider transition-colors ${isAnnual ? 'text-v3-text' : 'text-v3-text3'}`}>
                {t.pricing.billing.yearly}
              </span>
              <span
                className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest"
                style={{ background: 'rgba(46,204,143,0.10)', border: '1px solid rgba(46,204,143,0.28)', color: '#2ECC8F' }}
              >
                {t.pricing.billing.save}
              </span>
            </div>
          </div>
        </header>

        {/*
          Pricing cards grid:
          Desktop: 3 columns unified bordered shell (gap: 1px).
          Tablet ≤900px: single column, cards stacked, popular card first (order -1).
          Mobile: full-width cards.
        */}
        <div className="pricing-cards-wrap">
          {t.pricing.plans.map((plan, idx) => {
            const isEnterprise = typeof plan.priceMonthly !== 'number';
            const isPopular = !!plan.popular;

            return (
              <div
                key={idx}
                ref={reveal}
                className={`pricing-card reveal relative flex flex-col items-center text-center transition-all duration-500 overflow-hidden ${
                  isPopular ? 'popular-card' : 'bg-v3-bg'
                }`}
                style={isPopular ? { background: 'var(--surface)', boxShadow: '0 0 40px rgba(200,168,75,0.15)' } : {}}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 flex justify-center">
                    <span className="bg-brand-gold text-v3-bg text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-b-xl shadow-lg">
                      {t.pricing.mostPopular}
                    </span>
                  </div>
                )}

                <h3 className="text-v3-text font-black text-xl mb-6 mt-4">{plan.name}</h3>

                {/* Price */}
                <div className="mb-2">
                  <span
                    className="font-black leading-none text-v3-text"
                    style={{ fontSize: isEnterprise ? '1.7rem' : '3rem', fontFamily: 'var(--font-h)', letterSpacing: '-0.025em' }}
                  >
                    {isEnterprise
                      ? (lang === 'ar' ? 'تسعير مخصص' : 'Custom pricing')
                      : (isAnnual ? plan.priceAnnual : plan.priceMonthly)
                    }
                  </span>
                  {!isEnterprise && (
                    <span className="text-v3-text3 text-[12px] font-bold uppercase tracking-widest ms-2">{t.pricing.egp}</span>
                  )}
                </div>

                {/* Annual total row — hidden for enterprise */}
                <div
                  className="h-6 mb-8 transition-all duration-300 overflow-hidden"
                  style={{ opacity: isAnnual && !isEnterprise ? 1 : 0, visibility: isEnterprise ? 'hidden' : 'visible' }}
                >
                  <span className="text-brand-teal text-[12px] font-bold tracking-tight">{plan.annualTotal}</span>
                </div>

                {/* Features list */}
                <div className="w-full flex flex-col gap-4 mb-10 text-start">
                  {plan.features.map(feat => (
                    <div key={feat} className="flex items-center gap-3 text-v3-text2 text-sm">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(46,204,143,0.10)', color: '#2ECC8F' }}
                      >
                        <Check size={12} strokeWidth={4} />
                      </div>
                      {feat}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    if (isEnterprise) {
                      window.open('https://wa.me/201000000000', '_blank');
                    } else {
                      window.location.href = `/login?mode=register&plan=${plan.name}`;
                    }
                  }}
                  className={`btn-v3 w-full py-4 text-[13px] uppercase tracking-widest font-black mt-auto ${
                    isPopular ? 'btn-v3-primary' : 'btn-v3-ghost'
                  }`}
                >
                  {isEnterprise ? (lang === 'ar' ? 'تحدث مع المبيعات' : 'Talk to Sales') : t.pricing.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-v3-text3 text-[12px] opacity-60">
          <CreditCard size={14} />
          <span>{t.ctaSection.sub}</span>
        </div>

      </div>

      {/* Responsive pricing layout via <style> */}
      <style>{`
        /* Desktop: unified bordered grid */
        .pricing-cards-wrap {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background-color: var(--border);
          border: 1px solid var(--border);
          border-radius: 32px;
          overflow: hidden;
        }
        .pricing-card { padding: 40px; }
        .popular-card {
          z-index: 10;
          border-radius: 28px;
          border: 2px solid var(--brand-gold);
          padding: 56px 40px;
          margin: -4px;
        }

        /* Tablet ≤ 900px */
        @media (max-width: 900px) {
          .pricing-cards-wrap {
            grid-template-columns: 1fr;
            background: transparent;
            border: none;
            gap: 14px;
            max-width: 480px;
            margin: 0 auto;
          }
          .pricing-card {
            background: var(--bg) !important;
            border: 1px solid var(--border);
            border-radius: 26px;
            padding: 32px 24px;
          }
          .popular-card {
            border: 2px solid var(--brand-gold) !important;
            border-radius: 26px !important;
            margin: 0 !important;
            order: -1;   /* popular first on mobile */
            transform: none !important;
          }
        }

        /* Mobile ≤ 480px */
        @media (max-width: 480px) {
          .pricing-cards-wrap { max-width: 100%; }
          .pricing-card { padding: 24px 20px; }
        }
      `}</style>
    </section>
  );
};

export default Pricing;
