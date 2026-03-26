import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../UI';
import { notify } from '../AnimatedNotification';
import { confirm } from '../ConfirmDialog';
import Pagination from '../Pagination';
import { useTranslation } from 'react-i18next';

export default function SettingsUsers() {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    invitationChannel: 'auto',
    role: 'coordinator',
    isActive: true
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/auth/users?page=${page}&limit=10&search=${search}`);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      notify.error(t('settings_users.toasts.kqd6fxw'));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      invitationChannel: 'auto',
      role: 'coordinator',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      invitationChannel: user.invitation?.channel || 'auto'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) {
      notify.warning(t('settings_users.toasts.kpkza5c'));
      return;
    }

    if (false) {
      notify.warning(t('settings_users.toasts.k4ehgyh'));
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/auth/users/${editId}`, {
          name: form.name,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive,
          invitationChannel: form.invitationChannel,
        });
        notify.success(t('settings_users.toasts.kfn7k1v'));
      } else {
        await api.post('/auth/users', {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          invitationChannel: form.invitationChannel,
        });
        notify.success(t('settings_users.toasts.kqa6ecs'));
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      notify.error(error.response?.data?.message || t('settings_users.toasts.kx7tp8e'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    notify.custom({
      type: 'error',
      title: t('settings_users.ui.k5yeb8a'),
      message: t('settings_users.ui.kvken9p'),
      duration: 10000,
      action: {
        label: t('settings_users.ui.kcuf6ig'),
        onClick: async () => {
          try {
            await api.delete(`/auth/users/${id}?hardDelete=true`);
            notify.success(t('settings_users.ui.kcogsva'), t('settings_users.ui.kwtu1we'));
            loadUsers();
          } catch (error) {
            notify.error(error.response?.data?.message || t('settings_users.toasts.kgdyvm1'), t('settings_users.ui.ktcqm3h'));
          }
        },
      },
      secondaryAction: {
        label: t('settings_users.ui.kce6i3c'),
        onClick: async () => {
          try {
            await api.delete(`/auth/users/${id}`);
            notify.success(t('settings_users.ui.klo6evw'), t('settings_users.ui.kwtu1we'));
            loadUsers();
          } catch (error) {
            notify.error(error.response?.data?.message || t('settings_users.toasts.khi7j03'), t('settings_users.ui.ktcqm3h'));
          }
        },
      },
    });
  };

  const handleResend = async (user) => {
    try {
      await api.post(`/auth/users/${user._id}/resend-invitation`, {
        invitationChannel: user.phone ? 'auto' : 'email',
      });
      notify.success(t('settings_users.toasts.k173mf0'));
      loadUsers();
    } catch (error) {
      notify.error(error.response?.data?.message || t('settings_users.toasts.k7htz22'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings_users.ui.k8bi8a8')}</h2>
          <p className="text-sm text-subtle">{t('settings_users.ui.kms5zq3')}</p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="h-4 w-4" />}>
          {t('settings_users.ui.ku2tzuo')}
        </Button>
      </div>

      <Card>
        <div className="border-b border-gray-100 p-4 dark:border-white/5">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('settings_users.placeholders.kvgrksa')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t('settings_users.titles.k8hxeew')}
            description="أضف موظفين ليساعدوك في إدارة المتجر"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50 font-medium text-subtle dark:border-white/5 dark:bg-white/5">
                <tr>
                  <th className="p-4 text-right">{t('settings_users.ui.ksb3t2z')}</th>
                  <th className="p-4 text-right">{t('settings_users.ui.kovdv0b')}</th>
                  <th className="p-4 text-right">{t('settings_users.ui.kabct8k')}</th>
                  <th className="p-4 text-center">{t('settings_users.ui.kvfmk6')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {users.map((user) => (
                  <tr key={user._id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-600 dark:bg-primary-900/30">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                          {user.phone && <p className="text-xs text-muted">{user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === 'vendor' ? 'primary' : 'info'}>
                        {user.role === 'vendor' ? t('settings_users.ui.kpbklw2') : 'منسق'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? t('settings_users.ui.ky62x') : 'معطل'}
                      </Badge>
                    </td>
                    <td className="flex justify-center gap-2 p-4">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="rounded-lg p-2 text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResend(user)}
                        className="rounded-lg px-2 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4">
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? t('settings_users.ui.kz4wguq') : 'إضافة مستخدم جديد'}>
        <div className="space-y-4">
          <Input label={t('settings_users.form.kovdol8')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input
            label={t('settings_users.form.k8lvosz')}
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            disabled={Boolean(editId)}
          />
          <Input label={t('settings_users.form.k3pahhc')} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{t('settings_users.ui.kovdv0b')}</label>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className="app-surface-muted w-full rounded-xl border-2 border-gray-100/80 px-4 py-2.5 text-gray-900 outline-none transition-all focus:border-primary-500 dark:border-white/10 dark:text-white dark:focus:border-primary-400"
            >
              <option value="coordinator">{t('settings_users.ui.ktf00g')}</option>
              <option value="vendor">{t('settings_users.ui.kpbklw2')}</option>
            </select>
          </div>

          <Input
            label={editId ? t('settings_users.ui.kdwt42u') : 'كلمة المرور'}
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder={editId ? t('settings_users.ui.klem02k') : ''}
          />

          {!editId && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Invitation Channel</label>
              <select
                value={form.invitationChannel}
                onChange={(event) => setForm({ ...form, invitationChannel: event.target.value })}
                className="app-surface-muted w-full rounded-xl border-2 border-gray-100/80 px-4 py-2.5 text-gray-900 outline-none transition-all focus:border-primary-500 dark:border-white/10 dark:text-white dark:focus:border-primary-400"
              >
                <option value="auto">Smart / Auto</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          )}

          {editId && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">Invitation Channel</label>
              <select
                value={form.invitationChannel}
                onChange={(event) => setForm({ ...form, invitationChannel: event.target.value })}
                className="app-surface-muted w-full rounded-xl border-2 border-gray-100/80 px-4 py-2.5 text-gray-900 outline-none transition-all focus:border-primary-500 dark:border-white/10 dark:text-white dark:focus:border-primary-400"
              >
                <option value="auto">Smart / Auto</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          )}

          {editId && (
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">{t('settings_users.ui.kabct8k')}</label>
              <select
                value={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
                className="app-surface-muted w-full rounded-xl border-2 border-gray-100/80 px-4 py-2.5 text-gray-900 outline-none transition-all focus:border-primary-500 dark:border-white/10 dark:text-white dark:focus:border-primary-400"
              >
                <option value="true">{t('settings_users.ui.ky62x')}</option>
                <option value="false">{t('settings_users.ui.kteqgx')}</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              {t('settings_users.ui.save')}
            </Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)}>
              {t('settings_users.ui.cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
