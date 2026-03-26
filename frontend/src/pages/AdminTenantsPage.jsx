import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, Plus, Search, Edit2, Trash2, CheckCircle,
  XCircle, Calendar, Users, CreditCard, Crown, Key, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { superAdminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useAuthStore } from '../store';
import BranchManagement from './BranchManagement';

export default function AdminTenantsPage() {
  const { t } = useTranslation('admin');
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(null);
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    plan: 'free',
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ... (keep existing load function) ...

  const handleViewDetails = async (tenant) => {
    setSelectedTenant(null);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const res = await superAdminApi.getTenantDetails(tenant._id);
      setSelectedTenant(res.data.data);
    } catch (err) {
      toast.error(t('admin_tenants_page.toasts.k75ibqt'));
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ... (keep existing handlers) ...

  return (
    <div className="space-y-6 app-text-soft">
      {/* ... (keep existing Header and Filters) ... */}

      {/* Tenants Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t('admin_tenants_page.titles.kkc3put')}
          description="ابدأ بإضافة متجر جديد"
          action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>{t('admin_tenants_page.ui.kq5fqmk')}</Button>}
        />
      ) : (
        <Card className="app-surface overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* ... (keep table header) ... */}
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant._id}
                    className="border-b border-gray-100/70 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* ... (keep existing columns) ... */}
                    
                    {/* Updated Actions Column */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tenant)}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors"
                          title={t('admin_tenants_page.titles.kpsuefy')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                         <button
                          onClick={() => handleImpersonate(tenant._id)}
                          className={`p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 transition-colors ${impersonating === tenant._id ? 'opacity-50 cursor-wait' : ''}`}
                          title={t('admin_tenants_page.titles.kwc09eb')}
                          disabled={impersonating === tenant._id}
                        >
                          {impersonating === tenant._id ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(tenant)}
                          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-500 transition-colors"
                          title={t('admin_tenants_page.titles.edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {tenant.isActive ? (
                             <button
                            onClick={() => handleDelete(tenant._id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                            title={t('admin_tenants_page.titles.kowudxe')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                             <button
                             disabled
                            className="p-2 rounded-lg text-gray-300 cursor-not-allowed"
                            title={t('admin_tenants_page.titles.ksiejja')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ... (keep pagination) ... */}
        </Card>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <Modal
          title={t('admin_tenants_page.titles.kud9vou')}
          onClose={() => setShowDetailsModal(false)}
          size="xl"
        >
          {detailsLoading || !selectedTenant ? (
             <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="app-surface-muted p-4 border-none">
                   <p className="text-xs text-gray-500 mb-1">{t('admin_tenants_page.ui.kflwesj')}</p>
                   <p className="text-lg font-bold text-primary-600">{selectedTenant.stats?.revenue?.toLocaleString()} د.ك</p>
                </Card>
                <Card className="app-surface-muted p-4 border-none">
                   <p className="text-xs text-gray-500 mb-1">{t('admin_tenants_page.ui.ki77kph')}</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.invoices}</p>
                </Card>
                <Card className="app-surface-muted p-4 border-none">
                   <p className="text-xs text-gray-500 mb-1">{t('admin_tenants_page.ui.kzgg8kr')}</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.customers}</p>
                </Card>
                <Card className="app-surface-muted p-4 border-none">
                   <p className="text-xs text-gray-500 mb-1">{t('admin_tenants_page.ui.ks0nri5')}</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.products}</p>
                </Card>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {t('admin_tenants_page.ui.kixqp98')}
                </h3>
                <div className="app-surface-muted p-4 rounded-xl space-y-2 text-sm border border-gray-100/80 dark:border-white/10">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin_tenants_page.ui.k6h1f5v')}</span>
                      <span className="font-semibold">{selectedTenant.tenant?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin_tenants_page.ui.kha5uwp')}</span>
                      <span className="font-semibold">{selectedTenant.users?.find(u => u.role === 'admin')?.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin_tenants_page.ui.kz9atp6')}</span>
                      <span className="font-semibold">{selectedTenant.tenant?.businessInfo?.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('admin_tenants_page.ui.kxoo6rn')}</span>
                      <span className="font-semibold">{selectedTenant.tenant?.businessInfo?.address || '-'}</span>
                    </div>
                </div>
              </div>

              {/* Branches List */}
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  الفروع ({selectedTenant.branches?.length || 0})
                </h3>
                <div className="app-surface rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="app-surface-muted">
                      <tr>
                        <th className="p-3 text-right">{t('admin_tenants_page.ui.kovdol8')}</th>
                        <th className="p-3 text-right">{t('admin_tenants_page.ui.kovec2i')}</th>
                        <th className="p-3 text-right">{t('admin_tenants_page.ui.kaaxbgy')}</th>
                        <th className="p-3 text-right">{t('admin_tenants_page.ui.kabct8k')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedTenant.branches?.length > 0 ? (
                        selectedTenant.branches.map(branch => (
                          <tr key={branch._id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                            <td className="p-3 font-medium">{branch.name}</td>
                            <td className="p-3 text-gray-500">{branch.type === 'physical' ? t('admin_tenants_page.ui.kde7tmz') : 'متجر إلكتروني'}</td>
                            <td className="p-3">{branch.managerName || '-'}</td>
                            <td className="p-3">
                              <Badge variant={branch.isActive ? 'success' : 'danger'} size="sm">
                                {branch.isActive ? t('admin_tenants_page.ui.ky62x') : 'معطل'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-4">
                            <EmptyState
                              icon={Building2}
                              title={t('admin_tenants_page.titles.k53qou2')}
                              description="لم يتم إضافة أي فروع لهذا المتجر حتى الآن."
                              className="py-4"
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editId ? t('admin_tenants_page.ui.klyokz1') : 'إضافة متجر جديد'}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <div className="space-y-4">
            {editId ? (
              // Edit Mode
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.kcmv4b6')}</label>
                  <Input
                    placeholder={t('admin_tenants_page.placeholders.kcmv4b6')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.kabct8k')}</label>
                  <select
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                    className="app-surface w-full px-4 py-2.5 rounded-xl border border-transparent focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="active">{t('admin_tenants_page.ui.ky62x')}</option>
                    <option value="inactive">{t('admin_tenants_page.ui.kteqgx')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.kabg07x')}</label>
                  <select
                    value={form.subscription?.plan || 'free'}
                    onChange={(e) => setForm({
                      ...form,
                      subscription: { ...form.subscription, plan: e.target.value }
                    })}
                    className="app-surface w-full px-4 py-2.5 rounded-xl border border-transparent focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="free">{t('admin_tenants_page.ui.kpbg75w')}</option>
                    <option value="basic">{t('admin_tenants_page.ui.kosvnfy')}</option>
                    <option value="professional">{t('admin_tenants_page.ui.kog08ub')}</option>
                    <option value="enterprise">{t('admin_tenants_page.ui.kpbbbpn')}</option>
                  </select>
                </div>
              </>
            ) : (
              // Create Mode
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.k3xjchk')}</label>
                  <Input
                    placeholder={t('admin_tenants_page.placeholders.kct4y2d')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.k3wbnqn')}</label>
                    <Input
                      placeholder={t('admin_tenants_page.placeholders.knbivgi')}
                      value={form.ownerName}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.kfwvg4x')}</label>
                    <Input
                      placeholder="01012345678"
                      value={form.ownerPhone}
                      onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.k5i9cvu')}</label>
                  <Input
                    type="email"
                    placeholder="vendor@example.com"
                    value={form.ownerEmail}
                    onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.k81krw3')}</label>
                  <Input
                    type="password"
                    placeholder="8 أحرف على الأقل"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('admin_tenants_page.ui.k98sbxd')}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">{t('admin_tenants_page.ui.kabg07x')}</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="app-surface w-full px-4 py-2.5 rounded-xl border border-transparent focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="free">{t('admin_tenants_page.ui.kpbg75w')}</option>
                    <option value="basic">{t('admin_tenants_page.ui.kosvnfy')}</option>
                    <option value="professional">{t('admin_tenants_page.ui.kog08ub')}</option>
                    <option value="enterprise">{t('admin_tenants_page.ui.kpbbbpn')}</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} loading={saving} className="flex-1">
                {editId ? t('admin_tenants_page.ui.km6ld24') : 'إنشاء المتجر'}
              </Button>
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
                {t('admin_tenants_page.ui.cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
