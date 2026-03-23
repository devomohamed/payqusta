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
  const visibleOrderValue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    [orders]
  );
  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => ['draft', 'pending', 'approved', 'partial'].includes(order.status)).length,
    [orders]
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
      const res = await api.get(`/purchase-orders/${orderId}`);
      const order = res.data?.data;
      if (!order) return notify.error('فشل تحميل بيانات الأمر');

      const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });
      const statusLabel = STATUS_LABELS[order.status] || order.status;
      const payLabel = order.paymentType === 'cash' ? 'نقدي' : 'آجل';
      const dateStr = new Date(order.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const deliveryStr = order.expectedDeliveryDate
        ? new Date(order.expectedDeliveryDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

      const itemsRows = (order.items || []).map((item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faff'}">
          <td style="padding:10px 14px;font-weight:600;color:#1e293b">${item.product?.name || '—'}</td>
          <td style="padding:10px 14px;color:#64748b;font-family:monospace;font-size:12px">${item.product?.sku || '—'}</td>
          <td style="padding:10px 14px;text-align:center;font-weight:700">${item.quantity || 0}</td>
          <td style="padding:10px 14px;text-align:center;color:#16a34a;font-weight:700">${item.receivedQuantity || 0}</td>
          <td style="padding:10px 14px;text-align:center;color:#f59e0b;font-weight:700">${Number(item.quantity || 0) - Number(item.receivedQuantity || 0)}</td>
          <td style="padding:10px 14px;text-align:center">${fmt(item.unitCost)}</td>
          <td style="padding:10px 14px;text-align:center;font-weight:700;color:#2563eb">${fmt(item.totalCost)}</td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>أمر شراء - ${order.orderNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',Arial,sans-serif;background:#f1f5f9;color:#1e293b;direction:rtl;font-size:14px}
    .page{background:#fff;max-width:800px;margin:20px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,.12)}
    .header{background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:36px 40px;display:flex;justify-content:space-between;align-items:center}
    .brand-name{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px}
    .brand-sub{font-size:12px;color:#93c5fd;margin-top:4px}
    .po-badge{background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);border-radius:12px;padding:10px 20px;text-align:center}
    .po-badge-label{font-size:10px;color:#93c5fd;font-weight:600;text-transform:uppercase;letter-spacing:1px}
    .po-badge-number{font-size:18px;font-weight:900;color:#fff;margin-top:2px;font-family:monospace}
    .status-pill{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-top:6px;
      background:${order.status === 'received' ? '#dcfce7' : order.status === 'partial' ? '#fef3c7' : order.status === 'cancelled' ? '#fee2e2' : '#dbeafe'};
      color:${order.status === 'received' ? '#15803d' : order.status === 'partial' ? '#92400e' : order.status === 'cancelled' ? '#b91c1c' : '#1d4ed8'}}
    .body{padding:32px 40px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .info-card{background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:20px}
    .info-card-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
    .info-card-title::before{content:'';display:inline-block;width:3px;height:14px;background:#2563eb;border-radius:2px}
    .info-row{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px dashed #e2e8f0}
    .info-row:last-child{border-bottom:none}
    .info-label{font-size:12px;color:#64748b}
    .info-value{font-size:13px;font-weight:700;color:#1e293b;text-align:left}
    .supplier-name{font-size:18px;font-weight:900;color:#1e293b;margin-bottom:6px}
    .supplier-meta{font-size:12px;color:#64748b;line-height:1.7}
    .table-section{padding:0 40px 32px}
    table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
    thead tr{background:linear-gradient(135deg,#1e3a5f,#2563eb)}
    th{padding:12px 14px;color:#fff;font-size:12px;font-weight:700;text-align:center}
    th:first-child{text-align:right}
    th:nth-child(2){text-align:right}
    td{border-bottom:1px solid #f1f5f9;font-size:13px}
    .totals{padding:0 40px 32px;display:flex;justify-content:flex-end}
    .totals-card{background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;width:280px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
    .total-row.main{border-top:2px solid #2563eb;margin-top:8px;padding-top:14px;font-size:16px;font-weight:900;color:#2563eb}
    .notes-section{padding:0 40px 24px}
    .notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px}
    .notes-title{font-size:11px;font-weight:700;color:#92400e;margin-bottom:8px}
    .notes-text{font-size:13px;color:#78350f;line-height:1.7}
    .footer{background:#f8faff;border-top:1px solid #e2e8f0;padding:16px 40px;display:flex;justify-content:space-between;align-items:center}
    .footer-text{font-size:11px;color:#94a3b8}
    .footer-brand{font-size:12px;font-weight:700;color:#2563eb}
    @media print{
      body{background:#fff}
      .page{box-shadow:none;border-radius:0;margin:0;max-width:100%}
      .no-print{display:none}
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-name">${order.tenant?.name || 'PayQusta Store'}</div>
        <div class="brand-sub">نظام إدارة المشتريات والموردين</div>
      </div>
      <div class="po-badge">
        <div class="po-badge-label">Purchase Order</div>
        <div class="po-badge-number">${order.orderNumber}</div>
        <div class="status-pill">${statusLabel}</div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="body">
      <div class="info-card">
        <div class="info-card-title">بيانات المورد</div>
        <div class="supplier-name">${order.supplier?.name || '—'}</div>
        <div class="supplier-meta">
          ${order.supplier?.phone ? `📞 ${order.supplier.phone}<br/>` : ''}
          ${order.supplier?.email ? `✉️ ${order.supplier.email}<br/>` : ''}
          ${order.supplier?.contactPerson ? `👤 ${order.supplier.contactPerson}` : ''}
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-title">تفاصيل الأمر</div>
        <div class="info-row"><span class="info-label">رقم الأمر</span><span class="info-value" style="font-family:monospace">${order.orderNumber}</span></div>
        <div class="info-row"><span class="info-label">التاريخ</span><span class="info-value">${dateStr}</span></div>
        <div class="info-row"><span class="info-label">الفرع</span><span class="info-value">${order.branch?.name || 'الفرع الرئيسي'}</span></div>
        <div class="info-row"><span class="info-label">طريقة السداد</span><span class="info-value">${payLabel}</span></div>
        ${order.paymentType === 'deferred' ? `<div class="info-row"><span class="info-label">عدد الأقساط</span><span class="info-value">${order.installments || 1}</span></div>` : ''}
        <div class="info-row"><span class="info-label">تاريخ التسليم</span><span class="info-value">${deliveryStr}</span></div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th style="text-align:right;width:30%">المنتج</th>
            <th style="text-align:right;width:12%">الكود</th>
            <th>الكمية</th>
            <th>المستلَم</th>
            <th>المتبقي</th>
            <th>سعر الوحدة (ج.م)</th>
            <th>الإجمالي (ج.م)</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-card">
        <div class="total-row"><span>إجمالي الطلب</span><span>${fmt(order.totalAmount)} ج.م</span></div>
        <div class="total-row"><span>قيمة المستلَم</span><span style="color:#16a34a">${fmt(order.receivedValue)} ج.م</span></div>
        <div class="total-row"><span>المبلغ المسدَّد</span><span style="color:#16a34a">${fmt(order.paidAmount)} ج.م</span></div>
        <div class="total-row main"><span>المتبقي (مستحق)</span><span>${fmt(order.outstandingAmount)} ج.م</span></div>
      </div>
    </div>

    ${order.notes ? `
    <!-- Notes -->
    <div class="notes-section">
      <div class="notes-box">
        <div class="notes-title">📝 ملاحظات</div>
        <div class="notes-text">${order.notes}</div>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">طُبع بتاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
      <div class="footer-brand">Powered by PayQusta ⚡</div>
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

      const win = window.open('', '_blank', 'width=860,height=900');
      if (!win) return notify.warning('يرجى السماح للنوافذ المنبثقة في المتصفح');
      win.document.write(html);
      win.document.close();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل فتح ملف أمر الشراء');
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-primary-700 via-sky-700 to-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(37,99,235,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <ShoppingCart className="h-3.5 w-3.5" />
              دورة شراء الموردين
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">نظام مشتريات الموردين</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              أنشئ واعتمد واستلم أوامر الشراء من واجهة أوضح على الهاتف مع قراءة أسرع للحالة والتكلفة والاستلام.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">الأوامر الظاهرة</p>
              <p className="mt-2 text-2xl font-black">{pagination.totalItems.toLocaleString('ar-EG')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">تحتاج متابعة</p>
              <p className="mt-2 text-2xl font-black">{pendingOrdersCount.toLocaleString('ar-EG')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">القيمة الظاهرة</p>
              <p className="mt-2 text-lg font-black">{visibleOrderValue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />} className="justify-center bg-white text-primary-700 hover:bg-white/90">
            أمر شراء جديد
          </Button>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
            <Truck className="h-4 w-4" />
            الاستلام يحدّث المخزون ويربط القيمة بالمورد تلقائيًا
          </div>
        </div>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-black text-gray-900 dark:text-white">فلاتر أوامر الشراء</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">حدّد الحالة أو المورد للوصول الأسرع للطلبات المفتوحة.</p>
        </div>
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
          <div className="space-y-4 p-4 md:hidden">
            {orders.map((order) => {
              const progress = getReceivedProgress(order);
              const canApprove = order.status === 'draft' || order.status === 'pending';
              const canReceive = ['approved', 'pending', 'partial'].includes(order.status);
              const canCancel = ['draft', 'pending', 'approved'].includes(order.status) && Number(order.receivedValue || 0) <= 0;

              return (
                <div key={order._id} className="app-surface-muted rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-gray-500">{order.orderNumber}</p>
                      <p className="mt-1 text-sm font-black text-gray-900 dark:text-white">{order.supplier?.name || '—'}</p>
                      <p className="mt-1 text-[11px] text-gray-400">{order.branch?.name || 'الفرع الرئيسي'} · {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: ar })}</p>
                    </div>
                    <Badge variant={STATUS_COLORS[order.status] || 'gray'}>
                      {STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white px-2 py-2 text-center dark:bg-gray-900/70">
                      <p className="text-[10px] text-gray-400">الاستلام</p>
                      <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{progress.received}/{progress.total}</p>
                    </div>
                    <div className="rounded-xl bg-white px-2 py-2 text-center dark:bg-gray-900/70">
                      <p className="text-[10px] text-gray-400">السداد</p>
                      <p className="mt-1 text-xs font-black text-primary-600">{order.paymentType === 'cash' ? 'نقدي' : 'آجل'}</p>
                    </div>
                    <div className="rounded-xl bg-white px-2 py-2 text-center dark:bg-gray-900/70">
                      <p className="text-[10px] text-gray-400">الإجمالي</p>
                      <p className="mt-1 text-xs font-black text-emerald-600">{Number(order.totalAmount || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">مستحق: {Number(order.outstandingAmount || 0).toFixed(2)} ج.م</p>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
