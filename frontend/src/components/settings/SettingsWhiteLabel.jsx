import React, { useState, useEffect, useRef } from 'react';
import { Save, Globe, Paintbrush, Upload, Eye, X, Palette, Store } from 'lucide-react';
import { useAuthStore, useThemeStore, api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsWhiteLabel() {
    const { tenant, getMe } = useAuthStore();
    const { dark, toggleTheme } = useThemeStore();
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
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
        }
    }, [tenant]);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            notify.error('حجم الشعار يجب ألا يتجاوز 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setLogoPreview(ev.target.result);
            setForm(prev => ({ ...prev, logo: ev.target.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/settings/branding', {
                logo: form.logo,
                primaryColor: form.primaryColor,
                secondaryColor: form.secondaryColor,
            });
            notify.success('تم حفظ إعدادات الهوية البصرية بنجاح');
            getMe();
        } catch (err) {
            notify.error(err.response?.data?.message || 'فشل حفظ الإعدادات');
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
                    <h2 className="text-xl font-bold">White-label والهوية البصرية</h2>
                    <p className="text-sm text-gray-400">خصص شعارك وألوانك لتمييز متجرك</p>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-gray-500" /> شعار المتجر (Logo)
                </h3>
                <div className="flex items-center gap-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-400 transition-colors overflow-hidden relative group"
                    >
                        {logoPreview ? (
                            <>
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-white" />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400">
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
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        <p>• الحجم الأقصى: 2MB</p>
                        <p>• الصيغ: PNG, JPG, SVG, WebP</p>
                        <p>• يُفضل صورة شفافة (بدون خلفية)</p>
                        {logoPreview && (
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
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-gray-500" /> ألوان الهوية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">اللون الأساسي (Primary)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={form.primaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-gray-600"
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
                        <label className="block text-sm font-medium mb-2">اللون الثانوي (Secondary)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={form.secondaryColor}
                                onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-gray-600"
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
                <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 mb-3">معاينة الألوان:</p>
                    <div className="flex items-center gap-3">
                        <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: form.primaryColor }}></div>
                        <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: form.secondaryColor }}></div>
                        <div className="h-10 flex-1 rounded-lg" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}></div>
                    </div>
                </div>
            </div>

            {/* Custom Domain */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" /> النطاق المخصص (Custom Domain)
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    يمكنك ربط نطاقك الخاص ليظهر متجرك باسم مخصص. هذه الميزة ستتطلب إعداد DNS يدوي (CNAME).
                </p>
                <Input
                    label="النطاق المخصص"
                    value={form.customDomain}
                    onChange={(e) => setForm(prev => ({ ...prev, customDomain: e.target.value }))}
                    placeholder="shop.yourdomain.com"
                    disabled
                />
                <p className="text-xs text-amber-500 mt-2">⚠️ ميزة قادمة — سيتم تفعيلها قريباً بعد إعداد البنية التحتية للنشر.</p>
            </div>

            {/* Appearance Settings */}
            <hr className="border-gray-200 dark:border-gray-800" />

            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg">
                    <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">المظهر</h2>
                    <p className="text-xs text-gray-400">تخصيص واجهة التطبيق العامة</p>
                </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="font-bold">الوضع الليلي</h3>
                    <p className="text-sm text-gray-400">تبديل بين الفاتح والداكن</p>
                </div>
                <button
                    onClick={toggleTheme}
                    className={`w-14 h-8 rounded-full transition-colors relative ${dark ? 'bg-primary-500' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${dark ? 'left-1 translate-x-0' : 'left-1 translate-x-6'}`} />
                </button>
            </div>

            {/* PWA Install Button */}
            <InstallAppButton />

            {/* Save */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
                    حفظ إعدادات الهوية
                </Button>
            </div>
        </div>
    );
}

// Internal component for Install Button
function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    if (isInstalled) {
        return (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <Store className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-bold text-green-700 dark:text-green-400">التطبيق مثبت</h3>
                    <p className="text-sm text-green-600/80">أنت تستخدم النسخة المثبتة من النظام</p>
                </div>
            </div>
        );
    }

    if (!deferredPrompt) {
        if (import.meta.env.DEV) {
            return (
                <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-400">
                    <div className="font-bold flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        وضع المطور (Debug Mode)
                    </div>
                    <p className="mt-1">زر التثبيت غير متاح حالياً.</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs opacity-80">
                        <li>تأكد أن التطبيق ليس مثبتاً بالفعل.</li>
                        <li>تأكد من العمل على localhost أو HTTPS.</li>
                        <li>متصفح Chrome/Edge يتطلب تفاعل المستخدم أحياناً.</li>
                        <li>حدث الصفحة (Refresh) وحاول مرة أخرى.</li>
                    </ul>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="p-4 rounded-xl border border-primary-200 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">تثبيت التطبيق</h3>
                    <p className="text-sm text-gray-500">قم بتثبيت النظام على جهازك لسهولة الوصول والعمل بدون إنترنت</p>
                </div>
            </div>
            <button
                onClick={handleInstall}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
                تثبيت الآن
            </button>
        </div>
    );
}
