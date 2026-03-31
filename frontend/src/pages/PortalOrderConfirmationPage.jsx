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

const FALLBACK_VALUE = '\u2014';
const PRIMARY_BRANCH_LABEL = '\u0641\u0631\u0639 \u0627\u0644\u062a\u0646\u0641\u064a\u0630';
const SHIPPING_STATUS_LABELS = {
  pending: '\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629',
  created: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0634\u062d\u0646\u0629',
  confirmed: '\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0634\u062d\u0646\u0629',
  picked_up: '\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u0645\u0631\u0633\u0644',
  out_for_delivery: '\u062e\u0631\u062c\u062a \u0644\u0644\u062a\u0633\u0644\u064a\u0645',
  in_transit: '\u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642',
  delivered: '\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645',
  cancelled: '\u0645\u0644\u063a\u0627\u0629',
  returned: '\u0645\u0631\u062a\u062c\u0639\u0629',
  exception: '\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u0633\u0644\u064a\u0645',
  failed: '\u0641\u0634\u0644\u062a \u0627\u0644\u0634\u062d\u0646\u0629',
};

function formatDisplayValue(value, fallback = FALLBACK_VALUE) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '?' || trimmed === '—') return fallback;
    return trimmed;
  }
  return value;
}

function normalizePortalText(value) {
  const text = formatDisplayValue(value, '');
  if (!text) return text;
  return text.replace(/Branch X/g, PRIMARY_BRANCH_LABEL);
}

function getShippingStatusLabel(status) {
  const normalized = formatDisplayValue(status, '');
  if (!normalized) return FALLBACK_VALUE;
  return SHIPPING_STATUS_LABELS[normalized] || normalized;
}

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
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">حالة الطلب التشغيلية</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dir, multiline = false, valueClassName = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] ${
        multiline ? 'space-y-2' : 'flex items-center justify-between gap-4'
      }`}
    >
      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <span
        dir={dir}
        className={`${multiline ? 'block text-left text-sm leading-6' : 'text-base'} font-black text-slate-950 dark:text-white ${valueClassName}`}
      >
        {value}
      </span>
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
  const [availablePickupBranches, setAvailablePickupBranches] = useState([]);
  const [pickupBranchesLoading, setPickupBranchesLoading] = useState(true);
  const [selectedPickupBranchId, setSelectedPickupBranchId] = useState('');

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
      const nextRecommendedBranches = nextAnalysis?.recommendedBranches || [];
      setFulfillmentAnalysis(nextAnalysis);
      setSelectedSourceBranchId((current) => {
        if (!nextRecommendedBranches.length) return '';
        if (nextRecommendedBranches.some((branch) => branch.branchId === current)) return current;
        return nextRecommendedBranches[0].branchId;
      });
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

  const loadPickupBranches = useCallback(async () => {
    setPickupBranchesLoading(true);
    try {
      const res = await api.get('/branches', { params: { isActive: true, limit: 200 } });
      const branchList = res.data?.data?.branches || [];
      setAvailablePickupBranches(branchList.filter((branch) => branch?.pickupEnabled));
    } catch (error) {
      setAvailablePickupBranches([]);
    } finally {
      setPickupBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPickupBranches();
  }, [loadPickupBranches]);

  useEffect(() => {
    if (!order) return;

    const orderPickupBranchId =
      (typeof order.fulfillmentBranch === 'object' ? order.fulfillmentBranch?._id : order.fulfillmentBranch) ||
      fulfillmentAnalysis?.branchX?.branchId ||
      '';

    if (!orderPickupBranchId) return;

    setSelectedPickupBranchId((current) => current || orderPickupBranchId);
  }, [fulfillmentAnalysis?.branchX?.branchId, order]);

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
      const res = await api.post(`/invoices/${order._id}/shipping/bosta`, {
        pickupBranchId: selectedPickupBranchId || undefined,
      });
      notify.success(`تم إنشاء الشحنة: ${res.data?.data?.waybillNumber || 'نجاح'}`);
      await loadOrder();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل إنشاء الشحنة');
    } finally {
      setShippingActionId(null);
    }
  }, [loadOrder, order?._id, selectedPickupBranchId]);

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
  const recommendedBranches = fulfillmentAnalysis?.recommendedBranches || [];
  const selectedRecommendedBranch = recommendedBranches.find(
    (branch) => branch.branchId === selectedSourceBranchId
  ) || null;
  const selectedPickupBranch = availablePickupBranches.find((branch) => branch._id === selectedPickupBranchId) || null;
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
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200/80">{'\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628'}</p>
              <h1 className="mt-2 text-3xl font-black">طلب #{order.invoiceNumber}</h1>
              <p className="mt-2 text-sm font-medium leading-7 text-white/90">واجهة التشغيل الحالية لتأكيد الطلب، مراجعة بيانات العميل، وتجهيز مسار التنفيذ القادم.</p>
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
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-300">{'\u0645\u0644\u062e\u0635 \u0627\u0644\u0637\u0644\u0628'}</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">ملخص الطلب</h2>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">راجع البيانات قبل الانتقال إلى إجراءات التنفيذ والشحن.</p>
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
                <DetailRow label={'\u0627\u0644\u0627\u0633\u0645'} value={formatDisplayValue(order.shippingAddress?.fullName || order.customer?.name)} />
                <DetailRow label={'\u0627\u0644\u0647\u0627\u062a\u0641'} value={formatDisplayValue(order.shippingAddress?.phone || order.customer?.phone)} dir="ltr" />
                <DetailRow label={'\u0645\u0646\u0634\u0626 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629'} value={formatDisplayValue(order.createdBy?.name)} />
                <DetailRow label={'\u0627\u0644\u0641\u0631\u0639'} value={formatDisplayValue(order.branch?.name, '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')} />
              </div>
            </Card>

            <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-black text-gray-900 dark:text-white">عنوان الشحن</h3>
              </div>
              {order.shippingAddress ? (
                <div className="space-y-3 text-sm">
                  <DetailRow label={'\u0627\u0644\u0645\u0633\u062a\u0644\u0645'} value={formatDisplayValue(order.shippingAddress.fullName || order.customer?.name)} />
                  <DetailRow label={'\u0627\u0644\u0647\u0627\u062a\u0641'} value={formatDisplayValue(order.shippingAddress.phone)} dir="ltr" />
                  <DetailRow label={'\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629'} value={formatDisplayValue(order.shippingAddress.governorate, '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')} />
                  <DetailRow label={'\u0627\u0644\u0639\u0646\u0648\u0627\u0646'} value={formatDisplayValue(order.shippingAddress.address)} multiline valueClassName="max-w-full" />
                  {order.shippingAddress.notes && (
                    <DetailRow label={'\u0645\u0644\u0627\u062d\u0638\u0627\u062a'} value={order.shippingAddress.notes} multiline valueClassName="max-w-full font-semibold text-slate-700 dark:text-slate-200" />
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
                <div key={`${item.product?._id || item.productName || 'item'}-${index}`} className="app-surface-muted flex items-center justify-between rounded-3xl border border-slate-200/70 px-5 py-4 dark:border-white/10">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 dark:text-white">{item.productName || item.product?.name || 'منتج'}</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">الكمية: {item.quantity} × {formatMoney(item.unitPrice)} ج.م</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">الإجمالي</p>
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
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500">{PRIMARY_BRANCH_LABEL}</p>
                  <h4 className="mt-2 text-base font-black text-gray-900 dark:text-white">{formatDisplayValue(fulfillmentAnalysis.branchX?.name, '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')}</h4>
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {fulfillmentAnalysis.branchX?.governorate || 'بدون محافظة'}{fulfillmentAnalysis.branchX?.city ? ` / ${fulfillmentAnalysis.branchX.city}` : ''}
                  </p>
                </div>

                {recommendedBranches.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">الفروع المقترحة</h4>
                      <span className="text-xs font-bold text-gray-400">القرب ثم التغطية</span>
                    </div>
                    <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <label
                        htmlFor="portal-order-source-branch"
                        className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300"
                      >
                        فرع بديل لتغذية فرع التنفيذ
                      </label>
                      <select
                        id="portal-order-source-branch"
                        value={selectedSourceBranchId}
                        onChange={(event) => setSelectedSourceBranchId(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-primary-900/30"
                      >
                        {recommendedBranches.map((branch) => (
                          <option key={branch.branchId} value={branch.branchId}>
                            {branch.branchName} - {branch.distanceLabel} - تغطية {branch.totalCoverageQty}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                        هذا الاختيار يحدد مصدر التحويل الداخلي فقط. الشحنة النهائية تظل خارجة من {PRIMARY_BRANCH_LABEL}.
                      </p>
                    </div>
                    <div className="hidden space-y-3">
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
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">التغطية</p>
                                <p className="font-black text-primary-600 dark:text-primary-400">{branch.totalCoverageQty}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedRecommendedBranch && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-sm font-black text-amber-900 dark:text-amber-200">الفرع المحدد للتحويل</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{selectedRecommendedBranch.branchName} • {selectedRecommendedBranch.distanceLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        تجهيز {selectedRecommendedBranch.preparationTimeMinutes} دقيقة
                      </Badge>
                      <Badge variant={selectedRecommendedBranch.canFulfillAll ? 'success' : 'warning'} className="rounded-full">
                        تغطية {selectedRecommendedBranch.totalCoverageQty}
                      </Badge>
                      {selectedRecommendedBranch.canFulfillAll && (
                        <Badge variant="success" className="rounded-full">يغطي كل النواقص</Badge>
                      )}
                    </div>
                    {fulfillmentAnalysis.scenario === 'single_source_transfer_available' && (
                      <button
                        type="button"
                        onClick={createTransferRequest}
                        disabled={transferActionId === order._id}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        {transferActionId === order._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                        إنشاء طلب تحويل
                      </button>
                    )}
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
                  description={normalizePortalText('\u0644\u0645 \u0646\u062a\u0645\u0643\u0646 \u0645\u0646 \u062a\u062d\u062f\u064a\u062f Branch X \u0623\u0648 \u0627\u0644\u0641\u0631\u0648\u0639 \u0627\u0644\u0628\u062f\u064a\u0644\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u062d\u0627\u0644\u064a\u0627\u064b.')}
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
                        <p className="mt-1 text-xs text-gray-500">{`\u0627\u0644\u0645\u0637\u0644\u0648\u0628 ${item.requestedQty} � \u0627\u0644\u0645\u062a\u0627\u062d \u0641\u064a ${PRIMARY_BRANCH_LABEL} ${item.branchXAvailableQty}`}</p>
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
                <h3 className="text-lg font-black">{normalizePortalText(fulfillmentCard.title)}</h3>
                <p className="text-sm leading-7 opacity-90">{normalizePortalText(fulfillmentCard.body)}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">ملخص التسعير</h3>
            {!order.shippingDetails?.waybillNumber && (
              <div className="mt-5 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <label
                  htmlFor="portal-order-pickup-branch"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300"
                >
                  فرع استلام شركة الشحن
                </label>
                <select
                  id="portal-order-pickup-branch"
                  value={selectedPickupBranchId}
                  onChange={(event) => setSelectedPickupBranchId(event.target.value)}
                  disabled={pickupBranchesLoading || availablePickupBranches.length === 0}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-primary-900/30"
                >
                  <option value="" disabled>
                    {pickupBranchesLoading ? 'جاري تحميل الفروع...' : 'اختر الفرع الذي ستذهب إليه شركة الشحن'}
                  </option>
                  {availablePickupBranches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} - {branch.shippingOrigin?.city || branch.shippingOrigin?.governorate || 'بدون عنوان شحن'}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                  عند إنشاء الشحنة سيتم اعتماد هذا الفرع كفرع الاستلام الذي تذهب إليه شركة الشحن.
                </p>
              </div>
            )}
            <div className="mt-5 space-y-3 text-sm">
              <DetailRow label={'\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0641\u0631\u0639\u064a'} value={`${formatMoney(summary.subtotal)} \u062c.\u0645`} />
              <DetailRow label={'\u0627\u0644\u0634\u062d\u0646'} value={`${formatMoney(summary.shippingFee)} \u062c.\u0645`} />
              <DetailRow label={'\u0627\u0644\u062e\u0635\u0645'} value={`-${formatMoney(summary.discount)} \u062c.\u0645`} />
              <div className="h-px bg-gray-100 dark:bg-white/10" />
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-gray-900 dark:text-white">الإجمالي النهائي</span>
                <span className="font-black text-primary-600 dark:text-primary-400">{formatMoney(summary.total)} ج.م</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-0 p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">بيانات الشحنة</h3>
            <div className="mt-5 space-y-3 text-sm">
              <DetailRow label={'\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0634\u062d\u0646'} value={formatDisplayValue(order.shippingMethod, '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')} />
              <DetailRow label={'\u0641\u0631\u0639 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0634\u062d\u0646'} value={formatDisplayValue(selectedPickupBranch?.name || (typeof order.fulfillmentBranch === 'object' ? order.fulfillmentBranch?.name : ''), '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')} />
              <DetailRow label={'\u0631\u0642\u0645 \u0627\u0644\u062a\u062a\u0628\u0639'} value={formatDisplayValue(order.trackingNumber || order.shippingDetails?.waybillNumber)} dir="ltr" />
              <DetailRow label={'\u062d\u0627\u0644\u0629 \u0634\u0631\u0643\u0629 \u0627\u0644\u0634\u062d\u0646'} value={getShippingStatusLabel(order.shippingDetails?.status)} />
              <DetailRow label={'\u0645\u0648\u0639\u062f \u0645\u062a\u0648\u0642\u0639'} value={order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('ar-EG') : FALLBACK_VALUE} />
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
                    <span className="text-slate-500 dark:text-slate-300">حالة الاسترداد</span>
                    <span className="font-bold text-gray-900 dark:text-white">{order.refundStatus}</span>
                  </div>
                )}
                {Number(order.refundAmount || 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-300">قيمة الاسترداد</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatMoney(order.refundAmount)} ج.م</span>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-300">سبب الإلغاء</span>
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





