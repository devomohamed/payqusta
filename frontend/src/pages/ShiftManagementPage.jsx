import React, { useEffect, useState } from 'react';
import { Clock, DollarSign, X, PlayCircle, StopCircle, History, TrendingUp, ShoppingBag, Wallet, Banknote } from 'lucide-react';
import { api, useShiftStore } from '../store';
import toast from 'react-hot-toast';
import { EmptyState, LoadingSpinner } from '../components/UI';
import { useTranslation } from 'react-i18next';

const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');

export default function ShiftManagementPage() {
  const { t } = useTranslation('admin');
    const { fetchCurrentShift: syncHeaderWidget } = useShiftStore();
    const [currentShift, setCurrentShift] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Open shift
    const [openingBalance, setOpeningBalance] = useState('');
    const [openLoading, setOpenLoading] = useState(false);

    // Close shift
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [actualCash, setActualCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [closeLoading, setCloseLoading] = useState(false);
    const [denominations, setDenominations] = useState({
        '200': '', '100': '', '50': '', '20': '', '10': '', '5': '', '1': ''
    });

    const totalFromDenominations = Object.entries(denominations).reduce((acc, [bill, count]) => {
        return acc + (parseInt(bill) * (parseInt(count) || 0));
    }, 0);

    useEffect(() => {
        if (totalFromDenominations > 0) {
            setActualCash(totalFromDenominations.toString());
        }
    }, [totalFromDenominations]);


    useEffect(() => { fetchCurrent(); }, []);

    const fetchCurrent = async () => {
        setLoading(true);
        try {
            const res = await api.get('/cash-shifts/current');
            setCurrentShift(res.data.data);
        } catch { setCurrentShift(null); }
        finally { setLoading(false); }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get('/cash-shifts/history');
            setHistory(res.data.data || []);
        } catch { toast.error(t('shift_management_page.toasts.klmcxa')); }
        finally { setHistoryLoading(false); }
    };

    const handleOpen = async () => {
        setOpenLoading(true);
        try {
            const res = await api.post('/cash-shifts/open', { openingBalance: parseFloat(openingBalance) || 0 });
            setCurrentShift(res.data.data);
            setOpeningBalance('');
            toast.success('✅ تم فتح الوردية بنجاح');
            syncHeaderWidget(); // Sync header widget
        } catch (err) { toast.error(err.response?.data?.message || t('shift_management_page.toasts.kd9c8qj')); }
        finally { setOpenLoading(false); }
    };

    const handleClose = async () => {
        setCloseLoading(true);
        try {
            await api.post('/cash-shifts/close', { actualCash: parseFloat(actualCash) || 0, notes: closeNotes });
            setCurrentShift(null);
            setShowCloseModal(false);
            setActualCash(''); setCloseNotes('');
            setDenominations({ '200': '', '100': '', '50': '', '20': '', '10': '', '5': '', '1': '' });
            toast.success('✅ تم إغلاق الوردية بنجاح');
            syncHeaderWidget(); // Sync header widget
            if (showHistory) fetchHistory();
        } catch (err) { toast.error(err.response?.data?.message || t('shift_management_page.toasts.kqfk9cv')); }
        finally { setCloseLoading(false); }
    };

    const shiftDuration = (start) => {
        if (!start) return '-';
        const ms = Date.now() - new Date(start).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}س ${m}د`;
    };

    if (loading) {
        return (
            <div className="h-64">
                <LoadingSpinner size="lg" text="جاري تحميل بيانات الوردية..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 max-w-3xl mx-auto" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-7 h-7 text-primary-600" />
                        {t('shift_management_page.ui.k7967td')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('shift_management_page.ui.kux4quw')}</p>
                </div>
                <button
                    onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                    <History className="w-4 h-4" />
                    {t('shift_management_page.ui.kovdxbi')}
                </button>
            </div>

            {/* Current Shift */}
            {currentShift ? (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-green-400 dark:border-green-600 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-bold text-green-700 dark:text-green-400 text-sm">{t('shift_management_page.ui.ke4t9wv')}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">منذ {shiftDuration(currentShift.startTime)}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                            { icon: Wallet, label: t('shift_management_page.ui.krl4axg'), value: `${fmt(currentShift.openingBalance)} ج.م`, color: 'text-blue-600' },
                            { icon: TrendingUp, label: t('shift_management_page.ui.kni81pf'), value: `${fmt(currentShift.currentSales)} ج.م`, color: 'text-green-600' },
                            { icon: DollarSign, label: t('shift_management_page.ui.klk2k5j'), value: `${fmt(currentShift.expectedNow)} ج.م`, color: 'text-primary-600' },
                            { icon: ShoppingBag, label: t('shift_management_page.ui.kng3pov'), value: currentShift.breakdown?.totalTransactions || 0, color: 'text-orange-600' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                                <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
                                <p className={`font-bold text-sm ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {currentShift.breakdown && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
                            <span>مبيعات نقدية: {fmt(currentShift.breakdown.directSales)} ج.م ({currentShift.breakdown.directCount} فاتورة)</span>
                            <span>تحصيلات: {fmt(currentShift.breakdown.collections)} ج.م ({currentShift.breakdown.collectionsCount})</span>
                        </div>
                    )}

                    <button
                        onClick={() => { setActualCash(''); setCloseNotes(''); setShowCloseModal(true); }}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
                    >
                        <StopCircle className="w-5 h-5" />
                        {t('shift_management_page.ui.krd2e8e')}
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm">
                    <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">{t('shift_management_page.ui.kbcbq0j')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('shift_management_page.ui.kt1wxv7')}</p>
                    <div className="max-w-xs mx-auto space-y-3">
                        <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('shift_management_page.ui.k20lylo')}</label>
                            <input
                                type="number" min="0" value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            onClick={handleOpen} disabled={openLoading}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            {openLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                            {t('shift_management_page.ui.kvwgy2y')}
                        </button>
                    </div>
                </div>
            )}

            {/* History */}
            {showHistory && (
                <div className="space-y-3">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-primary-500" />
                        {t('shift_management_page.ui.kv1wpc9')}
                    </h2>
                    {historyLoading ? (
                        <div className="py-4">
                            <LoadingSpinner size="md" text="جاري تحميل سجل الورديات..." />
                        </div>
                    ) : history.length === 0 ? (
                        <EmptyState
                            icon={History}
                            title={t('shift_management_page.titles.krfd0mf')}
                            description="سيظهر تاريخ الورديات السابقة هنا بمجرد إغلاق أول وردية."
                            className="py-4"
                        />
                    ) : (
                        history.map((shift) => {
                            const variance = shift.variance || 0;
                            return (
                                <div key={shift._id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                {new Date(shift.startTime).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {new Date(shift.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                {shift.endTime ? ` — ${new Date(shift.endTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                            </p>
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{t('shift_management_page.ui.kpbpqd2')}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                            <p className="text-gray-400 mb-0.5">{t('shift_management_page.ui.k3h4h91')}</p>
                                            <p className="font-bold text-green-600">{fmt(shift.totalCashSales)} ج.م</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                            <p className="text-gray-400 mb-0.5">{t('shift_management_page.ui.kznbzt')}</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{fmt(shift.actualCash)} ج.م</p>
                                        </div>
                                        <div className={`rounded-lg p-2 ${variance < 0 ? 'bg-red-50 dark:bg-red-900/20' : variance > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                            <p className="text-gray-400 mb-0.5">{t('shift_management_page.ui.kove7th')}</p>
                                            <p className={`font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {variance > 0 ? '+' : ''}{fmt(variance)} ج.م
                                            </p>
                                        </div>
                                    </div>
                                    {shift.notes && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg px-3 py-1.5">{shift.notes}</p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Close Shift Modal */}
            {showCloseModal && currentShift && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <StopCircle className="w-5 h-5 text-red-500" />
                                {t('shift_management_page.ui.krd2e8e')}
                            </h3>
                            <button onClick={() => setShowCloseModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto" dir="rtl">
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/20 space-y-2 text-sm shadow-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-500 font-bold">{t('shift_management_page.ui.kbu3ryl')}</span><span className="font-extrabold text-blue-700 dark:text-blue-400">{fmt(currentShift.openingBalance)} ج.م</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-500 font-bold">{t('shift_management_page.ui.kj6s0r1')}</span><span className="font-extrabold text-emerald-600 dark:text-emerald-400">+{fmt(currentShift.currentSales)} ج.م</span></div>
                                <div className="border-t border-blue-200 dark:border-blue-700/50 pt-2 flex justify-between items-center font-black text-lg">
                                    <span className="text-gray-700 dark:text-gray-200">{t('shift_management_page.ui.kwh7707')}</span>
                                    <span className="text-primary-600 dark:text-primary-400">{fmt(currentShift.expectedNow)} ج.م</span>
                                </div>
                            </div>

                            {/* Reconciliation Assistant */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black text-gray-500 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                                    <Banknote className="w-3.5 h-3.5" /> مساعد جرد الخزينة (اختياري)
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[200, 100, 50, 20, 10, 5, 1].map(val => (
                                        <div key={val} className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <span className="text-[10px] font-black text-gray-400 w-8 text-center">{val} ج</span>
                                            <input 
                                                type="number" min="0" 
                                                value={denominations[val.toString()]}
                                                onChange={(e) => setDenominations(p => ({ ...p, [val.toString()]: e.target.value }))}
                                                className="w-full bg-transparent border-none p-0 text-center font-bold text-xs focus:ring-0"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                    <div className="col-span-2 mt-1 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-center">
                                        <span className="text-[10px] font-bold text-gray-500">{t('shift_management_page.ui.k4wfeoy')} </span>
                                        <span className="text-sm font-black text-primary-600 dark:text-primary-400">{fmt(totalFromDenominations)} ج.م</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-600 dark:text-gray-400 mb-2 mr-1">{t('shift_management_page.ui.kxoaz3u')}</label>
                                <div className="relative">
                                    <input
                                        type="number" min="0" value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-950 rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white text-center text-2xl font-black focus:outline-none focus:border-red-500 transition-all shadow-inner"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xs pointer-events-none uppercase">EGP</div>
                                </div>
                                {actualCash && (
                                    <div className={`mt-3 p-2.5 rounded-xl border-l-4 text-center transition-all animate-fade-in ${Number(actualCash) - currentShift.expectedNow < 0 ? 'bg-rose-50 border-rose-500 text-rose-700' : Number(actualCash) - currentShift.expectedNow > 0 ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'}`}>
                                        <p className="text-[10px] font-bold opacity-80 mb-0.5">{t('shift_management_page.ui.kuxpie8')}</p>
                                        <p className="font-black text-sm" dir="ltr">
                                            {Number(actualCash) - currentShift.expectedNow > 0 ? '+' : ''}{fmt(Number(actualCash) - currentShift.expectedNow)} ج.م
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1.5 mr-1 uppercase">{t('shift_management_page.ui.kyxy41g')}</label>
                                <textarea rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder={t('shift_management_page.placeholders.kbn7lan')}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-medium" />
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <button onClick={() => setShowCloseModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-white dark:hover:bg-gray-800 transition shadow-sm">{t('shift_management_page.ui.cancel')}</button>
                            <button onClick={handleClose} disabled={closeLoading}
                                className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-[0.98]">
                                {closeLoading ? <LoadingSpinner size="sm" /> : <><StopCircle className="w-5 h-5 fill-current" />{t('shift_management_page.ui.kt5k6ol')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
