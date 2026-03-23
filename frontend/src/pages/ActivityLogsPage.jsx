import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Download } from 'lucide-react';
import { auditLogsApi, API_URL } from '../store';
import { Card, Input, Select, Button, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const ACTION_COLORS = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'info',
  payment: 'primary',
  invoice: 'primary',
  stock_change: 'warning',
};

const ACTION_LABELS = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  payment: 'دفع',
  invoice: 'فاتورة',
  stock_change: 'تعديل مخزون',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    user: '',
    startDate: '',
    endDate: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value)),
      };

      const res = await auditLogsApi.getLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, value]) => value)));
      window.open(`${API_URL}/admin/audit-logs/export?${params}`, '_blank');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const summary = useMemo(() => ({
    total: pagination.totalItems || logs.length,
    displayed: logs.length,
    users: new Set(logs.map((log) => log.user?.email || log.user?.name).filter(Boolean)).size,
    actions: new Set(logs.map((log) => log.action).filter(Boolean)).size,
  }), [logs, pagination.totalItems]);

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500/80">Activity Stream</p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">سجل الأنشطة</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                متابعة دقيقة لكل العمليات الإدارية وحركة المستخدمين داخل النظام، مع تصفية أسرع على الهاتف وسطح المكتب.
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" icon={<Download className="w-4 h-4" />} className="w-full sm:w-auto">
            تصدير Excel
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="app-surface border border-white/60 p-4 dark:border-white/10">
            <p className="text-xs text-gray-400">إجمالي السجلات</p>
            <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.total}</p>
          </Card>
          <Card className="app-surface border border-white/60 p-4 dark:border-white/10">
            <p className="text-xs text-gray-400">المعروضة الآن</p>
            <p className="mt-2 text-2xl font-black text-primary-600">{summary.displayed}</p>
          </Card>
          <Card className="app-surface border border-white/60 p-4 dark:border-white/10">
            <p className="text-xs text-gray-400">المستخدمون</p>
            <p className="mt-2 text-2xl font-black text-emerald-600">{summary.users}</p>
          </Card>
          <Card className="app-surface border border-white/60 p-4 dark:border-white/10">
            <p className="text-xs text-gray-400">أنواع الإجراءات</p>
            <p className="mt-2 text-2xl font-black text-amber-600">{summary.actions}</p>
          </Card>
        </div>
      </section>

      <Card className="app-surface-muted rounded-[2rem] p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Filters</p>
          <h2 className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white">البحث والتصفية</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">فلترة السجل حسب الإجراء أو المورد أو المستخدم أو المدى الزمني.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Select
            label="الإجراء"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            options={[
              { value: '', label: 'الكل' },
              ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Input
            label="المورد"
            placeholder="مثال: product, customer"
            value={filters.resource}
            onChange={(e) => handleFilterChange('resource', e.target.value)}
          />
          <Input
            label="المستخدم"
            placeholder="اسم أو بريد المستخدم"
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
          />
          <Input
            label="من تاريخ"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <Input
            label="إلى تاريخ"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden rounded-[2rem]">
        {loading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="لا توجد سجلات"
            description="لم يتم العثور على أنشطة بالمعايير المحددة"
          />
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {logs.map((log) => {
                const detailsText = JSON.stringify(log.details);
                return (
                  <div key={log._id} className="app-surface rounded-3xl border border-white/60 p-4 shadow-sm dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{log.user?.name || 'نظام'}</p>
                        <p className="mt-1 text-xs text-gray-400">{log.user?.email || 'عملية نظام داخلية'}</p>
                      </div>
                      <Badge variant={ACTION_COLORS[log.action] || 'gray'}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] text-gray-400">المورد</p>
                        <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">{log.resource || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                        <p className="text-[11px] text-gray-400">التاريخ</p>
                        <p className="mt-1 font-semibold text-gray-700 dark:text-gray-200">
                          {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-black/[0.03] p-3 text-xs text-gray-500 dark:bg-white/[0.04] dark:text-gray-300">
                      <p className="mb-1 text-[11px] text-gray-400">التفاصيل</p>
                      <p className="break-all">{detailsText?.length > 160 ? `${detailsText.slice(0, 160)}...` : detailsText}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-400">
                      <span className="font-mono">{log.ipAddress || '-'}</span>
                      <span>سجل نشاط</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                  <tr>
                    <th className="p-4 text-right">التاريخ</th>
                    <th className="p-4 text-right">المستخدم</th>
                    <th className="p-4 text-right">الإجراء</th>
                    <th className="p-4 text-right">المورد</th>
                    <th className="p-4 text-right">التفاصيل</th>
                    <th className="p-4 text-right">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4 text-xs text-gray-400">
                        {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: ar })}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{log.user?.name || 'نظام'}</div>
                        <div className="text-xs text-gray-400">{log.user?.email}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant={ACTION_COLORS[log.action] || 'gray'}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-xs">{log.resource}</td>
                      <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="p-4 text-xs font-mono text-gray-400">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4">
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
