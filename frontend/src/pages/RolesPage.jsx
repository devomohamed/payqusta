import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const PERMISSION_ACTIONS = [
  { id: 'create', label: 'إنشاء' },
  { id: 'read', label: 'عرض' },
  { id: 'update', label: 'تعديل' },
  { id: 'delete', label: 'حذف' },
];

const PERMISSION_RESOURCES = [
  { id: 'products', label: 'المنتجات' },
  { id: 'stock_adjustments', label: 'تعديلات المخزون' },
  { id: 'purchase_orders', label: 'أوامر الشراء' },
  { id: 'suppliers', label: 'الموردون' },
  { id: 'customers', label: 'العملاء' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'cash_shifts', label: 'الخزائن والورديات' },
  { id: 'branches', label: 'الفروع' },
  { id: 'expenses', label: 'المصروفات' },
  { id: 'reports', label: 'التقارير' },
  { id: 'settings', label: 'الإعدادات' },
  { id: 'users', label: 'المستخدمون' },
];

const PERMISSION_GROUPS = [
  {
    id: 'catalog',
    label: 'الكتالوج والمخزون',
    description: 'المنتجات، المخزون، الموردون، وأوامر الشراء.',
    resources: ['products', 'stock_adjustments', 'purchase_orders', 'suppliers'],
  },
  {
    id: 'sales',
    label: 'المبيعات والعملاء',
    description: 'العملاء، الفواتير، والخزائن اليومية.',
    resources: ['customers', 'invoices', 'cash_shifts'],
  },
  {
    id: 'operations',
    label: 'التشغيل والإدارة',
    description: 'الفروع، التقارير، الإعدادات، المستخدمون، والمصروفات.',
    resources: ['branches', 'expenses', 'reports', 'settings', 'users'],
  },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  permissions: [],
};

export default function RolesPage() {
  const navigate = useNavigate();
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
      notify.error('فشل تحميل الأدوار');
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
      notify.warning('اسم الدور مطلوب');
      return;
    }

    if (form.permissions.length === 0) {
      notify.warning('يجب تحديد صلاحية واحدة على الأقل');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, form);
        notify.success('تم تحديث الدور');
      } else {
        await api.post('/roles', form);
        notify.success('تم إنشاء الدور');
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      await loadRoles();
    } catch (error) {
      notify.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ الدور');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId) => {
    const ok = await confirm.delete('هل أنت متأكد من حذف هذا الدور؟');
    if (!ok) return;

    try {
      await api.delete(`/roles/${roleId}`);
      notify.success('تم حذف الدور');
      await loadRoles();
    } catch (error) {
      notify.error(error.response?.data?.message || 'فشل حذف الدور');
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
    PERMISSION_GROUPS
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
              طبقات الوصول والصلاحيات
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">إدارة الأدوار والصلاحيات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              أنشئ أدوارًا دقيقة للفريق ورتّب الصلاحيات حسب نطاق العمل مع قراءة أوضح على الهاتف.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">أدوار مخصصة</p>
              <p className="mt-2 text-2xl font-black">{roleStats.customRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">أدوار افتراضية</p>
              <p className="mt-2 text-2xl font-black">{roleStats.systemRoles}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">إجمالي الإجراءات</p>
              <p className="mt-2 text-2xl font-black">{roleStats.totalPermissions}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={() => navigate('/admin/users')} icon={<Users className="h-4 w-4" />} className="justify-center border-white/20 bg-white/10 text-white hover:bg-white/15">
            إدارة الموظفين
          </Button>
          <Button onClick={handleOpenAdd} icon={<Plus className="h-4 w-4" />} className="justify-center bg-white text-primary-700 hover:bg-white/90">
            دور جديد
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">الأدوار المخصصة</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.customRoles}</p>
          <p className="mt-2 text-sm text-gray-500">أدوار أنشأها صاحب المتجر حسب احتياج الفريق.</p>
        </Card>
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">الأدوار الافتراضية</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.systemRoles}</p>
          <p className="mt-2 text-sm text-gray-500">مرجع سريع لتجميع الصلاحيات المعتادة داخل النظام.</p>
        </Card>
        <Card className="app-surface p-5">
          <p className="text-xs font-bold text-gray-500">إجمالي الصلاحيات النشطة</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{roleStats.totalPermissions}</p>
          <p className="mt-2 text-sm text-gray-500">مجموع الإجراءات الموزعة حاليًا على جميع الأدوار.</p>
        </Card>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-blue-900 dark:text-blue-200">كيف تُقرأ هذه الشاشة؟</h3>
            <p className="text-sm leading-6 text-blue-800 dark:text-blue-300">
              الدور يحدد ماذا يستطيع الموظف أن يفعل داخل النظام. أما الفرع أو الفروع التي يمكنه الوصول إليها فتُحدد من شاشة الموظفين،
              وليس من نموذج الدور نفسه.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/admin/users')}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="border-0 bg-blue-600 text-white hover:bg-blue-700"
            >
              الذهاب لتعيين الأدوار للموظفين
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="لا توجد أدوار مخصصة"
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
                {role.isSystem && <Badge variant="info">افتراضي</Badge>}
                <Badge variant="gray">إجراءات: {getRoleActionCount(role)}</Badge>
                {getRoleGroupLabels(role).map((label) => (
                  <Badge key={label} variant="primary">{label}</Badge>
                ))}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {role.permissions.slice(0, 4).map((permission) => (
                  <div key={permission.resource} className="rounded-2xl border border-gray-100/80 px-3 py-2 dark:border-white/10">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {PERMISSION_RESOURCES.find((entry) => entry.id === permission.resource)?.label || permission.resource}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.actions.map((action) => (
                        <Badge key={action} variant="gray">
                          {PERMISSION_ACTIONS.find((entry) => entry.id === action)?.label || action}
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
        title={editId ? 'تعديل الدور' : 'إنشاء دور جديد'}
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="اسم الدور"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="مثال: مدير مخزون"
            />
            <Input
              label="وصف مختصر"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="الدور المناسب لهذا المستخدم"
            />
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
            <p className="font-bold text-amber-900 dark:text-amber-200">مهم</p>
            <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-300">
              هذا النموذج يحدد الصلاحيات فقط. أما نطاق الفروع، والفرع الرئيسي، والفروع المسندة للمستخدم فتُدار من شاشة الموظفين.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold">الصلاحيات حسب نطاق العمل</label>
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.id} className="overflow-hidden rounded-2xl border border-gray-100/80 dark:border-white/10">
                  <div className="app-surface-muted px-4 py-3">
                    <p className="font-bold text-gray-900 dark:text-white">{group.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{group.description}</p>
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {group.resources.map((resourceId) => {
                      const resource = PERMISSION_RESOURCES.find((entry) => entry.id === resourceId);
                      if (!resource) return null;

                      return (
                        <div key={resource.id} className="rounded-2xl app-surface-muted p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{resource.label}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {PERMISSION_ACTIONS.map((action) => (
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
                          <th className="px-4 py-3 text-right font-semibold">المورد</th>
                          {PERMISSION_ACTIONS.map((action) => (
                            <th key={action.id} className="px-4 py-3 text-center font-semibold">{action.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.resources.map((resourceId) => {
                          const resource = PERMISSION_RESOURCES.find((entry) => entry.id === resourceId);
                          if (!resource) return null;

                          return (
                            <tr key={resource.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{resource.label}</td>
                              {PERMISSION_ACTIONS.map((action) => (
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
              {editId ? 'حفظ التعديلات' : 'إنشاء الدور'}
            </Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)} icon={<X className="h-4 w-4" />}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
