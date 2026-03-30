import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutGrid,
  Package,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api, useAuthStore } from '../store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  Select,
  TextArea,
} from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const TRANSFER_STATUS_META = {
  requested: { label: 'طلب جديد', variant: 'warning' },
  approved: { label: 'موافق عليه', variant: 'info' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  prepared: { label: 'تم التجهيز', variant: 'primary' },
  in_transit: { label: 'في الطريق', variant: 'primary' },
  partially_received: { label: 'استلام جزئي', variant: 'warning' },
  fully_received: { label: 'مكتمل', variant: 'success' },
  cancelled: { label: 'ملغي', variant: 'gray' },
};

const ISSUE_TYPE_OPTIONS = [
  { value: '', label: 'بدون تحديد' },
  { value: 'lost_items', label: 'فقدان أصناف' },
  { value: 'damaged_items', label: 'أصناف تالفة' },
  { value: 'wrong_items', label: 'أصناف غير صحيحة' },
  { value: 'other', label: 'مشكلة أخرى' },
];

const formatDate = (value, pattern = 'dd MMM yyyy - hh:mm a') => {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern, { locale: ar });
  } catch {
    return '—';
  }
};

function StatusBadge({ status }) {
  const meta = TRANSFER_STATUS_META[status] || TRANSFER_STATUS_META.requested;
  return <Badge variant={meta.variant} className="rounded-full">{meta.label}</Badge>;
}

function TransferTimeline({ entries = [] }) {
  if (!entries.length) return null;

  return (
    <div className="space-y-3">
      {entries.slice(-4).reverse().map((entry, index) => (
        <div key={`${entry.status}-${entry.at}-${index}`} className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-2xl app-surface-muted flex items-center justify-center">
            {entry.status === 'rejected' ? (
              <XCircle className="h-4 w-4 text-rose-500" />
            ) : entry.status === 'fully_received' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : entry.status === 'in_transit' ? (
              <Truck className="h-4 w-4 text-primary-500" />
            ) : (
              <Clock3 className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 dark:text-white">
              {TRANSFER_STATUS_META[entry.status]?.label || entry.status}
            </p>
            <p className="text-xs text-gray-500">{formatDate(entry.at)}</p>
            {entry.note ? <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{entry.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TransferItemsList({ items = [], compact = false }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.product || item.productName}-${index}`} className={`rounded-2xl app-surface-muted ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-900 dark:text-white">{item.productName || 'منتج'}</p>
              <p className="mt-1 text-[11px] text-gray-500">SKU: {item.sku || '—'}</p>
            </div>
            <div className="text-left text-xs leading-6 text-gray-600 dark:text-gray-300">
              <p>مطلوب: <span className="font-black">{Number(item.requestedQty || 0)}</span></p>
              <p>مشحون: <span className="font-black">{Number(item.shippedQty || 0)}</span></p>
              <p>مستلم: <span className="font-black">{Number(item.receivedQty || 0)}</span></p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransferActionModal({
  modalState,
  onClose,
  onSubmit,
  submitting,
}) {
  const transfer = modalState?.transfer || null;
  const action = modalState?.action || '';

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [trackingReference, setTrackingReference] = useState('');
  const [issueType, setIssueType] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [itemDrafts, setItemDrafts] = useState([]);

  useEffect(() => {
    if (!transfer || !action) return;
    setReason('');
    setNotes('');
    setTrackingReference(transfer.trackingReference || '');
    setIssueType('');
    setIssueNotes('');
    setItemDrafts(
      (transfer.items || []).map((item) => ({
        product: item.product,
        variant: item.variant || null,
        productName: item.productName,
        maxQty: Number(item.shippedQty || item.requestedQty || 0),
        receivedQty: Number(item.receivedQty || 0),
      }))
    );
  }, [transfer, action]);

  if (!transfer || !action) return null;

  const isReject = action === 'rejected';
  const isTransit = action === 'in_transit';
  const isPartial = action === 'partially_received';
  const isFullReceipt = action === 'fully_received';

  const titleMap = {
    rejected: `رفض التحويل ${transfer.transferNumber}`,
    in_transit: `شحن التحويل ${transfer.transferNumber}`,
    partially_received: `استلام جزئي للتحويل ${transfer.transferNumber}`,
    fully_received: `إغلاق الاستلام ${transfer.transferNumber}`,
  };

  const updateItemQty = (index, value) => {
    setItemDrafts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              receivedQty: Math.max(0, Math.min(Number(value || 0), Number(item.maxQty || 0))),
            }
          : item
      )
    );
  };

  const handleSubmit = () => {
    const payload = { status: action };

    if (notes.trim()) payload.notes = notes.trim();
    if (isReject) payload.rejectionReason = reason.trim();
    if (isTransit && trackingReference.trim()) payload.trackingReference = trackingReference.trim();
    if (isPartial || isFullReceipt) {
      payload.items = itemDrafts.map((item) => ({
        product: item.product,
        variant: item.variant || null,
        receivedQty: Number(item.receivedQty || 0),
      }));
      if (issueType) payload.issueType = issueType;
      if (issueNotes.trim()) payload.issueNotes = issueNotes.trim();
    }

    onSubmit(payload);
  };

  const isSubmitDisabled =
    (isReject && !reason.trim()) ||
    (isPartial && itemDrafts.every((item) => Number(item.receivedQty || 0) <= 0));

  return (
    <Modal open onClose={onClose} title={titleMap[action] || 'تحديث التحويل'} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={transfer.status} />
          <Badge variant="gray" className="rounded-full">
            {transfer.fromBranch?.name || '—'} ←→ {transfer.toBranch?.name || '—'}
          </Badge>
        </div>

        {isReject ? (
          <TextArea
            label="سبب الرفض"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="اكتب سبب رفض التحويل حتى يظهر للإدارة ويُحفظ في السجل..."
          />
        ) : null}

        {isTransit ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="مرجع التتبع الداخلي"
              value={trackingReference}
              onChange={(event) => setTrackingReference(event.target.value)}
              placeholder="مثال: TR-4589"
            />
            <Input
              label="ملاحظة الشحن"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="تم تسليم الصناديق لشحنة داخلية"
            />
          </div>
        ) : null}

        {(isPartial || isFullReceipt) ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-black text-gray-900 dark:text-white">الكميات الفعلية</h4>
              {itemDrafts.map((item, index) => (
                <div key={`${item.product}-${index}`} className="rounded-3xl app-surface-muted px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="mt-1 text-xs text-gray-500">المشحون: {item.maxQty}</p>
                    </div>
                    <div className="w-full md:w-40">
                      <Input
                        label="المستلم"
                        type="number"
                        min="0"
                        max={String(item.maxQty)}
                        value={item.receivedQty}
                        onChange={(event) => updateItemQty(index, event.target.value)}
                      />
                      <p className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                        ???? ?????? ??????? ?? V1 ?? ?????? ???????? ???: {item.maxQty}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label={isPartial ? 'نوع المشكلة' : 'تصنيف الإغلاق'}
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                options={ISSUE_TYPE_OPTIONS}
              />
              <TextArea
                label="ملاحظات الاستلام"
                rows={3}
                value={issueNotes}
                onChange={(event) => setIssueNotes(event.target.value)}
                placeholder="سجل الفروقات أو التلف أو أي ملاحظات تشغيلية..."
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            variant={isReject ? 'danger' : isFullReceipt ? 'success' : isPartial ? 'warning' : 'primary'}
            loading={submitting}
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
          >
            {isReject ? 'تأكيد الرفض' : isTransit ? 'تأكيد الشحن' : isPartial ? 'حفظ الاستلام الجزئي' : 'إغلاق الاستلام'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TransferCard({ transfer, direction, onAction }) {
  const isOutgoing = direction === 'outgoing';

  const actionButtons = isOutgoing
    ? [
        transfer.status === 'requested' ? { key: 'approved', label: 'قبول الطلب', variant: 'success' } : null,
        transfer.status === 'requested' ? { key: 'rejected', label: 'رفض الطلب', variant: 'danger' } : null,
        transfer.status === 'approved' ? { key: 'prepared', label: 'تم التجهيز', variant: 'primary' } : null,
        transfer.status === 'prepared' ? { key: 'in_transit', label: 'تم الشحن', variant: 'primary' } : null,
      ].filter(Boolean)
    : [
        transfer.status === 'in_transit' ? { key: 'fully_received', label: 'تأكيد استلام كامل', variant: 'success' } : null,
        transfer.status === 'in_transit' ? { key: 'partially_received', label: 'استلام جزئي', variant: 'warning' } : null,
        transfer.status === 'partially_received' ? { key: 'fully_received', label: 'إغلاق الاستلام', variant: 'success' } : null,
      ].filter(Boolean);

  return (
    <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={transfer.status} />
            <Badge variant="gray" className="rounded-full">{transfer.transferNumber}</Badge>
            <span className="text-xs text-gray-500">{formatDate(transfer.createdAt)}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl app-surface-muted px-4 py-3">
              <p className="text-xs text-gray-500">{isOutgoing ? 'إلى الفرع' : 'من الفرع'}</p>
              <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">
                {isOutgoing ? transfer.toBranch?.name || '—' : transfer.fromBranch?.name || '—'}
              </p>
            </div>
            <div className="rounded-2xl app-surface-muted px-4 py-3">
              <p className="text-xs text-gray-500">الطلب المرتبط</p>
              <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">
                {transfer.order?.invoiceNumber
                  ? `#${transfer.order.invoiceNumber}`
                  : transfer.requestType === 'branch_replenishment'
                    ? 'طلب تزويد مباشر'
                    : '—'}
              </p>
            </div>
            <div className="rounded-2xl app-surface-muted px-4 py-3">
              <p className="text-xs text-gray-500">{isOutgoing ? 'الحالة التشغيلية' : 'مرجع التتبع'}</p>
              <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">
                {isOutgoing ? (TRANSFER_STATUS_META[transfer.status]?.label || transfer.status) : (transfer.trackingReference || 'غير مسجل')}
              </p>
            </div>
          </div>

          <TransferItemsList items={transfer.items || []} compact />

          {transfer.rejectionReason ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="text-xs font-black text-rose-700 dark:text-rose-300">سبب الرفض</p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">{transfer.rejectionReason}</p>
            </div>
          ) : null}

          {(transfer.issueType || transfer.issueNotes) ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-xs font-black text-amber-700 dark:text-amber-300">ملاحظات الاستلام</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                {transfer.issueNotes || 'تم تسجيل اختلاف أو ملاحظة على الاستلام.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="w-full xl:w-[18rem] space-y-4">
          <div className="rounded-[1.75rem] border border-gray-100 px-4 py-4 dark:border-white/10">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Timeline</p>
            <TransferTimeline entries={transfer.timeline || []} />
          </div>

          <div className="flex flex-wrap gap-2">
            {actionButtons.map((action) => (
              <Button
                key={action.key}
                variant={action.variant}
                size="sm"
                onClick={() => onAction(transfer, action.key)}
              >
                {action.label}
              </Button>
            ))}
            <Link to="/stock-transfers" className="flex-1 min-w-[9rem]">
              <Button variant="outline" size="sm" className="w-full">
                عرض كل التفاصيل
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BranchDashboardPage() {
  const { user, can } = useAuthStore();
  const branchId = user?.branch?._id;
  const canManageStockTransfers = can('invoices', 'update');
  const canViewProducts = can('products', 'read');

  const [stats, setStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(true);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [outgoingTransfers, setOutgoingTransfers] = useState([]);
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [actionState, setActionState] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadStats = useCallback(async () => {
    if (!branchId) {
      setDashboardLoading(false);
      return;
    }

    setDashboardLoading(true);
    try {
      const statsRes = await api.get(`/branches/${branchId}/stats`);
      const statsData = statsRes.data?.data || {};

      setStats({
        today: statsData.today,
        currentShift: statsData.currentShift,
        recentInvoices: statsData.recentInvoices || [],
        gamification: statsData.gamification,
      });
    } catch (error) {
      console.error('Error fetching branch stats:', error);
      setStats({
        today: { sales: 0, paid: 0, invoicesCount: 0, expenses: 0, profit: 0 },
        currentShift: null,
        recentInvoices: [],
        gamification: null,
      });
    } finally {
      setDashboardLoading(false);
    }
  }, [branchId]);

  const loadTransferQueues = useCallback(async () => {
    if (!branchId || !canManageStockTransfers) {
      setOutgoingTransfers([]);
      setIncomingTransfers([]);
      setReadyOrders([]);
      setTransferLoading(false);
      return;
    }

    setTransferLoading(true);
    try {
      const [outgoingRes, incomingRes, readyOrdersRes] = await Promise.all([
        api.get('/stock-transfers', { params: { fromBranch: branchId } }),
        api.get('/stock-transfers', { params: { toBranch: branchId } }),
        api.get('/invoices', {
          params: {
            source: 'portal,online_store',
            fulfillmentBranch: branchId,
            fulfillmentStatus: 'ready_for_shipping',
            limit: 6,
          },
        }),
      ]);

      setOutgoingTransfers(Array.isArray(outgoingRes.data?.data) ? outgoingRes.data.data : []);
      setIncomingTransfers(Array.isArray(incomingRes.data?.data) ? incomingRes.data.data : []);
      setReadyOrders(Array.isArray(readyOrdersRes.data?.data?.invoices) ? readyOrdersRes.data.data.invoices : []);
    } catch (error) {
      notify.error(error.response?.data?.message || 'تعذر تحميل مهام التحويل الخاصة بالفرع');
    } finally {
      setTransferLoading(false);
    }
  }, [branchId, canManageStockTransfers]);

  const loadLowStock = useCallback(async () => {
    if (!branchId || !canViewProducts) {
      setLowStockProducts([]);
      setLowStockLoading(false);
      return;
    }

    setLowStockLoading(true);
    try {
      const response = await api.get('/products/low-stock', {
        params: { branchId },
      });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setLowStockProducts(rows.slice(0, 5));
    } catch (error) {
      notify.error(error.response?.data?.message || 'تعذر تحميل المنتجات منخفضة المخزون لهذا الفرع');
      setLowStockProducts([]);
    } finally {
      setLowStockLoading(false);
    }
  }, [branchId, canViewProducts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTransferQueues();
  }, [loadTransferQueues]);

  useEffect(() => {
    loadLowStock();
  }, [loadLowStock]);

  const handleTransferAction = useCallback(async (transfer, action) => {
    if (!transfer?._id || !action) return;

    if (['rejected', 'in_transit', 'partially_received', 'fully_received'].includes(action)) {
      setActionState({ transfer, action });
      return;
    }

    setActionSubmitting(true);
    try {
      await api.patch(`/stock-transfers/${transfer._id}/status`, { status: action });
      notify.success('تم تحديث حالة التحويل');
      await loadTransferQueues();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث حالة التحويل');
    } finally {
      setActionSubmitting(false);
    }
  }, [loadTransferQueues]);

  const submitActionModal = useCallback(async (payload) => {
    if (!actionState?.transfer?._id) return;

    setActionSubmitting(true);
    try {
      await api.patch(`/stock-transfers/${actionState.transfer._id}/status`, payload);
      notify.success('تم تحديث حالة التحويل');
      setActionState(null);
      await loadTransferQueues();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث حالة التحويل');
    } finally {
      setActionSubmitting(false);
    }
  }, [actionState, loadTransferQueues]);

  const performanceProgress = stats?.gamification?.progress || 0;
  const summaryCards = useMemo(() => ([
    {
      label: 'مبيعات اليوم',
      value: Number(stats?.today?.paid || 0).toLocaleString('ar-EG'),
      accent: 'text-primary-600',
      icon: Receipt,
    },
    {
      label: 'طلبات تحويل صادرة',
      value: outgoingTransfers.length,
      accent: 'text-amber-600',
      icon: ArrowRightLeft,
    },
    {
      label: 'كميات واردة',
      value: incomingTransfers.length,
      accent: 'text-indigo-600',
      icon: Truck,
    },
    {
      label: 'طلبات جاهزة للشحن',
      value: readyOrders.length,
      accent: 'text-emerald-600',
      icon: Package,
    },
  ]), [incomingTransfers.length, outgoingTransfers.length, readyOrders.length, stats?.today?.paid]);

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <div className="rounded-[2rem] bg-gradient-to-r from-primary-700 via-indigo-700 to-cyan-700 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">مرحبًا، {user?.name}</h1>
          <p className="text-primary-100 text-lg mb-6">
            {user?.branch ? `لوحة تشغيل الفرع: ${user.branch.name}` : 'لوحة متابعة عمليات الفرع'}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/quick-sale">
              <Button
                className="bg-white text-primary-600 hover:bg-gray-100 border-none shadow-lg text-lg px-8 py-4 h-auto"
                icon={<ShoppingCart className="w-6 h-6" />}
              >
                بدء عملية بيع
              </Button>
            </Link>
            {canManageStockTransfers && <Link to="/stock-transfers">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                icon={<ArrowRightLeft className="w-5 h-5" />}
              >
                متابعة التحويلات
              </Button>
            </Link>}
          </div>
        </div>
      </div>

      {!user?.isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-indigo-100 font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  تحدي اليوم
                </h3>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-4xl font-black">{performanceProgress}%</span>
                  <span className="text-indigo-200 mb-1">من الهدف اليومي</span>
                </div>
                <p className="text-sm text-indigo-100 opacity-80">
                  حققت {Number(stats?.gamification?.currentSales || stats?.today?.paid || 0).toLocaleString('ar-EG')}
                  {' '}من {Number(stats?.gamification?.dailyTarget || 10000).toLocaleString('ar-EG')} ج.م
                </p>
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="mt-4 w-full bg-black/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, performanceProgress)}%` }}
              />
            </div>
          </div>

          <div className="app-surface rounded-2xl p-6 border border-gray-100/80 dark:border-white/10 shadow-sm relative overflow-hidden">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 font-black text-2xl mb-2 border-4 border-amber-50 dark:border-amber-900/40">
                {stats?.gamification?.level || user?.gamification?.level || 1}
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">بائع نشيط</h3>
              <p className="text-xs text-gray-400 mb-3">المستوى الحالي</p>
              <div className="mb-1 h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, ((stats?.gamification?.points || user?.gamification?.points || 0) % 1000) / 10)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">{stats?.gamification?.points || user?.gamification?.points || 0} XP نقطة خبرة</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-[2rem] border-0 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{card.label}</p>
                <p className={`mt-3 text-3xl font-black ${card.accent}`}>{card.value}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl app-surface-muted flex items-center justify-center">
                <card.icon className={`h-6 w-6 ${card.accent}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {canViewProducts && (
        <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white">منتجات منخفضة في هذا الفرع</h3>
              <p className="text-sm text-gray-500 mt-1">
                راقب الأصناف التي تحتاج تزويدًا سريعًا قبل أن تتحول إلى نفاد كامل.
              </p>
            </div>
            <Link to="/low-stock">
              <Button size="sm" variant="outline" icon={<AlertTriangle className="w-4 h-4" />}>
                فتح قائمة النواقص
              </Button>
            </Link>
          </div>

          {lowStockLoading ? (
            <LoadingSpinner text="جاري تحميل نواقص الفرع..." size="sm" />
          ) : lowStockProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="لا توجد نواقص حرجة الآن"
              description="كل الأصناف المعروضة لهذا الفرع ما زالت فوق الحد الأدنى أو غير مفعلة على الفرع."
              className="py-2"
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {lowStockProducts.map((product) => {
                const qty = Number(product?.branchStock?.quantity ?? product?.stock?.quantity ?? 0);
                const minQty = Number(product?.branchStock?.minQuantity ?? product?.stock?.minQuantity ?? 0);
                const isOut = qty <= 0;

                return (
                  <div key={product._id} className="rounded-3xl app-surface-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-gray-900 dark:text-white">{product.name}</p>
                        <p className="mt-1 text-xs text-gray-500">SKU: {product.sku || '—'}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          الكمية الحالية: <span className="font-black">{qty}</span>
                          {' '}| الحد الأدنى: <span className="font-black">{minQty}</span>
                        </p>
                      </div>
                      <Badge variant={isOut ? 'danger' : 'warning'} className="rounded-full">
                        {isOut ? 'نفد' : 'منخفض'}
                      </Badge>
                    </div>
                    {canManageStockTransfers ? (
                      <div className="mt-3">
                        <Link
                          to={`/stock-transfers?${new URLSearchParams({
                            direction: 'incoming',
                            focusProduct: String(product._id || ''),
                            focusName: product.name || '',
                            focusSku: product.sku || '',
                            focusQty: String(qty),
                            focusMin: String(minQty),
                            createReplenishment: '1',
                          }).toString()}`}
                        >
                          <Button size="sm" variant="outline" className="w-full" icon={<ArrowRightLeft className="w-4 h-4" />}>
                            متابعة طلبات التزويد لهذا الصنف
                          </Button>
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <h2 className="text-xl font-bold flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-gray-500" />
        الوصول السريع
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/quick-sale" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-primary-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors text-primary-500">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">نقطة البيع</span>
        </Link>

        <Link to="/products" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-500">
            <Search className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">بحث عن منتج</span>
        </Link>

        {canManageStockTransfers && <Link to="/stock-transfers" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-500">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">التحويلات</span>
        </Link>}

        <Link to="/returns-management" className="app-surface group flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100/80 p-6 text-center shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-white/10">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-500">
            <RotateCcw className="w-7 h-7" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300">المرتجعات</span>
        </Link>
      </div>

      {canManageStockTransfers && <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-lg text-gray-900 dark:text-white">طلبات التحويل الصادرة من فرعك</h3>
              <p className="text-sm text-gray-500 mt-1">اقبل أو ارفض أو جهز الطلبات التي يجب إرسالها من هذا الفرع إلى Branch X.</p>
            </div>
            <Badge variant="warning" className="rounded-full">{outgoingTransfers.length}</Badge>
          </div>

          {transferLoading ? (
            <LoadingSpinner text="جاري تحميل طلبات التحويل..." />
          ) : outgoingTransfers.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="لا توجد طلبات تحويل صادرة"
              description="عندما يطلب النظام من فرعك إرسال كمية إلى Branch X ستظهر هنا مع الخط الزمني والإجراءات."
            />
          ) : (
            <div className="space-y-4">
              {outgoingTransfers.slice(0, 4).map((transfer) => (
                <TransferCard
                  key={transfer._id}
                  transfer={transfer}
                  direction="outgoing"
                  onAction={handleTransferAction}
                />
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-gray-900 dark:text-white">طلبات جاهزة للشحن</h3>
              <Badge variant="success" className="rounded-full">{readyOrders.length}</Badge>
            </div>
            {transferLoading ? (
              <LoadingSpinner text="جاري تحميل الطلبات الجاهزة..." size="sm" />
            ) : readyOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="لا توجد طلبات جاهزة حاليًا"
                description="بعد اكتمال الاستلام في فرعك ستظهر الطلبات الجاهزة لتسليمها لشركة الشحن هنا."
                className="py-2"
              />
            ) : (
              <div className="space-y-3">
                {readyOrders.map((order) => (
                  <div key={order._id} className="rounded-3xl app-surface-muted px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-gray-900 dark:text-white">طلب #{order.invoiceNumber}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {order.customer?.name || 'عميل'} • {Number(order.totalAmount || 0).toLocaleString('ar-EG')} ج.م
                        </p>
                      </div>
                      <Link to={`/portal-orders/${order._id}`}>
                        <Button size="sm" variant="outline">فتح الطلب</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-4">معلومات الموظف</h3>
            <div className="space-y-4">
              <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 text-sm">الاسم</span>
                <span className="font-bold">{user?.name}</span>
              </div>
              <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 text-sm">الدور الوظيفي</span>
                <Badge variant="primary">{user?.role === 'vendor' ? 'مدير فرع / مبيعات' : user?.role}</Badge>
              </div>
              <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 text-sm">الفرع الحالي</span>
                <span className="font-bold">{user?.branch?.name || 'الفرع الرئيسي'}</span>
              </div>
              <div className="app-surface-muted flex items-center justify-between rounded-xl p-3">
                <span className="text-gray-500 text-sm">وقت الدخول</span>
                <span className="font-bold font-mono">{format(new Date(), 'hh:mm a', { locale: ar })}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>}

      {canManageStockTransfers && <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-lg text-gray-900 dark:text-white">الكميات الواردة إلى فرعك</h3>
            <p className="text-sm text-gray-500 mt-1">تابع التحويلات القادمة إلى الفرع، ثم أكد الاستلام الكامل أو الجزئي وسجل المشكلات.</p>
          </div>
          <Badge variant="info" className="rounded-full">{incomingTransfers.length}</Badge>
        </div>

        {transferLoading ? (
          <LoadingSpinner text="جاري تحميل التحويلات الواردة..." />
        ) : incomingTransfers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="لا توجد تحويلات واردة"
            description="أي كمية في الطريق إلى هذا الفرع ستظهر هنا مع أزرار الاستلام والإبلاغ عن الفروقات."
          />
        ) : (
          <div className="space-y-4">
            {incomingTransfers.slice(0, 4).map((transfer) => (
              <TransferCard
                key={transfer._id}
                transfer={transfer}
                direction="incoming"
                onAction={handleTransferAction}
              />
            ))}
          </div>
        )}
      </Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock3 className="w-5 h-5 text-gray-500" />
              آخر العمليات
            </h3>
            <Link to="/invoices" className="text-primary-600 text-sm font-bold hover:underline">عرض الكل</Link>
          </div>

          {dashboardLoading ? (
            <div className="py-10 flex justify-center"><LoadingSpinner /></div>
          ) : stats?.recentInvoices?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentInvoices.slice(0, 5).map((inv, index) => (
                <div key={inv._id || index} className="app-surface-muted flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="app-surface flex h-10 w-10 items-center justify-center rounded-lg shadow-sm">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">فاتورة #{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(inv.createdAt, 'hh:mm a')}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{Number(inv.totalAmount || 0).toLocaleString('ar-EG')} ج.م</p>
                    <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                      {inv.status === 'paid' ? 'مدفوع' : 'معلق'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400">لا توجد عمليات بيع اليوم</div>
          )}
        </Card>

        <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <User className="w-5 h-5 text-gray-500" />
            تعليمات تشغيلية
          </h3>
          <div className="space-y-3">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="font-black text-emerald-800 dark:text-emerald-300">الشحن من Branch X فقط</p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">لا يتم تسليم الطلب لشركة الشحن إلا بعد اكتمال الكمية في فرع الشحن الأساسي.</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="font-black text-amber-800 dark:text-amber-300">الاستلام الجزئي يحتاج مراجعة</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">إذا استلمت كمية أقل من المتوقع، سجّل الفروقات ولا تعتبر الطلب جاهزًا للشحن تلقائيًا.</p>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50/80 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <p className="font-black text-rose-800 dark:text-rose-300">لا يوجد إلغاء بعد الشحن الداخلي</p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">بعد انتقال التحويل إلى حالة "في الطريق" يجب حله عبر الاستلام أو تسجيل المشكلة، وليس الإلغاء.</p>
            </div>
          </div>
        </Card>
      </div>

      <TransferActionModal
        modalState={actionState}
        onClose={() => setActionState(null)}
        onSubmit={submitActionModal}
        submitting={actionSubmitting}
      />
    </div>
  );
}
