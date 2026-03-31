import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { homepageCredibilityCopy } from '../../lib/payqusta-v3/homepage-config';

/* ── Animated number counter hook ──────────────────────────────────────── */
function useCountUp(target, duration = 1200, started) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTs = null;
    const step = (timestamp) => {
      if (!startTs) startTs = timestamp;
      const progress = Math.min((timestamp - startTs) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return count;
}

/* ── Extract numeric value from a stat string like "2500+" or "98%" ──── */
function extractNum(str) {
  const match = str ? str.match(/[\d,]+/) : null;
  if (!match) return null;
  return parseInt(match[0].replace(/,/g, ''), 10);
}
function extractSuffix(str, num) {
  if (!str || num === null) return str;
  return str.replace(/[\d,]+/, '');
}

/* ── Single animated metric card ─────────────────────────────────────── */
const MetricCard = ({ stat, started }) => {
  const raw = extractNum(stat.num);
  const suffix = extractSuffix(stat.num, raw);
  const animated = useCountUp(raw ?? 0, 1200, started);

  return (
    <div className="bg-v3-bg p-8 md:p-10 flex flex-col items-center text-center hover:bg-v3-surface transition-all duration-300 group">
      <div className="text-[2.4rem] font-black leading-none text-v3-text mb-2 group-hover:scale-110 transition-transform">
        {raw !== null ? animated.toLocaleString() : stat.num}
        <span className="text-brand-gold">{raw !== null ? suffix : stat.span}</span>
      </div>
      <div className="text-v3-text3 font-bold uppercase text-[11px] tracking-widest group-hover:text-v3-text transition-colors">
        {stat.label}
      </div>
    </div>
  );
};

/* ── Metrics Section ─────────────────────────────────────────────────── */
const Metrics = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const gridRef = useRef(null);
  const [started, setStarted] = useState(false);
  const credibilityCopy = homepageCredibilityCopy[lang] || homepageCredibilityCopy.en;

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-24 bg-v3-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <span className="text-brand-teal text-[13px] font-bold uppercase tracking-widest mb-4 block">
            {t.metrics.tag}
          </span>
          <h2 className="v3-h2 text-v3-text mb-6">{t.metrics.h2}</h2>
          <p className="v3-body text-v3-text2 max-w-2xl mx-auto leading-relaxed">{t.metrics.sub}</p>
          <p className="text-[12px] font-semibold text-v3-text3 max-w-2xl mx-auto mt-4">
            {credibilityCopy.metrics.note}
          </p>
        </header>

        {/*
          Unified bordered grid:
          gap: 1px on a colored background creates the "divider" effect.
          overflow: hidden + border-radius clips the gaps to the card shape.
        */}
        <div
          ref={gridRef}
          className="grid grid-cols-2 lg:grid-cols-4 rounded-[26px] overflow-hidden border border-v3-border"
          style={{ gap: '1px', backgroundColor: 'var(--border)', borderRadius: '26px' }}
        >
          {t.metrics.items.map((stat, idx) => (
            <MetricCard key={idx} stat={stat} started={started} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── Paths Section ───────────────────────────────────────────────────── */
const Paths = () => {
  const { t } = usePayQusta();
  const reveal = useScrollReveal();

  return (
    <section className="bg-v3-bg2 py-24 border-b border-v3-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <h2 className="v3-h2 text-v3-text">{t.paths.h2}</h2>
        </header>

        {/* Responsive: 3-col desktop → 2-col tablet → 1-col mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.paths.items.map((path, idx) => (
            <div
              key={idx}
              ref={reveal}
              className="reveal stagger-child relative bg-v3-bg p-8 rounded-[22px] border border-v3-border hover:border-brand-gold/50 shadow-sm hover:shadow-2xl hover:shadow-brand-gold/5 transition-all duration-300 transform hover:-translate-y-2 group"
              style={{ transitionDelay: `${idx * 0.05}s` }}
            >
              {path.badge && (
                <div className={`absolute -top-3 right-6 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${
                  path.badge === 'الأكثر طلباً' || path.badge === 'Popular'
                    ? 'bg-brand-gold text-v3-bg'
                    : 'bg-brand-teal text-v3-bg'
                }`}>
                  {path.badge}
                </div>
              )}

              <div className="text-4xl mb-6 group-hover:scale-125 transition-transform duration-500 block w-fit">
                {path.icon}
              </div>
              <h3 className="v3-h3 text-v3-text mb-3 text-[15px]">{path.title}</h3>
              <p className="v3-body text-v3-text2 mb-6 text-sm">{path.desc}</p>

              <div className="flex items-center gap-2 text-brand-teal font-black text-[12px] uppercase">
                <CheckCircle2 size={14} />
                {t.pricing.cta.replace('...', '')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Metrics, Paths };
