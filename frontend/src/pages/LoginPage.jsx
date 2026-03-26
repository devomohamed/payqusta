import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, useAuthStore, useThemeStore } from '../store';
import AnimatedBrandLogo from '../components/AnimatedBrandLogo';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';
import { Input } from '../components/UI';
import { useTranslation } from 'react-i18next';

function formatPlanPrice(plan) {
  const price = Number(plan?.price || 0);
  if (price <= 0) return t('login_page.ui.k3iplky');
  return `${price.toLocaleString('ar-EG')} ${plan?.currency || 'EGP'}`;
}

export default function LoginPage() {
  const { t } = useTranslation('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ name: '', storeName: '', phone: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);

  const { login, register, loading } = useAuthStore();
  const { dark } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const authInputClass = 'app-surface w-full rounded-2xl border border-transparent px-4 py-3 text-gray-900 transition-all focus:ring-2 focus:ring-primary-500/20 dark:text-white';

  const selectedPlanId = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('plan') || '';
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const mode = (params.get('mode') || '').toLowerCase();
    const shouldOpenRegister =
      mode === 'register' ||
      params.get('register') === '1' ||
      params.get('signup') === '1';

    if (shouldOpenRegister) {
      setIsRegister(true);
      return;
    }

    if (mode === 'login') {
      setIsRegister(false);
    }
  }, [location.search]);

  useEffect(() => {
    let ignore = false;

    if (!selectedPlanId) {
      setSelectedPlan(null);
      setLoadingSelectedPlan(false);
      return () => {
        ignore = true;
      };
    }

    setLoadingSelectedPlan(true);
    api.get('/plans')
      .then(({ data }) => {
        if (ignore) return;
        const plans = Array.isArray(data?.data) ? data.data : [];
        setSelectedPlan(plans.find((plan) => plan?._id === selectedPlanId) || null);
      })
      .catch(() => {
        if (!ignore) setSelectedPlan(null);
      })
      .finally(() => {
        if (!ignore) setLoadingSelectedPlan(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedPlanId]);

  const getPostAuthPath = () => {
    if (!selectedPlanId) return '/';
    return `/subscriptions?plan=${encodeURIComponent(selectedPlanId)}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(identifier, password);
      toast.success(t('login_page.toasts.kie1h2r'));

      const { user } = useAuthStore.getState();
      if (user?.isSuperAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate(getPostAuthPath());
      }
    } catch (err) {
      toast.error(err.message || t('login_page.toasts.k1j5swc'));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register({
        name: registerData.name,
        email: identifier,
        phone: registerData.phone,
        password,
        storeName: registerData.storeName,
      });
      toast.success(t('login_page.toasts.kb5osfj'));
      navigate(getPostAuthPath());
    } catch (err) {
      toast.error(err.message || t('login_page.toasts.k5viv60'));
    }
  };

  return (
    <div className={`app-shell-bg min-h-screen flex items-center justify-center p-5 ${dark ? 'dark' : ''}`}>
      <div className="fixed inset-0 bg-gradient-to-br from-primary-100 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950" />

      <div className="fixed top-10 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8 flex flex-col items-center">
          <AnimatedBrandLogo src="/logo-square.png" alt="PayQusta Logo" size="lg" containerClassName="mb-4" />
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-2">
            Pay<span className="text-primary-500">Qusta</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('login_page.ui.k86ztcc')}</p>
        </div>

        {(selectedPlanId || loadingSelectedPlan) && (
          <div className="app-surface mb-4 rounded-3xl border border-primary-100/70 p-4 shadow-lg shadow-primary-500/10 dark:border-primary-500/10">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-primary-600 dark:text-primary-300">{t('login_page.ui.ku84s1k')}</p>
                {loadingSelectedPlan ? (
                  <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{t('login_page.ui.k6bmnl5')}</p>
                ) : selectedPlan ? (
                  <>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-black text-gray-900 dark:text-white">{selectedPlan.name}</h2>
                      <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                        {formatPlanPrice(selectedPlan)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {selectedPlan.description || t('login_page.toasts.kct9od3')}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{t('login_page.ui.ktx1rn5')}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {t('login_page.ui.kkr5xwc')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="app-surface rounded-3xl border border-gray-100/80 p-8 shadow-xl dark:border-white/10 dark:shadow-2xl">
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <>
                <div className="mb-4">
                  <label htmlFor="register-name" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login_page.ui.k4t5mis')}</label>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className={authInputClass}
                    placeholder={t('login_page.placeholders.kkkw8zr')}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="register-store-name" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login_page.ui.kcmv4b6')}</label>
                  <input
                    id="register-store-name"
                    name="storeName"
                    type="text"
                    value={registerData.storeName}
                    onChange={(e) => setRegisterData({ ...registerData, storeName: e.target.value })}
                    className={authInputClass}
                    placeholder={t('login_page.placeholders.kyp2mhu')}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="register-phone" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('login_page.ui.k3pahhc')}</label>
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className={authInputClass}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label htmlFor="auth-identifier" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                {isRegister ? t('login_page.ui.k8lvosz') : 'البريد الإلكتروني أو رقم الهاتف'}
              </label>
              <input
                id="auth-identifier"
                name="identifier"
                type={isRegister ? 'email' : 'text'}
                autoComplete={isRegister ? 'email' : 'username'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={authInputClass}
                placeholder={isRegister ? 'example@email.com' : 'example@email.com أو 01XXXXXXXXX'}
                required
              />
            </div>

            <div className="mb-4">
              <Input
                label={t('login_page.form.k81krw3')}
                id="auth-password"
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                minLength={6}
              />
            </div>

            {!isRegister && (
              <div className="mb-6 text-left">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  {t('login_page.ui.k4vxvol')}
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('login_page.ui.kvsybop')}
                </span>
              ) : isRegister ? (
                selectedPlanId ? t('login_page.ui.kepuqfs') : t('login_page.ui.koxotoy')
              ) : (
                selectedPlanId ? t('login_page.ui.k93tiie') : t('login_page.ui.k32w7dx')
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary-500 hover:text-primary-600 font-semibold"
            >
              {isRegister ? t('login_page.ui.koezrqj') : 'ليس لديك حساب؟ أنشئ حساب جديد'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <ThemeModeSwitcher compact />
        </div>
      </div>
    </div>
  );
}
