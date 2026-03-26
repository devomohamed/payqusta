import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Package, Search, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../store';
import { notify } from '../components/AnimatedNotification';
import { Button } from '../components/UI';
import { useTranslation } from 'react-i18next';
import {
  loadGuestOrderTracking,
  saveGuestOrderTracking,
} from './guestOrderTracking';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'قيد المراجعة', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', bar: 'bg-amber-400', step: 1 },
  confirmed: { icon: CheckCircle, label: 'تم التأكيد', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/10', bar: 'bg-sky-400', step: 2 },
  processing: { icon: Package, label: 'قيد التجهيز', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', bar: 'bg-blue-400', step: 2 },
  shipped: { icon: Truck, label: 'تم الشحن', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10', bar: 'bg-purple-400', step: 3 },
  delivered: { icon: CheckCircle, label: 'تم التسليم', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10', bar: 'bg-green-400', step: 4 },
  cancelled: { icon: XCircle, label: 'ملغي', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10', bar: 'bg-red-400', step: 0 },
};

const STEPS = ['استلام الطلب', 'تمت المعالجة', 'خرج للشحن', 'التسليم'];

export default function OrderTracking() {
  const { t } = useTranslation('admin');
  const [searchParams] = useSearchParams();
  const storedTracking = loadGuestOrderTracking();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || storedTracking?.orderNumber || '');
  const [trackingToken, setTrackingToken] = useState(searchParams.get('token') || storedTracking?.token || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const runTrackRequest = async (nextOrderNumber, nextToken) => {
    if (!nextOrderNumber.trim() || !nextToken.trim()) {
      notify.error(t('order_tracking.toasts.ka5er2p'));
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    try {
      const res = await api.get(
        `/orders/track?orderNumber=${encodeURIComponent(nextOrderNumber.trim())}&token=${encodeURIComponent(nextToken.trim())}`
      );

      if (res.data.data) {
        setOrder(res.data.data);
        saveGuestOrderTracking({
          orderId: res.data.data.invoiceId,
          orderNumber: res.data.data.orderNumber,
          token: nextToken.trim(),
        });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        notify.error(err.response?.data?.message || t('order_tracking.toasts.kcgr9o'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextOrderNumber = searchParams.get('orderNumber') || storedTracking?.orderNumber || '';
    const nextToken = searchParams.get('token') || storedTracking?.token || '';

    if (nextOrderNumber && nextToken) {
      runTrackRequest(nextOrderNumber, nextToken);
    }
  }, [searchParams]);

  const handleTrack = async (e) => {
    e.preventDefault();
    await runTrackRequest(orderNumber, trackingToken);
  };

  const status = order ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending : null;
  const StatusIcon = status?.icon || Package;
  const hasShipmentDetails = order?.trackingNumber || order?.trackingUrl || order?.estimatedDeliveryDate;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 animate-fade-in" dir="rtl">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/20">
          <Package className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="mb-2 text-3xl font-black text-gray-900 dark:text-white">{t('order_tracking.ui.kw4l0p5')}</h1>
        <p className="text-gray-500">{t('order_tracking.ui.ksck429')}</p>
      </div>

      <form onSubmit={handleTrack} className="mb-8 space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">{t('order_tracking.ui.kig6vo2')}</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={t('order_tracking.placeholders.keuqww8')}
              className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 transition-colors focus:border-primary-400 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-700 dark:text-gray-300">{t('order_tracking.ui.klk7eeu')}</label>
          <div className="relative">
            <ShieldCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={trackingToken}
              onChange={(e) => setTrackingToken(e.target.value)}
              placeholder={t('order_tracking.placeholders.kkeuwfz')}
              className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm text-gray-900 transition-colors focus:border-primary-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 font-black text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-500 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Search className="h-4 w-4" />
              {t('order_tracking.ui.k1rb74h')}
            </>
          )}
        </button>
      </form>

      {notFound && (
        <div className="rounded-3xl border border-orange-100 bg-orange-50 py-12 text-center animate-fade-in dark:border-orange-800 dark:bg-orange-900/10">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-orange-400" />
          <p className="mb-1 font-black text-gray-800 dark:text-white">{t('order_tracking.ui.kqdae4k')}</p>
          <p className="text-sm text-gray-500">{t('order_tracking.ui.kjjrkza')}</p>
        </div>
      )}

      {order && status && (
        <div className="space-y-5 animate-slide-up">
          <div className={`${status.bg} rounded-3xl border border-gray-100 p-6 dark:border-gray-700`}>
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-800">
                <StatusIcon className={`h-7 w-7 ${status.color}`} />
              </div>
              <div>
                <p className="mb-0.5 text-xs font-medium text-gray-500">{t('order_tracking.ui.kb3578d')}</p>
                <p className={`text-xl font-black ${status.color}`}>{status.label}</p>
              </div>
              <div className="mr-auto text-right">
                <p className="text-xs text-gray-400">{t('order_tracking.ui.kig6vo2')}</p>
                <p className="font-black text-gray-900 dark:text-white">{order.orderNumber}</p>
              </div>
            </div>

            {order.status !== 'cancelled' && (
              <div className="relative">
                <div className="mb-2 flex items-center justify-between">
                  {STEPS.map((step, index) => (
                    <div key={step} className="flex flex-1 flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all ${
                          index + 1 <= status.step
                            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                            : 'bg-gray-200 text-gray-400 dark:bg-gray-700'
                        }`}
                      >
                        {index + 1 <= status.step ? '✓' : index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative -mt-4 mx-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${status.bar} transition-all duration-700`}
                    style={{ width: `${Math.max(0, ((status.step - 1) / (STEPS.length - 1)) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  {STEPS.map((step, index) => (
                    <span
                      key={step}
                      className={`flex-1 text-center text-[10px] font-bold leading-tight ${
                        index + 1 <= status.step ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-black uppercase tracking-wide text-gray-500">{t('order_tracking.ui.ka7ru1p')}</h3>
            {[
              {
                label: t('order_tracking.ui.kxykv9y'),
                value: order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—',
              },
              { label: t('order_tracking.ui.krh6w30'), value: `${Number(order.totalAmount || order.total || 0).toLocaleString()} ج.م` },
              { label: t('order_tracking.ui.kfj3di7'), value: order.paymentMethod || '—' },
              {
                label: t('order_tracking.ui.khh2jv2'),
                value:
                  [
                    order.shippingAddress?.governorate,
                    order.shippingAddress?.city,
                    order.shippingAddress?.address,
                  ]
                    .filter(Boolean)
                    .join(' - ') || '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0 dark:border-gray-700">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>

          {hasShipmentDetails && (
            <div className="space-y-3 rounded-3xl border border-primary-100 bg-primary-50/60 p-5 shadow-sm dark:border-primary-900/30 dark:bg-primary-900/10">
              <h3 className="text-sm font-black uppercase tracking-wide text-primary-700 dark:text-primary-300">{t('order_tracking.ui.ka7rran')}</h3>
              {order.shippingMethod ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('order_tracking.ui.krmcqvo')}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{order.shippingMethod}</span>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('order_tracking.ui.k3os116')}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{order.trackingNumber}</span>
                </div>
              ) : null}
              {order.estimatedDeliveryDate ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('order_tracking.ui.k3bxnv1')}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(order.estimatedDeliveryDate).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ) : null}
              {order.trackingUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(order.trackingUrl, '_blank', 'noopener,noreferrer')}
                >
                  {t('order_tracking.ui.kcih5yq')}
                </Button>
              ) : null}
            </div>
          )}

          {order.items?.length > 0 && (
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-gray-500">المنتجات ({order.items.length})</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0 dark:border-gray-700">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-400">الكمية: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-black text-primary-600">
                      {Number(item.totalPrice || (item.price || 0) * item.quantity).toLocaleString()} ج.م
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
