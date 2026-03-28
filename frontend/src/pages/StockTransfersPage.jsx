import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import { api, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const STATUS_META = {
  requested: { label: 'مطلوب', variant: 'warning' },
  approved: { label: 'معتمد', variant: 'info' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  prepared: { label: 'تم التجهيز', variant: 'primary' },
  in_transit: { label: 'في الطريق', variant: 'primary' },
  partially_received: { label: 'استلام جزئي', variant: 'warning' },
  fully_received: { label: 'مكتمل', variant: 'success' },
  cancelled: { label: 'ملغي', variant: 'gray' },
};

const STATUS_TABS = ['all', 'requested', 'approved', 'prepared', 'in_transit', 'partially_received', 'fully_received', 'rejected', 'cancelled'];
const DIRECTION_TABS = ['all', 'incoming', 'outgoing'];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('ar-EG') : '—';
}

function matchesBranch(reference, branchId) {
  return String(reference?._id || reference || '') === String(branchId || '');
}

function getBranchContext(user, tenant) {
  const userBranchId = user?.branch?._id || user?.branch || '';
  if (userBranchId) {
    return {
      id: String(userBranchId),
      name: user?.branch?.name || tenant?.name || 'الفرع الحالي',
      branchType: user?.branch?.branchType || '',
      source: 'user',
    };
  }

  if (tenant?.branchType && tenant?._id) {
    return {
      id: String(tenant._id),
      name: tenant?.name || 'الفرع الحالي',
      branchType: tenant?.branchType || '',
      source: 'tenant',
    };
  }

  return null;
}

function getTransferDirection(transfer, branchId) {
  if (!branchId) return 'all';
  if (matchesBranch(transfer?.toBranch, branchId)) return 'incoming';
  if (matchesBranch(transfer?.fromBranch, branchId)) return 'outgoing';
  return 'other';
}

function getDirectionLabel(direction) {
  if (direction === 'incoming') return 'وارد';
  if (direction === 'outgoing') return 'صادر';
  return 'عام';
}

function getActionConfig(status, direction, branchScoped) {
  if (!branchScoped) {
    if (status === 'requested') return [{ status: 'approved', label: 'اعتماد', variant: 'primary' }];
    if (status === 'approved') return [{ status: 'prepared', label: 'تم التجهيز', variant: 'primary' }];
    if (status === 'prepared') return [{ status: 'in_transit', label: 'تم الشحن', variant: 'primary' }];
    if (status === 'in_transit') return [{ status: 'fully_received', label: 'استلام كامل', variant: 'success' }];
    if (status === 'partially_received') return [{ status: 'fully_received', label: 'إغلاق الاستلام', variant: 'success' }];
    return [];
  }

  if (direction === 'outgoing') {
    if (status === 'requested') {
      return [
        { status: 'approved', label: 'قبول الطلب', variant: 'primary' },
        { status: 'rejected', label: 'رفض الطلب', variant: 'danger' },
      ];
    }
    if (status === 'approved') return [{ status: 'prepared', label: 'تم التجهيز', variant: 'primary' }];
    if (status === 'prepared') return [{ status: 'in_transit', label: 'تم الشحن', variant: 'primary' }];
  }

  if (direction === 'incoming') {
    if (status === 'prepared') {
      return [
        { status: 'fully_received', label: 'استلام كامل', variant: 'success' },
      ];
    }
    if (status === 'in_transit') {
      return [
        { status: 'fully_received', label: 'استلام كامل', variant: 'success' },
      ];
    }
    if (status === 'partially_received') {
      return [{ status: 'fully_received', label: 'إغلاق الاستلام', variant: 'success' }];
    }
  }

  return [];
}

function TransferStatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.requested;
  return <Badge variant={meta.variant} className="rounded-full">{meta.label}</Badge>;
}

export default function StockTransfersPage() {
  const { id: transferIdFromRoute } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoReplenishmentRequestRef = useRef('');
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const getBranches = useAuthStore((state) => state.getBranches);
  const branchContext = useMemo(() => getBranchContext(user, tenant), [tenant, user]);
  const isBranchScoped = Boolean(branchContext?.id);
  const directionFromQuery = searchParams.get('direction');
  const shouldAutoOpenReplenishment = searchParams.get('createReplenishment') === '1';
  const initialDirectionFilter = DIRECTION_TABS.includes(directionFromQuery) ? directionFromQuery : 'all';
  const focusedProduct = useMemo(() => ({
    id: searchParams.get('focusProduct') || '',
    name: searchParams.get('focusName') || '',
    sku: searchParams.get('focusSku') || '',
    quantity: Number(searchParams.get('focusQty') || 0),
    minQuantity: Number(searchParams.get('focusMin') || 0),
  }), [searchParams]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState(initialDirectionFilter);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [replenishmentModalOpen, setReplenishmentModalOpen] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchOptionsLoading, setBranchOptionsLoading] = useState(false);
  const [replenishmentLoading, setReplenishmentLoading] = useState(false);
  const [replenishmentForm, setReplenishmentForm] = useState({
    sourceMode: 'auto',
    fromBranchId: '',
    requestedQty: 1,
    notes: '',
  });

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/stock-transfers', { params });
      setTransfers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      notify.error(error.response?.data?.message || 'تعذر تحميل التحويلات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const openTransfer = useCallback(async (transferId) => {
    try {
      const res = await api.get(`/stock-transfers/${transferId}`);
      setSelectedTransfer(res.data?.data || null);
    } catch (error) {
      notify.error(error.response?.data?.message || 'تعذر تحميل تفاصيل التحويل');
    }
  }, []);

  useEffect(() => {
    if (!transferIdFromRoute) return;
    openTransfer(transferIdFromRoute);
  }, [openTransfer, transferIdFromRoute]);

  useEffect(() => {
    const nextDirection = DIRECTION_TABS.includes(searchParams.get('direction'))
      ? searchParams.get('direction')
      : 'all';
    setDirectionFilter((current) => (current === nextDirection ? current : nextDirection));
  }, [searchParams]);

  const handleDirectionFilterChange = useCallback((nextDirection) => {
    setDirectionFilter(nextDirection);

    const nextParams = new URLSearchParams(searchParams);
    if (nextDirection === 'all') {
      nextParams.delete('direction');
    } else {
      nextParams.set('direction', nextDirection);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const revealFocusedTransfers = useCallback(() => {
    setStatusFilter('all');
    if (isBranchScoped) {
      handleDirectionFilterChange('incoming');
    }
  }, [handleDirectionFilterChange, isBranchScoped]);

  const loadBranchOptions = useCallback(async () => {
    if (!isBranchScoped) return;

    setBranchOptionsLoading(true);
    try {
      const branches = await getBranches?.();
      const normalized = Array.isArray(branches) ? branches : [];
      setBranchOptions(
        normalized.filter((branch) => String(branch?._id || '') !== String(branchContext?.id || ''))
      );
    } finally {
      setBranchOptionsLoading(false);
    }
  }, [branchContext?.id, getBranches, isBranchScoped]);

  const openReplenishmentModal = useCallback(async () => {
    if (!focusedProduct.id || !isBranchScoped) return;
    await loadBranchOptions();
    setReplenishmentModalOpen(true);
  }, [focusedProduct.id, isBranchScoped, loadBranchOptions]);

  const updateTransferStatus = useCallback(async (transfer, nextStatus) => {
    if (!transfer?._id) return;

    setActionLoading(`${transfer._id}:${nextStatus}`);
    try {
      const payload = { status: nextStatus };
      if (nextStatus === 'rejected' && !transfer.rejectionReason) {
        payload.rejectionReason = 'تم رفض الطلب من الفرع المصدر';
      }

      await api.patch(`/stock-transfers/${transfer._id}/status`, payload);
      notify.success('تم تحديث حالة التحويل');
      await loadTransfers();
      if (selectedTransfer?._id === transfer._id) {
        await openTransfer(transfer._id);
      }
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث حالة التحويل');
    } finally {
      setActionLoading('');
    }
  }, [loadTransfers, openTransfer, selectedTransfer?._id]);

  const scopedTransfers = useMemo(() => {
    if (!isBranchScoped) return transfers;

    return transfers.filter((transfer) => {
      const direction = getTransferDirection(transfer, branchContext.id);
      return direction !== 'other';
    });
  }, [branchContext?.id, isBranchScoped, transfers]);

  const visibleTransfers = useMemo(() => {
    let nextTransfers = [...scopedTransfers];

    if (isBranchScoped && directionFilter !== 'all') {
      nextTransfers = nextTransfers.filter(
        (transfer) => getTransferDirection(transfer, branchContext.id) === directionFilter,
      );
    }

    nextTransfers.sort((left, right) => {
      const leftMatchesFocus = focusedProduct.id
        && Array.isArray(left.items)
        && left.items.some((item) => String(item.product || '') === String(focusedProduct.id));
      const rightMatchesFocus = focusedProduct.id
        && Array.isArray(right.items)
        && right.items.some((item) => String(item.product || '') === String(focusedProduct.id));

      if (leftMatchesFocus !== rightMatchesFocus) {
        return leftMatchesFocus ? -1 : 1;
      }

      return new Date(right.createdAt) - new Date(left.createdAt);
    });
    return nextTransfers;
  }, [branchContext?.id, directionFilter, focusedProduct.id, isBranchScoped, scopedTransfers]);

  const summary = useMemo(() => {
    if (isBranchScoped) {
      return {
        incoming: scopedTransfers.filter((item) => getTransferDirection(item, branchContext.id) === 'incoming').length,
        outgoing: scopedTransfers.filter((item) => getTransferDirection(item, branchContext.id) === 'outgoing').length,
        pending: scopedTransfers.filter((item) => ['requested', 'approved', 'prepared', 'in_transit', 'partially_received'].includes(item.status)).length,
        completed: scopedTransfers.filter((item) => item.status === 'fully_received').length,
      };
    }

    return {
      total: visibleTransfers.length,
      requested: visibleTransfers.filter((item) => item.status === 'requested').length,
      inTransit: visibleTransfers.filter((item) => item.status === 'in_transit').length,
      completed: visibleTransfers.filter((item) => item.status === 'fully_received').length,
    };
  }, [branchContext?.id, isBranchScoped, scopedTransfers, visibleTransfers]);

  const focusedTransferCount = useMemo(() => {
    if (!focusedProduct.id) return 0;

    return scopedTransfers.filter((transfer) => (
      getTransferDirection(transfer, branchContext?.id) === 'incoming'
      && ['requested', 'approved', 'prepared', 'in_transit', 'partially_received'].includes(transfer.status)
      && Array.isArray(transfer.items)
      && transfer.items.some((item) => String(item.product || '') === String(focusedProduct.id))
    )).length;
  }, [branchContext?.id, focusedProduct.id, scopedTransfers]);

  const focusedVisibleTransferCount = useMemo(() => {
    if (!focusedProduct.id) return 0;

    return visibleTransfers.filter((transfer) => (
      Array.isArray(transfer.items)
      && transfer.items.some((item) => String(item.product || '') === String(focusedProduct.id))
    )).length;
  }, [focusedProduct.id, visibleTransfers]);

  const hasFocusedTransfersOutsideCurrentFilters = Boolean(
    focusedProduct.id && focusedTransferCount > 0 && focusedVisibleTransferCount === 0,
  );

  const suggestedReplenishmentQty = useMemo(() => {
    const shortageQty = Math.max(0, Number(focusedProduct.minQuantity || 0) - Number(focusedProduct.quantity || 0));
    return Math.max(1, shortageQty || 1);
  }, [focusedProduct.minQuantity, focusedProduct.quantity]);

  const manualSourceBranches = useMemo(
    () => branchOptions.filter((branch) => String(branch?._id || '') !== String(branchContext?.id || '')),
    [branchContext?.id, branchOptions],
  );

  const selectedTransferDirection = useMemo(() => {
    if (!selectedTransfer || !isBranchScoped) return 'all';
    return getTransferDirection(selectedTransfer, branchContext.id);
  }, [branchContext?.id, isBranchScoped, selectedTransfer]);

  useEffect(() => {
    if (!isBranchScoped || !focusedProduct.id || loading || focusedTransferCount > 0 || !shouldAutoOpenReplenishment) {
      return;
    }

    const requestKey = `${branchContext?.id || ''}:${focusedProduct.id}`;
    if (autoReplenishmentRequestRef.current === requestKey) {
      return;
    }

    autoReplenishmentRequestRef.current = requestKey;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('createReplenishment');
    setSearchParams(nextParams, { replace: true });
    openReplenishmentModal();
  }, [
    branchContext?.id,
    focusedProduct.id,
    focusedTransferCount,
    isBranchScoped,
    loading,
    openReplenishmentModal,
    searchParams,
    setSearchParams,
    shouldAutoOpenReplenishment,
  ]);

  useEffect(() => {
    if (!focusedProduct.id) return;
    setReplenishmentForm((current) => ({
      ...current,
      requestedQty: suggestedReplenishmentQty,
      fromBranchId: current.fromBranchId || '',
    }));
  }, [focusedProduct.id, suggestedReplenishmentQty]);

  const createReplenishmentRequest = useCallback(async () => {
    if (!focusedProduct.id || !branchContext?.id) return;
    if (replenishmentForm.sourceMode === 'manual' && !replenishmentForm.fromBranchId) {
      notify.error('اختر فرع الإرسال أو استخدم الاختيار التلقائي');
      return;
    }

    setReplenishmentLoading(true);
    try {
      const payload = {
        toBranchId: branchContext.id,
        notes: replenishmentForm.notes || '',
        items: [{
          product: focusedProduct.id,
          productName: focusedProduct.name || '',
          sku: focusedProduct.sku || '',
          requestedQty: Math.max(1, Number(replenishmentForm.requestedQty) || 0),
        }],
      };

      if (replenishmentForm.sourceMode === 'manual') {
        payload.fromBranchId = replenishmentForm.fromBranchId;
      }

      const res = await api.post('/stock-transfers', payload);
      const createdTransfer = res.data?.data || null;

      notify.success(res.data?.message || 'تم إنشاء طلب التزويد');
      setReplenishmentModalOpen(false);
      setReplenishmentForm((current) => ({
        ...current,
        sourceMode: 'auto',
        fromBranchId: '',
        requestedQty: suggestedReplenishmentQty,
        notes: '',
      }));
      revealFocusedTransfers();
      await loadTransfers();
      if (createdTransfer?._id) {
        await openTransfer(createdTransfer._id);
      }
    } catch (error) {
      notify.error(error.response?.data?.message || 'تعذر إنشاء طلب التزويد');
    } finally {
      setReplenishmentLoading(false);
    }
  }, [
    branchContext?.id,
    focusedProduct.id,
    focusedProduct.name,
    focusedProduct.sku,
    loadTransfers,
    openTransfer,
    replenishmentForm.fromBranchId,
    replenishmentForm.notes,
    replenishmentForm.requestedQty,
    replenishmentForm.sourceMode,
    revealFocusedTransfers,
    suggestedReplenishmentQty,
  ]);

  const pageTitle = isBranchScoped
    ? `طلبات التزويد والتحويلات في ${branchContext.name}`
    : 'تحويلات المخزون بين الفروع';

  const pageDescription = isBranchScoped
    ? 'هذه الصفحة تعرض للفرع الحالي طلبات التزويد الخارجة منه والتحويلات الواردة إليه، وتغيّر محتواها حسب الفرع المفتوح حاليًا.'
    : 'لوحة عامة لمتابعة كل تحويلات المخزون بين الفروع من مكان واحد.';

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <div className="rounded-[2rem] bg-gradient-to-l from-slate-950 via-indigo-950 to-cyan-800 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200/80">
              {isBranchScoped ? 'Branch Context' : 'Transfers'}
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-black">
              <ArrowRightLeft className="h-7 w-7" />
              {pageTitle}
            </h1>
            <p className="mt-2 text-sm text-white/75">{pageDescription}</p>
          </div>
          <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={loadTransfers}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      {isBranchScoped && (
        <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Current Branch</p>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{branchContext.name}</p>
              <p className="mt-2 text-sm text-gray-500">
                من الـ sidebar افتح مباشرة رابط <span className="font-black text-primary-600">تحويلات {branchContext.name}</span>، وستتغير الصفحة تلقائيًا حسب الفرع المفتوح.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIRECTION_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleDirectionFilterChange(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    directionFilter === tab ? 'bg-primary-600 text-white' : 'app-surface-muted text-gray-500 hover:text-primary-600'
                  }`}
                >
                  {tab === 'all' ? 'الكل' : tab === 'incoming' ? 'الوارد' : 'الصادر'}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {isBranchScoped && (focusedProduct.id || focusedProduct.name) && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-300">
                Focused Replenishment Context
              </p>
              <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">
                {focusedProduct.name || 'صنف محدد'} يحتاج متابعة تزويد
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                SKU: {focusedProduct.sku || '—'} | الكمية الحالية: <span className="font-black">{focusedProduct.quantity}</span>
                {' '}| الحد الأدنى: <span className="font-black">{focusedProduct.minQuantity}</span>
              </p>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                التحويلات الواردة المفتوحة لهذا الصنف إلى الفرع: <span className="font-black">{focusedTransferCount}</span>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const nextParams = new URLSearchParams(searchParams);
                ['focusProduct', 'focusName', 'focusSku', 'focusQty', 'focusMin', 'createReplenishment'].forEach((key) => nextParams.delete(key));
                setSearchParams(nextParams, { replace: true });
              }}
            >
              إزالة التركيز
            </Button>
          </div>
        </Card>
      )}

      {focusedProduct.id && !loading && focusedTransferCount === 0 && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-black text-amber-900 dark:text-amber-200">
                  لا توجد تحويلات واردة مفتوحة لهذا الصنف حاليًا
                </p>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                  الصنف <span className="font-black">{focusedProduct.name || 'المحدد'}</span> لا يملك الآن أي طلبات تزويد
                  واردة مفتوحة إلى الفرع الحالي. يمكنك إنشاء طلب تزويد مباشر بدل الاكتفاء بالمتابعة.
                </p>
              </div>
            </div>
            <Button onClick={openReplenishmentModal}>إنشاء طلب تزويد</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {isBranchScoped ? (
          <>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Incoming</p>
              <p className="mt-3 text-3xl font-black text-blue-600">{summary.incoming}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Outgoing</p>
              <p className="mt-3 text-3xl font-black text-indigo-600">{summary.outgoing}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Pending</p>
              <p className="mt-3 text-3xl font-black text-amber-600">{summary.pending}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Completed</p>
              <p className="mt-3 text-3xl font-black text-emerald-600">{summary.completed}</p>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Total</p>
              <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{summary.total}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Requested</p>
              <p className="mt-3 text-3xl font-black text-amber-600">{summary.requested}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">In Transit</p>
              <p className="mt-3 text-3xl font-black text-primary-600">{summary.inTransit}</p>
            </Card>
            <Card className="rounded-[2rem] border-0 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Completed</p>
              <p className="mt-3 text-3xl font-black text-emerald-600">{summary.completed}</p>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${statusFilter === tab ? 'bg-primary-600 text-white' : 'app-surface-muted text-gray-500 hover:text-primary-600'}`}
          >
            {tab === 'all' ? 'الكل' : (STATUS_META[tab]?.label || tab)}
          </button>
        ))}
      </div>

      {hasFocusedTransfersOutsideCurrentFilters && (
        <Card className="rounded-[2rem] border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-black text-blue-900 dark:text-blue-200">
                توجد تحويلات واردة مطابقة لكن الفلاتر الحالية تخفيها
              </p>
              <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
                يوجد <span className="font-black">{focusedTransferCount}</span> تحويل/تحويلات واردة مفتوحة لهذا الصنف،
                لكن الفلاتر الحالية لا تعرض أيًا منها.
              </p>
            </div>
            <Button variant="outline" onClick={revealFocusedTransfers}>
              إظهار التحويلات المطابقة
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner text="جاري تحميل التحويلات..." />
      ) : visibleTransfers.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title={isBranchScoped ? 'لا توجد تحويلات لهذا الفرع' : 'لا توجد تحويلات'}
          description={isBranchScoped
            ? 'هذا الفرع لا يملك حاليًا تحويلات واردة أو صادرة تطابق الفلاتر الحالية.'
            : 'لم يتم إنشاء أي طلبات تحويل تطابق الفلتر الحالي.'}
        />
      ) : (
        <Card className="rounded-[2rem] border-0 p-0 shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <p className="font-black text-gray-900 dark:text-white">قائمة التحويلات</p>
            <Badge variant="gray" className="rounded-full">{summary.total}</Badge>
            {focusedProduct.id ? (
              <Badge variant="warning" className="rounded-full">
                مطابق للصنف المحدد: {focusedVisibleTransferCount}
              </Badge>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-right text-sm">
              <thead className="app-surface-muted">
                <tr>
                  <th className="px-5 py-4 font-black text-gray-500">الرقم</th>
                  {isBranchScoped ? (
                    <>
                      <th className="px-5 py-4 font-black text-gray-500">الاتجاه</th>
                      <th className="px-5 py-4 font-black text-gray-500">الطرف الآخر</th>
                    </>
                  ) : (
                    <>
                      <th className="px-5 py-4 font-black text-gray-500">من</th>
                      <th className="px-5 py-4 font-black text-gray-500">إلى</th>
                    </>
                  )}
                  <th className="px-5 py-4 font-black text-gray-500">الطلب</th>
                  <th className="px-5 py-4 font-black text-gray-500">المنتجات</th>
                  <th className="px-5 py-4 font-black text-gray-500">الحالة</th>
                  <th className="px-5 py-4 font-black text-gray-500">التاريخ</th>
                  <th className="px-5 py-4 font-black text-gray-500 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {visibleTransfers.map((transfer) => {
                  const direction = isBranchScoped ? getTransferDirection(transfer, branchContext.id) : 'all';
                  const counterpart = direction === 'incoming'
                    ? transfer.fromBranch?.name || '—'
                    : transfer.toBranch?.name || '—';
                  const actions = getActionConfig(transfer.status, direction, isBranchScoped);
                  const matchesFocusedProduct = focusedProduct.id
                    && Array.isArray(transfer.items)
                    && transfer.items.some((item) => String(item.product || '') === String(focusedProduct.id));

                  return (
                    <tr
                      key={transfer._id}
                      className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                        matchesFocusedProduct ? 'bg-amber-50/70 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="px-5 py-4 font-black text-primary-600">{transfer.transferNumber}</td>
                      {isBranchScoped ? (
                        <>
                          <td className="px-5 py-4">
                            <Badge variant={direction === 'incoming' ? 'info' : 'primary'} className="rounded-full">
                              {getDirectionLabel(direction)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 font-bold text-gray-800 dark:text-gray-100">{counterpart}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-4">{transfer.fromBranch?.name || '—'}</td>
                          <td className="px-5 py-4">{transfer.toBranch?.name || '—'}</td>
                        </>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span>
                            {transfer.order?.invoiceNumber
                              ? `#${transfer.order.invoiceNumber}`
                              : transfer.requestType === 'branch_replenishment'
                                ? 'طلب تزويد مباشر'
                                : '—'}
                          </span>
                          {matchesFocusedProduct ? (
                            <Badge variant="warning" className="rounded-full">الصنف المحدد</Badge>
                          ) : null}
                          {transfer.requestType === 'branch_replenishment' ? (
                            <Badge variant="info" className="rounded-full">تزويد مباشر</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">{(transfer.items || []).reduce((sum, item) => sum + Number(item.requestedQty || 0), 0)}</td>
                      <td className="px-5 py-4"><TransferStatusBadge status={transfer.status} /></td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(transfer.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openTransfer(transfer._id)}>عرض</Button>
                          {actions.map((action) => (
                            <Button
                              key={action.status}
                              size="sm"
                              variant={action.variant}
                              loading={actionLoading === `${transfer._id}:${action.status}`}
                              onClick={() => updateTransferStatus(transfer, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={replenishmentModalOpen}
        onClose={() => setReplenishmentModalOpen(false)}
        title={focusedProduct.name ? `طلب تزويد ${focusedProduct.name}` : 'طلب تزويد جديد'}
        size="md"
      >
        <div className="space-y-4">
          <Card className="rounded-3xl border-0 p-4 shadow-none app-surface-muted">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الفرع المستلم</span>
                <span className="font-black">{branchContext?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الصنف</span>
                <span className="font-black">{focusedProduct.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">SKU</span>
                <span className="font-black">{focusedProduct.sku || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">العجز المقترح</span>
                <span className="font-black">{suggestedReplenishmentQty}</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">مصدر التزويد</span>
              <select
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                value={replenishmentForm.sourceMode}
                onChange={(event) => setReplenishmentForm((current) => ({
                  ...current,
                  sourceMode: event.target.value,
                  fromBranchId: event.target.value === 'manual' ? current.fromBranchId : '',
                }))}
              >
                <option value="auto">اختيار تلقائي لأفضل فرع</option>
                <option value="manual">اختيار فرع يدوي</option>
              </select>
            </label>

            <label className="rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">الكمية المطلوبة</span>
              <input
                type="number"
                min="1"
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                value={replenishmentForm.requestedQty}
                onChange={(event) => setReplenishmentForm((current) => ({
                  ...current,
                  requestedQty: Math.max(1, Number(event.target.value) || 1),
                }))}
              />
            </label>
          </div>

          {replenishmentForm.sourceMode === 'manual' ? (
            <label className="block rounded-2xl border border-[color:var(--surface-border)] p-4">
              <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">فرع الإرسال</span>
              <select
                className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
                value={replenishmentForm.fromBranchId}
                onChange={(event) => setReplenishmentForm((current) => ({ ...current, fromBranchId: event.target.value }))}
                disabled={branchOptionsLoading}
              >
                <option value="">{branchOptionsLoading ? 'جاري تحميل الفروع...' : 'اختر فرع الإرسال'}</option>
                {manualSourceBranches.map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block rounded-2xl border border-[color:var(--surface-border)] p-4">
            <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400">ملاحظات</span>
            <textarea
              rows={3}
              className="mt-3 w-full rounded-xl border-2 border-transparent bg-transparent px-3 py-2 app-text-body focus:border-primary-500/30 focus:outline-none"
              placeholder="مثال: الصنف نفد من الفرع ونحتاج تزويده قبل نهاية اليوم"
              value={replenishmentForm.notes}
              onChange={(event) => setReplenishmentForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setReplenishmentModalOpen(false)}>
              إلغاء
            </Button>
            <Button loading={replenishmentLoading} onClick={createReplenishmentRequest}>
              إنشاء طلب التزويد
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        title={selectedTransfer ? `تحويل ${selectedTransfer.transferNumber}` : 'تفاصيل التحويل'}
        size="lg"
      >
        {selectedTransfer && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <TransferStatusBadge status={selectedTransfer.status} />
              <Badge variant="gray" className="rounded-full">
                {selectedTransfer.fromBranch?.name || '—'} → {selectedTransfer.toBranch?.name || '—'}
              </Badge>
              {selectedTransfer.requestType === 'branch_replenishment' ? (
                <Badge variant="info" className="rounded-full">
                  تزويد مباشر
                </Badge>
              ) : null}
              {isBranchScoped && (
                <Badge variant={selectedTransferDirection === 'incoming' ? 'info' : 'primary'} className="rounded-full">
                  {getDirectionLabel(selectedTransferDirection)}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-3xl border-0 p-4 shadow-none app-surface-muted">
                <h4 className="font-black text-gray-900 dark:text-white">البيانات الأساسية</h4>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">الطلب</span>
                    <span className="font-bold">
                      {selectedTransfer.order?.invoiceNumber
                        ? `#${selectedTransfer.order.invoiceNumber}`
                        : selectedTransfer.requestType === 'branch_replenishment'
                          ? 'طلب تزويد مباشر'
                          : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between"><span className="text-gray-400">المنشئ</span><span className="font-bold">{selectedTransfer.createdBy?.name || '—'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-400">التاريخ</span><span className="font-bold">{formatDate(selectedTransfer.createdAt)}</span></div>
                </div>
              </Card>

              <Card className="rounded-3xl border-0 p-4 shadow-none app-surface-muted">
                <h4 className="font-black text-gray-900 dark:text-white">حركة النقل</h4>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-400">من</span><span className="font-bold">{selectedTransfer.fromBranch?.name || '—'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-400">إلى</span><span className="font-bold">{selectedTransfer.toBranch?.name || '—'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-400">مرجع التتبع</span><span className="font-bold">{selectedTransfer.trackingReference || '—'}</span></div>
                </div>
              </Card>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-gray-900 dark:text-white">الأصناف</h4>
              {(selectedTransfer.items || []).map((item, index) => (
                <div key={`${item.product || index}`} className="app-surface-muted rounded-3xl px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="mt-1 text-xs text-gray-500">SKU: {item.sku || '—'}</p>
                    </div>
                    <div className="text-left text-xs">
                      <p>مطلوب: <span className="font-black">{item.requestedQty}</span></p>
                      <p>تم شحنه: <span className="font-black">{item.shippedQty || 0}</span></p>
                      <p>تم استلامه: <span className="font-black">{item.receivedQty || 0}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(selectedTransfer.timeline || []).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-black text-gray-900 dark:text-white">الخط الزمني</h4>
                <div className="space-y-3">
                  {selectedTransfer.timeline.map((entry, index) => (
                    <div key={`${entry.status}-${entry.at}-${index}`} className="flex items-start gap-3 rounded-3xl border border-gray-100 px-4 py-4 dark:border-white/10">
                      <div className="mt-0.5">
                        {entry.status === 'rejected' ? (
                          <XCircle className="h-5 w-5 text-rose-500" />
                        ) : entry.status === 'fully_received' ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : entry.status === 'in_transit' ? (
                          <Truck className="h-5 w-5 text-primary-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-gray-900 dark:text-white">{STATUS_META[entry.status]?.label || entry.status}</p>
                        <p className="text-xs text-gray-500">{formatDate(entry.at)}</p>
                        {entry.note && <p className="text-sm text-gray-600 dark:text-gray-300">{entry.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTransfer.status === 'rejected' && selectedTransfer.rejectionReason && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500" />
                  <div>
                    <p className="font-black text-rose-800 dark:text-rose-300">سبب الرفض</p>
                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{selectedTransfer.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedTransfer.issueNotes && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-black text-amber-800 dark:text-amber-300">ملاحظات الاستلام</p>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{selectedTransfer.issueNotes}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {getActionConfig(selectedTransfer.status, selectedTransferDirection, isBranchScoped).map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  loading={actionLoading === `${selectedTransfer._id}:${action.status}`}
                  onClick={() => updateTransferStatus(selectedTransfer, action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
