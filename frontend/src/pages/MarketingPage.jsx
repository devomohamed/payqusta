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
            toast.error('حدث خطأ أثناء تحميل بيانات التسويق');
        } finally {
            setLoading(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastForm.message) return toast.error('يرجى كتابة نص الرسالة');
        setSending(true);
        try {
            const res = await api.post('/customers/broadcast', broadcastForm);
            toast.success(`تم بنجاح! تم إرسال ${res.data.data.successCount} رسالة وفشل ${res.data.data.failCount}`);
            setShowBroadcastModal(false);
            setBroadcastForm({ ...broadcastForm, message: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'فشل إرسال الحملة');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const segmentCards = [
        {
            id: 'vip',
            title: 'العملاء VIP',
            count: stats?.vip || 0,
            icon: Crown,
            color: 'bg-amber-100 text-amber-700',
            description: 'أهم العملاء وأكثرهم شراءً برصيد نقاط مرتفع',
            list: segments?.vip || []
        },
        {
            id: 'loyal',
            title: 'العملاء الملتزمون',
            count: stats?.loyal || 0,
            icon: TrendingUp,
            color: 'bg-green-100 text-green-700',
            description: 'عملاء ملتزمون بالسداد وفي تقدم مستمر',
            list: segments?.loyal || []
        },
        {
            id: 'debtors',
            title: 'العملاء المدينون',
            count: stats?.debtors || 0,
            icon: Wallet,
            color: 'bg-red-100 text-red-700',
            description: 'عملاء لديهم مديونيات مرتفعة (أكثر من 5,000 ج.م)',
            list: segments?.debtors || []
        },
        {
            id: 'inactive',
            title: 'عملاء غير نشطين',
            count: stats?.inactive || 0,
            icon: UserX,
            color: 'bg-gray-100 text-gray-700',
            description: 'عملاء لم يفعلوا أي عملية شراء منذ 30 يوماً',
            list: segments?.inactive || []
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-indigo-600" />
                        التسويق وبرامج الولاء
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        حلل سلوك العملاء واستهدفهم بحملات ترويجية ذكية
                    </p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    onClick={() => setShowBroadcastModal(true)}
                >
                    <MessageSquare className="w-5 h-5" />
                    بدء حملة WhatsApp
                </button>
            </div>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBroadcastModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-slide-up">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-indigo-600" />
                            إرسال حملة واتساب جماعية
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">استهداف شريحة:</label>
                                <select
                                    value={broadcastForm.segment}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, segment: e.target.value })}
                                    className="w-full p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                >
                                    <option value="vip">العملاء VIP</option>
                                    <option value="loyal">العملاء الملتزمون</option>
                                    <option value="debtors">العملاء المدينون</option>
                                    <option value="inactive">العملاء غير النشطين</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نص الرسالة:</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    rows={4}
                                    placeholder="اكتب رسالتك هنا... سيتم إرسالها لجميع العملاء في الشريحة المختارة"
                                    className="w-full p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 resize-none focus:border-indigo-500 transition-colors"
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
                                    إرسال الآن
                                </button>
                                <button
                                    onClick={() => setShowBroadcastModal(false)}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
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
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" />
                            أفضل العملاء (VIP)
                        </h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            عرض الكل
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {segments?.vip?.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {segments.vip.map((customer) => (
                                    <div key={customer._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                            <div className="p-12 text-center text-gray-500">لا يوجد عملاء في هذه الفئة حالياً</div>
                        )}
                    </div>
                </div>

                {/* Inactive List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <UserX className="w-5 h-5 text-gray-500" />
                            عملاء بحاجة لتواصل
                        </h3>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                            عرض الكل
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {segments?.inactive?.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {segments.inactive.map((customer) => (
                                    <div key={customer._id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">آخر شراء: {customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString('ar-EG') : 'لم يشترِ بعد'}</div>
                                            </div>
                                        </div>
                                        <button
                                            className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 transition-colors"
                                            title="إرسال رسالة تذكير"
                                        >
                                            <MessageSquare className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">جميع عملائك نشطون!</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Placeholder for Loyalty and Broadcast Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
                <div className="max-w-2xl">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="w-8 h-8" />
                        تفعيل نظام النقاط والاستبدال
                    </h2>
                    <p className="text-indigo-100 mb-6">
                        النظام يدفع العملاء للشراء المتكرر والسداد في الموعد عن طريق منحهم نقاطاً يمكن استبدالها برصيد حقيقي في متجرك.
                    </p>
                    <div className="flex gap-4">
                        <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
                            إعدادات الولاء
                        </button>
                        <button className="px-6 py-2 bg-indigo-500/30 border border-white/20 rounded-xl font-bold hover:bg-indigo-500/50 transition-colors">
                            دليل الاستخدام
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketingPage;
