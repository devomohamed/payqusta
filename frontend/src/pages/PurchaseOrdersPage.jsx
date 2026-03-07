import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Check, X, Package, FileDown, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '../store';
import { Card, Button, Modal, Input, Select, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import Pagination from '../components/Pagination';

const STATUS_COLORS = {
  draft: 'gray',
  pending: 'warning',
  approved: 'info',
  partial: 'warning',
  received: 'success',
  cancelled: 'danger',
};

const STATUS_LABELS = {
  draft: 'مسودة',
  pending: 'قيد الاعتماد',
  approved: 'معتمد',
  partial: 'مستلم جزئي',
  received: 'مستلم بالكامل',
  cancelled: 'ملغي',
};

const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: 'نقدي (يُسدد فور الاستلام)' },
  { value: 'deferred', label: 'آجل (يُسجل كمستحق على المورد)' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهري' },
  { value: 'bimonthly', label: 'كل شهرين' },
  { value: 'custom', label: 'تواريخ مخصصة' },
];

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function normalizeBranches(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.branches)) return payload.branches;
  return [];
}

function parseSupplierPaymentType(supplier) {
  return supplier?.paymentTerms === 'cash' ? 'cash' : 'deferred';
}

function calcItemTotal(quantity, unitCost) {
  const q = Number(quantity || 0);
  const c = Number(unitCost || 0);
  return Math.max(0, q * c);
}

function parseCustomInstallmentDates(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];
  return rawValue
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [form, setForm] = useState({
    supplier: '',
    branch: '',
    paymentType: 'deferred',
    installments: 1,
    paymentFrequency: 'monthly',
    firstInstallmentDate: '',
    customInstallmentDatesText: '',
    items: [],
    notes: '',
    expectedDeliveryDate: '',
  });

  const totalAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0),
    [form.items]
  );

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    loadBranches();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, supplierFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, supplierFilter]);

  useEffect(() => {
    if (showCreateModal && !form.branch && branches.length > 0) {
      setForm((prev) => ({ ...prev, branch: branches[0]._id }));
    }
  }, [showCreateModal, form.branch, branches]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase-orders', {
        params: {
          page,
          limit: 8,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(supplierFilter ? { supplier: supplierFilter } : {}),
        },
      });

      setOrders(res.data?.data || []);
      setPagination(res.data?.pagination || { totalPages: 1, totalItems: 0 });
    } catch (_) {
      notify.error('فشل تحميل أوامر الشراء');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get('/suppliers', { params: { limit: 200 } });
      setSuppliers(res.data?.data || []);
    } catch (_) {
      setSuppliers([]);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 300 } });
      setProducts(normalizeProducts(res.data?.data));
    } catch (_) {
      setProducts([]);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches', { params: { limit: 200, isActive: true } });
      setBranches(normalizeBranches(res.data?.data));
    } catch (_) {
      setBranches([]);
    }
  };

  const handleOpenCreate = () => {
    if (!branches.length) {
      notify.warning('أضف فرعًا نشطًا أولاً قبل إنشاء أمر شراء');
      return;
    }

    setForm({
      supplier: '',
      branch: branches[0]?._id || '',
      paymentType: 'deferred',
      installments: 1,
      paymentFrequency: 'monthly',
      firstInstallmentDate: '',
      customInstallmentDatesText: '',
      items: [],
      notes: '',
      expectedDeliveryDate: '',
    });
    setShowCreateModal(true);
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    const paymentType = parseSupplierPaymentType(supplier);
    setForm((prev) => ({
      ...prev,
      supplier: supplierId,
      paymentType,
      installments: paymentType === 'deferred' ? Math.max(1, Number(prev.installments || 1)) : 1,
      paymentFrequency: paymentType === 'deferred' ? prev.paymentFrequency || 'monthly' : 'monthly',
      firstInstallmentDate: paymentType === 'deferred' ? prev.firstInstallmentDate : '',
      customInstallmentDatesText: paymentType === 'deferred' ? prev.customInstallmentDatesText : '',
    }));
  };

  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          quantity: 1,
          unitCost: 0,
          totalCost: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const nextItems = [...prev.items];
      const current = { ...nextItems[index] };
      current[field] = value;

      if (field === 'product') {
        const selectedProduct = products.find((product) => product._id === value);
        if (selectedProduct) {
          current.unitCost = Number(selectedProduct.cost || 0);
        }
      }

      if (field === 'quantity' || field === 'unitCost' || field === 'product') {
        current.totalCost = calcItemTotal(current.quantity, current.unitCost);
      }

      nextItems[index] = current;
      return { ...prev, items: nextItems };
    });
  };

  const handleCreateOrder = async () => {
    if (!form.supplier) return notify.warning('اختر المورد أولاً');
    if (form.items.length === 0) return notify.warning('أضف منتجات لأمر الشراء');

    if (!form.branch) return notify.warning('اختر الفرع أولاً');

    const cleanedItems = form.items
      .filter((item) => item.product && Number(item.quantity) > 0)
      .map((item) => ({
        product: item.product,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost || 0),
        totalCost: calcItemTotal(item.quantity, item.unitCost),
      }));

    if (cleanedItems.length === 0) {
      return notify.warning('أدخل بنود شراء صحيحة');
    }

    setSaving(true);
    try {
      await api.post('/purchase-orders', {
        supplier: form.supplier,
        branch: form.branch,
        paymentType: form.paymentType,
        installments: form.paymentType === 'deferred' ? Math.max(1, Number(form.installments || 1)) : 1,
        paymentFrequency: form.paymentType === 'deferred' ? (form.paymentFrequency || 'monthly') : undefined,
        firstInstallmentDate: form.paymentType === 'deferred' ? (form.firstInstallmentDate || undefined) : undefined,
        customInstallmentDates: form.paymentType === 'deferred' && form.paymentFrequency === 'custom'
          ? parseCustomInstallmentDates(form.customInstallmentDatesText)
          : undefined,
        items: cleanedItems,
        notes: form.notes,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      });

      notify.success('تم إنشاء أمر الشراء بنجاح');
      setShowCreateModal(false);
      loadOrders();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل إنشاء أمر الشراء');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.put(`/purchase-orders/${orderId}`, { status });
      notify.success('تم تحديث حالة أمر الشراء');
      loadOrders();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل تحديث الحالة');
    }
  };

  const handleOpenReceive = async (orderId) => {
    try {
      const res = await api.get(`/purchase-orders/${orderId}`);
      const order = res.data?.data;
      if (!order) return;

      const hydratedItems = (order.items || []).map((item) => ({
        ...item,
        currentReceipt: 0,
        batchNumber: '',
        expiryDate: '',
      }));

      setSelectedOrder({ ...order, items: hydratedItems });
      setShowReceiveModal(true);
    } catch (_) {
      notify.error('فشل تحميل تفاصيل أمر الشراء');
    }
  };

  const handleReceiveItemChange = (index, field, value) => {
    setSelectedOrder((prev) => {
      if (!prev) return prev;
      const nextItems = [...(prev.items || [])];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const handleConfirmReceive = async () => {
    if (!selectedOrder) return;

    const receivedItems = (selectedOrder.items || [])
      .filter((item) => Number(item.currentReceipt || 0) > 0)
      .map((item) => ({
        itemId: item._id,
        receivedQuantity: Number(item.currentReceipt || 0),
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
      }));

    if (receivedItems.length === 0) {
      return notify.warning('أدخل الكميات المستلمة أولاً');
    }

    setSaving(true);
    try {
      await api.post(`/purchase-orders/${selectedOrder._id}/receive`, {
        receivedItems,
        branchId: selectedOrder.branch?._id,
      });
      notify.success('تم الاستلام وتسجيل قيمة المشتريات على حساب المورد');
      setShowReceiveModal(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل الاستلام');
    } finally {
      setSaving(false);
    }
  };

  const getReceivedProgress = (order) => {
    const total = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const received = (order.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
    return { total, received };
  };

  const handleOpenPdf = async (orderId, orderNumber = '') => {
    try {
      const res = await api.get(`/purchase-orders/${orderId}/pdf`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const popup = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      if (!popup) {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = `PO-${orderNumber || orderId}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل فتح ملف أمر الشراء');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary-500" />
            نظام مشتريات الموردين
          </h1>
          <p className="text-gray-500 text-sm mt-1">إنشاء واعتماد واستلام أوامر الشراء مع تسجيل مالي تلقائي للمورد</p>
        </div>
        <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
          أمر شراء جديد
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="حالة الأمر"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'كل الحالات' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Select
            label="المورد"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            options={[
              { value: '', label: 'كل الموردين' },
              ...suppliers.map((supplier) => ({ value: supplier._id, label: supplier.name })),
            ]}
          />
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3 flex items-center gap-2 mt-6 md:mt-0">
            <Truck className="w-5 h-5 text-primary-500" />
            <p className="text-xs font-semibold text-primary-700">
              عند الاستلام يتم تحديث المخزون + تسجيل مشتريات المورد تلقائيًا
            </p>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد أوامر شراء"
          description="ابدأ بإنشاء أمر شراء جديد وربطه بالمورد"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-4 text-right">رقم الأمر</th>
                  <th className="p-4 text-right">الفرع</th>
                  <th className="p-4 text-right">المورد</th>
                  <th className="p-4 text-right">التاريخ</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">الاستلام</th>
                  <th className="p-4 text-right">المالي</th>
                  <th className="p-4 text-right">الإجمالي</th>
                  <th className="p-4 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map((order) => {
                  const progress = getReceivedProgress(order);
                  const canApprove = order.status === 'draft' || order.status === 'pending';
                  const canReceive = ['approved', 'pending', 'partial'].includes(order.status);
                  const canCancel = ['draft', 'pending', 'approved'].includes(order.status) && Number(order.receivedValue || 0) <= 0;

                  return (
                    <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono text-xs">{order.orderNumber}</td>
                      <td className="p-4 text-xs text-gray-500">{order.branch?.name || 'الفرع الرئيسي'}</td>
                      <td className="p-4 font-medium">{order.supplier?.name || '—'}</td>
                      <td className="p-4 text-xs text-gray-500">
                        {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: ar })}
                      </td>
                      <td className="p-4">
                        <Badge variant={STATUS_COLORS[order.status] || 'gray'}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs">
                        {progress.received}/{progress.total}
                      </td>
                      <td className="p-4 text-xs">
                        <p>{order.paymentType === 'cash' ? 'نقدي' : 'آجل'}</p>
                        <p className="text-gray-500">مستحق: {(Number(order.outstandingAmount || 0)).toFixed(2)}</p>
                      </td>
                      <td className="p-4 font-bold">{Number(order.totalAmount || 0).toFixed(2)} ج.م</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(order._id, 'approved')}
                              icon={<Check className="w-4 h-4" />}
                            >
                              اعتماد
                            </Button>
                          )}
                          {canReceive && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReceive(order._id)}
                              icon={<Package className="w-4 h-4" />}
                            >
                              استلام
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                              icon={<X className="w-4 h-4" />}
                            >
                              إلغاء
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPdf(order._id, order.orderNumber)}
                            icon={<FileDown className="w-4 h-4" />}
                            title="PDF"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="p-4">
              <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="أمر شراء جديد" size="lg">
        <div className="space-y-4">
          <Select
            label="المورد"
            value={form.supplier}
            onChange={(e) => handleSupplierChange(e.target.value)}
            options={[
              { value: '', label: 'اختر المورد' },
              ...suppliers.map((supplier) => ({ value: supplier._id, label: supplier.name })),
            ]}
          />

          <Select
            label="الفرع"
            value={form.branch}
            onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
            options={[
              { value: '', label: 'اختر الفرع' },
              ...branches.map((branch) => ({ value: branch._id, label: branch.name })),
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="طريقة السداد"
              value={form.paymentType}
              onChange={(e) => {
                const nextType = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  paymentType: nextType,
                  installments: nextType === 'deferred' ? Math.max(1, Number(prev.installments || 1)) : 1,
                  paymentFrequency: nextType === 'deferred' ? (prev.paymentFrequency || 'monthly') : 'monthly',
                  firstInstallmentDate: nextType === 'deferred' ? prev.firstInstallmentDate : '',
                  customInstallmentDatesText: nextType === 'deferred' ? prev.customInstallmentDatesText : '',
                }));
              }}
              options={PAYMENT_TYPE_OPTIONS}
            />

            {form.paymentType === 'deferred' ? (
              <Input
                label="عدد الأقساط"
                type="number"
                min="1"
                value={form.installments}
                onChange={(e) => setForm((prev) => ({ ...prev, installments: Math.max(1, Number(e.target.value || 1)) }))}
              />
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-700 mt-6">
                سيتم تسجيل المبلغ كمسدد فور الاستلام
              </div>
            )}
          </div>

          {form.paymentType === 'deferred' && (
            <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="تكرار الاستحقاق"
                  value={form.paymentFrequency}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentFrequency: e.target.value }))}
                  options={PAYMENT_FREQUENCY_OPTIONS}
                />
                <Input
                  label="تاريخ أول قسط"
                  type="date"
                  value={form.firstInstallmentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstInstallmentDate: e.target.value }))}
                />
                <div className="rounded-xl border border-primary-200 bg-white/80 p-3 text-xs text-primary-700 mt-6">
                  الأقساط تُنشأ تلقائيًا على فاتورة مشتريات المورد عند الاستلام.
                </div>
              </div>
              {form.paymentFrequency === 'custom' && (
                <div>
                  <label className="text-sm font-bold block mb-1">تواريخ الأقساط المخصصة</label>
                  <textarea
                    rows={3}
                    value={form.customInstallmentDatesText}
                    onChange={(e) => setForm((prev) => ({ ...prev, customInstallmentDatesText: e.target.value }))}
                    placeholder="مثال: 2026-03-10, 2026-03-20, 2026-03-30"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold">بنود أمر الشراء</label>
              <Button size="sm" variant="outline" onClick={handleAddItem} icon={<Plus className="w-4 h-4" />}>
                إضافة منتج
              </Button>
            </div>

            {form.items.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-500 text-center">
                أضف منتجًا واحدًا على الأقل
              </div>
            )}

            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    options={[
                      { value: '', label: 'اختر المنتج' },
                      ...products.map((product) => ({ value: product._id, label: product.name })),
                    ]}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="الكمية"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value || 0))}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="سعر الشراء"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value || 0))}
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Input value={Number(item.totalCost || 0).toFixed(2)} disabled />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Input
            label="ملاحظات"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <Input
            label="تاريخ التسليم المتوقع"
            type="date"
            value={form.expectedDeliveryDate}
            onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
          />

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-bold">الإجمالي:</span>
              <span className="text-2xl font-bold text-primary-500">{totalAmount.toFixed(2)} ج.م</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleCreateOrder} loading={saving}>إنشاء الأمر</Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowCreateModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showReceiveModal} onClose={() => setShowReceiveModal(false)} title="استلام بضاعة" size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-lg flex items-center gap-3">
              <Package className="w-8 h-8 text-primary-500" />
              <div>
                <h3 className="font-bold">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-500">
                  الفرع: {selectedOrder.branch?.name || 'الفرع الرئيسي'} • المورد: {selectedOrder.supplier?.name} • طريقة السداد: {selectedOrder.paymentType === 'cash' ? 'نقدي' : 'آجل'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              كل استلام يتم إضافته للمخزون ويُسجل مباشرة في حساب المورد.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="p-2 text-right">المنتج</th>
                    <th className="p-2 text-center text-xs text-gray-400">المطلوب</th>
                    <th className="p-2 text-center text-xs text-gray-400">مستلم سابقًا</th>
                    <th className="p-2 text-right">استلام الآن</th>
                    <th className="p-2 text-right">Batch</th>
                    <th className="p-2 text-right">الصلاحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {(selectedOrder.items || []).map((item, index) => {
                    const remaining = Number(item.quantity || 0) - Number(item.receivedQuantity || 0);
                    return (
                      <tr key={item._id}>
                        <td className="p-2 font-medium">{item.product?.name || 'منتج'}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center text-success-600 font-bold">{item.receivedQuantity}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="0"
                            max={Math.max(0, remaining)}
                            placeholder="الكمية"
                            value={item.currentReceipt || ''}
                            onChange={(e) => handleReceiveItemChange(index, 'currentReceipt', Number(e.target.value || 0))}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            placeholder="Batch #"
                            value={item.batchNumber || ''}
                            onChange={(e) => handleReceiveItemChange(index, 'batchNumber', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={(e) => handleReceiveItemChange(index, 'expiryDate', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleConfirmReceive} loading={saving} icon={<Check className="w-4 h-4" />}>
                تأكيد الاستلام
              </Button>
              <Button className="flex-1" variant="ghost" onClick={() => setShowReceiveModal(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
