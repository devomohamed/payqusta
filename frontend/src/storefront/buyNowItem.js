import { pickProductImage } from '../utils/media';

export function createBuyNowItem(product, quantity = 1, variant = null) {
  if (!product?._id) return null;

  const normalizedVariant = variant
    ? {
        ...variant,
        id: variant.id || variant._id || variant.sku,
      }
    : null;

  return {
    product,
    productId: product._id,
    variant: normalizedVariant,
    quantity,
    cartKey: normalizedVariant ? `${product._id}-${normalizedVariant.id || normalizedVariant.sku}` : product._id,
    price: normalizedVariant?.price || product.price || 0,
    name: product.name,
    image: pickProductImage(product),
  };
}
