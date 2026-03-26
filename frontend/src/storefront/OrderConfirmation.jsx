import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle, MapPin, Package, Phone, Truck } from 'lucide-react';
import { api } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { storefrontPath } from '../utils/storefrontHost';
import { useTranslation } from 'react-i18next';
import {
  buildGuestTrackingQuery,
  loadGuestOrderTracking,
  saveGuestOrderTracking,
} from './guestOrderTracking';

export default function OrderConfirmation() {
  const { t } = useTranslation('admin');
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missingToken, setMissingToken] = useState(false);

  useEffect(() => {
    const trackingPayload = loadGuestOrderTracking();
    const queryToken = searchParams.get('token') || '';
    const effectiveToken =
      queryToken ||
      (trackingPayload?.orderId === id ? trackingPayload.token : '');

    if (!effectiveToken) {
      setMissingToken(true);
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/orders/${id}/confirmation?token=${encodeURIComponent(effectiveToken)}`
        );
        const nextOrder = res.data.data;
        setOrder(nextOrder);
        setMissingToken(false);
        saveGuestOrderTracking({
          orderId: nextOrder?.invoiceId || id,
          orderNumber: nextOrder?.orderNumber,
          token: effectiveToken,
        });
      } catch (err) {
        console.error('Failed to load order confirmation:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, searchParams]);

  const trackingQuery = buildGuestTrackingQuery({
    orderNumber: order?.orderNumber || searchParams.get('orderNumber') || '',
    token: order?.guestTrackingToken || searchParams.get('token') || loadGuestOrderTracking()?.token || '',
  });

  const handleOpenTracking = () => {
    navigate(storefrontPath(`/track-order${trackingQuery}`));
  };

  const handleCopyTrackingLink = async () => {
    const absoluteUrl = `${window.location.origin}${storefrontPath(
      `/track-order${trackingQuery}`
    )}`;

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      notify.success(t('order_confirmation.toasts.km3jhvq'));
    } catch {
      notify.error(t('order_confirmation.toasts.k6zfpt2'));
    }
  };

  if (loading) {
    return <LoadingSpinner message="جاري تحميل تفاصيل الطلب..." />;
  }

  if (missingToken || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" dir="rtl">
        <EmptyState
          icon={Package}
          title={t('order_confirmation.titles.k9ry215')}
          description="رابط المتابعة الآمن غير متاح أو انتهت الجلسة. يمكنك فتح صفحة تتبع الطلب وإدخال رقم الطلب ورمز التتبع."
          actionLabel="فتح تتبع الطلب"
          onAction={() => navigate(storefrontPath('/track-order'))}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10" dir="rtl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="mb-2 text-3xl font-black">{t('order_confirmation.ui.kvs2kbi')}</h1>
        <p className="text-gray-500">{t('order_confirmation.ui.ksnezcl')}</p>
      </div>

      <Card className="mb-6 p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="mb-1 text-xl font-bold">{t('order_confirmation.ui.kig6vo2')}</h2>
            <p className="text-3xl font-black text-primary-600">{order.orderNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{t('order_confirmation.ui.kardk2b')}</Badge>
            {order.shippingMethod ? <Badge variant="info">{order.shippingMethod}</Badge> : null}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <Phone className="mt-1 h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">{t('order_confirmation.ui.k3pahhc')}</div>
              <div className="font-bold">{order.customer?.phone || order.shippingAddress?.phone || '—'}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">{t('order_confirmation.ui.kxykv9y')}</div>
              <div className="font-bold">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 md:col-span-2">
            <MapPin className="mt-1 h-5 w-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">{t('order_confirmation.ui.khh2jv2')}</div>
              <div className="font-bold">
                {[
                  order.shippingAddress?.governorate,
                  order.shippingAddress?.city,
                  order.shippingAddress?.address,
                ]
                  .filter(Boolean)
                  .join(' - ') || '—'}
              </div>
            </div>
          </div>
          {(order.trackingNumber || order.estimatedDeliveryDate) && (
            <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 md:col-span-2 dark:border-primary-900/30 dark:bg-primary-900/10">
              <div className="mb-2 flex items-center gap-2 font-black text-primary-700 dark:text-primary-300">
                <Truck className="h-4 w-4" />
                <span>{t('order_confirmation.ui.kt6cgek')}</span>
              </div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {order.trackingNumber ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-500">{t('order_confirmation.ui.k3os116')}</span>
                    <span className="font-bold">{order.trackingNumber}</span>
                  </div>
                ) : null}
                {order.estimatedDeliveryDate ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-500">{t('order_confirmation.ui.k3bxnv1')}</span>
                    <span className="font-bold">
                      {new Date(order.estimatedDeliveryDate).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <Package className="h-5 w-5" />
            {t('order_confirmation.ui.ksypa9b')}
          </h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.name || t('order_confirmation.toasts.ktezs3')}</div>
                  <div className="text-sm text-gray-500">الكمية: {item.quantity}</div>
                </div>
                <div className="font-bold">{Number(item.totalPrice || 0).toFixed(2)} ج.م</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="flex justify-between text-gray-600">
            <span>{t('order_confirmation.ui.k2jgdjo')}</span>
            <span className="font-bold">{Number(order.subtotal || 0).toFixed(2)} ج.م</span>
          </div>
          {Number(order.shippingFee || 0) > 0 || Number(order.shippingDiscount || 0) > 0 ? (
            <div className="flex justify-between text-gray-600">
              <span>{t('order_confirmation.ui.kovdy34')}</span>
              <span className="font-bold">
                {Math.max(0, Number(order.shippingFee || 0) - Number(order.shippingDiscount || 0)).toFixed(2)} ج.م
              </span>
            </div>
          ) : null}
          {Number(order.discount || 0) > 0 ? (
            <div className="flex justify-between text-green-600">
              <span>{t('order_confirmation.ui.kovdttt')}</span>
              <span className="font-bold">-{Number(order.discount || 0).toFixed(2)} ج.م</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-lg dark:border-gray-700">
            <span className="font-bold">{t('order_confirmation.ui.krh6w30')}</span>
            <span className="text-2xl font-black text-primary-600">{Number(order.totalAmount || 0).toFixed(2)} ج.م</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button onClick={handleOpenTracking} className="w-full">
          {t('order_confirmation.ui.k1rb74h')}
        </Button>
        <Button onClick={handleCopyTrackingLink} variant="outline" className="w-full">
          {t('order_confirmation.ui.kuczaqy')}
        </Button>
        <Button onClick={() => navigate(storefrontPath('/'))} variant="ghost" className="w-full sm:col-span-2">
          {t('order_confirmation.ui.k3btb8c')}
        </Button>
      </div>
    </div>
  );
}
