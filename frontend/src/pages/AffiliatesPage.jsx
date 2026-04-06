import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Edit2, Link2, Plus, Share2, TrendingUp, UserRound, Users } from 'lucide-react';
import { affiliatesApi, useAuthStore } from '../store';
import { Badge, Button, Card, LoadingSpinner, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useTranslation } from 'react-i18next';
import { getStorefrontDomainUrl } from '../utils/storefrontHost';

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-primary-50 p-3 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function normalizeAffiliateCode(value = '') {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function AffiliateFormModal({ open, affiliate, onClose, onSubmit, t }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    commissionType: 'percentage',
    commissionValue: 10,
    status: 'active',
    payoutMethod: '',
    payoutDetails: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: affiliate?.name || '',
      code: affiliate?.code || '',
      email: affiliate?.email || '',
      phone: affiliate?.phone || '',
      commissionType: affiliate?.commissionType || 'percentage',
      commissionValue: affiliate?.commissionValue ?? 10,
      status: affiliate?.status || 'active',
      payoutMethod: affiliate?.payoutMethod || '',
      payoutDetails: affiliate?.payoutDetails || '',
      notes: affiliate?.notes || '',
    });
  }, [affiliate, open]);

  const inputClass = 'app-surface w-full rounded-xl border border-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20';
  const labelClass = 'mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400';

  const handleSave = async () => {
    if (!form.name.trim()) {
      notify.error(t('affiliate_page.fields.name'));
      return;
    }
    const code = normalizeAffiliateCode(form.code || form.name);
    if (!code) {
      notify.error(t('affiliate_page.fields.code'));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...form,
        code,
        commissionValue: Number(form.commissionValue || 0),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={affiliate?._id ? t('affiliate_page.edit_affiliate') : t('affiliate_page.new_affiliate')} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.name')}</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.code')}</label>
            <input className={inputClass} value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: normalizeAffiliateCode(e.target.value) }))} />
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.email')}</label>
            <input className={inputClass} value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.phone')}</label>
            <input className={inputClass} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.commission_type')}</label>
            <select className={inputClass} value={form.commissionType} onChange={(e) => setForm((prev) => ({ ...prev, commissionType: e.target.value }))}>
              <option value="percentage">{t('affiliate_page.commission_type.percentage')}</option>
              <option value="fixed">{t('affiliate_page.commission_type.fixed')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.commission_value')}</label>
            <input type="number" className={inputClass} value={form.commissionValue} onChange={(e) => setForm((prev) => ({ ...prev, commissionValue: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.status')}</label>
            <select className={inputClass} value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="pending">{t('affiliate_page.status.pending')}</option>
              <option value="active">{t('affiliate_page.status.active')}</option>
              <option value="suspended">{t('affiliate_page.status.suspended')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('affiliate_page.fields.payout_method')}</label>
            <select className={inputClass} value={form.payoutMethod} onChange={(e) => setForm((prev) => ({ ...prev, payoutMethod: e.target.value }))}>
              <option value="">{t('affiliate_page.payout_method.none')}</option>
              <option value="bank_transfer">{t('affiliate_page.payout_method.bank_transfer')}</option>
              <option value="wallet">{t('affiliate_page.payout_method.wallet')}</option>
              <option value="cash">{t('affiliate_page.payout_method.cash')}</option>
              <option value="manual">{t('affiliate_page.payout_method.manual')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>{t('affiliate_page.fields.payout_details')}</label>
          <textarea className={`${inputClass} min-h-[90px]`} value={form.payoutDetails} onChange={(e) => setForm((prev) => ({ ...prev, payoutDetails: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>{t('affiliate_page.fields.notes')}</label>
          <textarea className={`${inputClass} min-h-[120px]`} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {affiliate?._id ? t('affiliate_page.actions.update') : t('affiliate_page.actions.create')}
          </Button>
          <Button variant="outline" onClick={onClose}>{t('affiliate_page.actions.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AffiliatesPage() {
  const { t } = useTranslation('admin');
  const tenant = useAuthStore((state) => state.tenant);
  const [affiliates, setAffiliates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [conversions, setConversions] = useState([]);
  const [conversionsLoading, setConversionsLoading] = useState(false);

  const storefrontBaseUrl = useMemo(() => getStorefrontDomainUrl(tenant?.slug), [tenant?.slug]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        affiliatesApi.getAll(),
        affiliatesApi.getStats(),
      ]);
      setAffiliates(listRes.data.data?.affiliates || []);
      setStats(statsRes.data.data || {});
    } catch (error) {
      notify.error(error.response?.data?.message || t('affiliate_page.toasts.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusLabel = (status) => t(`affiliate_page.status.${status || 'pending'}`);
  const getStatusVariant = (status) => {
    if (status === 'active' || status === 'approved') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'paid') return 'primary';
    if (status === 'suspended' || status === 'reversed') return 'danger';
    return 'gray';
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingAffiliate?._id) {
        await affiliatesApi.update(editingAffiliate._id, payload);
        notify.success(t('affiliate_page.toasts.update_success'));
      } else {
        await affiliatesApi.create(payload);
        notify.success(t('affiliate_page.toasts.create_success'));
      }
      setFormOpen(false);
      setEditingAffiliate(null);
      loadData();
    } catch (error) {
      notify.error(error.response?.data?.message || t('affiliate_page.toasts.save_failed'));
    }
  };

  const handleCopyLink = async (affiliate) => {
    const link = `${storefrontBaseUrl}?aff=${encodeURIComponent(affiliate.code)}`;
    await navigator.clipboard.writeText(link);
    notify.success(t('affiliate_page.toasts.copy_success'));
  };

  const handleToggleStatus = async (affiliate) => {
    const nextStatus = affiliate.status === 'active' ? 'suspended' : 'active';
    try {
      await affiliatesApi.updateStatus(affiliate._id, nextStatus);
      notify.success(t('affiliate_page.toasts.status_updated'));
      loadData();
    } catch (error) {
      notify.error(error.response?.data?.message || t('affiliate_page.toasts.save_failed'));
    }
  };

  const handleViewConversions = async (affiliate) => {
    setSelectedAffiliate(affiliate);
    setConversionsLoading(true);
    try {
      const response = await affiliatesApi.getConversions(affiliate._id);
      setConversions(response.data.data?.conversions || []);
    } catch (error) {
      notify.error(error.response?.data?.message || t('affiliate_page.toasts.conversions_failed'));
      setConversions([]);
    } finally {
      setConversionsLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('affiliate_page.title')}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('affiliate_page.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingAffiliate(null); setFormOpen(true); }} className="gap-2 self-start">
          <Plus className="h-4 w-4" />
          {t('affiliate_page.new_affiliate')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t('affiliate_page.stats.total_affiliates')} value={stats?.totalAffiliates || 0} />
        <StatCard icon={TrendingUp} label={t('affiliate_page.stats.total_conversions')} value={stats?.totalConversions || 0} />
        <StatCard icon={DollarSign} label={t('affiliate_page.stats.revenue_attributed')} value={(stats?.revenueAttributed || 0).toLocaleString()} />
        <StatCard icon={Share2} label={t('affiliate_page.stats.pending_commission')} value={(stats?.pendingCommission || 0).toLocaleString()} />
      </div>

      <Card className="rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">{t('affiliate_page.list_title')}</h2>
          <span className="text-xs font-bold text-gray-400">{affiliates.length}</span>
        </div>

        {affiliates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            {t('affiliate_page.empty')}
          </div>
        ) : (
          <div className="space-y-4">
            {affiliates.map((affiliate) => {
              const link = `${storefrontBaseUrl}?aff=${encodeURIComponent(affiliate.code)}`;
              return (
                <div key={affiliate._id} className="app-surface-muted rounded-2xl p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-gray-900 dark:text-white">{affiliate.name}</p>
                        <Badge variant={getStatusVariant(affiliate.status)}>{getStatusLabel(affiliate.status)}</Badge>
                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                          {affiliate.code}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        {affiliate.email ? <span>{affiliate.email}</span> : null}
                        {affiliate.phone ? <span>{affiliate.phone}</span> : null}
                        <span>
                          {affiliate.commissionType === 'fixed'
                            ? `${affiliate.commissionValue} EGP`
                            : `${affiliate.commissionValue}%`}
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400" dir="ltr">
                        {link}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button variant="outline" onClick={() => handleCopyLink(affiliate)} className="gap-2">
                        <Link2 className="h-4 w-4" />
                        {t('affiliate_page.actions.copy_link')}
                      </Button>
                      <Button variant="outline" onClick={() => handleViewConversions(affiliate)} className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {t('affiliate_page.actions.view_conversions')}
                      </Button>
                      <Button variant="outline" onClick={() => { setEditingAffiliate(affiliate); setFormOpen(true); }} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        {t('affiliate_page.actions.edit')}
                      </Button>
                      <Button variant="outline" onClick={() => handleToggleStatus(affiliate)} className="gap-2">
                        <UserRound className="h-4 w-4" />
                        {affiliate.status === 'active' ? t('affiliate_page.actions.suspend') : t('affiliate_page.actions.activate')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AffiliateFormModal
        open={formOpen}
        affiliate={editingAffiliate}
        onClose={() => { setFormOpen(false); setEditingAffiliate(null); }}
        onSubmit={handleSubmit}
        t={t}
      />

      <Modal open={Boolean(selectedAffiliate)} onClose={() => setSelectedAffiliate(null)} title={t('affiliate_page.conversions_title')} size="lg">
        {conversionsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {conversions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                {t('affiliate_page.empty')}
              </div>
            ) : conversions.map((conversion) => (
              <div key={conversion._id} className="app-surface-muted rounded-2xl p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{conversion.invoice?.invoiceNumber || '-'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{conversion.customer?.name || conversion.customer?.phone || '-'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusVariant(conversion.status)}>{getStatusLabel(conversion.status)}</Badge>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{(conversion.commissionAmount || 0).toLocaleString()} EGP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}