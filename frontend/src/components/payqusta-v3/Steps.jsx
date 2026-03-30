import React from 'react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const Steps = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();

  return (
    <section className="py-24 bg-v3-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-20">
          <h2 className="v3-h2 text-v3-text">{t.steps.h2}</h2>
        </header>

        {/* Steps wrapper — relative for the connecting line */}
        <div className="relative">
          {/* Connecting Line — desktop only, z-index 0 so circles sit above */}
          <div
            className="hidden lg:block absolute top-[28px] h-px z-0 pointer-events-none"
            style={{
              background: 'rgba(200,168,75,0.30)',
              insetInlineStart: 'calc(12.5% + 28px)',
              insetInlineEnd: 'calc(12.5% + 28px)',
            }}
          />

          {/* Steps grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8">
            {t.steps.items.map((item, idx) => (
              <div
                key={idx}
                ref={reveal}
                className="reveal flex flex-col items-center text-center group"
                style={{ transitionDelay: `${idx * 0.1}s` }}
              >
                {/* Circle — z-index 2 to sit above the connecting line */}
                <div
                  className="relative z-[2] w-14 h-14 rounded-full flex items-center justify-center text-brand-gold font-black text-xl mb-6 shadow-lg group-hover:bg-brand-gold/10 group-hover:shadow-brand-gold/20 transition-all duration-300"
                  style={{
                    background: 'var(--surface)',
                    border: '1.5px solid rgba(200,168,75,0.30)',
                  }}
                >
                  {item.num}
                </div>
                <h3 className="v3-h3 text-v3-text mb-3 tracking-tight group-hover:text-brand-gold transition-colors text-[15px]">
                  {item.title}
                </h3>
                <p className="v3-body text-v3-text3 text-sm leading-relaxed max-w-[200px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 400px) {
          .steps-single { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </section>
  );
};

export default Steps;
