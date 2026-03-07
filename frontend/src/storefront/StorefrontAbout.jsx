import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Mail, MapPin, PhoneCall, ShieldCheck, Store, Truck } from 'lucide-react';
import { Card } from '../components/UI';
import { storefrontPath } from '../utils/storefrontHost';
import { loadStorefrontSettings } from './storefrontDataClient';

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'شراء بدون تعقيد',
    desc: 'الطلب متاح مباشرة كضيف، بدون أي خطوات إضافية أو إجبار على إنشاء حساب.',
  },
  {
    icon: Truck,
    title: 'توصيل موثوق',
    desc: 'نراجع كل طلب قبل الشحن، مع متابعة واضحة وسريعة حتى الاستلام.',
  },
  {
    icon: CreditCard,
    title: 'دفع مرن',
    desc: 'اختر طريقة الدفع الأنسب لك بين الدفع عند الاستلام أو الدفع الإلكتروني.',
  },
];

export default function StorefrontAbout() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const res = await loadStorefrontSettings();
        if (mounted) {
          setSettings(res.data?.data || null);
        }
      } catch (_) {
        if (mounted) {
          setSettings(null);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const storeName = settings?.store?.name || settings?.tenant?.name || 'متجرنا';
  const storeAddress = settings?.store?.address || 'نوفر تجربة شراء مرنة وسريعة تركّز على راحة العميل من أول تصفح وحتى الاستلام.';
  const storePhone = settings?.store?.phone?.trim() || '';
  const storeEmail = settings?.store?.email?.trim() || '';

  return (
    <div className="space-y-10 pb-8" dir="rtl">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_40%)]" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 text-right max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold">
              <Store className="w-4 h-4" />
              عن {storeName}
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">متجر مبني لتجربة شراء واضحة، سريعة، ومريحة من أول زيارة.</h1>
            <p className="text-base md:text-lg text-slate-300 leading-8">
              نركز على إن العميل يقدر يشتري مباشرة، يتابع طلبه بسهولة، ويتواصل مع المتجر وقت ما يحتاج بدون ما نحوله لخطوات غير ضرورية.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={storefrontPath('/products')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-100 transition-colors">
              تصفح المنتجات
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to={storefrontPath('/track-order')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/20 text-white font-bold hover:bg-white/10 transition-colors">
              تتبع طلبك
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Card key={item.title} className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-right">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center mb-4">
              <item.icon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">{item.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-7">{item.desc}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <Card className="p-7 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-right">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">كيف بنشتغل</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-8 mb-5">
            {storeName} مصمم ليخلي العميل يركز على المنتج والطلب نفسه. لذلك خففنا أي خطوات غير ضرورية داخل المتجر العام، وخلينا الشراء، المتابعة، والتواصل كلها متاحة بشكل مباشر.
          </p>
          <div className="space-y-3">
            {[
              'إتمام الطلب كضيف بدون طلب تسجيل دخول.',
              'صفحة تتبع عامة لمتابعة حالة الطلب بسهولة.',
              'معلومات تواصل واضحة داخل المتجر.',
              'واجهة نظيفة تركز على المنتجات والثقة في الشراء.',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-7">{point}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-7 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-right">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">بيانات المتجر</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Store className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-400">اسم المتجر</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{storeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-gray-400">العنوان</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-7">{storeAddress}</p>
              </div>
            </div>

            {storePhone && (
              <a href={`tel:${storePhone}`} className="flex items-start gap-3 hover:text-primary-600 transition-colors">
                <PhoneCall className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-400">الهاتف</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{storePhone}</p>
                </div>
              </a>
            )}

            {storeEmail && (
              <a href={`mailto:${storeEmail}`} className="flex items-start gap-3 hover:text-primary-600 transition-colors">
                <Mail className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-400">البريد الإلكتروني</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{storeEmail}</p>
                </div>
              </a>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
