import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, Menu, Sparkles, X } from 'lucide-react';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell-bg min-h-screen overflow-x-clip text-slate-950 transition-colors dark:text-slate-50">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.55) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <header className="app-surface-glass sticky top-0 z-40 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
            <Link to="/" className="relative flex min-w-0 items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
              <AnimatedBrandLogo src="/logo-square.png" alt="PayQusta" size="sm" containerClassName="shrink-0" />
              <div className="min-w-0 text-right">
                <p className="truncate text-base font-black tracking-tight sm:text-lg">{brandDisplayName}</p>
                <p className="app-text-muted truncate text-[11px] font-medium sm:text-xs">{t('public_site_layout.ui.klj17m1')}</p>
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
              <ThemeModeSwitcher compact className="hidden xl:block" />
              <Link
                to="/login"
                className="app-surface-muted app-text-body rounded-full px-5 py-2.5 text-sm font-black transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                {t('public_site_layout.ui.k32w7dx')}
              </Link>
              <Link
                to="/login?mode=register"
                className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary-500/20 transition-transform hover:-translate-y-0.5 hover:bg-primary-700"
              >
                {t('public_site_layout.ui.kl6w4j0')}
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="app-surface inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 dark:text-slate-100 lg:hidden"
              aria-label={t('public_site_layout.form.k8fiyp8')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[color:var(--surface-border)] lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="app-surface rounded-[1.75rem] p-4">
                <p className="app-text-muted text-right text-xs font-black uppercase tracking-[0.18em]">{t('public_site_layout.ui.kabefvw')}</p>
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

                <div className="app-surface-muted mt-4 rounded-2xl p-4 text-right">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{t('public_site_layout.ui.ktsf510')}</p>
                  <p className="app-text-soft mt-2 text-xs leading-6">
                    {brandArabicName} يجمع بين موقع واضح للزائر وتجربة تشغيل فعلية للمتجر من الداخل.
                  </p>
                </div>

                <div className="mt-4">
                  <ThemeModeSwitcher compact />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="app-surface-muted app-text-body rounded-full px-4 py-3 text-center text-sm font-black"
                  >
                    {t('public_site_layout.ui.k32w7dx')}
                  </Link>
                  <Link
                    to="/login?mode=register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700"
                  >
                    {t('public_site_layout.ui.kl6w4j0')}
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {publicUtilityLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="app-surface-muted app-text-body rounded-2xl px-4 py-3 text-center text-sm font-bold transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 overflow-x-clip">{children}</main>

      <footer className="relative z-10 border-t border-[color:var(--surface-border)] bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="overflow-hidden rounded-[2rem] border border-[color:var(--surface-border)] bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,41,59,0.94))] p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-white/10 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t('public_site_layout.ui.k7354by')}
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight sm:text-3xl">
                {t('public_site_layout.ui.k5o29hb')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                الموقع العام يعرّف الزائر بالمشروع، والمتجر العام يحول الزيارة إلى طلب، بينما النظام الداخلي يربط البيع بالمخزون والتحصيل في تجربة تشغيل واحدة.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
                >
                  {t('public_site_layout.ui.kwfqesx')}
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/features"
                  className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  {t('public_site_layout.ui.k21jqek')}
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <div className="app-surface rounded-[1.75rem] p-6 text-right">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_site_layout.ui.kabefvw')}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicNavLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="app-text-body text-base font-bold transition-colors hover:text-[color:var(--text-strong)] dark:hover:text-white"
                      end={item.to === '/'}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="app-surface rounded-[1.75rem] p-6 text-right">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_site_layout.ui.kbfz3xc')}</p>
                <div className="mt-4 flex flex-col gap-3">
                  {publicUtilityLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="text-base font-bold text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-100 dark:hover:text-white"
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
                <p className="app-text-soft mt-5 text-sm leading-7">
                  {t('public_site_layout.ui.kvzqrjm')}
                </p>
              </div>

              <div className="app-surface-muted rounded-[1.75rem] p-6 text-right sm:col-span-2 xl:col-span-1">
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_site_layout.ui.kie88yx')}</p>
                <p className="mt-4 text-base font-black app-text-body">{brandDisplayName}</p>
                <p className="app-text-soft mt-2 text-sm leading-7">
                  {brandArabicName} هو الاسم العربي المتداول لنفس البراند. الواجهة العامة هنا موجودة لتشرح القيمة التجارية بوضوح وتدعم الظهور والبحث.
                </p>
                <div className="mt-5 grid gap-2">
                  {platformHighlights.map((item) => (
                    <div
                      key={item}
                      className="app-surface rounded-2xl border border-[color:var(--surface-border)] px-4 py-3 text-sm font-bold app-text-body shadow-sm dark:shadow-none"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-[color:var(--surface-border)] pt-6 text-right text-sm font-medium text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>PayQusta © 2026</p>
            <p>{t('public_site_layout.ui.kwai0rn')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
