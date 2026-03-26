import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, X, Package, Trash2, Receipt } from 'lucide-react';

export default function PortalCartDrawer({
    isCartOpen,
    toggleCart,
    cart,
    cartTotal,
    removeFromCart,
}) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('portal');

    const currency = i18n.language === 'ar' ? t('portal_cart_drawer.ui.kwlxf') : 'EGP';

    return (
        <>
            {isCartOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
                    onClick={toggleCart}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cart-drawer-title"
                />
            )}

            <div className={`fixed inset-y-0 ${i18n.dir() === 'rtl' ? 'left-0' : 'right-0'} w-full md:w-96 app-surface shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-l border-gray-100/80 dark:border-white/10 ${isCartOpen ? 'translate-x-0' : (i18n.dir() === 'rtl' ? '-translate-x-full' : 'translate-x-full')}`}>
                <div className="app-surface-muted p-4 border-b border-gray-100/80 dark:border-white/10 flex justify-between items-center">
                    <h2 id="cart-drawer-title" className="text-lg font-bold flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary-600" />
                        {t('layout.cart_title')}
                        <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs px-2 py-0.5 rounded-full">
                            {t('layout.cart_count', { count: cart.length })}
                        </span>
                    </h2>
                    <button
                        onClick={toggleCart}
                        className="app-surface w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
                        aria-label={t('layout.close_cart')}
                        title={t('layout.close_cart')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* UPSELLING BANNER */}
                    {cart.length > 0 && cartTotal < 1000 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-3 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                                <Package className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{t('layout.free_shipping')}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {t('layout.free_shipping_desc', { amount: (1000 - cartTotal).toLocaleString() })}
                                </p>
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(cartTotal / 1000) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                            <div className="app-surface-muted w-20 h-20 rounded-full flex items-center justify-center mb-4">
                                <ShoppingCart className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="font-bold text-lg">{t('layout.cart_empty')}</p>
                            <p className="text-sm text-gray-500">{t('layout.cart_empty_desc')}</p>
                            <button onClick={toggleCart} className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold">
                                {t('layout.browse_store')}
                            </button>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={idx} className="app-surface-muted flex gap-3 p-3 rounded-2xl border border-gray-100/80 dark:border-white/10">
                                <div className="app-surface w-16 h-16 rounded-xl overflow-hidden shrink-0">
                                    {item.product.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <Package className="w-full h-full p-4 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                                        <button
                                            onClick={() => removeFromCart(item.cartKey)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            aria-label={t('layout.remove_from_cart')}
                                            title={t('layout.remove_from_cart')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {item.variant && <p className="text-xs text-gray-500">{item.variant.sku}</p>}
                                    <div className="flex justify-between items-end">
                                        <p className="font-bold text-primary-600">{item.price.toLocaleString()} {currency}</p>
                                        <div className="text-xs font-medium app-surface px-2 py-0.5 rounded-md border border-gray-100/80 dark:border-white/10">
                                            {t('layout.quantity', { count: item.quantity })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="app-surface p-4 border-t border-gray-100/80 dark:border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 text-sm">{t('layout.subtotal')}</span>
                            <span className="font-black text-xl text-gray-900 dark:text-white">{cartTotal.toLocaleString()} {currency}</span>
                        </div>
                        <button
                            onClick={() => { toggleCart(); navigate('/portal/checkout'); }}
                            className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Receipt className="w-5 h-5" />
                            {t('layout.checkout')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
