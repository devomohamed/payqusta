import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, useThemeStore } from '../store';
import { Button, Input } from '../components/UI';
import ThemeModeSwitcher from '../components/ThemeModeSwitcher';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { dark } = useThemeStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return toast.error('البريد الإلكتروني مطلوب');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: normalizedEmail });
      toast.success(res.data.message || 'تم إرسال رابط إعادة تعيين كلمة المرور');
      setEmail(normalizedEmail);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={`app-shell-bg min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 ${dark ? 'dark' : ''}`}>
        <div className="w-full max-w-md">
          <div className="app-surface rounded-[1.75rem] p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">تم الإرسال! ✉️</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى<br />
              <strong className="text-primary-600 dark:text-primary-400">{email}</strong>
            </p>
            <div className="app-surface-muted mb-6 rounded-2xl border border-blue-200/60 p-4 text-right dark:border-blue-500/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>📌 ملاحظة:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• تحقق من صندوق الوارد الخاص بك</li>
                <li>• الرابط صالح لمدة ساعة واحدة</li>
                <li>• تحقق من مجلد الرسائل غير المرغوب فيها</li>
              </ul>
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لتسجيل الدخول</span>
            </Link>
            <div className="mt-6 flex justify-center">
              <ThemeModeSwitcher compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell-bg min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 ${dark ? 'dark' : ''}`}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            نسيت كلمة المرور؟
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        {/* Form */}
        <div className="app-surface rounded-[1.75rem] p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-12"
                  dir="ltr"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              إرسال رابط إعادة التعيين
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>تذكرت كلمة المرور؟ سجل الدخول</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          © 2026 PayQusta. جميع الحقوق محفوظة.
        </p>
        <div className="mt-4 flex justify-center">
          <ThemeModeSwitcher compact />
        </div>
      </div>
    </div>
  );
}
