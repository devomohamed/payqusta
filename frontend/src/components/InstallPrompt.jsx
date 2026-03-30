/**
 * PWA Install Prompt Component
 * Shows a beautiful prompt to install the app
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const markInstalled = () => {
      if (cancelled) return;
      setIsInstalled(true);
      localStorage.setItem('pwa-installed', '1');
    };

    // Check if already installed (standalone or iOS standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      markInstalled();
      return () => { cancelled = true; };
    }

    // Check if we already know the app was installed on this origin
    const locallyInstalled = localStorage.getItem('pwa-installed') === '1';
    if (locallyInstalled) {
      setIsInstalled(true);
      return () => { cancelled = true; };
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds of usage
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      markInstalled();
      setShowPrompt(false);
      console.log('✅ PWA was installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('pwa-installed', '1');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-6 z-[150] px-4 w-full md:w-[380px]"
        style={{ 
           /* Invert position based on language to avoid overlap with FloatingContact */
           insetInlineStart: lang === 'ar' ? 'auto' : '24px',
           insetInlineEnd: lang === 'ar' ? '24px' : 'auto' 
        }}
      >
        <div className="bg-v3-bg3 border border-brand-gold-bdr rounded-[28px] shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="relative p-6">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-v3-text3 hover:text-v3-text transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4">
              <div className="bg-brand-gold-dim p-3 rounded-2xl text-brand-gold">
                <Download size={28} />
              </div>
              <div className="flex-1">
                <h3 className="v3-h3 text-v3-text mb-1">{lang === 'ar' ? 'ثبّت بيكوستا' : 'Install PayQusta'}</h3>
                <p className="v3-body text-v3-text2 text-sm leading-snug">
                  {lang === 'ar' ? 'التطبيق الأسرع لإدارة تجارتك باحترافية' : 'The fastest app to manage your business'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 flex gap-3 bg-v3-bg2/50">
            <button
              onClick={handleDismiss}
              className="flex-1 btn-v3 border border-v3-border text-v3-text3 hover:text-v3-text py-3 text-sm"
            >
              {lang === 'ar' ? 'لاحقاً' : 'Later'}
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 btn-v3 btn-v3-primary py-3 text-sm gap-2"
            >
              <Smartphone size={16} />
              {lang === 'ar' ? 'ثبّت الآن' : 'Install Now'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;
