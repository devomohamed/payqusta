import React, { useState, useEffect, useRef } from 'react';
import { Save, Globe, Upload, Eye, X, Palette, Loader2 } from 'lucide-react';
import { useAuthStore, useThemeStore, api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';
import { getUserFriendlyErrorMessage } from '../../utils/errorMapper';

export default function SettingsWhiteLabel() {
    const { tenant, getMe } = useAuthStore();
    const { dark, toggleTheme } = useThemeStore();
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [domainError, setDomainError] = useState('');
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        logo: '',
        primaryColor: '#6366f1',
        secondaryColor: '#10b981',
        customDomain: '',
    });

    useEffect(() => {
        if (tenant) {
            setForm({
                logo: tenant.branding?.logo || '',
                primaryColor: tenant.branding?.primaryColor || '#6366f1',
                secondaryColor: tenant.branding?.secondaryColor || '#10b981',
                customDomain: tenant.customDomain || '',
            });
            if (tenant.branding?.logo) setLogoPreview(tenant.branding.logo);
            setDomainError('');
        }
    }, [tenant]);

    const normalizedDomain = form.customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const hasDomain = normalizedDomain.length > 0;
    const isDomainValid = !hasDomain || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalizedDomain);
    const domainStatus = hasDomain ? (tenant?.customDomainStatus || 'pending') : 'not_configured';
    const domainStatusLabel = {
        not_configured: 'غير مفعّل',
        pending: 'Pending DNS',
        connected: 'Connected',
    }[domainStatus] || 'Pending DNS';
    const domainStatusClass = {
        not_configured: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    }[domainStatus];

    // Upload logo as an actual file (not base64) to get a proper URL
    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            notify.error('حجم الشعار يجب ألا يتجاوز 20MB');
            return;
        }

        // Show immediate preview locally
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);

        // Upload file to server and get back a real URL
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await api.post('/settings/logo', formData);
            const logoUrl = res.data?.data?.logoUrl;
            if (logoUrl) {
                setForm(prev => ({ ...prev, logo: logoUrl }));
                setLogoPreview(logoUrl);
                notify.success('تم رفع الشعار بنجاح ✓');
                getMe();
            }
        } catch (err) {
            notify.error(getUserFriendlyErrorMessage(err, 'فشل رفع الشعار'));
            setLogoPreview(form.logo || null);
        } finally {
            setUploadingLogo(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!isDomainValid) {
            setDomainError('Please enter a valid domain like shop.example.com');
            notify.error('Please enter a valid domain like shop.example.com');
            return;
        }

        setSaving(true);
        try {
            await api.put('/settings/branding', {
                logo: form.logo,
                primaryColor: form.primaryColor,
                secondaryColor: form.secondaryColor,
                customDomain: normalizedDomain,
            });
            notify.success('تم حفظ إعدادات الهوية البصرية بنجاح');
            getMe();
        } catch (err) {
            notify.error(getUserFriendlyErrorMessage(err, 'فشل حفظ الإعدادات'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                    <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">White-label والهوية البصرية</h2>
                    <p className="text-sm text-subtle">خصص شعارك وألوانك لتمييز متجرك</p>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Upload className="w-4 h-4 text-primary-500" /> شعار المتجر (Logo)
                </h3>
                <div className="flex items-center gap-6">
                    <div
                        onClick={() => !uploadingLogo && fileInputRef.current?.click()}
                        className={`w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all overflow-hidden relative group ${uploadingLogo ? 'border-primary-400 cursor-wait' : 'border-gray-200 dark:border-white/10 cursor-pointer hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/5'}`}
                    >
                        {uploadingLogo ? (
                            <div className="flex flex-col items-center text-primary-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-1" />
                                <p className="text-xs">جار الرفع...</p>
                            </div>
                        ) : logoPreview ? (
                            <>
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-white" />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted">
                                <Upload className="w-6 h-6 mx-auto mb-1" />
                                <p className="text-xs">رفع شعار</p>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                    />
                    <div className="text-sm text-subtle space-y-1">
                        <p>• الحجم الأقصى: 20MB</p>
                        <p>• الصيغ: PNG, JPG, SVG, WebP</p>
                        <p>• يُفضل صورة شفافة (بدون خلفية)</p>
                        {logoPreview && !uploadingLogo && (
                            <button
                                className="mt-2 text-red-500 text-xs flex items-center gap-1 hover:underline"
                                onClick={() => { setLogoPreview(null); setForm(prev => ({ ...prev, logo: '' })); }}
                            >
                                <X className="w-3 h-3" /> إزالة الشعار
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Color Customization */}
            <div className="p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Palette className="w-4 h-4 text-primary-500" /> ألوان الهوية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">اللون الأساسي (Primary)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={form.primaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-950"
                            />
                            <Input
                                value={form.primaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="flex-1"
                                placeholder="#6366f1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">اللون الثانوي (Secondary)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={form.secondaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-950"
                            />
                            <Input
                                value={form.secondaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                className="flex-1"
                                placeholder="#10b981"
                            />
                        </div>
                    </div>
                </div>

                {/* Color preview */}
                <div className="mt-6 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-muted mb-3">معاينة الألوان:</p>
                    <div className="flex items-center gap-3">
                        <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: form.primaryColor }}></div>
                        <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: form.secondaryColor }}></div>
                        <div className="h-10 flex-1 rounded-lg" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}></div>
                    </div>
                </div>
            </div>

            {/* Custom Domain */}
            <div className="p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Globe className="w-4 h-4 text-primary-500" /> النطاق المخصص (Custom Domain)
                </h3>
                <div className="mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${domainStatusClass}`}>
                        {domainStatusLabel}
                    </span>
                </div>
                <div className="text-sm text-subtle mb-4 space-y-2 bg-white dark:bg-gray-950/50 p-4 rounded-lg border border-gray-100 dark:border-white/5 text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">الفرق بين رابط المتجر والنطاق المخصص:</p>
                    <ul className="list-disc list-inside pr-2 space-y-1 text-xs leading-relaxed">
                        <li><strong className="text-primary-600 dark:text-primary-400">رابط المتجر الأساسي (Subdomain):</strong> يتم ضبطه من شاشة <strong className="text-gray-700 dark:text-gray-300">"إعدادات المتجر الأساسية"</strong>، ويكون مجانياً (مثال: <span dir="ltr" className="font-mono text-[10px] ml-1">shop.payqusta.com</span>).</li>
                        <li><strong className="text-pink-600 dark:text-pink-400">النطاق المخصص (Custom Domain):</strong> مدفوع تشتريه من شركة خارجية (مثل GoDaddy) ليكون باسم شركتك (مثال: <span dir="ltr" className="font-mono text-[10px] ml-1">www.myshop.com</span>).</li>
                    </ul>
                    <p className="text-xs pt-2 mt-2 border-t border-gray-100 dark:border-white/10">لربط نطاقك المخصص بنجاح، يجب توجيه <b>CNAME Record</b> من لوحة تحكم النطاق الخاص بك إلى هذا الخادم ثم حفظ رابط النطاق هنا بدون <span dir="ltr" className="font-mono ml-1">http://</span>.</p>
                </div>
                <Input
                    label="النطاق المخصص"
                    value={form.customDomain}
                    onChange={(e) => {
                        const value = e.target.value;
                        setForm(prev => ({ ...prev, customDomain: value }));
                        const preview = value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
                        setDomainError(preview && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(preview) ? 'Please enter a valid domain like shop.example.com' : '');
                    }}
                    placeholder="shop.yourdomain.com"
                />
                {domainError && (
                    <p className="text-xs text-red-500 mt-2">{domainError}</p>
                )}
                {tenant?.customDomainLastCheckedAt && (
                    <p className="text-xs text-muted mt-2" dir="ltr">
                        Last checked: {new Date(tenant.customDomainLastCheckedAt).toLocaleString()}
                    </p>
                )}
            </div>

            {/* Appearance Settings */}
            <hr className="border-gray-200 dark:border-gray-800" />

            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg">
                    <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">المظهر</h2>
                    <p className="text-xs text-subtle">تخصيص واجهة التطبيق العامة</p>
                </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">الوضع الليلي</h3>
                    <p className="text-sm text-subtle">تبديل بين الفاتح والداكن</p>
                </div>
                <button
                    onClick={toggleTheme}
                    className={`w-14 h-8 rounded-full transition-colors relative ${dark ? 'bg-primary-500' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${dark ? 'left-1 translate-x-0' : 'left-1 translate-x-6'}`} />
                </button>
            </div>

            {/* Save */}
            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/10">
                <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                    حفظ إعدادات الهوية
                </Button>
            </div>
        </div>
    );
}
