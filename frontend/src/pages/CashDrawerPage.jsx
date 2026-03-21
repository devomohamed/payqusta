import React, { useState, useEffect } from 'react';
import { api } from '../store';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, Lock, CheckCircle, AlertTriangle, History, TrendingUp, Wallet } from 'lucide-react';
import { Button, Card, Input, Modal, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import Pagination from '../components/Pagination';
import { useAuthStore } from '../store';

export default function CashDrawerPage() {
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
      toast.error('فشل تحميل بيانات الخزينة');
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
      toast.success('تم فتح الوردية');
      setShowOpenModal(false);
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ');
    }
  };

  const handleCloseShift = async () => {
    try {
      await api.post('/cash-shifts/close', { 
        actualCash: Number(closingForm.actualCash),
        notes: closingForm.notes
      });
      toast.success('تم إغلاق الوردية');
      setShowCloseModal(false);
      setClosingForm({ actualCash: 0, notes: '' });
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(n);

  return (
    <div className="app-shell-bg app-text-soft space-y-8 p-4 sm:p-6 animate-fade-in">
      <div className="app-surface-muted flex items-center justify-between rounded-3xl p-5">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">إدارة الخزينة والورديات</h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'admin' || user?.isSuperAdmin ? 'متابعة نقدية الفروع والموظفين' : 'إدارة ورديتك ومبيعاتك اليومية'}
          </p>
        </div>
      </div>

      {/* Active Shift Area */}
      {loading ? <LoadingSpinner /> : (
        <>
          {!activeShift ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 text-center text-white shadow-xl shadow-slate-950/20 transition-transform duration-300 motion-safe:hover:-translate-y-1">
              <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">لا توجد وردية مفتوحة</h2>
              <p className="text-gray-400 mb-6">يجب فتح وردية جديدة لبدء تسجيل المبيعات النقدية</p>
              <Button size="lg" onClick={() => setShowOpenModal(true)} icon={<DollarSign />}>فتح وردية جديدة</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-700 p-6 text-white shadow-xl shadow-emerald-900/20 transition-transform duration-300 motion-safe:hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-lg font-bold opacity-90">الوردية الحالية</h2>
                      <p className="text-sm opacity-75">{new Date(activeShift.startTime).toLocaleString('ar-EG')}</p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">مفتوحة ✅</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 opacity-80" />
                        <span className="text-sm font-medium opacity-80">الرصيد الافتتاحي</span>
                      </div>
                      <span className="font-bold text-lg">{fmt(activeShift.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 opacity-80" />
                        <span className="text-sm font-medium opacity-80">مبيعات نقدية (مسجلة)</span>
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
                       <span className="text-lg font-bold">المتوقع في الدرج</span>
                       <span className="text-3xl font-black">{fmt(activeShift.expectedNow)}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button 
                      variant="danger" 
                      className="w-full bg-white/10 hover:bg-white/20 border-0 text-white backdrop-blur-sm"
                      onClick={() => setShowCloseModal(true)}
                    >
                      إغلاق الوردية
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="app-surface-muted flex flex-col justify-center items-center text-center space-y-4 p-6">
                <Clock className="w-12 h-12 text-primary-500" />
                <div>
                   <h3 className="text-xl font-bold">زمن الوردية</h3>
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
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5" /> {user?.role === 'admin' ? 'سجل ورديات الموظفين' : 'سجل وردياتي السابق'}</h3>
            <Card className="overflow-hidden rounded-3xl">
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                     <tr>
                       <th className="p-4">التاريخ</th>
                       <th className="p-4">الموظف</th>
                       <th className="p-4">الفتح</th>
                       <th className="p-4">الإغلاق</th>
                       <th className="p-4">المبيعات</th>
                       <th className="p-4">العجز/الزيادة</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100/80 dark:divide-white/5">
                     {history.length === 0 ? (
                       <tr>
                         <td colSpan="6" className="p-4">
                           <EmptyState
                             icon={History}
                             title="لا يوجد سجل سابق"
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
                             <Badge variant="success">مطابق ✅</Badge>
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
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title="فتح وردية جديدة">
        <div className="space-y-4">
          <Input 
            label="الرصيد الافتتاحي (كم يوجد في الدرج الآن؟)"
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="text-lg font-bold"
          />
          <Button onClick={handleOpenShift} className="w-full" size="lg">بدء الوردية</Button>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="إغلاق الوردية">
        <div className="space-y-4">
          <div className="app-surface-muted rounded-2xl border border-dashed border-gray-300/80 p-4 text-center dark:border-white/10">
             <p className="text-gray-500 text-sm mb-1">المبلغ المتوقع في الدرج</p>
             <p className="text-4xl font-black text-gray-800 dark:text-gray-100">{activeShift && fmt(activeShift.expectedNow)}</p>
          </div>
          
          <div className="rounded-2xl border border-yellow-200/80 bg-yellow-50/80 p-4 text-sm text-yellow-800 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-200">
            ⚠️ قم بعد النقود الموجودة في الدرج فعلياً واكتب الرقم أدناه. سيقوم النظام بحساب العجز أو الزيادة تلقائياً.
          </div>

          <Input 
            label="النقدية الفعلية (بعد العد)"
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
            label="ملاحظات (اختياري)"
            value={closingForm.notes}
            onChange={(e) => setClosingForm({...closingForm, notes: e.target.value})}
            placeholder="مثال: تم صرف 50 ريال للصيانة..."
          />

          <Button onClick={handleCloseShift} variant="danger" className="w-full" size="lg">تأكيد الإغلاق وترحيل المبالغ</Button>
        </div>
      </Modal>
    </div>
  );
}
