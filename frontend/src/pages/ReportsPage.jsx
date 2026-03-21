import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Shield, Calendar, Download, RefreshCw, AlertTriangle, Star, Users, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { dashboardApi, api } from '../store';
import { Card, Badge, LoadingSpinner } from '../components/UI';

const TABS = [
  { key: 'profit', label: 'ذكاء الأرباح', icon: TrendingUp },
  { key: 'risk', label: 'تقييم المخاطر', icon: Shield },
  { key: 'collections', label: 'جدول التحصيل', icon: Calendar },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const RISK_LABELS = { high: 'مرتفع 🔴', medium: 'متوسط 🟡', low: 'منخفض 🟢' };
const COLLECTION_STYLES = {
  red: {
    badge: 'bg-red-50 text-red-500 dark:bg-red-500/10',
    amount: 'text-red-500',
  },
  primary: {
    badge: 'bg-primary-50 text-primary-500 dark:bg-primary-500/10',
    amount: 'text-primary-500',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10',
    amount: 'text-amber-500',
  },
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('profit');
  const [profitData, setProfitData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [collectionsData, setCollectionsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTab = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'profit') {
        const res = await dashboardApi.getProfitIntelligence();
        setProfitData(res.data.data);
      } else if (tab === 'risk') {
        const res = await dashboardApi.getRiskScoring();
        setRiskData(res.data.data);
      } else if (tab === 'collections') {
        const res = await dashboardApi.getDailyCollections();
        setCollectionsData(res.data.data);
      }
    } catch { toast.error('خطأ في تحميل التقارير'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return toast.error('لا توجد بيانات للتصدير');
    const headers = Object.keys(data[0]);
    const csv = '\uFEFF' + [headers.join(','), ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير ✅');
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      {/* Header */}
      <div className="app-surface-muted flex flex-wrap items-center gap-3 rounded-3xl p-4 sm:p-5">
        <div className="app-surface flex h-11 w-11 items-center justify-center rounded-2xl text-violet-600 dark:text-violet-300">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">التقارير والتحليلات</h2>
          <p className="text-xs text-gray-400 dark:text-white/60">ذكاء الأعمال وتحليل الأرباح والمخاطر</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="app-surface-muted flex gap-2 rounded-2xl p-1">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab.key
                ? 'app-surface text-primary-600 shadow-sm dark:text-primary-300'
                : 'app-text-soft hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* PROFIT TAB */}
          {activeTab === 'profit' && profitData && (
            <div className="space-y-5">
              {/* Revenue by Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(profitData.revenueByMethod || []).map((m) => (
                  <Card key={m._id} className="app-surface-muted p-5 text-center transition-transform duration-200 motion-safe:hover:-translate-y-0.5">
                    <p className="text-xs text-gray-400 dark:text-white/60 mb-1">{m._id === 'cash' ? '💵 نقد' : m._id === 'installment' ? '📅 أقساط' : '⏳ آجل'}</p>
                    <p className="text-2xl font-black text-primary-500">{fmt(m.total)} <span className="text-sm">ج.م</span></p>
                    <p className="text-[10px] text-gray-400 dark:text-white/50 mt-1">{m.count} فاتورة · محصّل: {fmt(m.collected)}</p>
                  </Card>
                ))}
              </div>

              {/* Profitable Products */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Package className="w-4 h-4 text-primary-500" /> أكثر المنتجات ربحاً</h3>
                  <button onClick={() => exportCSV(profitData.profitableProducts?.map((p) => ({ الاسم: p.name, الفئة: p.category, الإيراد: p.totalRevenue, التكلفة: p.totalCost, الربح: p.profit, الكمية: p.totalSold, 'هامش%': Math.round(p.margin) })), 'profit-products')}
                    className="flex items-center gap-1 text-xs text-primary-500 font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> تصدير CSV
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {(profitData.profitableProducts || []).slice(0, 8).map((p, i) => (
                      <div key={i} className="app-surface-muted flex items-center gap-3 rounded-2xl p-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-white/60'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/50">{p.category} · {p.totalSold} قطعة</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-extrabold text-emerald-500">{fmt(p.profit)} ج.م</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/50">هامش: {Math.round(p.margin)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(profitData.profitableProducts || []).length > 0 && (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={(profitData.profitableProducts || []).slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v.toLocaleString('ar-EG')} ج.م`} contentStyle={{ borderRadius: 12, fontFamily: 'Cairo' }} />
                        <Bar dataKey="profit" fill="#10b981" radius={[0, 8, 8, 0]} name="الربح" />
                        <Bar dataKey="totalRevenue" fill="#6366f1" radius={[0, 8, 8, 0]} name="الإيراد" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Profitable Customers */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary-500" /> أفضل العملاء</h3>
                  <button onClick={() => exportCSV(profitData.profitableCustomers?.map((c) => ({ الاسم: c.name, الهاتف: c.phone, الحالة: c.tier, المشتريات: c.totalSpent, المدفوع: c.totalPaid, الفواتير: c.invoiceCount })), 'top-customers')}
                    className="flex items-center gap-1 text-xs text-primary-500 font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3.5 h-3.5" /> تصدير CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100/80 dark:border-white/10">
                      {['', 'العميل', 'الحالة', 'المشتريات', 'المدفوع', 'الفواتير'].map((h) => <th key={h} className="px-3 py-2 text-right text-xs font-bold text-gray-400">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(profitData.profitableCustomers || []).map((c, i) => (
                        <tr key={i} className="border-b border-gray-100/70 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.03]">
                          <td className="px-3 py-2.5"><span className={`w-6 h-6 inline-flex items-center justify-center rounded-md text-[10px] font-black ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-white/60'}`}>{i + 1}</span></td>
                          <td className="px-3 py-2.5"><p className="font-bold text-gray-900 dark:text-white">{c.name}</p><p className="text-[10px] text-gray-400 dark:text-white/50">{c.phone}</p></td>
                          <td className="px-3 py-2.5">{c.tier === 'vip' ? <Badge variant="warning">⭐ VIP</Badge> : c.tier === 'premium' ? <Badge variant="success">Premium</Badge> : <Badge variant="gray">عادي</Badge>}</td>
                          <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{fmt(c.totalSpent)} ج.م</td>
                          <td className="px-3 py-2.5 font-bold text-emerald-500">{fmt(c.totalPaid)} ج.م</td>
                          <td className="px-3 py-2.5 text-center text-gray-900 dark:text-white">{c.invoiceCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* RISK TAB */}
          {activeTab === 'risk' && riskData && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="app-surface-muted p-4 text-center border-2 border-red-100 dark:border-red-500/20">
                  <p className="text-[10px] text-gray-400 dark:text-white/60 mb-1">مخاطر مرتفعة</p>
                  <p className="text-3xl font-black text-red-500">{riskData.summary?.high || 0}</p>
                </Card>
                <Card className="app-surface-muted p-4 text-center border-2 border-amber-100 dark:border-amber-500/20">
                  <p className="text-[10px] text-gray-400 dark:text-white/60 mb-1">مخاطر متوسطة</p>
                  <p className="text-3xl font-black text-amber-500">{riskData.summary?.medium || 0}</p>
                </Card>
                <Card className="app-surface-muted p-4 text-center border-2 border-emerald-100 dark:border-emerald-500/20">
                  <p className="text-[10px] text-gray-400 dark:text-white/60 mb-1">مخاطر منخفضة</p>
                  <p className="text-3xl font-black text-emerald-500">{riskData.summary?.low || 0}</p>
                </Card>
                <Card className="app-surface-muted p-4 text-center">
                  <p className="text-[10px] text-gray-400 dark:text-white/60 mb-1">إجمالي المستحقات</p>
                  <p className="text-xl font-black text-primary-500">{fmt(riskData.summary?.totalOutstanding)}<span className="text-xs mr-1 text-gray-400 dark:text-white/40">ج.م</span></p>
                </Card>
              </div>

              {/* Risk Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="app-surface-muted p-5 col-span-1">
                  <h4 className="font-bold text-sm mb-3">توزيع المخاطر</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[
                        { name: 'مرتفع', value: riskData.summary?.high || 0 },
                        { name: 'متوسط', value: riskData.summary?.medium || 0 },
                        { name: 'منخفض', value: riskData.summary?.low || 0 },
                      ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={5}>
                        <Cell fill="#ef4444" /><Cell fill="#f59e0b" /><Cell fill="#10b981" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, fontFamily: 'Cairo' }} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-5 col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm">تقييم العملاء</h4>
                    <button onClick={() => exportCSV(riskData.customers?.map((c) => ({ الاسم: c.name, الهاتف: c.phone, 'درجة المخاطر': c.riskScore, المستوى: RISK_LABELS[c.riskLevel], المستحق: c.outstandingBalance, 'نسبة السداد%': c.paymentRatio, 'فواتير متأخرة': c.overdueInvoices })), 'risk-report')}
                      className="flex items-center gap-1 text-xs text-primary-500 font-semibold hover:bg-primary-50 dark:hover:bg-primary-500/10 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> تصدير
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {(riskData.customers || []).map((c) => (
                      <div key={c._id} className={`app-surface-muted flex items-center gap-3 rounded-2xl p-3 border-2 transition-colors ${
                        c.riskLevel === 'high' ? 'border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5'
                          : c.riskLevel === 'medium' ? 'border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5'
                          : 'border-gray-100 dark:border-gray-800'
                      }`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style={{ background: `${RISK_COLORS[c.riskLevel]}20`, color: RISK_COLORS[c.riskLevel] }}>
                          {c.riskScore}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/50">{c.phone} · سداد: {c.paymentRatio}% · {c.overdueInvoices} متأخر</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold" style={{ color: RISK_COLORS[c.riskLevel] }}>{fmt(c.outstandingBalance)} ج.م</p>
                          <Badge variant={c.riskLevel === 'high' ? 'danger' : c.riskLevel === 'medium' ? 'warning' : 'success'}>
                            {RISK_LABELS[c.riskLevel]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* COLLECTIONS TAB */}
          {activeTab === 'collections' && collectionsData && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="app-surface-muted p-4 border-2 border-red-100 dark:border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-400 dark:text-white/60">متأخرة</p><p className="text-2xl font-black text-red-500">{fmt(collectionsData.overdue?.total)}<span className="text-xs mr-1 text-gray-400 dark:text-white/40">ج.م</span></p></div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-white/50 mt-1">{collectionsData.overdue?.items?.length || 0} قسط</p>
                </Card>
                <Card className="app-surface-muted p-4 border-2 border-primary-100 dark:border-primary-500/20">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-400 dark:text-white/60">مستحقة اليوم</p><p className="text-2xl font-black text-primary-500">{fmt(collectionsData.today?.total)}<span className="text-xs mr-1 text-gray-400 dark:text-white/40">ج.م</span></p></div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary-500" /></div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-white/50 mt-1">{collectionsData.today?.items?.length || 0} قسط</p>
                </Card>
                <Card className="app-surface-muted p-4 border-2 border-amber-100 dark:border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-400 dark:text-white/60">هذا الأسبوع</p><p className="text-2xl font-black text-amber-500">{fmt(collectionsData.week?.total)}<span className="text-xs mr-1 text-gray-400 dark:text-white/40">ج.م</span></p></div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-500" /></div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-white/50 mt-1">{collectionsData.week?.items?.length || 0} قسط</p>
                </Card>
              </div>

              {/* Collection Lists */}
              {[
                { key: 'overdue', title: '🔴 أقساط متأخرة', items: collectionsData.overdue?.items, color: 'red' },
                { key: 'today', title: '🔵 مستحقة اليوم', items: collectionsData.today?.items, color: 'primary' },
                { key: 'week', title: '🟡 خلال الأسبوع', items: collectionsData.week?.items, color: 'amber' },
              ].map((section) => (
                <Card key={section.key} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm">{section.title} ({section.items?.length || 0})</h4>
                    {(section.items?.length || 0) > 0 && (
                      <button onClick={() => exportCSV(section.items.map((i) => ({ العميل: i.customer?.name, الهاتف: i.customer?.phone, الفاتورة: i.invoiceNumber, المبلغ: i.amount, المتبقي: i.remaining, تاريخ_الاستحقاق: new Date(i.dueDate).toLocaleDateString('ar-EG') })), `collections-${section.key}`)}
                        className="flex items-center gap-1 text-xs text-primary-500 font-semibold"><Download className="w-3 h-3" /> CSV</button>
                    )}
                  </div>
                  {(section.items?.length || 0) === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">لا توجد أقساط</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="app-surface-muted flex items-center gap-3 rounded-2xl p-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${COLLECTION_STYLES[section.color]?.badge || COLLECTION_STYLES.primary.badge}`}>{item.installmentNumber || '#'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{item.customer?.name || '—'}</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/50">{item.invoiceNumber} · {new Date(item.dueDate).toLocaleDateString('ar-EG')}</p>
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-extrabold ${COLLECTION_STYLES[section.color]?.amount || COLLECTION_STYLES.primary.amount}`}>{fmt(item.remaining)} ج.م</p>
                            {item.paidAmount > 0 && <p className="text-[10px] text-emerald-500">دفع: {fmt(item.paidAmount)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
