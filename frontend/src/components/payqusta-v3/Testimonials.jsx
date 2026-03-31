import React from 'react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { homepageCredibilityCopy } from '../../lib/payqusta-v3/homepage-config';

const Testimonials = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const credibilityCopy = homepageCredibilityCopy[lang] || homepageCredibilityCopy.en;

  return (
    <section id="testi" className="py-24 bg-v3-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <header ref={reveal} className="reveal text-center mb-16">
          <h2 className="v3-h2 text-v3-text">{t.testimonials.h2}</h2>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.testimonials.items.map((item, idx) => (
            <div
              key={idx}
              ref={reveal}
              className="reveal stagger-child group relative p-6 md:p-8 bg-v3-surface border border-v3-border rounded-[28px] hover:border-brand-gold/50 shadow-sm hover:shadow-2xl hover:shadow-brand-gold/5 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
              style={{ transitionDelay: `${idx * 0.1}s` }}
            >
              <div
                aria-hidden="true"
                className="absolute top-4 inset-inline-start-5 text-[60px] leading-none pointer-events-none select-none font-serif"
                style={{ color: 'var(--brand-gold)', opacity: 0.12 }}
              >
                "
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-brand-gold/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-gold mb-5">
                {credibilityCopy.testimonials.badge}
              </span>

              <p className="v3-body text-v3-text leading-relaxed mb-7 text-base relative z-10">
                {item.company}
              </p>

              <div className="flex items-center gap-4 border-t border-v3-border pt-5 mt-auto">
                <div className="w-11 h-11 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold font-black text-sm flex-shrink-0">
                  {item.initials}
                </div>
                <div>
                  <h4 className="v3-h3 text-v3-text text-sm mb-0.5">{item.role}</h4>
                  <div className="text-brand-teal text-[11px] font-black uppercase tracking-wider">
                    {credibilityCopy.testimonials.profileLabel}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
