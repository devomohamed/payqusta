import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Card, Button, EmptyState } from '../components/UI';
import { storefrontPath } from '../utils/storefrontHost';
import { useCommerceStore } from '../store/commerceStore';
import { pickProductImage } from '../utils/media';

export default function ShoppingCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal') || location.pathname.includes('/account');
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useCommerceStore((state) => ({
    cart: state.cart,
    updateCartQuantity: state.updateCartQuantity,
    removeFromCart: state.removeFromCart,
    clearCart: state.clearCart,
  }));

  const handleQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    updateCartQuantity(cart[index].cartKey, newQuantity);
  };

  const handleClearCart = () => {
    if (window.confirm('هل تريد إفراغ السلة؟')) {
      clearCart();
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ShoppingBag className="w-16 h-16" />}
          title="سلة التسوق فارغة"
          description="لم تقم بإضافة أي منتجات بعد"
        />
        <div className="text-center mt-6">
          <Button onClick={() => navigate(isPortal ? '/account/products' : storefrontPath('/products'))}>
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">سلة التسوق</h1>
        <button
          onClick={handleClearCart}
          className="text-red-500 hover:text-red-600 text-sm font-medium"
        >
          إفراغ السلة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item, index) => {
            const product = item.product || item;
            const imageUrl = pickProductImage(product);
            const productName = product?.name || 'منتج';
            const variantAttributes = item.variant?.attributes || {};

            return (
              <Card key={item.cartKey || index} className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{productName}</h3>
                    {Object.keys(variantAttributes).length > 0 && (
                      <p className="text-sm text-gray-500 mb-2 flex flex-wrap gap-2">
                        {Object.entries(variantAttributes).map(([key, value]) => (
                          <span key={key}>{String(value)}</span>
                        ))}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantity(index, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-lg font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantity(index, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-left">
                        <div className="text-xl font-black text-primary-600">
                          {((item.price || 0) * (item.quantity || 0)).toFixed(2)} ج.م
                        </div>
                        <div className="text-xs text-gray-400">
                          {(item.price || 0).toFixed(2)} ج.م × {item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.cartKey)}
                    className="text-red-500 hover:text-red-600 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4">ملخص الطلب</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الضريبة (14%):</span>
                <span className="font-bold">{tax.toFixed(2)} ج.م</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-lg">
                <span className="font-bold">الإجمالي:</span>
                <span className="font-black text-primary-600 text-2xl">{total.toFixed(2)} ج.م</span>
              </div>
            </div>

            <Button
              onClick={() => navigate(isPortal ? '/account/checkout' : storefrontPath('/checkout'))}
              className="w-full"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              إتمام الطلب
            </Button>

            <button
              onClick={() => navigate(isPortal ? '/account/products' : storefrontPath('/products'))}
              className="w-full mt-3 text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              متابعة التسوق
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
