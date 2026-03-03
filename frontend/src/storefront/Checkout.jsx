import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CreditCard, User, MapPin, Phone, Mail, CheckCircle,
  Wallet, AlertCircle, ShieldCheck, Truck, ChevronLeft,
  ChevronRight, Lock, CreditCard as CardIcon, ShoppingBag,
  Info
} from 'lucide-react';
import { api } from '../store';
import { Card, Button, Input, LoadingSpinner, Badge } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { usePortalStore } from '../store/portalStore';
import { storefrontPath } from '../utils/storefrontHost';
import { useCommerceStore } from '../store/commerceStore';

const STEPS = [
  { id: 'customer', title: 'بيانات العميل', icon: User },
  { id: 'payment', title: 'الدفع والشحن', icon: CreditCard },
  { id: 'summary', title: 'مراجعة الطلب', icon: CheckCircle },
];

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Portal Context
  const isPortal = location.pathname.includes('/portal');
  const { customer, isAuthenticated } = usePortalStore();

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    paymentMethod: isPortal ? 'credit' : 'cash'
  });

  const { cart, clearCart } = useCommerceStore((state) => ({
    cart: state.cart,
    clearCart: state.clearCart,
  }));

  useEffect(() => {
    if (cart.length === 0) {
      navigate(isPortal ? '/portal/cart' : storefrontPath('/cart'));
      return;
    }

    if (isPortal && isAuthenticated && customer) {
      setForm(prev => ({
        ...prev,
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        paymentMethod: 'credit'
      }));
    }
  }, [isPortal, isAuthenticated, customer, cart.length]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const total = subtotal + shipping;

  const nextStep = () => {
    if (currentStep === 0 && (!form.customerName || !form.phone)) {
      notify.error('الرجاء إدخال الاسم ورقم الهاتف');
      return;
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isPortal) {
        // === PORTAL CHECKOUT FLOW ===
        await api.post('/portal/cart/checkout', {
          items: cart.map(item => ({
            productId: item.productId,
            variantId: item.variant?.id,
            quantity: item.quantity
          })),
          paymentMethod: form.paymentMethod,
          notes: form.notes
        }, {
          headers: { Authorization: `Bearer ${usePortalStore.getState().token}` }
        });

        clearCart();
        notify.success('تم استلام طلبك بنجاح');
        navigate('/portal/dashboard');

      } else {
        // === PUBLIC STORE CHECKOUT FLOW ===
        let customerId;
        try {
          const customerRes = await api.post('/customers', {
            name: form.customerName,
            phone: form.phone,
            email: form.email || undefined,
            address: form.address || undefined
          }, { headers: { 'x-source': 'online_store' } });
          customerId = customerRes.data.data._id;
        } catch (err) {
          const searchRes = await api.get(`/customers?search=${form.phone}`, { headers: { 'x-source': 'online_store' } });
          if (searchRes.data.data.length > 0) {
            customerId = searchRes.data.data[0]._id;
          } else {
            throw err;
          }
        }

        const invoiceData = {
          customer: customerId,
          items: cart.map(item => ({
            productId: item.productId,
            variantId: item.variant?.id,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity
          })),
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          source: 'online_store'
        };

        const invoiceRes = await api.post('/invoices', invoiceData);
        const invoice = invoiceRes.data.data;

        clearCart();

        if (form.paymentMethod === 'online') {
          const paymentRes = await api.post('/payments/create-link', {
            invoiceId: invoice._id,
            amount: invoice.totalAmount,
            customerName: form.customerName,
            customerPhone: form.phone,
            customerEmail: form.email
          });
          window.location.href = paymentRes.data.data.paymentUrl;
        } else {
          navigate(storefrontPath(`/order/${invoice._id}`));
        }
      }
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || 'فشل إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4" dir="rtl">
      {/* ═══ PROGRESS STEPS ═══ */}
      <div className="flex justify-between items-center mb-12 relative max-w-2xl mx-auto">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 -z-0" />
        <div className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 -z-0 transition-all duration-500" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />

        {STEPS.map((step, i) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${i <= currentStep ? 'bg-white dark:bg-gray-900 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 text-gray-300'}`}>
              {i < currentStep ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${i <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>{step.title}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ═══ STEP CONTENT ═══ */}
        <div className="lg:col-span-8 space-y-8">
          {currentStep === 0 && (
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] animate-slide-up">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <User className="w-6 h-6 text-indigo-500" />
                بيانات العميل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="الاسم الكامل *"
                  placeholder="مثال: أحمد محمد"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="md:col-span-1"
                  disabled={isPortal}
                />
                <Input
                  label="رقم الهاتف *"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="md:col-span-1"
                  disabled={isPortal}
                />
                <Input
                  label="البريد الإلكتروني (اختياري)"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="md:col-span-2"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-600 mb-2">عنوان التوصيل المقابل للعقار بالتفصيل *</label>
                  <textarea
                    placeholder="رقم العقار، اسم الشارع، المحافظة..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full h-32 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>
            </Card>
          )}

          {currentStep === 1 && (
            <div className="space-y-8 animate-slide-up">
              <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem]">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <Truck className="w-6 h-6 text-indigo-500" />
                  خيار الشحن
                </h2>
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Truck className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-bold">توصيل قياسي</h4>
                        <p className="text-sm text-gray-500">خلال 3-5 أيام عمل</p>
                      </div>
                    </div>
                    <span className="font-black text-indigo-600">{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem]">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-indigo-500" />
                  طريقة الدفع
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isPortal ? (
                    <button
                      onClick={() => setForm({ ...form, paymentMethod: 'credit' })}
                      className={`p-6 rounded-3xl border-2 text-right transition-all group ${form.paymentMethod === 'credit' ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-50' : 'border-gray-100 hover:border-primary-200'}`}
                    >
                      <Wallet className={`w-8 h-8 mb-4 ${form.paymentMethod === 'credit' ? 'text-primary-600' : 'text-gray-400'}`} />
                      <h4 className="font-black text-lg mb-1">خصم من الرصيد</h4>
                      <p className="text-xs text-gray-500">رصيدك: {customer?.balance?.toLocaleString()} ج.م</p>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setForm({ ...form, paymentMethod: 'cash' })}
                        className={`p-6 rounded-3xl border-2 text-right transition-all ${form.paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                      >
                        <Wallet className={`w-8 h-8 mb-4 ${form.paymentMethod === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <h4 className="font-black text-lg mb-1">الدفع عند الاستلام</h4>
                        <p className="text-xs text-gray-500">ادفع نقداً عند باب منزلك</p>
                      </button>
                      <button
                        onClick={() => setForm({ ...form, paymentMethod: 'online' })}
                        className={`p-6 rounded-3xl border-2 text-right transition-all ${form.paymentMethod === 'online' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}
                      >
                        <Lock className={`w-8 h-8 mb-4 ${form.paymentMethod === 'online' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <h4 className="font-black text-lg mb-1">بطاقة بنكية / محفظة</h4>
                        <p className="text-xs text-gray-500">ادفع الآن بأمان تام</p>
                      </button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] animate-slide-up">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-500" />
                مراجعة نهائية
              </h2>
              <div className="space-y-6">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">توصيل إلى</h4>
                    <p className="font-bold text-gray-900">{form.customerName}</p>
                    <p className="text-sm text-gray-500">{form.address}</p>
                    <p className="text-sm text-gray-500">{form.phone}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">طريقة الدفع</h4>
                    <p className="font-bold text-gray-900">
                      {form.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : form.paymentMethod === 'credit' ? 'رصيد المحفظة' : 'دفع إلكتروني'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">المنتجات المختارة ({cart.length})</h4>
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-sm">{item.name}</h5>
                        <p className="text-xs text-gray-400">الكمية: {item.quantity}</p>
                      </div>
                      <span className="font-black">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <label className="block text-sm font-bold text-gray-600 mb-2">هل لديك أي ملاحظات أخرى؟</label>
                  <textarea
                    placeholder="مثال: يرجى الاتصال قبل الوصول بـ 15 دقيقة"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full h-24 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ═══ NAVIGATION BUTTONS ═══ */}
          <div className="flex justify-between items-center pt-4">
            {currentStep > 0 && (
              <Button variant="ghost" className="px-10" onClick={prevStep}>
                <ChevronRight className="w-5 h-5 ml-2" />
                السابق
              </Button>
            )}
            <div className="mr-auto">
              {currentStep < STEPS.length - 1 ? (
                <Button className="px-12 h-14" onClick={nextStep}>
                  المتابعة
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Button>
              ) : (
                <Button
                  className="px-16 h-14 shadow-2xl shadow-indigo-500/40"
                  loading={loading}
                  onClick={handleSubmit}
                  disabled={isPortal && customer && total > (customer.balance || 0)}
                >
                  <CheckCircle className="w-5 h-5 ml-2" />
                  تأكيد وطلب الآن
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SIDEBAR: ORDER SUMMARY ═══ */}
        <aside className="lg:col-span-4">
          <div className="sticky top-28 space-y-6">
            <Card className="p-8 border-transparent shadow-xl rounded-[2.5rem] bg-indigo-900 text-white overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <h3 className="text-xl font-black mb-8 relative">ملخص الطلب</h3>

              <div className="space-y-4 mb-8 relative">
                <div className="flex justify-between text-indigo-200">
                  <span className="font-medium">المجموع الفرعي</span>
                  <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-indigo-200">
                  <span className="font-medium">تكلفة الشحن</span>
                  <span className="font-bold">{shipping === 0 ? 'مجاني' : `${shipping} ج.م`}</span>
                </div>
                <div className="h-px bg-white/20 my-4" />
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">الإجمالي النهائي</p>
                    <p className="text-4xl font-black">{total.toLocaleString()} <span className="text-sm font-medium">ج.م</span></p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center gap-3 opacity-80">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">ضمان حماية المشتري مفعّل</span>
              </div>
            </Card>

            {/* Trust & Confidence Markers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                <Lock className="w-6 h-6 text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-gray-400">دفع آمن</span>
              </div>
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center text-center">
                <Truck className="w-6 h-6 text-amber-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-gray-400">تتبع طلبك</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase">
                أنت بصدد طلب {cart.reduce((s, i) => s + i.quantity, 0)} قطعة من متجرنا. نحن نضمن لك جودة المنتج وسلامة التوصيل.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
