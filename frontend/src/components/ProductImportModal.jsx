import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  FileUp,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../store';

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isValidFile(file) {
  if (!file) return false;
  const ext = file.name?.toLowerCase()?.match(/\.[^.]+$/)?.[0];
  return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
}

export default function ProductImportModal({ isOpen, onClose, onImportComplete }) {
  const { t } = useTranslation('admin');
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [report, setReport] = useState(null);
  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setDragOver(false);
    setUploading(false);
    setProgress(0);
    setReport(null);
    setUpdateExisting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [onClose, reset]);

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!isValidFile(selectedFile)) {
      toast.error(t('product_import_modal.toasts.krybssx'));
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(t('product_import_modal.toasts.kukvos4'));
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
    handleFileSelect(event.dataTransfer?.files?.[0]);
  }, [handleFileSelect]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const res = await api.get('/import/template/products', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = t('product_import_modal.ui.kh1dirg');
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t('product_import_modal.toasts.kic8u7h'));
    } catch {
      toast.error(t('product_import_modal.toasts.kr2j5o8'));
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setStep('importing');
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('updateExisting', updateExisting ? 'true' : 'false');
      formData.append('skipDuplicates', 'true');

      const res = await api.post('/import/products', formData, {
        timeout: 120000,
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 50));
          }
        },
      });

      setProgress(100);
      setReport(res.data?.data || res.data);
      setStep('report');
      onImportComplete?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || t('product_import_modal.toasts.ka3lhtp'));
      setStep('upload');
    } finally {
      setUploading(false);
    }
  }, [file, onImportComplete, updateExisting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        dir="rtl"
        className="app-surface relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[color:var(--surface-border)] shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        style={{ maxHeight: '90vh' }}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary-500" />

        <div className="flex items-center justify-between border-b border-[color:var(--surface-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/15 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black app-text-body">{t('product_import_modal.ui.kqv4jum')}</h2>
              <p className="text-xs app-text-muted">
                {step === 'upload' && 'ارفع ملف Excel أو CSV لاستيراد المنتجات'}
                {step === 'importing' && 'جارٍ استيراد المنتجات...'}
                {step === 'report' && 'تم الانتهاء، راجع التقرير النهائي'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="app-surface-muted app-text-soft rounded-xl p-2 transition-colors hover:bg-black/[0.04] hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {step === 'upload' && (
            <div className="space-y-5">
              <button
                onClick={handleDownloadTemplate}
                className="flex w-full items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/60 px-4 py-3 text-sm font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <Download className="h-5 w-5" />
                <span>{t('product_import_modal.ui.kgfflau')}</span>
                <span className="mr-auto text-xs text-emerald-500 dark:text-emerald-300">.xlsx</span>
              </button>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 py-12 text-center transition-all',
                  dragOver
                    ? 'border-primary-400 bg-primary-50/50 dark:border-primary-500 dark:bg-primary-500/10'
                    : file
                      ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-500/10'
                      : 'app-surface-muted border-[color:var(--surface-border)] hover:border-primary-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
                ].join(' ')}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => handleFileSelect(event.target.files?.[0])}
                />

                {file ? (
                  <>
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300">
                      <FileUp className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-black app-text-body">{file.name}</p>
                    <p className="mt-1 text-xs app-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setFile(null);
                      }}
                      className="mt-3 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('product_import_modal.ui.kdp25to')}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl app-surface text-gray-400 dark:text-gray-500">
                      <Upload className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-bold app-text-body">{t('product_import_modal.ui.kfwduqy')}</p>
                    <p className="mt-1 text-xs app-text-muted">xlsx, xls, csv - حد أقصى 10 MB</p>
                  </>
                )}
              </div>

              <label className="app-surface-muted flex items-center gap-3 rounded-2xl border border-[color:var(--surface-border)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(event) => setUpdateExisting(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="text-sm font-bold app-text-body">{t('product_import_modal.ui.kx9o76o')}</p>
                  <p className="text-xs app-text-muted">{t('product_import_modal.ui.k9y892u')}</p>
                </div>
              </label>

              <button
                onClick={handleImport}
                disabled={!file}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <Upload className="h-4 w-4" />
                {t('product_import_modal.ui.kvz3u16')}
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-300">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <p className="mt-4 text-sm font-black app-text-body">{t('product_import_modal.ui.ks9jvbj')}</p>
              <p className="mt-1 text-xs app-text-muted">{t('product_import_modal.ui.kbg8u4l')}</p>

              <div className="mt-6 w-full max-w-xs">
                <div className="h-2 overflow-hidden rounded-full app-surface-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs app-text-muted">{progress}%</p>
              </div>
            </div>
          )}

          {step === 'report' && report && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-500/10">
                  <CheckCircle className="mx-auto h-6 w-6 text-emerald-500" />
                  <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{report.created || 0}</p>
                  <p className="text-xs font-bold text-emerald-700/70 dark:text-emerald-300/70">{t('product_import_modal.ui.kgv69bk')}</p>
                </div>

                <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 text-center dark:border-blue-900/40 dark:bg-blue-500/10">
                  <CheckCircle className="mx-auto h-6 w-6 text-blue-500" />
                  <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{report.updated || 0}</p>
                  <p className="text-xs font-bold text-blue-700/70 dark:text-blue-300/70">{t('product_import_modal.ui.kar7l11')}</p>
                </div>

                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-center dark:border-amber-900/40 dark:bg-amber-500/10">
                  <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
                  <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{report.skipped || 0}</p>
                  <p className="text-xs font-bold text-amber-700/70 dark:text-amber-300/70">{t('product_import_modal.ui.kn9d52f')}</p>
                </div>

                <div className="rounded-2xl border border-red-200/70 bg-red-50/60 p-4 text-center dark:border-red-900/40 dark:bg-red-500/10">
                  <XCircle className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-2 text-2xl font-black text-red-700 dark:text-red-300">{report.errorsCount || 0}</p>
                  <p className="text-xs font-bold text-red-700/70 dark:text-red-300/70">{t('product_import_modal.ui.ky2dt')}</p>
                </div>
              </div>

              {report.warnings?.length > 0 && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-500/10">
                  <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    تحذيرات ({report.warnings.length})
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-700 dark:text-amber-300/80">
                    {report.warnings.map((warning, index) => (
                      <li key={index} className="rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-500/10">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.errors?.length > 0 && (
                <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-4 dark:border-red-900/30 dark:bg-red-500/10">
                  <p className="mb-2 flex items-center gap-2 text-sm font-black text-red-700 dark:text-red-300">
                    <XCircle className="h-4 w-4" />
                    أخطاء ({report.errors.length})
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-700 dark:text-red-300/80">
                    {report.errors.map((error, index) => (
                      <li key={index} className="rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-500/10">
                        {typeof error === 'string' ? error : `صف ${error.row}: ${error.error}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
              >
                <CheckCircle className="h-4 w-4" />
                {t('product_import_modal.ui.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
