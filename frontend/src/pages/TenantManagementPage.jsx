import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, Plus, Search, Edit2, Trash2, MapPin, Phone,
  Calendar, ChevronDown, ChevronUp, Store, Mail, Package, ShoppingCart, X, Key, Eye, EyeOff, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, superAdminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';

export default function TenantManagementPage() {
  const { t } = useTranslation('admin');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [search, setSearch] = useState('');
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [selectedTenantForBranch, setSelectedTenantForBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [showOwnerDetailsModal, setShowOwnerDetailsModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Subscription Edit States
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedTenantForSub, setSelectedTenantForSub] = useState(null);
  const [subForm, setSubForm] = useState({ plan: '', status: '', endDate: '' });
  const [plans, setPlans] = useState([]);
  const [updatingSub, setUpdatingSub] = useState(false);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTenants({ limit: 1000 });
      setTenants(res.data.data || []);
    } catch (err) {
      toast.error(t('tenant_management_page.toasts.k2djy51'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      // Use superAdminApi if the user is a super admin
      const res = await adminApi.getDashboard(); // just to check, or we can just fetch plans directly
      // Actually we have superAdminApi in store.js
      const plansRes = await superAdminApi.getPlans().catch(() => ({ data: { data: [] } }));
      setPlans(plansRes.data?.data || []);
    } catch (e) {
      console.log('Error fetching plans', e);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, []);

  const handleDeleteTenant = (tenantId, tenantName) => {
    setTenantToDelete({ id: tenantId, name: tenantName });
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;

    try {
      await adminApi.deleteTenant(tenantToDelete.id);
      toast.success(t('tenant_management_page.toasts.ksobfmm'));
      setTenants(tenants.filter(t => t._id !== tenantToDelete.id));
      setShowDeleteConfirmModal(false);
      setTenantToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenant_management_page.toasts.k7z5tzb'));
    }
  };

  const handleAddBranch = async () => {
    if (!branchForm.name) {
      return toast.error(t('tenant_management_page.toasts.kax06lz'));
    }

    try {
      await adminApi.createBranch({
        ...branchForm,
        tenantId: selectedTenantForBranch._id
      });
      toast.success(t('tenant_management_page.toasts.kb0chgn'));
      setShowAddBranchModal(false);
      setBranchForm({ name: '', address: '', phone: '' });
      setSelectedTenantForBranch(null);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || t('tenant_management_page.toasts.ktcqm3h'));
    }
  };

  const toggleExpand = (tenantId) => {
    setExpandedTenant(expandedTenant === tenantId ? null : tenantId);
  };

  const filteredTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{t('tenant_management_page.ui.kaui8or')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTenants.length} متجر إجمالاً
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateTenantModal(true)} icon={<Plus className="w-4 h-4" />}>
          {t('tenant_management_page.ui.kp4vud')}
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('tenant_management_page.placeholders.kmu6lu3')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </Card>

      {/* Tenants List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={search ? t('tenant_management_page.ui.kkcniav') : 'لا توجد متاجر'}
          description={search ? t('tenant_management_page.ui.kevqiyy') : 'ابدأ بإنشاء متجر جديد'}
          action={<Button onClick={() => setShowCreateTenantModal(true)} icon={<Plus className="w-4 h-4" />}>{t('tenant_management_page.ui.kydvknx')}</Button>}
        />
      ) : (
        <div className="space-y-4">
          {filteredTenants.map((tenant) => (
            <Card key={tenant._id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Tenant Header */}
              <div className="p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{tenant.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {tenant.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{tenant.email}</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={tenant.isActive ? 'success' : 'danger'}>
                      {tenant.isActive ? t('tenant_management_page.ui.ky62x') : 'معطل'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTenantForBranch(tenant);
                        setShowAddBranchModal(true);
                      }}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      {t('tenant_management_page.ui.ky2ax')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTenant(tenant._id, tenant.name)}
                      icon={<Trash2 className="w-4 h-4 text-red-500" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOwner({ ...tenant.owner, tenantId: tenant._id });
                        setShowOwnerDetailsModal(true);
                        setNewPassword('');
                        setShowPassword(false);
                      }}
                      icon={<Key className="w-4 h-4 text-blue-500" />}
                      title={t('tenant_management_page.titles.kwkr1rz')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(tenant._id)}
                      icon={expandedTenant === tenant._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-500">{t('tenant_management_page.ui.kaaztz6')}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.branches?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-gray-500">{t('tenant_management_page.ui.kzgg8kr')}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.stats?.customers || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-gray-500">{t('tenant_management_page.ui.ks0nri5')}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.stats?.products || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-500">{t('tenant_management_page.ui.ktvslhu')}</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.stats?.invoices || 0}</p>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedTenant === tenant._id && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 p-6 space-y-6">
                  {/* Owner Information */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {t('tenant_management_page.ui.kh2gsi6')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kovdol8')}</p>
                        <p className="font-bold">{tenant.owner?.name || t('tenant_management_page.toasts.k5xt5xj')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.k8lvosz')}</p>
                        <p className="font-bold text-sm">{tenant.owner?.email || t('tenant_management_page.toasts.k5xt5xj')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.k3pahhc')}</p>
                        <p className="font-bold">{tenant.owner?.phone || t('tenant_management_page.toasts.k5xt5xj')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kzekvld')}</p>
                        <Badge variant="info">{tenant.owner?.role || 'admin'}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Information */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {t('tenant_management_page.ui.kjbezk3')}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTenantForSub(tenant);
                          setSubForm({
                            plan: typeof tenant.subscription?.plan === 'object' ? tenant.subscription?.plan?._id : (tenant.subscription?.plan || ''),
                            status: tenant.subscription?.status || 'trial',
                            endDate: tenant.subscription?.trialEndsAt
                              ? new Date(tenant.subscription.trialEndsAt).toISOString().split('T')[0]
                              : ''
                          });
                          setShowSubscriptionModal(true);
                        }}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        {t('tenant_management_page.ui.kxuatie')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kovdtur')}</p>
                        <Badge variant={
                          tenant.subscription?.plan === 'pro' ? 'success' :
                            tenant.subscription?.plan === 'basic' ? 'info' : 'default'
                        }>
                          {tenant.subscription?.plan === 'free' ? t('tenant_management_page.ui.kpbg75w') :
                            tenant.subscription?.plan === 'basic' ? t('tenant_management_page.ui.kosvnfy') :
                              tenant.subscription?.plan === 'pro' ? t('tenant_management_page.ui.kog08ub') : 'مجاني'}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kabct8k')}</p>
                        <Badge variant={tenant.subscription?.status === 'active' ? 'success' : 'warning'}>
                          {tenant.subscription?.status === 'active' ? t('tenant_management_page.ui.ky62x') :
                            tenant.subscription?.status === 'trial' ? t('tenant_management_page.ui.k99br1f') : 'معلق'}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.khxljbv')}</p>
                        <p className="font-bold text-sm">
                          {tenant.subscription?.trialEndsAt
                            ? new Date(tenant.subscription.trialEndsAt).toLocaleDateString('ar-EG')
                            : 'غير محدد'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Branches */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      الفروع ({tenant.branches?.length || 0})
                    </h4>

                    {tenant.branches && tenant.branches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tenant.branches.map((branch) => (
                          <div key={branch._id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                            <h5 className="font-bold text-sm mb-2 flex items-center gap-2">
                              <Store className="w-4 h-4 text-blue-500" />
                              {branch.name}
                            </h5>
                            {branch.address && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <MapPin className="w-3 h-3" />
                                <span>{branch.address}</span>
                              </div>
                            )}
                            {branch.phone && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />
                                <span>{branch.phone}</span>
                              </div>
                            )}
                            {branch.manager && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs text-gray-500">{t('tenant_management_page.ui.kaaxbgy')}</p>
                                <p className="text-xs font-medium">{branch.manager.name}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-3">{t('tenant_management_page.ui.k2ehbjk')}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTenantForBranch(tenant);
                            setShowAddBranchModal(true);
                          }}
                          icon={<Plus className="w-4 h-4" />}
                        >
                          {t('tenant_management_page.ui.km2iaqh')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Tenant Modal */}
      <Modal
        open={showCreateTenantModal}
        onClose={() => setShowCreateTenantModal(false)}
        title={t('tenant_management_page.titles.kp4vud')}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              ownerName: formData.get('ownerName'),
              ownerEmail: formData.get('ownerEmail'),
              ownerPhone: formData.get('ownerPhone'),
              ownerPassword: formData.get('ownerPassword'),
              plan: formData.get('plan') || 'free',
            };

            if (!data.name || !data.ownerName || !data.ownerEmail || !data.ownerPhone || !data.ownerPassword) {
              toast.error(t('tenant_management_page.toasts.kqz3qq7'));
              return;
            }

            try {
              await adminApi.createTenant(data);
              toast.success(t('tenant_management_page.toasts.ks1jdrh'));
              setShowCreateTenantModal(false);
              fetchTenants(); // Auto-refresh
            } catch (err) {
              toast.error(err.response?.data?.message || t('tenant_management_page.toasts.ktcqm3h'));
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold mb-2">{t('tenant_management_page.ui.k3xjchk')}</label>
            <Input name="name" required placeholder={t('tenant_management_page.placeholders.kl26749')} />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
              {t('tenant_management_page.ui.k9y5aqw')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.k3wbnqn')}</label>
                <Input name="ownerName" required placeholder={t('tenant_management_page.placeholders.kpsrhs2')} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.kwhut25')}</label>
                <Input name="ownerEmail" type="email" required placeholder="owner@store.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.k6l9xqi')}</label>
                <Input name="ownerPhone" required placeholder="01234567890" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.kc9pgnr')}</label>
                <Input name="ownerPassword" type="password" required placeholder="********" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.kovdtur')}</label>
            <select name="plan" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="free">{t('tenant_management_page.ui.kpbg75w')}</option>
              <option value="basic">{t('tenant_management_page.ui.kosvnfy')}</option>
              <option value="pro">{t('tenant_management_page.ui.kog08ub')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTenantModal(false)}>
              {t('tenant_management_page.ui.cancel')}
            </Button>
            <Button type="submit">
              {t('tenant_management_page.ui.k19w00q')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Branch Modal */}
      <Modal
        open={showAddBranchModal}
        onClose={() => {
          setShowAddBranchModal(false);
          setBranchForm({ name: '', address: '', phone: '' });
        }}
        title={`إضافة فرع جديد - ${selectedTenantForBranch?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">{t('tenant_management_page.ui.kyfs5an')}</label>
            <Input
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              placeholder={t('tenant_management_page.placeholders.khv84fu')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.kzgfilf')}</label>
            <Input
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              placeholder={t('tenant_management_page.placeholders.kxv175t')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('tenant_management_page.ui.k3pahhc')}</label>
            <Input
              value={branchForm.phone}
              onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
              placeholder="01234567890"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddBranchModal(false);
                setBranchForm({ name: '', address: '', phone: '' });
              }}
            >
              {t('tenant_management_page.ui.cancel')}
            </Button>
            <Button onClick={handleAddBranch}>
              {t('tenant_management_page.ui.kswakcq')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setTenantToDelete(null);
        }}
        title={t('tenant_management_page.titles.kvj4ig6')}
      >
        <div className="space-y-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* Warning Message */}
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">{t('tenant_management_page.ui.kvcctvv')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              سيتم حذف المتجر <span className="font-bold text-red-500">"{tenantToDelete?.name}"</span> نهائياً
            </p>
          </div>

          {/* Items to be deleted */}
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border-2 border-red-200 dark:border-red-500/20">
            <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">⚠️ سيتم حذف:</p>
            <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t('tenant_management_page.ui.ktp6b0g')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t('tenant_management_page.ui.kncy72f')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t('tenant_management_page.ui.kgcemk4')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t('tenant_management_page.ui.kracy5y')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {t('tenant_management_page.ui.k2p0a7u')}
              </li>
            </ul>
          </div>

          {/* Warning Note */}
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              🔒 هذا الإجراء لا يمكن التراجع عنه ولن تتمكن من استعادة البيانات المحذوفة
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setTenantToDelete(null);
              }}
              className="flex-1"
            >
              {t('tenant_management_page.ui.cancel')}
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {t('tenant_management_page.ui.kgk1tpy')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Owner Details Modal */}
      <Modal
        open={showOwnerDetailsModal}
        onClose={() => {
          setShowOwnerDetailsModal(false);
          setSelectedOwner(null);
          setNewPassword('');
          setShowPassword(false);
        }}
        title={t('tenant_management_page.titles.kwkr1rz')}
        size="md"
      >
        {selectedOwner && (
          <div className="space-y-6">
            {/* Owner Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kovdol8')}</p>
                <p className="font-bold">{selectedOwner.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.k8lvosz')}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm flex-1">{selectedOwner.email}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOwner.email);
                      toast.success(t('tenant_management_page.toasts.kwttjpd'));
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title={t('tenant_management_page.titles.ky61t')}
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.k3pahhc')}</p>
                <p className="font-bold">{selectedOwner.phone || t('tenant_management_page.toasts.k5xt5xj')}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">{t('tenant_management_page.ui.kzekvld')}</p>
                <Badge variant="info">{selectedOwner.role || 'admin'}</Badge>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t('tenant_management_page.ui.k75ko9b')}
              </h3>

              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ سيتم تغيير كلمة المرور فوراً. تأكد من مشاركة كلمة المرور الجديدة مع المالك.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    label={t('tenant_management_page.form.krlnyzf')}
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('tenant_management_page.placeholders.k46m4as')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-[38px] p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!newPassword || newPassword.length < 6) {
                        return toast.error(t('tenant_management_page.toasts.k7t8uub'));
                      }

                      setResettingPassword(true);
                      try {
                        await adminApi.resetTenantPassword(selectedOwner.tenantId, { password: newPassword });
                        toast.success(t('tenant_management_page.toasts.kuagd4w'));

                        // Show success message with credentials
                        toast((t) => (
                          <div className="space-y-2">
                            <p className="font-bold">✅ تم التحديث!</p>
                            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              <p><strong>{t('tenant_management_page.ui.kzayn1r')}</strong> {selectedOwner.email}</p>
                              <p><strong>{t('tenant_management_page.ui.kyrk7bh')}</strong> {newPassword}</p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`البريد: ${selectedOwner.email}\nكلمة المرور: ${newPassword}`);
                                toast.success(t('tenant_management_page.toasts.kqfoomz'));
                              }}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {t('tenant_management_page.ui.kag1g80')}
                            </button>
                          </div>
                        ), { duration: 10000 });
                      } catch (err) {
                        toast.error(err.response?.data?.message || t('tenant_management_page.toasts.ktcqm3h'));
                      } finally {
                        setResettingPassword(false);
                      }
                    }}
                    loading={resettingPassword}
                    disabled={!newPassword || newPassword.length < 6}
                    icon={<Key className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {resettingPassword ? t('tenant_management_page.ui.kgnvsl2') : 'تحديث كلمة المرور'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowOwnerDetailsModal(false);
                  setSelectedOwner(null);
                  setNewPassword('');
                  setShowPassword(false);
                }}
              >
                {t('tenant_management_page.ui.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Subscription Manual Edit Modal */}
      <Modal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title={`إدارة تفعيل الاشتراك - ${selectedTenantForSub?.name}`}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
            {t('tenant_management_page.ui.kt1t38m')}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('tenant_management_page.ui.kn1tb8z')}</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              value={subForm.plan}
              onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
            >
              <option value="">-- كود الخطة القديم أو غير محدد --</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('tenant_management_page.ui.k2t5760')}</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              value={subForm.status}
              onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
            >
              <option value="active">{t('tenant_management_page.ui.k4xb9dv')}</option>
              <option value="trial">{t('tenant_management_page.ui.kwcp0a0')}</option>
              <option value="cancelled">{t('tenant_management_page.ui.kpx45rd')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('tenant_management_page.ui.ky9evcf')}</label>
            <Input
              type="date"
              value={subForm.endDate}
              onChange={(e) => setSubForm({ ...subForm, endDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowSubscriptionModal(false)}
            >
              {t('tenant_management_page.ui.cancel')}
            </Button>
            <Button
              loading={updatingSub}
              onClick={async () => {
                setUpdatingSub(true);
                try {
                  const updatedSubscription = {
                    ...selectedTenantForSub.subscription,
                    plan: subForm.plan || selectedTenantForSub.subscription?.plan,
                    status: subForm.status,
                    trialEndsAt: subForm.endDate ? new Date(subForm.endDate) : null
                  };

                  await superAdminApi.updateTenant(selectedTenantForSub._id, {
                    subscription: updatedSubscription
                  });
                  toast.success(t('tenant_management_page.toasts.kpbnasy'));
                  setShowSubscriptionModal(false);
                  fetchTenants();
                } catch (error) {
                  toast.error(error.response?.data?.message || t('tenant_management_page.toasts.kcqbilr'));
                } finally {
                  setUpdatingSub(false);
                }
              }}
            >
              {t('tenant_management_page.ui.ksr64og')}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
