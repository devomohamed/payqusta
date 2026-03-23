import React, { useState, useEffect } from 'react';
import {
  BellRing, Save, Mail, MessageSquare, TestTube, Share2, Info, Building2
} from 'lucide-react';
import { useAuthStore, api } from '../../store';
import { Button, Input, Switch, Select } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsNotificationChannels() {
  const { tenant, getMe } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const [form, setForm] = useState({
    routing: { mode: 'smart', fallbackEnabled: true },
    email: { enabled: false, mode: 'platform_default', host: '', port: 587, secure: false, user: '', pass: '', fromEmail: '', fromName: '' },
    sms: { enabled: false, mode: 'platform_default', provider: 'mock', baseUrl: '', apiKey: '', apiSecret: '', senderId: '' },
    branding: { senderName: '', replyToEmail: '', supportPhone: '', supportEmail: '', showPoweredByFooter: true }
  });

  const [platformStatus, setPlatformStatus] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (tenant) {
      setForm({
        routing: {
          mode: tenant.notificationChannels?.routing?.mode || 'smart',
          fallbackEnabled: tenant.notificationChannels?.routing?.fallbackEnabled ?? true,
        },
        email: {
          enabled: tenant.notificationChannels?.email?.enabled ?? false,
          mode: tenant.notificationChannels?.email?.mode || 'platform_default',
          host: tenant.notificationChannels?.email?.host || '',
          port: tenant.notificationChannels?.email?.port || 587,
          secure: tenant.notificationChannels?.email?.secure ?? false,
          user: tenant.notificationChannels?.email?.user || '',
          pass: tenant.notificationChannels?.email?.pass || '',
          fromEmail: tenant.notificationChannels?.email?.fromEmail || '',
          fromName: tenant.notificationChannels?.email?.fromName || '',
        },
        sms: {
          enabled: tenant.notificationChannels?.sms?.enabled ?? false,
          mode: tenant.notificationChannels?.sms?.mode || 'platform_default',
          provider: tenant.notificationChannels?.sms?.provider || 'mock',
          baseUrl: tenant.notificationChannels?.sms?.baseUrl || '',
          apiKey: tenant.notificationChannels?.sms?.apiKey || '',
          apiSecret: tenant.notificationChannels?.sms?.apiSecret || '',
          senderId: tenant.notificationChannels?.sms?.senderId || '',
        },
        branding: {
          senderName: tenant.notificationBranding?.senderName || '',
          replyToEmail: tenant.notificationBranding?.replyToEmail || '',
          supportPhone: tenant.notificationBranding?.supportPhone || '',
          supportEmail: tenant.notificationBranding?.supportEmail || '',
          showPoweredByFooter: tenant.notificationBranding?.showPoweredByFooter ?? true,
        }
      });
      setTestEmail(tenant.businessInfo?.email || '');
      setTestPhone(tenant.businessInfo?.phone || '');
    }
  }, [tenant]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/settings/notification-channels/status');
      setPlatformStatus(res.data.data.platform);
    } catch (err) {
      console.error('Failed to fetch platform status', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/notification-channels', {
        notificationChannels: {
          routing: form.routing,
          email: form.email,
          sms: form.sms,
        },
        notificationBranding: form.branding,
      });
      notify.success('تم حفظ إعدادات الإشعارات بنجاح');
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return notify.warning('يرجى إدخال بريد إلكتروني للاختبار');
    setTestingEmail(true);
    try {
      const res = await api.post('/settings/notification-channels/test-email', {
        email: testEmail,
        notificationChannels: { email: form.email, routing: form.routing },
        notificationBranding: form.branding
      });
      notify.success(res.data.message || 'تم الإرسال بنجاح');
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل إرسال رسالة الاختبار');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) return notify.warning('يرجى إدخال رقم هاتف للاختبار');
    setTestingSms(true);
    try {
      const res = await api.post('/settings/notification-channels/test-sms', {
        phone: testPhone,
        notificationChannels: { sms: form.sms, routing: form.routing },
        notificationBranding: form.branding
      });
      notify.success(res.data.message || 'تم الإرسال بنجاح');
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل إرسال رسالة الاختبار');
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
          <BellRing className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">قنوات الإشعارات (Notification Channels)</h2>
          <p className="text-sm text-subtle">إدارة تفضيلات الإرسال (واتساب، إيميل، رسائل نصية) للعملاء</p>
        </div>
      </div>

      {/* Routing Mode */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-lg">وضع التوجيه (Routing Mode)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="القناة المفضلة الأساسية"
            value={form.routing.mode}
            onChange={(e) => setForm({ ...form, routing: { ...form.routing, mode: e.target.value } })}
            options={[
              { value: 'smart', label: 'ذكي (أفضل قناة متاحة)' },
              { value: 'whatsapp_preferred', label: 'واتساب مفضل (ثم بدائل أخرى)' },
              { value: 'whatsapp_only', label: 'واتساب فقط' },
              { value: 'email_only', label: 'بريد إلكتروني فقط' },
              { value: 'sms_only', label: 'رسائل نصية فقط' },
            ]}
          />
          <div className="flex items-center mt-6">
            <Switch
              checked={form.routing.fallbackEnabled}
              onChange={(checked) => setForm({ ...form, routing: { ...form.routing, fallbackEnabled: checked } })}
              label="تفعيل البدائل (Fallback)"
              description="الإرسال عبر قناة بديلة إذا فشلت القناة الأساسية"
            />
          </div>
        </div>
        <div className="p-3 mt-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p>عند اختيار <strong>واتساب مفضل</strong>، سيقوم النظام بمحاولة الإرسال عبر واتساب أولاً وتفعيل البدائل إذا فشل الإرسال (يتطلب تفعيل البدائل). يجب تفعيل واتساب من قائمة الإعدادات الخاصة به.</p>
        </div>
      </section>

      {/* Notification Branding */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-lg">هوية المرسل (Branding)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="اسم المرسل (Sender Name)" 
            placeholder="اسم المتجر الذي يظهر للعميل" 
            value={form.branding.senderName} 
            onChange={(e) => setForm({ ...form, branding: { ...form.branding, senderName: e.target.value } })} 
          />
          <Input 
            label="البريد للرد (Reply-To Email)" 
            type="email"
            placeholder="support@yourstore.com" 
            value={form.branding.replyToEmail} 
            onChange={(e) => setForm({ ...form, branding: { ...form.branding, replyToEmail: e.target.value } })} 
          />
          <Input 
            label="بريد الدعم (Support Email)" 
            type="email"
            value={form.branding.supportEmail} 
            onChange={(e) => setForm({ ...form, branding: { ...form.branding, supportEmail: e.target.value } })} 
          />
          <Input 
            label="هاتف الدعم (Support Phone)" 
            type="tel"
            value={form.branding.supportPhone} 
            onChange={(e) => setForm({ ...form, branding: { ...form.branding, supportPhone: e.target.value } })} 
          />
        </div>
      </section>

      {/* Email Config */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-lg">البريد الإلكتروني (Email)</h3>
          </div>
          <Switch
            checked={form.email.enabled}
            onChange={(checked) => setForm({ ...form, email: { ...form.email, enabled: checked } })}
          />
        </div>
        
        {form.email.enabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <Select
              label="مزود الخدمة"
              value={form.email.mode}
              onChange={(e) => setForm({ ...form, email: { ...form.email, mode: e.target.value } })}
              options={[
                { value: 'platform_default', label: 'الافتراضي للمنصة (مجاني/مدمج)' },
                { value: 'custom_smtp', label: 'مزود SMTP مخصص' },
              ]}
            />
            
            {form.email.mode === 'custom_smtp' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <Input label="Host" placeholder="smtp.gmail.com" value={form.email.host} onChange={e => setForm({...form, email: {...form.email, host: e.target.value}})} />
                <Input label="Port" type="number" placeholder="587" value={form.email.port} onChange={e => setForm({...form, email: {...form.email, port: parseInt(e.target.value)}})} />
                <Input label="Username" placeholder="user@domain.com" value={form.email.user} onChange={e => setForm({...form, email: {...form.email, user: e.target.value}})} />
                <Input label="Password" type="password" placeholder="••••••••" value={form.email.pass} onChange={e => setForm({...form, email: {...form.email, pass: e.target.value}})} />
                <Input label="From Email" placeholder="noreply@domain.com" value={form.email.fromEmail} onChange={e => setForm({...form, email: {...form.email, fromEmail: e.target.value}})} />
                <Input label="From Name" placeholder="My Store" value={form.email.fromName} onChange={e => setForm({...form, email: {...form.email, fromName: e.target.value}})} />
                <div className="col-span-full">
                  <Switch checked={form.email.secure} onChange={checked => setForm({...form, email: {...form.email, secure: checked}})} label="استخدام اتصال آمن (SSL/TLS)" />
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="flex-1 max-w-xs">
                <Input placeholder="بريد إلكتروني للاختبار" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleTestEmail} loading={testingEmail} icon={<TestTube className="w-4 h-4" />}>
                اختبار البريد
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* SMS Config */}
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-lg">الرسائل النصية (SMS)</h3>
          </div>
          <Switch
            checked={form.sms.enabled}
            onChange={(checked) => setForm({ ...form, sms: { ...form.sms, enabled: checked } })}
          />
        </div>
        
        {form.sms.enabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <Select
              label="مزود الخدمة"
              value={form.sms.mode}
              onChange={(e) => setForm({ ...form, sms: { ...form.sms, mode: e.target.value } })}
              options={[
                { value: 'platform_default', label: 'الافتراضي للمنصة (حسب الباقة)' },
                { value: 'custom_provider', label: 'تكوين مزود خدمة خاص (Custom)' },
              ]}
            />
            
            {form.sms.mode === 'custom_provider' && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-4">
                <Select
                  label="نوع المزود الخاص"
                  value={form.sms.provider}
                  onChange={(e) => setForm({ ...form, sms: { ...form.sms, provider: e.target.value } })}
                  options={[
                    { value: 'twilio', label: 'Twilio SMS' },
                    { value: 'twilio_verify', label: 'Twilio Verify (للتحقق فقط)' },
                    { value: 'generic_http', label: 'Generic HTTP API' },
                    { value: 'mock', label: 'Mock (للاختبار/غير حقيقي)' }
                  ]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Sender ID / Phone Number" placeholder="PayQusta" value={form.sms.senderId} onChange={e => setForm({...form, sms: {...form.sms, senderId: e.target.value}})} />
                  {['twilio', 'twilio_verify', 'generic_http'].includes(form.sms.provider) && (
                    <>
                      {form.sms.provider === 'generic_http' && (
                        <div className="col-span-full">
                          <Input label="Base URL" placeholder="https://api.smsprovider.com/send" value={form.sms.baseUrl} onChange={e => setForm({...form, sms: {...form.sms, baseUrl: e.target.value}})} />
                        </div>
                      )}
                      <Input label={form.sms.provider.includes('twilio') ? "Account SID" : "API Key"} placeholder="أدخل المفتاح/المعرف" value={form.sms.apiKey} onChange={e => setForm({...form, sms: {...form.sms, apiKey: e.target.value}})} />
                      <Input label={form.sms.provider.includes('twilio') ? "Auth Token" : "API Secret (اختياري)"} type="password" placeholder="••••••••" value={form.sms.apiSecret} onChange={e => setForm({...form, sms: {...form.sms, apiSecret: e.target.value}})} />
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="flex-1 max-w-xs">
                <Input placeholder="رقم الموبايل للاختبار (+20...)" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
              </div>
              <Button variant="outline" onClick={handleTestSms} loading={testingSms} icon={<TestTube className="w-4 h-4" />}>
                اختبار الـ SMS
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100 dark:border-white/10">
        <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>حفظ الإعدادات</Button>
      </div>
    </div>
  );
}
