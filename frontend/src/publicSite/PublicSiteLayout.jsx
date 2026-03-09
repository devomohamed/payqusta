import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ArrowLeft, Sparkles } from 'lucide-react';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import { brandDisplayName, publicNavLinks } from './content';

function navLinkClass({ isActive }) {
  return [
    'rounded-full px-4 py-2 text-sm font-bold transition-colors',
    isActive
      ? 'bg-slate-950 text-white'
      : 'text-slate-600 hover:bg-white hover:text-slate-950',
  ].join(' ');
}

export default function PublicSiteLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_45%,#ffffff_100%)] text-slate-950">
      <div className="pointer-events-none fixed inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(15,23,42,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.55) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }}
      />

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="relative flex items-center gap-3">
            <AnimatedBrandLogo src="/logo.png" alt="PayQusta" size="sm" containerClassName="shrink-0" />
            <div className="text-right">
              <p className="text-lg font-black tracking-tight">{brandDisplayName}</p>
              <p className="text-xs font-medium text-slate-500">منصة تشغيل ونمو للمتاجر</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {publicNavLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-transform hover:-translate-y-0.5"
            >
              ابدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white/95 px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {publicNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/login?mode=register"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
              >
                ابدأ الآن
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/90">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                جاهز لتجربة PayQusta
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight">
                ابنِ واجهة محترفة لنشاطك، وشغّل البيع والمخزون والأقساط من نفس المكان.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                الموقع العام يعرف الزائر على المشروع، والنظام الداخلي يساعدك على التشغيل اليومي، والمتجر العام يمنحك حضورًا واضحًا وروابط قابلة للمشاركة.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
                >
                  أنشئ حسابك
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/features"
                  className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  استكشف المزايا
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="text-right">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">التصفح</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicNavLinks.map((item) => (
                    <NavLink key={item.to} to={item.to} className="text-base font-bold text-slate-700 transition-colors hover:text-slate-950" end={item.to === '/'}>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">عن المشروع</p>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  PayQusta ليس صفحة تعريف فقط، بل منظومة تشغيل للمتجر تربط الإدارة الداخلية بالحضور العام في واجهة واحدة متماسكة.
                </p>
                <div className="mt-5 flex flex-col gap-3 text-sm font-bold text-slate-700">
                  <span>مبيعات</span>
                  <span>مخزون</span>
                  <span>أقساط</span>
                  <span>متجر إلكتروني</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-right text-sm font-medium text-slate-500">
            PayQusta © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
