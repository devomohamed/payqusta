import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { User, Phone, Mail, MapPin, Lock, Eye, EyeOff, Save, Award, Star, ShoppingBag, Crown, Shield, FileText, ChevronLeft, Bell } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';

const tierConfig = {
  bronze: { label: 'برونزي', color: 'from-amber-600 to-amber-800', icon: Shield },
  silver: { label: 'فضي', color: 'from-gray-400 to-gray-600', icon: Award },
  gold: { label: 'ذهبي', color: 'from-yellow-400 to-yellow-600', icon: Star },
  platinum: { label: 'بلاتيني', color: 'from-purple-400 to-purple-700', icon: Crown },
};

export default function PortalProfile() {
  const { customer, updateProfile, changePassword, fetchPoints, loading } = usePortalStore();
  const { dark } = useThemeStore();
  const { t, i18n } = useTranslation('portal');

  const [activeSection, setActiveSection] = useState('info'); // info | password | points
  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [dateOfBirth, setDateOfBirth] = useState(customer?.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '');
  const [gender, setGender] = useState(customer?.gender || '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp || '');
  const [bio, setBio] = useState(customer?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(customer?.profilePhoto || null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [pointsData, setPointsData] = useState(null);
  const [pointsLoading, setPointsLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'points') {
      loadPoints();
    }
  }, [activeSection]);

  const loadPoints = async () => {
    setPointsLoading(true);
    const res = await fetchPoints();
    if (res) setPointsData(res);
    setPointsLoading(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        notify.error(t('profile.messages.image_size') || 'حجم الصورة يجب ألا يتجاوز 20 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const result = await updateProfile({ name, email, address, profilePhoto, dateOfBirth, gender, whatsapp, bio });
    if (result.success) {
      notify.success(result.message || t('profile.messages.update_success'));
    } else {
      notify.error(result.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify.error(t('profile.password.mismatch'));
      return;
    }
    if (newPassword.length < 6) {
      notify.error(t('profile.password.length_error'));
      return;
    }
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    if (result.success) {
      notify.success(result.message || t('profile.password.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      notify.error(result.message);
    }
  };

  const tier = tierConfig[customer?.tier] || tierConfig.bronze;
  const TierIcon = tier.icon;

  const inputClass = `w-full px-4 py-3 pr-11 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none transition-all text-gray-900 dark:text-white`;

  const sections = [
    { id: 'info', label: t('profile.sections.info'), icon: User },
    { id: 'addresses', label: t('profile.sections.addresses'), icon: MapPin },
    { id: 'password', label: t('profile.sections.password'), icon: Lock },
    { id: 'points', label: t('profile.sections.points'), icon: Star },
    { id: 'settings', label: t('profile.sections.settings'), icon: Bell }
  ];

  return (
    <div className="space-y-4 pb-20" dir={i18n.dir()}>
      {/* Profile Card */}
      <div className={`bg-gradient-to-br ${tier.color} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-10 -mb-10 blur-xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm text-3xl font-black overflow-hidden border-2 border-white/30">
              {profilePhoto ? (
                <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
              ) : (
                customer?.name?.[0] || '?'
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black">{customer?.name}</h2>
            <p className="text-white/70 text-sm flex items-center gap-1 mt-1">
              <Phone className="w-3.5 h-3.5" />
              {customer?.phone}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/20 backdrop-blur-sm px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <TierIcon className="w-3.5 h-3.5" />
                {t('profile.tiers.customer', { tier: t(`profile.tiers.${customer?.tier || 'bronze'}`) })}
              </span>
              {customer?.points > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-3 py-0.5 rounded-full text-xs font-bold">
                  {customer.points} {t('home.points_label')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Statement Quick-Access ═══ */}
      <Link
        to="/portal/statement"
        className="flex items-center justify-between bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{t('profile.statement_link')}</p>
            <p className="text-white/70 text-xs">{t('profile.statement_desc')}</p>
          </div>
        </div>
        <ChevronLeft className="w-5 h-5 text-white/70 group-hover:translate-x-[-4px] transition-transform" />
      </Link>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeSection === s.id
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Info Section */}
      {activeSection === 'info' && (
        <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.name')}</label>
            <div className="relative">
              <User className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400">{t('profile.form.phone')}</label>
              {/* Note: This is a UI UX placeholder for a real OTP modal if implemented */}
              <button type="button" onClick={() => notify.info(t('profile.form.phone_otp'))} className="text-xs text-primary-500 hover:underline">
                {t('profile.form.change_phone')}
              </button>
            </div>
            <div className="relative">
              <Phone className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={customer?.phone || ''} className={`${inputClass} opacity-60 cursor-not-allowed`} disabled />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.email')}</label>
            <div className="relative">
              <Mail className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder={t('profile.form.email_placeholder')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.dob')}</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.gender')}</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                <option value="">{t('profile.form.gender_unset')}</option>
                <option value="male">{t('profile.form.gender_male')}</option>
                <option value="female">{t('profile.form.gender_female')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.whatsapp')}</label>
            <div className="relative">
              <Phone className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} placeholder={t('profile.form.whatsapp_placeholder')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.bio')}</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={inputClass} rows="3" placeholder={t('profile.form.bio_placeholder')} style={{ minHeight: '80px' }} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.form.profile_photo')}</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/20 dark:file:text-primary-400" />
            <p className="text-[10px] text-gray-400 mt-1">{t('profile.form.photo_hint')}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('profile.form.save')}
              </>
            )}
          </button>
        </form>
      )}

      {/* Password Section */}
      {
        activeSection === 'password' && (
          <form onSubmit={handleChangePassword} className="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.password.current')}</label>
              <div className="relative">
                <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`${inputClass} ltr:pl-11 rtl:pr-11`}
                  placeholder="••••••"
                  required
                />
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.password.new')}</label>
              <div className="relative">
                <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputClass} ltr:pl-11 rtl:pr-11`}
                  placeholder={t('profile.password.min_chars')}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Fake Password Strength for better UX affordance */}
              {newPassword && (
                <div className="mt-2 flex items-center gap-1">
                  <div className={`h-1 flex-1 rounded-full ${newPassword.length > 0 ? 'bg-red-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  <div className={`h-1 flex-1 rounded-full ${newPassword.length >= 6 ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  <div className={`h-1 flex-1 rounded-full ${newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{t('profile.password.confirm')}</label>
              <div className="relative">
                <Lock className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder={t('profile.password.confirm_placeholder')}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold shadow-xl shadow-red-500/30 hover:shadow-red-500/50 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  {t('profile.password.change')}
                </>
              )}
            </button>
          </form>
        )
      }

      {/* Points Section */}
      {
        activeSection === 'points' && (
          <div className="space-y-4">
            {pointsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : !pointsData ? (
              <div className="text-center py-16">
                <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{t('profile.points.no_data')}</p>
              </div>
            ) : (
              <>
                {/* Points Summary */}
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                  <div className="relative z-10 text-center">
                    <Star className="w-10 h-10 mx-auto mb-2 fill-current" />
                    <p className="text-white/80 text-sm mb-1">{t('profile.points.balance')}</p>
                    <p className="text-5xl font-black">{pointsData.currentPoints || 0}</p>
                    <p className="text-white/70 text-xs mt-2">{t('profile.points.available')}</p>
                  </div>
                </div>

                {/* Tier Info */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">{t('profile.points.tier_level')}</h3>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl flex items-center justify-center text-white`}>
                      <TierIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{t('profile.tiers.customer', { tier: t(`profile.tiers.${customer?.tier || 'bronze'}`) })}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('profile.points.total_purchases', { amount: pointsData.totalPurchases?.toLocaleString() || 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Tier Progress */}
                  {pointsData.nextTier && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{tier.label}</span>
                        <span>{(tierConfig[pointsData.nextTier.name] || {}).label || pointsData.nextTier.name}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${tier.color} rounded-full transition-all`}
                          style={{ width: `${Math.min((pointsData.nextTier.progress || 0), 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {t('profile.points.remaining_upgrade', { amount: pointsData.nextTier.remaining?.toLocaleString() })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center">
                    <ShoppingBag className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('profile.points.invoices_count')}</p>
                    <p className="font-black text-xl text-gray-900 dark:text-white">{pointsData.totalInvoices || 0}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center">
                    <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('profile.points.earned_points')}</p>
                    <p className="font-black text-xl text-gray-900 dark:text-white">{pointsData.totalPointsEarned || 0}</p>
                  </div>
                </div>

                {/* Badges */}
                {pointsData.badges && pointsData.badges.length > 0 && (
                  <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary-500" />
                      {t('profile.points.badges')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {pointsData.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      {/* Settings Sections Placeholders for explicit flow navigation */}
      {
        activeSection === 'addresses' && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('profile.addresses_page.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t('profile.addresses_page.desc')}</p>
            <Link to="/portal/addresses" className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all">
              {t('profile.addresses_page.go_to')}
            </Link>
          </div>
        )
      }

      {
        activeSection === 'settings' && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t('profile.settings.offers_title')}</h4>
                <p className="text-xs text-gray-500 mt-1">{t('profile.settings.offers_desc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t('profile.settings.orders_title')}</h4>
                <p className="text-xs text-gray-500 mt-1">{t('profile.settings.orders_desc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:-translate-x-full peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>
        )
      }

    </div >
  );
}
