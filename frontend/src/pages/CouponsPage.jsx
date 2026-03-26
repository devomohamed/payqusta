import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Copy, CheckCircle, Clock, XCircle, RefreshCw, Percent, DollarSign } from 'lucide-react';
import { couponsApi } from '../store';
import { useThemeStore } from '../store';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useTranslation } from 'react-i18next';

const typeIcons = { percentage: Percent, fixed: DollarSign };

const getTypeLabel = (type, t) => (type === 'percentage' ? t('coupons_page.ui.krxrj70') : t('coupons_page.ui.kbsv4yt'));

function CouponForm({ coupon, onSave, onCancel }) {
  const { t } = useTranslation('admin');
  const { dark } = useThemeStore();
  const [form, setForm] = useState(coupon || {
    code: '',
    description: '',
    type: 'percentage',
    value: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    usagePerCustomer: '1',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.code || !form.value || !form.type) {
      notify.error(t('coupons_page.toasts.khxwqj6'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: parseFloat(form.value),
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        usagePerCustomer: parseInt(form.usagePerCustomer) || 1,
        startDate: form.startDate || undefined,
        endDate: form.endDate || null,
        isActive: form.isActive,
      };

      if (coupon?._id) {
        await couponsApi.update(coupon._id, payload);
        notify.success(t('coupons_page.toasts.kgkb3sk'));
      } else {
        await couponsApi.create(payload);
        notify.success(t('coupons_page.toasts.kdmj6u8'));
      }
      onSave();
    } catch (err) {
      notify.error(err.response?.data?.message || t('coupons_page.toasts.kg6ghax'));
    }
    setLoading(false);
  };

  const inputClass = 'app-surface w-full px-3 py-2.5 rounded-xl border border-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition';

  const labelClass = 'block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t('coupons_page.ui.k4i6wd1')}</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder={t('coupons_page.placeholders.k7r56l2')}
            disabled={!!coupon?._id}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.ksexra6')}</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inputClass}
          >
            <option value="percentage">{t('coupons_page.ui.kimn4qo')}</option>
            <option value="fixed">{t('coupons_page.ui.kvfnu4t')}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.k3ytlxl')}</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder={form.type === 'percentage' ? '20' : '50'}
            min="0"
            max={form.type === 'percentage' ? '100' : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.k9tcck8')}</label>
          <input
            type="number"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            placeholder="0"
            min="0"
            className={inputClass}
          />
        </div>
        {form.type === 'percentage' && (
          <div>
            <label className={labelClass}>{t('coupons_page.ui.knmjl6p')}</label>
            <input
              type="number"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
              placeholder={t('coupons_page.placeholders.kuimu8z')}
              min="0"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>{t('coupons_page.ui.kqs40bm')}</label>
          <input
            type="number"
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            placeholder={t('coupons_page.placeholders.ksz808h')}
            min="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.ktem48n')}</label>
          <input
            type="number"
            value={form.usagePerCustomer}
            onChange={(e) => setForm({ ...form, usagePerCustomer: e.target.value })}
            min="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.kwnsh5m')}</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('coupons_page.ui.khxljbv')}</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('coupons_page.ui.koddaic')}</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={t('coupons_page.placeholders.ktrf7wk')}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {t('coupons_page.ui.kjylzhp')}
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSubmit} loading={loading} className="flex-1">
          {coupon?._id ? t('coupons_page.ui.ki338q7') : 'إنشاء الكوبون'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-6">{t('coupons_page.ui.cancel')}</Button>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const { t } = useTranslation('admin');
  const { dark } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [couponsRes, statsRes] = await Promise.all([
        couponsApi.getAll(),
        couponsApi.getStats(),
      ]);
      setCoupons(couponsRes.data.data.coupons || []);
      setStats(statsRes.data.data);
    } catch {
      notify.error(t('coupons_page.toasts.kym9m98'));
    }
    setLoading(false);
  };

  const handleDelete = (id, code) => {
    notify.custom({
      title: t('coupons_page.ui.keiea8u'),
      message: `هل أنت متأكد من حذف كوبون "${code}"؟`,
      type: 'warning',
      actions: [
        {
          label: t('coupons_page.ui.kxnge'),
          onClick: async () => {
            try {
              await couponsApi.delete(id);
              notify.success(t('coupons_page.toasts.kq7t4kd'));
              loadData();
            } catch {
              notify.error(t('coupons_page.toasts.kpndy7i'));
            }
          },
          style: 'danger',
        },
        { label: t('coupons_page.ui.kouah6d'), onClick: () => { }, style: 'secondary' },
      ],
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    notify.success(`تم نسخ الكود: ${code}`);
  };

  const isExpired = (coupon) => coupon.endDate && new Date(coupon.endDate) < new Date();
  const isActive = (coupon) => coupon.isActive && !isExpired(coupon);

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      {/* Header */}
      <div className="app-surface-muted flex items-center justify-between rounded-3xl p-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary-500" />
            {t('coupons_page.ui.kh1et97')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('coupons_page.ui.kiggnfa')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} icon={<RefreshCw className="w-4 h-4" />} variant="outline">{t('coupons_page.ui.update')}</Button>
          <Button onClick={() => { setEditCoupon(null); setShowForm(true); }} icon={<Plus className="w-4 h-4" />}>
            {t('coupons_page.ui.kx3iebr')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-primary-500">{stats.total || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('coupons_page.ui.ks2n2bu')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-green-500">{stats.active || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('coupons_page.ui.ktf9q8')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-blue-500">{stats.totalUsages || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('coupons_page.ui.k6ptqs1')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-amber-500">{stats.totalSavings?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('coupons_page.ui.k7obolm')}</p>
          </Card>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="app-surface p-5 rounded-3xl">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-500" />
            {editCoupon ? t('coupons_page.ui.ktgiyci') : 'إنشاء كوبون جديد'}
          </h3>
          <CouponForm
            coupon={editCoupon}
            onSave={() => { setShowForm(false); setEditCoupon(null); loadData(); }}
            onCancel={() => { setShowForm(false); setEditCoupon(null); }}
          />
        </Card>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : coupons.length === 0 ? (
        <Card className="app-surface-muted p-10 text-center rounded-3xl">
          <Tag className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('coupons_page.ui.kxjpxds')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('coupons_page.ui.kfyra4d')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => {
            const TypeIcon = typeIcons[coupon.type] || Tag;
            const active = isActive(coupon);
            const expired = isExpired(coupon);

            return (
              <Card key={coupon._id} className="app-surface p-4 rounded-3xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'app-surface-muted text-gray-400'
                      }`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-lg text-gray-900 dark:text-white tracking-wider">{coupon.code}</p>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 text-gray-400 hover:text-primary-500 transition"
                          title={t('coupons_page.titles.ktmhxf6')}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{coupon.description || getTypeLabel(coupon.type, t)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : expired
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'app-surface-muted text-gray-500'
                    }`}>
                    {active ? <><CheckCircle className="w-3 h-3" /> نشط</> : expired ? <><XCircle className="w-3 h-3" /> منتهي</> : <><XCircle className="w-3 h-3" /> معطل</>}
                  </span>
                </div>

                <div className="app-surface-muted rounded-xl p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('coupons_page.ui.kovdttt')}</p>
                      <p className="font-black text-primary-600 dark:text-primary-400">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} ج.م`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('coupons_page.ui.kvoyhsw')}</p>
                      <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                        {coupon.usageCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : '/ ∞'}
                      </p>
                    </div>
                    {coupon.minOrderAmount > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('coupons_page.ui.k9nku4t')}</p>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{coupon.minOrderAmount} ج.م</p>
                      </div>
                    )}
                    {coupon.endDate && (
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('coupons_page.ui.kpenu1d')}</p>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                          {new Date(coupon.endDate).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditCoupon(coupon); setShowForm(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await couponsApi.update(coupon._id, { isActive: !coupon.isActive });
                        notify.success(coupon.isActive ? t('coupons_page.ui.kifu65d') : t('coupons_page.ui.knx2411'));
                        loadData();
                      } catch { notify.error(t('coupons_page.toasts.k1mzp4v')); }
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${coupon.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                      }`}
                  >
                    {coupon.isActive ? <><XCircle className="w-3.5 h-3.5" /> تعطيل</> : <><CheckCircle className="w-3.5 h-3.5" /> تفعيل</>}
                  </button>
                  <button
                    onClick={() => handleDelete(coupon._id, coupon.code)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
