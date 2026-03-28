import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, Menu, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  brandArabicName,
  brandDisplayName,
  platformHighlights,
  publicNavLinks,
  publicUtilityLinks,
} from './content';

function navLinkClass({ isActive }) {
  return [
    'rounded-full px-4 py-2 text-sm font-bold transition-all duration-200',
    isActive
      ? 'app-surface bg-[color:var(--surface-elevated)] app-text-body shadow-lg shadow-black/5 dark:shadow-black/20'
      : 'app-text-soft hover:bg-black/[0.04] hover:text-[color:var(--text-strong)] dark:hover:bg-white/[0.06] dark:hover:text-white',
  ].join(' ');
}

export default function PublicSiteLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation('public');

  return (
    <div className="app-shell-bg dark:bg-[#0B1120] min-h-screen overflow-x-clip text-slate-950 transition-colors dark:text-slate-50 relative">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04] dark:opacity-[0.03] z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Floating pill navbar */}
      <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-full shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5">
            {/* Logo */}
            <Link to="/" className="relative flex min-w-0 items-center gap-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <AnimatedBrandLogo src="/logo-square.png" alt="PayQusta" size="sm" containerClassName="shrink-0" />
              <p className="hidden sm:block truncate text-sm font-black tracking-tight">{brandDisplayName}</p>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-1 xl:flex">
              {publicNavLinks.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === '/'}>
                  {t(item.i18nKey, item.label)}
                </NavLink>
              ))}
            </nav>

            {/* Desktop actions */}
            <div className="hidden items-center gap-2 xl:flex">
              <LanguageSwitcher />
              <ThemeModeSwitcher minimal />
              <Link
                to="/login"
                className="text-sm font-bold transition-colors hover:text-emerald-500 text-slate-700 dark:text-slate-300 dark:hover:text-white px-2"
              >
                {t('nav.login', 'تسجيل الدخول')}
              </Link>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center gap-2 rounded-full bg-[#00e59b] px-5 py-2 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(0,229,155,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,229,155,0.6)]"
              >
                {t('nav.startNow', 'ابدأ الآن')}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 dark:text-slate-100 xl:hidden hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="فتح القائمة"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu — OUTSIDE the pill */}
        {mobileMenuOpen && (
          <div className="mt-3 rounded-[1.5rem] bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 shadow-2xl p-4 xl:hidden">
            <div className="grid gap-1">
              {publicNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(item.i18nKey, item.label)}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeModeSwitcher minimal />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full border border-slate-200 dark:border-white/10 px-4 py-3 text-center text-sm font-black transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
              >
                {t('nav.login', 'تسجيل الدخول')}
              </Link>
              <Link
                to="/login?mode=register"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00e59b] px-4 py-3 text-center text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(0,229,155,0.4)]"
              >
                {t('nav.startNow', 'ابدأ الآن')}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 overflow-x-clip">{children}</main>

      <footer className="relative z-10 border-t border-[color:var(--surface-border)] bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1fr,1.4fr]">
            <div className="overflow-hidden rounded-[2rem] border border-[color:var(--surface-border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.94))] p-6 text-start text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-white/10 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t('footer.cta.badge', 'جاهز لتجربة PayQusta')}
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">
                {t('footer.cta.title', 'ابنِ حضورًا عامًا أقوى، وشغّل المبيعات والمخزون والأقساط من نفس المكان.')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                {t('footer.cta.description', 'الموقع العام يعرّف الزائر بالمشروع، والمتجر العام يحول الزيارة إلى طلب، بينما النظام الداخلي يربط البيع بالمخزون والتحصيل في تجربة تشغيل واحدة.')}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00e59b] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(0,229,155,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,229,155,0.6)]"
                >
                  {t('footer.cta.createAccount', 'أنشئ حسابك')}
                </Link>
                <Link
                  to="/features"
                  className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  {t('footer.cta.explore', 'استكشف المزايا')}
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface rounded-[1.75rem] p-6 text-start">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('footer.nav.title', 'التصفح')}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicNavLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="app-text-body text-base font-bold transition-colors hover:text-[color:var(--text-strong)] dark:hover:text-white"
                      end={item.to === '/'}
                    >
                      {t(item.i18nKey, item.label)}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="app-surface rounded-[1.75rem] p-6 text-start">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('footer.trust.title', 'الثقة والسياسات')}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicUtilityLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="text-base font-bold text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-100 dark:hover:text-white"
                    >
                      {t(item.i18nKey, item.label)}
                    </NavLink>
                  ))}
                </div>
                <p className="app-text-soft mt-5 text-sm leading-7">
                  {t('footer.trust.description', 'هذه الصفحات تساعد الزائر على فهم الشروط والخصوصية ومسار التواصل قبل التسجيل أو الإطلاق.')}
                </p>
              </div>

              <div className="app-surface-muted rounded-[1.75rem] p-6 text-start sm:col-span-2 xl:col-span-2 flex flex-col h-full">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('footer.brand.title', 'عن البراند')}</p>
                <p className="mt-4 text-base font-black app-text-body">{brandDisplayName}</p>
                <p className="app-text-soft mt-2 text-sm leading-7">
                  {t('footer.brand.description', `${brandArabicName} هو الاسم العربي المتداول لنفس البراند. الواجهة العامة هنا موجودة لتشرح القيمة التجارية بوضوح وتدعم الظهور والبحث.`)}
                </p>
                <div className="mt-auto pt-6 grid gap-2">
                  {(() => {
                    const highlights = t('footer.highlights', { returnObjects: true });
                    const itemsToMap = Array.isArray(highlights) ? highlights : platformHighlights;
                    return itemsToMap.map((item, idx) => (
                      <div
                        key={idx}
                        className="app-surface rounded-2xl border border-[color:var(--surface-border)] px-4 py-3 text-sm font-bold app-text-body shadow-sm dark:shadow-none"
                      >
                        {item}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-[color:var(--surface-border)] pt-6 text-start text-sm font-medium text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>PayQusta © 2026</p>
            <p className="text-start sm:text-end">{t('footer.tagline', 'واجهة عامة قابلة للفهرسة وتجربة مناسبة للموبايل والسطح المكتبي.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
