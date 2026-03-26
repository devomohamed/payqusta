import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, CheckCircle, AlertTriangle, Info, Hash, RefreshCw, Zap,
  FileText, Save, TestTube, ExternalLink, Loader2
} from 'lucide-react';
import { useAuthStore, api } from '../../store';
import { Button, Input, Badge } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsWhatsApp() {
  const { t } = useTranslation('admin');
  const { tenant, getMe } = useAuthStore();
  const [whatsappForm, setWhatsappForm] = useState({
    phoneNumber: '',
    accessToken: '',
    phoneNumberId: '',
    wabaId: '',
    notifications: {},
    templateNames: {},
    templateLanguages: {}
  });

  const [saving, setSaving] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [detectingTemplates, setDetectingTemplates] = useState(false);
  const [detectedTemplates, setDetectedTemplates] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState(null);

  const [quota, setQuota] = useState({ limit: 0, used: 0 });
  const [toppingUp, setToppingUp] = useState(false);

  useEffect(() => {
    if (tenant) {
      setWhatsappStatus(null);
      setWhatsappStatus(tenant.whatsapp?.enabled && tenant.whatsapp?.accessToken ? 'success' : null);
      
      setWhatsappForm({
        phoneNumber: tenant.whatsapp?.phoneNumber || '',
        accessToken: tenant.whatsapp?.accessToken || '',
        phoneNumberId: tenant.whatsapp?.phoneNumberId || '',
        wabaId: tenant.whatsapp?.wabaId || '',
        notifications: {
          installmentReminder: tenant.whatsapp?.notifications?.installmentReminder ?? true,
          invoiceCreated: tenant.whatsapp?.notifications?.invoiceCreated ?? true,
          lowStock: tenant.whatsapp?.notifications?.lowStockAlert ?? true,
          supplierReminder: tenant.whatsapp?.notifications?.supplierPaymentDue ?? true,
        },
        templateNames: tenant.whatsapp?.templateNames || {},
        templateLanguages: tenant.whatsapp?.templateLanguages || {},
      });
      setQuota(tenant.whatsapp?.quota || { limit: 0, used: 0 });
    }
  }, [tenant]);

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/whatsapp', {
        whatsappNumber: whatsappForm.phoneNumber,
        whatsappToken: whatsappForm.accessToken,
        whatsappPhoneId: whatsappForm.phoneNumberId,
        wabaId: whatsappForm.wabaId,
        notifications: whatsappForm.notifications,
        templateNames: whatsappForm.templateNames,
        templateLanguages: whatsappForm.templateLanguages,
      });
      if (res.data.data?.configured) {
        setWhatsappStatus('success');
        notify.success(t('settings_whats_app.toasts.kqwew6b'));
      } else {
        notify.success(t('settings_whats_app.toasts.kn1bddk'));
      }
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || t('settings_whats_app.toasts.kw4gtna'));
    } finally {
      setSaving(false);
    }
  };

  const handleDetectTemplates = async () => {
    if (!whatsappForm.wabaId) return notify.warning(t('settings_whats_app.toasts.kxhzz5j'));
    setDetectingTemplates(true);
    setDetectedTemplates(null);
    try {
      const res = await api.post('/settings/whatsapp/detect-templates', { wabaId: whatsappForm.wabaId });
      const data = res.data.data;
      if (data?.success) {
        setDetectedTemplates(data);
        if (data.detectedMap && Object.keys(data.detectedMap).length > 0) {
          setWhatsappForm(prev => ({
            ...prev,
            templateNames: { ...prev.templateNames, ...data.detectedMap },
            templateLanguages: { ...prev.templateLanguages, ...data.detectedLanguages },
          }));
          notify.success(`تم اكتشاف ${Object.keys(data.detectedMap).length} قالب من أصل 5`);
        } else {
          notify.warning(t('settings_whats_app.toasts.kq5827j'));
        }
      } else {
        notify.error(data?.message || t('settings_whats_app.toasts.kh6rmtl'));
      }
    } catch (err) {
      notify.error(err.response?.data?.message || t('settings_whats_app.toasts.krakwfz'));
    } finally {
      setDetectingTemplates(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsappForm.phoneNumber) return notify.warning(t('settings_whats_app.toasts.k1cp712'));
    setTestingWhatsApp(true);
    setWhatsappStatus(null);
    try {
      const res = await api.post('/settings/whatsapp/test', { phone: whatsappForm.phoneNumber });
      if (res.data.data?.success) {
        setWhatsappStatus('success');
        notify.success(t('settings_whats_app.toasts.krspnb7'));
      } else {
        setWhatsappStatus('error');
        notify.error(res.data.data?.error?.message || t('settings_whats_app.toasts.k1po208'));
      }
    } catch (err) {
      setWhatsappStatus('error');
      notify.error(t('settings_whats_app.toasts.krakwfz'));
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const handleTopup = async () => {
    setToppingUp(true);
    try {
      const res = await api.post('/settings/whatsapp/topup', {
        packageDetails: { messages: 500 }
      });
      if (res.data?.success) {
        notify.success(res.data.message);
        getMe(); // Refetch tenant data to update quota
      }
    } catch (err) {
      notify.error(err.response?.data?.message || t('settings_whats_app.toasts.kw4gydb'));
    } finally {
      setToppingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Business API</h2>
            <p className="text-sm text-subtle">{t('settings_whats_app.ui.k5vp393')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {whatsappStatus === 'success' && <Badge variant="success"><CheckCircle className="w-3 h-3 ml-1" />{t('settings_whats_app.ui.ktefas')}</Badge>}
          {whatsappStatus === 'error' && <Badge variant="danger"><AlertTriangle className="w-3 h-3 ml-1" />{t('settings_whats_app.ui.k5xt3v7')}</Badge>}
        </div>
      </div>

      {/* Warning Box */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-700 dark:text-amber-400">{t('settings_whats_app.ui.ktezz2')}</p>
            <p className="text-amber-600 dark:text-amber-300">
              {t('settings_whats_app.ui.kpl1oqa')}
            </p>
          </div>
        </div>
      </div>

      {/* Quota Section */}
      <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-950 border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t('settings_whats_app.ui.keg08aw')}</h3>
          </div>
          <Button
            onClick={handleTopup}
            loading={toppingUp}
            icon={<Zap className="w-4 h-4" />}
            size="sm"
          >
            {t('settings_whats_app.ui.kbti7vv')}
          </Button>
        </div>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-subtle">المستهلك: {quota.used}</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">الحصة الإجمالية: {quota.limit} رسالة</span>
        </div>

        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200/50 dark:border-white/5">
          <div
            className={`h-full transition-all duration-500 ${quota.used >= quota.limit && quota.limit > 0 ? 'bg-rose-500' : (quota.limit - quota.used <= 20) && quota.limit > 0 ? 'bg-amber-500' : 'bg-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
            style={{ width: `${quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0}%` }}
          />
        </div>
        {quota.limit > 0 && quota.limit - quota.used <= 20 && quota.limit - quota.used > 0 && (
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> الرصيد أوشك على النفاذ!
          </p>
        )}
        {quota.limit > 0 && quota.used >= quota.limit && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> لقد استنفدت رصيد الرسائل. يرجى شحن الرصيد لمواصلة إرسال الإشعارات.
          </p>
        )}
      </div>

      {/* API Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label={t('settings_whats_app.form.kgrma33')} placeholder="01012345678" value={whatsappForm.phoneNumber} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })} />
        <Input label="Phone Number ID" placeholder={t('settings_whats_app.placeholders.k50xs0c')} value={whatsappForm.phoneNumberId} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })} />
      </div>
      <Input label="Access Token" type="password" placeholder={t('settings_whats_app.placeholders.k50xs0c')} value={whatsappForm.accessToken} onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })} />

      {/* WABA ID — Dynamic Switching */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-blue-700 dark:text-blue-400">WABA ID (حساب واتساب للأعمال)</h3>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
          {t('settings_whats_app.ui.kd81d3k')}
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder={t('settings_whats_app.placeholders.k9js1yc')}
              value={whatsappForm.wabaId}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, wabaId: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleDetectTemplates}
            loading={detectingTemplates}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {t('settings_whats_app.ui.kdsh4l4')}
          </Button>
        </div>
      </div>

      {/* Detected Templates Results */}
      {detectedTemplates && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
              القوالب المكتشفة — WABA {detectedTemplates.wabaId}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {detectedTemplates.approvedCount} معتمد من {detectedTemplates.totalTemplates}
            </span>
          </div>

          <div className="grid gap-2 mb-3">
            {detectedTemplates.allTemplates?.map((t) => (
              <div key={t.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-950/50 border border-gray-100 dark:border-white/5 text-sm transition-colors hover:border-emerald-200 dark:hover:border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{t.name}</span>
                  <span className="text-xs text-muted">{t.language}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                    t.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>

          {detectedTemplates.unmapped?.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              لم يتم اكتشاف قوالب لـ: {detectedTemplates.unmapped.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Template Name Mapping */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-gray-900 dark:text-white">{t('settings_whats_app.ui.kvifzg1')}</h3>
        </div>
        <p className="text-xs text-subtle mb-3">
          {t('settings_whats_app.ui.kr3c2t5')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'invoice', label: t('settings_whats_app.ui.ka500df'), icon: '🧾', defaultLang: 'ar_EG' },
            { key: 'statement', label: t('settings_whats_app.ui.kl13zfb'), icon: '📊', defaultLang: 'ar_EG' },
            { key: 'reminder', label: t('settings_whats_app.ui.k50dp2'), icon: '⏰', defaultLang: 'ar_EG' },
            { key: 'payment', label: t('settings_whats_app.ui.ks655wz'), icon: '✅', defaultLang: 'ar_EG' },
            { key: 'restock', label: t('settings_whats_app.ui.kvnox23'), icon: '📦', defaultLang: 'en' },
            { key: 'activation', label: t('settings_whats_app.ui.krlr971'), icon: '🔑', defaultLang: 'ar_EG' },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/5 shadow-sm">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-subtle mb-1">{item.label}</p>
                <input
                  type="text"
                  placeholder={`اسم القالب (مثال: payqusta_${item.key})`}
                  value={whatsappForm.templateNames[item.key] || ''}
                  onChange={(e) => setWhatsappForm({
                    ...whatsappForm,
                    templateNames: { ...whatsappForm.templateNames, [item.key]: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              <div className="w-20">
                <input
                  type="text"
                  placeholder={item.defaultLang}
                  value={whatsappForm.templateLanguages[item.key] || ''}
                  onChange={(e) => setWhatsappForm({
                    ...whatsappForm,
                    templateLanguages: { ...whatsappForm.templateLanguages, [item.key]: e.target.value }
                  })}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs text-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Toggles */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/10">
        <h3 className="font-bold mb-3 text-gray-900 dark:text-white">{t('settings_whats_app.ui.k3bcyem')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'installmentReminder', label: t('settings_whats_app.ui.k4jttjp'), icon: '⏰' },
            { key: 'invoiceCreated', label: t('settings_whats_app.ui.ka500df'), icon: '🧾' },
            { key: 'lowStock', label: t('settings_whats_app.ui.kv26hrx'), icon: '📦' },
            { key: 'supplierReminder', label: t('settings_whats_app.ui.kvy5a4a'), icon: '🚛' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:border-primary-200 dark:hover:border-primary-500/30">
              <input
                type="checkbox"
                checked={whatsappForm.notifications[item.key]}
                onChange={(e) => setWhatsappForm({
                  ...whatsappForm,
                  notifications: { ...whatsappForm.notifications, [item.key]: e.target.checked }
                })}
                className="w-4 h-4 rounded text-green-500 focus:ring-green-500"
              />
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100 dark:border-white/10">
        <Button onClick={handleSaveWhatsApp} loading={saving} icon={<Save className="w-4 h-4" />}>{t('settings_whats_app.ui.kok3ib7')}</Button>
        <Button variant="outline" onClick={handleTestWhatsApp} loading={testingWhatsApp} icon={<TestTube className="w-4 h-4" />}>{t('settings_whats_app.ui.ktufnj')}</Button>
        <a href="https://business.facebook.com/latest/whatsapp_manager/message_templates" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>{t('settings_whats_app.ui.kyoao6h')}</Button>
        </a>
      </div>
    </div>
  );
}
