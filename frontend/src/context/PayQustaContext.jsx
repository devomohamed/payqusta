import React, { createContext, useContext, useState, useEffect } from 'react';
import { content } from '../lib/payqusta-v3/i18n-content';

const PayQustaContext = createContext();

export const PayQustaProvider = ({ children }) => {
  // Default: Arabic (RTL) + Dark Mode
  const [lang, setLang] = useState(localStorage.getItem('payqusta_v3_lang') || 'ar');
  const [theme, setTheme] = useState(localStorage.getItem('payqusta_v3_theme') || 'dark');

  const t = content[lang];

  useEffect(() => {
    // Sync with HTML attributes
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('data-theme', theme);
    // Sync body background to current v3 theme
    document.body.style.background = 'var(--bg)';
    
    // Persist
    localStorage.setItem('payqusta_v3_lang', lang);
    localStorage.setItem('payqusta_v3_theme', theme);
  }, [lang, theme]);

  const toggleLang = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const toggleTheme = (newTheme) => {
    if (newTheme) {
      setTheme(newTheme);
    } else {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <PayQustaContext.Provider value={{ lang, theme, toggleLang, toggleTheme, t }}>
      {children}
    </PayQustaContext.Provider>
  );
};

export const usePayQusta = () => {
  const context = useContext(PayQustaContext);
  if (!context) {
    throw new Error('usePayQusta must be used within a PayQustaProvider');
  }
  return context;
};
