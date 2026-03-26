import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function getBranchTypeOptions(t) {
  return [
    { value: 'store', label: t('branch_management.ui.kirgwf4') },
    { value: 'warehouse', label: t('branch_management.ui.ktei71') },
    { value: 'fulfillment_center', label: t('branch_management.ui.klm4yiu') },
    { value: 'hybrid', label: t('branch_management.ui.kde497s') },
  ];
}

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
  managerId: '',
  managerName: '',
  managerEmail: '',
  managerPhone: '',
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

function branchTypeLabel(branchType, branchTypeOptions, t) {
  return branchTypeOptions.find((option) => option.value === branchType)?.label || t('branch_management.toasts.ky2ax');
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
  const { t } = useTranslation('admin');
  const { user } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin;
  const branchTypeOptions = useMemo(() => getBranchTypeOptions(t), [t]);

  const [branches, setBranches] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [availableManagers, setAvailableManagers] = useState([]);
  const [managerSelectionMode, setManagerSelectionMode] = useState('none'); // 'none', 'existing', 'new'

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [branchesRes, tenantsRes, usersRes] = await Promise.all([
        api.get('/branches', { params: { isActive: true, limit: 200 } }),
        isSuperAdmin ? api.get('/admin/tenants?limit=1000') : Promise.resolve({ data: { data: [] } }),
        api.get('/auth/users', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
      ]);

      setBranches(branchesRes.data?.data?.branches || []);
      if (isSuperAdmin) {
        setTenants(tenantsRes.data?.data || []);
      }
      setAvailableManagers(usersRes.data?.data || []);
    } catch (error) {
      toast.error(t('branch_management.toasts.k6h9rg9'));
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
    setManagerSelectionMode('none');
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
      return toast.error(t('branch_management.toasts.kax06lz'));
    }

    if (isSuperAdmin && !editingBranch && !form.tenantId) {
      return toast.error(t('branch_management.toasts.klphaev'));
    }

    const validatePhone = (value) => /^01[0125][0-9]{8}$/.test(value);
    if (form.phone && !validatePhone(form.phone)) {
      return toast.error(t('branch_management.toasts.krtvokr'));
    }

    if (managerSelectionMode === 'new') {
      if (!form.managerName || !form.managerEmail || !form.managerPhone) {
        return toast.error(t('branch_management.toasts.kwqol4'));
      }
      if (!validatePhone(form.managerPhone)) {
        return toast.error(t('branch_management.toasts.k5nshuo'));
      }
    } else if (managerSelectionMode === 'existing') {
      if (!form.managerId) {
        return toast.error(t('branch_management.toasts.kbg3x2g'));
      }
    }

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        managerId: managerSelectionMode === 'existing' ? form.managerId : (managerSelectionMode === 'none' ? '' : undefined),
        managerName: managerSelectionMode === 'new' ? form.managerName.trim() : undefined,
        managerEmail: managerSelectionMode === 'new' ? form.managerEmail.trim() : undefined,
        managerPhone: managerSelectionMode === 'new' ? form.managerPhone.trim() : undefined,
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
        toast.success(t('branch_management.toasts.k79ky94'));
      } else {
        await api.post('/branches', payload);
        toast.success(t('branch_management.toasts.kgq038t'));
      }

      await fetchBranches();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || t('branch_management.toasts.kqksr5h'));
    }
  };

  const handleDelete = async (branchId) => {
    const ok = await confirm.delete(t('branch_management.ui.kc25dxg'));
    if (!ok) return;

    try {
      await api.delete(`/branches/${branchId}`);
      toast.success(t('branch_management.toasts.kivi8rp'));
      await fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || t('branch_management.toasts.khex0pm'));
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
      managerId: branch.manager?._id || '',
      managerName: branch.manager?.name || '',
      managerEmail: branch.manager?.email || '',
      managerPhone: branch.manager?.phone || '',
    });
    if (branch.manager) {
      setManagerSelectionMode('existing');
    } else {
      setManagerSelectionMode('none');
    }
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
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-cyan-700 via-primary-700 to-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(8,145,178,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Building2 className="h-3.5 w-3.5" />
              Branch Commerce Model
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-[1.6rem] bg-white/10 p-4 text-white shadow-2xl backdrop-blur-sm">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">{t('branch_management.ui.kjff1ih')}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">
                  {t('branch_management.ui.ksbr4u')}
                  {t('branch_management.ui.kc4h4r5')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
            <Link
              to="/admin/audit-logs?resource=branch"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 lg:w-auto"
            >
              <FileSearch className="h-4 w-4 text-white" />
              {t('branch_management.ui.ksb2z5d')}
            </Link>
            <Button
              size="lg"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="w-full bg-white text-primary-700 hover:bg-white/90 lg:w-auto"
            >
              {t('branch_management.ui.k5zjh6n')}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t('branch_management.titles.kfgn6z3')} value={summary.total} caption="عدد الفروع المعروضة بعد الفلاتر الحالية" icon={Store} tone="primary" />
        <SummaryCard title={t('branch_management.titles.kz6ps2k')} value={summary.onlineEnabled} caption="فروع يمكن إدخالها في خصم طلبات الأونلاين لاحقًا" icon={Globe} tone="emerald" />
        <SummaryCard title={t('branch_management.titles.kinqlu0')} value={summary.fulfillmentCenters} caption="فروع مناسبة للتنفيذ أو التجهيز والشحن" icon={PackageCheck} tone="amber" />
        <SummaryCard title={t('branch_management.titles.kjo7sfd')} value={summary.pickupEnabled} caption="فروع تسمح بخدمة الاستلام أو التسليم المحلي" icon={Truck} tone="cyan" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-black app-text-strong">{t('branch_management.ui.kex4i93')}</p>
          <p className="mt-1 text-xs app-text-muted">{t('branch_management.ui.k26u2hs')}</p>
        </div>
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('branch_management.placeholders.kb92qqs')}
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
          title={hasFilters ? t('branch_management.ui.kkcniav') : 'لا توجد فروع حتى الآن'}
          description={hasFilters
            ? t('branch_management.ui.kem54nq') : 'ابدأ بإضافة أول فرع ثم فعّل إعدادات التشغيل التي تحتاجها للأونلاين والتنفيذ.'}
          action={hasFilters ? {
            label: t('branch_management.ui.kr8yv4w'),
            onClick: () => {
              setSearchTerm('');
              setTenantFilter('all');
            },
            variant: 'outline',
          } : {
            label: t('branch_management.ui.km2iaqh'),
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
                        <Badge variant="gray">{branchTypeLabel(branch.branchType, branchTypeOptions, t)}</Badge>
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
                      aria-label={t('branch_management.form.kv18jiu')}
                    >
                      <FileSearch className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEdit(branch)}
                      className="rounded-xl p-2.5 app-surface-muted app-text-body hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                      aria-label={t('branch_management.form.k2zzome')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(branch._id)}
                      className="rounded-xl p-2.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                      aria-label={t('branch_management.form.kdbi6c6')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={branch.participatesInOnlineOrders ? 'success' : 'gray'}>
                    {branch.participatesInOnlineOrders ? t('branch_management.ui.khehmi9') : 'خارج خصم الأونلاين'}
                  </Badge>
                  <Badge variant={branch.isFulfillmentCenter ? 'warning' : 'gray'}>
                    {branch.isFulfillmentCenter ? t('branch_management.ui.klm4yiu') : 'ليس مركز تنفيذ'}
                  </Badge>
                  <Badge variant={branch.pickupEnabled ? 'info' : 'gray'}>
                    {branch.pickupEnabled ? t('branch_management.ui.k15nppm') : 'الاستلام غير متاح'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">{t('branch_management.ui.k618thx')}</p>
                    <p className="mt-2 text-2xl font-black app-text-strong">#{branch.onlinePriority || 100}</p>
                  </div>
                  <div className="rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">{t('branch_management.ui.kb870ku')}</p>
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
        title={editingBranch ? t('branch_management.ui.k2zzome') : 'إضافة فرع جديد'}
        size="xl"
        bodyClassName="space-y-6"
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('branch_management.ui.kl8rjwp')}</h3>
                <p className="mt-1 text-sm app-text-muted">{t('branch_management.ui.k1870xb')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {isSuperAdmin && !editingBranch && (
                  <Select
                    label={t('branch_management.form.kaaxfw9')}
                    value={form.tenantId}
                    onChange={(event) => setForm((current) => ({ ...current, tenantId: event.target.value }))}
                    className="md:col-span-2"
                  >
                    <option value="">{t('branch_management.ui.kfeejax')}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name}
                      </option>
                    ))}
                  </Select>
                )}

                {isSuperAdmin && editingBranch?.tenant && (
                  <div className="md:col-span-2 rounded-2xl app-surface-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">{t('branch_management.ui.kmxvid1')}</p>
                    <p className="mt-2 text-sm font-bold app-text-strong">{editingBranch.tenant.name}</p>
                  </div>
                )}

                <Input
                  label={t('branch_management.form.kr36akl')}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('branch_management.placeholders.khv84fu')}
                />
                <Select
                  label={t('branch_management.form.kqsujj7')}
                  value={form.branchType}
                  onChange={(event) => setForm((current) => ({ ...current, branchType: event.target.value }))}
                >
                  {branchTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('branch_management.form.kff8ylr')}
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01234567890"
                />
                <Input
                  label={t('branch_management.form.kx5s0o9')}
                  type="number"
                  min="1"
                  max="9999"
                  value={form.onlinePriority}
                  onChange={(event) => setForm((current) => ({ ...current, onlinePriority: event.target.value }))}
                  placeholder="100"
                />
                <TextArea
                  label={t('branch_management.form.k9t8aze')}
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder={t('branch_management.placeholders.k21nqdh')}
                  className="md:col-span-2"
                  rows={3}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('branch_management.ui.knmg2xg')}</h3>
                <p className="mt-1 text-sm app-text-muted">{t('branch_management.ui.ks2hj04')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ToggleTile
                  title={t('branch_management.titles.ksjv5p9')}
                  description="عند التفعيل يمكن استخدام هذا الفرع لاحقًا داخل سياسة خصم طلبات المتجر الإلكتروني."
                  icon={Globe}
                  checked={form.participatesInOnlineOrders}
                  onChange={(value) => setForm((current) => ({ ...current, participatesInOnlineOrders: value }))}
                />
                <ToggleTile
                  title={t('branch_management.titles.kze0eu8')}
                  description="فعّل هذا الخيار إذا كان الفرع مناسبًا للتجهيز أو التسليم أو اعتماد المخزون للأوردرات."
                  icon={PackageCheck}
                  checked={form.isFulfillmentCenter}
                  onChange={(value) => setForm((current) => ({ ...current, isFulfillmentCenter: value }))}
                />
                <ToggleTile
                  title={t('branch_management.titles.k8cdcz8')}
                  description="يفيد عند تقديم خدمة استلام الطلب من نفس الفرع أو تنسيقه مع الشحن المحلي."
                  icon={Store}
                  checked={form.pickupEnabled}
                  onChange={(value) => setForm((current) => ({ ...current, pickupEnabled: value }))}
                />
                <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] app-surface-muted p-4">
                  <p className="text-sm font-bold app-text-strong">{t('branch_management.ui.k8msrkx')}</p>
                  <p className="mt-2 text-xs leading-6 app-text-muted">
                    {t('branch_management.ui.k3kmzd0')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('branch_management.ui.kl68plu')}</h3>
                <p className="mt-1 text-sm app-text-muted">{t('branch_management.ui.k93huxx')}</p>
              </div>

              <div className="space-y-4">
                <Input
                  label={t('branch_management.form.kseg3bk')}
                  value={form.shippingOrigin.governorate}
                  onChange={(event) => setShippingOriginField('governorate', event.target.value)}
                  placeholder={t('branch_management.placeholders.kzc16df')}
                />
                <Input
                  label={t('branch_management.form.kza8lyy')}
                  value={form.shippingOrigin.city}
                  onChange={(event) => setShippingOriginField('city', event.target.value)}
                  placeholder={t('branch_management.placeholders.kp0bo2j')}
                />
                <Input
                  label={t('branch_management.form.kz9ubgg')}
                  value={form.shippingOrigin.area}
                  onChange={(event) => setShippingOriginField('area', event.target.value)}
                  placeholder={t('branch_management.placeholders.k6jh26g')}
                />
                <Input
                  label={t('branch_management.form.k5t65xc')}
                  value={form.shippingOrigin.postalCode}
                  onChange={(event) => setShippingOriginField('postalCode', event.target.value)}
                  placeholder="11765"
                />
                <TextArea
                  label={t('branch_management.form.klkpx9y')}
                  value={form.shippingOrigin.addressLine}
                  onChange={(event) => setShippingOriginField('addressLine', event.target.value)}
                  placeholder={t('branch_management.placeholders.kpg82hq')}
                  rows={3}
                />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('branch_management.ui.kfosuxv')}</h3>
                <p className="mt-1 text-sm app-text-muted">{t('branch_management.ui.kwf4t7q')}</p>
              </div>

              <div className="mb-6 flex overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-black/[0.02] p-1 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setManagerSelectionMode('none')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    managerSelectionMode === 'none'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {t('branch_management.ui.k8c9lpo')}
                </button>
                <button
                  type="button"
                  onClick={() => setManagerSelectionMode('existing')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    managerSelectionMode === 'existing'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {t('branch_management.ui.k4t5841')}
                </button>
                <button
                  type="button"
                  onClick={() => setManagerSelectionMode('new')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    managerSelectionMode === 'new'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {t('branch_management.ui.kd8s60n')}
                </button>
              </div>

              {managerSelectionMode === 'existing' && (
                <div className="space-y-4 animate-fade-in">
                  <Select
                    label={t('branch_management.form.kfeenq8')}
                    value={form.managerId}
                    onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
                  >
                    <option value="">-- اختر مدير --</option>
                    {availableManagers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} {m.email ? `(${m.email})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {managerSelectionMode === 'new' && (
                <div className="space-y-4 animate-fade-in">
                  <Input
                    label={t('branch_management.form.kcmuzvv')}
                    value={form.managerName}
                    onChange={(event) => setForm((current) => ({ ...current, managerName: event.target.value }))}
                    placeholder={t('branch_management.placeholders.kpsrhs2')}
                  />
                  <Input
                    label={t('branch_management.form.k8lvosz')}
                    type="email"
                    value={form.managerEmail}
                    onChange={(event) => setForm((current) => ({ ...current, managerEmail: event.target.value }))}
                    placeholder="manager@brand.com"
                  />
                  <Input
                    label={t('branch_management.form.k3pahhc')}
                    value={form.managerPhone}
                    onChange={(event) => setForm((current) => ({ ...current, managerPhone: event.target.value }))}
                    placeholder="01012345678"
                  />
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--surface-border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t('branch_management.ui.cancel')}</Button>
          <Button onClick={handleSave}>{editingBranch ? t('branch_management.ui.km6ld24') : 'إضافة الفرع'}</Button>
        </div>
      </Modal>
    </div>
  );
}
