import React, { useEffect, useState } from 'react';
import { X, Copy, Send, CreditCard, Smartphone, Building2, Zap, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../store';
import { useTranslation } from 'react-i18next';

const GATEWAY_ICONS = {
  paymob: CreditCard,
  fawry: Building2,
  vodafone: Smartphone,
  instapay: Zap
};

const GATEWAY_NAMES = {
  paymob: 'Paymob',
  fawry: 'Fawry',
  vodafone: 'Vodafone Cash',
  instapay: 'InstaPay'
};

const PaymentLinkGenerator = ({ invoice, customer, onClose }) => {
  const { t } = useTranslation('admin');
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [amount, setAmount] = useState(0);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const remainingAmount = invoice.totalAmount - invoice.paidAmount;

  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const { data } = await api.get('/payments/gateways');
        setGateways(data.data || []);
        if (data.data?.length > 0) {
          setSelectedGateway(data.data[0].id);
        }
      } catch (error) {
        toast.error(t('payment_link_generator.toasts.kmempi7'));
      }
    };

    fetchGateways();
    setAmount(remainingAmount);
  }, [remainingAmount]);

  const selectedGatewayData = gateways.find((gateway) => gateway.id === selectedGateway);
  const fees = selectedGatewayData ? (amount * selectedGatewayData.fees) / 100 : 0;
  const discount = applyDiscount ? (amount * 3) / 100 : 0;
  const finalAmount = amount - discount + fees;

  const handleGenerate = async () => {
    if (!selectedGateway) {
      toast.error(t('payment_link_generator.toasts.kdubi00'));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-link', {
        invoiceId: invoice._id,
        gateway: selectedGateway,
        amount,
        applyDiscount
      });

      setPaymentLink(data.data);
      toast.success(t('payment_link_generator.toasts.kkra1jt'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('payment_link_generator.toasts.ktuw6a7'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!paymentLink?.paymentLink) return;
    navigator.clipboard.writeText(paymentLink.paymentLink);
    setCopied(true);
    toast.success(t('payment_link_generator.toasts.kwttjpd'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!paymentLink?.paymentLink) return;

    const message = [
      `مرحبًا ${customer.name}`,
      '',
      `فاتورة رقم: ${invoice.invoiceNumber}`,
      `المبلغ المستحق: ${amount.toFixed(2)} جنيه`,
      applyDiscount ? `خصم الدفع المبكر: ${discount.toFixed(2)} جنيه` : '',
      `رابط الدفع: ${paymentLink.paymentLink}`,
      `طريقة الدفع: ${GATEWAY_NAMES[selectedGateway]}`,
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!invoice || !customer) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="app-surface w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        >
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <button onClick={onClose} className="absolute left-4 top-4 text-white/80 transition hover:text-white">
              <X size={20} />
            </button>

            <h2 className="mb-2 text-xl font-bold">{t('payment_link_generator.ui.k7sp4f3')}</h2>
            <p className="text-sm text-blue-100">العميل: {customer.name}</p>
            <p className="text-sm text-blue-100">الفاتورة: #{invoice.invoiceNumber}</p>
          </div>

          <div className="space-y-5 p-6">
            {gateways.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-3 text-yellow-500" size={48} />
                <p className="text-gray-600 dark:text-gray-400">{t('payment_link_generator.ui.km72ecx')}</p>
                <p className="mt-2 text-sm text-gray-500">{t('payment_link_generator.ui.ksj1amh')}</p>
              </div>
            ) : !paymentLink ? (
              <>
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('payment_link_generator.ui.kdubi00')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {gateways.map((gateway) => {
                      const Icon = GATEWAY_ICONS[gateway.id];
                      const isSelected = selectedGateway === gateway.id;

                      return (
                        <button
                          key={gateway.id}
                          onClick={() => setSelectedGateway(gateway.id)}
                          className={`rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'app-surface-muted border-gray-200/80 hover:border-blue-300 dark:border-white/10'
                          }`}
                        >
                          <Icon className={`mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                            {gateway.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">رسوم: {gateway.fees}%</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('payment_link_generator.ui.kdfjle3')}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
                    max={remainingAmount}
                    className="app-surface w-full rounded-xl border border-gray-300/80 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">المتبقي: {remainingAmount.toFixed(2)} جنيه</p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                  <input
                    type="checkbox"
                    checked={applyDiscount}
                    onChange={(event) => setApplyDiscount(event.target.checked)}
                    className="h-5 w-5 rounded text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('payment_link_generator.ui.k4s53d5')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {applyDiscount ? `قيمة الخصم: ${discount.toFixed(2)} جنيه` : 'غير مفعل'}
                    </p>
                  </div>
                </label>

                <div className="app-surface-muted space-y-2 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('payment_link_generator.ui.kiqw6n3')}</span>
                    <span className="font-medium">{amount.toFixed(2)} ج.م</span>
                  </div>
                  {applyDiscount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('payment_link_generator.ui.kovdttt')}</span>
                      <span>- {discount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('payment_link_generator.ui.kpc2fpx')}</span>
                    <span className="font-medium">+ {fees.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200/80 pt-2 text-lg font-bold dark:border-white/10">
                    <span>{t('payment_link_generator.ui.kdgczhf')}</span>
                    <span className="text-blue-600">{finalAmount.toFixed(2)} ج.م</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedGateway}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? t('payment_link_generator.ui.k1axron') : 'إنشاء رابط الدفع'}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Check size={20} />
                    <span className="font-bold">{t('payment_link_generator.ui.ksdjrji')}</span>
                  </div>
                  <p className="break-all text-sm text-gray-700 dark:text-gray-300">{paymentLink.paymentLink}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="app-surface-muted flex-1 rounded-xl px-4 py-3 font-medium transition hover:border-blue-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Copy size={18} />
                      {copied ? t('payment_link_generator.ui.kwttjpd') : 'نسخ الرابط'}
                    </span>
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Send size={18} />
                      {t('payment_link_generator.ui.kiv8plx')}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setPaymentLink(null);
                    setCopied(false);
                  }}
                  className="w-full rounded-xl border border-gray-200/80 px-4 py-3 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  {t('payment_link_generator.ui.ksm8eds')}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentLinkGenerator;
