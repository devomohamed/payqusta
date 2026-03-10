import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit, Trash2, MapPin, Phone, User,
  Search, Store, X,
} from 'lucide-react';
import { Button, Input, Card, Modal, EmptyState, Badge, LoadingSpinner } from '../components/UI';
import toast from 'react-hot-toast';
import { api, useAuthStore } from '../store';
import { confirm } from '../components/ConfirmDialog';

export default function BranchManagement() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin;

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', cameras: [] });

  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenants, setTenants] = useState([]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [branchesRes, tenantsRes] = await Promise.all([
        api.get('/branches'),
        isSuperAdmin ? api.get('/admin/tenants?limit=1000') : Promise.resolve({ data: { data: [] } }),
      ]);

      setBranches(branchesRes.data.data.branches || []);

      if (isSuperAdmin) {
        setTenants(tenantsRes.data.data || []);
      }
    } catch (err) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const resetForm = () => {
    setForm({ name: '', address: '', phone: '', cameras: [], tenantId: '' });
    setEditingBranch(null);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('اسم الفرع مطلوب');

    if (isSuperAdmin && !form.tenantId && !editingBranch) {
      return toast.error('يجب اختيار المتجر (Owner)');
    }

    if (form.managerName || form.managerEmail || form.managerPassword || form.managerPhone) {
      if (!form.managerName || !form.managerEmail || !form.managerPhone || (!editingBranch && !form.managerPassword)) {
        return toast.error('يرجى إدخال جميع بيانات المدير (الاسم، البريد، الهاتف، كلمة المرور)');
      }
    }

    try {
      const payload = { ...form };

      if (isSuperAdmin && form.tenantId) {
        payload.tenantId = form.tenantId;
      }

      if (editingBranch) {
        await api.put(`/branches/${editingBranch._id}`, payload);
        toast.success('تم تحديث الفرع');
      } else {
        await api.post('/branches', payload);
        toast.success('تم إضافة الفرع');
      }

      fetchBranches();
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm.delete('هل أنت متأكد من حذف هذا الفرع؟');
    if (!ok) return;

    try {
      await api.delete(`/branches/${id}`);
      toast.success('تم حذف الفرع');
      fetchBranches();
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      cameras: branch.cameras || [],
      tenantId: branch.tenant?._id || '',
      managerName: branch.manager?.name || '',
      managerEmail: branch.manager?.email || '',
      managerPhone: branch.manager?.phone || '',
      managerPassword: '',
    });
    setShowModal(true);
  };

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch = !searchTerm
      || branch.name?.toLowerCase().includes(searchTerm.toLowerCase())
      || branch.address?.toLowerCase().includes(searchTerm.toLowerCase())
      || branch.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTenant = tenantFilter === 'all' || branch.tenant?._id === tenantFilter;

    return matchesSearch && matchesTenant;
  });

  const hasFilters = Boolean(searchTerm) || tenantFilter !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">إدارة الفروع</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredBranches.length} فرع{isSuperAdmin ? ' من جميع المتاجر' : ''}
            </p>
          </div>
        </div>

        <Button
          className="w-full sm:w-auto"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          إضافة فرع
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث عن فرع، عنوان، أو متجر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {isSuperAdmin && tenants.length > 0 && (
            <div className="md:w-64">
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">جميع المتاجر ({branches.length})</option>
                {tenants.map((tenant) => {
                  const count = branches.filter((branch) => branch.tenant?._id === tenant._id).length;
                  return (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
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
          title={hasFilters ? 'لا توجد نتائج' : 'لا توجد فروع'}
          description={hasFilters ? 'جرّب تغيير البحث أو الفلتر الحالي.' : 'أضف أول فرع لبدء تنظيم العمل بين المتاجر والفروع.'}
          action={hasFilters ? {
            label: 'إعادة تعيين الفلاتر',
            onClick: () => {
              setSearchTerm('');
              setTenantFilter('all');
            },
            variant: 'outline',
            size: 'md',
          } : {
            label: 'إضافة فرع',
            onClick: () => {
              resetForm();
              setShowModal(true);
            },
            variant: 'primary',
            size: 'md',
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredBranches.map((branch) => (
            <Card key={branch._id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{branch.name}</h3>
                    <p className="text-xs text-gray-400">
                      {branch.cameras?.length || 0} كاميرا
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    onClick={() => handleEdit(branch)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch._id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {isSuperAdmin && branch.tenant && (
                  <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <Store className="w-4 h-4 text-primary-500" />
                    <Badge variant="primary" className="text-xs">
                      {branch.tenant.name}
                    </Badge>
                  </div>
                )}

                {branch.address && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.manager && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{branch.manager.name}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingBranch ? 'تعديل فرع' : 'إضافة فرع جديد'}
      >
        <div className="space-y-4">
          {isSuperAdmin && !editingBranch && (
            <div>
              <label className="block text-sm font-bold mb-2">المتجر (Owner) *</label>
              <select
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                required
              >
                <option value="">-- اختر المتجر --</option>
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isSuperAdmin && editingBranch && editingBranch.tenant && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">المتجر التابع له:</p>
              <p className="font-bold text-sm">{editingBranch.tenant.name}</p>
            </div>
          )}

          <Input
            label="اسم الفرع *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="فرع القاهرة"
          />
          <Input
            label="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="شارع الهرم، الجيزة"
          />
          <Input
            label="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="01234567890"
          />

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="mb-3 text-sm font-bold">
              {editingBranch ? 'تعديل بيانات مدير الفرع' : 'بيانات مدير الفرع'}
            </h3>
            <div className="space-y-3">
              <Input
                label="اسم المدير"
                value={form.managerName || ''}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                placeholder="أحمد محمد"
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={form.managerEmail || ''}
                onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
                placeholder="manager@branch.com"
              />
              <Input
                label="رقم هاتف المدير"
                value={form.managerPhone || ''}
                onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                placeholder="010xxxxxxx"
              />
              <Input
                label="كلمة المرور"
                type="password"
                value={form.managerPassword || ''}
                onChange={(e) => setForm({ ...form, managerPassword: e.target.value })}
                placeholder={editingBranch ? 'اتركه فارغًا إذا لم ترد التغيير' : '********'}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
