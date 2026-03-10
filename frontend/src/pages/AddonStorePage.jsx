import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Zap, CheckCircle } from 'lucide-react';
import { api, useAuthStore } from '../store';
import { LoadingSpinner, Button, Badge, EmptyState } from '../components/UI';
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
      notify.error('فشل جلب الإضافات من المتجر');
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
        getMe();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشلت عملية الشراء');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="جاري تحميل الإضافات..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-xl md:flex-row md:items-end md:p-10">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white/20 p-2 backdrop-blur-sm">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">متجر الإضافات (Add-ons)</h1>
          <p className="text-lg text-purple-100">
            قم بتوسيع قدرات متجرك من خلال الميزات والتقارير المتقدمة المصممة خصيصًا لنمو عملك.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {addons.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={ShoppingBag}
              title="لا توجد إضافات متاحة حاليًا"
              description="ستظهر الإضافات الجاهزة للتفعيل هنا بمجرد إتاحتها لمتجرك."
            />
          </div>
        ) : (
          addons.map((addon) => {
            const isOwned = tenant?.addons?.includes(addon.key);

            return (
              <div
                key={addon._id}
                className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/30">
                    {addon.category === 'reports'
                      ? <Zap className="h-6 w-6 text-purple-600" />
                      : <Star className="h-6 w-6 text-purple-600" />}
                  </div>
                  {isOwned && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> ممتلك
                    </Badge>
                  )}
                </div>

                <h3 className="mb-2 text-xl font-bold">{addon.name}</h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {addon.description}
                </p>

                {addon.features?.length > 0 && (
                  <ul className="mb-6 space-y-2">
                    {addon.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-col gap-4 border-t border-gray-100 pt-6 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-2xl font-bold">
                      {addon.price === 0 ? 'مجانا' : `${addon.price} ${addon.currency}`}
                    </span>
                    {addon.price > 0 && (
                      <span className="block text-xs text-gray-400">تدفع مرة واحدة</span>
                    )}
                  </div>

                  <Button
                    onClick={() => handlePurchase(addon)}
                    disabled={isOwned || processing === addon._id}
                    loading={processing === addon._id}
                    variant={isOwned ? 'outline' : 'primary'}
                    className={`w-full sm:w-auto ${!isOwned ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' : ''}`}
                  >
                    {isOwned ? 'مفعّل' : 'شراء الآن'}
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
