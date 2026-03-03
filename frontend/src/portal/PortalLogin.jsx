import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { getStorefrontTenantSlugFromHost as getPortalTenantSlugFromHost } from '../utils/storefrontHost';
import { useThemeStore } from '../store';
import { Phone, Lock, User, Store, Eye, EyeOff, Sun, Moon, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { transliterateArabicToEnglish } from '../utils/textUtils';

export default function PortalLogin() {
  const [activeTab, setActiveTab] = useState('login'); // login | register | activate
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Login fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeCode, setStoreCode] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regStoreCode, setRegStoreCode] = useState('');

  // Activate fields
  const [actPhone, setActPhone] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actConfirmPassword, setActConfirmPassword] = useState('');
  const [actStoreCode, setActStoreCode] = useState('');

  const { login, register, activate, loading } = usePortalStore();
  const { dark, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation('portal');
  const navigate = useNavigate();
  const location = useLocation();
  const accountBasePath = location.pathname.startsWith('/account') ? '/account' : '/portal';
  const dashboardPath = `${accountBasePath}/dashboard`;
  const requestedReturnUrl = new URLSearchParams(location.search).get('returnUrl');
  const nextPath = requestedReturnUrl && requestedReturnUrl.startsWith('/') ? requestedReturnUrl : dashboardPath;
  const hostTenantSlug = getPortalTenantSlugFromHost();
  const requiresStoreCode = !hostTenantSlug;

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(phone, password, storeCode);
    if (result.success) {
      notify.success(result.message || t('login.messages.login_success'));
      navigate(nextPath);
    } else {
      notify.error(result.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      notify.error(t('login.messages.password_mismatch'));
      return;
    }
    if (regPassword.length < 6) {
      notify.error(t('login.messages.password_length'));
      return;
    }
    const result = await register({
      name: regName,
      phone: regPhone,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      storeCode: regStoreCode,
    });
    if (result.success) {
      notify.success(result.message || t('login.messages.register_success'));
      navigate(nextPath);
    } else {
      notify.error(result.message);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (actPassword !== actConfirmPassword) {
      notify.error(t('login.messages.password_mismatch'));
      return;
    }
    if (actPassword.length < 6) {
      notify.error(t('login.messages.password_length'));
      return;
    }
    const result = await activate({
      phone: actPhone,
      newPassword: actPassword,
      confirmPassword: actConfirmPassword,
      storeCode: actStoreCode,
    });
    if (result.success) {
      notify.success(result.message || t('login.messages.activate_success'));
      navigate(nextPath);
    } else {
      notify.error(result.message);
    }
  };

  const tabs = [
    { id: 'login', label: t('login.tabs.login'), icon: LogIn },
    { id: 'register', label: t('login.tabs.register'), icon: UserPlus },
    { id: 'activate', label: t('login.tabs.activate'), icon: ShieldCheck },
  ];

  const inputClass = `w-full px-4 py-3 pr-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-['Cairo']`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-5 font-['Cairo'] ${dark ? 'dark' : ''}`} dir={i18n.dir()}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-100 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950" />

      {/* Decorative blobs */}
      <div className="fixed top-10 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-300/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-500/30 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            {t('login.title_portal')} <span className="text-primary-500">{t('login.title_customers')}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('login.subtitle')}</p>
          {hostTenantSlug && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <Store className="w-3.5 h-3.5" />
              {hostTenantSlug}.payqusta.store
            </p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="portal-login-phone" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.phone')}</label>
                <div className="relative">
                  <Phone className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-login-phone" name="phone" autoComplete="tel" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder={t('login.form.phone_placeholder')} required />
                </div>
              </div>

              <div>
                <label htmlFor="portal-login-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.password')}</label>
                <div className="relative">
                  <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-login-password" name="password" autoComplete="current-password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} ltr:pl-11 rtl:pr-11`} placeholder={t('login.form.password_placeholder')} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {requiresStoreCode && (
                <div>
                  <label htmlFor="portal-login-store-code" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.store_code')}</label>
                  <div className="relative">
                    <Store className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input id="portal-login-store-code" name="storeCode" autoComplete="organization" type="text" value={storeCode} onChange={(e) => setStoreCode(transliterateArabicToEnglish(e.target.value).replace(/[^a-z0-9-]/g, '-'))} className={inputClass} placeholder={t('login.form.store_code_placeholder')} required={requiresStoreCode} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait mt-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('login.buttons.logging_in')}
                  </span>
                ) : t('login.buttons.login')}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="portal-register-name" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.fullname')}</label>
                <div className="relative">
                  <User className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-register-name" name="name" autoComplete="name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} placeholder={t('login.form.fullname_placeholder')} required />
                </div>
              </div>

              <div>
                <label htmlFor="portal-register-phone" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.phone')}</label>
                <div className="relative">
                  <Phone className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-register-phone" name="phone" autoComplete="tel" type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className={inputClass} placeholder={t('login.form.phone_placeholder')} required />
                </div>
              </div>

              <div>
                <label htmlFor="portal-register-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.password')}</label>
                <div className="relative">
                  <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-register-password" name="password" autoComplete="new-password" type={showPass ? 'text' : 'password'} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={`${inputClass} ltr:pl-11 rtl:pr-11`} placeholder={t('login.form.password_min')} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="portal-register-confirm-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.confirm_password')}</label>
                <div className="relative">
                  <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-register-confirm-password" name="confirmPassword" autoComplete="new-password" type={showConfirmPass ? 'text' : 'password'} value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className={`${inputClass} ltr:pl-11 rtl:pr-11`} placeholder={t('login.form.confirm_password_placeholder')} required minLength={6} />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {requiresStoreCode && (
                <div>
                  <label htmlFor="portal-register-store-code" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.store_code')}</label>
                  <div className="relative">
                    <Store className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input id="portal-register-store-code" name="storeCode" autoComplete="organization" type="text" value={regStoreCode} onChange={(e) => setRegStoreCode(transliterateArabicToEnglish(e.target.value).replace(/[^a-z0-9-]/g, '-'))} className={inputClass} placeholder={t('login.form.store_code_ask')} required={requiresStoreCode} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-base shadow-xl shadow-green-500/30 hover:shadow-green-500/50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait mt-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('login.buttons.registering')}
                  </span>
                ) : t('login.buttons.register')}
              </button>
            </form>
          )}

          {/* Activate Form */}
          {activeTab === 'activate' && (
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-2">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {t('login.messages.activate_hint')}
                </p>
              </div>

              <div>
                <label htmlFor="portal-activate-phone" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.phone_registered')}</label>
                <div className="relative">
                  <Phone className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-activate-phone" name="phone" autoComplete="tel" type="text" value={actPhone} onChange={(e) => setActPhone(e.target.value)} className={inputClass} placeholder={t('login.form.phone_registered_placeholder')} required />
                </div>
              </div>

              <div>
                <label htmlFor="portal-activate-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.password_new')}</label>
                <div className="relative">
                  <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-activate-password" name="newPassword" autoComplete="new-password" type={showPass ? 'text' : 'password'} value={actPassword} onChange={(e) => setActPassword(e.target.value)} className={`${inputClass} ltr:pl-11 rtl:pr-11`} placeholder={t('login.form.password_min')} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="portal-activate-confirm-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.confirm_password')}</label>
                <div className="relative">
                  <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input id="portal-activate-confirm-password" name="confirmPassword" autoComplete="new-password" type={showConfirmPass ? 'text' : 'password'} value={actConfirmPassword} onChange={(e) => setActConfirmPassword(e.target.value)} className={`${inputClass} ltr:pl-11 rtl:pr-11`} placeholder={t('login.form.confirm_password_placeholder')} required minLength={6} />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {requiresStoreCode && (
                <div>
                  <label htmlFor="portal-activate-store-code" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login.form.store_code')}</label>
                  <div className="relative">
                    <Store className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input id="portal-activate-store-code" name="storeCode" autoComplete="organization" type="text" value={actStoreCode} onChange={(e) => setActStoreCode(transliterateArabicToEnglish(e.target.value).replace(/[^a-z0-9-]/g, '-'))} className={inputClass} placeholder={t('login.form.store_code_ask')} required={requiresStoreCode} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-base shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait mt-2">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('login.buttons.activating')}
                  </span>
                ) : t('login.buttons.activate')}
              </button>
            </form>
          )}
        </div>

        {/* Theme toggle */}
        <div className="text-center mt-5">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur text-gray-500 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? t('login.buttons.light_mode') : t('login.buttons.dark_mode')}
          </button>
        </div>
      </div>
    </div>
  );
}



