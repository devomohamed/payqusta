import React, { useState, useEffect } from 'react';
import { api } from '../store';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, Lock, CheckCircle, AlertTriangle, History, TrendingUp, Wallet } from 'lucide-react';
import { Button, Card, Input, Modal, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import Pagination from '../components/Pagination';
import { useAuthStore } from '../store';
import { useTranslation } from 'react-i18next';

export default function CashDrawerPage() {
  const { t } = useTranslation('admin');
  const { user } = useAuthStore();
  const [activeShift, setActiveShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  // Forms
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingForm, setClosingForm] = useState({ actualCash: 0, notes: '' });

  const fetchDat = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        api.get('/cash-shifts/current'),
        api.get(`/cash-shifts/history?page=${page}&limit=10`)
      ]);
      setActiveShift(currentRes.data.data);
      setHistory(historyRes.data.data);
      setPagination(historyRes.data.pagination);
    } catch (err) {
      toast.error(t('cash_drawer_page.toasts.kbxi5nn'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDat();
  }, [page]);

  const handleOpenShift = async () => {
    try {
      await api.post('/cash-shifts/open', { openingBalance: Number(openingBalance) });
      toast.success(t('cash_drawer_page.toasts.klrwc8p'));
      setShowOpenModal(false);
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || t('cash_drawer_page.toasts.kxoca'));
    }
  };

  const handleCloseShift = async () => {
    try {
      await api.post('/cash-shifts/close', { 
        actualCash: Number(closingForm.actualCash),
        notes: closingForm.notes
      });
      toast.success(t('cash_drawer_page.toasts.kpua9ar'));
      setShowCloseModal(false);
      setClosingForm({ actualCash: 0, notes: '' });
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || t('cash_drawer_page.toasts.kxoca'));
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(n);
  const varianceIssues = history.filter((shift) => Number(shift.variance || 0) !== 0).length;

  return (
    <div className="app-shell-bg app-text-soft space-y-8 p-4 sm:p-6 animate-fade-in">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-emerald-700 via-green-700 to-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(22,163,74,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <Wallet className="h-3.5 w-3.5" />
              Cash Control Center
            </div>
            <h1 className="mt-4 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">{t('cash_drawer_page.ui.kslfn1')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              {user?.role === 'admin' || user?.isSuperAdmin ? t('cash_drawer_page.ui.kr5ld1y') : 'إدارة ورديتك ومبيعاتك اليومية من شاشة أخف وأسهل في الاستخدام.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[470px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('cash_drawer_page.ui.k2hkmtk')}</p>
              <p className="mt-2 text-lg font-black">{activeShift ? t('cash_drawer_page.ui.ke4t9wv') : 'لا توجد وردية'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('cash_drawer_page.ui.kt9ioft')}</p>
              <p className="mt-2 text-2xl font-black">{history.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">{t('cash_drawer_page.ui.ken05wj')}</p>
              <p className="mt-2 text-2xl font-black">{varianceIssues}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Active Shift Area */}
      {loading ? <LoadingSpinner /> : (
        <>
          {!activeShift ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 text-center text-white shadow-xl shadow-slate-950/20 transition-transform duration-300 motion-safe:hover:-translate-y-1">
              <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('cash_drawer_page.ui.kbcbq0j')}</h2>
              <p className="text-gray-400 mb-6">{t('cash_drawer_page.ui.kiuu0ik')}</p>
              <Button size="lg" onClick={() => setShowOpenModal(true)} icon={<DollarSign />}>{t('cash_drawer_page.ui.kvwgy2y')}</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-700 p-6 text-white shadow-xl shadow-emerald-900/20 transition-transform duration-300 motion-safe:hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-lg font-bold opacity-90">{t('cash_drawer_page.ui.kmu2o98')}</h2>
                      <p className="text-sm opacity-75">{new Date(activeShift.startTime).toLocaleString('ar-EG')}</p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">{t('cash_drawer_page.ui.k1gg77p')}</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 opacity-80" />
                        <span className="text-sm font-medium opacity-80">{t('cash_drawer_page.ui.kbu3ryl')}</span>
                      </div>
                      <span className="font-bold text-lg">{fmt(activeShift.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 opacity-80" />
                        <span className="text-sm font-medium opacity-80">{t('cash_drawer_page.ui.kvl473f')}</span>
                      </div>
                      <div className="text-right">
                         <span className="font-bold text-lg text-green-200">+{fmt(activeShift.currentSales)}</span>
                         {activeShift.breakdown && (
                           <p className="text-xs opacity-60">
                             مباشر: {fmt(activeShift.breakdown.directSales)} | تحصيل: {fmt(activeShift.breakdown.collections)}
                           </p>
                         )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                       <span className="text-lg font-bold">{t('cash_drawer_page.ui.klk2k5j')}</span>
                       <span className="text-3xl font-black">{fmt(activeShift.expectedNow)}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button 
                      variant="danger" 
                      className="w-full bg-white/10 hover:bg-white/20 border-0 text-white backdrop-blur-sm"
                      onClick={() => setShowCloseModal(true)}
                    >
                      {t('cash_drawer_page.ui.krd2e8e')}
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="app-surface-muted flex flex-col justify-center items-center text-center space-y-4 p-6">
                <Clock className="w-12 h-12 text-primary-500" />
                <div>
                   <h3 className="text-xl font-bold">{t('cash_drawer_page.ui.kplbi5h')}</h3>
                   <p className="text-gray-500">مفتوحة منذ {Math.floor((new Date() - new Date(activeShift.startTime)) / 1000 / 60)} دقيقة</p>
                </div>
                {/* Motivation for Staff */}
                <div className="w-full rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-bold">🎯 هدف اليوم: حقق مبيعات أعلى!</p>
                </div>
              </Card>
            </div>
          )}

          {/* History Table */}
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5" /> {user?.role === 'admin' ? t('cash_drawer_page.ui.kapdjxz') : 'سجل وردياتي السابق'}</h3>
            <Card className="overflow-hidden rounded-3xl">
               <div className="space-y-3 p-4 md:hidden">
                 {history.length === 0 ? (
                   <EmptyState
                     icon={History}
                     title={t('cash_drawer_page.titles.k24yftn')}
                     description="ستظهر الورديات المغلقة السابقة هنا بمجرد إتمام أول وردية."
                     className="py-4"
                   />
                 ) : history.map(shift => (
                   <div key={shift._id} className="app-surface-muted rounded-2xl p-4">
                     <div className="flex items-start justify-between gap-3">
                       <div>
                         <p className="text-sm font-black text-gray-900 dark:text-white">{shift.user?.name || '—'}</p>
                         <p className="mt-1 text-[11px] text-gray-400">{new Date(shift.startTime).toLocaleDateString('ar-EG')}</p>
                       </div>
                       {shift.variance === 0 ? (
                         <Badge variant="success">{t('cash_drawer_page.ui.krr8u24')}</Badge>
                       ) : shift.variance < 0 ? (
                         <Badge variant="danger" className="dir-ltr">عجز {fmt(shift.variance)}</Badge>
                       ) : (
                         <Badge variant="warning" className="dir-ltr">زيادة +{fmt(shift.variance)}</Badge>
                       )}
                     </div>

                     <div className="mt-3 grid grid-cols-2 gap-2">
                       <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                         <p className="text-[10px] text-gray-400">{t('cash_drawer_page.ui.kove7mv')}</p>
                         <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{new Date(shift.startTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</p>
                       </div>
                       <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                         <p className="text-[10px] text-gray-400">{t('cash_drawer_page.ui.kz9gwp9')}</p>
                         <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '—'}</p>
                       </div>
                     </div>
                     <p className="mt-3 text-sm font-black text-emerald-600">{fmt(shift.totalCashSales)}</p>
                   </div>
                 ))}
               </div>
               <div className="hidden overflow-x-auto md:block">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                     <tr>
                       <th className="p-4">{t('cash_drawer_page.ui.kzbvdnf')}</th>
                       <th className="p-4">{t('cash_drawer_page.ui.kaawtcn')}</th>
                       <th className="p-4">{t('cash_drawer_page.ui.kove7mv')}</th>
                       <th className="p-4">{t('cash_drawer_page.ui.kz9gwp9')}</th>
                       <th className="p-4">{t('cash_drawer_page.ui.ksgkw32')}</th>
                       <th className="p-4">{t('cash_drawer_page.ui.k2avu01')}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
                     {history.length === 0 ? (
                       <tr>
                         <td colSpan="6" className="p-4">
                           <EmptyState
                             icon={History}
                             title={t('cash_drawer_page.titles.k24yftn')}
                             description="ستظهر الورديات المغلقة السابقة هنا بمجرد إتمام أول وردية."
                             className="py-4"
                           />
                         </td>
                       </tr>
                     ) : history.map(shift => (
                       <tr key={shift._id} className="transition-colors duration-200 hover:bg-primary-500/[0.03] dark:hover:bg-white/[0.03]">
                         <td className="p-4">{new Date(shift.startTime).toLocaleDateString('ar-EG')}</td>
                         <td className="p-4">{shift.user?.name}</td>
                         <td className="p-4">{new Date(shift.startTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</td>
                         <td className="p-4">{shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
                         <td className="p-4 font-bold text-emerald-600">{fmt(shift.totalCashSales)}</td>
                         <td className="p-4">
                           {shift.variance === 0 ? (
                             <Badge variant="success">{t('cash_drawer_page.ui.krr8u24')}</Badge>
                           ) : shift.variance < 0 ? (
                             <Badge variant="danger" className="dir-ltr">عجز {fmt(shift.variance)}</Badge>
                           ) : (
                             <Badge variant="warning" className="dir-ltr">زيادة +{fmt(shift.variance)}</Badge>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </Card>
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Open Modal */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title={t('cash_drawer_page.titles.kvwgy2y')}>
        <div className="space-y-4">
          <Input 
            label={t('cash_drawer_page.form.k30bn47')}
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="text-lg font-bold"
          />
          <Button onClick={handleOpenShift} className="w-full" size="lg">{t('cash_drawer_page.ui.ksh4ide')}</Button>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title={t('cash_drawer_page.titles.krd2e8e')}>
        <div className="space-y-4">
          <div className="app-surface-muted rounded-2xl border border-dashed border-gray-300/80 p-4 text-center dark:border-white/10">
             <p className="text-gray-500 text-sm mb-1">{t('cash_drawer_page.ui.koh94yl')}</p>
             <p className="text-4xl font-black text-gray-800 dark:text-gray-100">{activeShift && fmt(activeShift.expectedNow)}</p>
          </div>
          
          <div className="rounded-2xl border border-yellow-200/80 bg-yellow-50/80 p-4 text-sm text-yellow-800 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-200">
            ⚠️ قم بعد النقود الموجودة في الدرج فعلياً واكتب الرقم أدناه. سيقوم النظام بحساب العجز أو الزيادة تلقائياً.
          </div>

          <Input 
            label={t('cash_drawer_page.form.kprgfjd')}
            type="number"
            value={closingForm.actualCash}
            onChange={(e) => setClosingForm({...closingForm, actualCash: e.target.value})}
            className="text-2xl font-black text-center"
            autoFocus
          />
          
          {closingForm.actualCash > 0 && activeShift && (
             <div className={`animate-pulse-once rounded-2xl p-4 text-center text-lg font-bold ${
                Number(closingForm.actualCash) - activeShift.expectedNow === 0 ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 
                Number(closingForm.actualCash) - activeShift.expectedNow < 0 ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
             }`}>
                {Number(closingForm.actualCash) - activeShift.expectedNow === 0 ? '✅ المبلغ مطابق تماماً' : 
                 Number(closingForm.actualCash) - activeShift.expectedNow < 0 ? `❌ يوجد عجز: ${fmt(Number(closingForm.actualCash) - activeShift.expectedNow)}` : 
                 `ℹ️ يوجد زيادة: +${fmt(Number(closingForm.actualCash) - activeShift.expectedNow)}`}
             </div>
          )}

          <Input 
            label={t('cash_drawer_page.form.ki8iche')}
            value={closingForm.notes}
            onChange={(e) => setClosingForm({...closingForm, notes: e.target.value})}
            placeholder={t('cash_drawer_page.placeholders.kb1stqj')}
          />

          <Button onClick={handleCloseShift} variant="danger" className="w-full" size="lg">{t('cash_drawer_page.ui.kn2vh7r')}</Button>
        </div>
      </Modal>
    </div>
  );
}
