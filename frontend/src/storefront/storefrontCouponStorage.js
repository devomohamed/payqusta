const STOREFRONT_COUPON_KEY = 'storefront_coupon';

export function loadStorefrontCoupon() {
  if (typeof window === 'undefined') return null;

  try {
    const rawCoupon = window.localStorage.getItem(STOREFRONT_COUPON_KEY);
    if (!rawCoupon) return null;

    const parsedCoupon = JSON.parse(rawCoupon);
    if (!parsedCoupon?.coupon?.code) return null;

    return parsedCoupon;
  } catch {
    return null;
  }
}

export function saveStorefrontCoupon(couponData) {
  if (typeof window === 'undefined' || !couponData?.coupon?.code) return;
  window.localStorage.setItem(STOREFRONT_COUPON_KEY, JSON.stringify(couponData));
}

export function clearStorefrontCoupon() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STOREFRONT_COUPON_KEY);
}
