import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, Settings2, ShieldCheck, Save, TestTube } from 'lucide-react';
import toast from 'react-hot-toast';

import { Input, Select, LoadingSpinner } from '../components/UI';
import { Switch } from '../components/UI';
import { superAdminApi } from '../store';

export default function SuperAdminNotificationSettingsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('defaults');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    defaults: {
      routingMode: 'smart',
      fallbackEnabled: true,
      allowEmailFallbackToSms: true,
      allowSmsFallbackToEmail: true,
      activationLinkBaseUrl: '',
      shortLinkDomain: '',
      poweredByEnabled: true,
      poweredByUrl: 'https://payqusta.com',
    },
    platformEmail: {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: '',
      fromName: 'PayQusta',
    },
    platformSms: {
      enabled: false,
      provider: 'mock',
      baseUrl: '',
      apiKey: '',
      apiSecret: '',
      senderId: 'PayQusta',
      supportsCustomSenderId: true,
    },
    tenantPolicy: {
      allowCustomSmtp: true,
      allowCustomSms: true,
      allowPlatformEmailFallback: true,
      allowPlatformSmsFallback: true,
    }
  });

  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await superAdminApi.getNotificationSettings();
      if (data?.data?.notifications) {
        setFormData((prev) => ({
          defaults: { ...prev.defaults, ...data.data.notifications.defaults },
          platformEmail: { ...prev.platformEmail, ...data.data.notifications.platformEmail },
          platformSms: { ...prev.platformSms, ...data.data.notifications.platformSms },
          tenantPolicy: { ...prev.tenantPolicy, ...data.data.notifications.tenantPolicy }
        }));
      }
      setError('');
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load platform notification settings');
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await superAdminApi.updateNotificationSettings({ notifications: formData });
      toast.success('Settings saved successfully');
      setError('');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    
    // Auto-save form first to make sure test runs on latest
    try {
      setTestingEmail(true);
      await superAdminApi.updateNotificationSettings({ notifications: formData });
      const res = await superAdminApi.testNotificationEmail({ email: testEmail });
      if (res.data.success) {
        toast.success(res.data.message || 'Test email sent successfully');
      } else {
        toast.error('Test email failed to send');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error('Please enter a test phone number');
      return;
    }

    try {
      setTestingSms(true);
      await superAdminApi.updateNotificationSettings({ notifications: formData });
      const res = await superAdminApi.testNotificationSms({ phone: testPhone });
      if (res.data.success) {
        toast.success(res.data.message || 'Test SMS sent successfully');
      } else {
        toast.error('Test SMS failed to send');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send test SMS');
    } finally {
      setTestingSms(false);
    }
  };

  const tabs = [
    { id: 'defaults', name: 'Global Defaults', icon: Settings2 },
    { id: 'email', name: 'Platform Email', icon: Mail },
    { id: 'sms', name: 'Platform SMS', icon: MessageSquare },
    { id: 'policy', name: 'Tenant Policy', icon: ShieldCheck },
  ];

  if (loading) {
    return (
    <div className="flex h-[50vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold app-text-strong">Platform Notifications</h1>
          <p className="app-text-soft text-sm mt-1">
            Configure system-wide notifications, fallbacks, and tenant policies.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {saving ? <LoadingSpinner size="sm" color="white" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="app-surface rounded-2xl p-2 sticky top-6">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap outline-none ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                        : 'text-subtle hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-current opacity-70'}`} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 min-w-0 pb-20">
          {activeTab === 'defaults' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5">
                <h3 className="text-lg font-bold app-text-strong mb-4">Routing Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label="Default Routing Mode"
                    value={formData.defaults.routingMode}
                    onChange={(e) => handleChange('defaults', 'routingMode', e.target.value)}
                    options={[
                      { value: 'smart', label: 'Smart (Prefer lowest cost)' },
                      { value: 'email_only', label: 'Email Only' },
                      { value: 'sms_only', label: 'SMS Only' },
                      { value: 'whatsapp_preferred', label: 'WhatsApp Preferred (fallback to SMS)' },
                      { value: 'whatsapp_only', label: 'WhatsApp Only' },
                    ]}
                  />

                  <div className="flex flex-col gap-4">
                    <Switch
                      checked={formData.defaults.fallbackEnabled}
                      onChange={(val) => handleChange('defaults', 'fallbackEnabled', val)}
                      label="Enable Global Fallback"
                      description="Allow messages to failover to secondary channels if primary fails"
                    />

                    {formData.defaults.fallbackEnabled && (
                      <div className="pl-6 border-l-2 border-black/10 dark:border-white/10 space-y-3">
                        <Switch
                          checked={formData.defaults.allowEmailFallbackToSms}
                          onChange={(val) => handleChange('defaults', 'allowEmailFallbackToSms', val)}
                          label="Email -> SMS"
                          description="Fallback to SMS if email bounces or is invalid"
                        />
                        <Switch
                          checked={formData.defaults.allowSmsFallbackToEmail}
                          onChange={(val) => handleChange('defaults', 'allowSmsFallbackToEmail', val)}
                          label="SMS -> Email"
                          description="Fallback to Email if SMS delivery fails"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5">
                <h3 className="text-lg font-bold app-text-strong mb-4">Branding & Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Activation Link Base URL"
                    value={formData.defaults.activationLinkBaseUrl}
                    onChange={(e) => handleChange('defaults', 'activationLinkBaseUrl', e.target.value)}
                    placeholder="https://payqusta.com/activate-account"
                  />
                  <Input
                    label="Short Link Domain"
                    value={formData.defaults.shortLinkDomain}
                    onChange={(e) => handleChange('defaults', 'shortLinkDomain', e.target.value)}
                    placeholder="https://pqst.co"
                  />
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <Switch
                      checked={formData.defaults.poweredByEnabled}
                      onChange={(val) => handleChange('defaults', 'poweredByEnabled', val)}
                      label="Show 'Powered by PayQusta' footer"
                    />
                    {formData.defaults.poweredByEnabled && (
                      <Input
                        label="Powered By Link URL"
                        value={formData.defaults.poweredByUrl}
                        onChange={(e) => handleChange('defaults', 'poweredByUrl', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold app-text-strong">Platform SMTP Relay</h3>
                    <p className="text-sm text-subtle">Global email provider configuration</p>
                  </div>
                  <Switch
                    checked={formData.platformEmail.enabled}
                    onChange={(val) => handleChange('platformEmail', 'enabled', val)}
                    label="Enable Platform Email"
                  />
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!formData.platformEmail.enabled && 'opacity-50 pointer-events-none'}`}>
                  <Input
                    label="SMTP Host"
                    value={formData.platformEmail.host}
                    onChange={(e) => handleChange('platformEmail', 'host', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Port"
                      type="number"
                      value={formData.platformEmail.port}
                      onChange={(e) => handleChange('platformEmail', 'port', Number(e.target.value))}
                    />
                    <div className="pt-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.platformEmail.secure}
                          onChange={(e) => handleChange('platformEmail', 'secure', e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium app-text-strong">Secure (SSL/TLS)</span>
                      </label>
                    </div>
                  </div>
                  <Input
                    label="Username"
                    value={formData.platformEmail.user}
                    onChange={(e) => handleChange('platformEmail', 'user', e.target.value)}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={formData.platformEmail.pass}
                    onChange={(e) => handleChange('platformEmail', 'pass', e.target.value)}
                  />
                  <Input
                    label="From Email (Sender)"
                    value={formData.platformEmail.fromEmail}
                    onChange={(e) => handleChange('platformEmail', 'fromEmail', e.target.value)}
                  />
                  <Input
                    label="From Name"
                    value={formData.platformEmail.fromName}
                    onChange={(e) => handleChange('platformEmail', 'fromName', e.target.value)}
                  />
                </div>
              </div>

              {/* Test Email block */}
              <div className={`app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5 ${!formData.platformEmail.enabled && 'hidden'}`}>
                <h3 className="text-md font-bold app-text-strong flex items-center gap-2 mb-4">
                  <TestTube className="w-5 h-5 text-purple-500" />
                  Test Delivery
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Input
                      label="Recipient Email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail || !testEmail}
                    className="btn px-6 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 font-semibold"
                  >
                    {testingEmail ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold app-text-strong">Platform SMS Gateway</h3>
                    <p className="text-sm text-subtle">Global SMS provider configuration</p>
                  </div>
                  <Switch
                    checked={formData.platformSms.enabled}
                    onChange={(val) => handleChange('platformSms', 'enabled', val)}
                    label="Enable Platform SMS"
                  />
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!formData.platformSms.enabled && 'opacity-50 pointer-events-none'}`}>
                  <Select
                    label="Provider"
                    value={formData.platformSms.provider}
                    onChange={(e) => handleChange('platformSms', 'provider', e.target.value)}
                    options={[
                      { value: 'mock', label: 'Mock (Console Log)' },
                      { value: 'twilio', label: 'Twilio' },
                      { value: 'twilio_verify', label: 'Twilio Verify' },
                      { value: 'generic_http', label: 'Generic HTTP GET/POST' }
                    ]}
                  />
                  
                  <Input
                    label="Sender ID (From)"
                    value={formData.platformSms.senderId}
                    onChange={(e) => handleChange('platformSms', 'senderId', e.target.value)}
                  />

                  {formData.platformSms.provider === 'generic_http' && (
                    <div className="md:col-span-2">
                       <Input
                          label="Base URL"
                          value={formData.platformSms.baseUrl}
                          onChange={(e) => handleChange('platformSms', 'baseUrl', e.target.value)}
                          placeholder="https://api.smsprovider.com/send"
                        />
                    </div>
                  )}

                  <Input
                    label={formData.platformSms.provider.includes('twilio') ? 'Account SID' : 'API Key'}
                    value={formData.platformSms.apiKey}
                    onChange={(e) => handleChange('platformSms', 'apiKey', e.target.value)}
                  />
                  <Input
                    label={formData.platformSms.provider.includes('twilio') ? 'Auth Token' : 'API Secret'}
                    type="password"
                    value={formData.platformSms.apiSecret}
                    onChange={(e) => handleChange('platformSms', 'apiSecret', e.target.value)}
                  />

                  <div className="md:col-span-2">
                    <Switch
                      checked={formData.platformSms.supportsCustomSenderId}
                      onChange={(val) => handleChange('platformSms', 'supportsCustomSenderId', val)}
                      label="Provider Supports Custom Sender ID"
                      description="If disabled, we'll prefix SMS text with the tenant's brand name"
                    />
                  </div>
                </div>
              </div>

               {/* Test SMS block */}
               <div className={`app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5 ${!formData.platformSms.enabled && 'hidden'}`}>
                <h3 className="text-md font-bold app-text-strong flex items-center gap-2 mb-4">
                  <TestTube className="w-5 h-5 text-purple-500" />
                  Test Delivery
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Input
                      label="Recipient Phone Number"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <button
                    onClick={handleTestSms}
                    disabled={testingSms || !testPhone}
                    className="btn px-6 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 font-semibold"
                  >
                    {testingSms ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="app-surface rounded-2xl p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
                <div>
                  <h3 className="text-lg font-bold app-text-strong mb-1">Tenant Autonomy Restrictions</h3>
                  <p className="text-sm text-subtle mb-6">Control what communication methods tenants can bring themselves</p>
                </div>

                <div className="space-y-4">
                  <Switch
                    checked={formData.tenantPolicy.allowCustomSmtp}
                    onChange={(val) => handleChange('tenantPolicy', 'allowCustomSmtp', val)}
                    label="Allow custom SMTP for Tenants"
                    description="If disabled, tenants must rely on the platform's email relay"
                  />
                  <Switch
                    checked={formData.tenantPolicy.allowCustomSms}
                    onChange={(val) => handleChange('tenantPolicy', 'allowCustomSms', val)}
                    label="Allow custom SMS providers for Tenants"
                    description="If disabled, tenants must use platform SMS limits (monetization)"
                  />
                </div>

                <div className="pt-6 border-t border-black/5 dark:border-white/5">
                  <h3 className="text-lg font-bold app-text-strong mb-1">Platform Subsidize Rules</h3>
                  <p className="text-sm text-subtle mb-6">If tenants exceed limits or don't configure channels, should the platform absorb the cost?</p>
                </div>

                <div className="space-y-4">
                  <Switch
                    checked={formData.tenantPolicy.allowPlatformEmailFallback}
                    onChange={(val) => handleChange('tenantPolicy', 'allowPlatformEmailFallback', val)}
                    label="Platform Email Fallback"
                    description="Allow tenants without working SMTP to use Platform Email pool"
                  />
                  <Switch
                    checked={formData.tenantPolicy.allowPlatformSmsFallback}
                    onChange={(val) => handleChange('tenantPolicy', 'allowPlatformSmsFallback', val)}
                    label="Platform SMS Fallback"
                    description="Allow tenants without working SMS to use Platform SMS pool (Costs money)"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
