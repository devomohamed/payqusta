import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Edit2,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '../store';
import { Button, Card, EmptyState, Input, LoadingSpinner, Modal, Badge } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { confirm } from '../components/ConfirmDialog';

const getPermissionActions = (t) => [
  { id: 'create', label: t('roles_page.ui.koubmp9') },
  { id: 'read', label: t('roles_page.ui.kxwda') },
  { id: 'update', label: t('roles_page.ui.kowu7zu') },
  { id: 'delete', label: t('roles_page.ui.kxnge') },
];

const getPermissionResources = (t) => [
  { id: 'products', label: t('roles_page.ui.ks0nri5') },
  { id: 'stock_adjustments', label: t('roles_page.ui.k85jb4p') },
  { id: 'purchase_orders', label: t('roles_page.ui.ktlj32y') },
  { id: 'suppliers', label: t('roles_page.ui.krzfmdg') },
  { id: 'customers', label: t('roles_page.ui.kzgg8kr') },
  { id: 'invoices', label: t('roles_page.ui.ktvslhu') },
  { id: 'cash_shifts', label: t('roles_page.ui.kw7maaa') },
  { id: 'branches', label: t('roles_page.ui.kaaztz6') },
  { id: 'expenses', label: t('roles_page.ui.ko4ileo') },
  { id: 'reports', label: t('roles_page.ui.ku5zj1i') },
  { id: 'settings', label: t('roles_page.ui.k5925rd') },
  { id: 'users', label: t('roles_page.ui.kdirwj') },
];

const getPermissionGroups = (t) => [
  {
    id: 'catalog',
    label: t('roles_page.ui.krt1k77'),
    description: t('roles_page.ui.kg4htwp'),
    resources: ['products', 'stock_adjustments', 'purchase_orders', 'suppliers'],
  },
  {
    id: 'sales',
    label: t('roles_page.ui.kjvh885'),
    description: t('roles_page.ui.kp92m4c'),
    resources: ['customers', 'invoices', 'cash_shifts'],
  },
  {
    id: 'operations',
    label: t('roles_page.ui.kgkzoj'),
    description: t('roles_page.ui.knzpz3m'),
    resources: ['branches', 'expenses', 'reports', 'settings', 'users'],
  },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  permissions: [],
};

export default function RolesPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const permissionActions = useMemo(() => getPermissionActions(t), [t]);
  const permissionResources = useMemo(() => getPermissionResources(t), [t]);
  const permissionGroups = useMemo(() => getPermissionGroups(t), [t]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadRoles();
  }, []);

  const roleStats = useMemo(() => {
    const customRoles = roles.filter((role) => !role.isSystem).length;
    const systemRoles = roles.filter((role) => role.isSystem).length;
    const totalPermissions = roles.reduce((count, role) => (
      count + role.permissions.reduce((innerCount, permission) => innerCount + permission.actions.length, 0)
    ), 0);

    return { customRoles, systemRoles, totalPermissions };
  }, [roles]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data || []);
    } catch (error) {
      notify.error(t('roles_page.toasts.k31sctm'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    setEditId(role._id);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      notify.warning(t('roles_page.toasts.kt0idt2'));
      return;
    }

    if (form.permissions.length === 0) {
      notify.warning(t('roles_page.toasts.k3qf4ol'));
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, form);
        notify.success(t('roles_page.toasts.k3ajjx'));
      } else {
        await api.post('/roles', form);
        notify.success(t('roles_page.toasts.ku9fscd'));
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await loadRoles();
    } catch (error) {
      notify.error(error.response?.data?.message || t('roles_page.toasts.kqkt3ye'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId) => {
    const ok = await confirm.delete(t('roles_page.ui.kc1ud11'));
    if (!ok) return;

    try {
      await api.delete(`/roles/${roleId}`);
      notify.success(t('roles_page.toasts.kivhvys'));
      await loadRoles();
    } catch (error) {
      notify.error(error.response?.data?.message || t('roles_page.toasts.krbyjau'));
    }
  };

  const togglePermission = (resource, action) => {
    setForm((prev) => {
      const permissions = [...prev.permissions];
      const permissionIndex = permissions.findIndex((permission) => permission.resource === resource);

      if (permissionIndex === -1) {
        permissions.push({ resource, actions: [action] });
      } else {
        const nextActions = permissions[permissionIndex].actions.includes(action)
          ? permissions[permissionIndex].actions.filter((entry) => entry !== action)
          : [...permissions[permissionIndex].actions, action];

        if (nextActions.length === 0) {
          permissions.splice(permissionIndex, 1);
        } else {
          permissions[permissionIndex] = {
            ...permissions[permissionIndex],
            actions: nextActions,
          };
        }
      }

      return { ...prev, permissions };
    });
  };

  const hasPermission = (resource, action) => {
    const permission = form.permissions.find((entry) => entry.resource === resource);
    return Boolean(permission && permission.actions.includes(action));
  };

  const getRoleActionCount = (role) => (
    role.permissions.reduce((count, permission) => count + permission.actions.length, 0)
  );

  const getRoleGroupLabels = (role) => (
    permissionGroups
      .filter((group) => role.permissions.some((permission) => group.resources.includes(permission.resource)))
      .map((group) => group.label)
  );

  return (
    <div className="space-y-6 app-text-soft">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-slate-950 via-primary-800 to-cyan-700 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(6,95,212,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Shield className="h-3.5 w-3.5" />
              {t('roles_page.ui.klqo2e9')}
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">{t('roles_page.ui.krxwllh')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              {t('roles_page.ui.km0fke9')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('roles_page.ui.kf89y4a')}</p>
              <p className="mt-2 text-2xl font-black">{roleStats.customRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('roles_page.ui.k8qeejt')}</p>
              <p className="mt-2 text-2xl font-black">{roleStats.systemRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('roles_page.ui.kfobp3t')}</p>
              <p className="mt-2 text-2xl font-black">{roleStats.totalPermissions}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={() => navigate('/admin/users')} icon={<Users className="h-4 w-4" />} className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/15">
            {t('roles_page.ui.k8bi8a8')}
          </Button>
          <Button onClick={handleOpenAdd} icon={<Plus className="h-4 w-4" />} className="justify-center bg-white text-primary-700 hover:bg-white/90">
            {t('roles_page.ui.keo9r5c')}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">{t('roles_page.ui.k58ee5w')}</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.customRoles}</p>
          <p className="mt-2 text-sm text-gray-500">{t('roles_page.ui.kmchras')}</p>
        </Card>
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">{t('roles_page.ui.kg1t55p')}</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.systemRoles}</p>
          <p className="mt-2 text-sm text-gray-500">{t('roles_page.ui.kpmsja4')}</p>
        </Card>
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">{t('roles_page.ui.kyrkf4d')}</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.totalPermissions}</p>
          <p className="mt-2 text-sm text-gray-500">{t('roles_page.ui.kix6t5o')}</p>
        </Card>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-blue-900 dark:text-blue-200">{t('roles_page.ui.kugyvz5')}</h3>
            <p className="text-sm leading-6 text-blue-800 dark:text-blue-300">
              الدور يحدد ماذا يستطيع الموظف أن يفعل داخل النظام. أما الفرع أو الفروع التي يمكنه الوصول إليها فتُحدد من شاشة الموظفين،
              {t('roles_page.ui.kioie1x')}
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/admin/users')}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="border-0 bg-blue-600 text-white hover:bg-blue-700"
            >
              {t('roles_page.ui.k6r5dkv')}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title={t('roles_page.titles.kwqla8s')}
          description="أنشئ أول دور لتوزيع الصلاحيات بين فريق العمل."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role._id} className="app-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                  {role.description && (
                    <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                  )}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(role)}
                      className="rounded-xl p-2 text-blue-500 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role._id)}
                      className="rounded-xl p-2 text-red-500 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {role.isSystem && <Badge variant="info">{t('roles_page.ui.kxwwogq')}</Badge>}
                <Badge variant="gray">إجراءات: {getRoleActionCount(role)}</Badge>
                {getRoleGroupLabels(role).map((label) => (
                  <Badge key={label} variant="primary">{label}</Badge>
                ))}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {role.permissions.slice(0, 4).map((permission) => (
                  <div key={permission.resource} className="rounded-2xl border border-gray-100/80 px-3 py-2 dark:border-white/10">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {permissionResources.find((entry) => entry.id === permission.resource)?.label || permission.resource}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.actions.map((action) => (
                        <Badge key={action} variant="gray">
                          {permissionActions.find((entry) => entry.id === action)?.label || action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {role.permissions.length > 4 && (
                  <p className="text-xs text-gray-500">+{role.permissions.length - 4} صلاحيات إضافية</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? t('roles_page.ui.k2zzbth') : 'إنشاء دور جديد'}
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('roles_page.form.kr35xro')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t('roles_page.placeholders.kqkl5vj')}
            />
            <Input
              label={t('roles_page.form.kygtgj5')}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('roles_page.placeholders.khcl11g')}
            />
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
            <p className="font-bold text-amber-900 dark:text-amber-200">{t('roles_page.ui.ky5sz')}</p>
            <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-300">
              هذا النموذج يحدد الصلاحيات فقط. أما نطاق الفروع، والفرع الرئيسي، والفروع المسندة للمستخدم فتُدار من شاشة الموظفين.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold">{t('roles_page.ui.khnbfg6')}</label>
            <div className="space-y-4">
              {permissionGroups.map((group) => (
                <div key={group.id} className="overflow-hidden rounded-2xl border border-gray-100/80 dark:border-white/10">
                  <div className="app-surface-muted px-4 py-3">
                    <p className="font-bold text-gray-900 dark:text-white">{group.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{group.description}</p>
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {group.resources.map((resourceId) => {
                      const resource = permissionResources.find((entry) => entry.id === resourceId);
                      if (!resource) return null;

                      return (
                        <div key={resource.id} className="rounded-2xl app-surface-muted p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{resource.label}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {permissionActions.map((action) => (
                              <label key={action.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-gray-900/60 dark:text-gray-200">
                                <span>{action.label}</span>
                                <input
                                  type="checkbox"
                                  checked={hasPermission(resource.id, action.id)}
                                  onChange={() => togglePermission(resource.id, action.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="app-surface-muted">
                        <tr>
                          <th className="px-4 py-3 text-right font-semibold">{t('roles_page.ui.kaawtj6')}</th>
                          {permissionActions.map((action) => (
                            <th key={action.id} className="px-4 py-3 text-center font-semibold">{action.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.resources.map((resourceId) => {
                          const resource = permissionResources.find((entry) => entry.id === resourceId);
                          if (!resource) return null;

                          return (
                            <tr key={resource.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{resource.label}</td>
                              {permissionActions.map((action) => (
                                <td key={action.id} className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission(resource.id, action.id)}
                                    onChange={() => togglePermission(resource.id, action.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
              {editId ? t('roles_page.ui.km6ld24') : 'إنشاء الدور'}
            </Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)} icon={<X className="h-4 w-4" />}>
              {t('roles_page.ui.cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
