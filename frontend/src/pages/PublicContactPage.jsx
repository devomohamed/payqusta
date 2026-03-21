import React, { useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Compass, LifeBuoy, Rocket, SendHorizonal, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../store';
import { Button, Input, Select, TextArea } from '../components/UI';

const contactTracks = [
  {
    icon: Compass,
    title: 'إذا كنت ما زلت تقارن الحلول',
    description: 'ابدأ من الديمو وصفحة الأسعار لتقييم الصورة الكاملة: البيع، المخزون، الأقساط، والمتجر العام.',
    ctaLabel: 'شاهد الديمو',
    to: '/demo',
  },
  {
    icon: Rocket,
    title: 'إذا كنت مستعدًا للبدء',
    description: 'انتقل مباشرة إلى إنشاء الحساب وابدأ على بيانات نشاطك، ثم راجع الباقة من داخل المنصة إذا احتجت الترقية.',
    ctaLabel: 'ابدأ الحساب',
    to: '/login?mode=register',
  },
  {
    icon: LifeBuoy,
    title: 'إذا كنت عميلًا قائمًا',
    description: 'الدخول إلى الحساب أو البوابة هو المسار الأسرع للوصول إلى أدوات الدعم، الطلبات، والمتابعة الفعلية.',
    ctaLabel: 'تسجيل الدخول',
    to: '/login',
  },
];

const decisionChecklist = [
  'ما حجم المنتجات والعملاء والفروع التي تريد إدارتها الآن؟',
  'هل تركيزك الحالي على نقطة البيع، الأقساط، أم المتجر الإلكتروني؟',
  'هل تريد البدء بالتجربة أولًا أم الانتقال مباشرة إلى الاشتراك؟',
];

const journeyCards = [
  {
    icon: Store,
    title: 'للبراند والمتجر',
    text: 'راجع الواجهة العامة والظهور والصفحات التسويقية قبل تقييم المتجر نفسه.',
    to: '/features',
  },
  {
    icon: Building2,
    title: 'للتشغيل الداخلي',
    text: 'راجع حالات الاستخدام والمزايا لتعرف هل المنصة قريبة من طريقة عمل نشاطك اليومية.',
    to: '/use-cases',
  },
  {
    icon: CheckCircle2,
    title: 'للقرار النهائي',
    text: 'اختم المقارنة بصفحة الأسعار والديمو ثم ابدأ الحساب من المسار الأقرب لاحتياجك.',
    to: '/pricing',
  },
];

const requestTypeOptions = [
  { value: 'demo', label: 'طلب ديمو عملي' },
  { value: 'pricing', label: 'استفسار عن الأسعار' },
  { value: 'migration', label: 'نقل بيانات / ترحيل' },
  { value: 'partnership', label: 'شراكة أو تعاون' },
  { value: 'general', label: 'استفسار عام' },
];

const teamSizeOptions = [
  { value: 'solo', label: 'نشاط فردي' },
  { value: 'small', label: 'فريق صغير' },
  { value: 'medium', label: 'فريق متوسط' },
  { value: 'large', label: 'أكثر من فرع أو فريق كبير' },
  { value: 'enterprise', label: 'مؤسسة / شبكة فروع' },
];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  requestType: 'demo',
  teamSize: 'small',
  message: '',
  website: '',
};

export default function PublicContactPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    return form.name.trim() && form.email.trim() && form.message.trim().length >= 20;
  }, [form]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('أكمل الاسم والبريد واكتب رسالة أوضح قبل الإرسال');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/public/leads', {
        ...form,
        sourcePage: '/contact',
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success('تم استلام طلبك بنجاح');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'تعذر إرسال الطلب حاليًا');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">التواصل والخطوات التالية</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">إذا كنت تريد تقييم PayQusta بجدية، أرسل طلبك من هنا وسيظهر مباشرة داخل المنصة</h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">
            هذه الصفحة لم تعد مجرد توجيه. الآن يمكنك إرسال طلب ديمو أو استفسار أسعار أو طلب نقل بيانات، وسيتم حفظه داخل لوحة المراجعة بدل أن يضيع خارج النظام.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/pricing"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              الأسعار والباقات
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              ابدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">قبل أن تبدأ</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">حدد لماذا تريد التواصل أو التقييم، ثم اختر المسار الأقصر</h2>
            <div className="mt-5 grid gap-3">
              {decisionChecklist.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-bold leading-7 text-white/90">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="app-surface rounded-[2rem] p-6 text-right sm:p-8">
          {submitted ? (
            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-400/20 dark:bg-emerald-400/10">
              <div className="inline-flex rounded-2xl bg-emerald-600 p-3 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">تم استلام طلبك بنجاح</h2>
              <p className="app-text-soft mt-3 text-sm leading-7">
                وصل طلبك الآن إلى لوحة المراجعة داخل المنصة. إذا كان هدفك مشاهدة الديمو أو مراجعة الأسعار، يمكنك متابعة الصفحات المرتبطة أدناه، وسنتواصل معك أيضًا على بياناتك المرسلة.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link to="/demo" className="app-surface-muted rounded-full px-5 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
                  شاهد الديمو
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
                >
                  أرسل طلبًا آخر
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">أرسل طلبك</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">طلب ديمو أو استفسار فعلي</h2>
                <p className="app-text-soft mt-3 text-sm leading-7">
                  اكتب باختصار نوع نشاطك وما الذي تريد تقييمه. هذا النموذج مخصص للطلبات الجادة قبل التسجيل أو قبل اختيار الباقة.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="الاسم" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="مثال: محمد أحمد" required />
                <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="name@company.com" required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="رقم الهاتف" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="01XXXXXXXXX" />
                <Input label="اسم النشاط أو المتجر" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="مثال: إلكترونيات المعادي" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="نوع الطلب" value={form.requestType} onChange={(e) => updateField('requestType', e.target.value)} options={requestTypeOptions} />
                <Select label="حجم النشاط" value={form.teamSize} onChange={(e) => updateField('teamSize', e.target.value)} options={teamSizeOptions} />
              </div>

              <div className="hidden">
                <Input label="Website" value={form.website} onChange={(e) => updateField('website', e.target.value)} autoComplete="off" tabIndex={-1} />
              </div>

              <TextArea
                label="ما الذي تريد تقييمه أو الوصول إليه؟"
                rows={6}
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="اكتب باختصار: هل تريد ديمو؟ هل عندك بيانات تريد ترحيلها؟ هل تريد معرفة الباقة المناسبة؟ ما حجم التشغيل الحالي؟"
                required
              />

              <div className="app-surface-muted rounded-2xl px-4 py-4 text-sm font-bold leading-7 text-slate-700 dark:text-slate-100">
                الطلبات الجيدة هنا تكون محددة: نوع النشاط، ما الذي تريد مراجعته، وهل تبحث عن ديمو أم عرض أسعار أم نقل بيانات.
              </div>

              <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit} icon={<SendHorizonal className="h-4 w-4" />}>
                إرسال الطلب
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {contactTracks.map((track) => {
          const Icon = track.icon;
          return (
            <article key={track.title} className="app-surface rounded-[1.75rem] p-6 text-right">
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{track.title}</h2>
              <p className="app-text-soft mt-4 text-sm leading-7">{track.description}</p>
              <div className="mt-6">
                <Link to={track.to} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
                  {track.ctaLabel}
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="app-surface mt-10 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-right sm:p-8 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="text-right">
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">ابدأ من الصفحة الأقرب لقرارك</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">ثلاث صفحات تكمل الصورة بسرعة</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {journeyCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.to} className="app-surface rounded-[1.5rem] p-5 text-right transition-transform hover:-translate-y-1">
                <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-black text-slate-950 dark:text-white">{card.title}</p>
                <p className="app-text-soft mt-3 text-sm leading-7">{card.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="app-surface mt-10 rounded-[2rem] p-6 text-right sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div>
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">للمراجعة النهائية</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">إذا كنت جادًا في التقييم، اعبر بهذا الترتيب: ديمو ثم أسعار ثم حساب</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              هذا الترتيب يختصر الوقت: فهم سريع للقيمة، مراجعة الباقة المناسبة، ثم الدخول إلى التجربة الفعلية داخل الحساب.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link to="/demo" className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
              شاهد الديمو
            </Link>
            <Link to="/login?mode=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
              ابدأ الحساب
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
