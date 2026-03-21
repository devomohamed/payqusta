import React, { useEffect, useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { Modal, Button, Card, EmptyState, LoadingSpinner } from './UI';
import { api } from '../store';
import notify from './AnimatedNotification';

export default function BranchSettlementModal({ open, onClose, branchId, branchName }) {
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashInHand, setCashInHand] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && branchId) {
      fetchSettlementData();
    }
  }, [open, branchId]);

  const fetchSettlementData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/branches/${branchId}/stats`);
      const stats = response.data.data;

      const data = {
        totalSales: stats.today.sales || 0,
        cashSales: stats.today.paid || 0,
        cardSales: 0,
        creditSales: stats.today.sales - stats.today.paid || 0,
        expenses: stats.today.expenses || 0,
        returns: 0,
        netCash: (stats.today.paid || 0) - (stats.today.expenses || 0),
        invoicesCount: stats.today.invoicesCount || 0
      };

      setSettlementData(data);
      setCashInHand(data.netCash.toString());
    } catch (error) {
      notify.error('فشل تحميل بيانات التصفية');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!cashInHand || Number.isNaN(parseFloat(cashInHand))) {
      notify.warning('الرجاء إدخال المبلغ النقدي الفعلي');
      return;
    }

    setSettling(true);
    try {
      const expectedCash = settlementData.netCash;
      const actualCash = parseFloat(cashInHand);
      const variance = actualCash - expectedCash;

      await api.post(`/branches/${branchId}/settlement`, {
        date,
        cashInHand: actualCash,
        expectedCash,
        variance,
        notes
      });

      notify.success('تمت تصفية العهدة وإغلاق الوردية بنجاح');
      onClose();
    } catch (error) {
      notify.error(error.response?.data?.message || 'حدث خطأ أثناء التصفية');
    } finally {
      setSettling(false);
    }
  };

  const formatCurrency = (value) => (value || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
  const variance = parseFloat(cashInHand || 0) - (settlementData?.netCash || 0);

  return (
    <Modal open={open} onClose={onClose} title={`تصفية وردية - ${branchName || 'الفرع'}`} size="lg">
      <div className="space-y-4">
        <div className="app-surface-muted flex items-center justify-between rounded-xl border border-gray-200/80 p-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-bold">تاريخ التصفية:</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="bg-transparent text-sm font-mono outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : settlementData ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4 border-l-4 border-l-green-500">
              <h4 className="mb-3 flex items-center gap-2 font-bold text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                المبيعات
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">مبيعات نقدية</span>
                  <span className="font-bold">{formatCurrency(settlementData.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">مبيعات آجلة</span>
                  <span className="font-bold">{formatCurrency(settlementData.creditSales)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-white/10">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold text-green-600">{formatCurrency(settlementData.totalSales)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-red-500">
              <h4 className="mb-3 flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                الخصومات
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">المصروفات</span>
                  <span className="font-bold text-red-500">- {formatCurrency(settlementData.expenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المرتجعات</span>
                  <span className="font-bold text-red-500">- {formatCurrency(settlementData.returns)}</span>
                </div>
              </div>
            </Card>

            <Card className="md:col-span-2 p-5 border border-primary-100 bg-gradient-to-br from-primary-50 to-blue-50 dark:border-primary-500/30 dark:from-primary-900/20 dark:to-blue-900/20">
              <p className="mb-1 text-center text-sm text-gray-500">صافي النقدية المتوقع</p>
              <h2 className="mb-4 text-center text-4xl font-black text-primary-600 dark:text-primary-400">
                {formatCurrency(settlementData.netCash)}
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    المبلغ الفعلي في الدرج <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={cashInHand}
                    onChange={(event) => setCashInHand(event.target.value)}
                    className="app-surface w-full rounded-xl border border-gray-200/80 px-4 py-2 text-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:text-gray-100"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">الفرق (عجز/زيادة)</label>
                  <div
                    className={`flex w-full items-center justify-center rounded-xl border px-4 py-2 text-lg font-bold ${
                      variance === 0
                        ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : variance > 0
                          ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'border-red-200 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(variance)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="app-surface w-full resize-none rounded-xl border border-gray-200/80 px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:text-gray-100"
                  rows="2"
                  placeholder="أي ملاحظات حول التصفية..."
                />
              </div>
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={Calculator}
            title="لا توجد بيانات"
            description="تعذر تحميل بيانات التصفية لهذا الفرع الآن."
            action={{ label: 'إعادة المحاولة', onClick: fetchSettlementData }}
            className="py-6"
          />
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={settling}>
            إلغاء
          </Button>
          <Button
            className="w-full sm:w-auto"
            icon={settling ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
            onClick={handleSettle}
            disabled={loading || !settlementData || settling || !cashInHand}
          >
            {settling ? 'جارٍ التصفية...' : 'تأكيد التصفية وإغلاق الوردية'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
