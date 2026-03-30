import React, { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const Reports = () => {
  const { t, theme, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const [chartKey, setChartKey] = useState(0);

  // Re-render charts on theme/lang change so colors update
  useEffect(() => {
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 50);
    return () => clearTimeout(timer);
  }, [theme, lang]);

  const textColor = theme === 'dark' ? '#8BA3BC' : '#4E6880';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const lineData = {
    labels: lang === 'ar'
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: lang === 'ar' ? 'نقاط البيع' : 'POS',
        data: [28, 32, 29, 38, 44, 51, 60],
        borderColor: '#C8A84B',
        backgroundColor: 'rgba(200,168,75,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: lang === 'ar' ? 'المتجر الإلكتروني' : 'Online Store',
        data: [12, 18, 22, 28, 35, 42, 55],
        borderColor: '#2ECC8F',
        backgroundColor: 'rgba(46,204,143,0.06)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      }
    ]
  };

  const donutData = {
    labels: lang === 'ar' ? ['كاشير', 'أونلاين', 'واتساب'] : ['POS', 'Online', 'WhatsApp'],
    datasets: [
      {
        data: [55, 35, 10],
        backgroundColor: ['#C8A84B', '#2ECC8F', '#4D9EFF'],
        borderWidth: 0,
        hoverOffset: 4,
      }
    ]
  };

  /* ── Chart options ──────────────────────────────────────────────────── */
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,   // CRITICAL — height set by wrapper div, not aspect ratio
    animation: { duration: 600 },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          font: { size: 10, family: 'Cairo' },
          padding: 12,
          boxWidth: 12,
          usePointStyle: true,
        }
      },
      tooltip: {
        padding: 10,
        bodyFont: { family: 'Cairo', size: 11 },
        titleFont: { family: 'Cairo', size: 11 },
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { size: 9 }, maxRotation: 0 }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 9 }, callback: v => v + 'k' }
      }
    }
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,   // CRITICAL
    animation: { duration: 600 },
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: textColor,
          font: { size: 10, family: 'Cairo' },
          padding: 10,
          boxWidth: 12,
          usePointStyle: true,
        }
      },
      tooltip: {
        padding: 10,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` }
      }
    }
  };

  return (
    <section className="bg-v3-bg2 py-24 border-b border-v3-border" style={{ overflow: 'hidden' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <header ref={reveal} className="reveal text-center mb-16">
          <span className="text-brand-gold text-[13px] font-bold uppercase tracking-widest mb-4 block">
            {t.reports.tag}
          </span>
          <h2
            className="v3-h2 text-v3-text max-w-xl mx-auto"
            dangerouslySetInnerHTML={{ __html: t.reports.h2 }}
          />
        </header>

        {/*
          Key: add min-w-0 to BOTH grid children.
          Without min-w-0, grid/flex children don't constrain their width
          and the chart canvas overflows the card boundary.
        */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Stats Column */}
          <div ref={reveal} className="reveal order-2 lg:order-1 flex flex-col gap-4 min-w-0">
            <p className="v3-body text-v3-text2 mb-4 leading-relaxed">{t.reports.desc}</p>
            <div className="grid gap-3">
              {t.reports.stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-v3-surface border border-v3-border p-4 md:p-5 rounded-2xl flex items-center justify-between group hover:border-brand-gold/30 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <span className="text-v3-text2 font-bold text-sm group-hover:text-v3-text transition-colors">{stat.label}</span>
                  <span className="v3-h3 text-brand-gold tracking-tighter">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Column — min-w-0 prevents canvas overflow */}
          <div className="order-1 lg:order-2 flex flex-col gap-5 w-full min-w-0">

            {/* Line Chart Card */}
            <div
              ref={reveal}
              className="reveal bg-v3-bg3 p-5 md:p-6 rounded-[26px] border border-v3-border shadow-2xl group"
              style={{ overflow: 'hidden', minWidth: 0, boxSizing: 'border-box' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="v3-h3 text-v3-text text-[14px] md:text-[15px]">{t.reports.charts.sales}</h4>
                <div className="w-8 h-8 rounded-lg bg-v3-surface border border-v3-border flex items-center justify-center text-v3-text3 group-hover:text-brand-gold transition-colors flex-shrink-0">
                  <span className="text-[10px] font-black italic">POS</span>
                </div>
              </div>
              {/*
                The wrapper div height CONTROLS the chart height.
                overflow:hidden + width:100% prevents any canvas bleed.
              */}
              <div style={{ position: 'relative', height: '160px', width: '100%', overflow: 'hidden' }}>
                <Line key={`line-${chartKey}`} data={lineData} options={lineOptions} />
              </div>
            </div>

            {/* Donut Chart Card */}
            <div
              ref={reveal}
              className="reveal bg-v3-bg3 p-5 md:p-6 rounded-[26px] border border-v3-border shadow-2xl group"
              style={{ overflow: 'hidden', minWidth: 0, boxSizing: 'border-box' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="v3-h3 text-v3-text text-[14px] md:text-[15px]">{t.reports.charts.distribution}</h4>
                <div className="w-8 h-8 rounded-lg bg-v3-surface border border-v3-border flex items-center justify-center text-v3-text3 group-hover:text-brand-teal transition-colors flex-shrink-0">
                  <span className="text-[10px] font-black italic">CH</span>
                </div>
              </div>
              <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
                <Doughnut key={`donut-${chartKey}`} data={donutData} options={donutOptions} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Responsive chart height overrides */}
      <style>{`
        @media (max-width: 768px) {
          .reports-line-wrap  { height: 130px !important; }
          .reports-donut-wrap { height: 160px !important; }
        }
        @media (max-width: 480px) {
          .reports-line-wrap  { height: 110px !important; }
          .reports-donut-wrap { height: 140px !important; }
        }
      `}</style>
    </section>
  );
};

export default Reports;
