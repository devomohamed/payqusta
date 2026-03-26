import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  FileSearch,
  Filter,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
} from '../components/UI';
import Pagination from '../components/Pagination';

const LIMIT = 8;

const ACTION_OPTIONS = [
  { value: '', label: 'كل الإجراءات' },
  { value: 'create', label: 'إنشاء' },
  { value: 'update', label: 'تحديث' },
  { value: 'delete', label: 'حذف' },
  { value: 'bulk_delete', label: 'حذف جماعي' },
  { value: 'payment', label: 'دفع' },
  { value: 'stock_change', label: 'تغيير مخزون' },
  { value: 'import', label: 'استيراد' },
  { value: 'restore', label: 'استعادة' },
  { value: 'login', label: 'تسجيل دخول' },
  { value: 'logout', label: 'تسجيل خروج' },
  { value: 'logout_all', label: 'تسجيل خروج من كل الأجهزة' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'كل الموارد' },
  { value: 'tenant', label: 'المتجر' },
  { value: 'user', label: 'المستخدم' },
  { value: 'branch', label: 'الفرع' },
  { value: 'role', label: 'الدور' },
  { value: 'product', label: 'المنتج' },
  { value: 'customer', label: 'العميل' },
  { value: 'invoice', label: 'الفاتورة' },
  { value: 'supplier', label: 'المورد' },
  { value: 'expense', label: 'المصروف' },
  { value: 'settings', label: 'الإعدادات' },
  { value: 'auth', label: 'المصادقة' },
];

const ACTION_LABELS = Object.fromEntries(ACTION_OPTIONS.map((option) => [option.value, option.label]));
const RESOURCE_LABELS = Object.fromEntries(RESOURCE_OPTIONS.map((option) => [option.value, option.label]));

function getActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function getResourceLabel(resource) {
  return RESOURCE_LABELS[resource] || resource;
}

function getActionColor(action) {
  switch (action) {
    case 'create':
    case 'payment':
    case 'login':
      return 'success';
    case 'update':
    case 'stock_change':
    case 'import':
    case 'restore':
      return 'info';
    case 'delete':
    case 'bulk_delete':
      return 'danger';
    case 'view':
      return 'gray';
    default:
      return 'warning';
  }
}

function getActionIcon(action) {
  switch (action) {
    case 'create':
    case 'payment':
    case 'login':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'update':
    case 'stock_change':
    case 'import':
    case 'restore':
    case 'logout':
    case 'logout_all':
      return <Activity className="h-4 w-4" />;
    case 'delete':
    case 'bulk_delete':
      return <XCircle className="h-4 w-4" />;
    case 'view':
      return <Eye className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

export default function AdminAuditLogsPage() {
  const { t } = useTranslation('admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [resourceIdFilter, setResourceIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setActionFilter(searchParams.get('action') || '');
    setResourceFilter(searchParams.get('resource') || '');
    setResourceIdFilter(searchParams.get('resourceId') || '');
    setPage(Math.max(Number(searchParams.get('page') || '1'), 1));
  }, [searchParams]);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (actionFilter) params.action = actionFilter;
    if (resourceFilter) params.resource = resourceFilter;
    if (resourceIdFilter) params.resourceId = resourceIdFilter;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [actionFilter, page, resourceFilter, resourceIdFilter, search, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource = resourceFilter;
      if (resourceIdFilter) params.resourceId = resourceIdFilter;

      const res = await adminApi.getAuditLogs(params);
      setLogs(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.pages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch (error) {
      toast.error(t('admin_audit_logs_page.toasts.k2ir4e'));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page, resourceFilter, resourceIdFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => ({
    scoped: Boolean(resourceFilter || resourceIdFilter),
    hasQuery: Boolean(search || actionFilter || resourceFilter || resourceIdFilter),
    focusLabel: resourceFilter ? getResourceLabel(resourceFilter) : t('admin_audit_logs_page.ui.kzgx369'),
  }), [actionFilter, resourceFilter, resourceIdFilter, search]);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('');
    setResourceFilter('');
    setResourceIdFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 app-text-soft">
      <div className="app-surface-muted flex flex-col gap-4 rounded-[1.75rem] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-[1.35rem] bg-gradient-to-br from-primary-500 to-cyan-500 p-3 text-white shadow-xl shadow-primary-500/25">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black app-text-strong">{t('admin_audit_logs_page.ui.k3o6kjl')}</h1>
              <Badge variant="info">Audit Trail</Badge>
            </div>
            <p className="mt-2 text-sm leading-7 app-text-muted">
              راجع تعديلات الموظفين، الفروع، الإعدادات، والعمليات الحساسة من شاشة واحدة مع فلاتر قابلة للمشاركة بالرابط.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <Card className="min-w-[140px] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">{t('admin_audit_logs_page.ui.ki3lr1c')}</p>
            <p className="mt-2 text-2xl font-black app-text-strong">{pagination.total}</p>
          </Card>
          <Card className="min-w-[140px] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">{t('admin_audit_logs_page.ui.krq8ij0')}</p>
            <p className="mt-2 text-base font-black app-text-strong">{summary.focusLabel}</p>
          </Card>
        </div>
      </div>

      {summary.scoped && (
        <Card className="border border-primary-200/60 bg-primary-50/70 p-4 dark:border-primary-500/20 dark:bg-primary-500/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold app-text-strong">{t('admin_audit_logs_page.ui.kng4sfu')}</p>
              <p className="mt-1 text-sm app-text-muted">
                {resourceFilter ? `تم تضييق النتائج إلى ${getResourceLabel(resourceFilter)}.` : 'تم تضييق النتائج بحسب السجل المطلوب.'}
                {resourceIdFilter ? ' الرابط الحالي يحتفظ بمعرّف السجل المحدد لسهولة المتابعة.' : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              {t('admin_audit_logs_page.ui.kim5c8c')}
            </Button>
          </div>
        </Card>
      )}

      <Card className="app-surface-muted p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_repeat(2,minmax(0,0.75fr))]">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t('admin_audit_logs_page.placeholders.kjf3el4')}
          />

          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setPage(1);
            }}
            className="app-surface h-11 rounded-xl border border-transparent px-4 text-sm focus:ring-2 focus:ring-primary-500"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || 'all-actions'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={resourceFilter}
            onChange={(event) => {
              setResourceFilter(event.target.value);
              setPage(1);
            }}
            className="app-surface h-11 rounded-xl border border-transparent px-4 text-sm focus:ring-2 focus:ring-primary-500"
          >
            {RESOURCE_OPTIONS.map((option) => (
              <option key={option.value || 'all-resources'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {summary.hasQuery && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {search && <Badge variant="gray">بحث: {search}</Badge>}
            {actionFilter && <Badge variant="gray">إجراء: {getActionLabel(actionFilter)}</Badge>}
            {resourceFilter && <Badge variant="gray">مورد: {getResourceLabel(resourceFilter)}</Badge>}
            {resourceIdFilter && <Badge variant="gray">معرّف السجل: {resourceIdFilter.slice(-8)}</Badge>}
            <Button variant="ghost" size="sm" icon={<Filter className="h-4 w-4" />} onClick={resetFilters}>
              {t('admin_audit_logs_page.ui.kr8yv4w')}
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <Card className="p-8">
          <LoadingSpinner size="lg" text="جاري تحميل السجلات..." />
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title={t('admin_audit_logs_page.titles.ker3p1u')}
          description="جرّب توسيع الفلاتر أو إعادة ضبطها لعرض سجل النظام بالكامل."
          action={summary.hasQuery ? { label: t('admin_audit_logs_page.ui.kr8yv4w'), onClick: resetFilters } : null}
        />
      ) : (
        <Card className="overflow-hidden rounded-[1.75rem]">
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {logs.map((log) => (
              <div
                key={log._id}
                className="p-5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20">
                    {log.user?.name?.charAt(0) || t('admin_audit_logs_page.toasts.k18l')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black app-text-strong">
                        {log.user?.name || t('admin_audit_logs_page.toasts.k8no2bb')}
                      </h3>
                      <Badge variant={getActionColor(log.action)}>
                        <span className="inline-flex items-center gap-1">
                          {getActionIcon(log.action)}
                          {getActionLabel(log.action)}
                        </span>
                      </Badge>
                      <Badge variant="gray">{getResourceLabel(log.resource)}</Badge>
                    </div>

                    <p className="mt-2 text-sm leading-7 app-text-muted">
                      {log.description || `${getActionLabel(log.action)} على ${getResourceLabel(log.resource)}`}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs app-text-muted">
                      {log.user?.email && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {log.user.email}
                        </span>
                      )}
                      {log.tenant?.name && (
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          {log.tenant.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(log.createdAt), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                      </span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      {log.resourceId && <span>Ref: {String(log.resourceId).slice(-8)}</span>}
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-3 rounded-2xl app-surface-muted p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-primary-500">
                          {t('admin_audit_logs_page.ui.kl3a861')}
                        </summary>
                        <pre className="mt-3 overflow-x-auto rounded-2xl bg-black/5 p-3 text-xs leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-black/5 p-4 dark:border-white/10">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
