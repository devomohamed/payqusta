import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function getStandardRoleOptions(t) {
  return [
    { value: 'admin', label: t('admin_users_page.ui.kiw8fol') },
    { value: 'vendor', label: t('admin_users_page.ui.kj7m77t') },
    { value: 'coordinator', label: t('admin_users_page.ui.ktf00g') },
    { value: 'cashier', label: t('admin_users_page.ui.kpa9orb') },
    { value: 'supplier', label: t('admin_users_page.ui.ktf1fl') },
  ];
}

function getBranchScopeOptions(t) {
  return [
    { value: 'all_branches', label: t('admin_users_page.ui.kai1sru') },
    { value: 'assigned_branches', label: t('admin_users_page.ui.k290xzy') },
    { value: 'single_branch', label: t('admin_users_page.ui.kde3qnc') },
  ];
}

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

function getRoleLabel(userItem, standardRoleOptions) {
  return userItem.customRole?.name
    || standardRoleOptions.find((option) => option.value === userItem.role)?.label
    || userItem.role;
}

function getBranchScopeLabel(userItem, t) {
  if (!userItem.branchAccessMode) return t('admin_users_page.ui.k5xt5xj');
  if (userItem.branchAccessMode === 'all_branches') return t('admin_users_page.ui.kai1sru');
  if (userItem.branchAccessMode === 'assigned_branches') {
    return `فروع محددة (${userItem.assignedBranches?.length || 0})`;
  }
  return t('admin_users_page.ui.kde3qnc');
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
  const { t } = useTranslation('admin');
  const standardRoleOptions = useMemo(() => getStandardRoleOptions(t), [t]);
  const branchScopeOptions = useMemo(() => getBranchScopeOptions(t), [t]);
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
      toast.error(t('admin_users_page.toasts.k1aodt7'));
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
      invitationChannel: userItem.invitation?.channel || 'auto',
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
      return toast.error(t('admin_users_page.toasts.kpxpt9c'));
    }

    if (!editId && isSuperAdmin && !form.tenantId) {
      return toast.error(t('admin_users_page.toasts.kb4sb5a'));
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
        await adminApi.updateUser(editId, {
          ...payload,
          invitationChannel: form.invitationChannel,
        });
        toast.success(t('admin_users_page.toasts.kz1qbyp'));
      } else {
        await adminApi.createUser({
          ...payload,
          tenantId: isSuperAdmin ? form.tenantId : user?.tenant?._id,
          invitationChannel: form.invitationChannel,
        });
        toast.success(t('admin_users_page.toasts.k3t1yhd'));
      }

      closeModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin_users_page.toasts.k5xkrhi'));
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
        await adminApi.updateUser(editId, {
          ...payload,
          invitationChannel: form.invitationChannel,
        });
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
      title: t('admin_users_page.ui.k5yeb8a'),
      message: t('admin_users_page.ui.kvken9p'),
      duration: 10000,
      action: {
        label: t('admin_users_page.ui.kcuf6ig'),
        onClick: async () => {
          try {
            await adminApi.deleteUser(userId, { hardDelete: true });
            notify.success(t('admin_users_page.ui.kcogsva'), t('admin_users_page.ui.kwtu1we'));
            load();
          } catch (error) {
            notify.error(error.response?.data?.message || t('admin_users_page.toasts.kgdyvm1'), t('admin_users_page.ui.ktcqm3h'));
          }
        },
      },
      secondaryAction: {
        label: t('admin_users_page.ui.kce6i3c'),
        onClick: async () => {
          try {
            await adminApi.deleteUser(userId);
            notify.success(t('admin_users_page.ui.klo6evw'), t('admin_users_page.ui.kwtu1we'));
            load();
          } catch (error) {
            notify.error(error.response?.data?.message || t('admin_users_page.toasts.khi7j03'), t('admin_users_page.ui.ktcqm3h'));
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
          <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.kar6fi')}</label>
          <select
            value={form.branchAccessMode}
            onChange={(event) => setForm((current) => ({ ...current, branchAccessMode: event.target.value }))}
            className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            {branchScopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.kphehwb')}</label>
          <select
            value={form.primaryBranch}
            onChange={(event) => setForm((current) => ({
              ...current,
              primaryBranch: event.target.value,
              branch: event.target.value,
            }))}
            className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">{t('admin_users_page.ui.ke9scfd')}</option>
            {branches.map((branchItem) => (
              <option key={branchItem._id} value={branchItem._id}>
                {branchItem.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.ku9lvob')}</label>
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
          <p className="mt-2 text-xs app-text-muted">{t('admin_users_page.ui.kywrwga')}</p>
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
                <h1 className="text-3xl font-black text-white">{t('admin_users_page.ui.k7ikm77')}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">
                  {t('admin_users_page.ui.k80lp8g')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[560px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('admin_users_page.ui.kg69frm')}</p>
              <p className="mt-2 text-2xl font-black">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('admin_users_page.ui.kq4mwmi')}</p>
              <p className="mt-2 text-2xl font-black">{summary.active}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('admin_users_page.ui.kf89y4a')}</p>
              <p className="mt-2 text-2xl font-black">{summary.customRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('admin_users_page.ui.k7lmrnv')}</p>
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
            {t('admin_users_page.ui.kvih2yl')}
          </Link>
          <Button onClick={openAdd} size="lg" icon={<Plus className="h-4 w-4" />} className="w-full bg-white text-emerald-700 hover:bg-white/90 lg:w-auto">
            {t('admin_users_page.ui.kcbc91e')}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title={t('admin_users_page.titles.kg69frm')} value={summary.total} caption="بعد الفلاتر الحالية" icon={Users} tone="primary" />
        <SummaryCard title={t('admin_users_page.titles.kq4mwmi')} value={summary.active} caption="يمكنها تسجيل الدخول حاليًا" icon={CheckCircle} tone="emerald" />
        <SummaryCard title={t('admin_users_page.titles.kf89y4a')} value={summary.customRoles} caption="حسابات مرتبطة بدور تفصيلي" icon={Shield} tone="amber" />
        <SummaryCard title={t('admin_users_page.titles.k7lmrnv')} value={summary.scopedUsers} caption="حسابات ليست على جميع الفروع" icon={Building2} tone="cyan" />
      </div>

      <Card className="app-surface-muted p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-black app-text-strong">{t('admin_users_page.ui.kex4i93')}</p>
          <p className="mt-1 text-xs app-text-muted">{t('admin_users_page.ui.ke06noj')}</p>
        </div>
        <div className={`grid gap-4 ${isSuperAdmin ? 'lg:grid-cols-[1.4fr_repeat(2,minmax(0,0.8fr))]' : 'lg:grid-cols-[1.6fr_0.9fr]'}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 app-text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('admin_users_page.placeholders.ka3dcnw')}
              className="pr-10"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="app-surface rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">{t('admin_users_page.ui.k8t8jhm')}</option>
            {standardRoleOptions.map((option) => (
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
              <option value="">{t('admin_users_page.ui.k9btodn')}</option>
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
          title={t('admin_users_page.titles.k5jeaaa')}
          description="جرّب توسيع الفلاتر أو ابدأ بإضافة مستخدم جديد."
          action={{ label: t('admin_users_page.ui.kdnrqwm'), onClick: openAdd }}
        />
      ) : (
        <Card className="overflow-hidden rounded-[1.75rem]">
          <div className="space-y-3 p-4 md:hidden">
            {users.map((userItem) => (
              <div key={userItem._id} className="app-surface-muted rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                    {userItem.name?.charAt(0) || t('admin_users_page.toasts.k18l')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black app-text-strong">{userItem.name}</p>
                      <Badge variant={getRoleBadgeVariant(userItem)}>{getRoleLabel(userItem, standardRoleOptions)}</Badge>
                      <Badge variant={userItem.isActive ? 'success' : 'danger'}>{userItem.isActive ? t('admin_users_page.ui.ky62x') : 'معطل'}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] app-text-muted">{userItem.email}</p>
                    {userItem.phone ? <p className="mt-1 text-[11px] app-text-muted">{userItem.phone}</p> : null}
                    <p className="mt-2 text-[11px] app-text-muted">
                      {isSuperAdmin
                        ? (userItem.tenant?.name || t('admin_users_page.toasts.kd98xj3'))
                        : (userItem.primaryBranch?.name || userItem.branch?.name || t('admin_users_page.toasts.koyf0h0'))}
                    </p>
                    {!isSuperAdmin ? <p className="mt-1 text-[11px] app-text-muted">{getBranchScopeLabel(userItem, t)}</p> : null}
                    <p className="mt-1 text-[11px] app-text-muted">{format(new Date(userItem.createdAt), 'dd MMM yyyy', { locale: ar })}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={buildAuditTrailLink(userItem)}
                    className="inline-flex items-center justify-center rounded-xl p-2.5 app-surface app-text-body transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                    title={t('admin_users_page.titles.k8tscyp')}
                  >
                    <FileSearch className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(userItem)}
                    className="rounded-xl p-2.5 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                    title={t('admin_users_page.titles.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {userItem.role !== 'admin' && userItem.isActive && (
                    <button
                      type="button"
                      onClick={() => handleDelete(userItem._id)}
                      className="rounded-xl p-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      title={t('admin_users_page.titles.kowudxe')}
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
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{t('admin_users_page.ui.ksb3t2z')}</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{isSuperAdmin ? t('admin_users_page.ui.kaaxfw9') : 'الفرع والنطاق'}</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{t('admin_users_page.ui.kovdv0b')}</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{t('admin_users_page.ui.kabct8k')}</th>
                  <th className="p-4 text-right text-sm font-bold app-text-muted">{t('admin_users_page.ui.kwmk0vc')}</th>
                  <th className="p-4 text-center text-sm font-bold app-text-muted">{t('admin_users_page.ui.kvfmk6')}</th>
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
                          {userItem.name?.charAt(0) || t('admin_users_page.toasts.k18l')}
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
                          <Badge variant="warning">{t('admin_users_page.ui.kd98xj3')}</Badge>
                        )
                      ) : userItem.primaryBranch || userItem.branch ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold app-text-strong">
                            {userItem.primaryBranch?.name || userItem.branch?.name}
                          </p>
                          <p className="text-xs app-text-muted">{getBranchScopeLabel(userItem, t)}</p>
                        </div>
                      ) : (
                        <span className="text-xs app-text-muted">{t('admin_users_page.ui.koyf0h0')}</span>
                      )}
                    </td>

                    <td className="p-4 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(userItem)}>
                          <Shield className="mr-1 h-3 w-3" />
                          {getRoleLabel(userItem, standardRoleOptions)}
                        </Badge>
                        {userItem.customRole && <Badge variant="gray">{t('admin_users_page.ui.ktei95')}</Badge>}
                      </div>
                    </td>

                    <td className="p-4 align-top">
                      <Badge variant={userItem.isActive ? 'success' : 'danger'}>
                        {userItem.isActive ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('admin_users_page.ui.ky62x')}
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            {t('admin_users_page.ui.kteqgx')}
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
                          title={t('admin_users_page.titles.k8tscyp')}
                        >
                          <FileSearch className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(userItem)}
                          className="rounded-xl p-2.5 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                          title={t('admin_users_page.titles.edit')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {userItem.role !== 'admin' && userItem.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDelete(userItem._id)}
                            className="rounded-xl p-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                            title={t('admin_users_page.titles.kowudxe')}
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
          title={editId ? t('admin_users_page.ui.kaspgmj') : 'إضافة مستخدم جديد'}
          onClose={closeModal}
          size="lg"
          bodyClassName="space-y-6"
        >
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('admin_users_page.ui.kl8rjwp')}</h3>
                <p className="mt-1 text-sm app-text-muted">{t('admin_users_page.ui.k825udw')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {isSuperAdmin && !editId && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.kaaxfw9')}</label>
                    <select
                      value={form.tenantId}
                      onChange={(event) => setForm((current) => ({ ...current, tenantId: event.target.value }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="">{t('admin_users_page.ui.kfeejax')}</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  label={t('admin_users_page.form.kovdol8')}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('admin_users_page.placeholders.knbivgi')}
                />
                <Input
                  type="email"
                  label={t('admin_users_page.form.k8lvosz')}
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="user@example.com"
                />
                <Input
                  label={t('admin_users_page.form.k3pahhc')}
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="01012345678"
                />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-bold app-text-strong">{t('admin_users_page.ui.kerlxp0')}</label>
                    <Link to="/roles" className="text-xs font-semibold text-primary-500 hover:text-primary-600">
                      {t('admin_users_page.ui.kxkis4e')}
                    </Link>
                  </div>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                  >
                    {standardRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.khupp91')}</label>
                  <select
                    value={form.customRole}
                    onChange={(event) => setForm((current) => ({ ...current, customRole: event.target.value }))}
                    className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">{t('admin_users_page.ui.kt39lws')}</option>
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
                  <h3 className="text-base font-black app-text-strong">{t('admin_users_page.ui.kar6fi')}</h3>
                  <p className="mt-1 text-sm app-text-muted">{t('admin_users_page.ui.kq3tfve')}</p>
                </div>
                {renderBranchScopeFields()}
              </Card>
            )}

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-black app-text-strong">{t('admin_users_page.ui.km7df6x')}</h3>
                <p className="mt-1 text-sm app-text-muted">
                  {editId ? t('admin_users_page.ui.k48b6z6') : 'اترك الحقل فارغاً لإرسال دعوة للمستخدم عبر إحدى القنوات لتفعيل حسابه وتعيين كلمة السر بنفسه.'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  type="password"
                  label={editId ? t('admin_users_page.ui.koj20j5') : 'كلمة المرور (اختياري)'}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder={editId ? t('admin_users_page.ui.kfdpxkn') : 'اتركها فارغة لإرسال دعوة للمستخدم'}
                  autoComplete="new-password"
                />

                {editId ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.kabct8k')}</label>
                    <select
                      value={form.isActive ? 'active' : 'inactive'}
                      onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'active' }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="active">{t('admin_users_page.ui.ky62x')}</option>
                      <option value="inactive">{t('admin_users_page.ui.kteqgx')}</option>
                    </select>
                  </div>
                ) : !form.password ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold app-text-strong">{t('admin_users_page.ui.k91yx1a')}</label>
                    <select
                      value={form.invitationChannel || 'auto'}
                      onChange={(event) => setForm((current) => ({ ...current, invitationChannel: event.target.value }))}
                      className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="auto">{t('admin_users_page.ui.krqns79')}</option>
                      <option value="whatsapp">{t('admin_users_page.ui.kcp41q0')}</option>
                      <option value="email">{t('admin_users_page.ui.kdu6fud')}</option>
                      <option value="sms">{t('admin_users_page.ui.k9oz2i8')}</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeModal} className="sm:min-w-[140px]">
                {t('admin_users_page.ui.cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving} className="sm:min-w-[180px]">
                {editId ? t('admin_users_page.ui.km6ld24') : 'إنشاء المستخدم'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
