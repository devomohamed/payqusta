import React, { useState, useRef } from 'react';
import { Monitor, Smartphone, LayoutGrid, CheckCircle2, ChevronDown, Zap } from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const PlatformCard = ({ item, isFeatured }) => {
  const { t, lang } = usePayQusta();
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef(null);

  if (!item) return null;

  const iconsMapping = {
    'Professional POS':             { icon: <Monitor size={24} />, color: '#0D9B7A', bg: 'rgba(13,155,122,0.12)' },
    'نقطة بيع احترافية (POS)':      { icon: <Monitor size={24} />, color: '#0D9B7A', bg: 'rgba(13,155,122,0.12)' },
    'Complete Online Store':         { icon: <Smartphone size={24} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    'متجر إلكتروني متكامل':         { icon: <Smartphone size={24} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    'Smart Inventory Management':    { icon: <LayoutGrid size={24} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    'إدارة المخزون الذكية':         { icon: <LayoutGrid size={24} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  };

  const config = iconsMapping[item.title] || { icon: <Zap size={24} />, color: '#0D9B7A', bg: 'rgba(13,155,122,0.12)' };

  return (
    <div className={`group relative bg-v3-bg p-6 md:p-8 transition-all hover:bg-v3-bg2 ${isFeatured ? 'lg:col-span-2' : ''}`}>
      {/* Highlight bar that grows on hover */}
      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-brand-gold scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />

      {/*
        Fix #5: featured card — text LEFT, POS visual RIGHT on desktop.
        On tablet/mobile: stack vertically.
      */}
      <div className={`flex flex-col gap-8 items-start ${isFeatured ? 'lg:flex-row lg:gap-10' : ''}`}>
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Icon */}
          <div
            className="w-12 h-12 border rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: config.bg, borderColor: `${config.color}33`, color: config.color }}
          >
            {config.icon}
          </div>

          <h3 className="v3-h3 text-v3-text mb-4 text-[15px] md:text-[17px]">{item.title}</h3>
          <p className="v3-body text-v3-text2 mb-6 leading-relaxed max-w-lg text-sm md:text-base">{item.desc}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {item.tags?.map(tag => (
              <span key={tag} className="text-[11px] font-bold px-3 py-1 bg-v3-bg3 border border-v3-border rounded-full text-brand-teal uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-brand-gold font-black text-sm hover:translate-x-1 transition-all"
          >
            {isOpen ? t.platform.showLess : t.platform.viewMore}
            <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable checklist */}
          <div
            ref={contentRef}
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px' }}
          >
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {item.checklist?.map(point => (
                <div key={point} className="flex items-center gap-3 text-v3-text2 text-sm">
                  <CheckCircle2 size={16} className="text-brand-teal flex-shrink-0" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* POS Visual — only on featured card, RIGHT side on desktop */}
        {isFeatured && (
          <div className="w-full lg:w-[260px] lg:flex-shrink-0 bg-v3-bg3 border border-v3-border rounded-[18px] p-4 overflow-hidden">
            {/* POS App UI mock */}
            <div className="flex gap-2 mb-4 overflow-hidden">
              {(lang === 'ar' ? ['ألبان', 'بقوليات', 'مخبوزات'] : ['Dairy', 'Grains', 'Bakery']).map(cat => (
                <div key={cat} className="px-2.5 py-1.5 bg-v3-surface border border-v3-border rounded-lg text-[10px] text-v3-text2 whitespace-nowrap">
                  {cat}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pb-4">
              {[
                { n: lang === 'ar' ? 'قميص قطن' : 'Cotton Shirt', p: lang === 'ar' ? '250 ج.م' : '250 EGP' },
                { n: lang === 'ar' ? 'بنطلون جينز' : 'Jeans', p: lang === 'ar' ? '480 ج.م' : '480 EGP' },
              ].map((p, i) => (
                <div key={i} className="bg-v3-surface p-3 rounded-xl border border-v3-border flex flex-col items-center gap-2">
                  <div className="w-full aspect-video rounded-lg bg-v3-bg2 border border-v3-border flex items-center justify-center">
                    <Zap size={14} className="text-brand-gold opacity-20" />
                  </div>
                  <div className="text-[10px] font-bold text-v3-text">{p.n}</div>
                  <div className="text-[10px] text-brand-gold">{p.p}</div>
                </div>
              ))}
            </div>
            <div className="bg-brand-gold text-v3-bg py-2.5 rounded-xl text-center font-black text-xs shadow-lg shadow-brand-gold/20">
              {lang === 'ar' ? 'إتمام الدفع' : 'Pay Now'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Platform = () => {
  const { t } = usePayQusta();
  const reveal = useScrollReveal();

  return (
    <section className="bg-v3-bg2 py-24 border-b border-v3-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <span className="text-brand-teal text-[13px] font-bold uppercase tracking-[0.2em] mb-4 block">
            {t.platform.tag}
          </span>
          <h2 className="v3-h2 text-v3-text mb-6">{t.platform.h2}</h2>
          <p className="v3-body text-v3-text2 max-w-2xl mx-auto leading-relaxed">
            {t.platform.sub}
          </p>
        </header>

        {/* Platform grid — unified bordered */}
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-[32px] overflow-hidden border border-v3-border" style={{ gap: '1px', backgroundColor: 'var(--border)' }}>
          <PlatformCard item={t.platform.featured} isFeatured={true} />
          {t.platform.cards.map((card, idx) => (
            <PlatformCard key={idx} item={card} isFeatured={false} />
          ))}
        </div>

        {/* Tablet: force single column */}
        <style>{`
          @media (max-width: 1024px) {
            .platform-section-grid { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 480px) {
            .pc-title { font-size: 15px; }
            .pc-desc  { font-size: 12.5px; }
          }
        `}</style>
      </div>
    </section>
  );
};

export default Platform;
