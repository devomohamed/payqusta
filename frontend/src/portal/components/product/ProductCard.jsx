import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Heart, Package } from 'lucide-react';
import { pickProductImage } from '../../../utils/media';

export default function ProductCard({
  product,
  currencyLabel = 'EGP',
  addToCart,
  toggleWishlist,
  isWishlisted,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('portal');

  const handleCardClick = () => {
    navigate(`/portal/products/${product.slug || product._id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product.stock?.quantity > 0) addToCart(product);
  };

  const handleToggleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(product._id).catch(() => {});
  };

  const isOutOfStock = product.stock?.quantity === 0;
  const isLowStock = product.stock?.quantity < product.stock?.minQuantity && product.stock?.quantity > 0;
  const displayImage = pickProductImage(product);

  return (
    <div
      className="app-surface rounded-3xl border border-gray-100/80 p-3 shadow-sm transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 dark:border-white/10"
      onClick={handleCardClick}
    >
      <div className="aspect-[4/5] sm:aspect-square app-surface-muted rounded-2xl mb-3 relative overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600">
            <Package className="w-10 h-10" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isLowStock && (
            <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
              Low stock
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
              {t('productDetails.out_of_stock')}
            </span>
          )}
        </div>
      </div>

      <div className="px-1">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 h-10">
          {product.name}
        </h4>
        <div className="flex items-end justify-between">
          <div>
            {(product.oldPrice || (product.cost > 0 && product.price > product.cost)) && (
              <p className="text-[10px] text-gray-400 line-through decoration-red-400">
                {(product.oldPrice || (product.price * 1.2)).toLocaleString()}
              </p>
            )}
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {product.price?.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">{currencyLabel}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleToggleWishlist}
            aria-label="Add to wishlist"
            title="Add to wishlist"
            className="app-surface-muted h-10 w-10 rounded-xl border border-transparent text-gray-600 dark:text-gray-300 flex items-center justify-center transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          >
            <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
          </button>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? 'Out of stock' : 'Add to cart'}
            title={isOutOfStock ? 'Out of stock' : 'Add to cart'}
            className="flex-1 h-10 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <ShoppingBag className="w-4 h-4" />
            {isOutOfStock ? t('productDetails.out_of_stock') : t('wishlist.add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  );
}
