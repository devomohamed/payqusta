import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, Input, LoadingSpinner, Modal, Select, TextArea } from '../components/UI';
import { superAdminApi } from '../store';
import toast from 'react-hot-toast';
import { Building2, ExternalLink, Inbox, MessageSquareText, Search, Sparkles, UserRound } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'new', label: 'جديدة' },
  { value: 'contacted', label: 'تم التواصل' },
  { value: 'qualified', label: 'مؤهلة' },
  { value: 'closed', label: 'مغلقة' },
  { value: 'spam', label: 'Spam' },
];

const requestTypeOptions = [
  { value: 'all', label: 'كل الأنواع' },
  { value: 'demo', label: 'طلب ديمو' },
  { value: 'pricing', label: 'استفسار أسعار' },
  { value: 'migration', label: 'ترحيل / نقل بيانات' },
  { value: 'partnership', label: 'شراكة' },
  { value: 'general', label: 'استفسار عام' },
];

const statusBadgeVariant = {
  new: 'warning',
  contacted: 'info',
  qualified: 'success',
  closed: 'gray',
  spam: 'danger',
};

const statusLabel = {
  new: 'جديدة',
  contacted: 'تم التواصل',
  qualified: 'مؤهلة',
  closed: 'مغلقة',
  spam: 'Spam',
};

const typeLabel = {
  demo: 'طلب ديمو',
  pricing: 'استفسار أسعار',
  migration: 'ترحيل / نقل بيانات',
  partnership: 'شراكة',
  general: 'استفسار عام',
};

export default function PublicLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [editStatus, setEditStatus] = useState('new');
  const [editNotes, setEditNotes] = useState('');

  const statsMap = useMemo(() => {
    const next = { new: 0, contacted: 0, qualified: 0, closed: 0, spam: 0 };
    stats.forEach((item) => {
      if (item?._id && next[item._id] !== undefined) {
        next[item._id] = item.count || 0;
      }
    });
    return next;
  }, [stats]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getPublicLeads({
        status: statusFilter,
        requestType: typeFilter,
        search: search.trim(),
      });
      setLeads(res.data?.data?.leads || []);
      setStats(res.data?.data?.stats || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'تعذر تحميل طلبات الموقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeads();
  };

  const openLead = (lead) => {
    setSelectedLead(lead);
    setEditStatus(lead.status || 'new');
    setEditNotes(lead.internalNotes || '');
  };

  const handleSave = async () => {
    if (!selectedLead?._id) return;

    setSaving(true);
    try {
      await superAdminApi.updatePublicLead(selectedLead._id, {
        status: editStatus,
        internalNotes: editNotes,
      });
      toast.success('تم تحديث الطلب');
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'تعذر تحديث الطلب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Inbox className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500/80">Lead Intake Desk</p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">طلبات الموقع العامة</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                كل الطلبات القادمة من صفحة التواصل العامة: ديمو، أسعار، ترحيل، أو استفسارات مباشرة قبل التسجيل.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="min-w-[220px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو البريد أو النشاط"
              />
            </div>
            <Button type="submit" variant="outline" icon={<Search className="h-4 w-4" />} className="w-full sm:w-auto">
              بحث
            </Button>
          </form>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { key: 'new', label: 'جديدة', value: statsMap.new, tone: 'text-amber-600' },
          { key: 'contacted', label: 'تم التواصل', value: statsMap.contacted, tone: 'text-blue-600' },
          { key: 'qualified', label: 'مؤهلة', value: statsMap.qualified, tone: 'text-emerald-600' },
          { key: 'closed', label: 'مغلقة', value: statsMap.closed, tone: 'text-slate-600' },
          { key: 'spam', label: 'Spam', value: statsMap.spam, tone: 'text-rose-600' },
        ].map((item) => (
          <div key={item.key} className="app-surface-muted rounded-2xl border border-gray-100/80 dark:border-white/10 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
            <p className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[220px,220px,1fr]">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={requestTypeOptions} />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-7 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-200">
          هذه الشاشة تغلق فجوة التحويل في الموقع: كل من يرسل من صفحة التواصل يظهر هنا مباشرة بدل أن يضيع خارج المنصة.
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="جارٍ تحميل طلبات الموقع..." />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="لا توجد طلبات مطابقة"
          description="لم يصل أي طلب يطابق عوامل التصفية الحالية، أو لم تُرسل طلبات من صفحة التواصل بعد."
        />
      ) : (
        <div className="app-surface overflow-hidden rounded-2xl border border-gray-100/80 dark:border-white/10 shadow-sm">
          <div className="space-y-3 p-4 md:hidden">
            {leads.map((lead) => (
              <div key={lead._id} className="rounded-3xl border border-white/60 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-gray-900 dark:text-white">{lead.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{lead.email}</p>
                    {lead.phone && <p className="mt-1 text-xs text-gray-500">{lead.phone}</p>}
                  </div>
                  <Badge variant={statusBadgeVariant[lead.status] || 'gray'}>{statusLabel[lead.status] || lead.status}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">النشاط</p>
                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{lead.businessName || '-'}</p>
                    <p className="mt-1 text-xs text-gray-500">{lead.teamSize || 'unknown'}</p>
                  </div>
                  <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[11px] text-gray-400">النوع</p>
                    <div className="mt-1">
                      <Badge variant="info">{typeLabel[lead.requestType] || lead.requestType}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                  <p className="text-[11px] text-gray-400">الرسالة</p>
                  <p className="mt-1 line-clamp-4 text-sm leading-7 text-gray-600 dark:text-gray-300">{lead.message}</p>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  <div>{new Date(lead.submittedAt || lead.createdAt).toLocaleString('ar-EG')}</div>
                  {lead.sourcePage && <div className="mt-1">{lead.sourcePage}</div>}
                </div>

                <div className="mt-4">
                  <Button size="sm" variant="outline" onClick={() => openLead(lead)} icon={<ExternalLink className="h-4 w-4" />} className="w-full">
                    عرض وتحديث
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead className="app-surface-muted">
                <tr>
                  <th className="px-5 py-4 font-bold text-gray-500">المرسل</th>
                  <th className="px-5 py-4 font-bold text-gray-500">النشاط</th>
                  <th className="px-5 py-4 font-bold text-gray-500">النوع</th>
                  <th className="px-5 py-4 font-bold text-gray-500">الرسالة</th>
                  <th className="px-5 py-4 font-bold text-gray-500">التاريخ</th>
                  <th className="px-5 py-4 font-bold text-gray-500">الحالة</th>
                  <th className="px-5 py-4 font-bold text-gray-500">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4 align-top">
                      <div className="font-black text-gray-900 dark:text-white">{lead.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{lead.email}</div>
                      {lead.phone && <div className="mt-1 text-xs text-gray-500">{lead.phone}</div>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="inline-flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{lead.businessName || '-'}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{lead.teamSize || 'unknown'}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge variant="info">{typeLabel[lead.requestType] || lead.requestType}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="max-w-[320px] line-clamp-3 leading-7 text-gray-600 dark:text-gray-300">{lead.message}</p>
                    </td>
                    <td className="px-5 py-4 align-top text-xs text-gray-500">
                      <div>{new Date(lead.submittedAt || lead.createdAt).toLocaleString('ar-EG')}</div>
                      {lead.sourcePage && <div className="mt-1">{lead.sourcePage}</div>}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge variant={statusBadgeVariant[lead.status] || 'gray'}>{statusLabel[lead.status] || lead.status}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Button size="sm" variant="outline" onClick={() => openLead(lead)} icon={<ExternalLink className="h-4 w-4" />}>
                        عرض وتحديث
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title="تفاصيل طلب الموقع" size="lg">
        {selectedLead && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="app-surface-muted rounded-2xl border border-gray-100/80 dark:border-white/10 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                  <UserRound className="h-4 w-4 text-primary-500" />
                  {selectedLead.name}
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{selectedLead.email}</p>
                {selectedLead.phone && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedLead.phone}</p>}
                <p className="mt-1 text-xs text-gray-500">{selectedLead.businessName || 'بدون اسم نشاط واضح'}</p>
              </div>
              <div className="app-surface-muted rounded-2xl border border-gray-100/80 dark:border-white/10 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {typeLabel[selectedLead.requestType] || selectedLead.requestType}
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">حجم الفريق: {selectedLead.teamSize || 'unknown'}</p>
                <p className="mt-1 text-xs text-gray-500">{new Date(selectedLead.submittedAt || selectedLead.createdAt).toLocaleString('ar-EG')}</p>
                {selectedLead.sourcePage && <p className="mt-1 text-xs text-gray-500">المصدر: {selectedLead.sourcePage}</p>}
              </div>
            </div>

            <div className="app-surface rounded-2xl border border-gray-100/80 dark:border-white/10 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <MessageSquareText className="h-4 w-4 text-emerald-500" />
                الرسالة
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-8 text-gray-600 dark:text-gray-300">{selectedLead.message}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select label="الحالة" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} options={statusOptions.filter((item) => item.value !== 'all')} />
              <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600 dark:border-gray-800 dark:bg-slate-900/40 dark:text-slate-300">
                آخر تواصل: {selectedLead.lastContactedAt ? new Date(selectedLead.lastContactedAt).toLocaleString('ar-EG') : 'لم يتم بعد'}
              </div>
            </div>

            <TextArea
              label="ملاحظات داخلية"
              rows={6}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="اكتب خلاصة التقييم أو المتابعة أو الخطوة التالية مع هذا الطلب"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedLead(null)}>إغلاق</Button>
              <Button onClick={handleSave} loading={saving}>حفظ التحديث</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
