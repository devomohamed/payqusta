const GUEST_ORDER_TRACKING_KEY = 'payqusta.guest_order_tracking';

export function saveGuestOrderTracking(payload) {
  if (typeof window === 'undefined' || !payload) return;

  try {
    window.localStorage.setItem(
      GUEST_ORDER_TRACKING_KEY,
      JSON.stringify({
        orderId: payload.orderId || '',
        orderNumber: payload.orderNumber || '',
        token: payload.token || '',
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore local storage failures.
  }
}

export function loadGuestOrderTracking() {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(GUEST_ORDER_TRACKING_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      orderId: parsed.orderId || '',
      orderNumber: parsed.orderNumber || '',
      token: parsed.token || '',
      savedAt: parsed.savedAt || '',
    };
  } catch {
    return null;
  }
}

export function buildGuestTrackingQuery({ orderNumber = '', token = '' } = {}) {
  const searchParams = new URLSearchParams();
  if (orderNumber) searchParams.set('orderNumber', orderNumber);
  if (token) searchParams.set('token', token);
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

