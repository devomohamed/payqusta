import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Receipt,
  ShieldAlert,
  Smartphone,
  Store,
} from 'lucide-react';
import { api } from '../store';

const STATUS_STYLES = {
  success: 'bg-green-100 text-green-700 border-green-200',
  refunded: 'bg-green-100 text-green-700 border-green-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS = {
  success: 'تم السداد',
  refunded: 'تم الاسترداد',
  processing: 'بانتظار التأكيد',
  pending: 'قيد الانتظار',
  failed: 'فشل الدفع',
  expired: 'انتهت صلاحية الرابط',
};

const GATEWAY_META = {
  fawry: { icon: Store, accent: 'from-emerald-500 to-teal-600' },
  vodafone: { icon: Smartphone, accent: 'from-rose-500 to-red-600' },
  instapay: { icon: Receipt, accent: 'from-sky-500 to-cyan-600' },
};

const formatDateTime = (value) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متاح';
  return date.toLocaleString('ar-EG');
};

const formatAmount = (amount, currency) => `${Number(amount || 0).toFixed(2)} ${currency || 'EGP'}`;

export default function PublicPaymentInstructionPage() {
  const { gateway, id } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [copiedValue, setCopiedValue] = useState('');

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setLoading(true);
      setError('');

      try {
        const access = searchParams.get('access') || '';
        const response = await api.get(`/payments/public/${id}`, { params: { access } });
        if (!active) return;
        setSession(response.data?.data || null);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'تعذر تحميل بيانات الدفع');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSession();
    return () => {
      active = false;
    };
  }, [id, searchParams]);

  const gatewayUi = useMemo(
    () => GATEWAY_META[gateway] || GATEWAY_META[session?.gateway] || GATEWAY_META.fawry,
    [gateway, session?.gateway],
  );
  const GatewayIcon = gatewayUi.icon;
  const paymentMeta = session?.paymentMeta || null;
  const statusKey = session?.status || 'pending';

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setCopiedValue(String(value || ''));
      window.setTimeout(() => setCopiedValue(''), 2000);
    } catch (_) {
      setCopiedValue('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تجهيز تعليمات الدفع...</span>
        </div>
      </div>
    );
  }

  if (error || !session || !paymentMeta) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          <h1 className="text-2xl font-black mb-3">الرابط غير متاح</h1>
          <p className="text-slate-300 leading-7">{error || 'تعذر عرض بيانات عملية الدفع الحالية.'}</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-6 rounded-full bg-white text-slate-950 px-5 py-3 font-bold">
            <ArrowLeft className="w-4 h-4" />
            العودة للموقع
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_35%),linear-gradient(180deg,#020617,#0f172a)] text-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between text-white">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            PayQusta
          </Link>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${STATUS_STYLES[statusKey] || STATUS_STYLES.pending}`}>
            {statusKey === 'success' || statusKey === 'refunded' ? <CheckCircle2 className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
            {STATUS_LABELS[statusKey] || STATUS_LABELS.pending}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8">
            <div className={`inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r ${gatewayUi.accent} px-4 py-3 text-white shadow-lg`}>
              <GatewayIcon className="w-6 h-6" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/75">Payment</p>
                <h1 className="text-xl font-black">{paymentMeta.providerName}</h1>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-3xl font-black text-slate-950">{paymentMeta.title}</h2>
              <p className="mt-3 text-slate-600 leading-7">{paymentMeta.description}</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">المبلغ</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{formatAmount(session.netAmount, session.currency)}</p>
                {session.invoiceNumber ? <p className="mt-2 text-sm text-slate-500">فاتورة رقم {session.invoiceNumber}</p> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{paymentMeta.referenceLabel}</p>
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-lg font-black text-slate-950 break-all">{paymentMeta.referenceValue}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentMeta.referenceValue)}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {copiedValue === paymentMeta.referenceValue ? 'تم نسخ المرجع' : 'انسخ المرجع قبل إتمام السداد'}
                </p>
              </div>
            </div>

            {paymentMeta.destinationValue ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{paymentMeta.destinationLabel}</p>
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xl font-black text-slate-950 break-all">{paymentMeta.destinationValue}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentMeta.destinationValue)}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {paymentMeta.destinationHint ? <p className="mt-2 text-sm text-slate-500">{paymentMeta.destinationHint}</p> : null}
              </div>
            ) : null}

            <div className="mt-8">
              <h3 className="mb-4 text-lg font-black text-slate-950">الخطوات</h3>
              <div className="space-y-3">
                {paymentMeta.steps?.map((step, index) => (
                  <div key={`${index}-${step}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-7 text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {paymentMeta.launchUrl ? (
              <a
                href={paymentMeta.launchUrl}
                className={`mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${gatewayUi.accent} px-6 py-3 font-bold text-white shadow-lg`}
              >
                <ExternalLink className="w-4 h-4" />
                فتح التطبيق مباشرة
              </a>
            ) : null}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-white backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Transaction</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-300">رقم العملية</p>
                  <p className="mt-1 break-all font-bold">{session.transactionId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">تم الإنشاء</p>
                  <p className="mt-1 font-bold">{formatDateTime(session.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">انتهاء الصلاحية</p>
                  <p className="mt-1 font-bold">{formatDateTime(session.expiresAt)}</p>
                </div>
                {session.completedAt ? (
                  <div>
                    <p className="text-sm text-slate-300">تم التأكيد</p>
                    <p className="mt-1 font-bold">{formatDateTime(session.completedAt)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20">
              <h3 className="text-lg font-black text-slate-950">مهم قبل الإغلاق</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>استخدم نفس المبلغ المعروض دون تعديل.</li>
                <li>لا تشارك الرابط إلا مع صاحب الفاتورة أو المكلّف بالدفع.</li>
                <li>احتفظ بالرقم المرجعي حتى تظهر الحالة "تم السداد".</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
