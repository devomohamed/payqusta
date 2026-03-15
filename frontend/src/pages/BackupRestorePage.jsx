import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle,
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
  Shield,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { Badge, Button } from '../components/UI';
import { backupApi, useThemeStore, api } from '../store';
import { notify } from '../components/AnimatedNotification';

function formatDateTime(value) {
  if (!value) return 'غير متوفر بعد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متوفر بعد';
  return date.toLocaleString('ar-EG');
}

function formatBytes(value = 0) {
  const size = Number(value || 0);
  if (size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

const REPORT_LABELS = {
  products: 'Products',
  customers: 'Customers',
  suppliers: 'Suppliers',
  invoices: 'Invoices',
  expenses: 'Expenses',
  branches: 'Branches',
  roles: 'Roles',
  users: 'Users',
  subscriptionRequests: 'Subscription Requests',
  notifications: 'Notifications',
  auditLogs: 'Audit Logs',
  uploadBinaries: 'Upload Binaries',
  tenantConfig: 'Store Config',
  audit_logs: 'Audit logs',
  platform_level_config: 'Platform config',
  full_multi_tenant_snapshot: 'Full multi-tenant snapshot',
  upload_binary_skipped_invalid_payload: 'Some uploaded files were skipped because the backup payload was invalid.',
  subscription_request_skipped_missing_plan: 'Some subscription requests were skipped because the referenced plan could not be resolved.',
  audit_log_skipped_missing_user_mapping: 'Some audit logs were skipped because a matching restored user could not be resolved.',
  excel_restore_is_limited_to_products_customers_suppliers: 'Excel restore is limited to products, customers, and suppliers.',
  excel_restore_does_not_cover_invoices_expenses_branches_roles_users_or_tenant_config: 'Excel restore does not cover invoices, expenses, branches, roles, users, or store config.',
  user_skipped_missing_password_hash: 'Some users were skipped because the backup did not contain a valid password hash.',
  tenant_snapshot_missing_from_backup: 'The backup file did not include a tenant snapshot, so store settings were not updated.',
};

function formatReportLabel(value) {
  return REPORT_LABELS[value] || String(value || '').replace(/_/g, ' ');
}

const AUTO_BACKUP_STATUS = {
  disabled: { label: 'غير مفعّل', variant: 'gray' },
  pending: { label: 'مفعّل ولم يعمل بعد', variant: 'warning' },
  ok: { label: 'يعمل بشكل طبيعي', variant: 'success' },
  error: { label: 'آخر تشغيل فشل', variant: 'danger' },
};

export default function BackupRestorePage() {
  const { dark } = useThemeStore();
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [restoreFormat, setRestoreFormat] = useState('json');
  const [autoBackup, setAutoBackup] = useState(null);
  const [loadingAutoBackup, setLoadingAutoBackup] = useState(true);
  const [savingAutoBackup, setSavingAutoBackup] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

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
      notify.error('حدث خطأ أثناء تحميل إحصائيات النسخ الاحتياطي');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAutoBackup = async () => {
    setLoadingAutoBackup(true);
    try {
      const { data } = await backupApi.getAutoSettings();
      setAutoBackup(data.data);
      setConsentChecked(Boolean(data.data?.enabled));
    } catch (error) {
      notify.error(error?.response?.data?.message || 'تعذر تحميل حالة النسخ الاحتياطي التلقائي');
    } finally {
      setLoadingAutoBackup(false);
    }
  };

  const autoBackupStatus = useMemo(() => {
    const statusKey = autoBackup?.status || 'disabled';
    return AUTO_BACKUP_STATUS[statusKey] || AUTO_BACKUP_STATUS.disabled;
  }, [autoBackup]);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportFormat === 'json') {
        const response = await api.get('/backup/export-json', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `PayQusta_Backup_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        notify.success('تم تصدير النسخة الاحتياطية JSON بنجاح');
      } else {
        const response = await api.get('/backup/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `PayQusta_Backup_${date}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        notify.success('تم تصدير النسخة الاحتياطية Excel بنجاح');
      }
    } catch {
      notify.error('حدث خطأ أثناء التصدير');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop().toLowerCase();
    if (restoreFormat === 'json' && ext !== 'json') {
      notify.warning('يرجى اختيار ملف JSON');
      return;
    }
    if (restoreFormat === 'excel' && !['xlsx', 'xls'].includes(ext)) {
      notify.warning('يرجى اختيار ملف Excel');
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
      notify.success(data.message || 'تمت استعادة البيانات بنجاح');
      fetchStats();
    } catch (error) {
      notify.error(error?.response?.data?.message || 'حدث خطأ أثناء الاستعادة');
    } finally {
      setRestoring(false);
      setRestoreFile(null);
    }
  };

  const handleAutoBackupToggle = async (enabled) => {
    if (enabled && !consentChecked) {
      notify.warning('يرجى تأكيد الموافقة أولًا قبل تفعيل النسخ التلقائي');
      return;
    }

    setSavingAutoBackup(true);
    try {
      const { data } = await backupApi.updateAutoSettings({
        enabled,
        retentionPolicy: {
          keepLast: autoBackup?.retentionPolicy?.keepLast || 14,
        },
      });
      setAutoBackup(data.data);
      if (enabled) setConsentChecked(true);
      notify.success(data.message || (enabled ? 'تم التفعيل بنجاح' : 'تم الإيقاف بنجاح'));
    } catch (error) {
      notify.error(error?.response?.data?.message || 'تعذر تحديث إعدادات النسخ التلقائي');
    } finally {
      setSavingAutoBackup(false);
    }
  };

  const dataIcons = {
    products: { icon: Package, color: 'text-blue-600 dark:text-blue-400', label: 'Products' },
    customers: { icon: Users, color: 'text-emerald-600 dark:text-emerald-400', label: 'Customers' },
    invoices: { icon: FileSpreadsheet, color: 'text-violet-600 dark:text-violet-400', label: 'Invoices' },
    suppliers: { icon: Truck, color: 'text-amber-600 dark:text-amber-400', label: 'Suppliers' },
    expenses: { icon: Receipt, color: 'text-rose-600 dark:text-rose-400', label: 'Expenses' },
    branches: { icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', label: 'Branches' },
    roles: { icon: Shield, color: 'text-indigo-600 dark:text-indigo-400', label: 'Roles' },
    users: { icon: Users, color: 'text-fuchsia-600 dark:text-fuchsia-400', label: 'Users' },
    subscriptionRequests: { icon: Receipt, color: 'text-pink-600 dark:text-pink-400', label: 'Subscription Requests' },
    notifications: { icon: Bell, color: 'text-yellow-600 dark:text-yellow-400', label: 'Notifications' },
    auditLogs: { icon: Shield, color: 'text-orange-600 dark:text-orange-400', label: 'Audit Logs' },
    uploadBinaries: { icon: HardDrive, color: 'text-lime-600 dark:text-lime-400', label: 'Upload Binaries' },
    tenantConfig: { icon: Database, color: 'text-slate-600 dark:text-slate-300', label: 'Store Config' },
  };

  const FormatToggle = ({ value, onChange }) => (
    <div className={`inline-flex rounded-xl p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <button
        onClick={() => onChange('json')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'json'
            ? 'bg-teal-500 text-white shadow-sm'
            : dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FileJson className="w-4 h-4" />
        JSON
      </button>
      <button
        onClick={() => onChange('excel')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'excel'
            ? 'bg-teal-500 text-white shadow-sm'
            : dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">النسخ الاحتياطي والاستعادة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">تصدير يدوي، استعادة، ونسخ تلقائي يومي داخل المنصة</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" />
              <h3 className="text-lg font-bold">النسخ الاحتياطي التلقائي</h3>
              {loadingAutoBackup ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Badge variant={autoBackupStatus.variant}>{autoBackupStatus.label}</Badge>
              )}
            </div>
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300 max-w-3xl">
              عند التفعيل، سيُنشئ PayQusta نسخة JSON احتياطية يومية تلقائيًا داخل التخزين الداخلي للمنصة.
              لا نرسل رسائل نجاح يومية، ويظهر التنبيه فقط إذا فشلت عملية النسخ.
            </p>
            <div className={`rounded-xl p-4 text-sm leading-7 ${dark ? 'bg-teal-500/10 text-teal-100' : 'bg-teal-50 text-teal-800'}`}>
              <p className="font-bold mb-1">سياسة الاحتفاظ الحالية</p>
              <p>يتم الاحتفاظ بآخر {autoBackup?.retentionPolicy?.keepLast || 14} نسخة تلقائية لهذا المتجر، بدون حذف يدوي لنسخك السابقة عند الإيقاف.</p>
            </div>
          </div>

          <div className={`w-full max-w-sm rounded-2xl border p-4 ${dark ? 'border-gray-800 bg-gray-950/50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">تفعيل النسخ التلقائي</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">مرة واحدة فقط، ثم تعمل المهمة تلقائيًا كل يوم</p>
              </div>
              <button
                type="button"
                disabled={loadingAutoBackup || savingAutoBackup}
                onClick={() => handleAutoBackupToggle(!autoBackup?.enabled)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  autoBackup?.enabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-700'
                } ${(loadingAutoBackup || savingAutoBackup) ? 'opacity-60 cursor-not-allowed' : ''}`}
                aria-pressed={Boolean(autoBackup?.enabled)}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    autoBackup?.enabled ? 'translate-x-1' : 'translate-x-8'
                  }`}
                />
              </button>
            </div>

            {!autoBackup?.enabled && (
              <label className="mt-4 flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  أوافق على أن يقوم PayQusta بإنشاء وحفظ نسخ JSON احتياطية يومية تلقائيًا لهذا المتجر داخل التخزين الداخلي للمنصة.
                </span>
              </label>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className={`rounded-xl p-3 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className="text-gray-400 mb-1">آخر نجاح</p>
                <p className="font-bold text-sm">{formatDateTime(autoBackup?.lastSuccessAt)}</p>
              </div>
              <div className={`rounded-xl p-3 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className="text-gray-400 mb-1">آخر فشل</p>
                <p className="font-bold text-sm">{formatDateTime(autoBackup?.lastFailureAt)}</p>
              </div>
              <div className={`rounded-xl p-3 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className="text-gray-400 mb-1">النسخ المحتفظ بها</p>
                <p className="font-bold text-sm">{autoBackup?.storedCount ?? 0}</p>
              </div>
              <div className={`rounded-xl p-3 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
                <p className="text-gray-400 mb-1">الوجهة</p>
                <p className="font-bold text-sm">platform storage</p>
              </div>
            </div>

            {autoBackup?.lastError ? (
              <div className={`mt-4 rounded-xl border p-3 text-xs leading-6 ${dark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-100 bg-red-50 text-red-700'}`}>
                <p className="font-bold mb-1">آخر خطأ مسجل</p>
                <p>{autoBackup.lastError}</p>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button
                variant={autoBackup?.enabled ? 'outline' : 'primary'}
                className="flex-1"
                loading={savingAutoBackup}
                onClick={() => handleAutoBackupToggle(!autoBackup?.enabled)}
              >
                {autoBackup?.enabled ? 'إيقاف النسخ التلقائي' : 'تفعيل النسخ التلقائي'}
              </Button>
              <Button variant="ghost" onClick={fetchAutoBackup} icon={<RefreshCw className="w-4 h-4" />}>
                تحديث
              </Button>
            </div>
          </div>
        </div>

        {autoBackup?.recentBackups?.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-teal-500" />
              <p className="font-bold text-sm">آخر النسخ التلقائية المحفوظة</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {autoBackup.recentBackups.map((backup) => (
                <div key={backup.key} className={`rounded-xl border p-4 ${dark ? 'border-gray-800 bg-gray-950/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="font-bold text-sm truncate">{backup.filename}</p>
                  <p className="mt-2 text-xs text-gray-500">الحجم: {formatBytes(backup.size)}</p>
                  <p className="mt-1 text-xs text-gray-500">أُنشئت: {formatDateTime(backup.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-5">
          <HardDrive className="w-5 h-5 text-teal-500" />
          <h3 className="text-lg font-bold">بيانات المتجر الحالية</h3>
          <button onClick={fetchStats} className="mr-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingStats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {Object.entries(dataIcons).map(([key, { icon: Icon, color, label }]) => (
              <div key={key} className={`text-center p-4 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 bg-white dark:bg-gray-900 shadow-sm">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold">تصدير نسخة احتياطية يدويًا</h3>
          </div>
          <FormatToggle value={exportFormat} onChange={setExportFormat} />
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <div className="flex gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-blue-700 dark:text-blue-300">
              {exportFormat === 'json' ? (
                <>
                  <p className="font-medium mb-1">JSON هو التنسيق الموصى به لنسخة أكثر اكتمالًا وقابلية للاستعادة.</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>يتضمن المنتجات والعملاء والموردين والفواتير والمصروفات</li>
                    <li>مناسب للاستعادة أو النقل بين البيئات</li>
                    <li>هو نفس التنسيق الذي تستخدمه مهمة النسخ التلقائي</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">Excel مفيد للمراجعة البشرية السريعة ومشاركة البيانات داخليًا.</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>يعرض البيانات في أوراق منفصلة قابلة للقراءة</li>
                    <li>أخف في المراجعة ولكن أقل اكتمالًا من JSON في الاستعادة</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<Download className="w-4 h-4" />}
            loading={exporting}
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            {exportFormat === 'json' ? 'تحميل النسخة الاحتياطية (JSON)' : 'تحميل النسخة الاحتياطية (Excel)'}
          </Button>
          {exportFormat === 'json' && (
            <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
              موصى به
            </span>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold">استعادة من نسخة احتياطية</h3>
          </div>
          <FormatToggle value={restoreFormat} onChange={setRestoreFormat} />
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <div className="flex gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-amber-700 dark:text-amber-300">
              <p className="font-medium">الاستعادة هنا additive وليست destructive.</p>
              <p className="text-xs mt-1">
                البيانات الموجودة لن تُحذف، وسيتم تخطي السجلات المكررة تلقائيًا حسب قواعد المطابقة الحالية.
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

        <Button
          variant="warning"
          icon={restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          disabled={restoring}
          onClick={() => fileInputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          {restoring
            ? 'جارٍ الاستعادة...'
            : restoreFormat === 'json'
              ? 'اختيار ملف النسخة الاحتياطية (JSON)'
              : 'اختيار ملف النسخة الاحتياطية (Excel)'}
        </Button>
      </div>

      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowRestoreConfirm(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl ${dark ? 'bg-gray-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">تأكيد الاستعادة</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                هل أنت متأكد من استعادة البيانات من الملف:
                <br />
                <span className="font-medium text-gray-700 dark:text-gray-300">{restoreFile?.name}</span>
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); }}>
                إلغاء
              </Button>
              <Button variant="warning" onClick={handleRestore} icon={<Upload className="w-4 h-4" />}>
                تأكيد الاستعادة
              </Button>
            </div>
          </div>
        </div>
      )}

      {restoreResult && (
        <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold mb-1">Restore completed successfully</h3>
            {restoreResult.totalImported !== undefined && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Imported {restoreResult.totalImported} records and skipped {restoreResult.totalSkipped} duplicates
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {Object.entries(dataIcons).map(([key, { label }]) => {
              const val = restoreResult[key];
              if (!val && val !== 0) return null;
              const imported = typeof val === 'object' ? val.imported : val;
              const skipped = typeof val === 'object' ? val.skipped : 0;

              return (
                <div key={key} className={`text-center p-3 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <p className="text-xl font-bold text-emerald-500">{imported || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                  {skipped > 0 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">({skipped} skipped)</p>
                  )}
                </div>
              );
            })}
          </div>

          {restoreResult.report ? (
            <div className="mt-6 space-y-4">
              {restoreResult.report.backupMetadata ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Backup version</p>
                    <p className="font-bold text-sm mt-1">{restoreResult.report.backupMetadata.version || '-'}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Exported at</p>
                    <p className="font-bold text-sm mt-1">{formatDateTime(restoreResult.report.backupMetadata.exportedAt)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Source tenant</p>
                    <p className="font-bold text-sm mt-1 break-all">{restoreResult.report.backupMetadata.sourceTenant || '-'}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">Format</p>
                    <p className="font-bold text-sm mt-1 uppercase">{restoreResult.report.format || '-'}</p>
                  </div>
                </div>
              ) : null}

              <div className={`rounded-xl border p-4 ${dark ? 'border-gray-800 bg-gray-950/40' : 'border-gray-100 bg-gray-50'}`}>
                <p className="font-bold text-sm mb-3">Restore validation report</p>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-gray-500 mb-2">Included domains in backup</p>
                    <div className="flex flex-wrap gap-2">
                      {(restoreResult.report.coverage?.includedDomains || []).map((item) => (
                        <span key={item} className={`px-2 py-1 rounded-full ${dark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                          {formatReportLabel(item)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(restoreResult.report.coverage?.missingDomains || []).length > 0 ? (
                    <div>
                      <p className="text-gray-500 mb-2">Supported but missing from this file</p>
                      <div className="flex flex-wrap gap-2">
                        {restoreResult.report.coverage.missingDomains.map((item) => (
                          <span key={item} className={`px-2 py-1 rounded-full ${dark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                            {formatReportLabel(item)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-gray-500 mb-2">Current backup gaps</p>
                    <div className="flex flex-wrap gap-2">
                      {(restoreResult.report.coverage?.knownGaps || []).map((item) => (
                        <span key={item} className={`px-2 py-1 rounded-full ${dark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>
                          {formatReportLabel(item)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(restoreResult.report.warnings || []).length > 0 ? (
                <div className={`rounded-xl border p-4 text-sm ${dark ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
                  <p className="font-bold mb-2">Validation notes</p>
                  <ul className="space-y-1.5 list-disc pr-4">
                    {restoreResult.report.warnings.map((warning) => (
                      <li key={warning}>{formatReportLabel(warning)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
