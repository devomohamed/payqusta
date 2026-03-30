import React, { useEffect, useRef, useState } from 'react';
import { Play, ArrowRight, CheckCircle, Zap, Users, Activity, Headphones, ShieldCheck, Monitor, Package, Store, TrendingUp } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Hero = () => {
  const { t, lang, theme } = usePayQusta();
  const reveal = useScrollReveal();

  const chartData = {
    labels: ['', '', '', '', '', '', ''],
    datasets: [
      {
        data: [42, 61, 50, 80, 100, 70, 85],
        backgroundColor: (ctx) => {
          const val = ctx.raw;
          return val === 100 ? '#C8A84B' : 'rgba(200,168,75,0.20)';
        },
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-v3-bg">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#C8A84B 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-gold/10 blur-[120px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-teal/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">

        {/* Industry ticker strip */}
        <div className="flex items-center gap-8 overflow-hidden whitespace-nowrap mb-12 opacity-40 hover:opacity-100 transition-opacity duration-500 select-none">
          <div className="flex items-center gap-8 animate-infinite-scroll">
            {[...Array(2)].map((_, i) => (
              <React.Fragment key={i}>
                {['HomeDecor', 'SportZone', 'GreenLeaf Co', 'CaféRoute', 'TechMart', 'Al Fashion', 'UrbanStyle', 'PetCare'].map(name => (
                  <span key={`${i}-${name}`} className="text-[12px] font-medium text-v3-text3 hover:text-brand-gold transition-colors">.{name}</span>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="w-px h-4 bg-v3-border mx-4" />
          <span className="text-[11px] font-black text-brand-teal uppercase tracking-widest">{lang === 'ar' ? 'شركاء النجاح' : 'EMPOWERING MERCHANTS'}</span>
        </div>

        {/* Hero inner — 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Text Column */}
          <div ref={reveal} className="reveal text-center lg:text-start min-w-0">

            {/* Badge — NO logo here, just icon + text */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-teal/20 bg-brand-teal/5 mb-8"
              style={{ animation: 'slideDown 0.5s ease forwards', animationDelay: '0.1s', opacity: 0 }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#C8A84B,#A8832A)', color: '#0D1B2A' }}
              >
                {lang === 'ar' ? 'ب' : 'P'}
              </div>
              <span className="text-brand-teal text-[13px] font-bold uppercase tracking-wider">{t.hero.badge}</span>
            </div>

            {/* H1 — line 2 uses gradient via inline style, not color */}
            <h1
              className="v3-h1 mb-6"
              style={{ color: 'var(--text)', animation: 'slideDown 0.6s ease forwards', animationDelay: '0.2s', opacity: 0 }}
            >
              {t.hero.h1Line1}<br />
              <span
                style={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #C8A84B 0%, #2ECC8F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t.hero.h1Line2}
              </span>
              {t.hero.h1Line3}
            </h1>

            <p
              className="v3-body text-v3-text2 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed text-lg"
              style={{ animation: 'slideDown 0.6s ease forwards', animationDelay: '0.35s', opacity: 0 }}
            >
              {t.hero.sub}
            </p>

            <div
              className="flex flex-col sm:flex-row items-center gap-4 mb-12"
              style={{ animation: 'slideDown 0.6s ease forwards', animationDelay: '0.5s', opacity: 0 }}
            >
              <button
                onClick={() => window.location.href = '/login?mode=register'}
                className="btn-v3 btn-v3-primary w-full sm:w-auto h-14 px-8 text-lg"
              >
                {t.hero.ctaPrimary}
              </button>
              <button
                onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-v3 btn-v3-secondary w-full sm:w-auto h-14 px-8 text-lg flex gap-2 items-center justify-center"
              >
                <Play size={18} fill="currentColor" />
                {t.hero.ctaSecondary}
              </button>
            </div>
          </div>

          {/* Mockup Column */}
          <div className="relative group perspective-1000 min-w-0">
            {/* Main Mockup Shell */}
            <div className="relative z-10 bg-v3-bg2 p-2 rounded-[32px] border border-v3-border2 shadow-2xl shadow-black/50 overflow-hidden transform group-hover:rotate-y-2 transition-transform duration-700 w-full max-w-[520px] mx-auto lg:mx-0 min-w-0 box-border">
              <div className="bg-v3-bg3 rounded-[26px] overflow-hidden border border-v3-border flex" style={{ minHeight: '380px', maxHeight: '480px' }}>

                {/* Mockup Sidebar — hidden on mobile */}
                <div className="hidden sm:flex w-36 bg-v3-bg flex-col p-3 border-e border-v3-border flex-shrink-0">
                  <div className="flex items-center justify-between gap-1.5 mb-6">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[12px]"
                      style={{ background: 'linear-gradient(135deg,#C8A84B,#A8832A)', color: '#0D1B2A' }}
                    >
                      {lang === 'ar' ? 'ب' : 'P'}
                    </div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-v3-border2" />
                      <div className="w-1.5 h-1.5 rounded-full bg-v3-border2" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-7 rounded-lg flex items-center px-2 gap-2 ${i === 1 ? 'bg-brand-gold/10 border-s-2 border-brand-gold text-brand-gold' : 'text-v3-text3'}`}>
                        <div className={`w-3 h-3 rounded-md flex-shrink-0 ${i === 1 ? 'bg-brand-gold' : 'bg-v3-border2'}`} />
                        <div className={`h-1.5 flex-1 rounded-full ${i === 1 ? 'bg-brand-gold/30' : 'bg-v3-border2'}`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mockup Content Area */}
                <div className="flex-1 p-4 overflow-hidden min-w-0">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-5 w-28 bg-v3-surface rounded-full p-1 flex items-center">
                      <div className="h-3 w-10 bg-v3-border rounded-full" />
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-v3-surface border border-v3-border flex-shrink-0" />
                  </div>

                  {/* Realistic KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { i: Monitor,    c: 'text-brand-gold',  b: 'bg-brand-gold/10',  t: lang === 'ar' ? 'نقاط البيع' : 'POS Data', v: '+2,450' },
                      { i: Package,    c: 'text-brand-teal',  b: 'bg-brand-teal/10',  t: lang === 'ar' ? 'المخزون' : 'Inventory', v: '18,204' },
                      { i: Store,      c: 'text-[#4D9EFF]',   b: 'bg-[#4D9EFF]/10',   t: lang === 'ar' ? 'المتجر الإلكتروني' : 'Web Store', v: '+890' },
                      { i: TrendingUp, c: 'text-[#F59E0B]',   b: 'bg-[#F59E0B]/10',   t: lang === 'ar' ? 'المبيعات' : 'Total Sales', v: '+34%' }
                    ].map((feat, idx) => (
                      <div key={idx} className="bg-v3-surface/50 p-3 rounded-xl border border-v3-border flex flex-col gap-2 relative overflow-hidden group hover:border-brand-gold/30 transition-colors">
                        {/* Huge faint background icon */}
                        <div className="absolute -end-2 -bottom-2 opacity-[0.03] lg:opacity-[0.05] transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
                          <feat.i size={56} />
                        </div>
                        {/* Content */}
                        <div className={`w-7 h-7 rounded-md ${feat.b} flex items-center justify-center ${feat.c} flex-shrink-0 relative z-10`}>
                          <feat.i size={14} />
                        </div>
                        <div className="relative z-10">
                          <div className="text-[10px] text-v3-text2 font-bold mb-0.5">{feat.t}</div>
                          <div className="text-[13px] text-v3-text font-black tracking-tight">{feat.v}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart — properly contained */}
                  <div className="bg-v3-surface/30 p-3 rounded-xl border border-v3-border overflow-hidden" style={{ position: 'relative', height: '64px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                    <Bar key={`hero-chart-${theme}`} data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badges — hidden on very small screens. Positional logic tied to language (RTL vs LTR) */}
            <div className={`hidden sm:block absolute z-20 animate-float transition-all duration-500 ${lang === 'ar' ? '-top-4 -left-4' : '-top-4 -right-4'}`}>
              <div className="bg-brand-teal-dim border border-brand-teal-bdr backdrop-blur-xl p-3 rounded-2xl flex items-center gap-2 shadow-xl">
                <div className="w-2 h-2 rounded-full bg-brand-teal flex-shrink-0" />
                <span className="text-brand-teal text-[12px] font-bold whitespace-nowrap">{t.hero.mockup.inventory}</span>
              </div>
            </div>

            <div className={`hidden sm:block absolute z-20 animate-float transition-all duration-500 ${lang === 'ar' ? '-bottom-4 -right-4' : '-bottom-4 -left-4'}`} style={{ animationDelay: '2s' }}>
              <div className="bg-v3-surface/80 border border-v3-border backdrop-blur-xl p-3 rounded-2xl flex items-center gap-2 shadow-xl">
                <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold flex-shrink-0">
                  <Zap size={16} fill="currentColor" />
                </div>
                <div>
                  <div className="text-v3-text text-[12px] font-black whitespace-nowrap">{t.hero.mockup.orderNotify}</div>
                  <div className="text-brand-teal text-[10px] font-bold">{t.hero.mockup.orderSub}</div>
                </div>
              </div>
            </div>

            {/* Glow behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-gold/5 blur-[100px] pointer-events-none rounded-full" />
          </div>

        </div>

        {/* Trust / Stats Bar */}
        <div ref={reveal} className="reveal mt-20 pt-10 border-t border-v3-border/50">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center lg:text-start min-w-0">
            {t.hero.stats.map((stat, idx) => {
              const StatIcon = [Users, Activity, CheckCircle, Headphones][idx];
              return (
                <div key={idx} className="flex flex-col items-center lg:items-start gap-1 group min-w-0">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-1 w-full">
                    <div className="w-10 h-10 rounded-xl bg-v3-surface border border-v3-border flex items-center justify-center text-brand-gold shadow-sm group-hover:scale-110 group-hover:bg-brand-gold group-hover:text-v3-bg transition-all duration-300 flex-shrink-0">
                      <StatIcon size={20} />
                    </div>
                    <div className="min-w-0 flex-1 text-start">
                      <div className="text-2xl font-black text-v3-text flex items-baseline gap-1">
                        {stat.num.replace(stat.accent, '')}
                        <span className="text-brand-gold text-xl">{stat.accent}</span>
                      </div>
                      <div className="text-[11px] font-bold text-v3-text3 uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity whitespace-normal break-words leading-tight">{stat.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 480px) {
          .v3-h1 { font-size: 2rem !important; line-height: 1.2 !important; }
        }
      `}</style>
    </section>
  );
};

export default Hero;
