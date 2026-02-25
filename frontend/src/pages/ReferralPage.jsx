import { useState, useEffect } from 'react';
import { Gift, Copy, Users, CheckCircle, Clock, Share2, TrendingUp } from 'lucide-react';
import { api, useAuthStore } from '../store';
import { LoadingSpinner, Button, Badge } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useThemeStore } from '../store';

export default function ReferralPage() {
    const { dark } = useThemeStore();
    const { tenant } = useAuthStore();
    const [code, setCode] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        notify.success('تم نسخ كود الإحالة!');
    };

    const shareCode = () => {
        const text = `🎁 استخدم كود الإحالة الخاص بي ${code} للحصول على شهر مجاني عند التسجيل في PayQusta — نظام نقاط البيع الشامل!`;
        if (navigator.share) {
            navigator.share({ title: 'كود إحالة PayQusta', text });
        } else {
            navigator.clipboard.writeText(text);
            notify.success('تم نسخ رسالة الإحالة!');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 lg:p-6">
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
            <div className={`rounded-2xl p-6 border shadow-sm ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="font-bold text-lg mb-4">كود الإحالة الخاص بك</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className={`flex-1 w-full text-center text-2xl font-mono font-bold py-4 px-6 rounded-xl border-2 border-dashed tracking-widest ${dark ? 'bg-gray-900 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>
                        {code}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={copyCode} variant="outline" className="gap-2">
                            <Copy className="w-4 h-4" /> نسخ
                        </Button>
                        <Button onClick={shareCode} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
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
            <div className={`rounded-2xl p-6 border shadow-sm ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="font-bold text-lg mb-4">سجل الإحالات</h3>
                {(!stats?.referrals || stats.referrals.length === 0) ? (
                    <div className="text-center py-12 text-gray-400">
                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد إحالات بعد. شارك كودك وابدأ بجمع المكافآت!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stats.referrals.map((ref, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-4 rounded-xl ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
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
                                            ref.status === 'registered' ? 'warning' : 'secondary'
                                }>
                                    {ref.status === 'rewarded' ? 'تم المكافأة' :
                                        ref.status === 'converted' ? 'تم التحويل' :
                                            ref.status === 'registered' ? 'مسجل' : 'قيد الانتظار'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, dark }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        amber: 'from-amber-500 to-orange-600',
    };
    return (
        <div className={`rounded-2xl p-5 border shadow-sm ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
