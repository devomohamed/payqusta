import React from 'react';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, Send, Heart,
} from 'lucide-react';
import { usePayQusta } from '../../context/PayQustaContext';

/* ── WhatsApp SVG (no Lucide equivalent) ─────────────────────────────── */
const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Footer = () => {
  const { lang, t } = usePayQusta();

  const socialLinks = [
    { icon: <Facebook size={16} />,  label: 'Facebook',  cls: 'fb' },
    { icon: <Instagram size={16} />, label: 'Instagram', cls: 'ig' },
    { icon: <Twitter size={16} />,   label: 'Twitter',   cls: 'tw' },
    { icon: <WhatsAppIcon />,        label: 'WhatsApp',  cls: 'wa' },
    { icon: <Youtube size={16} />,   label: 'YouTube',   cls: 'yt' },
    { icon: <Linkedin size={16} />,  label: 'LinkedIn',  cls: 'lk' },
    { icon: <Send size={16} />,      label: 'Telegram',  cls: 'tg' },
  ];

  return (
    <footer className="bg-v3-bg2 pt-24 pb-8 border-t border-v3-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Footer Grid — 4 col desktop, 2 col tablet, 1 col mobile */}
        <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-20">

          {/* Brand Column */}
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center font-black text-xl shadow-lg shadow-brand-gold/20 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#C8A84B,#A8832A)', color: '#0D1B2A' }}
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

            {/* Social Icons — Lucide SVGs, no emojis */}
            <div className="social-row flex flex-wrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  title={social.label}
                  className={`social-btn social-btn-${social.cls} w-9 h-9 flex items-center justify-center rounded-full border border-v3-border text-v3-text3 bg-v3-surface transition-all duration-200`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {t.footer.cols.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-5">
              <h4 className="v3-small text-brand-gold font-black uppercase tracking-[0.2em]">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="v3-body text-v3-text2 hover:text-brand-gold transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-v3-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="v3-small text-v3-text3 tracking-wide text-center sm:text-start">
            {t.footer.copyright}
          </div>
          <div className="flex items-center gap-2 text-v3-text3 text-[11px] font-bold uppercase tracking-wider">
            {t.footer.madeWith.split('❤️')[0]}
            <Heart size={14} className="text-brand-danger animate-pulse" fill="currentColor" />
            {t.footer.madeWith.split('❤️')[1]}
          </div>
        </div>

      </div>

      {/* Social button hover styles — platform-specific colors */}
      <style>{`
        .social-btn { transition: all 0.2s ease; }
        .social-btn:hover { transform: translateY(-3px); }
        .social-btn-fb:hover { color: #4267B2; border-color: rgba(66,103,178,0.4);  background: rgba(66,103,178,0.1); }
        .social-btn-ig:hover { color: #E1306C; border-color: rgba(225,48,108,0.4);  background: rgba(225,48,108,0.1); }
        .social-btn-tw:hover { color: #1DA1F2; border-color: rgba(29,161,242,0.4);  background: rgba(29,161,242,0.1); }
        .social-btn-wa:hover { color: #25D366; border-color: rgba(37,211,102,0.4);  background: rgba(37,211,102,0.1); }
        .social-btn-yt:hover { color: #FF0000; border-color: rgba(255,0,0,0.4);     background: rgba(255,0,0,0.1);   }
        .social-btn-lk:hover { color: #0077B5; border-color: rgba(0,119,181,0.4);   background: rgba(0,119,181,0.1); }
        .social-btn-tg:hover { color: #0088CC; border-color: rgba(0,136,204,0.4);   background: rgba(0,136,204,0.1); }

        /* Mobile: wrap into 2 rows neatly */
        @media (max-width: 480px) {
          .social-btn { width: 36px; height: 36px; }
        }

        /* Footer grid responsive */
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
