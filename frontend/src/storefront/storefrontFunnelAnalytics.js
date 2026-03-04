const STOREFRONT_FUNNEL_KEY = 'payqusta-storefront-funnel-analytics';
const STOREFRONT_FUNNEL_SESSION_KEY = 'payqusta-storefront-funnel-session';
const MAX_RECENT_EVENTS = 60;
const MAX_TRACKED_SESSIONS = 40;
const STAGE_KEYS = ['product_view', 'add_to_cart', 'cart_view', 'checkout_start', 'order_complete'];

function canUseStorage() {
  return typeof window !== 'undefined'
    && typeof window.localStorage !== 'undefined'
    && typeof window.sessionStorage !== 'undefined';
}

function createSessionId() {
  return `sf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStageMap() {
  return STAGE_KEYS.reduce((map, key) => ({ ...map, [key]: 0 }), {});
}

function createEmptyAnalytics() {
  return {
    version: 1,
    updatedAt: '',
    totals: createEmptyStageMap(),
    stageSessions: createEmptyStageMap(),
    guestDropoff: {
      browseToIntent: 0,
      intentToCheckout: 0,
      checkoutToOrder: 0,
    },
    sessions: {},
    recentEvents: [],
  };
}

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeAnalytics(rawAnalytics) {
  const baseAnalytics = createEmptyAnalytics();
  if (!rawAnalytics || typeof rawAnalytics !== 'object') return baseAnalytics;

  return {
    ...baseAnalytics,
    ...rawAnalytics,
    totals: {
      ...baseAnalytics.totals,
      ...(rawAnalytics.totals || {}),
    },
    stageSessions: {
      ...baseAnalytics.stageSessions,
      ...(rawAnalytics.stageSessions || {}),
    },
    guestDropoff: {
      ...baseAnalytics.guestDropoff,
      ...(rawAnalytics.guestDropoff || {}),
    },
    sessions: rawAnalytics.sessions && typeof rawAnalytics.sessions === 'object'
      ? rawAnalytics.sessions
      : {},
    recentEvents: Array.isArray(rawAnalytics.recentEvents) ? rawAnalytics.recentEvents : [],
  };
}

function loadAnalytics() {
  if (!canUseStorage()) return createEmptyAnalytics();

  try {
    const rawAnalytics = window.localStorage.getItem(STOREFRONT_FUNNEL_KEY);
    if (!rawAnalytics) return createEmptyAnalytics();

    return normalizeAnalytics(JSON.parse(rawAnalytics));
  } catch (error) {
    return createEmptyAnalytics();
  }
}

function saveAnalytics(analytics) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STOREFRONT_FUNNEL_KEY, JSON.stringify(analytics));
  } catch (error) {
    // Ignore storage quota / privacy mode failures.
  }
}

function getSessionId() {
  if (!canUseStorage()) return 'storefront-fallback';

  try {
    const existingSessionId = window.sessionStorage.getItem(STOREFRONT_FUNNEL_SESSION_KEY);
    if (existingSessionId) return existingSessionId;

    const nextSessionId = createSessionId();
    window.sessionStorage.setItem(STOREFRONT_FUNNEL_SESSION_KEY, nextSessionId);
    return nextSessionId;
  } catch (error) {
    return createSessionId();
  }
}

function pruneSessions(sessions) {
  const entries = Object.entries(sessions || {});
  if (entries.length <= MAX_TRACKED_SESSIONS) return sessions;

  const keptEntries = entries
    .sort(([, left], [, right]) => {
      const leftTime = new Date(left?.lastEventAt || left?.startedAt || 0).getTime();
      const rightTime = new Date(right?.lastEventAt || right?.startedAt || 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, MAX_TRACKED_SESSIONS);

  return Object.fromEntries(keptEntries);
}

function recomputeGuestDropoff(stageSessions) {
  const productViews = normalizeNumber(stageSessions.product_view);
  const addToCart = normalizeNumber(stageSessions.add_to_cart);
  const checkoutStarts = normalizeNumber(stageSessions.checkout_start);
  const orderCompletions = normalizeNumber(stageSessions.order_complete);

  return {
    browseToIntent: Math.max(productViews - addToCart, 0),
    intentToCheckout: Math.max(addToCart - checkoutStarts, 0),
    checkoutToOrder: Math.max(checkoutStarts - orderCompletions, 0),
  };
}

function getSessionState(analytics, sessionId, timestamp) {
  const existingSession = analytics.sessions[sessionId];
  if (existingSession && typeof existingSession === 'object') {
    return {
      startedAt: existingSession.startedAt || timestamp,
      lastEventAt: existingSession.lastEventAt || timestamp,
      currentStep: existingSession.currentStep || '',
      completed: !!existingSession.completed,
      reached: existingSession.reached && typeof existingSession.reached === 'object'
        ? existingSession.reached
        : {},
      productIds: Array.isArray(existingSession.productIds) ? existingSession.productIds : [],
      orderIds: Array.isArray(existingSession.orderIds) ? existingSession.orderIds : [],
      eventKeys: Array.isArray(existingSession.eventKeys) ? existingSession.eventKeys : [],
    };
  }

  return {
    startedAt: timestamp,
    lastEventAt: timestamp,
    currentStep: '',
    completed: false,
    reached: {},
    productIds: [],
    orderIds: [],
    eventKeys: [],
  };
}

function markStageReached(analytics, sessionState, stageKey, timestamp) {
  if (!STAGE_KEYS.includes(stageKey)) return;
  if (sessionState.reached[stageKey]) return;

  sessionState.reached[stageKey] = timestamp;
  analytics.stageSessions[stageKey] = normalizeNumber(analytics.stageSessions[stageKey]) + 1;
}

function addUniqueValue(list, value, maxItems = 12) {
  if (!value) return list;

  const filtered = list.filter((item) => item !== value);
  return [...filtered, value].slice(-maxItems);
}

function createEventRecord(eventType, payload, sessionId, timestamp) {
  return {
    type: eventType,
    sessionId,
    at: timestamp,
    source: payload?.source || '',
    productId: payload?.productId || '',
    orderId: payload?.orderId || '',
    cartSize: normalizeNumber(payload?.cartSize),
    itemCount: normalizeNumber(payload?.itemCount),
    totalAmount: normalizeNumber(payload?.totalAmount),
  };
}

export function trackStorefrontFunnelEvent(eventType, payload = {}) {
  if (!canUseStorage()) return null;
  if (!STAGE_KEYS.includes(eventType)) return null;

  const timestamp = new Date().toISOString();
  const analytics = loadAnalytics();
  const sessionId = getSessionId();
  const sessionState = getSessionState(analytics, sessionId, timestamp);
  const uniqueEventKey = typeof payload.uniqueEventKey === 'string' ? payload.uniqueEventKey.trim() : '';

  if (uniqueEventKey && sessionState.eventKeys.includes(uniqueEventKey)) {
    return {
      sessionId,
      stageSessions: analytics.stageSessions,
      guestDropoff: analytics.guestDropoff,
    };
  }

  analytics.totals[eventType] = normalizeNumber(analytics.totals[eventType]) + 1;
  markStageReached(analytics, sessionState, eventType, timestamp);

  if (eventType === 'checkout_start' && payload?.source === 'buy_now') {
    markStageReached(analytics, sessionState, 'add_to_cart', timestamp);
  }

  sessionState.currentStep = eventType;
  sessionState.lastEventAt = timestamp;
  sessionState.productIds = addUniqueValue(sessionState.productIds, payload?.productId);
  sessionState.orderIds = addUniqueValue(sessionState.orderIds, payload?.orderId);
  if (eventType === 'order_complete') {
    sessionState.completed = true;
  }

  if (uniqueEventKey) {
    sessionState.eventKeys = addUniqueValue(sessionState.eventKeys, uniqueEventKey, 30);
  }

  analytics.sessions[sessionId] = sessionState;
  analytics.sessions = pruneSessions(analytics.sessions);
  analytics.recentEvents = [
    ...analytics.recentEvents,
    createEventRecord(eventType, payload, sessionId, timestamp),
  ].slice(-MAX_RECENT_EVENTS);
  analytics.updatedAt = timestamp;
  analytics.guestDropoff = recomputeGuestDropoff(analytics.stageSessions);

  saveAnalytics(analytics);

  return {
    sessionId,
    stageSessions: analytics.stageSessions,
    guestDropoff: analytics.guestDropoff,
  };
}

export function getStorefrontFunnelAnalyticsSummary() {
  const analytics = loadAnalytics();

  return {
    updatedAt: analytics.updatedAt,
    totals: analytics.totals,
    stageSessions: analytics.stageSessions,
    guestDropoff: analytics.guestDropoff,
    recentEvents: analytics.recentEvents,
  };
}
