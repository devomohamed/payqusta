export const STOREFRONT_VOLUME_OFFER_TIERS = [
  {
    minQuantity: 3,
    discountPercent: 10,
    label: 'اشترِ 3+ وخذ 10% خصم',
    shortLabel: 'خصم 10%',
  },
  {
    minQuantity: 2,
    discountPercent: 5,
    label: 'اشترِ 2 وخذ 5% خصم',
    shortLabel: 'خصم 5%',
  },
];

export function getStorefrontVolumeOfferForQuantity(quantity) {
  const normalizedQuantity = Number(quantity) || 0;

  return STOREFRONT_VOLUME_OFFER_TIERS.find((tier) => normalizedQuantity >= tier.minQuantity) || null;
}

export function calculateStorefrontVolumeDiscountForLine(price, quantity) {
  const normalizedPrice = Number(price) || 0;
  const normalizedQuantity = Number(quantity) || 0;
  const activeTier = getStorefrontVolumeOfferForQuantity(normalizedQuantity);

  if (!activeTier || normalizedPrice <= 0 || normalizedQuantity <= 0) {
    return 0;
  }

  return normalizedPrice * normalizedQuantity * (activeTier.discountPercent / 100);
}

export function calculateStorefrontVolumeDiscountForItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((sum, item) => {
    const price = item?.price ?? item?.unitPrice ?? item?.variant?.price ?? item?.product?.price ?? item?.product?.basePrice ?? 0;
    const quantity = item?.quantity || 0;
    return sum + calculateStorefrontVolumeDiscountForLine(price, quantity);
  }, 0);
}
