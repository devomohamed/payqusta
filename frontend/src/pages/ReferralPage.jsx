import { useState, useEffect } from 'react';
import { Gift, Copy, Users, Clock, Share2, TrendingUp, MessageCircle, Mail, Smartphone, Link2 } from 'lucide-react';
import { api, useAuthStore } from '../store';
import { LoadingSpinner, Button, Badge, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useThemeStore } from '../store';

export default function ReferralPage() {
    const { dark } = useThemeStore();
    const { tenant } = useAuthStore();
    const [code, setCode] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [shareOpen, setShareOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const shareTitle = 'كود إحالة PayQusta';
    const shareText = `استخدم كود الإحالة ${code} للحصول على شهر مجاني عند التسجيل في PayQusta${tenant?.name ? ` عبر متجر ${tenant.name}` : ''}.`;
    const shareUrl = `${window.location.origin}/login`;
    const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    const fetchData = async () => {
        try {
            const [codeRes, statsRes] = await Promise.all([
                api.get('/referrals/my-code'),
                api.get('/referrals/stats'),
            ]);
            setCode(codeRes.data.data?.code || '');
            setStats(statsRes.data.data || {});
        } catch (err) {
            notify.error('فشل تحميل بيانات الإحالات');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (value, successMessage) => {
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable');
            }
            await navigator.clipboard.writeText(value);
            notify.success(successMessage);
        } catch (err) {
            notify.error('تعذر النسخ على هذا الجهاز');
        }
    };

    const copyCode = () => copyToClipboard(code, 'تم نسخ كود الإحالة');

    const copyShareMessage = async () => {
        await copyToClipboard(shareText, 'تم نسخ رسالة الإحالة');
        setShareOpen(false);
    };

    const openExternalShare = (url, successMessage) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        notify.success(successMessage);
        setShareOpen(false);
    };

    const openWhatsApp = () => {
        const encoded = encodeURIComponent(shareText);
        openExternalShare(`https://wa.me/?text=${encoded}`, 'تم فتح واتساب للمشاركة');
    };

    const openTelegram = () => {
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(shareText);
        openExternalShare(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, 'تم فتح تيليجرام للمشاركة');
    };

    const openEmail = () => {
        const subject = encodeURIComponent(shareTitle);
        const body = encodeURIComponent(`${shareText}\n\nرابط التسجيل: ${shareUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        notify.success('تم فتح البريد الإلكتروني');
        setShareOpen(false);
    };

    const copyDirectLink = async () => {
        await copyToClipboard(shareUrl, 'تم نسخ رابط التسجيل المباشر');
        setShareOpen(false);
    };

    const shareWithDevice = async () => {
        if (!canUseNativeShare) {
            await copyShareMessage();
            return;
        }

        setShareOpen(false);

        try {
            await navigator.share({ title: shareTitle, text: shareText });
        } catch (err) {
            if (err?.name !== 'AbortError') {
                notify.error('تعذر فتح مشاركة الجهاز');
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <>
            <div className="space-y-6 max-w-5xl mx-auto p-4 lg:p-6 app-text-soft">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-8 translate-y-8"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center p-2 bg-white/20 rounded-xl mb-4 backdrop-blur-sm">
                            <Gift className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-3">برنامج الإحالات</h1>
                        <p className="text-amber-100 text-lg max-w-2xl">
                            شارك كودك مع أصحاب المتاجر واحصل على شهر مجاني لكل إحالة ناجحة يتحول فيها المُحال إلى مشترك مدفوع.
                        </p>
                    </div>
                </div>

                {/* Referral Code Card */}
                <div className="app-surface rounded-2xl p-6 border border-gray-100/80 dark:border-white/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">كود الإحالة الخاص بك</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className={`flex-1 w-full text-center text-2xl font-mono font-bold py-4 px-6 rounded-xl border-2 border-dashed tracking-widest ${dark ? 'bg-gray-900 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>
                            {code}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={copyCode} variant="outline" className="gap-2">
                                <Copy className="w-4 h-4" /> نسخ
                            </Button>
                            <Button onClick={() => setShareOpen(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
                                <Share2 className="w-4 h-4" /> مشاركة
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Users} label="إجمالي الإحالات" value={stats?.totalReferred || 0} color="blue" dark={dark} />
                    <StatCard icon={TrendingUp} label="تم التحويل" value={stats?.converted || 0} color="green" dark={dark} />
                    <StatCard icon={Clock} label="مكافآت بانتظار التفعيل" value={stats?.pendingReward || 0} color="amber" dark={dark} />
                </div>

                {/* Referrals List */}
                <div className="app-surface rounded-2xl p-6 border border-gray-100/80 dark:border-white/10 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">سجل الإحالات</h3>
                    {(!stats?.referrals || stats.referrals.length === 0) ? (
                        <div className="text-center py-12 text-gray-400">
                            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>لا توجد إحالات بعد. شارك كودك وابدأ بجمع المكافآت.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.referrals.map((ref, idx) => (
                                <div key={idx} className="app-surface-muted flex items-center justify-between p-4 rounded-xl">
                                    <div>
                                        <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                                            {ref.referred?.name || ref.referredEmail || 'مُحال جديد'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(ref.createdAt).toLocaleDateString('ar-EG')}
                                        </p>
                                    </div>
                                    <Badge variant={
                                        ref.status === 'rewarded' ? 'success' :
                                            ref.status === 'converted' ? 'primary' :
                                                ref.status === 'registered' ? 'warning' : 'gray'
                                    }>
                                        {ref.status === 'rewarded' ? 'تمت المكافأة' :
                                            ref.status === 'converted' ? 'تم التحويل' :
                                                ref.status === 'registered' ? 'مسجل' : 'قيد الانتظار'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="مشاركة كود الإحالة" size="md">
                <div className="space-y-5">
                    <div className="app-surface-muted rounded-2xl border border-gray-100/80 dark:border-white/10 p-5">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                                <Share2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">اختر طريقة المشاركة المناسبة</p>
                                <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                                    استخدم الخيارات السريعة بالأسفل للمشاركة مباشرة، أو افتح مشاركة الجهاز إذا أردت إرسال الكود إلى تطبيقات أخرى.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="app-surface rounded-2xl border border-gray-100/80 dark:border-white/10 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">كود الإحالة</span>
                            <span className="text-lg font-mono font-bold tracking-widest text-amber-500">{code}</span>
                        </div>
                        <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{shareText}</p>
                        <div className="app-surface-muted rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                            {shareUrl}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ShareActionButton
                            icon={Copy}
                            label="نسخ الكود"
                            description="ينسخ الكود فقط لاستخدامه السريع"
                            onClick={copyCode}
                            variant="outline"
                        />
                        <ShareActionButton
                            icon={Link2}
                            label="نسخ الرسالة"
                            description="ينسخ نص المشاركة كاملًا"
                            onClick={copyShareMessage}
                            variant="outline"
                        />
                        <ShareActionButton
                            icon={MessageCircle}
                            label="مشاركة عبر واتساب"
                            description="يفتح واتساب مع الرسالة جاهزة"
                            onClick={openWhatsApp}
                            variant="whatsapp"
                        />
                        <ShareActionButton
                            icon={Send}
                            label="مشاركة عبر تيليجرام"
                            description="يفتح تيليجرام مع الرابط والرسالة"
                            onClick={openTelegram}
                            variant="outline"
                        />
                        <ShareActionButton
                            icon={Mail}
                            label="إرسال بالبريد"
                            description="يفتح تطبيق البريد على الجهاز"
                            onClick={openEmail}
                            variant="outline"
                        />
                        <ShareActionButton
                            icon={Link2}
                            label="نسخ رابط مباشر"
                            description="ينسخ رابط التسجيل المباشر"
                            onClick={copyDirectLink}
                            variant="outline"
                        />
                    </div>

                    <div className="app-surface-muted rounded-2xl border border-gray-100/80 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">مشاركة عبر الجهاز</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {canUseNativeShare
                                    ? 'سيفتح لك نافذة مشاركة الجهاز لاختيار التطبيق المناسب.'
                                    : 'هذا الجهاز لا يدعم مشاركة النظام، وسيتم نسخ الرسالة بدلًا من ذلك.'}
                            </p>
                        </div>
                        <Button onClick={shareWithDevice} className="gap-2 whitespace-nowrap">
                            <Smartphone className="w-4 h-4" /> مشاركة عبر الجهاز
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

function StatCard({ icon: Icon, label, value, color, dark }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        amber: 'from-amber-500 to-orange-600',
    };
    return (
        <div className="app-surface-muted rounded-2xl p-5 border border-gray-100/80 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
}

function ShareActionButton({ icon: Icon, label, description, variant, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-2xl border p-4 text-right transition-all duration-200 hover:-translate-y-0.5 ${
                variant === 'whatsapp'
                    ? 'border-green-200 bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600'
                    : 'border-gray-200 app-surface text-gray-900 hover:border-primary-300 hover:bg-black/[0.03] dark:border-white/10 dark:text-gray-100 dark:hover:border-primary-500 dark:hover:bg-white/[0.04]'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    variant === 'whatsapp'
                        ? 'bg-white/20'
                        : 'app-surface-muted text-gray-600 dark:text-gray-300'
                }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className={`text-xs mt-1 leading-5 ${variant === 'whatsapp' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}
