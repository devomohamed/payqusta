import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  ShieldAlert,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { api } from '../store';
import { Badge, Card, EmptyState, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const STATUS_CONFIG = {
  pending: {
    label: 'قيد الانتظار',
    tone: 'amber',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Clock,
  },
  confirmed: {
    label: 'مؤكد',
    tone: 'blue',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: CheckCircle,
  },
  processing: {
    label: 'جارٍ التجهيز',
    tone: 'violet',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    icon: Package,
  },
  shipped: {
    label: 'تم الشحن',
    tone: 'indigo',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    icon: Truck,
  },
  delivered: {
    label: 'تم التسليم',
    tone: 'green',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'ملغي',
    tone: 'red',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    icon: XCircle,
  },
};

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const ORDER_TIMELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const formatMoney = (value) => Number(value || 0).toLocaleString('ar-EG');

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function TimelineStep({ status, currentStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isActive = ORDER_TIMELINE.indexOf(currentStatus) >= ORDER_TIMELINE.indexOf(status);
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'app-surface-muted text-gray-400'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={`text-sm font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{config.label}</p>
        <p className="text-xs text-gray-400">حالة الطلب التشغيلية</p>
      </div>
    </div>
  );
}

export default function PortalOrderConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [shippingActionId, setShippingActionId] = useState(null);
  const [refundActionId, setRefundActionId] = useState(null);
  const [transferActionId, setTransferActionId] = useState(null);
  const [reviewActionId, setReviewActionId] = useState(null);
  const [fulfillmentAnalysis, setFulfillmentAnalysis] = useState(null);
  const [selectedSourceBranchId, setSelectedSourceBranchId] = useState('');

  const loadOrder = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setAnalysisLoading(true);
    try {
      const [orderRes, analysisRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get(`/invoices/${id}/fulfillment-analysis`).catch(() => null),
      ]);
      setOrder(orderRes.data?.data || null);
      const nextAnalysis = analysisRes?.data?.data || null;
      setFulfillmentAnalysis(nextAnalysis);
      setSelectedSourceBranchId((current) => current || nextAnalysis?.recommendedBranches?.[0]?.branchId || '');
    } catch (error) {
      setOrder(null);
      setFulfillmentAnalysis(null);
      notify.error(error.response?.data?.message || 'تعذر تحميل بيانات الطلب');
    } finally {
      setLoading(false);
      setAnalysisLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateStatus = useCallback(async (newStatus) => {
    if (!order?._id) return;

    setUpdatingId(order._id);
    try {
      await api.patch(`/invoices/${order._id}/order-status`, { orderStatus: newStatus });
      notify.success('تم تحديث حالة الطلب');
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث حالة الطلب');
    } finally {
      setUpdatingId(null);
    }
  }, [loadOrder, order?._id]);

  const createShipment = useCallback(async () => {
    if (!order?._id) return;

    setShippingActionId(`create:${order._id}`);
    try {
      const res = await api.post(`/invoices/${order._id}/shipping/bosta`, {});
      notify.success(`تم إنشاء الشحنة: ${res.data?.data?.waybillNumber || 'نجاح'}`);
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل إنشاء الشحنة');
    } finally {
      setShippingActionId(null);
    }
  }, [loadOrder, order?._id]);

  const syncShipment = useCallback(async () => {
    if (!order?._id) return;

    setShippingActionId(`track:${order._id}`);
    try {
      const res = await api.get(`/invoices/${order._id}/shipping/bosta/track`);
      notify.success(`تم تحديث الشحنة إلى: ${res.data?.data?.status || 'نجاح'}`);
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث الشحنة');
    } finally {
      setShippingActionId(null);
    }
  }, [loadOrder, order?._id]);

  const processRefund = useCallback(async () => {
    if (!order?._id) return;

    setRefundActionId(order._id);
    try {
      const res = await api.post(`/invoices/${order._id}/refund`, {});
      notify.success(res.data?.message || 'تم تنفيذ إجراء الاسترداد');
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تنفيذ الاسترداد');
    } finally {
      setRefundActionId(null);
    }
  }, [loadOrder, order?._id]);

  const createTransferRequest = useCallback(async () => {
    if (!order?._id || !selectedSourceBranchId || !fulfillmentAnalysis?.branchX?.branchId) return;

    setTransferActionId(order._id);
    try {
      await api.post('/stock-transfers', {
        orderId: order._id,
        fromBranchId: selectedSourceBranchId,
        toBranchId: fulfillmentAnalysis.branchX.branchId,
      });
      notify.success('تم إنشاء طلب التحويل');
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل إنشاء طلب التحويل');
    } finally {
      setTransferActionId(null);
    }
  }, [fulfillmentAnalysis?.branchX?.branchId, loadOrder, order?._id, selectedSourceBranchId]);

  const resolveOperationalReview = useCallback(async (action, successMessage) => {
    if (!order?._id) return;

    setReviewActionId(action);
    try {
      await api.patch(`/invoices/${order._id}/operational-review`, { action });
      notify.success(successMessage);
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث المراجعة التشغيلية');
    } finally {
      setReviewActionId(null);
    }
  }, [loadOrder, order?._id]);

  const summary = useMemo(() => ({
    subtotal: order?.subtotal || 0,
    shippingFee: order?.shippingFee || 0,
    discount: order?.discount || 0,
    total: order?.totalAmount || 0,
  }), [order]);

  const fulfillmentCard = useMemo(() => {
    if (!order) return null;
    if (analysisLoading) {
      return {
        tone: 'slate',
        title: 'جاري تحليل التنفيذ',
        body: 'يتم الآن فحص Branch X والفروع البديلة لتحديد قرار التنفيذ والتحويل.',
      };
    }
    if (order.orderStatus === 'cancelled') {
      return {
        tone: 'rose',
        title: 'الطلب متوقف',
        body: 'تم إلغاء الطلب، لذلك تم تعطيل أي إجراء شحن أو تنفيذ لاحق.',
      };
    }
    if (fulfillmentAnalysis?.title) {
      const toneByScenario = {
        branch_x_ready: 'emerald',
        single_source_transfer_available: 'amber',
        mixed_availability_review: 'amber',
        no_stock_any_branch: 'rose',
      };
      return {
        tone: toneByScenario[fulfillmentAnalysis.scenario] || 'slate',
        title: fulfillmentAnalysis.title,
        body: fulfillmentAnalysis.message,
      };
    }
    if (order.shippingDetails?.waybillNumber) {
      return {
        tone: 'emerald',
        title: 'الشحنة منشأة',
        body: 'تم إنشاء شحنة مرتبطة بالطلب، ويمكنك متابعة مزامنة الحالة من شركة الشحن.',
      };
    }
    if (NEXT_STATUS[order.orderStatus]) {
      return {
        tone: 'amber',
        title: 'جاهز لقرار التنفيذ',
        body: 'هذه الصفحة هي نقطة العمل القادمة لربط توصيات المخزون والتحويل الداخلي قبل إنشاء الشحنة في الخطوات التالية.',
      };
    }
    return {
      tone: 'slate',
      title: 'متابعة تشغيلية',
      body: 'راجع بيانات الطلب، ثم استخدم إجراءات الحالة أو الشحنة حسب الوضع الحالي.',
    };
  }, [analysisLoading, fulfillmentAnalysis, order]);

  if (loading) {
    return <LoadingSpinner text="جاري تحميل تفاصيل الطلب..." />;
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/portal-orders')}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-gray-500 transition hover:text-primary-600"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الطلبات
        </button>
        <EmptyState
          icon={Package}
          title="الطلب غير موجود"
          description="تعذر العثور على هذا الطلب أو لم يعد لديك صلاحية الوصول إليه."
        />
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[order.orderStatus];
  const fulfillmentToneClass = {
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
    rose: 'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100',
    slate: 'border-slate-200 bg-slate-50/80 text-slate-900 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100',
  }[fulfillmentCard.tone];
  const selectedRecommendedBranch = fulfillmentAnalysis?.recommendedBranches?.find(
    (branch) => branch.branchId === selectedSourceBranchId
  ) || null;
  const canCreateShipment =
    order?.fulfillmentStatus === 'ready_for_shipping' ||
    fulfillmentAnalysis?.scenario === 'branch_x_ready';
  const hasPendingAddressReview =
    order?.addressChangedAfterCheckout || order?.addressReviewStatus === 'pending';
  const activeShipmentFailure =
    order?.shipmentFailure?.failedAt &&
    !order?.shipmentFailure?.dismissedAt &&
    !order?.shippingDetails?.waybillNumber;

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <div className="rounded-[2rem] bg-gradient-to-l from-slate-950 via-indigo-950 to-cyan-800 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/portal-orders')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى الطلبات
            </button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200/80">Order Detail</p>
              <h1 className="mt-2 text-3xl font-black">طلب #{order.invoiceNumber}</h1>
              <p className="mt-2 text-sm text-white/75">واجهة التشغيل الحالية لتأكيد الطلب، مراجعة بيانات العميل، وتجهيز مسار التنفيذ القادم.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.orderStatus || 'pending'} />
            <Badge variant="secondary" className="rounded-full border-0 bg-white/10 px-3 py-1.5 text-white">
              {new Date(order.createdAt).toLocaleDateString('ar-EG')}
            </Badge>
          </div>
        </div>
      </div>

      {hasPendingAddressReview && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-black text-amber-900 dark:text-amber-200">تغيير عنوان بعد إنشاء الطلب</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                هذا الطلب يحتاج مراجعة إدارية قبل أي خطوة شحن جديدة. لا يتم إعادة تسعير الشحن تلقائيًا في V1.
              </p>
              {order.addressReviewNote && (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">ملاحظة: {order.addressReviewNote}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => resolveOperationalReview('resolve_address_review', 'تمت مراجعة تغيير عنوان الشحن')}
              disabled={reviewActionId === 'resolve_address_review'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {reviewActionId === 'resolve_address_review' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              اعتماد المراجعة
            </button>
          </div>
        </Card>
      )}

      {order?.fulfillmentStatus === 'partial_receipt_review' && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-black text-amber-900 dark:text-amber-200">استلام جزئي يحتاج قرارًا إداريًا</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                تم استلام كمية أقل من الكمية المشحونة. إذا كانت الكمية الحالية كافية، يمكنك اعتماد الطلب وتجهيزه للشحن.
              </p>
            </div>
            <button
              type="button"
              onClick={() => resolveOperationalReview('mark_partial_receipt_ready', 'تم اعتماد الكمية المستلمة وتجهيز الطلب للشحن')}
              disabled={reviewActionId === 'mark_partial_receipt_ready'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {reviewActionId === 'mark_partial_receipt_ready' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              اعتماد الكمية الحالية
            </button>
          </div>
        </Card>
      )}

      {activeShipmentFailure && (
        <Card className="rounded-[2rem] border border-rose-200 bg-rose-50/80 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-black text-rose-900 dark:text-rose-200">فشل إنشاء الشحنة</p>
              <p className="text-sm text-rose-800 dark:text-rose-300">{order.shipmentFailure?.lastError || 'تعذر إنشاء الشحنة مع شركة الشحن.'}</p>
              <div className="flex flex-wrap gap-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                <span>آخر محاولة: {order.shipmentFailure?.lastAttemptAt ? new Date(order.shipmentFailure.lastAttemptAt).toLocaleString('ar-EG') : '—'}</span>
                <span>عدد المحاولات: {order.shipmentFailure?.retryCount || 0}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createShipment}
                disabled={shippingActionId === `create:${order._id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {shippingActionId === `create:${order._id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                إعادة المحاولة
              </button>
              <button
                type="button"
                onClick={() => resolveOperationalReview('dismiss_shipment_failure', 'تم إخفاء تنبيه فشل الشحنة')}
                disabled={reviewActionId === 'dismiss_shipment_failure'}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                {reviewActionId === 'dismiss_shipment_failure' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                إخفاء التنبيه
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Order Summary</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">ملخص الطلب</h2>
                <p className="text-sm text-gray-500">راجع البيانات قبل الانتقال إلى إجراءات التنفيذ والشحن.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {nextStatus && (
                  <button
                    type="button"
                    onClick={() => updateStatus(nextStatus)}
                    disabled={updatingId === order._id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                  >
                    {updatingId === order._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    تحديث إلى {STATUS_CONFIG[nextStatus]?.label}
                  </button>
                )}
                {!order.shippingDetails?.waybillNumber && order.orderStatus !== 'cancelled' && canCreateShipment && (
                  <button
                    type="button"
                    onClick={createShipment}
                    disabled={shippingActionId === `create:${order._id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {shippingActionId === `create:${order._id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                    إنشاء شحنة
                  </button>
                )}
                {order.shippingDetails?.waybillNumber && (
                  <button
                    type="button"
                    onClick={syncShipment}
                    disabled={shippingActionId === `track:${order._id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${shippingActionId === `track:${order._id}` ? 'animate-spin' : ''}`} />
                    مزامنة الشحنة
                  </button>
                )}
                {['pending', 'confirmed', 'processing'].includes(order.orderStatus) && (
                  <button
                    type="button"
                    onClick={() => updateStatus('cancelled')}
                    disabled={updatingId === order._id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    <XCircle className="h-4 w-4" />
                    إلغاء الطلب
                  </button>
                )}
                {order.refundStatus && ['pending', 'partially_refunded', 'failed'].includes(order.refundStatus) && Number(order.refundAmount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={processRefund}
                    disabled={refundActionId === order._id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    <RefreshCw className={`h-4 w-4 ${refundActionId === order._id ? 'animate-spin' : ''}`} />
                    معالجة الاسترداد
                  </button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-black text-gray-900 dark:text-white">بيانات العميل</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">الاسم</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.customer?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">الهاتف</span>
                  <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{order.customer?.phone || order.shippingAddress?.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">منشئ الفاتورة</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.createdBy?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">الفرع</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.branch?.name || '—'}</span>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-black text-gray-900 dark:text-white">عنوان الشحن</h3>
              </div>
              {order.shippingAddress ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">المستلم</span>
                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingAddress.fullName || order.customer?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">الهاتف</span>
                    <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{order.shippingAddress.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">المحافظة</span>
                    <span className="font-bold text-gray-900 dark:text-white">{order.shippingAddress.governorate || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400">العنوان</span>
                    <span className="max-w-[65%] text-left font-bold text-gray-900 dark:text-white">{order.shippingAddress.address || '—'}</span>
                  </div>
                  {order.shippingAddress.notes && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-400">ملاحظات</span>
                      <span className="max-w-[65%] text-left text-gray-600 dark:text-gray-300">{order.shippingAddress.notes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={MapPin}
                  title="لا توجد بيانات شحن"
                  description="لم يتم حفظ عنوان شحن على هذا الطلب بعد."
                  className="py-6"
                />
              )}
            </Card>
          </div>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white">المنتجات</h3>
            </div>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={`${item.product?._id || item.productName || 'item'}-${index}`} className="app-surface-muted flex items-center justify-between rounded-3xl px-5 py-4">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 dark:text-white">{item.productName || item.product?.name || 'منتج'}</p>
                    <p className="text-xs text-gray-400">الكمية: {item.quantity} × {formatMoney(item.unitPrice)} ج.م</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-400">الإجمالي</p>
                    <p className="font-black text-primary-600 dark:text-primary-400">{formatMoney((item.quantity || 0) * (item.unitPrice || 0))} ج.م</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">قرار التنفيذ</h3>
            {analysisLoading ? (
              <div className="mt-5">
                <LoadingSpinner text="جاري تحليل المخزون والفروع..." />
              </div>
            ) : fulfillmentAnalysis ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-3xl border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">Branch X</p>
                  <h4 className="mt-2 text-base font-black text-gray-900 dark:text-white">{fulfillmentAnalysis.branchX?.name || '—'}</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {fulfillmentAnalysis.branchX?.governorate || 'بدون محافظة'}{fulfillmentAnalysis.branchX?.city ? ` / ${fulfillmentAnalysis.branchX.city}` : ''}
                  </p>
                </div>

                {(fulfillmentAnalysis.recommendedBranches || []).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">الفروع المقترحة</h4>
                      <span className="text-xs font-bold text-gray-400">القرب ثم التغطية</span>
                    </div>
                    <div className="space-y-3">
                      {fulfillmentAnalysis.recommendedBranches.map((branch) => {
                        const isSelected = branch.branchId === selectedSourceBranchId;
                        return (
                          <button
                            key={branch.branchId}
                            type="button"
                            onClick={() => setSelectedSourceBranchId(branch.branchId)}
                            className={`w-full rounded-3xl border p-4 text-right transition ${isSelected ? 'border-primary-400 bg-primary-50 shadow-sm dark:border-primary-500/60 dark:bg-primary-950/20' : 'border-gray-100 bg-white hover:border-primary-200 dark:border-white/10 dark:bg-transparent'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-gray-900 dark:text-white">{branch.branchName}</p>
                                  {branch.canFulfillAll && <Badge variant="success" className="rounded-full">يغطي كل النواقص</Badge>}
                                </div>
                                <p className="text-xs text-gray-500">{branch.distanceLabel} • تجهيز {branch.preparationTimeMinutes} دقيقة</p>
                              </div>
                              <div className="text-left">
                                <p className="text-xs text-gray-400">التغطية</p>
                                <p className="font-black text-primary-600 dark:text-primary-400">{branch.totalCoverageQty}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedRecommendedBranch && fulfillmentAnalysis.scenario === 'single_source_transfer_available' && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-sm font-black text-amber-900 dark:text-amber-200">الفرع المحدد للتحويل</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{selectedRecommendedBranch.branchName} • {selectedRecommendedBranch.distanceLabel}</p>
                    <button
                      type="button"
                      onClick={createTransferRequest}
                      disabled={transferActionId === order._id}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                    >
                      {transferActionId === order._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                      إنشاء طلب تحويل
                    </button>
                  </div>
                )}

                {(fulfillmentAnalysis.warnings || []).length > 0 && (
                  <div className="space-y-2 rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    {(fulfillmentAnalysis.warnings || []).map((warning) => (
                      <p key={warning} className="text-sm font-bold text-amber-800 dark:text-amber-300">{warning}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  icon={Package}
                  title="تعذر تحليل التنفيذ"
                  description="لم نتمكن من تحديد Branch X أو الفروع البديلة لهذا الطلب حاليًا."
                  className="py-4"
                />
              </div>
            )}
          </Card>

          {fulfillmentAnalysis && (
            <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">توافر المنتجات</h3>
              <div className="mt-5 space-y-3">
                {(fulfillmentAnalysis.items || []).map((item) => (
                  <div key={item.itemKey} className="app-surface-muted rounded-3xl px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900 dark:text-white">{item.productName}</p>
                        <p className="mt-1 text-xs text-gray-500">المطلوب {item.requestedQty} • المتاح في Branch X {item.branchXAvailableQty}</p>
                      </div>
                      <Badge variant={item.shortageQty > 0 ? 'warning' : 'success'} className="rounded-full">
                        {item.shortageQty > 0 ? `نقص ${item.shortageQty}` : 'متاح'}
                      </Badge>
                    </div>
                    {item.shortageQty > 0 && item.bestSourceBranch && (
                      <p className="mt-3 text-xs font-bold text-primary-600 dark:text-primary-300">
                        أفضل مصدر: {item.bestSourceBranch.branchName} • متاح {item.bestSourceBranch.availableQty}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white">الجدول الزمني</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ORDER_TIMELINE.map((status) => (
                <TimelineStep key={status} status={status} currentStatus={order.orderStatus || 'pending'} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={`rounded-[2rem] border p-6 shadow-sm ${fulfillmentToneClass}`}>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-lg font-black">{fulfillmentCard.title}</h3>
                <p className="text-sm leading-7 opacity-90">{fulfillmentCard.body}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">ملخص التسعير</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الإجمالي الفرعي</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatMoney(summary.subtotal)} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الشحن</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatMoney(summary.shippingFee)} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الخصم</span>
                <span className="font-bold text-gray-900 dark:text-white">-{formatMoney(summary.discount)} ج.م</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-white/10" />
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-gray-900 dark:text-white">الإجمالي النهائي</span>
                <span className="font-black text-primary-600 dark:text-primary-400">{formatMoney(summary.total)} ج.م</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">بيانات الشحنة</h3>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">طريقة الشحن</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.shippingMethod || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">رقم التتبع</span>
                <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{order.trackingNumber || order.shippingDetails?.waybillNumber || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">حالة شركة الشحن</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.shippingDetails?.status || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">موعد متوقع</span>
                <span className="font-bold text-gray-900 dark:text-white">{order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('ar-EG') : '—'}</span>
              </div>
            </div>

            {order.shippingDetails?.trackingUrl && (
              <button
                type="button"
                onClick={() => window.open(order.shippingDetails.trackingUrl, '_blank', 'noopener,noreferrer')}
                className="mt-5 w-full rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-950/30 dark:text-primary-300"
              >
                فتح رابط التتبع
              </button>
            )}
          </Card>

          {((order.refundStatus && order.refundStatus !== 'none') || order.cancelReason) && (
            <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">الاسترداد والإلغاء</h3>
              <div className="mt-5 space-y-4 text-sm">
                {order.refundStatus && order.refundStatus !== 'none' && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">حالة الاسترداد</span>
                    <span className="font-bold text-gray-900 dark:text-white">{order.refundStatus}</span>
                  </div>
                )}
                {Number(order.refundAmount || 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">قيمة الاسترداد</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatMoney(order.refundAmount)} ج.م</span>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400">سبب الإلغاء</span>
                    <span className="max-w-[65%] text-left font-bold text-gray-900 dark:text-white">{order.cancelReason}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
