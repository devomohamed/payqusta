import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, Download, FileSpreadsheet, Package, Users, Eye,
  CheckCircle, AlertTriangle, Loader2, X, ArrowLeft,
  FileText, Info, RefreshCw, AlertCircle,
} from 'lucide-react';
import { useThemeStore, api } from '../store';
import { Button } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const getImportTypes = (t) => [
  {
    id: 'products',
    label: t('import_data_page.ui.ks0nri5'),
    icon: Package,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    description: t('import_data_page.ui.ks2te2h'),
    columns: ['اسم المنتج', 'SKU', t('import_data_page.ui.kovdxm6'), t('import_data_page.ui.kq42fqv'), t('import_data_page.ui.kaay54y'), t('import_data_page.ui.kove8lz'), 'الباركود'],
  },
  {
    id: 'customers',
    label: t('import_data_page.ui.kzgg8kr'),
    icon: Users,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    description: t('import_data_page.ui.kelwazx'),
    columns: ['اسم العميل', t('import_data_page.ui.kaaw86k'), t('import_data_page.ui.kabfslx'), t('import_data_page.ui.kzgfilf'), 'الملاحظات'],
  },
];

export default function ImportDataPage() {
  const { t } = useTranslation('admin');
  const { dark } = useThemeStore();
  const fileInputRef = useRef(null);
  const importTypes = useMemo(() => getImportTypes(t), [t]);

  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('skip'); // skip | update
  const [result, setResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      notify.warning(t('import_data_page.toasts.kdo2wqx'));
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      notify.warning(t('import_data_page.toasts.kwigjaf'));
      return;
    }

    setFile(selected);
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!file) return notify.warning(t('import_data_page.toasts.katujxu'));

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.data);
    } catch (err) {
      notify.error(err.response?.data?.message || t('import_data_page.toasts.k1bj4nt'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedType) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipDuplicates', duplicateMode === 'skip' ? 'true' : 'false');
      formData.append('updateExisting', duplicateMode === 'update' ? 'true' : 'false');

      const { data } = await api.post(`/import/${selectedType.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      notify.success(data.message || t('import_data_page.toasts.kskv2gx'));
    } catch (err) {
      notify.error(err.response?.data?.message || t('import_data_page.toasts.kufxwtm'));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async (type) => {
    setDownloadingTemplate(true);
    try {
      const response = await api.get(`/import/template/${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success(t('import_data_page.toasts.kofqyl'));
    } catch (err) {
      notify.error(t('import_data_page.toasts.k5mkh9g'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const resetState = () => {
    setSelectedType(null);
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            {selectedType && (
              <button onClick={resetState} className="mt-1 rounded-xl p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-500/80">Import Studio</p>
                <h1 className="text-2xl font-bold">{t('import_data_page.ui.kku9gz8')}</h1>
                <p className="max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                  {selectedType ? `استيراد ${selectedType.label} من ملف Excel أو CSV` : 'اختر نوع البيانات المراد استيرادها'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ResultCard label={t('import_data_page.form.kz8l2be')} value={importTypes.length} color="blue" dark={dark} />
            <ResultCard label={t('import_data_page.form.koveb8l')} value={file ? 1 : 0} color="emerald" dark={dark} />
            <ResultCard label={t('import_data_page.form.ks7ud6x')} value={preview?.totalRows || 0} color="amber" dark={dark} />
            <ResultCard label={t('import_data_page.form.kz9s0xm')} value={result?.imported || result?.created || 0} color="gray" dark={dark} />
          </div>
        </div>
      </section>

      {/* Step 1: Choose type */}
      {!selectedType && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {importTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className={`p-6 rounded-2xl border text-right transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                dark ? 'bg-gray-900 border-gray-800 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 shadow-lg`}>
                <type.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">استيراد {type.label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{type.description}</p>
              <div className="flex flex-wrap gap-2">
                {type.columns.map((col) => (
                  <span key={col} className={`px-2 py-1 rounded-lg text-xs font-medium ${type.bgColor} ${type.textColor}`}>
                    {col}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Upload & Import */}
      {selectedType && !result && (
        <>
          {/* Download Template */}
          <div className={`rounded-2xl border p-5 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${selectedType.bgColor} flex items-center justify-center`}>
                  <FileSpreadsheet className={`w-5 h-5 ${selectedType.textColor}`} />
                </div>
                <div>
                  <h3 className="font-bold">تحميل قالب {selectedType.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('import_data_page.ui.ksag6tt')}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                icon={<Download className="w-4 h-4" />}
                loading={downloadingTemplate}
                onClick={() => handleDownloadTemplate(selectedType.id)}
              >
                {t('import_data_page.ui.kmyhzka')}
              </Button>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary-400 ${
              dark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'
            } ${file ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-500/5' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-primary-500" />
                <div className="text-right">
                  <p className="font-bold text-primary-600 dark:text-primary-400">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-600 dark:text-gray-300">{t('import_data_page.ui.kd3pxec')}</p>
                <p className="text-sm text-gray-400 mt-1">Excel (.xlsx, .xls) أو CSV (.csv) - الحد الأقصى 10MB</p>
              </>
            )}
          </div>

          {/* Options */}
          {file && (
            <div className={`rounded-2xl border p-5 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                {t('import_data_page.ui.kz6tm87')}
              </h3>
              <div className="flex gap-4 flex-wrap">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition ${
                  duplicateMode === 'skip'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : dark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="duplicateMode"
                    value="skip"
                    checked={duplicateMode === 'skip'}
                    onChange={() => setDuplicateMode('skip')}
                    className="hidden"
                  />
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('import_data_page.ui.kpwgbb0')}</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition ${
                  duplicateMode === 'update'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : dark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="duplicateMode"
                    value="update"
                    checked={duplicateMode === 'update'}
                    onChange={() => setDuplicateMode('update')}
                    className="hidden"
                  />
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('import_data_page.ui.kd5ydhq')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className={`rounded-2xl border p-5 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" />
                معاينة البيانات ({preview.totalRows} صف)
              </h3>
              <div className="space-y-3 md:hidden">
                {preview.rows?.slice(0, 5).map((row, i) => (
                  <div key={i} className={`rounded-2xl border p-4 ${dark ? 'border-gray-800 bg-gray-800/40' : 'border-gray-100 bg-gray-50'}`}>
                    {preview.headers?.map((header, j) => (
                      <div key={`${i}-${j}`} className="flex items-start justify-between gap-4 py-1.5 text-sm">
                        <span className="text-gray-400">{header}</span>
                        <span className="text-right text-gray-700 dark:text-gray-300">{row[j] || '-'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={dark ? 'border-b border-gray-700' : 'border-b border-gray-200'}>
                      {preview.headers?.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-right font-bold text-xs text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows?.slice(0, 5).map((row, i) => (
                      <tr key={i} className={dark ? 'border-b border-gray-800' : 'border-b border-gray-100'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.totalRows > 5 && (
                <p className="text-xs text-gray-400 mt-2 text-center">يتم عرض أول 5 صفوف من {preview.totalRows}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {file && (
            <div className="flex gap-3 justify-end flex-wrap">
              <Button
                variant="ghost"
                icon={<Eye className="w-4 h-4" />}
                loading={previewing}
                onClick={handlePreview}
              >
                {t('import_data_page.ui.k3pv056')}
              </Button>
              <Button
                icon={<Upload className="w-4 h-4" />}
                loading={importing}
                onClick={handleImport}
              >
                {t('import_data_page.ui.kvz3u16')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-1">{t('import_data_page.ui.kxlegu6')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('import_data_page.ui.klqz5tf')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <ResultCard label={t('import_data_page.form.kfgfv03')} value={result.total || 0} color="blue" dark={dark} />
            <ResultCard label={t('import_data_page.form.ke9evb5')} value={result.imported || result.created || 0} color="emerald" dark={dark} />
            <ResultCard label={t('import_data_page.form.km6rs4h')} value={result.updated || 0} color="amber" dark={dark} />
            <ResultCard label={t('import_data_page.form.kwski6t')} value={result.skipped || 0} color="gray" dark={dark} />
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className={`rounded-xl p-4 mb-4 ${dark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <h4 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                أخطاء ({result.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-500">
                    صف {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={resetState} icon={<ArrowLeft className="w-4 h-4" />}>
              {t('import_data_page.ui.k1uh5n6')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, color, dark }) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={`text-center p-4 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
