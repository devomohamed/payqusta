import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Crown, RefreshCw, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../store';
import { Badge, Button, Card, Input, LoadingSpinner, Modal, Select, TextArea } from '../components/UI';

const DEFAULT_FORM = {
  name: '',
  description: '',
  price: 0,
  currency: 'EGP',
  billingCycle: 'monthly',
  stripeProductId: '',
  stripePriceId: '',
  paymobIntegrationId: '',
  isPopular: false,
  isActive: true,
  featuresText: '',
  maxProducts: 50,
  maxCustomers: 100,
  maxUsers: 3,
  maxBranches: 1,
  storageLimitMB: 1024,
};

function planToForm(plan) {
  return {
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'EGP',
    billingCycle: plan?.billingCycle || 'monthly',
    stripeProductId: plan?.stripeProductId || '',
    stripePriceId: plan?.stripePriceId || '',
    paymobIntegrationId: plan?.paymobIntegrationId || '',
    isPopular: !!plan?.isPopular,
    isActive: plan?.isActive !== false,
    featuresText: Array.isArray(plan?.features) ? plan.features.join(', ') : '',
    maxProducts: plan?.limits?.maxProducts ?? 50,
    maxCustomers: plan?.limits?.maxCustomers ?? 100,
    maxUsers: plan?.limits?.maxUsers ?? 3,
    maxBranches: plan?.limits?.maxBranches ?? 1,
    storageLimitMB: plan?.limits?.storageLimitMB ?? 1024,
  };
}

function formToPayload(form) {
  const features = (form.featuresText || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    name: form.name.trim(),
    description: form.description?.trim() || '',
    price: Number(form.price) || 0,
    currency: form.currency,
    billingCycle: form.billingCycle,
    stripeProductId: form.stripeProductId?.trim() || null,
    stripePriceId: form.stripePriceId?.trim() || null,
    paymobIntegrationId: form.paymobIntegrationId?.trim() || null,
    isPopular: !!form.isPopular,
    isActive: !!form.isActive,
    features,

    limits: {
      maxProducts: Number(form.maxProducts) || 0,
      maxCustomers: Number(form.maxCustomers) || 0,
      maxUsers: Number(form.maxUsers) || 0,
      maxBranches: Number(form.maxBranches) || 0,
      storageLimitMB: Number(form.storageLimitMB) || 0,
    },
  };
}

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  // Payment Methods State
  const [payments, setPayments] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [savingPayments, setSavingPayments] = useState(false);

  const activeCount = useMemo(() => plans.filter((p) => p.isActive).length, [plans]);

  const loadAllData = async () => {
    setLoading(true);
    setLoadingPayments(true);
    try {
      const [plansRes, paymentsRes] = await Promise.all([
        superAdminApi.getPlans(),
        superAdminApi.getPaymentMethods().catch(() => ({ data: { data: null } }))
      ]);
      setPlans(plansRes.data?.data || []);
      setPayments(paymentsRes.data?.data?.payments || null);
    } catch (err) {
      toast.error('فشل تحميل بعض البيانات');
    } finally {
      setLoading(false);
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('اسم الباقة مطلوب');
      return;
    }

    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editingPlan?._id) {
        await superAdminApi.updatePlan(editingPlan._id, payload);
        toast.success('تم تحديث الباقة');
      } else {
        await superAdminApi.createPlan(payload);
        toast.success('تم إنشاء الباقة');
      }
      setIsModalOpen(false);
      await loadAllData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل حفظ الباقة');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (plan) => {
    if (!window.confirm(`هل تريد إيقاف الباقة "${plan.name}"؟`)) return;
    try {
      await superAdminApi.deletePlan(plan._id);
      toast.success('تم إيقاف الباقة');
      await loadAllData();
    } catch (err) {
      toast.error('فشل إيقاف الباقة');
    }
  };

  const handleSavePayments = async () => {
    setSavingPayments(true);
    try {
      await superAdminApi.updatePaymentMethods({ payments });
      toast.success('تم حفظ إعدادات بوابات الدفع');
    } catch (error) {
      toast.error('فشل حفظ إعدادات الدفع');
    } finally {
      setSavingPayments(false);
    }
  };

  const handlePaymentChange = (gateway, field, value) => {
    setPayments((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value
      }
    }));
  };

  if (loading && !plans.length) return <LoadingSpinner text="جاري تحميل الباقات..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Plans Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">إدارة الباقات والأسعار</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إجمالي الباقات: {plans.length} | النشطة: {activeCount}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" icon={<RefreshCw className="w-4 h-4" />} onClick={loadAllData}>
            تحديث
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            باقة جديدة
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="text-right text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">الفوترة</th>
              <th className="px-4 py-3">الحدود</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">الأكشن</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan._id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <div className="font-bold">{plan.name}</div>
                  <div className="text-xs text-gray-500">{plan.description || '-'}</div>
                  {plan.isPopular && <Badge className="mt-1">الأكثر شيوعًا</Badge>}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {(plan.price || 0).toLocaleString('ar-EG')} {plan.currency || 'EGP'}
                </td>
                <td className="px-4 py-3">{plan.billingCycle === 'yearly' ? 'سنوي' : 'شهري'}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                  منتجات: {plan?.limits?.maxProducts ?? 0} | عملاء: {plan?.limits?.maxCustomers ?? 0}
                  <br />
                  مستخدمين: {plan?.limits?.maxUsers ?? 0} | فروع: {plan?.limits?.maxBranches ?? 0}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={plan.isActive ? 'success' : 'gray'}>
                    {plan.isActive ? 'نشطة' : 'متوقفة'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(plan)}>
                      تعديل
                    </Button>
                    {plan.isActive && (
                      <Button size="sm" variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDisable(plan)}>
                        إيقاف
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Payment Methods Settings Section */}
      <div className="flex items-center gap-3 mt-10 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">إعدادات بوابات الدفع للحسابات</h2>
          <p className="text-sm text-gray-500">قم بتفعيل وضبط بيانات حساباتك التي سيدفع عليها العملاء (أصحاب المتاجر)</p>
        </div>
      </div>

      <Card className="p-6">
        {loadingPayments || !payments ? (
          <div className="flex justify-center p-4"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-6">

            {/* InstaPay */}
            <div className="p-4 border rounded-xl dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500 dark:bg-gray-700"
                    checked={payments.instapay?.enabled}
                    onChange={(e) => handlePaymentChange('instapay', 'enabled', e.target.checked)}
                  />
                  <h3 className="font-bold text-lg text-blue-800 dark:text-blue-400">إنستاباي (InstaPay)</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="عنوان الدفع (IPA) أو رقم الموبايل"
                  value={payments.instapay?.account || ''}
                  onChange={(e) => handlePaymentChange('instapay', 'account', e.target.value)}
                  placeholder="name@instapay"
                />
                <Input
                  label="اسم الطريقة المعروض للعميل"
                  value={payments.instapay?.label || ''}
                  onChange={(e) => handlePaymentChange('instapay', 'label', e.target.value)}
                  placeholder="InstaPay"
                />
              </div>
            </div>

            {/* Vodafone Cash */}
            <div className="p-4 border rounded-xl dark:border-gray-700 bg-red-50/20 dark:bg-gray-800/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-red-600 rounded bg-gray-100 border-gray-300 focus:ring-red-500 dark:bg-gray-700"
                    checked={payments.vodafone_cash?.enabled}
                    onChange={(e) => handlePaymentChange('vodafone_cash', 'enabled', e.target.checked)}
                  />
                  <h3 className="font-bold text-lg text-red-600 dark:text-red-400">فودافون كاش</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="رقم المحفظة (فودافون كاش)"
                  value={payments.vodafone_cash?.number || ''}
                  onChange={(e) => handlePaymentChange('vodafone_cash', 'number', e.target.value)}
                  placeholder="010XXXXXXXX"
                />
                <Input
                  label="اسم الطريقة المعروض للعميل"
                  value={payments.vodafone_cash?.label || ''}
                  onChange={(e) => handlePaymentChange('vodafone_cash', 'label', e.target.value)}
                  placeholder="Vodafone Cash"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSavePayments} loading={savingPayments} icon={<Save className="w-4 h-4" />}>
                حفظ إعدادات الدفع
              </Button>
            </div>
          </div>
        )}
      </Card>


      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'تعديل الباقة' : 'إنشاء باقة جديدة'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="اسم الباقة" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input
              label="السعر"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            />
            <Select
              label="العملة"
              value={form.currency}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
              options={[
                { label: 'EGP', value: 'EGP' },
                { label: 'USD', value: 'USD' },
                { label: 'SAR', value: 'SAR' },
              ]}
            />
            <Select
              label="دورة الفوترة"
              value={form.billingCycle}
              onChange={(e) => setForm((s) => ({ ...s, billingCycle: e.target.value }))}
              options={[
                { label: 'شهري', value: 'monthly' },
                { label: 'سنوي', value: 'yearly' },
              ]}
            />
          </div>

          <TextArea
            label="الوصف"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          />

          <Input
            label="المزايا (مفصولة بفاصلة)"
            value={form.featuresText}
            onChange={(e) => setForm((s) => ({ ...s, featuresText: e.target.value }))}
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Input label="Max Products" type="number" value={form.maxProducts} onChange={(e) => setForm((s) => ({ ...s, maxProducts: e.target.value }))} />
            <Input label="Max Customers" type="number" value={form.maxCustomers} onChange={(e) => setForm((s) => ({ ...s, maxCustomers: e.target.value }))} />
            <Input label="Max Users" type="number" value={form.maxUsers} onChange={(e) => setForm((s) => ({ ...s, maxUsers: e.target.value }))} />
            <Input label="Max Branches" type="number" value={form.maxBranches} onChange={(e) => setForm((s) => ({ ...s, maxBranches: e.target.value }))} />
            <Input label="Storage MB" type="number" value={form.storageLimitMB} onChange={(e) => setForm((s) => ({ ...s, storageLimitMB: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Stripe Product ID" value={form.stripeProductId} onChange={(e) => setForm((s) => ({ ...s, stripeProductId: e.target.value }))} />
            <Input label="Stripe Price ID" value={form.stripePriceId} onChange={(e) => setForm((s) => ({ ...s, stripePriceId: e.target.value }))} />
            <Input label="Paymob Integration ID" value={form.paymobIntegrationId} onChange={(e) => setForm((s) => ({ ...s, paymobIntegrationId: e.target.value }))} />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm((s) => ({ ...s, isPopular: e.target.checked }))} />
              باقة شائعة
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} />
              نشطة
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              {editingPlan ? 'حفظ التعديلات' : 'إنشاء الباقة'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
