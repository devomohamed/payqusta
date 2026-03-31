import React, { useEffect } from 'react';
import { PayQustaProvider } from '../context/PayQustaContext';
import Nav from '../components/payqusta-v3/Nav';
import Hero from '../components/payqusta-v3/Hero';
import { TrustStrip, Highlights, FloatingContact } from '../components/payqusta-v3/TrustHighlights';
import Platform from '../components/payqusta-v3/Platform';
import Steps from '../components/payqusta-v3/Steps';
import Reports from '../components/payqusta-v3/Reports';
import { Metrics, Paths } from '../components/payqusta-v3/MetricsPaths';
import Testimonials from '../components/payqusta-v3/Testimonials';
import Pricing from '../components/payqusta-v3/Pricing';
import { FAQ, CTA } from '../components/payqusta-v3/FAQCTA';
import Footer from '../components/payqusta-v3/Footer';

const PublicLandingPageV3 = () => {
  useEffect(() => {
    const savedTheme = localStorage.getItem('payqusta_v3_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.style.background = 'var(--bg)';
    window.scrollTo(0, 0);

    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <PayQustaProvider>
      <div
        className="min-h-screen overflow-x-hidden"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <Nav />
        <main>
          <Hero />
          <TrustStrip />
          <div id="highlights" className="homepage-section-anchor" tabIndex={-1}><Highlights /></div>
          <div id="platform" className="homepage-section-anchor" tabIndex={-1}><Platform /></div>
          <Steps />
          <Reports />
          <Metrics />
          <Paths />
          <Testimonials />
          <div id="pricing" className="homepage-section-anchor" tabIndex={-1}><Pricing /></div>
          <div id="faq" className="homepage-section-anchor" tabIndex={-1}><FAQ /></div>
          <CTA />
        </main>
        <Footer />
        <FloatingContact />
      </div>
    </PayQustaProvider>
  );
};

export default PublicLandingPageV3;
