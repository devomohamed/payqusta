import React, { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import { api } from '../../store';
import { usePayQusta } from '../../context/PayQustaContext';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { publicHomepageActions } from '../../lib/payqusta-v3/public-links';
import { homepagePricingContent } from '../../lib/payqusta-v3/homepage-config';

const PLAN_FEATURE_LABELS = {
  ar: {
    all: 'كل المزايا الأساسية والمتقدمة',
    api_access: 'ربط API',
    advanced_reports: 'تقارير متقدمة',
    barcode_scanner: 'قارئ باركود',
    basic_reports: 'تقارير أساسية',
    customer_portal: 'بوابة عميل',
    inventory_management: 'إدارة مخزون',
    loyalty_program: 'برنامج ولاء',
    multi_branch: 'إدارة متعددة الفروع',
    pos: 'نقطة بيع وكاشير',
    shipping_payment_sync: 'تكاملات شحن ودفع',
    whatsapp_notifications: 'إشعارات وتنبيهات الطلبات',
  },
  en: {
    all: 'Full feature bundle',
    api_access: 'API access',
    advanced_reports: 'Advanced reporting',
    barcode_scanner: 'Barcode scanner support',
    basic_reports: 'Basic reporting',
    customer_portal: 'Customer portal',
    inventory_management: 'Inventory management',
    loyalty_program: 'Loyalty program',
    multi_branch: 'Multi-branch management',
    pos: 'POS and checkout',
    shipping_payment_sync: 'Shipping and payment sync',
    whatsapp_notifications: 'Order notifications',
  },
};

const PLAN_LIMIT_LABELS = {
  ar: [
    { key: 'maxBranches', label: 'الفروع' },
    { key: 'maxUsers', label: 'المستخدمون' },
    { key: 'maxProducts', label: 'المنتجات' },
  ],
  en: [
    { key: 'maxBranches', label: 'Branches' },
    { key: 'maxUsers', label: 'Users' },
    { key: 'maxProducts', label: 'Products' },
  ],
};

function formatLocalizedNumber(value, lang) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(Number(value || 0));
}

function formatCurrency(value, currency, lang) {
  return `${formatLocalizedNumber(value, lang)} ${currency || 'EGP'}`;
}

function formatLimitValue(value, lang) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  if (numericValue === -1 || numericValue >= 999999) {
    return lang === 'ar' ? 'غير محدود' : 'Unlimited';
  }

  return formatLocalizedNumber(numericValue, lang);
}

function getFeatureLabel(feature, featureLabels) {
  if (!feature) return '';
  if (featureLabels[feature]) return featureLabels[feature];
  return String(feature).replace(/_/g, ' ');
}

function getPlanFit(limits, pricingCopy) {
  const branches = Number(limits?.maxBranches ?? 1);
  const users = Number(limits?.maxUsers ?? 1);
  const products = Number(limits?.maxProducts ?? 0);

  if (branches === -1 || branches >= 5 || users >= 10 || products >= 10000) {
    return pricingCopy.planSizes.scale;
  }

  if (branches >= 2 || users >= 5 || products >= 500) {
    return pricingCopy.planSizes.growth;
  }

  return pricingCopy.planSizes.starter;
}

function getSafeDescription(planDescription, fallbackDescription) {
  const trimmed = String(planDescription || '').trim();
  if (!trimmed || /^legacy plan:/i.test(trimmed)) {
    return fallbackDescription;
  }
  return trimmed;
}

function normalizePublishedPlan(plan, index, lang, pricingCopy, featureLabels) {
  const rawPrice = Number(plan?.price);
  const hasNumericPrice = Number.isFinite(rawPrice) && rawPrice >= 0;
  const fit = getPlanFit(plan?.limits, pricingCopy);
  const billingCycle = plan?.billingCycle === 'yearly' ? 'yearly' : 'monthly';

  return {
    id: plan?._id || `published-plan-${index}`,
    name: plan?.name || pricingCopy.defaultPlanName,
    description: getSafeDescription(plan?.description, fit.note),
    features: Array.isArray(plan?.features)
      ? plan.features.filter(Boolean).slice(0, 2).map((feature) => getFeatureLabel(feature, featureLabels))
      : [],
    fit,
    isPopular: Boolean(plan?.isPopular) || index === 1,
    isPublished: true,
    actionType: hasNumericPrice ? 'register' : 'contact',
    routePlanId: plan?._id || null,
    priceLabel: hasNumericPrice
      ? (rawPrice === 0 ? pricingCopy.freeLabel : formatCurrency(rawPrice, plan?.currency, lang))
      : pricingCopy.customPricingLabel,
    priceValue: hasNumericPrice ? rawPrice : null,
    currency: plan?.currency || 'EGP',
    billingLabel: pricingCopy.billingCycleLabels[billingCycle],
    limits: plan?.limits || {},
  };
}

const Pricing = () => {
  const { t, lang } = usePayQusta();
  const reveal = useScrollReveal();
  const [publishedPlans, setPublishedPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const pricingCopy = homepagePricingContent[lang] || homepagePricingContent.en;
  const featureLabels = PLAN_FEATURE_LABELS[lang] || PLAN_FEATURE_LABELS.en;
  const limitLabels = PLAN_LIMIT_LABELS[lang] || PLAN_LIMIT_LABELS.en;

  useEffect(() => {
    let ignore = false;

    setIsLoadingPlans(true);
    api.get('/plans')
      .then(({ data }) => {
        if (ignore) return;
        const plans = Array.isArray(data?.data) ? data.data : [];
        setPublishedPlans(plans.filter((plan) => plan?.isActive !== false));
      })
      .catch(() => {
        if (!ignore) setPublishedPlans([]);
      })
      .finally(() => {
        if (!ignore) setIsLoadingPlans(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const normalizedPublishedPlans = useMemo(
    () => publishedPlans
      .slice()
      .sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0))
      .map((plan, index) => normalizePublishedPlan(plan, index, lang, pricingCopy, featureLabels)),
    [featureLabels, lang, pricingCopy, publishedPlans],
  );

  const desktopColumns = Math.max(1, Math.min(normalizedPublishedPlans.length || 1, 4));

  const handlePlanAction = (plan) => {
    if (plan.actionType === 'contact') {
      window.location.assign(publicHomepageActions.contactSalesPath);
      return;
    }

    if (plan.routePlanId) {
      window.location.assign(publicHomepageActions.buildPlanRegisterPath(plan.routePlanId));
      return;
    }

    window.location.assign(publicHomepageActions.registerPath);
  };

  return (
    <section className="bg-v3-bg2 py-24 border-y border-v3-border overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <header ref={reveal} className="reveal text-center mb-16">
          <h2 className="v3-h2 text-v3-text mb-6">{t.pricing.h2}</h2>

          <div className="max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-brand-gold/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold mb-4">
              <Sparkles size={14} />
              {isLoadingPlans
                ? pricingCopy.loadingStatus
                : (normalizedPublishedPlans.length > 0 ? pricingCopy.liveStatus : pricingCopy.emptyStatus)}
            </span>
            <p className="text-v3-text3 text-sm md:text-base leading-relaxed">
              {isLoadingPlans
                ? pricingCopy.loadingNote
                : (normalizedPublishedPlans.length > 0 ? pricingCopy.liveNote : pricingCopy.emptyNote)}
            </p>
          </div>

          {normalizedPublishedPlans.length > 0 && !isLoadingPlans ? (
            <div className="flex items-center justify-center gap-2 text-v3-text3 text-[12px] font-bold">
              <CreditCard size={14} />
              <span>{pricingCopy.liveCycleHint}</span>
            </div>
          ) : null}
        </header>

        {isLoadingPlans ? (
          <div className="rounded-[32px] border border-v3-border bg-v3-bg px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 text-brand-gold text-sm font-black uppercase tracking-[0.18em] mb-4">
              <Sparkles size={14} />
              {pricingCopy.loadingStatus}
            </div>
            <p className="text-v3-text3 max-w-2xl mx-auto leading-relaxed">
              {pricingCopy.loadingNote}
            </p>
          </div>
        ) : normalizedPublishedPlans.length === 0 ? (
          <div className="rounded-[32px] border border-v3-border bg-v3-bg px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 text-brand-gold text-sm font-black uppercase tracking-[0.18em] mb-4">
              <Sparkles size={14} />
              {pricingCopy.emptyStatus}
            </div>
            <h3 className="text-v3-text text-2xl font-black mb-4">{pricingCopy.emptyTitle}</h3>
            <p className="text-v3-text3 max-w-2xl mx-auto leading-relaxed mb-8">
              {pricingCopy.emptyNote}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.assign(publicHomepageActions.contactSalesPath)}
                className="btn-v3 btn-v3-primary h-14 px-8 w-full sm:w-auto"
              >
                {pricingCopy.contactSalesLabel}
              </button>
              <button
                onClick={() => window.location.assign(publicHomepageActions.registerPath)}
                className="btn-v3 btn-v3-secondary h-14 px-8 w-full sm:w-auto"
              >
                {t.ctaSection.primary}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="pricing-cards-wrap"
            style={{ '--pricing-cols-desktop': desktopColumns }}
          >
            {normalizedPublishedPlans.map((plan, idx) => {
              const isPopular = !!plan.isPopular;

              return (
                <div
                  key={plan.id || idx}
                  ref={reveal}
                  className={`pricing-card reveal relative flex flex-col overflow-hidden transition-all duration-500 ${
                    isPopular ? 'popular-card' : ''
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-80" />
                  <div className="absolute -top-16 -end-10 w-40 h-40 bg-brand-gold/10 blur-3xl rounded-full pointer-events-none" />

                  {isPopular && (
                    <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                      <span className="bg-brand-gold text-v3-bg text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                        {t.pricing.mostPopular}
                      </span>
                    </div>
                  )}

                  <div className={`w-full mb-3 ${isPopular ? 'mt-10' : 'mt-0'}`}>
                    <span className="inline-flex items-center justify-center rounded-full border border-brand-gold/20 bg-brand-gold/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-gold">
                      {pricingCopy.fitPrefix}
                      <span className="ms-1">{plan.fit.label}</span>
                    </span>
                    <h3 className="text-v3-text font-black text-base mt-3 mb-1.5">{plan.name}</h3>
                    <p className="pricing-desc text-v3-text3 text-[11px] leading-5 max-w-xs">
                      {plan.description}
                    </p>
                  </div>

                  <div className="w-full mb-3 rounded-[20px] border border-brand-gold/15 bg-v3-bg3/70 p-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.11)]">
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-v3-text3 mb-2">
                      {pricingCopy.billingCycleLabel}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <span
                        className="font-black leading-none text-v3-text"
                        style={{ fontSize: plan.actionType === 'contact' ? '1.2rem' : '1.75rem', fontFamily: 'var(--font-h)', letterSpacing: '-0.025em' }}
                      >
                        {plan.priceLabel}
                      </span>
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-brand-teal/10 px-2.5 py-1 text-[9px] font-bold text-brand-teal">
                      {plan.billingLabel}
                    </div>
                  </div>

                  <div className="w-full mb-3 grid grid-cols-3 gap-1.5">
                    {limitLabels.map((item) => (
                      <div key={item.key} className="rounded-[12px] border border-v3-border bg-v3-surface/35 px-2 py-1.5">
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-v3-text3">
                          {item.label}
                        </div>
                        <div className="mt-1 text-[11px] font-black text-v3-text break-words">
                          {formatLimitValue(plan.limits?.[item.key], lang)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="w-full flex flex-col gap-1.5 mb-4 text-start">
                    {plan.features.map((feature) => (
                      <div key={feature} className="pricing-feature flex items-center gap-2 rounded-[12px] border border-v3-border/55 bg-v3-surface/15 px-2.5 py-1.5 text-v3-text2 text-[10.5px]">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 bg-brand-gold/10 text-brand-gold">
                          <Check size={10} strokeWidth={4} />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanAction(plan)}
                    className={`btn-v3 w-full py-4 text-[13px] uppercase tracking-widest font-black mt-auto ${
                      isPopular ? 'btn-v3-primary' : 'btn-v3-ghost'
                    }`}
                  >
                    {plan.actionType === 'contact' ? pricingCopy.contactSalesLabel : pricingCopy.startPlanLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 flex items-center justify-center gap-2 text-v3-text3 text-[12px] opacity-70">
          <CreditCard size={14} />
          <span>{pricingCopy.bottomNote}</span>
        </div>
      </div>

      <style>{`
        .pricing-cards-wrap {
          display: grid;
          grid-template-columns: repeat(var(--pricing-cols-desktop, 4), minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        .pricing-card {
          min-height: 100%;
          padding: 18px 14px;
          border: 1px solid var(--border);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%),
            var(--bg);
          box-shadow: 0 14px 30px rgba(1, 8, 20, 0.14);
        }
        .popular-card {
          border: 2px solid var(--brand-gold);
          background:
            linear-gradient(180deg, rgba(13,155,122,0.12) 0%, rgba(92,103,230,0.03) 100%),
            var(--surface);
          box-shadow: 0 20px 42px rgba(13,155,122,0.16);
          transform: translateY(-4px);
        }
        .pricing-desc {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
        }
        .pricing-feature {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
        }

        @media (max-width: 1180px) {
          .pricing-cards-wrap {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .pricing-card {
            padding: 16px 12px;
          }
          .popular-card {
            transform: translateY(-2px);
          }
        }

        @media (max-width: 680px) {
          .pricing-cards-wrap {
            grid-template-columns: 1fr;
          }
          .pricing-card {
            padding: 16px 12px;
          }
          .popular-card {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
};

export default Pricing;
