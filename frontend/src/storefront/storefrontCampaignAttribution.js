const STOREFRONT_CAMPAIGN_KEY = 'payqusta-storefront-campaign-attribution';
const STOREFRONT_CAMPAIGN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeValue(value, maxLength = 160) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeAttribution(data) {
  if (!data || typeof data !== 'object') return null;

  const normalized = {
    utmSource: normalizeValue(data.utmSource),
    utmMedium: normalizeValue(data.utmMedium),
    utmCampaign: normalizeValue(data.utmCampaign),
    utmTerm: normalizeValue(data.utmTerm),
    utmContent: normalizeValue(data.utmContent),
    campaignMessage: normalizeValue(data.campaignMessage, 220),
    affiliateCode: normalizeValue(data.affiliateCode || data.aff, 80).toUpperCase(),
    ref: normalizeValue(data.ref),
    gclid: normalizeValue(data.gclid, 220),
    fbclid: normalizeValue(data.fbclid, 220),
    referrer: normalizeValue(data.referrer, 320),
    landingPath: normalizeValue(data.landingPath, 220),
    landingUrl: normalizeValue(data.landingUrl, 420),
    firstSeenAt: normalizeValue(data.firstSeenAt, 40),
    lastSeenAt: normalizeValue(data.lastSeenAt, 40),
  };

  const hasMeaningfulAttribution = [
    normalized.utmSource,
    normalized.utmMedium,
    normalized.utmCampaign,
    normalized.utmTerm,
    normalized.utmContent,
    normalized.campaignMessage,
    normalized.affiliateCode,
    normalized.ref,
    normalized.gclid,
    normalized.fbclid,
    normalized.referrer,
  ].some(Boolean);

  return hasMeaningfulAttribution ? normalized : null;
}

function parseTrackedParams(search = '') {
  const params = new URLSearchParams(search || '');

  return {
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    utmTerm: params.get('utm_term') || '',
    utmContent: params.get('utm_content') || '',
    campaignMessage: params.get('campaign_message') || '',
    affiliateCode: params.get('aff') || params.get('affiliate') || '',
    ref: params.get('ref') || '',
    gclid: params.get('gclid') || '',
    fbclid: params.get('fbclid') || '',
  };
}

function extractReferrerSource(referrer) {
  if (!referrer) return '';

  try {
    return new URL(referrer).hostname.replace(/^www\./i, '');
  } catch (error) {
    return '';
  }
}

function formatCampaignLabel(value) {
  const cleaned = normalizeValue(value);
  if (!cleaned) return '';

  return cleaned.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
}

function clearStoredCampaignAttribution() {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STOREFRONT_CAMPAIGN_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

export function loadStorefrontCampaignAttribution() {
  if (!canUseStorage()) return null;

  try {
    const rawAttribution = window.localStorage.getItem(STOREFRONT_CAMPAIGN_KEY);
    if (!rawAttribution) return null;

    const normalizedAttribution = normalizeAttribution(JSON.parse(rawAttribution));
    if (!normalizedAttribution) {
      clearStoredCampaignAttribution();
      return null;
    }

    const lastSeenAt = normalizedAttribution.lastSeenAt ? new Date(normalizedAttribution.lastSeenAt) : null;
    if (lastSeenAt && !Number.isNaN(lastSeenAt.getTime())) {
      const isExpired = (Date.now() - lastSeenAt.getTime()) > STOREFRONT_CAMPAIGN_TTL_MS;
      if (isExpired) {
        clearStoredCampaignAttribution();
        return null;
      }
    }

    return normalizedAttribution;
  } catch (error) {
    clearStoredCampaignAttribution();
    return null;
  }
}

export function saveStorefrontCampaignAttribution(attribution) {
  if (!canUseStorage()) return;

  const normalizedAttribution = normalizeAttribution(attribution);
  if (!normalizedAttribution) return;

  try {
    window.localStorage.setItem(STOREFRONT_CAMPAIGN_KEY, JSON.stringify(normalizedAttribution));
  } catch (error) {
    // Ignore storage quota / privacy mode failures.
  }
}

export function captureStorefrontCampaignAttribution({ search = '', pathname = '', href = '' } = {}) {
  if (typeof window === 'undefined') return null;

  const trackedParams = parseTrackedParams(search || window.location.search || '');
  const hasTrackedParams = Object.values(trackedParams).some(Boolean);
  const storedAttribution = loadStorefrontCampaignAttribution();
  const timestamp = new Date().toISOString();

  if (!hasTrackedParams) {
    if (storedAttribution) {
      const refreshedAttribution = normalizeAttribution({
        ...storedAttribution,
        lastSeenAt: timestamp,
      });

      saveStorefrontCampaignAttribution(refreshedAttribution);
      return refreshedAttribution;
    }

    const referrer = normalizeValue(window.document?.referrer, 320);
    if (!referrer) return null;

    const referralAttribution = normalizeAttribution({
      utmSource: extractReferrerSource(referrer) || 'direct',
      utmMedium: 'referral',
      referrer,
      landingPath: pathname || window.location.pathname,
      landingUrl: href || window.location.href,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
    });

    saveStorefrontCampaignAttribution(referralAttribution);
    return referralAttribution;
  }

  const nextAttribution = normalizeAttribution({
    ...storedAttribution,
    ...trackedParams,
    referrer: storedAttribution?.referrer || normalizeValue(window.document?.referrer, 320),
    landingPath: storedAttribution?.landingPath || pathname || window.location.pathname,
    landingUrl: storedAttribution?.landingUrl || href || window.location.href,
    firstSeenAt: storedAttribution?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
  });

  saveStorefrontCampaignAttribution(nextAttribution);
  return nextAttribution;
}

export function getStorefrontCampaignBanner(attribution = loadStorefrontCampaignAttribution()) {
  if (!attribution) return null;

  const title = attribution.campaignMessage
    || (attribution.utmCampaign ? `عرض خاص: ${formatCampaignLabel(attribution.utmCampaign)}` : '')
    || (attribution.affiliateCode ? `تم تفعيل رابط شريك: ${formatCampaignLabel(attribution.affiliateCode)}` : '')
    || (attribution.utmSource ? `وصلت من ${formatCampaignLabel(attribution.utmSource)}` : '');

  if (!title) return null;

  return {
    title,
    detail: attribution.utmMedium
      ? `سيتم الاحتفاظ برسالة ${formatCampaignLabel(attribution.utmMedium)} حتى إتمام الطلب.`
      : 'سيتم ربط هذه الزيارة بطلبك حتى نتمكن من قياس نتائج الحملة بشكل دقيق.',
  };
}
