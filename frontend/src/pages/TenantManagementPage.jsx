import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Plus, Search, Edit2, Trash2, MapPin, Phone,
  Calendar, ChevronDown, ChevronUp, Store, Mail, Package, ShoppingCart, X, Key, Eye, EyeOff, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, superAdminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';

export default function TenantManagementPage() {
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
      toast.error('خطأ في تحميل المتاجر');
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
      toast.success('تم حذف المتجر بنجاح');
      setTenants(tenants.filter(t => t._id !== tenantToDelete.id));
      setShowDeleteConfirmModal(false);
      setTenantToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في الحذف');
    }
  };

  const handleAddBranch = async () => {
    if (!branchForm.name) {
      return toast.error('اسم الفرع مطلوب');
    }

    try {
      await adminApi.createBranch({
        ...branchForm,
        tenantId: selectedTenantForBranch._id
      });
      toast.success('تم إضافة الفرع بنجاح');
      setShowAddBranchModal(false);
      setBranchForm({ name: '', address: '', phone: '' });
      setSelectedTenantForBranch(null);
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
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
            <h1 className="text-2xl font-extrabold">إدارة المتاجر والفروع</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTenants.length} متجر إجمالاً
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateTenantModal(true)} icon={<Plus className="w-4 h-4" />}>
          إنشاء متجر جديد
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="بحث عن متجر..."
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
          title={search ? 'لا توجد نتائج' : 'لا توجد متاجر'}
          description={search ? 'جرب تغيير كلمة البحث' : 'ابدأ بإنشاء متجر جديد'}
          action={<Button onClick={() => setShowCreateTenantModal(true)} icon={<Plus className="w-4 h-4" />}>إنشاء متجر</Button>}
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
                      {tenant.isActive ? 'نشط' : 'معطل'}
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
                      فرع
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
                      title="تفاصيل المالك"
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
                      <span className="text-xs text-gray-500">الفروع</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.branches?.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-gray-500">العملاء</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.stats?.customers || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-gray-500">المنتجات</span>
                    </div>
                    <p className="text-lg font-bold mt-1">{tenant.stats?.products || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-500">الفواتير</span>
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
                      معلومات المالك
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">الاسم</p>
                        <p className="font-bold">{tenant.owner?.name || 'غير محدد'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">البريد الإلكتروني</p>
                        <p className="font-bold text-sm">{tenant.owner?.email || 'غير محدد'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">رقم الهاتف</p>
                        <p className="font-bold">{tenant.owner?.phone || 'غير محدد'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">الصلاحية</p>
                        <Badge variant="info">{tenant.owner?.role || 'admin'}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Information */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        معلومات الاشتراك
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
                        تعديل وتفعيل
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">الخطة</p>
                        <Badge variant={
                          tenant.subscription?.plan === 'pro' ? 'success' :
                            tenant.subscription?.plan === 'basic' ? 'info' : 'default'
                        }>
                          {tenant.subscription?.plan === 'free' ? 'مجاني' :
                            tenant.subscription?.plan === 'basic' ? 'أساسي' :
                              tenant.subscription?.plan === 'pro' ? 'احترافي' : 'مجاني'}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">الحالة</p>
                        <Badge variant={tenant.subscription?.status === 'active' ? 'success' : 'warning'}>
                          {tenant.subscription?.status === 'active' ? 'نشط' :
                            tenant.subscription?.status === 'trial' ? 'تجريبي' : 'معلق'}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</p>
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
                                <p className="text-xs text-gray-500">المدير</p>
                                <p className="text-xs font-medium">{branch.manager.name}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm mb-3">لا توجد فروع لهذا المتجر</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTenantForBranch(tenant);
                            setShowAddBranchModal(true);
                          }}
                          icon={<Plus className="w-4 h-4" />}
                        >
                          إضافة فرع
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
        title="إنشاء متجر جديد"
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
              toast.error('جميع الحقول مطلوبة');
              return;
            }

            try {
              await adminApi.createTenant(data);
              toast.success('تم إنشاء المتجر بنجاح');
              setShowCreateTenantModal(false);
              fetchTenants(); // Auto-refresh
            } catch (err) {
              toast.error(err.response?.data?.message || 'حدث خطأ');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold mb-2">اسم المتجر *</label>
            <Input name="name" required placeholder="متجر الإلكترونيات" />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
              بيانات المالك (Owner)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المالك *</label>
                <Input name="ownerName" required placeholder="أحمد محمد" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
                <Input name="ownerEmail" type="email" required placeholder="owner@store.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف *</label>
                <Input name="ownerPhone" required placeholder="01234567890" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
                <Input name="ownerPassword" type="password" required placeholder="********" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الخطة</label>
            <select name="plan" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="free">مجاني</option>
              <option value="basic">أساسي</option>
              <option value="pro">احترافي</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTenantModal(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              إنشاء المتجر
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
            <label className="block text-sm font-bold mb-2">اسم الفرع *</label>
            <Input
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              placeholder="فرع القاهرة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <Input
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              placeholder="شارع الهرم، الجيزة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
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
              إلغاء
            </Button>
            <Button onClick={handleAddBranch}>
              إضافة الفرع
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
        title="تأكيد حذف المتجر"
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
            <h3 className="text-lg font-bold mb-2">هل أنت متأكد من الحذف؟</h3>
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
                جميع الفروع والمواقع
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                جميع المنتجات والمخزون
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                جميع العملاء والحسابات
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                جميع الفواتير والمعاملات
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                جميع المستخدمين والصلاحيات
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
              إلغاء
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              نعم، احذف المتجر
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
        title="تفاصيل المالك"
        size="md"
      >
        {selectedOwner && (
          <div className="space-y-6">
            {/* Owner Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">الاسم</p>
                <p className="font-bold">{selectedOwner.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">البريد الإلكتروني</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm flex-1">{selectedOwner.email}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOwner.email);
                      toast.success('تم النسخ');
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="نسخ"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">رقم الهاتف</p>
                <p className="font-bold">{selectedOwner.phone || 'غير محدد'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-1">الصلاحية</p>
                <Badge variant="info">{selectedOwner.role || 'admin'}</Badge>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Key className="w-4 h-4" />
                إعادة تعيين كلمة المرور
              </h3>

              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3 border border-amber-200 dark:border-amber-500/20 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ سيتم تغيير كلمة المرور فوراً. تأكد من مشاركة كلمة المرور الجديدة مع المالك.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    label="كلمة المرور الجديدة *"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
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
                        return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                      }

                      setResettingPassword(true);
                      try {
                        await adminApi.resetTenantPassword(selectedOwner.tenantId, { password: newPassword });
                        toast.success('تم إعادة تعيين كلمة المرور بنجاح');

                        // Show success message with credentials
                        toast((t) => (
                          <div className="space-y-2">
                            <p className="font-bold">✅ تم التحديث!</p>
                            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              <p><strong>البريد:</strong> {selectedOwner.email}</p>
                              <p><strong>كلمة المرور:</strong> {newPassword}</p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`البريد: ${selectedOwner.email}\nكلمة المرور: ${newPassword}`);
                                toast.success('تم نسخ البيانات');
                              }}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              نسخ البيانات
                            </button>
                          </div>
                        ), { duration: 10000 });
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'حدث خطأ');
                      } finally {
                        setResettingPassword(false);
                      }
                    }}
                    loading={resettingPassword}
                    disabled={!newPassword || newPassword.length < 6}
                    icon={<Key className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {resettingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
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
                إغلاق
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
            يمكنك من هنا تأكيد التحويلات اليدوية (إنستاباي/فودافون كاش) وتفعيل الخطط يدوياً للمتاجر.
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">خطة الاشتراك</label>
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
            <label className="block text-sm font-bold mb-2">الحالة الفورية</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              value={subForm.status}
              onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
            >
              <option value="active">نشط (فعال)</option>
              <option value="trial">تجريبي (Trial)</option>
              <option value="cancelled">ملغى / منتهي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">تاريخ انتهاء الاشتراك</label>
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
              إلغاء
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
                  toast.success('تم تفعيل وتحديث الاشتراك بنجاح!');
                  setShowSubscriptionModal(false);
                  fetchTenants();
                } catch (error) {
                  toast.error(error.response?.data?.message || 'فشل تحديث الاشتراك');
                } finally {
                  setUpdatingSub(false);
                }
              }}
            >
              حفظ وتفعيل
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
