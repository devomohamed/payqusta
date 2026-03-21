import React from 'react';
import { Info, Cpu, Hash, Clock } from 'lucide-react';
import { APP_VERSION } from '../../config/version';

export default function SettingsSystem() {
  const buildId = typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : 'dev';

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg dark:from-slate-200 dark:to-white">
            <Info className="h-6 w-6 text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="text-xl font-bold app-text-body">معلومات النظام</h2>
            <p className="text-sm app-text-muted">بيانات الإصدار والتشغيل الحالية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="app-surface-muted rounded-2xl border border-[color:var(--surface-border)] p-5">
            <div className="mb-3 flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary-500" />
              <h3 className="font-bold app-text-body">إصدار التطبيق</h3>
            </div>
            <p className="text-2xl font-black app-text-body">v{APP_VERSION}</p>
            <p className="mt-1 text-xs app-text-muted">الإصدار المستقر الحالي</p>
          </div>

          <div className="app-surface-muted rounded-2xl border border-[color:var(--surface-border)] p-5">
            <div className="mb-3 flex items-center gap-3">
              <Hash className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold app-text-body">معرّف البناء (Build ID)</h3>
            </div>
            <p className="app-surface mt-1 break-all rounded-lg border border-[color:var(--surface-border)] p-2 text-sm font-mono app-text-body">
              {buildId}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-tighter app-text-muted">يستخدم لفرض تحديثات الـ Service Worker</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-5 dark:border-amber-900/20 dark:bg-amber-900/10">
          <div className="flex items-start gap-4">
            <Clock className="mt-1 h-5 w-5 text-amber-500" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-800 dark:text-amber-200">ملاحظة حول التحديثات</h4>
              <p className="text-xs leading-relaxed text-amber-700/80 dark:text-amber-300/60">
                عند تغيير رقم الإصدار في ملف الإعدادات <code>version.js</code> سيقوم النظام تلقائيًا بإخطار جميع
                المستخدمين بوجود تحديث جديد.
                هذا يضمن أن الجميع يعمل على أحدث نسخة تم رفعها ويقلل مشاكل الاعتماد على الكاش القديم.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
