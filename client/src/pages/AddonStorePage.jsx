import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { api, useAuthStore } from '../store';
import { LoadingSpinner, Button, Badge } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function AddonStorePage() {
    const { tenant, getMe } = useAuthStore();
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchAddons();
    }, []);

    const fetchAddons = async () => {
        try {
            const res = await api.get('/addons');
            setAddons(res.data.data || []);
        } catch (err) {
            notify.error('فشل جلب الإضافات مـن المتجر');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (addon) => {
        if (tenant?.addons?.includes(addon.key)) {
            return notify.info('أنت تمتلك هذه الإضافة بالفعل');
        }

        setProcessing(addon._id);
        try {
            const res = await api.post(`/addons/${addon.key}/purchase`);
            if (res.data?.success) {
                notify.success(res.data.message);
                getMe(); // Refresh tenant context to reflect new addon
            }
        } catch (err) {
            notify.error(err.response?.data?.message || 'فشلت عملية الشراء');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-end bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 md:p-10 text-white shadow-xl">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center justify-center p-2 bg-white/20 rounded-xl mb-4 backdrop-blur-sm">
                        <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">متجر الإضافات (Add-ons)</h1>
                    <p className="text-purple-100 text-lg">
                        قم بتوسيع قدرات متجرك من خلال الميزات والتقارير المتقدمة المصممة خصيصاً لنمو عملك.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addons.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        لا توجد إضافات متاحة حالياً.
                    </div>
                ) : (
                    addons.map(addon => {
                        const isOwned = tenant?.addons?.includes(addon.key);
                        return (
                            <div
                                key={addon._id}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                                        {addon.category === 'reports' ? <Zap className="w-6 h-6 text-purple-600" /> : <Star className="w-6 h-6 text-purple-600" />}
                                    </div>
                                    {isOwned && (
                                        <Badge variant="success" className="gap-1">
                                            <CheckCircle className="w-3 h-3" /> ممتلك
                                        </Badge>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold mb-2">{addon.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 mb-6 leading-relaxed">
                                    {addon.description}
                                </p>

                                {addon.features?.length > 0 && (
                                    <ul className="mb-6 space-y-2">
                                        {addon.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                    <div>
                                        <span className="text-2xl font-bold">{addon.price === 0 ? 'مجاناً' : `${addon.price} ${addon.currency}`}</span>
                                        {addon.price > 0 && <span className="text-xs text-gray-400 block">تدفع مرة واحدة</span>}
                                    </div>
                                    <Button
                                        onClick={() => handlePurchase(addon)}
                                        disabled={isOwned || processing === addon._id}
                                        loading={processing === addon._id}
                                        variant={isOwned ? 'outline' : 'primary'}
                                        className={!isOwned ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' : ''}
                                    >
                                        {isOwned ? 'مفعل' : 'شراء الآن'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
