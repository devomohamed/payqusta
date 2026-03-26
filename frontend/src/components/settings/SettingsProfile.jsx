import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Building2, Clock, Edit3, Save, Lock, Eye, EyeOff,
  Camera, Loader2, Trash2, Shield, Calendar, CheckCircle, LogOut, Send
} from 'lucide-react';
import { useAuthStore, useThemeStore, api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';
import { useTranslation } from 'react-i18next';

const InfoCard = ({ icon: Icon, label, value, color }) => (
  <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
      color === 'purple' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
        color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
          color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
            color === 'red' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

export default function SettingsProfile() {
  const { t } = useTranslation('admin');
  const { user, tenant, getMe, logoutAll } = useAuthStore();
  const { dark } = useThemeStore();

  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setUserForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSaveUser = async () => {
    if (!userForm.name) return notify.warning(t('settings_profile.toasts.k2wc7am'));
    setSaving({ ...saving, user: true });
    try {
      await api.put('/auth/update-profile', {
        name: userForm.name,
        phone: userForm.phone,
      });
      await getMe();
      notify.success(t('settings_profile.toasts.kr1dv4y'));
    } catch (err) {
      notify.error(err.response?.data?.message || t('settings_profile.toasts.kw4gtna'));
    } finally {
      setSaving({ ...saving, user: false });
    }
  };

  const handleRequestResetEmail = async () => {
    if (!user?.email) return notify.warning(t('settings_profile.toasts.k3na7yx'));
    
    setSaving({ ...saving, resetEmail: true });
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      notify.success(t('settings_profile.toasts.k1338d6'));
    } catch (err) {
      notify.error(err.response?.data?.message || t('settings_profile.toasts.kc88dor'));
    } finally {
      setSaving({ ...saving, resetEmail: false });
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify.warning(t('settings_profile.toasts.kbtbyho'));
    if (file.size > 20 * 1024 * 1024) return notify.warning(t('settings_profile.toasts.kec6bqp'));

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.put('/auth/update-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await getMe();
      notify.success(t('settings_profile.toasts.k54bxwj'));
    } catch (err) {
      notify.error(t('settings_profile.toasts.ky1vo61'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await api.delete('/auth/remove-avatar');
      await getMe();
      notify.success(t('settings_profile.toasts.k55tluc'));
    } catch (err) {
      notify.error(t('settings_profile.toasts.k4gj3ic'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: t('settings_profile.ui.kav13lo'), color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
      vendor: { label: t('settings_profile.ui.ksvu36'), color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
      coordinator: { label: t('settings_profile.ui.ktf00g'), color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' },
    };
    const r = roles[role] || { label: role, color: 'bg-gray-100 text-gray-600' };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return t('settings_profile.ui.k5xt3ii');
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Profile Header with Avatar */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || t('settings_profile.toasts.k18l')
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              ) : (
                <Camera className="w-4 h-4 text-primary-500" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {user?.avatar && (
            <button
              onClick={handleRemoveAvatar}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              {t('settings_profile.ui.kd9tpm2')}
            </button>
          )}
        </div>

        {/* Quick Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
            {getRoleBadge(user?.role)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-subtle">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-subtle">
              <Phone className="w-4 h-4" />
              <span>{user?.phone || t('settings_profile.toasts.k5xt5xj')}</span>
            </div>
            <div className="flex items-center gap-2 text-subtle">
              <Building2 className="w-4 h-4" />
              <span>{tenant?.name || t('settings_profile.toasts.k5xt5xj')}</span>
            </div>
            <div className="flex items-center gap-2 text-subtle">
              <Clock className="w-4 h-4" />
              <span>آخر دخول: {formatDate(user?.lastLogin)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2 mb-5">
          <Edit3 className="w-5 h-5 text-primary-500" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('settings_profile.ui.k9c8f2c')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('settings_profile.form.kzaezly')}
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            icon={<User className="w-4 h-4" />}
          />
          <div>
            <Input
              label={t('settings_profile.form.k8lvosz')}
              type="email"
              value={userForm.email}
              disabled
              icon={<Mail className="w-4 h-4" />}
            />
            <p className="text-xs text-muted mt-1">{t('settings_profile.ui.kyo4369')}</p>
          </div>
          <Input
            label={t('settings_profile.form.k3pahhc')}
            value={userForm.phone}
            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
            icon={<Phone className="w-4 h-4" />}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveUser} loading={saving.user} icon={<Save className="w-4 h-4" />}>{t('settings_profile.ui.klapoqd')}</Button>
        </div>
      </div>

      {/* Redesigned Password Section */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{t('settings_profile.ui.kpxr57y')}</h3>
            <p className="text-sm text-subtle">{t('settings_profile.ui.kc402ft')}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-950 p-6 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-right">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('settings_profile.ui.kqces7l')}</h4>
              <p className="text-sm text-subtle leading-relaxed mb-4">
                لحمايتك، قمنا بتغيير طريقة تحديث كلمة المرور. سيتم إرسال رابط آمن ومباشر إلى بريدك الإلكتروني المسجل لدينا 
                <span className="font-bold text-gray-900 dark:text-white mx-1">({user?.email})</span> 
                {t('settings_profile.ui.kh9afzp')}
              </p>
            </div>
            <div className="shrink-0">
              <Button 
                onClick={handleRequestResetEmail}
                variant="warning" 
                size="lg"
                loading={saving.resetEmail} 
                className="shadow-lg shadow-amber-500/20 px-8 h-12 text-base font-bold"
                icon={<Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              >
                {t('settings_profile.ui.keds5nh')}
              </Button>
            </div>
          </div>
          
          {/* Decorative Background Element */}
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('settings_profile.ui.kh21p04')}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard icon={Shield} label={t('settings_profile.form.kzekvld')} value={user?.role === 'admin' ? t('settings_profile.ui.kav13lo') : user?.role === 'vendor' ? t('settings_profile.ui.ksvu36') : 'منسق'} color="blue" />
          <InfoCard icon={Building2} label={t('settings_profile.form.kaaxfw9')} value={tenant?.name || t('settings_profile.toasts.k5xt5xj')} color="purple" />
          <InfoCard icon={Calendar} label={t('settings_profile.form.kovdtur')} value={tenant?.subscription?.plan?.name || (tenant?.subscription?.plan === 'trial' ? t('settings_profile.ui.k2wo13o') : typeof tenant?.subscription?.plan === 'string' ? t('settings_profile.ui.kpbtz5u') : t('settings_profile.ui.k5xt5xj'))} color="amber" />
          <InfoCard icon={CheckCircle} label={t('settings_profile.form.kbg9qyj')} value={user?.isActive ? t('settings_profile.ui.ky62x') : 'معطل'} color={user?.isActive ? 'emerald' : 'red'} />
          <InfoCard icon={Clock} label={t('settings_profile.form.kb60nlz')} value={formatDate(user?.lastLogin)} color="gray" />
          <InfoCard icon={Calendar} label={t('settings_profile.form.khxt5pt')} value={formatDate(user?.createdAt)} color="gray" />
        </div>
      </div>

      {/* Session Security */}
      <div className="pt-6 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <LogOut className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('settings_profile.ui.kjd32yq')}</h3>
        </div>
        <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
          <p className="text-sm text-subtle mb-4">
            تسجيل الخروج من جميع الأجهزة المتصلة بحسابك. سيتم إلغاء جميع الجلسات النشطة وستحتاج إلى تسجيل الدخول مرة أخرى.
          </p>
          <Button
            variant="danger"
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              notify.custom({
                title: t('settings_profile.ui.kc241dr'),
                message: t('settings_profile.ui.kih6xa1'),
                type: 'warning',
                actions: [
                  {
                    label: t('settings_profile.ui.kaewkn8'),
                    onClick: async () => {
                      await logoutAll();
                    },
                    style: 'danger',
                  },
                  { label: t('settings_profile.ui.kouah6d'), onClick: () => { }, style: 'secondary' },
                ],
              });
            }}
          >
            {t('settings_profile.ui.kp4ricm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
