import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle,
  Edit2,
  FileSearch,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { adminApi, api, useAuthStore } from '../store';
import { notify } from '../components/AnimatedNotification';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
} from '../components/UI';
import Pagination from '../components/Pagination';

const LIMIT = 8;

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  invitationChannel: 'auto',
  role: 'vendor',
  customRole: '',
  branch: '',
  primaryBranch: '',
  assignedBranches: [],
  branchAccessMode: 'all_branches',
  tenantId: '',
  isActive: true,
};

const STANDARD_ROLE_OPTIONS = [
  { value: 'admin', label: 'مدير البراند' },
  { value: 'vendor', label: 'موظف مبيعات' },
  { value: 'coordinator', label: 'منسق' },
  { value: 'cashier', label: 'كاشير' },
  { value: 'supplier', label: 'مورد' },
];

const BRANCH_SCOPE_OPTIONS = [
  { value: 'all_branches', label: 'جميع الفروع' },
  { value: 'assigned_branches', label: 'فروع محددة' },
  { value: 'single_branch', label: 'فرع واحد' },
];

function SummaryCard({ title, value, caption, icon: Icon, tone = 'primary' }) {
  const tones = {
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
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function getRoleBadgeVariant(userItem) {
  if (userItem.role === 'admin') return 'warning';
  if (userItem.customRole) return 'info';
  if (userItem.role === 'vendor') return 'primary';
  return 'gray';
}

function getRoleLabel(userItem) {
  return userItem.customRole?.name
    || STANDARD_ROLE_OPTIONS.find((option) => option.value === userItem.role)?.label
    || userItem.role;
}

function getBranchScopeLabel(userItem) {
  if (!userItem.branchAccessMode) return 'غير محدد';
  if (userItem.branchAccessMode === 'all_branches') return 'جميع الفروع';
  if (userItem.branchAccessMode === 'assigned_branches') {
    return `فروع محددة (${userItem.assignedBranches?.length || 0})`;
  }
  return 'فرع واحد';
}

function buildAuditTrailLink(userItem) {
  const params = new URLSearchParams({
    resource: 'user',
    resourceId: userItem._id,
  });
  if (userItem.email) {
    params.set('search', userItem.email);
  } else if (userItem.name) {
    params.set('search', userItem.name);
  }
  return `/admin/audit-logs?${params.toString()}`;
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin;

  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (tenantFilter) params.tenant = tenantFilter;

      const res = await adminApi.getUsers(params);
      setUsers(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.pages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch (error) {
      toast.error('تعذر تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, tenantFilter]);

  const loadTenants = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await adminApi.getTenants({ limit: 1000 });
      setTenants(res.data.data || []);
    } catch (error) {
      console.error('Failed to load tenants', error);
    }
  };

  const loadBranches = async () => {
    if (isSuperAdmin) return;
    try {
      const res = await useAuthStore.getState().getBranches();
      setBranches(res || []);
    } catch (error) {
      console.error('Failed to load branches', error);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data || []);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadRoles();
    if (isSuperAdmin) {
      loadTenants();
    } else {
      loadBranches();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, tenantFilter]);

  const summary = useMemo(() => ({
    total: pagination.total,
    active: users.filter((item) => item.isActive).length,
    customRoles: users.filter((item) => item.customRole).length,
    scopedUsers: users.filter((item) => item.branchAccessMode && item.branchAccessMode !== 'all_branches').length,
  }), [pagination.total, users]);

  const openAdd = () => {
    setEditId(null);
    setForm({
      ...INITIAL_FORM,
      tenantId: isSuperAdmin ? '' : user?.tenant?._id || '',
    });
    setShowModal(true);
  };

  const openEdit = (userItem) => {
    setEditId(userItem._id);
    setForm({
      name: userItem.name || '',
      email: userItem.email || '',
      phone: userItem.phone || '',
      invitationChannel: userItem.phone && userItem.email ? 'auto' : userItem.phone ? 'sms' : 'email',
      role: userItem.role || 'vendor',
      customRole: userItem.customRole?._id || '',
      branch: userItem.branch?._id || '',
      primaryBranch: userItem.primaryBranch?._id || userItem.branch?._id || '',
      assignedBranches: (userItem.assignedBranches || []).map((branchItem) => branchItem._id || branchItem),
      branchAccessMode: userItem.branchAccessMode || (userItem.primaryBranch || userItem.branch ? 'single_branch' : 'all_branches'),
      tenantId: userItem.tenant?._id || '',
      isActive: userItem.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleAssignedBranchesChange = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setForm((current) => ({ ...current, assignedBranches: values }));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(INITIAL_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      return toast.error('الاسم والبريد الإلكتروني مطلوبان');
    }

    if (!editId && isSuperAdmin && !form.tenantId) {
      return toast.error('أكمل الحقول الأساسية قبل الحفظ');
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        customRole: form.customRole || null,
        branch: form.primaryBranch || form.branch || null,
        primaryBranch: form.primaryBranch || form.branch || null,
        assignedBranches: form.assignedBranches || [],
        branchAccessMode: form.branchAccessMode,
        isActive: form.isActive,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (editId) {
        await adminApi.updateUser(editId, payload);
        toast.success('تم تحديث المستخدم بنجاح');
      } else {
        await adminApi.createUser({
          ...payload,
          tenantId: isSuperAdmin ? form.tenantId : user?.tenant?._id,
          invitationChannel: form.invitationChannel,
        });
        toast.success('تم إنشاء المستخدم بنجاح');
      }

      closeModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ المستخدم');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      return toast.error('Name and email are required');
    }

    if (!editId && isSuperAdmin && !form.tenantId) {
      return toast.error('Select a tenant before creating the user');
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        customRole: form.customRole || null,
        branch: form.primaryBranch || form.branch || null,
        primaryBranch: form.primaryBranch || form.branch || null,
        assignedBranches: form.assignedBranches || [],
        branchAccessMode: form.branchAccessMode,
        isActive: form.isActive,
      };

      if (editId) {
        await adminApi.updateUser(editId, payload);
        toast.success('User updated successfully');
      } else {
        await adminApi.createUser({
          ...payload,
          tenantId: isSuperAdmin ? form.tenantId : user?.tenant?._id,
          invitationChannel: form.invitationChannel || 'auto',
        });
        toast.success('User created and invitation sent');
      }

      closeModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    notify.custom({
      type: 'error',
      title: 'تأكيد الحذف أو التعطيل',
      message: 'هل تريد تعطيل حساب المستخدم فقط (مؤقتاً) أم حذفه نهائياً من النظام؟',
      duration: 10000,
      action: {
        label: 'حذف نهائي',
        onClick: async () => {
          try {
            await adminApi.deleteUser(userId, { hardDelete: true });
            notify.success('تم حذف المستخدم نهائياً', 'تم الحفظ');
            load();
          } catch (error) {
            notify.error(error.response?.data?.message || 'تعذر حذف المستخدم', 'حدث خطأ');
          }
        },
      },
      secondaryAction: {
        label: 'تعطيل فقط',
        onClick: async () => {
          try {
            await adminApi.deleteUser(userId);
            notify.success('تم تعطيل المستخدم بنجاح', 'تم الحفظ');
            load();
          } catch (error) {
            notify.error(error.response?.data?.message || 'تعذر تعطيل المستخدم', 'حدث خطأ');
          }
        },
      },
    });
  };

  const renderBranchScopeFields = () => {
    if (isSuperAdmin) return null;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold app-text-strong">نطاق الفروع</label>
          <select
            value={form.branchAccessMode}
            onChange={(event) => setForm((current) => ({ ...current, branchAccessMode: event.target.value }))}
            className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            {BRANCH_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold app-text-strong">الفرع الرئيسي</label>
          <select
            value={form.primaryBranch}
            onChange={(event) => setForm((current) => ({
              ...current,
              primaryBranch: event.target.value,
              branch: event.target.value,
            }))}
            className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">اختر الفرع الرئيسي</option>
            {branches.map((branchItem) => (
              <option key={branchItem._id} value={branchItem._id}>
                {branchItem.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-bold app-text-strong">الفروع المسموح بها</label>
          <select
            multiple
            value={form.assignedBranches}
            onChange={handleAssignedBranchesChange}
            className="app-surface min-h-[130px] w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            {branches.map((branchItem) => (
              <option key={branchItem._id} value={branchItem._id}>
                {branchItem.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs app-text-muted">استخدم Ctrl أو Command لاختيار أكثر من فرع.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 app-text-soft">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(5,150,105,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Users className="h-3.5 w-3.5" />
              Employee Access Control
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-[1.6rem] bg-white/10 p-4 text-white shadow-2xl backdrop-blur-sm">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">إدارة الموظفين والصلاحيات</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">
                  أدر الأدوار المخصصة، نطاق الفروع، وتاريخ التعديلات من شاشة واحدة أوضح وأكثر راحة على الهاتف.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[560px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">إجمالي المستخدمين</p>
              <p className="mt-2 text-2xl font-black">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">الحسابات النشطة</p>
              <p className="mt-2 text-2xl font-black">{summary.active}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">أدوار مخصصة</p>
              <p className="mt-2 text-2xl font-black">{summary.customRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">نطاق فرعي</p>
              <p className="mt-2 text-2xl font-black">{summary.scopedUsers}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <Link
            to="/admin/audit-logs?resource=user"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 lg:w-auto"
          >
            <FileSearch className="h-4 w-4 text-white" />
            سجل تعديلات الموظفين
          </Link>
          <Button onClick={openAdd} size="lg" icon={<Plus className="h-4 w-4" />} className="w-full bg-white text-emerald-700 hover:bg-white/90 lg:w-auto">
            إضافة مستخدم جديد
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي المستخدمين" value={summary.total} caption="بعد الفلاتر الحالية" icon={Users} tone="primary" />
        <SummaryCard title="الحسابات النشطة" value={summary.active} caption="يمكنها تسجيل الدخول حاليًا" icon={CheckCircle} tone="emerald" />
        <SummaryCard title="أدوار مخصصة" value={summary.customRoles} caption="حسابات مرتبطة بدور تفصيلي" icon={Shield} tone="amber" />
        <SummaryCard title="نطاق فرعي" value={summary.scopedUsers} caption="حسابات ليست على جميع الفروع" icon={Building2} tone="cyan" />
      </div>

      <Card className="app-surface-muted p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-black app-text-strong">البحث والتصفية</p>
          <p className="mt-1 text-xs app-text-muted">ابحث بالاسم أو البريد أو الهاتف، وفلتر حسب الدور أو المتجر للوصول الأسرع للحسابات.</p>
        </div>
        <div className={`grid gap-4 ${isSuperAdmin ? 'lg:grid-cols-[1.4fr_repeat(2,minmax(0,0.8fr))]' : 'lg:grid-cols-[1.6fr_0.9fr]'}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو البريد الإلكتروني أو الهاتف..."
              className="pr-10"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="app-surface rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">كل الأدوار</option>
            {STANDARD_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isSuperAdmin && (
            <select
              value={tenantFilter}
              onChange={(event) => setTenantFilter(event.target.value)}
              className="app-surface rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">كل المتاجر</option>
              {tenants.map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="p-8">
          <LoadingSpinner size="lg" text="جاري تحميل المستخدمين..." />
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا توجد حسابات مطابقة"
          description="جرّب توسيع الفلاتر أو ابدأ بإضافة مستخدم جديد."
          action={{ label: 'إضافة مستخدم', onClick: openAdd }}
        />
      ) : (
        <Card className="overflow-hidden rounded-[1.75rem]">
          <div className="space-y-3 p-4 md:hidden">
            {users.map((userItem) => (
              <div key={userItem._id} className="app-surface-muted rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                    {userItem.name?.charAt(0) || 'م'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black app-text-strong">{userItem.name}</p>
                      <Badge variant={getRoleBadgeVariant(userItem)}>{getRoleLabel(userItem)}</Badge>
                      <Badge variant={userItem.isActive ? 'success' : 'danger'}>{userItem.isActive ? 'نشط' : 'معطل'}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] app-text-muted">{userItem.email}</p>
                    {userItem.phone ? <p className="mt-1 text-[11px] app-text-muted">{userItem.phone}</p> : null}
                    <p className="mt-2 text-[11px] app-text-muted">
                      {isSuperAdmin
                        ? (userItem.tenant?.name || 'مدير نظام')
                        : (userItem.primaryBranch?.name || userItem.branch?.name || 'بدون ربط فرعي')}
                    </p>
                    {!isSuperAdmin ? <p className="mt-1 text-[11px] app-text-muted">{getBranchScopeLabel(userItem)}</p> : null}
                    <p className="mt-1 text-[11px] app-text-muted">{format(new Date(userItem.createdAt), 'dd MMM yyyy', { locale: ar })}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={buildAuditTrailLink(userItem)}
                    className="inline-flex items-center justify-center rounded-xl p-2.5 app-surface app-text-body transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                    title="عرض سجل التدقيق"
                  >
                    <FileSearch className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(userItem)}
                    className="rounded-xl p-2.5 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                    title="تعديل"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {userItem.role !== 'admin' && userItem.isActive && (
                    <button
                      type="button"
                      onClick={() => handleDelete(userItem._id)}
                      className="rounded-xl p-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="تعطيل"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="app-surface-muted border-b border-black/5 dark:border-white/10">
                  <th className="p-4 text-right text-sm font-bold app-text-muted">المستخدم</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{isSuperAdmin ? 'المتجر' : 'الفرع والنطاق'}</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">الدور</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">الحالة</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">تاريخ الإنشاء</th>
                  <th className="p-4 text-center text-sm font-bold app-text-muted">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr
                    key={userItem._id}
                    className="border-b border-black/5 transition-colors last:border-b-0 hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                          {userItem.name?.charAt(0) || 'م'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black app-text-strong">{userItem.name}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs app-text-muted">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{userItem.email}</span>
                          </div>
                          {userItem.phone && (
                            <div className="mt-1 flex items-center gap-2 text-xs app-text-muted">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{userItem.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 align-top">
                      {isSuperAdmin ? (
                        userItem.tenant ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-primary-500" />
                            <span className="font-semibold app-text-strong">{userItem.tenant.name}</span>
                          </div>
                        ) : (
                          <Badge variant="warning">مدير نظام</Badge>
                        )
                      ) : userItem.primaryBranch || userItem.branch ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold app-text-strong">
                            {userItem.primaryBranch?.name || userItem.branch?.name}
                          </p>
                          <p className="text-xs app-text-muted">{getBranchScopeLabel(userItem)}</p>
                        </div>
                      ) : (
                        <span className="text-xs app-text-muted">بدون ربط فرعي</span>
                      )}
                    </td>

                    <td className="p-4 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(userItem)}>
                          <Shield className="mr-1 h-3 w-3" />
                          {getRoleLabel(userItem)}
                        </Badge>
                        {userItem.customRole && <Badge variant="gray">مخصص</Badge>}
                      </div>
                    </td>

                    <td className="p-4 align-top">
                      <Badge variant={userItem.isActive ? 'success' : 'danger'}>
                        {userItem.isActive ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            نشط
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            معطل
                          </>
                        )}
                      </Badge>
                    </td>

                    <td className="p-4 align-top">
                      <p className="text-sm app-text-muted">
                        {format(new Date(userItem.createdAt), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </td>

                    <td className="p-4 align-top">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={buildAuditTrailLink(userItem)}
                          className="rounded-xl p-2.5 app-surface-muted app-text-body transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                          title="عرض سجل التدقيق"
                        >
                          <FileSearch className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(userItem)}
                          className="rounded-xl p-2.5 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {userItem.role !== 'admin' && userItem.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDelete(userItem._id)}
                            className="rounded-xl p-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="تعطيل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-black/5 p-4 dark:border-white/10">
              <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      )}

      {showModal && (
        <Modal
          title={editId ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          onClose={closeModal}
          size="lg"
          bodyClassName="space-y-6"
        >
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">البيانات الأساسية</h3>
                <p className="mt-1 text-sm app-text-muted">اسم الموظف وبيانات التواصل والدور الأساسي للحساب.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {isSuperAdmin && !editId && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold app-text-strong">المتجر</label>
                    <select
                      value={form.tenantId}
                      onChange={(event) => setForm((current) => ({ ...current, tenantId: event.target.value }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">اختر المتجر</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  label="الاسم"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="محمد أحمد"
                />
                <Input
                  type="email"
                  label="البريد الإلكتروني"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="user@example.com"
                />
                <Input
                  label="رقم الهاتف"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01012345678"
                />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-bold app-text-strong">الدور القياسي</label>
                    <Link to="/roles" className="text-xs font-semibold text-primary-500 hover:text-primary-600">
                      إدارة الأدوار
                    </Link>
                  </div>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                  >
                    {STANDARD_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold app-text-strong">الدور المخصص</label>
                  <select
                    value={form.customRole}
                    onChange={(event) => setForm((current) => ({ ...current, customRole: event.target.value }))}
                    className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">بدون دور مخصص</option>
                    {roles.map((roleItem) => (
                      <option key={roleItem._id} value={roleItem._id}>
                        {roleItem.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {!isSuperAdmin && (
              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-base font-black app-text-strong">نطاق الفروع</h3>
                  <p className="mt-1 text-sm app-text-muted">حدد ما إذا كان المستخدم يعمل على فرع واحد أو مجموعة فروع أو كل الفروع.</p>
                </div>
                {renderBranchScopeFields()}
              </Card>
            )}

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">الحالة وكلمة المرور</h3>
                <p className="mt-1 text-sm app-text-muted">
                  {editId ? 'يمكنك إبقاء كلمة المرور فارغة إذا لم تكن تريد تغييرها.' : 'اترك الحقل فارغاً لإرسال دعوة للمستخدم عبر إحدى القنوات لتفعيل حسابه وتعيين كلمة السر بنفسه.'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="password"
                  label={editId ? 'كلمة مرور جديدة' : 'كلمة المرور (اختياري)'}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder={editId ? 'اتركها فارغة إذا لم تتغير' : 'اتركها فارغة لإرسال دعوة للمستخدم'}
                  autoComplete="new-password"
                />

                {editId ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold app-text-strong">الحالة</label>
                    <select
                      value={form.isActive ? 'active' : 'inactive'}
                      onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'active' }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">معطل</option>
                    </select>
                  </div>
                ) : !form.password ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold app-text-strong">طريقة إرسال رابط الدعوة</label>
                    <select
                      value={form.invitationChannel || 'auto'}
                      onChange={(event) => setForm((current) => ({ ...current, invitationChannel: event.target.value }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="auto">تلقائي (رسالة ثم بريد إلكتروني)</option>
                      <option value="whatsapp">عبر واتساب (WhatsApp)</option>
                      <option value="email">عبر البريد الإلكتروني فقط</option>
                      <option value="sms">عبر رسالة نصية (SMS) فقط</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeModal} className="sm:min-w-[140px]">
                إلغاء
              </Button>
              <Button onClick={handleSave} loading={saving} className="sm:min-w-[180px]">
                {editId ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
