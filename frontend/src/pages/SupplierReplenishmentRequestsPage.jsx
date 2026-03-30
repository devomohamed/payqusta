import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ClipboardList, Factory, Package, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierReplenishmentRequestsApi, useAuthStore } from '../store';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/UI';
import Pagination from '../components/Pagination';
import { notify } from '../components/AnimatedNotification';

const STATUS_META = {
  requested: { label: 'جديد', color: 'warning' },
  under_review: { label: 'قيد المراجعة', color: 'info' },
  approved: { label: 'موافق عليه', color: 'success' },
  rejected: { label: 'مرفوض', color: 'danger' },
  converted_to_purchase_order: { label: 'تم تحويله لأمر شراء', color: 'primary' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'requested', label: 'جديد' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'موافق عليه' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'converted_to_purchase_order', label: 'تم تحويله لأمر شراء' },
];

const SOURCE_LABELS = {
  branch_products: 'من المنتجات',
  branch_dashboard: 'من لوحة الفرع',
  low_stock_page: 'من صفحة النواقص',
  stock_transfers_page: 'من التحويلات',
  manual: 'يدوي',
};

function formatDate(value) {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleString('ar-EG');
}

export default function SupplierReplenishmentRequestsPage() {
  const navigate = useNavigate();
  const { user, tenant, can, getBranches } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [convertingId, setConvertingId] = useState('');
  const branchScopeId = String(user?.branch?._id || user?.branch || '');
  const isAdminLikeUser = user?.role === 'admin' || !!user?.isSuperAdmin;
  const canSwitchBranchView = !branchScopeId && (isAdminLikeUser || can('branches', 'read'));
  const canReviewRequests = can('supplier_replenishment_requests', 'update');
  const activeBranchId = branchScopeId || selectedBranchId || '';

  useEffect(() => {
    if (branchScopeId) setSelectedBranchId(branchScopeId);
  }, [branchScopeId]);

  useEffect(() => {
    getBranches?.()
      .then((rows) => setBranches(Array.isArray(rows) ? rows : []))
      .catch(() => setBranches([]));
  }, [getBranches]);

  const branchOptions = useMemo(() => {
    return [
      { _id: '', name: 'كل الفروع' },
      ...(Array.isArray(branches) ? branches.map((branch) => ({ _id: String(branch._id), name: branch.name })) : []),
    ];
  }, [branches]);

  const activeBranchLabel = useMemo(() => {
    const match = branchOptions.find((option) => String(option._id) === String(activeBranchId));
    return match?.name || 'كل الفروع';
  }, [activeBranchId, branchOptions]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierReplenishmentRequestsApi.getAll({
        page,
        limit: 12,
        ...(activeBranchId ? { branch: activeBranchId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setRequests(res?.data?.data || []);
      setPagination(res?.data?.pagination || { totalPages: 1, totalItems: 0 });
    } catch (_) {
      setRequests([]);
      setPagination({ totalPages: 1, totalItems: 0 });
      notify.error('فشل تحميل طلبات المورد');
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, page, statusFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setPage(1);
  }, [activeBranchId, statusFilter]);

  const stats = useMemo(() => {
    const acc = { total: requests.length, requested: 0, under_review: 0, approved: 0 };
    requests.forEach((request) => {
      if (acc[request.status] !== undefined) acc[request.status] += 1;
    });
    return acc;
  }, [requests]);

  const handleStatusUpdate = useCallback(async (requestId, nextStatus) => {
    setUpdatingId(requestId);
    try {
      await supplierReplenishmentRequestsApi.updateStatus(requestId, { status: nextStatus });
      notify.success('تم تحديث حالة طلب المورد');
      await loadRequests();
    } catch (error) {
      notify.error(error?.response?.data?.message || 'فشل تحديث حالة طلب المورد');
    } finally {
      setUpdatingId('');
    }
  }, [loadRequests]);

  const handleConvertToPurchaseOrder = useCallback(async (requestId) => {
    setConvertingId(requestId);
    try {
      const res = await supplierReplenishmentRequestsApi.convertToPurchaseOrder(requestId);
      const purchaseOrderId = res?.data?.data?.purchaseOrder?._id;
      const orderNumber = res?.data?.data?.purchaseOrder?.orderNumber;
      notify.success(orderNumber ? `تم إنشاء أمر شراء ${orderNumber}` : 'تم إنشاء أمر شراء مسودة');
      await loadRequests();
      if (purchaseOrderId && can('purchase_orders', 'read')) {
        navigate(`/purchase-orders?highlight=${purchaseOrderId}`);
      }
    } catch (error) {
      notify.error(error?.response?.data?.message || 'فشل تحويل الطلب إلى أمر شراء');
    } finally {
      setConvertingId('');
    }
  }, [can, loadRequests, navigate]);

  return (
    <div className="space-y-6 app-text-soft">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-slate-950 via-sky-800 to-cyan-700 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(8,145,178,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Factory className="h-3.5 w-3.5" />
              طلبات مورد الفروع
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">متابعة طلبات النقص من المورد</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              شاشة متابعة branch-scoped لطلبات المورد التي يرفعها الفرع عند انخفاض أو نفاد المخزون.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <div className="text-xs text-white/70">إجمالي الظاهر الآن</div>
              <div className="mt-2 text-2xl font-black">{stats.total.toLocaleString('ar-EG')}</div>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <div className="text-xs text-white/70">طلبات جديدة</div>
              <div className="mt-2 text-2xl font-black">{stats.requested.toLocaleString('ar-EG')}</div>
            </Card>
            <Card className="border-white/10 bg-white/10 text-white shadow-none">
              <div className="text-xs text-white/70">قيد المراجعة</div>
              <div className="mt-2 text-2xl font-black">{stats.under_review.toLocaleString('ar-EG')}</div>
            </Card>
          </div>
        </div>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-black app-text-strong">الفلاتر</h2>
            <p className="mt-1 text-sm app-text-soft">
              {activeBranchId ? `العرض الحالي للفرع: ${activeBranchLabel}` : 'العرض الحالي لكل الفروع المتاحة حسب صلاحيتك'}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {canSwitchBranchView && (
              <label className="flex min-w-[240px] flex-col gap-1.5 text-sm font-semibold app-text-soft">
                الفرع
                <select
                  value={selectedBranchId}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  className="app-input"
                >
                  {branchOptions.map((branch) => (
                    <option key={branch._id || 'all'} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex min-w-[220px] flex-col gap-1.5 text-sm font-semibold app-text-soft">
              الحالة
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="app-input"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              onClick={() => void loadRequests()}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              تحديث
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10">
          <LoadingSpinner text="جاري تحميل طلبات المورد..." />
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات مورد مطابقة"
          description="لم يتم العثور على طلبات في هذا النطاق بعد. أنشئ طلبًا من صفحة النواقص داخل الفرع."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {requests.map((request) => {
              const statusMeta = STATUS_META[request.status] || { label: request.status, color: 'gray' };
              const branchName = request.branch?.name || activeBranchLabel;
              return (
                <Card key={request._id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black app-text-strong">{request.product?.name || 'صنف غير متاح'}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm app-text-soft">
                        <span>SKU: {request.product?.sku || 'غير محدد'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{SOURCE_LABELS[request.source] || request.source || 'غير محدد'}</span>
                      </div>
                    </div>
                    <Badge variant={statusMeta.color}>{statusMeta.label}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <div className="text-xs app-text-soft">الكمية المطلوبة</div>
                      <div className="mt-1 text-xl font-black app-text-strong">{Number(request.requestedQty || 0).toLocaleString('ar-EG')}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <div className="text-xs app-text-soft">الكمية الحالية</div>
                      <div className="mt-1 text-xl font-black app-text-strong">{Number(request.currentQty || 0).toLocaleString('ar-EG')}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <div className="text-xs app-text-soft">الحد الأدنى</div>
                      <div className="mt-1 text-xl font-black app-text-strong">{Number(request.minQty || 0).toLocaleString('ar-EG')}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <Building2 className="mt-0.5 h-4 w-4 text-cyan-600" />
                      <div>
                        <div className="text-xs app-text-soft">الفرع</div>
                        <div className="mt-1 text-sm font-bold app-text-strong">{branchName}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <Factory className="mt-0.5 h-4 w-4 text-violet-600" />
                      <div>
                        <div className="text-xs app-text-soft">المورد</div>
                        <div className="mt-1 text-sm font-bold app-text-strong">{request.supplier?.name || 'غير محدد'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <Package className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="text-xs app-text-soft">أنشئ بواسطة</div>
                        <div className="mt-1 text-sm font-bold app-text-strong">{request.createdBy?.name || request.createdBy?.email || 'غير محدد'}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-gray-100/80 p-3 dark:border-white/10">
                      <ClipboardList className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div>
                        <div className="text-xs app-text-soft">تاريخ الإنشاء</div>
                        <div className="mt-1 text-sm font-bold app-text-strong">{formatDate(request.createdAt)}</div>
                      </div>
                    </div>
                  </div>

                  {request.notes ? (
                    <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm app-text-soft dark:bg-white/5">
                      <span className="font-black app-text-strong">ملاحظات:</span> {request.notes}
                    </div>
                  ) : null}

                  {canReviewRequests && ['requested', 'under_review'].includes(request.status) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === 'requested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={updatingId === request._id}
                          onClick={() => void handleStatusUpdate(request._id, 'under_review')}
                        >
                          بدء المراجعة
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="success"
                        loading={updatingId === request._id}
                        onClick={() => void handleStatusUpdate(request._id, 'approved')}
                      >
                        اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={updatingId === request._id}
                        onClick={() => void handleStatusUpdate(request._id, 'rejected')}
                      >
                        رفض
                      </Button>
                    </div>
                  ) : null}

                  {canReviewRequests && request.status === 'approved' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={convertingId === request._id}
                        onClick={() => void handleConvertToPurchaseOrder(request._id)}
                      >
                        تحويل إلى أمر شراء
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems || requests.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
