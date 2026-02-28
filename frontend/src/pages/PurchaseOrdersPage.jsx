import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Eye, Check, X, Package } from 'lucide-react';
import { api } from '../store';
import { Card, Button, Modal, Input, Select, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  partial: 'مستلم جزئياً',
  received: 'مستلم',
  cancelled: 'ملغي',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const [form, setForm] = useState({
    supplier: '',
    items: [],
    notes: '',
    expectedDeliveryDate: '',
  });

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, [page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/purchase-orders?page=${page}&limit=8`);
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      notify.error('فشل تحميل أوامر الشراء');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get('/suppliers?limit=100');
      setSuppliers(res.data.data);
    } catch (err) { }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data.data);
    } catch (err) { }
  };

  const handleOpenCreate = () => {
    setForm({ supplier: '', items: [], notes: '', expectedDeliveryDate: '' });
    setShowModal(true);
  };

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { product: '', quantity: 1, unitCost: 0, totalCost: 0 }],
    });
  };

  const handleItemChange = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;

    if (field === 'product') {
      const product = products.find(p => p._id === value);
      if (product) {
        items[index].unitCost = product.cost || 0;
        items[index].totalCost = items[index].quantity * items[index].unitCost;
      }
    }

    if (field === 'quantity' || field === 'unitCost') {
      items[index].totalCost = items[index].quantity * items[index].unitCost;
    }

    setForm({ ...form, items });
  };

  const handleRemoveItem = (index) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!form.supplier) return notify.warning('اختر المورد');
    if (form.items.length === 0) return notify.warning('أضف منتجات');

    try {
      await api.post('/purchase-orders', form);
      notify.success('تم إنشاء أمر الشراء');
      setShowModal(false);
      loadOrders();
    } catch (err) {
      notify.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleOpenReceive = (order) => {
    setSelectedOrder(order);
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    try {
      const receivedItems = selectedOrder.items.map(item => ({
        itemId: item._id,
        receivedQuantity: item.quantity,
      }));

      await api.post(`/purchase-orders/${selectedOrder._id}/receive`, { receivedItems });
      notify.success('تم استلام أمر الشراء وتحديث المخزون');
      setShowReceiveModal(false);
      loadOrders();
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل الاستلام');
    }
  };

  const totalAmount = form.items.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary-500" />
            أوامر الشراء
          </h1>
          <p className="text-gray-500 text-sm mt-1">إدارة طلبات الشراء من الموردين</p>
        </div>
        <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
          أمر شراء جديد
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="لا توجد أوامر شراء"
          description="ابدأ بإنشاء أمر شراء جديد من الموردين"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-4 text-right">رقم الأمر</th>
                  <th className="p-4 text-right">المورد</th>
                  <th className="p-4 text-right">التاريخ</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">المبلغ</th>
                  <th className="p-4 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 font-mono text-xs">{order.orderNumber}</td>
                    <td className="p-4">{order.supplier?.name}</td>
                    <td className="p-4 text-xs text-gray-400">
                      {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: ar })}
                    </td>
                    <td className="p-4">
                      <Badge variant={STATUS_COLORS[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="p-4 font-bold">{order.totalAmount.toFixed(2)} ج.م</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {(order.status === 'approved' || order.status === 'partial') && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenReceive(order)}
                            icon={<Check className="w-4 h-4" />}
                          >
                            استلام
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`${api.defaults.baseURL}/purchase-orders/${order._id}/pdf`, '_blank')}
                          icon={<Package className="w-4 h-4" />}
                          title="تحميل PDF"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="أمر شراء جديد" size="lg">
        <div className="space-y-4">
          <Select
            label="المورد"
            value={form.supplier}
            onChange={e => setForm({ ...form, supplier: e.target.value })}
            options={[
              { value: '', label: 'اختر المورد' },
              ...suppliers.map(s => ({ value: s._id, label: s.name })),
            ]}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold">المنتجات</label>
              <Button size="sm" variant="outline" onClick={handleAddItem} icon={<Plus className="w-4 h-4" />}>
                إضافة منتج
              </Button>
            </div>

            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-5">
                  <Select
                    value={item.product}
                    onChange={e => handleItemChange(index, 'product', e.target.value)}
                    options={[
                      { value: '', label: 'اختر المنتج' },
                      ...products.map(p => ({ value: p._id, label: p.name })),
                    ]}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="الكمية"
                    value={item.quantity}
                    onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="السعر"
                    value={item.unitCost}
                    onChange={e => handleItemChange(index, 'unitCost', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input value={item.totalCost.toFixed(2)} disabled />
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />

          <Input
            label="تاريخ التسليم المتوقع"
            type="date"
            value={form.expectedDeliveryDate}
            onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
          />

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-bold">الإجمالي:</span>
              <span className="text-2xl font-bold text-primary-500">{totalAmount.toFixed(2)} ج.م</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSave}>إنشاء الأمر</Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Receive Modal */}
      <Modal open={showReceiveModal} onClose={() => setShowReceiveModal(false)} title="استلام بضاعة" size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-lg flex items-center gap-3">
              <Package className="w-8 h-8 text-primary-500" />
              <div>
                <h3 className="font-bold">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-gray-500">{selectedOrder.supplier?.name}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="p-2 text-right">المنتج</th>
                    <th className="p-2 text-center text-xs text-gray-400">المطلوب</th>
                    <th className="p-2 text-center text-xs text-gray-400">تم استلامه</th>
                    <th className="p-2 text-right">الكمية الحالية</th>
                    <th className="p-2 text-right">رقم الدفعة</th>
                    <th className="p-2 text-right">الصلاحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={item._id} className="border-b dark:border-gray-800 last:border-0">
                      <td className="p-2 font-medium">{item.product?.name || 'منتج'}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-center text-success-600 font-bold">{item.receivedQuantity}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          size="sm"
                          min="0"
                          max={item.quantity - item.receivedQuantity}
                          placeholder="الكمية"
                          onChange={(e) => {
                            const newItems = [...selectedOrder.items];
                            newItems[idx].currentReceipt = Number(e.target.value);
                            setSelectedOrder({ ...selectedOrder, items: newItems });
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          size="sm"
                          placeholder="Batch #"
                          onChange={(e) => {
                            const newItems = [...selectedOrder.items];
                            newItems[idx].batchNumber = e.target.value;
                            setSelectedOrder({ ...selectedOrder, items: newItems });
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          size="sm"
                          onChange={(e) => {
                            const newItems = [...selectedOrder.items];
                            newItems[idx].expiryDate = e.target.value;
                            setSelectedOrder({ ...selectedOrder, items: newItems });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1"
                onClick={async () => {
                  const receiptData = selectedOrder.items
                    .filter(item => item.currentReceipt > 0)
                    .map(item => ({
                      itemId: item._id,
                      receivedQuantity: item.currentReceipt,
                      batchNumber: item.batchNumber,
                      expiryDate: item.expiryDate
                    }));

                  if (receiptData.length === 0) return notify.warning('أدخل الكميات المستلمة أولاً');

                  try {
                    await api.post(`/purchase-orders/${selectedOrder._id}/receive`, { receivedItems: receiptData });
                    notify.success('تم تحديث المخزون واستلام البضاعة');
                    setShowReceiveModal(false);
                    loadOrders();
                  } catch (err) {
                    notify.error(err.response?.data?.message || 'فشل الاستلام');
                  }
                }}
                icon={<Check className="w-4 h-4" />}
              >
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
