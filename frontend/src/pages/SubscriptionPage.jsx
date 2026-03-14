import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Check, CreditCard, Copy, Sparkles, UploadCloud } from 'lucide-react';
import { api, subscriptionApi } from '../store';
import toast from 'react-hot-toast';
import { Modal, Button, Badge } from '../components/UI';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';

const FEATURE_TRANSLATIONS = {
  advanced_reports: 'تقارير ومبيعات متقدمة',
  pos: 'نظام نقاط البيع (POS / كاشير)',
  whatsapp_notifications: 'إرسال فواتير وإشعارات عبر واتس آب',
  multi_branch: 'إدارة أكثر من فرع بذكاء',
  api_access: 'ربط برمجي مع تطبيقات خارجية (API)',
  barcode_scanner: 'دعم الباركود والماسح الضوئي',
  loyalty_program: 'برنامج الولاء ونقاط العملاء',
  customer_portal: 'بوابة إلكترونية لعملائك لتتبع الفواتير',
  inventory_management: 'إدارة متقدمة للمخزون وجرد المستودع',
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualPaymentInfo, setManualPaymentInfo] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptBase64, setReceiptBase64] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  const location = useLocation();
  const selectedPlanId = useMemo(() => new URLSearchParams(location.search || '').get('plan') || '', [location.search]);

  const enabledMethods = useMemo(
    () => paymentMethods.filter((method) => method.available),
    [paymentMethods]
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan?._id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const orderedPlans = useMemo(() => {
    if (!selectedPlanId) return plans;

    const selected = [];
    const remaining = [];

    plans.forEach((plan) => {
      if (plan?._id === selectedPlanId) {
        selected.push(plan);
      } else {
        remaining.push(plan);
      }
    });

    return [...selected, ...remaining];
  }, [plans, selectedPlanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, methodsRes] = await Promise.all([
        api.get('/plans'),
        api.get('/subscriptions/my-subscription'),
        api.get('/subscriptions/payment-methods'),
      ]);

      setPlans(plansRes.data?.data || []);
      setCurrentSubscription(subRes.data?.data || null);

      const methods = methodsRes.data?.data?.methods || [];
      const available = methodsRes.data?.data?.availableMethods || [];
      setPaymentMethods(methods);
      setAvailableMethods(available);
      if (available.length > 0) setSelectedGateway(available[0]);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'فشل تحميل بيانات الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPlanId || plans.length === 0 || typeof document === 'undefined') return;

    const element = document.getElementById(`subscription-plan-${selectedPlanId}`);
    if (!element) return;

    const rafId = window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [plans, selectedPlanId]);

  const handleSubscribe = async (planId) => {
    if (!selectedGateway) {
      toast.error('لا توجد طريقة دفع متاحة. تواصل مع صاحب النظام.');
      return;
    }

    setIsProcessing(planId);
    try {
      const res = await api.post('/subscriptions/subscribe', {
        planId,
        gateway: selectedGateway,
        billingCycle,
      });

      const paymentLink = res.data?.data?.paymentLink;
      if (!paymentLink) {
        toast.error(res.data?.message || 'فشل إنشاء رابط الدفع');
        return;
      }

      if (['instapay', 'vodafone_cash'].includes(selectedGateway)) {
        setManualPaymentInfo({
          ...res.data?.data,
          planId,
          gatewayName: selectedGateway === 'instapay' ? 'إنستا باي (InstaPay)' : 'فودافون كاش',
        });
      } else {
        toast.success(`تم اختيار ${selectedGateway}... جاري التحويل`);
        setTimeout(() => {
          window.location.href = paymentLink;
        }, 1000);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'فشل الاتصال ببوابة الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.warning('حجم صورة التحويل يجب ألا يتجاوز 20MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptBase64) {
      toast.error('الرجاء إرفاق صورة الإيصال أولاً');
      return;
    }

    setIsSubmittingReceipt(true);
    try {
      await subscriptionApi.submitReceipt({
        planId: manualPaymentInfo.planId,
        gateway: manualPaymentInfo.gateway,
        receiptImage: receiptBase64,
      });
      toast.success('تم رفع الإيصال بنجاح. سنراجع الطلب ونفعل الاشتراك قريبًا.', { duration: 5000 });
      setManualPaymentInfo(null);
      setReceiptFile(null);
      setReceiptBase64('');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'فشل رفع الإيصال');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <AnimatedBrandLogo size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-950/30">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 px-2">
          <h2 className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase mb-3">خطط الاشتراك المميزة</h2>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            استثمر في <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">نجاح تجارتك</span>
          </p>
          <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            اختر الباقة التي تناسب تطلعاتك. يمكنك الترقية أو التغيير في أي وقت بكل سهولة.
          </p>
        </div>

        {selectedPlan && currentSubscription?.plan?._id !== selectedPlan._id && (
          <div className="mt-8 max-w-4xl mx-auto rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  الباقة المختارة من الموقع
                </div>
                <h3 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{selectedPlan.name}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  {selectedPlan.description || 'هذه هي الباقة التي اخترتها من صفحة الأسعار. يمكنك إكمال الاشتراك مباشرة من هنا بعد اختيار وسيلة الدفع.'}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-amber-100 dark:bg-gray-900 dark:ring-amber-900/30">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">السعر الحالي</p>
                <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-300">
                  {(Number(selectedPlan.price || 0)).toLocaleString('ar-EG')} {selectedPlan.currency || 'EGP'}
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {selectedPlan.billingCycle === 'yearly' ? 'خطة سنوية' : 'خطة شهرية'}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentSubscription && (
          <div className="mt-8 max-w-4xl mx-auto bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-sm p-4 sm:p-6 border border-indigo-100 dark:border-indigo-900/30 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  باقتك الحالية النشطة
                </h3>
              </div>
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 uppercase">
                {currentSubscription.plan?.name || 'فترة تجريبية'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">حالة الاشتراك</p>
              <Badge variant={currentSubscription.status === 'active' ? 'success' : 'warning'} className="mt-1">
                {currentSubscription.status === 'active' ? 'نشط' : 'منتهي الصلاحية'}
              </Badge>
            </div>
          </div>
        )}

        <div className="mt-10 sm:mt-12 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">اختر طريقة الدفع المفضلة</h3>
          </div>

          {enabledMethods.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">لا تتوفر طرق دفع حاليًا. يرجى مراجعة الإدارة.</p>
            </div>
          )}

          {enabledMethods.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enabledMethods.map((method) => (
                <button
                  key={method.key}
                  onClick={() => setSelectedGateway(method.key)}
                  className={`relative group p-5 rounded-2xl border-2 text-right transition-all duration-300 active:scale-95 ${selectedGateway === method.key
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md shadow-indigo-100 dark:shadow-none'
                    : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-gray-900'
                    }`}
                >
                  {selectedGateway === method.key && (
                    <div className="absolute top-3 left-3">
                      <div className="bg-indigo-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                  <div className={`font-bold text-lg mb-1 ${selectedGateway === method.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {method.label}
                  </div>
                  <div className="text-xs text-gray-400 font-medium opacity-80">
                    {method.account || method.number || 'دفع أوتوماتيكي سريع'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 sm:mt-16 flex flex-col items-center px-4">
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 sm:px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${billingCycle === 'monthly'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              دفع شهري
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 sm:px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative ${billingCycle === 'yearly'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              دفع سنوي
              <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-bounce">
                وفر 20%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 max-w-[100rem] mx-auto px-2 sm:px-4 lg:px-6 pb-24">
          {orderedPlans.map((plan, index) => {
            const isCurrentPlan = currentSubscription?.plan?._id === plan._id;
            const isSelectedPlan = plan._id === selectedPlanId;
            const displayPrice = billingCycle === 'yearly' ? Math.floor((plan.price || 0) * 12 * 0.8) : plan.price || 0;
            const isPopular = Boolean(plan.isPopular) || (!selectedPlanId && (index === 1 || orderedPlans.length === 1));

            return (
              <div
                id={`subscription-plan-${plan._id}`}
                key={plan._id}
                className={`relative flex flex-col rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-lg ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isSelectedPlan
                  ? 'ring-2 ring-amber-400 dark:ring-amber-300 shadow-amber-200/80 dark:shadow-amber-900/30 md:scale-[1.03] z-20'
                  : isPopular
                    ? 'ring-indigo-600 dark:ring-indigo-500 shadow-indigo-200 dark:shadow-indigo-900/50 md:scale-105 z-10'
                    : 'ring-gray-200 dark:ring-gray-700'
                  }`}
              >
                {(isPopular || isSelectedPlan) && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm ${isSelectedPlan ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}>
                      {isSelectedPlan ? 'الباقة المختارة' : 'الأكثر شيوعًا'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2 mt-1">
                  <h3 className={`text-lg font-bold ${isPopular ? 'text-indigo-600 dark:text-indigo-400' : isSelectedPlan ? 'text-amber-600 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className={`p-1.5 rounded-lg ${isSelectedPlan ? 'bg-amber-100 dark:bg-amber-900/40' : isPopular ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <CreditCard className={`w-4 h-4 ${isSelectedPlan ? 'text-amber-600 dark:text-amber-300' : isPopular ? 'text-indigo-600' : 'text-gray-500'}`} />
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {plan.description}
                </p>

                <div className="my-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                      {displayPrice}
                    </span>
                    <span className="text-sm font-medium text-gray-500">
                      {plan.currency || 'EGP'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {billingCycle === 'yearly' ? 'تُدفع سنويًا (وفر 20%)' : 'تُدفع شهريًا'}
                  </p>
                </div>

                {plan.limits && (
                  <div className="mb-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 p-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">تفاصيل الاستخدام</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex flex-col items-center p-1.5 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm">
                        <span className="text-[10px] text-gray-400 mb-0.5">الفروع</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {plan.limits.maxBranches === -1 ? '∞' : plan.limits.maxBranches}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-1.5 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm">
                        <span className="text-[10px] text-gray-400 mb-0.5">المستخدمين</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {plan.limits.maxUsers === -1 ? '∞' : plan.limits.maxUsers}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-1.5 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm">
                        <span className="text-[10px] text-gray-400 mb-0.5">المنتجات</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {plan.limits.maxProducts === -1 ? 'غير محدود' : plan.limits.maxProducts}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-1.5 rounded-lg bg-white dark:bg-gray-900/50 shadow-sm">
                        <span className="text-[10px] text-gray-400 mb-0.5">العملاء</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {plan.limits.maxCustomers === -1 ? 'غير محدود' : plan.limits.maxCustomers}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">كل ما تحتاجه:</h4>
                  <ul className="space-y-1.5">
                    {(plan.features || []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5 relative">
                          <div className={`absolute inset-0 blur-sm rounded-full ${isSelectedPlan ? 'bg-amber-300' : isPopular ? 'bg-indigo-400' : 'bg-gray-300'}`}></div>
                          <Check className={`relative h-4 w-4 ${isSelectedPlan ? 'text-amber-600 dark:text-amber-300' : isPopular ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug">
                          {FEATURE_TRANSLATIONS[feature] || feature}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={isCurrentPlan || isProcessing === plan._id || availableMethods.length === 0}
                  onClick={() => handleSubscribe(plan._id)}
                  className={`mt-5 block w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${isCurrentPlan
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                    : isSelectedPlan
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:shadow-md hover:shadow-amber-500/30'
                      : isPopular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-md hover:shadow-indigo-500/30'
                        : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white hover:shadow-md'
                    }`}
                >
                  {isProcessing === plan._id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      جاري التوجيه...
                    </span>
                  ) : isCurrentPlan ? 'باقتك الحالية' : isSelectedPlan ? 'أكمل هذه الباقة' : 'اشترك الآن'}
                </button>
              </div>
            );
          })}
        </div>

        <Modal
          open={!!manualPaymentInfo}
          onClose={() => {
            setManualPaymentInfo(null);
            setReceiptFile(null);
            setReceiptBase64('');
          }}
          title="تعليمات الدفع اليدوي ورفع الإيصال"
          size="md"
        >
          {manualPaymentInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <p className="text-gray-800 dark:text-gray-200 text-center">
                  برجاء تحويل مبلغ <strong className="text-lg">{manualPaymentInfo.amount} {manualPaymentInfo.currency}</strong>
                  <br />
                  بواسطة <strong>{manualPaymentInfo.gatewayName}</strong> إلى:
                </p>

                <div
                  className="mt-4 text-xl font-bold font-mono text-center tracking-wider text-indigo-700 dark:text-indigo-400 cursor-pointer select-all block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-inner flex items-center justify-center gap-3 transition-colors hover:bg-indigo-50"
                  onClick={() => {
                    const num = manualPaymentInfo.paymentMeta?.account || manualPaymentInfo.paymentMeta?.number;
                    navigator.clipboard.writeText(num);
                    toast.success('تم نسخ الرقم بنجاح');
                  }}
                  title="اضغط للنسخ"
                >
                  <span>{manualPaymentInfo.paymentMeta?.account || manualPaymentInfo.paymentMeta?.number}</span>
                  <Copy className="w-5 h-5 text-indigo-400" />
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">إرفاق صورة الإيصال (Screenshot) *</h4>
                <p className="text-xs text-gray-500 mb-3">
                  بعد إتمام التحويل، يرجى رفع صورة أو لقطة شاشة توضح نجاح العملية وتأكيد المبلغ.
                </p>

                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${receiptFile
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
                    : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  onClick={() => document.getElementById('receipt-upload').click()}
                >
                  {receiptBase64 ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={receiptBase64} alt="Receipt Preview" className="max-h-32 rounded-lg shadow-sm" />
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        تم اختيار: {receiptFile.name} (اضغط للتغيير)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                      <UploadCloud className="w-8 h-8" />
                      <span className="text-sm font-medium">اضغط لاختيار صورة الإيصال</span>
                      <span className="text-xs">يدعم: JPG, PNG, WEBP (بحد أقصى 20 م.ب)</span>
                    </div>
                  )}
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setManualPaymentInfo(null);
                    setReceiptFile(null);
                    setReceiptBase64('');
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1"
                  loading={isSubmittingReceipt}
                  disabled={!receiptBase64}
                  onClick={handleSubmitReceipt}
                >
                  إرسال الإيصال للتأكيد
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
