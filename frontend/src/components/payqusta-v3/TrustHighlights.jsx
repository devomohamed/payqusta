import React from 'react';
import { Zap, ShieldCheck, BarChart3, Globe2, MessageCircle } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { publicHomepageActions } from '../../lib/payqusta-v3/public-links';
import { homepageCredibilityCopy } from '../../lib/payqusta-v3/homepage-config';

const TrustStrip = () => {
  const { lang } = usePayQusta();
  const credibilityCopy = homepageCredibilityCopy[lang] || homepageCredibilityCopy.en;

  return (
    <div className="bg-v3-bg2 border-y border-v3-border py-[26px] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-6 whitespace-nowrap overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="space-y-1">
            <span className="text-v3-text3 font-bold uppercase tracking-widest text-[11px]">
              {credibilityCopy.trustStrip.label}
            </span>
            <p className="text-v3-text3/70 text-[11px] font-medium normal-case tracking-normal">
              {credibilityCopy.trustStrip.note}
            </p>
          </div>
          <div className="w-px h-8 bg-v3-border" />
        </div>

        <div className="flex flex-1 items-center justify-between gap-8 min-w-0">
          {credibilityCopy.trustStrip.items.map((name) => (
            <span
              key={name}
              className="text-v3-text2 text-base font-black lowercase opacity-55 hover:opacity-100 hover:text-brand-gold transition-all duration-300 cursor-pointer select-none flex-shrink-0 text-[14px] md:text-lg"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Highlights = () => {
  const { t } = usePayQusta();
  const reveal = useScrollReveal();

  const icons = [
    <Zap key="zap" size={18} />,
    <BarChart3 key="chart" size={18} />,
    <ShieldCheck key="shield" size={18} />,
    <Globe2 key="globe" size={18} />,
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 lg:py-16 relative z-10">
      <div
        ref={reveal}
        className="reveal hl-inner grid overflow-hidden rounded-[24px] border border-v3-border shadow-2xl"
        style={{ background: 'var(--bg)' }}
      >
        {t.highlights.map((item, idx) => (
          <div
            key={idx}
            className={`hl-item group flex items-center gap-4 p-6 hover:bg-v3-bg2 transition-colors duration-300 ${
              idx !== t.highlights.length - 1 ? 'border-b lg:border-b-0 lg:border-e border-v3-border' : ''
            }`}
          >
            <div
              className="flex-shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform duration-300"
              style={{ background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.30)' }}
            >
              {icons[idx] || <Zap size={18} />}
            </div>

            <div className="min-w-0">
              <h4 className="text-v3-text text-[13px] font-black leading-tight mb-0.5 truncate">{item.title}</h4>
              <p className="text-v3-text2 text-[12px] leading-tight">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .hl-inner { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .hl-inner { grid-template-columns: 1fr 1fr; }
          .hl-item {
            border-inline-end: none !important;
            border-bottom: 1px solid var(--border);
          }
          .hl-item:nth-child(odd) {
            border-inline-end: 1px solid var(--border) !important;
          }
        }

        @media (max-width: 400px) {
          .hl-inner { grid-template-columns: 1fr; }
          .hl-item { border-inline-end: none !important; }
        }
      `}</style>
    </div>
  );
};

const FloatingContact = () => {
  const { lang } = usePayQusta();

  return (
    <div
      className="fixed bottom-6 z-[200] flex flex-col items-end gap-3"
      style={{ insetInlineEnd: '24px' }}
      aria-label={lang === 'ar' ? '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627' : 'Contact Us'}
    >
      <a
        href={publicHomepageActions.contactSalesPath}
        aria-label={lang === 'ar' ? '\u0627\u0644\u062a\u0648\u0627\u0635\u0644' : 'Contact'}
        className="group relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        style={{ background: '#0D9B7A', boxShadow: '0 8px 24px rgba(13,155,122,0.35)' }}
      >
        <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#0D9B7A' }} />
        <MessageCircle className="w-7 h-7 relative z-10 text-white" />
        <span
          className="absolute bottom-full mb-2 whitespace-nowrap text-[12px] font-bold text-white bg-gray-900/90 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ insetInlineEnd: 0 }}
        >
          {lang === 'ar' ? '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627' : 'Contact us'}
        </span>
      </a>
    </div>
  );
};

export { TrustStrip, Highlights, FloatingContact };
