import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  CheckCircle2, 
  KeyRound, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Languages, 
  ChevronRight,
  Globe
} from 'lucide-react';
import { activationApi } from '../store';
import { Button, Input, LoadingSpinner } from '../components/UI';

const TRANSLATIONS = {
  en: {
    welcome: 'Welcome to {brand}',
    subtitle: 'Set your password to activate your branded workspace managed via PayQusta.',
    stepTitle: 'Secure Access',
    stepHeading: 'Create your password',
    passLabel: 'New Password',
    passPlaceholder: 'At least 8 characters',
    confirmLabel: 'Confirm Password',
    confirmPlaceholder: 'Repeat your password',
    activateBtn: 'Activate Account',
    activating: 'Activating...',
    doneTitle: 'Activation Complete',
    doneSub: 'Your account is now active. Redirecting you...',
    fallbackTitle: 'Smart fallback active',
    fallbackDesc: 'Your account is secured with enterprise-grade encryption and branded specifically for this store.',
    invalidTitle: 'Activation link is no longer valid',
    invalidSub: 'Please request a new invitation from the store team.',
    backHome: 'Back to home',
    poweredBy: 'Powered by',
    support: 'Support',
    teamInvite: 'Team invitation',
    customerPortal: 'Customer portal access',
    brand: 'Brand',
    account: 'Account',
    redirecting: 'Redirecting'
  },
  ar: {
    welcome: 'مرحباً بك في {brand}',
    subtitle: 'قم بتعيين كلمة المرور الخاصة بك لتفعيل مساحة العمل الخاصة بك والمدارة عبر PayQusta.',
    stepTitle: 'دخول آمن',
    stepHeading: 'إنشاء كلمة المرور',
    passLabel: 'كلمة المرور الجديدة',
    passPlaceholder: '8 أحرف على الأقل',
    confirmLabel: 'تأكيد كلمة المرور',
    confirmPlaceholder: 'أعد كتابة كلمة المرور',
    activateBtn: 'تفعيل الحساب',
    activating: 'جاري التفعيل...',
    doneTitle: 'تم التفعيل بنجاح',
    doneSub: 'حسابك الآن نشط. جاري تحويلك...',
    fallbackTitle: 'نظام الحماية الذكي نشط',
    fallbackDesc: 'حسابك مؤمن بتشفير عالي المستوى ومخصص تماماً لهذه العلامة التجارية.',
    invalidTitle: 'رابط التفعيل لم يعد صالحاً',
    invalidSub: 'يرجى طلب دعوة جديدة من فريق المتجر.',
    backHome: 'العودة للرئيسية',
    poweredBy: 'مشغل بواسطة',
    support: 'الدعم',
    teamInvite: 'دعوة فريق عمل',
    customerPortal: 'دخول بوابة العملاء',
    brand: 'المتجر',
    account: 'الحساب',
    redirecting: 'جاري التحويل'
  }
};

export default function ActivateAccountPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [lang, setLang] = useState('ar');

  const t = (key, params = {}) => {
    let str = TRANSLATIONS[lang][key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await activationApi.getDetails(token);
        setDetails(response.data?.data || null);
      } catch (error) {
        toast.error(error.response?.data?.message || t('invalidTitle'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const brand = details?.tenant?.branding || {};
  const notificationBranding = details?.tenant?.notificationBranding || {};
  const brandName = details?.tenant?.name || 'PayQusta';
  const primaryColor = brand.primaryColor || '#102542';
  const secondaryColor = brand.secondaryColor || '#2bb3a3';
  const isRtl = lang === 'ar';

  const submit = async () => {
    if (!password || password.length < 8) return toast.error(lang === 'ar' ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' : 'Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');

    setSaving(true);
    try {
      const response = await activationApi.activate(token, { password });
      const actorType = response.data?.data?.actorType;
      const authToken = response.data?.data?.token;
      setDone(true);
      toast.success(t('doneTitle'));

      if (actorType === 'user' && authToken) {
        localStorage.setItem('payqusta_token', authToken);
        setTimeout(() => { window.location.href = '/'; }, 1500);
        return;
      }

      setTimeout(() => navigate('/portal/login', { replace: true }), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || t('activating'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={lang === 'ar' ? 'جاري تحميل صفحة التفعيل...' : 'Loading activation page...'} />;
  }

  if (!details) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black">{t('invalidTitle')}</h1>
          <p className="mt-4 text-white/60 leading-relaxed text-lg">{t('invalidSub')}</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-slate-950 hover:bg-slate-100 transition-colors">
            {t('backHome')}
            <ChevronRight className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-primary-500/30 overflow-x-hidden`} dir={isRtl ? 'rtl' : 'ltr'} style={{ background: `linear-gradient(165deg, ${primaryColor} 0%, ${secondaryColor} 45%, #0f172a 100%)` }}>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-lg bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {brand.logo ? <img src={brand.logo} alt={brandName} className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-white/20" />}
          <span className="font-black text-white text-lg tracking-tight">{brandName}</span>
        </div>
        <button 
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-bold text-sm border border-white/10"
        >
          <Languages className="h-4 w-4" />
          {lang === 'ar' ? 'English' : 'عربي'}
        </button>
      </nav>

      <div className="mx-auto max-w-5xl pt-28 pb-16 px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] items-stretch">
          {/* Info Section */}
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-slate-950/40 p-8 text-white shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-left duration-700">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-primary-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-300">
                <Sparkles className="h-3 w-3" />
                {t('brand')}
              </div>
              
              <h1 className="mt-6 text-4xl font-black leading-[1.2] tracking-tight">
                {t('welcome', { brand: brandName })}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 font-medium">
                {t('subtitle')}
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{t('account')}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-400/20 to-secondary-400/20 flex items-center justify-center font-black text-lg">
                      {details.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-lg font-black truncate max-w-[140px]">{details.name}</div>
                      <div className="text-xs text-white/50">{details.email || details.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{t('brand')}</div>
                  <div className="flex items-center gap-3">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brandName} className="h-10 w-10 rounded-xl object-cover bg-white/10" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-black">{brandName}</div>
                      <div className="text-xs text-white/50">{details.actorType === 'user' ? t('teamInvite') : t('customerPortal')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 p-6 rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 to-transparent flex flex-col md:flex-row items-center gap-5">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-lg font-black mb-1">{t('fallbackTitle')}</div>
                  <p className="text-xs leading-relaxed text-white/60 font-medium">
                    {t('fallbackDesc')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Form Section */}
          <section className="rounded-[2.5rem] border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/90 dark:border-white/5 animate-in fade-in slide-in-from-right duration-700">
            {done ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center py-6">
                <div className="group relative">
                  <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full animate-pulse" />
                  <div className="relative rounded-full bg-emerald-100 p-6 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                </div>
                <h2 className="mt-8 text-2xl font-black text-slate-900 dark:text-white leading-tight">{t('doneTitle')}</h2>
                <p className="mt-3 max-w-sm text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('doneSub')}
                </p>
                <div className="mt-8 flex items-center gap-3 text-primary-600 font-bold px-5 py-2.5 rounded-xl bg-primary-50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('redirecting')}...
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                <div className="flex items-center gap-3 mb-8">
                  <div className="rounded-2xl bg-primary-600 p-3.5 shadow-xl shadow-primary-600/20 text-white">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-0.5">{t('stepTitle')}</p>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('stepHeading')}</h2>
                  </div>
                </div>

                <div className="space-y-5 flex-1">
                  <div className="relative">
                    <Input
                      label={t('passLabel')}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passPlaceholder')}
                      className="text-base py-3"
                    />
                  </div>

                  <div className="relative">
                    <Input
                      label={t('confirmLabel')}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmPlaceholder')}
                      className="text-base py-3"
                    />
                  </div>
                </div>

                <div className="mt-8 mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5">
                  <p className="text-xs leading-relaxed text-slate-500 font-medium">
                    {lang === 'ar' ? 'أنت بصدد تفعيل صلاحية الدخول لمتجر' : 'You are activating access for'} <span className="font-extrabold text-slate-900 dark:text-white underline decoration-primary-500/30 decoration-2 underline-offset-4">{brandName}</span>.
                  </p>
                  {notificationBranding.supportEmail || notificationBranding.supportPhone ? (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{t('support')}</span>
                      <span className="text-slate-900 dark:text-white">{notificationBranding.supportEmail || notificationBranding.supportPhone}</span>
                    </div>
                  ) : null}
                </div>

                <Button 
                  className="w-full py-4 text-base font-black rounded-2xl" 
                  onClick={submit} 
                  loading={saving}
                >
                  {saving ? t('activating') : t('activateBtn')}
                </Button>

                <div className="mt-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {notificationBranding.showPoweredByFooter !== false ? (
                    <span>
                      {t('poweredBy')} <a className="text-primary-600 hover:underline" href="https://payqusta.com" target="_blank" rel="noreferrer">PayQusta</a>
                    </span>
                  ) : (
                    <span>{t('brand')} Space</span>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      
      {/* Dynamic Background Blur Elements */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vh] bg-primary-600/10 blur-[150px] -z-10 rounded-full opacity-50 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[50vw] h-[50vh] bg-secondary-600/10 blur-[150px] -z-10 rounded-full opacity-50 pointer-events-none" />
    </div>
  );
}

