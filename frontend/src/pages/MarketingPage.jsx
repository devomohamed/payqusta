import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    Crown,
    UserX,
    Wallet,
    TrendingUp,
    MessageSquare,
    ChevronRight,
    ArrowRightLeft,
    Filter,
    Send
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import { EmptyState, LoadingSpinner } from '../components/UI';

const MarketingPage = () => {
    const { t } = useTranslation('admin');
    const [segments, setSegments] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({ segment: 'vip', message: '' });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchSegments();
    }, []);

    const fetchSegments = async () => {
        try {
            setLoading(true);
            const response = await api.get('/customers/segments');
            setSegments(response.data.segments);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching segments:', error);
            toast.error(t('marketing_page.toasts.kfa1gd5'));
        } finally {
            setLoading(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastForm.message) return toast.error(t('marketing_page.toasts.katqvt5'));
        setSending(true);
        try {
            const res = await api.post('/customers/broadcast', broadcastForm);
            toast.success(`تم بنجاح! تم إرسال ${res.data.data.successCount} رسالة وفشل ${res.data.data.failCount}`);
            setShowBroadcastModal(false);
            setBroadcastForm({ ...broadcastForm, message: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || t('marketing_page.toasts.kafltet'));
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px]">
                <LoadingSpinner size="lg" text="جاري تحميل بيانات التسويق..." />
            </div>
        );
    }

    const segmentCards = [
        {
            id: 'vip',
            title: t('marketing_page.ui.kc3s0su'),
            count: stats?.vip || 0,
            icon: Crown,
            color: 'bg-amber-100 text-amber-700',
            description: t('marketing_page.ui.kduixr9'),
            list: segments?.vip || []
        },
        {
            id: 'loyal',
            title: t('marketing_page.ui.kvb642c'),
            count: stats?.loyal || 0,
            icon: TrendingUp,
            color: 'bg-green-100 text-green-700',
            description: t('marketing_page.ui.kkgcofm'),
            list: segments?.loyal || []
        },
        {
            id: 'debtors',
            title: t('marketing_page.ui.kgqszl8'),
            count: stats?.debtors || 0,
            icon: Wallet,
            color: 'bg-red-100 text-red-700',
            description: t('marketing_page.ui.kf0oqsz'),
            list: segments?.debtors || []
        },
        {
            id: 'inactive',
            title: t('marketing_page.ui.knitlns'),
            count: stats?.inactive || 0,
            icon: UserX,
            color: 'bg-gray-100 text-gray-700',
            description: t('marketing_page.ui.kwbvwtu'),
            list: segments?.inactive || []
        }
    ];

    return (
        <div className="space-y-6 app-text-soft">
            <div className="app-surface-muted flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl p-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-indigo-600" />
                        {t('marketing_page.ui.kw3lyb4')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('marketing_page.ui.k7fms5a')}
                    </p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    onClick={() => setShowBroadcastModal(true)}
                >
                    <MessageSquare className="w-5 h-5" />
                    {t('marketing_page.ui.kpvdhu7')}
                </button>
            </div>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBroadcastModal(false)} />
                    <div className="app-surface relative rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-slide-up">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-indigo-600" />
                            {t('marketing_page.ui.k3fdg5i')}
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('marketing_page.ui.kh35jch')}</label>
                                <select
                                    value={broadcastForm.segment}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, segment: e.target.value })}
                                    className="app-surface w-full p-3 rounded-xl border border-transparent focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option value="vip">{t('marketing_page.ui.kc3s0su')}</option>
                                    <option value="loyal">{t('marketing_page.ui.kvb642c')}</option>
                                    <option value="debtors">{t('marketing_page.ui.kgqszl8')}</option>
                                    <option value="inactive">{t('marketing_page.ui.ktesxsu')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('marketing_page.ui.kqcot5q')}</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    rows={4}
                                    placeholder={t('marketing_page.placeholders.kri022d')}
                                    className="app-surface w-full p-4 rounded-xl border border-transparent resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                                />
                                <p className="text-[10px] text-gray-400 mt-2">
                                    * ملاحظة: الإرسال الجماعي يعتمد على رصيد الرسائل المتاح في حسابك.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleSendBroadcast}
                                    disabled={sending}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                    {t('marketing_page.ui.kakn7nh')}
                                </button>
                                <button
                                    onClick={() => setShowBroadcastModal(false)}
                                    className="app-surface px-6 py-3 rounded-xl font-bold transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                >
                                    {t('marketing_page.ui.cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {segmentCards.map((card) => (
                    <div
                        key={card.id}
                        className="app-surface-muted p-6 rounded-2xl border border-gray-100/80 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 rounded-full transition-transform group-hover:scale-110 ${card.color.split(' ')[0]}`} />

                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                {card.count}
                            </span>
                        </div>

                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                            {card.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* VIP List */}
                <div className="app-surface rounded-2xl border border-gray-100/80 dark:border-white/10 shadow-sm flex flex-col">
                    <div className="app-surface-muted p-6 border-b border-gray-100/80 dark:border-white/10 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" />
                            {t('marketing_page.ui.kfisrbp')}
                        </h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            {t('marketing_page.ui.kwbgoww')}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {segments?.vip?.length > 0 ? (
                            <div className="divide-y divide-gray-100/70 dark:divide-white/10">
                                {segments.vip.map((customer) => (
                                    <div key={customer._id} className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-bold">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-amber-600">{customer.gamification?.points || 0} نقطة</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">{customer.tier}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Users}
                                title={t('marketing_page.titles.k1duvry')}
                                description="ستظهر نتائج هذه الشريحة هنا بمجرد توفر عملاء مطابقين."
                                className="py-6"
                            />
                        )}
                    </div>
                </div>

                {/* Inactive List */}
                <div className="app-surface rounded-2xl border border-gray-100/80 dark:border-white/10 shadow-sm flex flex-col">
                    <div className="app-surface-muted p-6 border-b border-gray-100/80 dark:border-white/10 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserX className="w-5 h-5 text-gray-500" />
                            {t('marketing_page.ui.kljelp9')}
                        </h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            {t('marketing_page.ui.kwbgoww')}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {segments?.inactive?.length > 0 ? (
                            <div className="divide-y divide-gray-100/70 dark:divide-white/10">
                                {segments.inactive.map((customer) => (
                                    <div key={customer._id} className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="app-surface-muted w-10 h-10 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">آخر شراء: {customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString('ar-EG') : 'لم يشترِ بعد'}</div>
                                            </div>
                                        </div>
                                        <button
                                            className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition-colors"
                                            title={t('marketing_page.titles.kz8236')}
                                        >
                                            <MessageSquare className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={UserX}
                                title={t('marketing_page.titles.kbbm6uj')}
                                description="لا توجد حاليًا أي حسابات خاملة تحتاج إلى إعادة تنشيط."
                                className="py-6"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Placeholder for Loyalty and Broadcast Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
                <div className="max-w-2xl">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="w-8 h-8" />
                        {t('marketing_page.ui.khmjmu0')}
                    </h2>
                    <p className="text-indigo-100 mb-6">
                        النظام يدفع العملاء للشراء المتكرر والسداد في الموعد عن طريق منحهم نقاطاً يمكن استبدالها برصيد حقيقي في متجرك.
                    </p>
                    <div className="flex gap-4">
                        <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                            {t('marketing_page.ui.kdfswvh')}
                        </button>
                        <button className="px-6 py-2 bg-indigo-500/30 border border-white/20 rounded-xl font-bold hover:bg-indigo-500/50 transition-colors">
                            {t('marketing_page.ui.kqcmfu7')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketingPage;
