import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Info,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Input, Modal } from '../components/UI';
import { backupApi, api } from '../store';
import { notify } from '../components/AnimatedNotification';

function formatDateTime(value, t) {
  if (!value) return t('backup_restore_page.ui.k4nnkk2');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('backup_restore_page.ui.k4nnkk2');
  return date.toLocaleString('ar-EG');
}

function formatBytes(value = 0) {
  const size = Number(value || 0);
  if (size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getReportLabels(t) {
  return {
    products: t('backup_restore_page.ui.ks0nri5'),
    customers: t('backup_restore_page.ui.kzgg8kr'),
    suppliers: t('backup_restore_page.ui.krzfmdg'),
    invoices: t('backup_restore_page.ui.ktvslhu'),
    expenses: t('backup_restore_page.ui.ko4ileo'),
    branches: t('backup_restore_page.ui.kaaztz6'),
    roles: t('backup_restore_page.ui.kz86dm1'),
    users: t('backup_restore_page.ui.kdirwj'),
    subscriptionRequests: t('backup_restore_page.ui.kku0e1b'),
    notifications: t('backup_restore_page.ui.k31c17e'),
    auditLogs: t('backup_restore_page.ui.knioa86'),
    uploadBinaries: t('backup_restore_page.ui.krp5c2g'),
    tenantConfig: t('backup_restore_page.ui.kdfqgrl'),
    audit_logs: t('backup_restore_page.ui.knioa86'),
    platform_level_config: t('backup_restore_page.ui.k1eqep9'),
    full_multi_tenant_snapshot: t('backup_restore_page.ui.ksl4gc6'),
    upload_binary_skipped_invalid_payload: t('backup_restore_page.ui.kv6m464'),
    subscription_request_skipped_missing_plan: t('backup_restore_page.ui.ktgaqa3'),
    audit_log_skipped_missing_user_mapping: t('backup_restore_page.ui.krbjx7b'),
    excel_restore_is_limited_to_products_customers_suppliers: t('backup_restore_page.ui.k6k2l7n'),
    excel_restore_does_not_cover_invoices_expenses_branches_roles_users_or_tenant_config: t('backup_restore_page.ui.k4uvot7'),
    user_skipped_missing_password_hash: t('backup_restore_page.ui.khs3ny'),
    tenant_snapshot_missing_from_backup: t('backup_restore_page.ui.k2ehy9r'),
  };
}

const DATASET_META = {
  products: { icon: Package, color: 'text-blue-600 dark:text-blue-300' },
  customers: { icon: Users, color: 'text-emerald-600 dark:text-emerald-300' },
  suppliers: { icon: Truck, color: 'text-amber-600 dark:text-amber-300' },
  invoices: { icon: FileSpreadsheet, color: 'text-violet-600 dark:text-violet-300' },
  expenses: { icon: Receipt, color: 'text-rose-600 dark:text-rose-300' },
  branches: { icon: Building2, color: 'text-cyan-600 dark:text-cyan-300' },
  roles: { icon: ShieldCheck, color: 'text-indigo-600 dark:text-indigo-300' },
  users: { icon: Users, color: 'text-fuchsia-600 dark:text-fuchsia-300' },
  subscriptionRequests: { icon: Receipt, color: 'text-pink-600 dark:text-pink-300' },
  notifications: { icon: Bell, color: 'text-yellow-600 dark:text-yellow-300' },
  auditLogs: { icon: ShieldCheck, color: 'text-orange-600 dark:text-orange-300' },
  uploadBinaries: { icon: HardDrive, color: 'text-lime-600 dark:text-lime-300' },
  tenantConfig: { icon: Database, color: 'text-slate-600 dark:text-slate-200' },
};

function getAutoBackupStatus(t) {
  return {
    disabled: { label: t('backup_restore_page.ui.ksyv0un'), variant: 'gray' },
    pending: { label: t('backup_restore_page.ui.k3rvr59'), variant: 'warning' },
    ok: { label: t('backup_restore_page.ui.k91vct3'), variant: 'success' },
    error: { label: t('backup_restore_page.ui.kwbbjs0'), variant: 'danger' },
  };
}

function formatReportLabel(value, reportLabels) {
  return reportLabels[value] || String(value || '').replace(/_/g, ' ');
}

function FormatToggle({ value, onChange }) {
  return (
    <div className="app-surface-muted inline-flex w-full rounded-2xl p-1 sm:w-auto">
      <button
        type="button"
        onClick={() => onChange('json')}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
          value === 'json'
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
            : 'app-text-soft hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        <FileJson className="h-4 w-4" />
        JSON
      </button>
      <button
        type="button"
        onClick={() => onChange('excel')}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
          value === 'excel'
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
            : 'app-text-soft hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black app-text-strong">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-7 app-text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function BackupRestorePage() {
  const { t } = useTranslation('admin');
  const reportLabels = useMemo(() => getReportLabels(t), [t]);
  const autoBackupStatuses = useMemo(() => getAutoBackupStatus(t), [t]);
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [autoBackup, setAutoBackup] = useState(null);
  const [loadingAutoBackup, setLoadingAutoBackup] = useState(true);
  const [savingAutoBackup, setSavingAutoBackup] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [keepLastDraft, setKeepLastDraft] = useState('14');

  const [exportFormat, setExportFormat] = useState('json');
  const [exporting, setExporting] = useState(false);

  const [restoreFormat, setRestoreFormat] = useState('json');
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchAutoBackup();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await backupApi.getStats();
      setStats(data.data);
    } catch {
      notify.error(t('backup_restore_page.toasts.kueutm1'));
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAutoBackup = async () => {
    setLoadingAutoBackup(true);
    try {
      const { data } = await backupApi.getAutoSettings();
      setAutoBackup(data.data);
      setConsentChecked(Boolean(data.data?.enabled || data.data?.consentAcceptedAt));
      setKeepLastDraft(String(data.data?.retentionPolicy?.keepLast || 14));
    } catch (error) {
      notify.error(error?.response?.data?.message || t('backup_restore_page.toasts.k126jss'));
    } finally {
      setLoadingAutoBackup(false);
    }
  };

  const autoBackupStatus = useMemo(() => {
    const statusKey = autoBackup?.status || 'disabled';
    return autoBackupStatuses[statusKey] || autoBackupStatuses.disabled;
  }, [autoBackup, autoBackupStatuses]);

  const totalRecords = Number(stats?.total || 0);
  const backupReadinessLabel = autoBackup?.enabled || stats?.lastBackup ? t('backup_restore_page.ui.k2twy44') : t('backup_restore_page.ui.klrm63q');

  const saveAutoBackupSettings = async (enabled) => {
    const keepLast = Math.min(90, Math.max(1, Number(keepLastDraft || 14)));

    if (enabled && !consentChecked) {
      notify.warning(t('backup_restore_page.toasts.k7r7m39'));
      return;
    }

    setSavingAutoBackup(true);
    try {
      const { data } = await backupApi.updateAutoSettings({
        enabled,
        retentionPolicy: { keepLast },
      });
      setAutoBackup(data.data);
      setKeepLastDraft(String(data.data?.retentionPolicy?.keepLast || keepLast));
      if (enabled) setConsentChecked(true);
      notify.success(data.message || t('backup_restore_page.toasts.kg4he5w'));
    } catch (error) {
      notify.error(error?.response?.data?.message || t('backup_restore_page.toasts.k3tmtrg'));
    } finally {
      setSavingAutoBackup(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const isJson = exportFormat === 'json';
      const response = await api.get(isJson ? '/backup/export-json' : '/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PayQusta_Backup_${date}.${isJson ? 'json' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success(isJson ? t('backup_restore_page.ui.kh44bm9') : t('backup_restore_page.ui.k6z5fay'));
    } catch {
      notify.error(t('backup_restore_page.toasts.kfggi8a'));
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFileSelect = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (restoreFormat === 'json' && ext !== 'json') {
      notify.warning(t('backup_restore_page.toasts.kf5t99l'));
      return;
    }
    if (restoreFormat === 'excel' && !['xlsx', 'xls'].includes(ext || '')) {
      notify.warning(t('backup_restore_page.toasts.km6furs'));
      return;
    }

    setRestoreFile(selected);
    setShowRestoreConfirm(true);
    setRestoreResult(null);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setRestoring(true);
    setShowRestoreConfirm(false);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);

      const endpoint = restoreFormat === 'json' ? '/backup/restore-json' : '/backup/restore';
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setRestoreResult(data.data);
      notify.success(data.message || t('backup_restore_page.toasts.k3kqgn6'));
      await Promise.all([fetchStats(), fetchAutoBackup()]);
    } catch (error) {
      notify.error(error?.response?.data?.message || t('backup_restore_page.toasts.kad47zq'));
    } finally {
      setRestoring(false);
      setRestoreFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const restoreSummaryCards = useMemo(() => {
    if (!restoreResult) return [];
    return Object.entries(DATASET_META)
      .map(([key, meta]) => {
        const value = restoreResult[key];
        if (value === undefined) return null;
        const imported = typeof value === 'object' ? value.imported : value;
        const skipped = typeof value === 'object' ? value.skipped : 0;
        return {
          key,
          imported: imported || 0,
          skipped: skipped || 0,
          label: formatReportLabel(key, reportLabels),
          ...meta,
        };
      })
      .filter(Boolean);
  }, [restoreResult]);

  const recentBackups = Array.isArray(autoBackup?.recentBackups) ? autoBackup.recentBackups : [];
  const includedDomains = restoreResult?.report?.coverage?.includedDomains || [];
  const missingDomains = restoreResult?.report?.coverage?.missingDomains || [];
  const knownGaps = restoreResult?.report?.coverage?.knownGaps || [];
  const validationWarnings = restoreResult?.report?.warnings || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-slate-950 px-6 py-7 text-white">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
                <Database className="h-3.5 w-3.5" />
                {t('backup_restore_page.ui.kuzemdd')}
              </div>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">{t('backup_restore_page.ui.k36u7iy')}</h1>
              <p className="mt-3 text-sm leading-7 text-white/80 sm:text-base">
                {t('backup_restore_page.ui.k51xpvz')}
                {t('backup_restore_page.ui.kqoswfw')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/15"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('backup_restore_page.ui.kmu2835')}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">{t('backup_restore_page.ui.k5hlxs')}</p>
                <p className="mt-2 text-xl font-black">{backupReadinessLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">{t('backup_restore_page.ui.ki3lr1c')}</p>
                <p className="mt-2 text-xl font-black">{totalRecords.toLocaleString('ar-EG')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/65">{t('backup_restore_page.ui.ktenyne')}</p>
                <p className="mt-2 text-sm font-black">{formatDateTime(autoBackup?.lastSuccessAt || stats?.lastBackup, t)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          icon={ShieldCheck}
          title={t('backup_restore_page.titles.kdkm1ks')}
          description="عند التفعيل، يحتفظ النظام بآخر نسخ JSON تلقائية داخل التخزين الداخلي للمنصة. يمكنك تعديل عدد النسخ المحتفَظ بها حسب سياسة التشغيل."
          action={
            loadingAutoBackup ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            ) : (
              <Badge variant={autoBackupStatus.variant}>{autoBackupStatus.label}</Badge>
            )
          }
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kvbkq3d')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{formatDateTime(autoBackup?.lastSuccessAt, t)}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.klwhyl2')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{formatDateTime(autoBackup?.lastFailureAt, t)}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.k851rds')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{Number(autoBackup?.storedCount || 0).toLocaleString('ar-EG')}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kaavgt9')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{t('backup_restore_page.ui.kocvb09')}</p>
              </div>
            </div>

            {recentBackups.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary-500" />
                  <p className="text-sm font-black app-text-strong">{t('backup_restore_page.ui.k70n3fw')}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {recentBackups.map((backup) => (
                    <div key={backup.key} className="app-surface-muted rounded-2xl p-4">
                      <p className="truncate text-sm font-bold app-text-strong">{backup.filename}</p>
                      <p className="mt-2 text-xs app-text-muted">الحجم: {formatBytes(backup.size)}</p>
                      <p className="mt-1 text-xs app-text-muted">أُنشئت: {formatDateTime(backup.createdAt, t)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] px-5 py-6 text-sm app-text-muted">
                {t('backup_restore_page.ui.kumd9z7')}
              </div>
            )}

            {autoBackup?.lastError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-bold">{t('backup_restore_page.ui.kyzot21')}</p>
                <p className="mt-2 leading-7">{autoBackup.lastError}</p>
              </div>
            ) : null}
          </div>

          <div className="app-surface-muted rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-black app-text-strong">{t('backup_restore_page.ui.k2whjhc')}</p>
                <p className="mt-1 text-xs app-text-muted">{t('backup_restore_page.ui.ky50e8q')}</p>
              </div>
              <button
                type="button"
                disabled={loadingAutoBackup || savingAutoBackup}
                onClick={() => saveAutoBackupSettings(!autoBackup?.enabled)}
                className={`relative inline-flex h-8 w-14 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 focus:ring-offset-transparent ${
                  autoBackup?.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                } ${(loadingAutoBackup || savingAutoBackup) ? 'cursor-not-allowed opacity-60' : ''}`}
                role="switch"
                aria-checked={Boolean(autoBackup?.enabled)}
                aria-pressed={Boolean(autoBackup?.enabled)}
              >
                <span
                  className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    autoBackup?.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm leading-7 app-text-muted">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                {t('backup_restore_page.ui.koqw60y')}
              </span>
            </label>

            <div className="mt-5">
              <Input
                type="number"
                min="1"
                max="90"
                value={keepLastDraft}
                onChange={(e) => setKeepLastDraft(e.target.value)}
                label={t('backup_restore_page.form.khpyrrl')}
              />
              <p className="mt-2 text-xs app-text-muted">يمكنك الاحتفاظ بين نسخة واحدة و90 نسخة. الحالي: {autoBackup?.retentionPolicy?.keepLast || 14}.</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button loading={savingAutoBackup} onClick={() => saveAutoBackupSettings(Boolean(autoBackup?.enabled))}>
                {t('backup_restore_page.ui.kok3ib7')}
              </Button>
              <Button
                variant={autoBackup?.enabled ? 'outline' : 'ghost'}
                loading={savingAutoBackup}
                onClick={() => saveAutoBackupSettings(!autoBackup?.enabled)}
              >
                {autoBackup?.enabled ? t('backup_restore_page.ui.k6s32xn') : 'تفعيل النسخ التلقائي'}
              </Button>
              <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={fetchAutoBackup}>
                {t('backup_restore_page.ui.kd5ihhr')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <SectionHeader
            icon={Download}
            title={t('backup_restore_page.titles.ka87rpb')}
            description="استخدم JSON للنسخة الأكثر اكتمالًا وقابلية للاستعادة. استخدم Excel للمراجعة البشرية السريعة أو المشاركة الداخلية."
            action={<FormatToggle value={exportFormat} onChange={setExportFormat} />}
          />

          <div className="mt-5 rounded-2xl border border-[color:var(--surface-border)] px-4 py-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-primary-500" />
              <div className="text-sm leading-7 app-text-muted">
                {exportFormat === 'json' ? (
                  <>
                    <p className="font-bold app-text-strong">JSON هو التنسيق الموصى به.</p>
                    <p className="mt-1">{t('backup_restore_page.ui.knnna0q')}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold app-text-strong">Excel مناسب للمراجعة السريعة.</p>
                    <p className="mt-1">{t('backup_restore_page.ui.ka8t9j2')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button icon={<Download className="h-4 w-4" />} loading={exporting} onClick={handleExport}>
              {exportFormat === 'json' ? t('backup_restore_page.ui.kygdhey') : 'تنزيل نسخة Excel'}
            </Button>
            {exportFormat === 'json' ? <Badge variant="success">{t('backup_restore_page.ui.kji2k6w')}</Badge> : null}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader
            icon={Upload}
            title={t('backup_restore_page.titles.k6y1oi0')}
            description="الاستعادة هنا additive وليست destructive. السجلات الموجودة لن تُحذف، وسيتم تخطي المكرر منها حسب قواعد المطابقة الحالية."
            action={<FormatToggle value={restoreFormat} onChange={setRestoreFormat} />}
          />

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="text-sm leading-7 text-amber-800 dark:text-amber-200">
                <p className="font-bold">{t('backup_restore_page.ui.k24mb94')}</p>
                <p className="mt-1">
                  {restoreFormat === 'json'
                    ? t('backup_restore_page.ui.kov5qdb') : 'استعادة Excel تقتصر على المنتجات والعملاء والموردين فقط.'}
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={restoreFormat === 'json' ? '.json' : '.xlsx,.xls'}
            className="hidden"
            onChange={handleRestoreFileSelect}
          />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="warning"
              icon={restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              disabled={restoring}
              onClick={() => fileInputRef.current?.click()}
            >
              {restoreFormat === 'json' ? t('backup_restore_page.ui.kb1dnrv') : 'اختيار ملف Excel للاستعادة'}
            </Button>
            <p className="text-xs app-text-muted">{t('backup_restore_page.ui.kf0r1uf')}</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <SectionHeader
          icon={HardDrive}
          title={t('backup_restore_page.titles.kw18yt1')}
          description="يعرض هذا القسم حجم البيانات الموجودة الآن حتى تعرف ما الذي ستغطيه النسخة اليدوية أو التلقائية."
          action={
            <Button variant="ghost" icon={<RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />} onClick={fetchStats}>
              {t('backup_restore_page.ui.update')}
            </Button>
          }
        />

        {loadingStats ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : stats ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {Object.entries(DATASET_META).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={key} className="app-surface-muted rounded-2xl p-4 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl app-surface">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <p className="text-2xl font-black app-text-strong">{Number(stats[key] || 0).toLocaleString('ar-EG')}</p>
                  <p className="mt-1 text-xs font-semibold app-text-muted">{formatReportLabel(key, reportLabels)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Database}
            title={t('backup_restore_page.titles.kt57xeh')}
            description="أعد المحاولة بعد لحظات أو راجع الاتصال."
            action={{ label: t('backup_restore_page.ui.k267yxq'), onClick: fetchStats, variant: 'outline' }}
          />
        )}
      </Card>

      {restoreResult ? (
        <Card className="p-6">
          <SectionHeader
            icon={CheckCircle2}
            title={t('backup_restore_page.titles.ktaf43f')}
            description="هذا الملخص يوضح ما تم استيراده وما تم تخطيه، مع ملاحظات التحقق وحدود التغطية في ملف النسخة."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="app-surface-muted rounded-2xl p-4">
              <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.klwwmb6')}</p>
              <p className="mt-2 text-2xl font-black text-emerald-500">{Number(restoreResult.totalImported || 0).toLocaleString('ar-EG')}</p>
            </div>
            <div className="app-surface-muted rounded-2xl p-4">
              <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.ks22k0o')}</p>
              <p className="mt-2 text-2xl font-black text-amber-500">{Number(restoreResult.totalSkipped || 0).toLocaleString('ar-EG')}</p>
            </div>
            <div className="app-surface-muted rounded-2xl p-4">
              <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.k85all')}</p>
              <p className="mt-2 text-2xl font-black app-text-strong uppercase">{restoreResult.report?.format || '-'}</p>
            </div>
          </div>

          {restoreSummaryCards.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {restoreSummaryCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="app-surface-muted rounded-2xl p-4 text-center">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl app-surface">
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <p className="text-xl font-black text-emerald-500">{Number(item.imported).toLocaleString('ar-EG')}</p>
                    <p className="mt-1 text-xs font-semibold app-text-muted">{item.label}</p>
                    {item.skipped > 0 ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-500">تم تخطي {Number(item.skipped).toLocaleString('ar-EG')}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {restoreResult.report?.backupMetadata ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kaj35s4')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{restoreResult.report.backupMetadata.version || '-'}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kot9qla')}</p>
                <p className="mt-2 text-sm font-black app-text-strong">{formatDateTime(restoreResult.report.backupMetadata.exportedAt, t)}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kqy86c8')}</p>
                <p className="mt-2 break-all text-sm font-black app-text-strong">{restoreResult.report.backupMetadata.sourceTenant || '-'}</p>
              </div>
              <div className="app-surface-muted rounded-2xl p-4">
                <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.ksb2cwh')}</p>
                <p className="mt-2 break-all text-sm font-black app-text-strong">{restoreResult.report.backupMetadata.backupKey || '-'}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-200">{t('backup_restore_page.ui.k8n6w1t')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {includedDomains.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {formatReportLabel(item, reportLabels)}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-black text-amber-700 dark:text-amber-200">{t('backup_restore_page.ui.kgdekua')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingDomains.length > 0 ? (
                  missingDomains.map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                      {formatReportLabel(item, reportLabels)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-200">{t('backup_restore_page.ui.k3ywj6f')}</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-sm font-black text-rose-700 dark:text-rose-200">{t('backup_restore_page.ui.kx810ld')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {knownGaps.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                    {formatReportLabel(item, reportLabels)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {validationWarnings.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-black">{t('backup_restore_page.ui.kyxc2vq')}</p>
              <ul className="mt-3 space-y-2 leading-7">
                {validationWarnings.map((warning) => (
                  <li key={warning}>• {formatReportLabel(warning, reportLabels)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Modal
        open={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setRestoreFile(null);
        }}
        title={t('backup_restore_page.titles.kxwjgjs')}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="text-sm leading-7 text-amber-800 dark:text-amber-200">
                <p className="font-black">{t('backup_restore_page.ui.kblsc47')}</p>
                <p className="mt-1">{t('backup_restore_page.ui.k23qztn')}</p>
              </div>
            </div>
          </div>

          <div className="app-surface-muted rounded-2xl p-4">
            <p className="text-xs font-bold app-text-muted">{t('backup_restore_page.ui.kr36dzy')}</p>
            <p className="mt-2 break-all text-sm font-black app-text-strong">{restoreFile?.name || '-'}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowRestoreConfirm(false);
                setRestoreFile(null);
              }}
            >
              {t('backup_restore_page.ui.cancel')}
            </Button>
            <Button variant="warning" icon={<Upload className="h-4 w-4" />} loading={restoring} onClick={handleRestore}>
              {t('backup_restore_page.ui.kxwjgjs')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
