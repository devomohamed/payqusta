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
  const { t, i18n } = useTranslation('public');
  const isRtl = i18n.language === 'ar';

  return (
    <div className={`min-h-screen bg-[color:var(--c-bg)] font-body ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="nav sticky top-0 z-50 h-[68px] border-bottom border-[color:var(--c-border)] bg-[rgba(247,248,250,0.92)] backdrop-blur-[16px] transition-all duration-300">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 font-display text-[22px] font-[900]">
            <span className="text-[color:var(--c-navy)]">Pay</span>
            <span className="text-[color:var(--c-teal)]">Quota</span>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden items-center gap-1 lg:flex">
            {publicNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => 
                  `px-[14px] py-[6px] font-display text-[14px] font-[600] transition-all hover:bg-[color:var(--c-teal-lt)] hover:text-[color:var(--c-navy)] rounded-[var(--r-sm)] ${
                    isActive ? 'text-[color:var(--c-navy)] bg-[color:var(--c-teal-lt)]' : 'text-[color:var(--c-text2)]'
                  }`
                }
              >
                {t(link.i18nKey)}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <LanguageSwitcher />
              <ThemeModeSwitcher minimal />
            </div>
            
            <Link to="/login" className="hidden font-display text-[14px] font-[600] text-[color:var(--c-text2)] hover:text-[color:var(--c-navy)] md:block">
              {t('nav.login')}
            </Link>
            
            <Link 
              to="/login?mode=register" 
              className="rounded-[var(--r-sm)] bg-[color:var(--c-accent)] px-5 py-[8px] font-display text-[14px] font-[700] text-[color:var(--c-navy)] shadow-[0_4px_16px_rgba(0,229,160,0.3)] transition-all hover:translate-y-[-1px] hover:bg-[#00d494]"
            >
              {t('nav.startFree')}
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-2 text-[color:var(--c-navy)]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Backdrop & Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-[68px] inset-x-0 bg-white border-b border-[color:var(--c-border)] shadow-xl p-4 animate-slide-up">
             <div className="flex flex-col gap-2">
                {publicNavLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 font-display text-[15px] font-[600] text-[color:var(--c-text2)] hover:bg-[color:var(--c-teal-lt)] rounded-[var(--r-sm)]"
                  >
                    {t(link.i18nKey)}
                  </NavLink>
                ))}
                <div className="h-[1px] bg-[color:var(--c-border)] my-2" />
                <div className="flex items-center justify-between px-4">
                  <LanguageSwitcher />
                  <ThemeModeSwitcher minimal />
                </div>
                <Link 
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 font-display text-[15px] font-[600] text-[color:var(--c-text2)]"
                >
                  {t('nav.login')}
                </Link>
             </div>
          </div>
        )}
      </nav>

      <main className="relative z-10">{children}</main>

      {/* Footer */}
      <footer className="footer bg-[color:var(--c-navy)] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-1 font-display text-[24px] font-[900]">
                <span className="text-white">Pay</span>
                <span className="text-[color:var(--c-teal)]">Quota</span>
              </Link>
              <p className="mt-6 max-w-sm font-body text-[13px] leading-relaxed text-[rgba(255,255,255,0.45)]">
                {t('footer.brand.desc')}
              </p>
              {/* Social Icons Placeholder */}
              <div className="mt-8 flex gap-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] bg-[rgba(255,255,255,0.05)] transition-all hover:bg-[color:var(--c-teal)] hover:scale-105 cursor-pointer">
                      <div className="h-4 w-4 bg-white/20 rounded-sm" />
                   </div>
                 ))}
              </div>
            </div>

            {/* Links Columns */}
            {['product', 'solutions', 'company', 'support'].map((col) => (
              <div key={col}>
                <h3 className="font-display text-[13px] font-[700] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.9)]">
                  {t(`footer.columns.${col}.title`)}
                </h3>
                <ul className="mt-6 flex flex-col gap-3">
                  {t(`footer.columns.${col}.links`, { returnObjects: true })?.map((link, idx) => (
                    <li key={idx}>
                      <a href="#" className="font-body text-[13px] text-[rgba(255,255,255,0.45)] transition-all hover:text-[rgba(255,255,255,0.9)]">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 h-[1px] bg-[rgba(255,255,255,0.08)]" />

          <div className="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="font-body text-[13px] text-[rgba(255,255,255,0.3)]">
              {t('footer.bottom.copyright')}
            </p>
            <div className="flex gap-6">
              {t('footer.bottom.links', { returnObjects: true })?.map((link, idx) => (
                <a key={idx} href="#" className="font-body text-[13px] text-[rgba(255,255,255,0.3)] hover:text-white">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

