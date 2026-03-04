const STOREFRONT_GUEST_PROFILE_KEY = 'payqusta-storefront-guest-profile';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadStorefrontGuestProfile() {
  if (!canUseStorage()) return null;

  try {
    const rawProfile = window.localStorage.getItem(STOREFRONT_GUEST_PROFILE_KEY);
    if (!rawProfile) return null;

    const parsedProfile = JSON.parse(rawProfile);
    if (!parsedProfile || typeof parsedProfile !== 'object') return null;

    return {
      customerName: parsedProfile.customerName || '',
      phone: parsedProfile.phone || '',
      email: parsedProfile.email || '',
      address: parsedProfile.address || '',
      governorate: parsedProfile.governorate || '',
      city: parsedProfile.city || '',
    };
  } catch (error) {
    return null;
  }
}

export function saveStorefrontGuestProfile(profile) {
  if (!canUseStorage()) return;

  const normalizedProfile = {
    customerName: profile?.customerName?.trim() || '',
    phone: profile?.phone?.trim() || '',
    email: profile?.email?.trim() || '',
    address: profile?.address?.trim() || '',
    governorate: profile?.governorate?.trim() || '',
    city: profile?.city?.trim() || '',
  };

  try {
    window.localStorage.setItem(STOREFRONT_GUEST_PROFILE_KEY, JSON.stringify(normalizedProfile));
  } catch (error) {
    // Ignore storage quota / privacy mode failures.
  }
}

export function clearStorefrontGuestProfile() {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STOREFRONT_GUEST_PROFILE_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}
