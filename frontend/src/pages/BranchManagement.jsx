import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit,
  FileSearch,
  Globe,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
  User,
  Warehouse,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import toast from 'react-hot-toast';
import { api, useAuthStore } from '../store';
import { confirm } from '../components/ConfirmDialog';

const BRANCH_TYPE_OPTIONS = [
  { value: 'store', label: 'فرع بيع' },
  { value: 'warehouse', label: 'مخزن' },
  { value: 'fulfillment_center', label: 'مركز تنفيذ' },
  { value: 'hybrid', label: 'فرع هجين' },
];

const INITIAL_FORM = {
  tenantId: '',
  name: '',
  address: '',
  phone: '',
  cameras: [],
  branchType: 'store',
  participatesInOnlineOrders: false,
  isFulfillmentCenter: false,
  onlinePriority: 100,
  pickupEnabled: true,
  shippingOrigin: {
    governorate: '',
    city: '',
    area: '',
    addressLine: '',
    postalCode: '',
  },
  managerName: '',
  managerEmail: '',
  managerPhone: '',
  managerPassword: '',
};

function ToggleTile({ title, description, checked, onChange, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border p-4 text-right transition-all ${
        checked
          ? 'border-primary-400 bg-primary-50/80 dark:border-primary-500/50 dark:bg-primary-500/10'
          : 'border-[color:var(--surface-border)] app-surface-muted hover:border-primary-300 dark:hover:border-primary-500/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${checked ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'app-surface text-primary-500'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-text-strong text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs leading-6 app-text-muted">{description}</p>
            </div>
            <span
              className={`inline-flex h-6 min-w-11 items-center rounded-full px-1 transition-colors ${
                checked ? 'bg-primary-500 justify-end' : 'bg-slate-300/70 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SummaryCard({ title, value, caption, icon: Icon, tone = 'primary' }) {
  const toneClasses = {
    primary: 'from-primary-500 to-primary-600 shadow-primary-500/20',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
    cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/20',
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] app-text-muted">{title}</p>
          <p className="mt-3 text-3xl font-black app-text-strong">{value}</p>
          <p className="mt-2 text-sm app-text-muted">{caption}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${toneClasses[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function branchTypeLabel(branchType) {
  return BRANCH_TYPE_OPTIONS.find((option) => option.value === branchType)?.label || 'فرع';
}

function shippingOriginSummary(branch) {
  const parts = [
    branch.shippingOrigin?.governorate,
    branch.shippingOrigin?.city,
    branch.shippingOrigin?.area,
  ].filter(Boolean);
  return parts.join(' - ');
}

function buildBranchAuditTrailLink(branch) {
  const params = new URLSearchParams({
    resource: 'branch',
    resourceId: branch._id,
  });
  if (branch.name) {
    params.set('search', branch.name);
  }
  return `/admin/audit-logs?${params.toString()}`;
}

export default function BranchManagement() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin;

  const [branches, setBranches] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [branchesRes, tenantsRes] = await Promise.all([
        api.get('/branches', { params: { isActive: true, limit: 200 } }),
        isSuperAdmin ? api.get('/admin/tenants?limit=1000') : Promise.resolve({ data: { data: [] } }),
      ]);

      setBranches(branchesRes.data?.data?.branches || []);
      if (isSuperAdmin) {
        setTenants(tenantsRes.data?.data || []);
      }
    } catch (error) {
      toast.error('فشل تحميل بيانات الفروع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [isSuperAdmin]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingBranch(null);
  };

  const setShippingOriginField = (field, value) => {
    setForm((current) => ({
      ...current,
      shippingOrigin: {
        ...current.shippingOrigin,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      return toast.error('اسم الفرع مطلوب');
    }

    if (isSuperAdmin && !editingBranch && !form.tenantId) {
      return toast.error('يجب اختيار المتجر أولًا');
    }

    const validatePhone = (value) => /^01[0125][0-9]{8}$/.test(value);
    if (form.phone && !validatePhone(form.phone)) {
      return toast.error('رقم هاتف الفرع غير صالح');
    }

    if (form.managerName || form.managerEmail || form.managerPhone || form.managerPassword) {
      if (!form.managerName || !form.managerEmail || !form.managerPhone || (!editingBranch && !form.managerPassword)) {
        return toast.error('يرجى إدخال جميع بيانات مدير الفرع المطلوبة');
      }
      if (!validatePhone(form.managerPhone)) {
        return toast.error('رقم هاتف مدير الفرع غير صالح');
      }
    }

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        managerName: form.managerName.trim(),
        managerEmail: form.managerEmail.trim(),
        managerPhone: form.managerPhone.trim(),
        managerPassword: form.managerPassword,
        shippingOrigin: {
          governorate: form.shippingOrigin.governorate.trim(),
          city: form.shippingOrigin.city.trim(),
          area: form.shippingOrigin.area.trim(),
          addressLine: form.shippingOrigin.addressLine.trim(),
          postalCode: form.shippingOrigin.postalCode.trim(),
        },
      };

      if (editingBranch) {
        await api.put(`/branches/${editingBranch._id}`, payload);
        toast.success('تم تحديث الفرع بنجاح');
      } else {
        await api.post('/branches', payload);
        toast.success('تمت إضافة الفرع بنجاح');
      }

      await fetchBranches();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ الفرع');
    }
  };

  const handleDelete = async (branchId) => {
    const ok = await confirm.delete('هل أنت متأكد من حذف هذا الفرع؟');
    if (!ok) return;

    try {
      await api.delete(`/branches/${branchId}`);
      toast.success('تم حذف الفرع');
      await fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حذف الفرع');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setForm({
      tenantId: branch.tenant?._id || '',
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      cameras: branch.cameras || [],
      branchType: branch.branchType || 'store',
      participatesInOnlineOrders: !!branch.participatesInOnlineOrders,
      isFulfillmentCenter: !!branch.isFulfillmentCenter,
      onlinePriority: branch.onlinePriority || 100,
      pickupEnabled: branch.pickupEnabled ?? true,
      shippingOrigin: {
        governorate: branch.shippingOrigin?.governorate || '',
        city: branch.shippingOrigin?.city || '',
        area: branch.shippingOrigin?.area || '',
        addressLine: branch.shippingOrigin?.addressLine || '',
        postalCode: branch.shippingOrigin?.postalCode || '',
      },
      managerName: branch.manager?.name || '',
      managerEmail: branch.manager?.email || '',
      managerPhone: branch.manager?.phone || '',
      managerPassword: '',
    });
    setShowModal(true);
  };

  const filteredBranches = useMemo(() => branches.filter((branch) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      branch.name,
      branch.address,
      branch.phone,
      branch.tenant?.name,
      branch.manager?.name,
      shippingOriginSummary(branch),
    ].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedSearch));

    const matchesTenant = tenantFilter === 'all' || branch.tenant?._id === tenantFilter;
    return matchesSearch && matchesTenant;
  }), [branches, searchTerm, tenantFilter]);

  const summary = useMemo(() => ({
    total: filteredBranches.length,
    onlineEnabled: filteredBranches.filter((branch) => branch.participatesInOnlineOrders).length,
    fulfillmentCenters: filteredBranches.filter((branch) => branch.isFulfillmentCenter).length,
    pickupEnabled: filteredBranches.filter((branch) => branch.pickupEnabled).length,
  }), [filteredBranches]);

  const hasFilters = Boolean(searchTerm) || tenantFilter !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="info" className="w-fit">Branch Commerce Model</Badge>
          <div className="flex items-start gap-4">
            <div className="rounded-[1.6rem] bg-gradient-to-br from-primary-500 via-primary-600 to-cyan-500 p-4 text-white shadow-2xl shadow-primary-500/25">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black app-text-strong">إدارة الفروع</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 app-text-muted">
                اضبط هيكل الفرع، تشغيل الأونلاين، مركز التنفيذ، الاستلام من الفرع، ومصدر الشحن
                من شاشة واحدة واضحة لصاحب البراند.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <Link
            to="/admin/audit-logs?resource=branch"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--surface-border)] app-surface px-4 py-3 text-sm font-semibold app-text-body transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] lg:w-auto"
          >
            <FileSearch className="h-4 w-4 text-primary-500" />
            سجل تغييرات الفروع
          </Link>
          <Button
            size="lg"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="w-full lg:w-auto"
          >
            إضافة فرع جديد
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي الفروع" value={summary.total} caption="عدد الفروع المعروضة بعد الفلاتر الحالية" icon={Store} tone="primary" />
        <SummaryCard title="الأونلاين مفعل" value={summary.onlineEnabled} caption="فروع يمكن إدخالها في خصم طلبات الأونلاين لاحقًا" icon={Globe} tone="emerald" />
        <SummaryCard title="مراكز التنفيذ" value={summary.fulfillmentCenters} caption="فروع مناسبة للتنفيذ أو التجهيز والشحن" icon={PackageCheck} tone="amber" />
        <SummaryCard title="استلام من الفرع" value={summary.pickupEnabled} caption="فروع تسمح بخدمة الاستلام أو التسليم المحلي" icon={Truck} tone="cyan" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الفرع أو العنوان أو المدير أو مصدر الشحن..."
              className="pr-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 app-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isSuperAdmin && (
            <Select
              value={tenantFilter}
              onChange={(event) => setTenantFilter(event.target.value)}
              className="xl:w-72"
            >
              <option value="all">جميع المتاجر ({branches.length})</option>
              {tenants.map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 sm:p-8">
          <LoadingSpinner size="lg" text="جاري تحميل الفروع..." />
        </Card>
      ) : filteredBranches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={hasFilters ? 'لا توجد نتائج' : 'لا توجد فروع حتى الآن'}
          description={hasFilters
            ? 'جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر الحالية.'
            : 'ابدأ بإضافة أول فرع ثم فعّل إعدادات التشغيل التي تحتاجها للأونلاين والتنفيذ.'}
          action={hasFilters ? {
            label: 'إعادة ضبط الفلاتر',
            onClick: () => {
              setSearchTerm('');
              setTenantFilter('all');
            },
            variant: 'outline',
          } : {
            label: 'إضافة فرع',
            onClick: () => {
              resetForm();
              setShowModal(true);
            },
          }}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filteredBranches.map((branch) => (
            <Card key={branch._id} className="overflow-hidden border border-[color:var(--surface-border)]">
              <div className="border-b border-[color:var(--surface-border)] bg-gradient-to-br from-primary-50/70 via-transparent to-cyan-50/70 p-5 dark:from-primary-500/10 dark:to-cyan-500/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 p-3 text-white shadow-lg shadow-primary-500/20">
                      {branch.branchType === 'warehouse' ? <Warehouse className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black app-text-strong">{branch.name}</h3>
                        <Badge variant="gray">{branchTypeLabel(branch.branchType)}</Badge>
                      </div>
                      <p className="mt-2 text-sm app-text-muted">
                        {isSuperAdmin && branch.tenant ? `المتجر: ${branch.tenant.name}` : 'إعدادات تشغيل الفرع والتوفر التجاري'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      to={buildBranchAuditTrailLink(branch)}
                      className="rounded-xl p-2.5 app-surface-muted app-text-body transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                      aria-label="عرض سجل تدقيق الفرع"
                    >
                      <FileSearch className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEdit(branch)}
                      className="rounded-xl p-2.5 app-surface-muted app-text-body hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                      aria-label="تعديل الفرع"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(branch._id)}
                      className="rounded-xl p-2.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                      aria-label="حذف الفرع"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={branch.participatesInOnlineOrders ? 'success' : 'gray'}>
                    {branch.participatesInOnlineOrders ? 'يدخل في الأونلاين' : 'خارج خصم الأونلاين'}
                  </Badge>
                  <Badge variant={branch.isFulfillmentCenter ? 'warning' : 'gray'}>
                    {branch.isFulfillmentCenter ? 'مركز تنفيذ' : 'ليس مركز تنفيذ'}
                  </Badge>
                  <Badge variant={branch.pickupEnabled ? 'info' : 'gray'}>
                    {branch.pickupEnabled ? 'الاستلام متاح' : 'الاستلام غير متاح'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">أولوية الأونلاين</p>
                    <p className="mt-2 text-2xl font-black app-text-strong">#{branch.onlinePriority || 100}</p>
                  </div>
                  <div className="rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">الكاميرات</p>
                    <p className="mt-2 text-2xl font-black app-text-strong">{branch.cameras?.length || 0}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {branch.address && (
                    <div className="flex items-start gap-2 app-text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                      <span>{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 app-text-muted">
                      <Phone className="h-4 w-4 flex-shrink-0 text-primary-500" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.manager && (
                    <div className="flex items-center gap-2 app-text-muted">
                      <User className="h-4 w-4 flex-shrink-0 text-primary-500" />
                      <span>{branch.manager.name}</span>
                    </div>
                  )}
                  {shippingOriginSummary(branch) && (
                    <div className="flex items-center gap-2 app-text-muted">
                      <Truck className="h-4 w-4 flex-shrink-0 text-primary-500" />
                      <span>{shippingOriginSummary(branch)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
        size="xl"
        bodyClassName="space-y-6"
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">البيانات الأساسية</h3>
                <p className="mt-1 text-sm app-text-muted">اسم الفرع وبيانات التواصل والكيان التشغيلي له.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {isSuperAdmin && !editingBranch && (
                  <Select
                    label="المتجر"
                    value={form.tenantId}
                    onChange={(event) => setForm((current) => ({ ...current, tenantId: event.target.value }))}
                    className="md:col-span-2"
                  >
                    <option value="">اختر المتجر</option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name}
                      </option>
                    ))}
                  </Select>
                )}

                {isSuperAdmin && editingBranch?.tenant && (
                  <div className="md:col-span-2 rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">المتجر التابع له الفرع</p>
                    <p className="mt-2 text-sm font-bold app-text-strong">{editingBranch.tenant.name}</p>
                  </div>
                )}

                <Input
                  label="اسم الفرع"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="فرع القاهرة"
                />
                <Select
                  label="نوع الفرع"
                  value={form.branchType}
                  onChange={(event) => setForm((current) => ({ ...current, branchType: event.target.value }))}
                >
                  {BRANCH_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="رقم هاتف الفرع"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01234567890"
                />
                <Input
                  label="أولوية خصم الأونلاين"
                  type="number"
                  min="1"
                  max="9999"
                  value={form.onlinePriority}
                  onChange={(event) => setForm((current) => ({ ...current, onlinePriority: event.target.value }))}
                  placeholder="100"
                />
                <TextArea
                  label="عنوان الفرع"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="العنوان التفصيلي للفرع"
                  className="md:col-span-2"
                  rows={3}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">إعدادات التشغيل التجاري</h3>
                <p className="mt-1 text-sm app-text-muted">حدد هل يدخل الفرع في خصم طلبات الأونلاين وهل يعمل كمركز تنفيذ أو نقطة استلام.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ToggleTile
                  title="إدخال الفرع في طلبات الأونلاين"
                  description="عند التفعيل يمكن استخدام هذا الفرع لاحقًا داخل سياسة خصم طلبات المتجر الإلكتروني."
                  icon={Globe}
                  checked={form.participatesInOnlineOrders}
                  onChange={(value) => setForm((current) => ({ ...current, participatesInOnlineOrders: value }))}
                />
                <ToggleTile
                  title="اعتبار الفرع مركز تنفيذ"
                  description="فعّل هذا الخيار إذا كان الفرع مناسبًا للتجهيز أو التسليم أو اعتماد المخزون للأوردرات."
                  icon={PackageCheck}
                  checked={form.isFulfillmentCenter}
                  onChange={(value) => setForm((current) => ({ ...current, isFulfillmentCenter: value }))}
                />
                <ToggleTile
                  title="الاستلام من الفرع"
                  description="يفيد عند تقديم خدمة استلام الطلب من نفس الفرع أو تنسيقه مع الشحن المحلي."
                  icon={Store}
                  checked={form.pickupEnabled}
                  onChange={(value) => setForm((current) => ({ ...current, pickupEnabled: value }))}
                />
                <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] app-surface-muted p-4">
                  <p className="text-sm font-bold app-text-strong">ملاحظة تشغيلية</p>
                  <p className="mt-2 text-xs leading-6 app-text-muted">
                    أولوية الأونلاين الأقل رقمًا تعني أولوية أعلى لاحقًا عندما نربط سياسة خصم الطلبات بين أكثر من فرع.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">مصدر الشحن</h3>
                <p className="mt-1 text-sm app-text-muted">هذه البيانات ستساعد لاحقًا في ربط الشحن ومصدر تنفيذ الطلبات.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="المحافظة"
                  value={form.shippingOrigin.governorate}
                  onChange={(event) => setShippingOriginField('governorate', event.target.value)}
                  placeholder="القاهرة"
                />
                <Input
                  label="المدينة"
                  value={form.shippingOrigin.city}
                  onChange={(event) => setShippingOriginField('city', event.target.value)}
                  placeholder="مدينة نصر"
                />
                <Input
                  label="المنطقة"
                  value={form.shippingOrigin.area}
                  onChange={(event) => setShippingOriginField('area', event.target.value)}
                  placeholder="الحي السابع"
                />
                <Input
                  label="الرمز البريدي"
                  value={form.shippingOrigin.postalCode}
                  onChange={(event) => setShippingOriginField('postalCode', event.target.value)}
                  placeholder="11765"
                />
                <TextArea
                  label="سطر العنوان"
                  value={form.shippingOrigin.addressLine}
                  onChange={(event) => setShippingOriginField('addressLine', event.target.value)}
                  placeholder="التفاصيل التي تعتمد عليها شركات الشحن"
                  rows={3}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">مدير الفرع</h3>
                <p className="mt-1 text-sm app-text-muted">يمكنك إنشاء مدير جديد أو تحديث بيانات المدير الحالي من نفس الشاشة.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="اسم المدير"
                  value={form.managerName}
                  onChange={(event) => setForm((current) => ({ ...current, managerName: event.target.value }))}
                  placeholder="أحمد محمد"
                />
                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={form.managerEmail}
                  onChange={(event) => setForm((current) => ({ ...current, managerEmail: event.target.value }))}
                  placeholder="manager@brand.com"
                />
                <Input
                  label="رقم الهاتف"
                  value={form.managerPhone}
                  onChange={(event) => setForm((current) => ({ ...current, managerPhone: event.target.value }))}
                  placeholder="01012345678"
                />
                <Input
                  label="كلمة المرور"
                  type="password"
                  value={form.managerPassword}
                  onChange={(event) => setForm((current) => ({ ...current, managerPassword: event.target.value }))}
                  placeholder={editingBranch ? 'اتركها فارغة إذا لم ترد التغيير' : 'أدخل كلمة المرور'}
                />
              </div>
            </Card>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--surface-border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button onClick={handleSave}>{editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}</Button>
        </div>
      </Modal>
    </div>
  );
}
