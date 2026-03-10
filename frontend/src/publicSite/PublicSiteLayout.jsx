import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ArrowLeft, Sparkles } from 'lucide-react';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import {
  brandArabicName,
  brandDisplayName,
  platformHighlights,
  publicNavLinks,
} from './content';

function navLinkClass({ isActive }) {
  return [
    'rounded-full px-4 py-2 text-sm font-bold transition-all duration-200',
    isActive
      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
      : 'text-slate-600 hover:bg-white hover:text-slate-950',
  ].join(' ');
}

export default function PublicSiteLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.11),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_42%,#ffffff_100%)] text-slate-950">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.55) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
            <Link to="/" className="relative flex min-w-0 items-center gap-3">
              <AnimatedBrandLogo src="/logo.png" alt="PayQusta" size="sm" containerClassName="shrink-0" />
              <div className="min-w-0 text-right">
                <p className="truncate text-base font-black tracking-tight sm:text-lg">{brandDisplayName}</p>
                <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">منصة تشغيل ونمو للمتاجر</p>
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              aria-label="فتح القائمة"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white/95 lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-right text-xs font-black uppercase tracking-[0.18em] text-slate-400">التصفح</p>
                <div className="mt-4 grid gap-2">
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
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <p className="text-sm font-black text-slate-900">واجهة عامة + تشغيل داخلي</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {brandArabicName} يجمع بين موقع عام واضح للزائر وتجربة تشغيل فعلية للمتجر من الداخل.
                  </p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                  >
                    ابدأ الآن
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 overflow-x-clip">{children}</main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/90">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                جاهز لتجربة PayQusta
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">
                ابنِ حضورًا عامًا أقوى، وشغّل المبيعات والمخزون والأقساط من نفس المكان.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                الموقع العام يعرّف الزائر بالمشروع، والمتجر العام يحول الزيارة إلى طلب، بينما النظام الداخلي يربط البيع
                بالمخزون والتحصيل في تجربة تشغيل واحدة.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
                >
                  أنشئ حسابك
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/features"
                  className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  استكشف المزايا
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-right shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">التصفح</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicNavLinks.map((item) => (
                    <NavLink key={item.to} to={item.to} className="text-base font-bold text-slate-700 transition-colors hover:text-slate-950" end={item.to === '/'}>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-right shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">عن البراند</p>
                <p className="mt-4 text-base font-black text-slate-950">{brandDisplayName}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {brandArabicName} هو الاسم العربي المتداول لنفس البراند. الواجهة العامة هنا موجودة لتشرح القيمة
                  التجارية بوضوح وتدعم الظهور والبحث.
                </p>
                <div className="mt-5 grid gap-2">
                  {platformHighlights.map((item) => (
                    <div key={item} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-6 text-right text-sm font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>PayQusta © 2026</p>
            <p>واجهة عامة قابلة للفهرسة وتجربة مناسبة للموبايل والسطح المكتبي.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
