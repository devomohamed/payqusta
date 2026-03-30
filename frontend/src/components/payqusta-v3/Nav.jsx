import React, { useState, useEffect } from 'react';
import {
  Menu, X, Globe, Moon, Sun,
  LayoutGrid, Compass, Tag, MessageSquare, HelpCircle,
  ChevronRight, ArrowRight,
} from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import AnimatedBrandLogo from '../AnimatedBrandLogo';

/* ── Scroll-progress bar ──────────────────────────────────────────────────── */
const ScrollProgress = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setPct(((el.scrollTop || document.body.scrollTop) / (el.scrollHeight - el.clientHeight)) * 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      className="fixed z-[199] top-16 left-0 h-[2px] pointer-events-none"
      style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#C8A84B,#2ECC8F)', transition: 'width 0.1s linear' }}
    />
  );
};

const Nav = () => {
  const { lang, theme, toggleLang, toggleTheme, t } = usePayQusta();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  /* ── Nav links with icons ─────────────────────────────────────────────── */
  const navLinks = [
    { icon: <LayoutGrid size={15} />,    label: t.nav.platform,  href: '#platform'  },
    { icon: <Compass size={15} />,       label: t.nav.solutions, href: '#highlights' },
    { icon: <Tag size={15} />,           label: t.nav.pricing,   href: '#pricing'   },
    { icon: <MessageSquare size={15} />, label: t.nav.success,   href: '#testi'     },
    { icon: <HelpCircle size={15} />,    label: t.nav.faq,       href: '#faq'       },
  ];

  /* ── Scroll tracking ──────────────────────────────────────────────────── */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Active section via IntersectionObserver ─────────────────────────── */
  useEffect(() => {
    const sections = ['platform', 'highlights', 'pricing', 'faq', 'testi'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(`#${id}`); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  /* ── Close mobile menu on ESC ─────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const scrollTo = (href) => {
    setMobileMenuOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <ScrollProgress />

      <nav className={`fixed top-0 inset-x-0 z-[100] h-16 transition-all duration-300 ${
        isScrolled ? 'nav-glass border-b border-v3-border' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">

          {/* ── Logo ── */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <AnimatedBrandLogo size="sm" />
            <span className="font-black text-[19px] tracking-tight text-v3-text hidden sm:block">
              {lang === 'ar' ? 'بيكوستا' : 'PayQusta'}
            </span>
          </div>

          {/* ── Desktop Links ── */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                  className="flex items-center gap-1.5 text-[13px] font-bold transition-colors"
                  style={{ color: isActive ? 'var(--brand-gold)' : 'var(--text2)' }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7, color: isActive ? 'var(--brand-gold)' : 'inherit', flexShrink: 0 }}>
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* ── Desktop Controls ── */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="flex items-center bg-v3-surface p-1 rounded-full border border-v3-border">
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  theme === 'dark' ? 'bg-brand-gold text-v3-bg shadow-sm' : 'text-v3-text3 hover:text-v3-text'
                }`}
              >
                <Moon size={12} />
                {t.nav.themeDark}
              </button>
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  theme === 'light' ? 'bg-brand-gold text-v3-bg shadow-sm' : 'text-v3-text3 hover:text-v3-text'
                }`}
              >
                <Sun size={12} />
                {t.nav.themeLight}
              </button>
            </div>

            {/* Lang Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-v3-border2 text-v3-text hover:border-brand-gold transition-colors text-[13px] font-bold"
            >
              <Globe size={14} className="text-brand-teal" />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>

            <a href="/login" className="text-v3-text hover:text-brand-gold transition-colors text-[13px] font-bold px-2">
              {t.nav.login}
            </a>

            <button
              onClick={() => window.location.href = '/login?mode=register'}
              className="btn-v3 btn-v3-primary btn-v3-sm flex items-center gap-2"
            >
              {t.nav.cta}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* ── Mobile Right Controls ── */}
          <div className="flex lg:hidden items-center">
            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-v3-surface border border-v3-border text-v3-text"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu Overlay ── */}
        <div
          className={`fixed top-16 inset-x-0 bottom-0 lg:hidden z-[190] overflow-y-auto bg-v3-bg transition-all duration-300 ${
            mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex flex-col px-4 pt-6 pb-12 gap-2 min-h-full">
            
            {/* Nav Links Area */}
            <div className="bg-v3-surface/50 rounded-[24px] border border-v3-border p-2 flex flex-col gap-1 mb-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                  className="flex items-center gap-4 p-4 rounded-[18px] hover:bg-v3-bg3 active:bg-v3-bg2 transition-colors text-v3-text font-bold text-[15px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-v3-bg2 border border-v3-border flex items-center justify-center text-brand-gold shadow-sm flex-shrink-0">
                    {link.icon}
                  </div>
                  {link.label}
                  <ChevronRight size={18} className="ms-auto text-v3-text3" />
                </a>
              ))}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <button
                onClick={() => { toggleTheme(); }}
                className="py-4 bg-v3-surface/50 border border-v3-border rounded-2xl flex flex-col items-center justify-center gap-2 text-v3-text font-bold text-[13px] active:scale-95 transition-transform"
              >
                {theme === 'dark' ? <Sun size={20} className="text-brand-gold" /> : <Moon size={20} className="text-brand-gold" />}
                {theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
              </button>
              
              <button
                onClick={toggleLang}
                className="py-4 bg-v3-surface/50 border border-v3-border rounded-2xl flex flex-col items-center justify-center gap-2 text-v3-text font-bold text-[13px] active:scale-95 transition-transform"
              >
                <div className="w-5 h-5 flex items-center justify-center rounded-md border border-v3-border2 text-v3-text text-[10px] uppercase font-black">
                  {lang === 'ar' ? 'EN' : 'AR'}
                </div>
                {lang === 'ar' ? 'English' : 'عربي'}
              </button>
            </div>

            {/* Primary Action */}
            <div className="flex flex-col gap-3 mt-auto">
              <a
                href="/login"
                className="w-full py-4 bg-v3-surface border border-v3-border rounded-2xl flex items-center justify-center font-bold text-v3-text text-[15px]"
              >
                {t.nav.login}
              </a>
              <button
                onClick={() => { window.location.href = '/login?mode=register'; setMobileMenuOpen(false); }}
                className="btn-v3 btn-v3-primary w-full py-4 text-[16px] font-black flex items-center justify-center gap-2"
              >
                {t.nav.cta}
                <ArrowRight size={18} />
              </button>
            </div>
            
          </div>
        </div>
      </nav>
    </>
  );
};

export default Nav;
