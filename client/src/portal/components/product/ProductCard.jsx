import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Package } from 'lucide-react';

export default function ProductCard({
    product,
    currencyLabel = 'ج.م',
    addToCart,
    toggleWishlist,
    isWishlisted
}) {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/portal/products/${product.slug || product._id}`);
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        if (product.stock?.quantity > 0) addToCart(product);
    };

    const handleToggleWishlist = (e) => {
        e.stopPropagation();
        toggleWishlist(product._id).catch(() => { });
    };

    const isOutOfStock = product.stock?.quantity === 0;
    const isLowStock = product.stock?.quantity < product.stock?.minQuantity && product.stock?.quantity > 0;

    // Decide best image
    const displayImage = product.thumbnail || product.images?.[0];

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 group cursor-pointer border border-gray-100 dark:border-gray-700/50"
            onClick={handleCardClick}
        >
            {/* Image Container */}
            <div className="aspect-[4/5] bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-3 relative overflow-hidden">
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

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {isLowStock && (
                        <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
                            كمية محدودة
                        </span>
                    )}
                    {isOutOfStock && (
                        <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
                            نفذت الكمية
                        </span>
                    )}
                </div>

                {/* Floating Add Btn */}
                <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    aria-label={isOutOfStock ? "نفذت الكمية" : "أضف للسلة"}
                    title={isOutOfStock ? "نفذت الكمية" : "أضف للسلة"}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-gray-900 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all md:translate-y-12 md:group-hover:translate-y-0 duration-300 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ShoppingBag className="w-5 h-5" />
                </button>

                {/* Wishlist */}
                <button
                    onClick={handleToggleWishlist}
                    aria-label="أضف للمفضلة"
                    title="أضف للمفضلة"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 hover:scale-110 shadow-sm"
                >
                    <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
                </button>
            </div>

            {/* Details */}
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
            </div>
        </div>
    );
}
