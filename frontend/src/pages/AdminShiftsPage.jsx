import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Store, Calendar, CheckCircle2, AlertCircle, Filter, Search, History, DollarSign, Wallet, TrendingUp, X, Activity } from 'lucide-react';
import { api, useAuthStore } from '../store';
import { Card, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ShiftDetailsModal = ({ shift, onClose }) => {
  if (!shift) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in text-right font-cairo" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${shift.status === 'open' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-700'}`}>
               {shift.status === 'open' ? <Activity className="w-6 h-6 animate-pulse" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">تفاصيل سجل الوردية</h3>
              <p className="text-xs text-gray-500 font-medium">بواسطة: {shift.user?.name || 'مستخدم غير معروف'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col gap-1">
                 <span className="text-xs text-gray-500 font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> وقت الفتح</span>
                 <strong className="text-sm">{format(new Date(shift.startTime), 'PPp', { locale: ar })}</strong>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col gap-1">
                 <span className="text-xs text-gray-500 font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> وقت الإغلاق</span>
                 <strong className="text-sm">
                    {shift.endTime ? (
                      <div className="flex items-center gap-2">
                        {format(new Date(shift.endTime), 'PPp', { locale: ar })}
                        {shift.closedBySystem && <Badge variant="danger" className="text-[10px]">إغلاق تلقائي</Badge>}
                      </div>
                    ) : <span className="text-emerald-500">لا تزال مفتوحة</span>}
                 </strong>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                 <h4 className="font-bold text-gray-900 dark:text-gray-100">الملخص المالي</h4>
                 <div className="bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-900/30">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{shift.branch?.name || shift.user?.branch?.name || 'الفرع الرئيسي'}</span>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="flex justify-between p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 transition-colors hover:bg-blue-50">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">الرصيد الافتتاحي</span>
                    <span className="font-black text-blue-800 dark:text-blue-400">{fmt(shift.openingBalance)} ج.م</span>
                 </div>
                 <div className="flex justify-between p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 transition-colors hover:bg-emerald-50">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">إجمالي المبيعات</span>
                    <span className="font-black text-emerald-800 dark:text-emerald-400">+{fmt(shift.totalCashSales)} ج.م</span>
                 </div>
                 <div className="flex justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20 col-span-2 shadow-sm">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-400">المتوقع في الخزينة</span>
                    <span className="font-black text-purple-800 dark:text-purple-400 text-xl">{fmt(shift.expectedCash || (shift.totalCashSales + shift.openingBalance))} ج.م</span>
                 </div>
              </div>

              {shift.status === 'closed' && (
                 <>
                   <h4 className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2 mt-6">التسوية عند الإغلاق</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                         <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">النقدية الفعلية بالمطابقة</span>
                         <span className="font-black text-gray-900 dark:text-white">{fmt(shift.actualCash)} ج.م</span>
                      </div>
                      <div className={`flex justify-between p-3 rounded-xl border ${shift.variance < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : shift.variance > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                         <span className="text-xs font-semibold flex items-center gap-1">
                            {shift.variance < 0 ? <AlertCircle className="w-3.5 h-3.5" /> : shift.variance === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            العجز / الزيادة
                         </span>
                         <span className="font-black" dir="ltr">{shift.variance > 0 ? '+' : ''}{fmt(shift.variance)} ج.م</span>
                      </div>
                   </div>
                   {shift.notes && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                         <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <History className="w-3 h-3 text-primary-500" />
                           ملاحظات الإغلاق
                         </h5>
                         <p className="text-sm text-gray-800 dark:text-gray-300 leading-relaxed italic">"{shift.notes}"</p>
                      </div>
                   )}
                 </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminShiftsPage() {
  const { t } = useTranslation('admin');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(''); // '' = all, 'open', 'closed'
  const [branchFilter, setBranchFilter] = useState(''); // '' = all
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'analytics'
  const [analytics, setAnalytics] = useState([]);
  
  const [selectedShift, setSelectedShift] = useState(null);
  const [forceCloseModal, setForceCloseModal] = useState(null); // stores shift object
  const [fcData, setFcData] = useState({ actualCash: 0, notes: '' });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchShifts();
    } else {
      fetchAnalytics();
    }
  }, [statusFilter, branchFilter, startDate, endDate, activeTab]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data.data.branches || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (statusFilter) params.append('status', statusFilter);
      if (branchFilter) params.append('branch', branchFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/cash-shifts/history?${params.toString()}`);
      setShifts(res.data.data.shifts || res.data.data || []);
    } catch (err) {
      toast.error('حدث خطأ أثناء جلب بيانات الورديات');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append('branch', branchFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/cash-shifts/analytics?${params.toString()}`);
      setAnalytics(res.data.data || []);
    } catch (err) {
      toast.error('حدث خطأ أثناء جلب التحليلات');
    } finally {
      setLoading(false);
    }
  };

  const handleForceClose = async () => {
    if (!forceCloseModal) return;
    try {
      await api.post(`/cash-shifts/force-close/${forceCloseModal._id}`, fcData);
      toast.success('تم إغلاق الوردية إدارياً');
      setForceCloseModal(null);
      fetchShifts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل إغلاق الوردية');
    }
  };

  const shiftDuration = (start, end) => {
    if (!start) return '-';
    const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    if (ms < 0) return '-';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}س ${m}د`;
  };

  // Stats derivation
  const openCount = shifts.filter(s => s.status === 'open').length;
  const closedCount = shifts.filter(s => s.status === 'closed').length;
  const totalVariance = shifts.reduce((acc, s) => acc + (s.variance || 0), 0);
  const totalSales = shifts.reduce((acc, s) => acc + (s.totalCashSales || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-cairo animate-fade-in" dir="rtl">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-gradient-to-br from-slate-950 via-primary-800 to-violet-700 px-5 py-6 text-white shadow-[0_30px_80px_-46px_rgba(79,70,229,0.85)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black">
              <History className="h-3.5 w-3.5" />
              Shift Monitoring Center
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">لوحة مراقبة الورديات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">مراقبة وتقييم جميع ورديات الفروع والنقدية بشكل لحظي من واجهة أوضح على الهاتف والتابلت.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">الورديات المفتوحة</p>
              <p className="mt-2 text-2xl font-black">{openCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">الورديات المغلقة</p>
              <p className="mt-2 text-2xl font-black">{closedCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">إجمالي المبيعات</p>
              <p className="mt-2 text-lg font-black">{fmt(totalSales)} ج.م</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/65">العجز / الزيادة</p>
              <p className="mt-2 text-lg font-black">{totalVariance > 0 ? '+' : ''}{fmt(totalVariance)} ج.م</p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="p-5 border-l-4 border-l-primary-500 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 rounded-xl"><Store className="w-6 h-6" /></div>
               <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">الورديات المفتوحة (الآن)</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{openCount}</h3>
               </div>
            </div>
         </Card>
         <Card className="p-5 border-l-4 border-l-gray-400 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
               <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">الورديات المغلقة (المعروضة)</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{closedCount}</h3>
               </div>
            </div>
         </Card>
         <Card className="p-5 border-l-4 border-l-green-500 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
               <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">إجمالي المبيعات المؤكدة</p>
                  <h3 className="text-xl font-black text-green-600 dark:text-green-400">{fmt(totalSales)} <span className="text-xs text-gray-500 font-normal">ج.م</span></h3>
               </div>
            </div>
         </Card>
         <Card className={`p-5 border-l-4 bg-white dark:bg-gray-900 ${totalVariance < 0 ? 'border-l-red-500' : 'border-l-amber-500'}`}>
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl ${totalVariance < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><AlertCircle className="w-6 h-6" /></div>
               <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">إجمالي العجز / الزيادة</p>
                  <h3 className={`text-xl font-black ${totalVariance < 0 ? 'text-red-600' : totalVariance > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`} dir="ltr">{totalVariance > 0 ? '+' : ''}{fmt(totalVariance)} <span className="text-xs text-gray-500 font-normal" dir="rtl">ج.م</span></h3>
               </div>
            </div>
         </Card>
      </div>
      {/* Active Shifts Monitor */}
      {shifts.filter(s => s.status === 'open').length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">الورديات النشطة بالفروع</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shifts.filter(s => s.status === 'open').map(shift => (
              <Card key={shift._id} className="p-4 border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden" onClick={() => setSelectedShift(shift)}>
                {/* Background Decor */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                         <Store className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-black text-gray-900 dark:text-white line-clamp-1">{shift.branch?.name || shift.user?.branch?.name || 'الفرع الرئيسي'}</h4>
                         <p className="text-[10px] text-gray-400 font-bold">{shift.user?.name}</p>
                      </div>
                   </div>
                   <Badge className="bg-emerald-500 text-white border-none animate-pulse-subtle text-[9px] px-2 py-0.5">نشط</Badge>
                </div>

                <div className="space-y-2 relative z-10">
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">منذ:</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{shiftDuration(shift.startTime)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">المبيعات الحالية:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">+{fmt(shift.totalCashSales)} <small className="text-[10px]">ج.م</small></span>
                   </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center gap-2">
                       <span className="text-xs font-bold text-gray-400">السيولة المستهدفة:</span>
                       <div className="flex items-center gap-2">
                          <span className="font-bold text-primary-600 dark:text-primary-400 font-mono text-sm">{fmt(shift.openingBalance + shift.totalCashSales)}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setForceCloseModal(shift); }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"
                            title="إغلاق إداري"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Filters & Content */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
                 <button onClick={() => setStatusFilter('')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${statusFilter === '' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>الكل</button>
                 <button onClick={() => setStatusFilter('open')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${statusFilter === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'}`}>النشطة</button>
                 <button onClick={() => setStatusFilter('closed')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${statusFilter === 'closed' ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>المغلقة</button>
              </div>

               <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
               >
                  <option value="">جميع الفروع</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
               </select>

               <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1 shadow-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold p-1 text-gray-700 dark:text-gray-300" />
                  <span className="text-gray-300">|</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold p-1 text-gray-700 dark:text-gray-300" />
               </div>
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shadow-inner">
               <button onClick={() => setActiveTab('history')} className={`px-5 py-1.5 rounded-lg text-sm font-extrabold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500'}`}>السجل التفصيلي</button>
               <button onClick={() => setActiveTab('analytics')} className={`px-5 py-1.5 rounded-lg text-sm font-extrabold transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500'}`}>التحليل اليومي</button>
            </div>
           {loading && <LoadingSpinner size="sm" />}
        </div>

        {/* Tables */}
        <div className="min-h-[400px]">
           {activeTab === 'history' ? (
              <>
              <div className="space-y-3 p-4 md:hidden">
                {shifts.length === 0 && !loading ? (
                  <EmptyState title="لا توجد بيانات" description="لم يتم العثور على ورديات تطابق بحثك" />
                ) : (
                  shifts.map((shift) => (
                    <div key={shift._id} className="app-surface-muted rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{shift.branch?.name || shift.user?.branch?.name || 'الفرع الرئيسي'}</p>
                          <p className="mt-1 text-[11px] text-gray-400">{shift.user?.name}</p>
                        </div>
                        {shift.status === 'open' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">نشطة الآن</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800">مغلقة</Badge>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                          <p className="text-[10px] text-gray-400">المدة</p>
                          <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{shiftDuration(shift.startTime, shift.endTime)}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                          <p className="text-[10px] text-gray-400">المبيعات</p>
                          <p className="mt-1 text-xs font-black text-emerald-600">{fmt(shift.totalCashSales)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">{format(new Date(shift.startTime), 'Pp', { locale: ar })}</p>
                      <p className={`mt-2 text-xs font-black ${shift.status === 'closed' ? (shift.variance < 0 ? 'text-red-500' : shift.variance > 0 ? 'text-amber-500' : 'text-gray-400') : 'text-gray-400'}`} dir="ltr">
                        {shift.status === 'closed' ? `${shift.variance > 0 ? '+' : ''}${fmt(shift.variance)} ج.م` : '-'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedShift(shift)}
                          className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-primary-50 hover:text-primary-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-primary-900/30 dark:hover:text-primary-400"
                        >
                          التفاصيل
                        </button>
                        {shift.status === 'open' && (
                          <button
                            onClick={() => setForceCloseModal(shift)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                          >
                            إغلاق إداري
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm text-right">
                 {/* ... existing table headers ... */}
                 <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                    <tr>
                       <th className="px-6 py-4">الحالة</th>
                       <th className="px-6 py-4">الفرع / الكاشير</th>
                       <th className="px-6 py-4">المدة</th>
                       <th className="px-6 py-4">المبيعات</th>
                       <th className="px-6 py-4">العجز / الزيادة</th>
                       <th className="px-6 py-4 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {shifts.length === 0 && !loading && (
                       <tr>
                          <td colSpan="6">
                             <EmptyState title="لا توجد بيانات" description="لم يتم العثور على ورديات تطابق بحثك" />
                          </td>
                       </tr>
                    )}
                    {shifts.map(shift => (
                       <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4">
                              {shift.status === 'open' ? (
                                 <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center gap-1.5 w-fit font-bold border-emerald-200 dark:border-emerald-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    نشطة الآن
                                 </Badge>
                              ) : (
                                 <div className="flex flex-col gap-1">
                                   <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 flex items-center justify-center w-fit font-bold">
                                      مغلقة
                                   </Badge>
                                   {shift.closedBySystem && (
                                     <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-full w-fit">إغلاق تلقائي</span>
                                   )}
                                 </div>
                              )}
                           </td>
                          <td className="px-6 py-4">
                             <div className="text-sm font-bold text-gray-900 dark:text-white">{shift.branch?.name || shift.user?.branch?.name || 'الفرع الرئيسي'}</div>
                             <p className="text-xs text-gray-500 mt-0.5 max-w-[150px] truncate" title={shift.user?.name}>{shift.user?.name}</p>
                          </td>
                          <td className="px-6 py-4">
                             <p className="font-bold text-gray-800 dark:text-gray-200">{shiftDuration(shift.startTime, shift.endTime)}</p>
                             <p className="text-[10px] text-gray-500 mt-1 font-mono">{format(new Date(shift.startTime), 'Pp', { locale: ar })}</p>
                          </td>
                          <td className="px-6 py-4 font-black text-gray-900 dark:text-white">
                             {fmt(shift.totalCashSales)} <span className="text-[10px] text-gray-400 font-normal">ج.م</span>
                          </td>
                          <td className="px-6 py-4">
                             {shift.status === 'closed' ? (
                                <span className={`font-black tracking-wide ${shift.variance < 0 ? 'text-red-500' : shift.variance > 0 ? 'text-amber-500' : 'text-gray-400'}`} dir="ltr">
                                   {shift.variance > 0 ? '+' : ''}{fmt(shift.variance)} <span className="font-normal text-xs" dir="rtl">ج.م</span>
                                </span>
                             ) : (
                                <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>
                             )}
                          </td>
                          <td className="px-6 py-4 flex justify-center gap-2">
                             <button
                                onClick={() => setSelectedShift(shift)}
                                className="px-4 py-2 bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-600 dark:bg-gray-800 dark:hover:bg-primary-900/30 dark:text-gray-300 dark:hover:text-primary-400 font-bold rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs"
                             >
                                التفاصيل
                             </button>
                             {shift.status === 'open' && (
                               <button
                                  onClick={() => setForceCloseModal(shift)}
                                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 font-bold rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs"
                               >
                                  إغلاق إداري
                               </button>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              </div>
              </>
           ) : (
             <>
             <div className="space-y-3 p-4 md:hidden">
               {analytics.length === 0 && !loading ? (
                 <EmptyState title="لا توجد بيانات" description="لا توجد تحليلات متاحة لهذه الفترة" />
               ) : (
                 analytics.map((day, idx) => (
                   <div key={idx} className="app-surface-muted rounded-2xl p-4">
                     <p className="text-sm font-black text-gray-900 dark:text-white">{format(new Date(day.day), 'EEEE, d MMMM yyyy', { locale: ar })}</p>
                     <p className="mt-1 text-[11px] text-gray-400">{day.branchName || 'الفرع الرئيسي'}</p>
                     <div className="mt-3 grid grid-cols-2 gap-2">
                       <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                         <p className="text-[10px] text-gray-400">الورديات</p>
                         <p className="mt-1 text-xs font-black text-gray-900 dark:text-white">{day.shiftCount}</p>
                       </div>
                       <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-gray-900/70">
                         <p className="text-[10px] text-gray-400">المبيعات</p>
                         <p className="mt-1 text-xs font-black text-emerald-600">{fmt(day.totalSales)}</p>
                       </div>
                     </div>
                     <div className="mt-3 flex items-center justify-between text-xs">
                       <span className={`${day.totalVariance < 0 ? 'text-red-500' : day.totalVariance > 0 ? 'text-amber-500' : 'text-gray-400'} font-black`} dir="ltr">
                         {day.totalVariance > 0 ? '+' : ''}{fmt(day.totalVariance)} ج.م
                       </span>
                       <span className="font-black text-blue-600 dark:text-blue-400">{fmt(day.totalActual)} ج.م</span>
                     </div>
                   </div>
                 ))
               )}
             </div>
             <div className="hidden overflow-x-auto md:block">
             <table className="w-full text-sm text-right">
                <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                   <tr>
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4">الفرع</th>
                      <th className="px-6 py-4">عدد الورديات</th>
                      <th className="px-6 py-4">إجمالي المبيعات</th>
                      <th className="px-6 py-4">إجمالي العجز / الزيادة</th>
                      <th className="px-6 py-4">رصيد الخزينة</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                   {analytics.length === 0 && !loading && (
                      <tr>
                         <td colSpan="6">
                            <EmptyState title="لا توجد بيانات" description="لا توجد تحليلات متاحة لهذه الفترة" />
                         </td>
                      </tr>
                   )}
                   {analytics.map((day, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                         <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">
                            {format(new Date(day.day), 'EEEE, d MMMM yyyy', { locale: ar })}
                         </td>
                         <td className="px-6 py-4">
                            <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border-primary-100">
                               {day.branchName || 'الفرع الرئيسي'}
                            </Badge>
                         </td>
                         <td className="px-6 py-4 font-bold">{day.shiftCount} وردية</td>
                         <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">
                            {fmt(day.totalSales)} ج.م
                         </td>
                         <td className="px-6 py-4">
                            <span className={`font-black ${day.totalVariance < 0 ? 'text-red-500' : day.totalVariance > 0 ? 'text-amber-500' : 'text-gray-400'}`} dir="ltr">
                               {day.totalVariance > 0 ? '+' : ''}{fmt(day.totalVariance)} ج.م
                            </span>
                         </td>
                         <td className="px-6 py-4 font-extrabold text-blue-600 dark:text-blue-400">
                            {fmt(day.totalActual)} ج.م
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             </div>
             </>
           )}
        </div>
      </div>

      <ShiftDetailsModal shift={selectedShift} onClose={() => setSelectedShift(null)} />

      {/* Force Close Modal */}
      {forceCloseModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-fade-in" dir="rtl">
           <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 text-red-600">
                 <AlertCircle className="w-8 h-8" />
                 <h3 className="text-xl font-black">إغلاق إداري للوردية</h3>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20 text-sm text-red-700 dark:text-red-400">
                 سيتم إنهاء الوردية فوراً وحساب الفوارق المالية بناءً على المبلغ المدخل. هذه العملية لا يمكن التراجع عنها.
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">المبلغ الفعلي الموجود بالخزينة</label>
                    <div className="relative">
                       <input 
                          type="number" 
                          value={fcData.actualCash}
                          onChange={e => setFcData({ ...fcData, actualCash: Number(e.target.value) })}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-red-500 outline-none pr-12" 
                          placeholder="0.00"
                       />
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 mr-1">ملاحظات الإغلاق الإداري</label>
                    <textarea 
                       value={fcData.notes}
                       onChange={e => setFcData({ ...fcData, notes: e.target.value })}
                       className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none h-24" 
                       placeholder="مثلاً: الكاشير نسي إغلاق الوردية قبل المغادرة..."
                    />
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={handleForceClose} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl shadow-lg transition-all shadow-red-500/20">تأكيد الإغلاق</button>
                 <button onClick={() => setForceCloseModal(null)} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-bold rounded-2xl transition-all">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
