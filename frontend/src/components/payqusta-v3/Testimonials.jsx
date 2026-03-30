import React from 'react';
import { Star } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Testimonials = () => {
  const { t } = usePayQusta();
  const reveal = useScrollReveal();

  return (
    <section id="testi" className="py-24 bg-v3-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <h2 className="v3-h2 text-v3-text">{t.testimonials.h2}</h2>
        </header>

        {/*
          Responsive grid:
          ≥1024px → 3 columns
          640–1023px → 2 columns
          <640px → 1 column
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.testimonials.items.map((item, idx) => (
            <div
              key={idx}
              ref={reveal}
              className="reveal stagger-child group relative p-6 md:p-8 bg-v3-surface border border-v3-border rounded-[28px] hover:border-brand-gold/50 shadow-sm hover:shadow-2xl hover:shadow-brand-gold/5 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
              style={{ transitionDelay: `${idx * 0.1}s` }}
            >
              {/* Enhancement #4 — large subtle quote mark */}
              <div
                aria-hidden="true"
                className="absolute top-4 inset-inline-start-5 text-[60px] leading-none pointer-events-none select-none font-serif"
                style={{ color: 'var(--brand-gold)', opacity: 0.12 }}
              >
                "
              </div>

              <div className="flex gap-1 mb-5">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-brand-gold" fill="currentColor" />)}
              </div>

              <p className="v3-body text-v3-text leading-relaxed mb-7 italic text-base relative z-10">
                "{item.company}"
              </p>

              <div className="flex items-center gap-4 border-t border-v3-border pt-5 mt-auto">
                <div className="w-11 h-11 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold font-black text-sm flex-shrink-0">
                  {item.initials}
                </div>
                <div>
                  <h4 className="v3-h3 text-v3-text text-sm mb-0.5">{item.name}</h4>
                  <div className="text-brand-teal text-[11px] font-black uppercase tracking-wider">
                    {item.role}
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
