import React, { useState, useEffect } from 'react';
import { Save, CreditCard } from 'lucide-react';
import { useAuthStore, api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';
import { getUserFriendlyErrorMessage } from '../../utils/errorMapper';

export default function SettingsInstallments() {
  const { tenant, getMe } = useAuthStore();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installmentConfigs, setInstallmentConfigs] = useState([
    { months: 3, minAmount: 1000, interestRate: 0 },
    { months: 6, minAmount: 3000, interestRate: 0 },
    { months: 12, minAmount: 5000, interestRate: 0 },
  ]);

  useEffect(() => {
    if (tenant?.settings?.installments) {
      if (tenant.settings.installments.enabled !== undefined) {
        setEnabled(tenant.settings.installments.enabled);
      }
      if (tenant.settings.installments.installmentConfigs) {
        setInstallmentConfigs(tenant.settings.installments.installmentConfigs);
      }
    } else if (tenant?.settings?.installmentConfigs) { // fallback for legacy data if any
      setInstallmentConfigs(tenant.settings.installmentConfigs);
    }
  }, [tenant]);

  const addConfig = () => {
    setInstallmentConfigs([...installmentConfigs, { months: 3, minAmount: 1000, interestRate: 0 }]);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/installments', {
        enabled,
        installmentConfigs: installmentConfigs.filter(c => c.months > 0),
      });
      notify.success('تم حفظ إعدادات الأقساط');
      getMe();
    } catch (err) {
      notify.error(getUserFriendlyErrorMessage(err, 'فشل في حفظ الإعدادات'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات الأقساط</h2>
          <p className="text-sm text-subtle">تخصيص خيارات التقسيط</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
          />
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-gray-100">تفعيل حاسبة الأقساط للمتجر</span>
            <span className="text-xs text-subtle">عند تفعيل هذا الخيار ستظهر حاسبة الأقساط في صفحة تفاصيل المنتج.</span>
          </div>
        </label>
      </div>

      <div className={`space-y-4 transition-opacity duration-300 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {installmentConfigs.map((config, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-gray-50/50 dark:bg-slate-950 border border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-sm">
            <Input label="عدد الأشهر" type="number" value={config.months} onChange={(e) => {
              const newConfigs = [...installmentConfigs];
              newConfigs[idx].months = parseInt(e.target.value) || 0;
              setInstallmentConfigs(newConfigs);
            }} />
            <Input label="الحد الأدنى (ج.م)" type="number" value={config.minAmount} onChange={(e) => {
              const newConfigs = [...installmentConfigs];
              newConfigs[idx].minAmount = parseInt(e.target.value) || 0;
              setInstallmentConfigs(newConfigs);
            }} />
            <Input label="نسبة الفائدة %" type="number" value={config.interestRate} onChange={(e) => {
              const newConfigs = [...installmentConfigs];
              newConfigs[idx].interestRate = parseFloat(e.target.value) || 0;
              setInstallmentConfigs(newConfigs);
            }} />
            <Button variant="ghost" size="sm" onClick={() => {
              setInstallmentConfigs(installmentConfigs.filter((_, i) => i !== idx));
            }}>حذف</Button>
          </div>
        ))}
      </div>

      <div className={`flex gap-3 transition-opacity duration-300 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Button onClick={addConfig} variant="outline" className="border-dashed">+ إضافة خطة</Button>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/10">
        <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
          حفظ التعديلات
        </Button>
      </div>
    </div>
  );
}
