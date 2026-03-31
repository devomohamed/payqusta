import React from 'react';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, Send, Heart,
} from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';
import { publicHomepageFooterLinks } from '../../lib/payqusta-v3/public-links';

const Footer = () => {
  const { lang, t } = usePayQusta();
  const madeWithPrefix = lang === 'ar' ? 'صنع بكل' : 'Made with';
  const madeWithSuffix = lang === 'ar' ? 'في مصر' : 'in Egypt';

  const socialLinks = [
    { icon: <Facebook size={16} />, label: 'Facebook', cls: 'fb', href: publicHomepageFooterLinks.social.Facebook },
    { icon: <Instagram size={16} />, label: 'Instagram', cls: 'ig', href: publicHomepageFooterLinks.social.Instagram },
    { icon: <Twitter size={16} />, label: 'Twitter', cls: 'tw', href: publicHomepageFooterLinks.social.Twitter },
    { icon: <Youtube size={16} />, label: 'YouTube', cls: 'yt', href: publicHomepageFooterLinks.social.YouTube },
    { icon: <Linkedin size={16} />, label: 'LinkedIn', cls: 'lk', href: publicHomepageFooterLinks.social.LinkedIn },
    { icon: <Send size={16} />, label: 'Telegram', cls: 'tg', href: publicHomepageFooterLinks.social.Telegram },
  ].filter((social) => Boolean(social.href));

  return (
    <footer className="bg-v3-bg2 pt-24 pb-8 border-t border-v3-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-20">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center font-black text-xl shadow-lg shadow-brand-gold/20 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#0D9B7A,#5C67E6)', color: '#FFFFFF' }}
              >
                {lang === 'ar' ? 'ب' : 'P'}
              </div>
              <span className="text-v3-text font-black text-xl tracking-tight">
                {lang === 'ar' ? 'بيكوستا' : 'PayQusta'}
              </span>
            </div>

            <p className="v3-body text-v3-text3 leading-relaxed max-w-sm text-sm">
              {t.footer.desc}
            </p>

            <div className="social-row flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  title={social.label}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`social-btn social-btn-${social.cls} w-9 h-9 flex items-center justify-center rounded-full border border-v3-border text-v3-text3 bg-v3-surface transition-all duration-200`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {t.footer.cols.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-5">
              <h4 className="v3-small text-brand-gold font-black uppercase tracking-[0.2em]">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link, linkIdx) => {
                  const href = publicHomepageFooterLinks.columns[idx]?.[linkIdx];
                  if (!href) return null;
                  return (
                    <li key={link}>
                      <a href={href} className="v3-body text-v3-text2 hover:text-brand-gold transition-colors text-sm">
                        {link}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-v3-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="v3-small text-v3-text3 tracking-wide text-center sm:text-start">
            {t.footer.copyright}
          </div>
          <div className="flex items-center gap-2 text-v3-text3 text-[11px] font-bold uppercase tracking-wider">
            {madeWithPrefix}
            <Heart size={14} className="text-brand-danger animate-pulse" fill="currentColor" />
            {madeWithSuffix}
          </div>
        </div>
      </div>

      <style>{`
        .social-btn { transition: all 0.2s ease; }
        .social-btn:hover { transform: translateY(-3px); }
        .social-btn-fb:hover { color: #4267B2; border-color: rgba(66,103,178,0.4); background: rgba(66,103,178,0.1); }
        .social-btn-ig:hover { color: #E1306C; border-color: rgba(225,48,108,0.4); background: rgba(225,48,108,0.1); }
        .social-btn-tw:hover { color: #1DA1F2; border-color: rgba(29,161,242,0.4); background: rgba(29,161,242,0.1); }
        .social-btn-yt:hover { color: #FF0000; border-color: rgba(255,0,0,0.4); background: rgba(255,0,0,0.1); }
        .social-btn-lk:hover { color: #0077B5; border-color: rgba(0,119,181,0.4); background: rgba(0,119,181,0.1); }
        .social-btn-tg:hover { color: #0088CC; border-color: rgba(0,136,204,0.4); background: rgba(0,136,204,0.1); }

        @media (max-width: 480px) {
          .social-btn { width: 36px; height: 36px; }
        }

        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }

        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr; gap: 28px; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
