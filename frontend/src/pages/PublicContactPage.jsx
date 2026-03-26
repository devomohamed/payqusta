import React, { useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Compass, LifeBuoy, Rocket, SendHorizonal, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../store';
import { Button, Input, Select, TextArea } from '../components/UI';
import { useTranslation } from 'react-i18next';

const contactTracks = [
  {
    icon: Compass,
    title: t('public_contact_page.ui.kc3op9x'),
    description: t('public_contact_page.ui.ko7v031'),
    ctaLabel: t('public_contact_page.ui.k5uekyo'),
    to: '/demo',
  },
  {
    icon: Rocket,
    title: t('public_contact_page.ui.kov398r'),
    description: 'انتقل مباشرة إلى إنشاء الحساب وابدأ على بيانات نشاطك، ثم راجع الباقة من داخل المنصة إذا احتجت الترقية.',
    ctaLabel: t('public_contact_page.ui.kkvj629'),
    to: '/login?mode=register',
  },
  {
    icon: LifeBuoy,
    title: t('public_contact_page.ui.k34q4ox'),
    description: t('public_contact_page.ui.kx66k4p'),
    ctaLabel: t('public_contact_page.ui.k32w7dx'),
    to: '/login',
  },
];

const decisionChecklist = [
  t('public_contact_page.ui.kf2xvq3'),
  t('public_contact_page.ui.kua9mr6'),
  t('public_contact_page.ui.ktiw9ad'),
];

const journeyCards = [
  {
    icon: Store,
    title: t('public_contact_page.ui.kmr40x6'),
    text: t('public_contact_page.ui.k6xmube'),
    to: '/features',
  },
  {
    icon: Building2,
    title: t('public_contact_page.ui.k2c9i6h'),
    text: t('public_contact_page.ui.khonufa'),
    to: '/use-cases',
  },
  {
    icon: CheckCircle2,
    title: t('public_contact_page.ui.k2gdpl2'),
    text: t('public_contact_page.ui.k9z7g1u'),
    to: '/pricing',
  },
];

const requestTypeOptions = [
  { value: 'demo', label: t('public_contact_page.ui.kedv4q7') },
  { value: 'pricing', label: t('public_contact_page.ui.krp313d') },
  { value: 'migration', label: t('public_contact_page.ui.kvlsy9h') },
  { value: 'partnership', label: t('public_contact_page.ui.kbgt8bv') },
  { value: 'general', label: t('public_contact_page.ui.kf2wbfz') },
];

const teamSizeOptions = [
  { value: 'solo', label: t('public_contact_page.ui.ks8vzg3') },
  { value: 'small', label: t('public_contact_page.ui.kekxevw') },
  { value: 'medium', label: t('public_contact_page.ui.kpll041') },
  { value: 'large', label: t('public_contact_page.ui.kw2n10b') },
  { value: 'enterprise', label: t('public_contact_page.ui.kejueo0') },
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
  const { t } = useTranslation('admin');
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
      toast.error(t('public_contact_page.toasts.keew8x3'));
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
      toast.success(t('public_contact_page.toasts.kieohf7'));
    } catch (error) {
      toast.error(error?.response?.data?.message || t('public_contact_page.toasts.k72u4bu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr] lg:items-start">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{t('public_contact_page.ui.kfatkp7')}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t('public_contact_page.ui.krazz4r')}</h1>
          <p className="app-text-soft mt-4 text-base leading-8 sm:text-lg">
            هذه الصفحة لم تعد مجرد توجيه. الآن يمكنك إرسال طلب ديمو أو استفسار أسعار أو طلب نقل بيانات، وسيتم حفظه داخل لوحة المراجعة بدل أن يضيع خارج النظام.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              to="/pricing"
              className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10"
            >
              {t('public_contact_page.ui.kr550tn')}
            </Link>
            <Link
              to="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
            >
              {t('public_contact_page.ui.kl6w4j0')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-right text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">{t('public_contact_page.ui.k2pcugj')}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">{t('public_contact_page.ui.kx6vd7v')}</h2>
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
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{t('public_contact_page.ui.kieohf7')}</h2>
              <p className="app-text-soft mt-3 text-sm leading-7">
                وصل طلبك الآن إلى لوحة المراجعة داخل المنصة. إذا كان هدفك مشاهدة الديمو أو مراجعة الأسعار، يمكنك متابعة الصفحات المرتبطة أدناه، وسنتواصل معك أيضًا على بياناتك المرسلة.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Link to="/demo" className="app-surface-muted rounded-full px-5 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
                  {t('public_contact_page.ui.k5uekyo')}
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15"
                >
                  {t('public_contact_page.ui.kuz1cr')}
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_contact_page.ui.kmph0rb')}</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_contact_page.ui.kdbyuzm')}</h2>
                <p className="app-text-soft mt-3 text-sm leading-7">
                  اكتب باختصار نوع نشاطك وما الذي تريد تقييمه. هذا النموذج مخصص للطلبات الجادة قبل التسجيل أو قبل اختيار الباقة.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('public_contact_page.form.kovdol8')} value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('public_contact_page.placeholders.kkkw8zr')} required />
                <Input label={t('public_contact_page.form.k8lvosz')} type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="name@company.com" required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('public_contact_page.form.k3pahhc')} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="01XXXXXXXXX" />
                <Input label={t('public_contact_page.form.ka4bqn0')} value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder={t('public_contact_page.placeholders.kyp2mhu')} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t('public_contact_page.form.kqsuck5')} value={form.requestType} onChange={(e) => updateField('requestType', e.target.value)} options={requestTypeOptions} />
                <Select label={t('public_contact_page.form.kz1pyt1')} value={form.teamSize} onChange={(e) => updateField('teamSize', e.target.value)} options={teamSizeOptions} />
              </div>

              <div className="hidden">
                <Input label="Website" value={form.website} onChange={(e) => updateField('website', e.target.value)} autoComplete="off" tabIndex={-1} />
              </div>

              <TextArea
                label={t('public_contact_page.form.ka4hc8p')}
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
                {t('public_contact_page.ui.krdk7xa')}
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
          <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_contact_page.ui.kx177qs')}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_contact_page.ui.kbks95z')}</h2>
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
            <p className="app-text-muted text-sm font-black uppercase tracking-[0.18em]">{t('public_contact_page.ui.k4v9rk5')}</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('public_contact_page.ui.k6sk4i7')}</h2>
            <p className="app-text-soft mt-3 text-base leading-8">
              هذا الترتيب يختصر الوقت: فهم سريع للقيمة، مراجعة الباقة المناسبة، ثم الدخول إلى التجربة الفعلية داخل الحساب.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link to="/demo" className="app-surface-muted rounded-full px-6 py-3 text-center text-sm font-black text-slate-800 transition-colors hover:bg-white dark:text-slate-100 dark:hover:bg-white/10">
              {t('public_contact_page.ui.k5uekyo')}
            </Link>
            <Link to="/login?mode=register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15">
              {t('public_contact_page.ui.kkvj629')}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
