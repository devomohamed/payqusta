import React, { useState, useEffect } from 'react';
import {
  MessageCircle, CheckCircle, AlertTriangle, Info, Hash, RefreshCw, Zap,
  FileText, Save, TestTube, ExternalLink, Loader2
} from 'lucide-react';
import { useAuthStore, api } from '../../store';
import { Button, Input, Badge } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsWhatsApp() {
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
      if (tenant.whatsapp?.enabled && tenant.whatsapp?.accessToken) {
        setWhatsappStatus('success');
      }
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
        notify.success('تم حفظ وتفعيل WhatsApp');
      } else {
        notify.success('تم حفظ الإعدادات');
      }
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDetectTemplates = async () => {
    if (!whatsappForm.wabaId) return notify.warning('أدخل WABA ID أولاً');
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
          notify.warning('لم يتم العثور على قوالب معتمدة في هذا الحساب');
        }
      } else {
        notify.error(data?.message || 'فشل جلب القوالب');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الاتصال');
    } finally {
      setDetectingTemplates(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsappForm.phoneNumber) return notify.warning('أدخل رقم الاختبار');
    setTestingWhatsApp(true);
    setWhatsappStatus(null);
    try {
      const res = await api.post('/settings/whatsapp/test', { phone: whatsappForm.phoneNumber });
      if (res.data.data?.success) {
        setWhatsappStatus('success');
        notify.success('تم إرسال رسالة الاختبار');
      } else {
        setWhatsappStatus('error');
        notify.error(res.data.data?.error?.message || 'فشل الإرسال');
      }
    } catch (err) {
      setWhatsappStatus('error');
      notify.error('خطأ في الاتصال');
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
      notify.error(err.response?.data?.message || 'خطأ في الشحن');
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
            <h2 className="text-xl font-bold">WhatsApp Business API</h2>
            <p className="text-sm text-gray-400">إرسال الإشعارات عبر واتساب</p>
          </div>
        </div>
        {whatsappStatus === 'success' && <Badge variant="success"><CheckCircle className="w-3 h-3 ml-1" />متصل</Badge>}
        {whatsappStatus === 'error' && <Badge variant="danger"><AlertTriangle className="w-3 h-3 ml-1" />غير متصل</Badge>}
      </div>

      {/* Warning Box */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-amber-700 dark:text-amber-400">مهم!</p>
            <p className="text-amber-600 dark:text-amber-300">
              لإرسال رسائل للعملاء في أي وقت، يجب إنشاء Message Templates في Meta Business Suite.
            </p>
          </div>
        </div>
      </div>

      {/* Quota Section */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold">رصيد الرسائل (Quota)</h3>
          </div>
          <Button
            onClick={handleTopup}
            loading={toppingUp}
            icon={<Zap className="w-4 h-4" />}
          >
            شحن الرصيد (500 رسالة)
          </Button>
        </div>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">المستهلك: {quota.used}</span>
          <span className="font-bold">الحصة الإجمالية: {quota.limit} رسالة</span>
        </div>

        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${quota.used >= quota.limit && quota.limit > 0 ? 'bg-red-500' : (quota.limit - quota.used <= 20) && quota.limit > 0 ? 'bg-amber-500' : 'bg-primary-500'}`}
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
        <Input label="رقم WhatsApp للاختبار" placeholder="01012345678" value={whatsappForm.phoneNumber} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })} />
        <Input label="Phone Number ID" placeholder="من Meta Business Suite" value={whatsappForm.phoneNumberId} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })} />
      </div>
      <Input label="Access Token" type="password" placeholder="من Meta Business Suite" value={whatsappForm.accessToken} onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })} />

      {/* WABA ID — Dynamic Switching */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-blue-700 dark:text-blue-400">WABA ID (حساب واتساب للأعمال)</h3>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
          يمكنك التبديل بين حسابات WABA مختلفة. كل حساب له قوالب رسائل خاصة به.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="مثال: 841398878900170"
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
            اكتشاف القوالب
          </Button>
        </div>
      </div>

      {/* Detected Templates Results */}
      {detectedTemplates && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
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
              <div key={t.name} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-gray-400">{t.language}</span>
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
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold">ربط القوالب (Template Mapping)</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          حدد اسم القالب لكل نوع إشعار. يتم ملؤها تلقائياً عند اكتشاف القوالب.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'invoice', label: 'فاتورة جديدة', icon: '🧾', defaultLang: 'ar_EG' },
            { key: 'statement', label: 'كشف حساب', icon: '📊', defaultLang: 'ar_EG' },
            { key: 'reminder', label: 'تذكير قسط', icon: '⏰', defaultLang: 'ar_EG' },
            { key: 'payment', label: 'تأكيد دفعة', icon: '✅', defaultLang: 'ar_EG' },
            { key: 'restock', label: 'طلب تخزين', icon: '📦', defaultLang: 'en' },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                <input
                  type="text"
                  placeholder={`اسم القالب (مثال: payqusta_${item.key})`}
                  value={whatsappForm.templateNames[item.key] || ''}
                  onChange={(e) => setWhatsappForm({
                    ...whatsappForm,
                    templateNames: { ...whatsappForm.templateNames, [item.key]: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs bg-transparent border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                  className="w-full px-2 py-1.5 rounded-lg border text-xs text-center bg-transparent border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Toggles */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <h3 className="font-bold mb-3">إشعارات واتساب</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'installmentReminder', label: 'تذكير الأقساط', icon: '⏰' },
            { key: 'invoiceCreated', label: 'فاتورة جديدة', icon: '🧾' },
            { key: 'lowStock', label: 'نقص المخزون', icon: '📦' },
            { key: 'supplierReminder', label: 'تذكير المورد', icon: '🚛' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={whatsappForm.notifications[item.key]}
                onChange={(e) => setWhatsappForm({
                  ...whatsappForm,
                  notifications: { ...whatsappForm.notifications, [item.key]: e.target.checked }
                })}
                className="w-4 h-4 rounded text-green-500"
              />
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSaveWhatsApp} loading={saving} icon={<Save className="w-4 h-4" />}>حفظ الإعدادات</Button>
        <Button variant="outline" onClick={handleTestWhatsApp} loading={testingWhatsApp} icon={<TestTube className="w-4 h-4" />}>اختبار الاتصال</Button>
        <a href="https://business.facebook.com/latest/whatsapp_manager/message_templates" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>فتح Meta Business Suite</Button>
        </a>
      </div>
    </div>
  );
}
