import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import {
  FileText, Calendar, Download, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, TrendingDown, Wallet, CreditCard, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalStatement() {
  const { fetchStatement, downloadStatementPDF, customer } = usePortalStore();
  const { t, i18n } = useTranslation('portal');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeRange, setActiveRange] = useState(30);
  const [expandedEntry, setExpandedEntry] = useState(null);

  const QUICK_RANGES = [
    { label: t('statement.ranges.week'), days: 7 },
    { label: t('statement.ranges.month'), days: 30 },
    { label: t('statement.ranges.3months'), days: 90 },
    { label: t('statement.ranges.6months'), days: 180 },
    { label: t('statement.ranges.year'), days: 365 },
  ];

  useEffect(() => {
    // Default to last 30 days
    applyQuickRange(30);
  }, []);

  const applyQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const s = start.toISOString().split('T')[0];
    const e = end.toISOString().split('T')[0];
    setStartDate(s);
    setEndDate(e);
    setActiveRange(days);
    loadStatement(s, e);
  };

  const loadStatement = async (s = startDate, e = endDate) => {
    setLoading(true);
    const res = await fetchStatement(s, e);
    if (res) setData(res);
    setLoading(false);
  };

  const handleFilter = (ev) => {
    ev.preventDefault();
    setActiveRange(null);
    loadStatement();
  };

  const handleDownload = async () => {
    setDownloading(true);
    const res = await downloadStatementPDF(startDate, endDate);
    if (!res.success) notify.error(t('statement.download_fail'));
    else notify.success(t('statement.downloading'));
    setDownloading(false);
  };

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const currency = i18n.language === 'ar' ? t('portal_statement.ui.kwlxf') : 'EGP';

  const balance = data?.summary?.currentBalance || 0;
  const balanceLabel = balance > 0 ? t('statement.balance_owed') : balance < 0 ? t('statement.balance_credit') : t('statement.balance_clear');
  const balanceColor = balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const balanceBg = balance > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600';

  return (
    <div className="space-y-4 pb-24 font-['Cairo'] app-text-soft" dir={i18n.dir()}>

      {/* ══ PAGE HEADER ══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            {t('statement.title')}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('statement.subtitle')}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !data}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition disabled:opacity-60 shadow-md shadow-primary-500/20"
        >
          {downloading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Download className="w-4 h-4" />}
          {t('statement.download_pdf')}
        </button>
      </div>

      {/* ══ DATE RANGE ══ */}
      <div className="app-surface rounded-2xl border border-gray-100/80 p-4 shadow-sm space-y-3 dark:border-white/10">
        {/* Quick chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => applyQuickRange(r.days)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeRange === r.days
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'app-surface-muted text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <form onSubmit={handleFilter} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[11px] text-gray-400 mb-1">{t('statement.from_date')}</label>
            <input
              type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveRange(null); }}
              className="app-surface w-full rounded-xl border border-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-gray-400 mb-1">{t('statement.to_date')}</label>
            <input
              type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveRange(null); }}
              className="app-surface w-full rounded-xl border border-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ══ LOADING ══ */}
      {loading ? (
        <PortalSkeleton count={3} type="card" className="mt-4" />
      ) : !data ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('statement.load_fail')}</p>
          <button onClick={() => loadStatement()} className="mt-3 text-sm text-primary-600 underline">{t('statement.retry')}</button>
        </div>
      ) : (
        <>
          {/* ══ BALANCE HERO CARD ══ */}
          <div className={`bg-gradient-to-br ${balanceBg} rounded-3xl p-6 text-white shadow-xl`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm font-medium">{customer?.name}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {startDate ? `${startDate} → ${endDate}` : t('statement.all_transactions')}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${balance > 0 ? 'bg-red-400/30' : 'bg-green-400/30'}`}>
                {balanceLabel}
              </div>
            </div>
            <p className="text-4xl font-black tracking-tight">
              {Math.abs(balance).toLocaleString()}
              <span className="text-lg font-bold mr-2 text-white/70">{currency}</span>
            </p>
          </div>

          {/* ══ SUMMARY CARDS ══ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="app-surface rounded-2xl border border-gray-100/80 p-3 text-center shadow-sm dark:border-white/10">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">{t('statement.purchases')}</p>
              <p className="text-base font-black text-blue-600 dark:text-blue-400">
                {data.summary?.totalPurchases?.toLocaleString() || 0}
              </p>
              <p className="text-[9px] text-gray-400">{currency}</p>
            </div>
            <div className="app-surface rounded-2xl border border-gray-100/80 p-3 text-center shadow-sm dark:border-white/10">
              <div className="w-9 h-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">{t('statement.payments')}</p>
              <p className="text-base font-black text-green-600 dark:text-green-400">
                {data.summary?.totalPayments?.toLocaleString() || 0}
              </p>
              <p className="text-[9px] text-gray-400">{currency}</p>
            </div>
            <div className="app-surface rounded-2xl border border-gray-100/80 p-3 text-center shadow-sm dark:border-white/10">
              <div className="w-9 h-9 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">{t('statement.transactions')}</p>
              <p className="text-base font-black text-gray-900 dark:text-white">
                {data.entries?.length || 0}
              </p>
              <p className="text-[9px] text-gray-400">{t('statement.transaction_unit')}</p>
            </div>
          </div>

          {/* ══ LEDGER ══ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                {t('statement.ledger_title', { count: data.entries?.length || 0 })}
              </h3>
            </div>

            {(!data.entries || data.entries.length === 0) ? (
              <PortalEmptyState
                icon={FileText}
                title={t('statement.empty_title')}
                message={t('statement.empty_message')}
                className="my-4 border-none app-surface-muted"
              />
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry, idx) => {
                  const isPayment = entry.type === 'payment';
                  const isExpanded = expandedEntry === idx;
                  return (
                    <div
                      key={idx}
                      className="app-surface overflow-hidden rounded-2xl border border-gray-100/80 transition-all dark:border-white/10"
                    >
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : idx)}
                        className="w-full flex items-center gap-3 p-3.5 text-right transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPayment
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {isPayment ? (
                            <ArrowDownCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {entry.description}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(entry.date).toLocaleDateString(locale, {
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Amount + Balance */}
                        <div className="text-left flex-shrink-0">
                          <p className={`font-black text-base ${isPayment ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPayment ? '−' : '+'}{entry.amount?.toLocaleString()} {currency}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {t('statement.balance_label', { amount: entry.runningBalance?.toLocaleString() })}
                          </p>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {/* Expandable details */}
                      {isExpanded && (
                        <div className="app-surface-muted animate-fade-in border-t border-gray-100/80 px-4 pb-4 pt-1 dark:border-white/10">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-gray-400">{t('statement.entry_type')}</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {isPayment ? t('statement.entry_payment') : t('statement.entry_purchase')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">{t('statement.entry_date')}</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {new Date(entry.date).toLocaleDateString(locale)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">{t('statement.amount')}</p>
                              <p className={`text-sm font-black ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                                {entry.amount?.toLocaleString()} {currency}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">{t('statement.balance_after')}</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {entry.runningBalance?.toLocaleString()} {currency}
                              </p>
                            </div>
                          </div>
                          {entry.reference && (
                            <div className="app-surface mt-3 rounded-xl p-2">
                              <p className="text-[10px] text-gray-400">{t('statement.reference')}</p>
                              <p className="text-xs font-bold text-primary-600 font-mono">{entry.reference}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ FOOTER SUMMARY ══ */}
          {data.entries?.length > 0 && (
            <div className="app-surface-muted rounded-2xl p-4 text-center text-sm text-gray-600 dark:text-gray-400">
              {t('statement.footer_from')}
              <span className="font-bold text-gray-900 dark:text-white mx-1">{startDate || '—'}</span>
              {t('statement.footer_to')}
              <span className="font-bold text-gray-900 dark:text-white mx-1">{endDate || '—'}</span>
              {t('statement.footer_by')} <span className="font-bold text-primary-600">PayQusta</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
