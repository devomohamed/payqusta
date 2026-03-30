import React from 'react';
import { Zap, ShieldCheck, BarChart3, Globe2, MessageCircle } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/* ─── Trust Strip ─────────────────────────────────────────────────────────── */
const TrustStrip = () => {
  const { t } = usePayQusta();
  const companies = ['Aramex', 'Mada', 'Tabby', 'Paymob', 'Bosta', 'Vodafone'];

  return (
    <div className="bg-v3-bg2 border-y border-v3-border py-[26px] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-6 whitespace-nowrap overflow-x-auto no-scrollbar">
        {/* Label */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-v3-text3 font-bold uppercase tracking-widest text-[11px]">{t.trust}</span>
          <div className="w-px h-8 bg-v3-border" />
        </div>

        {/* Logos row */}
        <div className="flex flex-1 items-center justify-between gap-8 min-w-0">
          {companies.map((name) => (
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

/* ─── Highlights Strip ────────────────────────────────────────────────────── */
const Highlights = () => {
  const { t } = usePayQusta();
  const reveal = useScrollReveal();

  // Proper Lucide icons — no emojis
  const icons = [
    <Zap size={18} />,
    <BarChart3 size={18} />,
    <ShieldCheck size={18} />,
    <Globe2 size={18} />,
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
            className={`
              hl-item group flex items-center gap-4 p-6 hover:bg-v3-bg2 transition-colors duration-300
              ${idx !== t.highlights.length - 1 ? 'border-b lg:border-b-0 lg:border-e border-v3-border' : ''}
            `}
          >
            {/* Icon */}
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

      {/* Responsive: 4-col desktop → 2×2 tablet → 1-col mobile */}
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

/* ─── Floating Contact Button (WhatsApp) ─────────────────────────────────── */
const FloatingContact = () => {
  const { lang } = usePayQusta();

  return (
    <div
      className="fixed bottom-6 z-[200] flex flex-col items-end gap-3"
      style={{ insetInlineEnd: '24px' }}
      aria-label={lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
    >
      <a
        href="https://wa.me/201000000000"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="group relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        style={{ background: '#25D366', boxShadow: '0 8px 24px rgba(37,211,102,0.40)' }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#25D366' }} />
        {/* WhatsApp SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7 relative z-10">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {/* Tooltip */}
        <span
          className="absolute bottom-full mb-2 whitespace-nowrap text-[12px] font-bold text-white bg-gray-900/90 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ insetInlineEnd: 0 }}
        >
          {lang === 'ar' ? 'تحدث معنا على واتساب' : 'Chat on WhatsApp'}
        </span>
      </a>
    </div>
  );
};

export { TrustStrip, Highlights, FloatingContact };
