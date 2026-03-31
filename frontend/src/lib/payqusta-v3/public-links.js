export const publicHomepageActions = {
  loginPath: '/login',
  registerPath: '/login?mode=register',
  contactPath: '/contact',
  featuresPath: '/features',
  pricingPath: '/pricing',
  ecommercePath: '/ecommerce-platform',
  posPath: '/pos-system',
  termsPath: '/terms',
  privacyPath: '/privacy',
  contactSalesPath: '/contact',
  buildPlanRegisterPath(planId) {
    const params = new URLSearchParams({ mode: 'register' });
    if (planId) params.set('plan', planId);
    return `/login?${params.toString()}`;
  },
};

export const publicHomepageFooterLinks = {
  columns: [
    [
      publicHomepageActions.featuresPath,
      publicHomepageActions.pricingPath,
      publicHomepageActions.ecommercePath,
      publicHomepageActions.posPath,
    ],
    [null, null, null, publicHomepageActions.contactPath],
    [publicHomepageActions.termsPath, publicHomepageActions.privacyPath, null],
  ],
  social: {
    Facebook: null,
    Instagram: null,
    Twitter: null,
    WhatsApp: null,
    YouTube: null,
    LinkedIn: null,
    Telegram: null,
  },
};
