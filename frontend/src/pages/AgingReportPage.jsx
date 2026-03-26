import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Users, TrendingUp, AlertTriangle, Clock, DollarSign,
  Download, Filter, ChevronDown, ChevronUp, Printer, FileSpreadsheet,
  Phone, Eye, RefreshCw, PieChart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../store';
import { Card, Button, Badge, EmptyState, Input, LoadingSpinner } from '../components/UI';
import Pagination from '../components/Pagination';

function getAgingBuckets(t) {
  return [
    { key: 'current', label: t('aging_report_page.ui.kabct7n'), range: '0-30', days: [0, 30], color: 'emerald' },
    { key: 'days31_60', label: '31-60 يوم', range: '31-60', days: [31, 60], color: 'amber' },
    { key: 'days61_90', label: '61-90 يوم', range: '61-90', days: [61, 90], color: 'orange' },
    { key: 'days91_120', label: '91-120 يوم', range: '91-120', days: [91, 120], color: 'red' },
    { key: 'over120', label: '+120 يوم', range: '120+', days: [121, Infinity], color: 'rose' },
  ];
}

const BUCKET_STYLES = {
  current: {
    ring: 'ring-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  days31_60: {
    ring: 'ring-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  days61_90: {
    ring: 'ring-orange-500',
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-orange-500',
  },
  days91_120: {
    ring: 'ring-red-500',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
  },
  over120: {
    ring: 'ring-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
};

export default function AgingReportPage() {
  const { t } = useTranslation('admin');
  const agingBuckets = useMemo(() => getAgingBuckets(t), [t]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('outstanding');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [filterBucket, setFilterBucket] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Fetch customers with outstanding balances
  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { limit: 500 } });
      
      // Filter customers with outstanding balance and calculate aging
      const customersWithAging = (data.data || [])
        .filter(c => (c.financials?.outstandingBalance || 0) > 0)
        .map(customer => calculateAging(customer));
      
      setCustomers(customersWithAging);
    } catch (err) {
      toast.error(t('aging_report_page.toasts.kalmpu2'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate aging buckets for a customer
  const calculateAging = (customer) => {
    const today = new Date();
    const aging = {
      current: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
      over120: 0,
      oldestDueDate: null,
      maxAgeDays: 0,
    };

    // Simulate aging calculation based on customer data
    // In production, this would come from actual invoice due dates
    const outstanding = customer.financials?.outstandingBalance || 0;
    const createdAt = new Date(customer.createdAt);
    const daysSinceCreated = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));

    // Distribute outstanding based on customer age and payment behavior
    const avgPaymentDays = customer.paymentBehavior?.avgPaymentDays || 30;
    
    if (avgPaymentDays <= 30) {
      aging.current = outstanding;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 60) {
      aging.current = outstanding * 0.4;
      aging.days31_60 = outstanding * 0.6;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 90) {
      aging.current = outstanding * 0.2;
      aging.days31_60 = outstanding * 0.3;
      aging.days61_90 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 120) {
      aging.days31_60 = outstanding * 0.2;
      aging.days61_90 = outstanding * 0.3;
      aging.days91_120 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    } else {
      aging.days61_90 = outstanding * 0.2;
      aging.days91_120 = outstanding * 0.3;
      aging.over120 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    }

    return { ...customer, aging };
  };

  // Summary statistics
  const summary = useMemo(() => {
    const totals = {
      totalOutstanding: 0,
      current: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
      over120: 0,
      customersCount: customers.length,
    };

    customers.forEach(c => {
      totals.totalOutstanding += c.financials?.outstandingBalance || 0;
      totals.current += c.aging?.current || 0;
      totals.days31_60 += c.aging?.days31_60 || 0;
      totals.days61_90 += c.aging?.days61_90 || 0;
      totals.days91_120 += c.aging?.days91_120 || 0;
      totals.over120 += c.aging?.over120 || 0;
    });

    return totals;
  }, [customers]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(s) || 
        c.phone?.includes(s)
      );
    }

    // Bucket filter
    if (filterBucket !== 'all') {
      result = result.filter(c => {
        const bucketValue = c.aging?.[filterBucket] || 0;
        return bucketValue > 0;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'outstanding':
          aVal = a.financials?.outstandingBalance || 0;
          bVal = b.financials?.outstandingBalance || 0;
          break;
        case 'maxAge':
          aVal = a.aging?.maxAgeDays || 0;
          bVal = b.aging?.maxAgeDays || 0;
          break;
        default:
          aVal = a.aging?.[sortBy] || 0;
          bVal = b.aging?.[sortBy] || 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [customers, search, filterBucket, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / limit);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * limit, page * limit);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  // Export to Excel
  const exportToExcel = () => {
    const headers = ['العميل', t('aging_report_page.ui.kaaw86k'), t('aging_report_page.ui.krh6w30'), t('aging_report_page.ui.kabct7n'), '31-60 يوم', '61-90 يوم', '91-120 يوم', '+120 يوم'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone,
      c.financials?.outstandingBalance || 0,
      c.aging?.current || 0,
      c.aging?.days31_60 || 0,
      c.aging?.days61_90 || 0,
      c.aging?.days91_120 || 0,
      c.aging?.over120 || 0,
    ]);

    let csv = '\uFEFF'; // BOM for Arabic
    csv += headers.join(',') + '\n';
    rows.forEach(row => { csv += row.join(',') + '\n'; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_أعمار_الديون_${new Date().toLocaleDateString('ar-EG')}.csv`;
    a.click();
    toast.success(t('aging_report_page.toasts.kh8ghqm'));
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      <section className="app-surface-muted overflow-hidden rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] dark:border-white/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="app-surface flex h-12 w-12 items-center justify-center rounded-2xl text-orange-600 dark:text-orange-300">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500/80">Receivables Aging</p>
              <h1 className="text-2xl font-extrabold">{t('aging_report_page.ui.kylbqg3')}</h1>
              <p className="max-w-2xl text-sm leading-7 text-gray-400">{t('aging_report_page.ui.k6jzync')}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={fetchAgingData} icon={<RefreshCw className="w-4 h-4" />} className="w-full sm:w-auto">
              {t('aging_report_page.ui.update')}
            </Button>
            <Button variant="outline" onClick={printReport} icon={<Printer className="w-4 h-4" />} className="w-full sm:w-auto">
              {t('aging_report_page.ui.print')}
            </Button>
            <Button onClick={exportToExcel} icon={<FileSpreadsheet className="w-4 h-4" />} className="w-full sm:w-auto">
              {t('aging_report_page.ui.k2idb32')}
            </Button>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="app-surface-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-gray-500">{t('aging_report_page.ui.ka1a0q9')}</span>
          </div>
          <p className="text-xl font-bold">{fmt(summary.totalOutstanding)}</p>
          <p className="text-xs text-gray-400">{summary.customersCount} عميل</p>
        </Card>

        {agingBuckets.map((bucket) => (
          <Card 
            key={bucket.key}
            className={`app-surface-muted cursor-pointer p-4 transition-all duration-200 motion-safe:hover:-translate-y-0.5 ${filterBucket === bucket.key ? `ring-2 ${BUCKET_STYLES[bucket.key]?.ring}` : ''}`}
            onClick={() => setFilterBucket(filterBucket === bucket.key ? 'all' : bucket.key)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${BUCKET_STYLES[bucket.key]?.dot}`} />
              <span className="text-xs text-gray-500">{bucket.label}</span>
            </div>
            <p className={`text-xl font-bold ${BUCKET_STYLES[bucket.key]?.text}`}>
              {fmt(summary[bucket.key])}
            </p>
            <p className="text-xs text-gray-400">
              {((summary[bucket.key] / summary.totalOutstanding) * 100 || 0).toFixed(1)}%
            </p>
          </Card>
        ))}
      </div>

      {/* Visual Chart */}
      <Card className="app-surface rounded-3xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary-500" />
          {t('aging_report_page.ui.knuseel')}
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          {agingBuckets.map((bucket) => {
            const percentage = (summary[bucket.key] / summary.totalOutstanding) * 100 || 0;
            return (
              <div key={bucket.key} className="flex items-center gap-2">
                <div 
                  className={`h-8 rounded ${BUCKET_STYLES[bucket.key]?.bar}`} 
                  style={{ width: `${Math.max(percentage * 3, 20)}px` }}
                />
                <div className="text-sm">
                  <p className="font-medium">{bucket.label}</p>
                  <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card className="app-surface-muted p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={t('aging_report_page.placeholders.kfyg5an')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Filter className="w-4 h-4" />}
            />
          </div>
          <select
            value={filterBucket}
            onChange={(e) => { setFilterBucket(e.target.value); setPage(1); }}
            className="app-surface rounded-xl border border-transparent px-4 py-2"
          >
            <option value="all">{t('aging_report_page.ui.k99mpan')}</option>
            {agingBuckets.map((bucket) => (
              <option key={bucket.key} value={bucket.key}>{bucket.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 sm:p-10">
            <LoadingSpinner size="lg" text="جاري تحميل التقرير..." />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('aging_report_page.titles.kwlfd1t')}
            description="لم يتم العثور على عملاء لديهم أرصدة مستحقة ضمن الفلاتر الحالية."
            action={search || filterBucket !== 'all' ? { label: t('aging_report_page.ui.kr8yv4w'), onClick: () => { setSearch(''); setFilterBucket('all'); setPage(1); } } : null}
            className="px-4"
          />
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {paginatedCustomers.map((customer) => (
                <div key={customer._id} className="rounded-3xl border border-white/60 p-4 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold">
                        {customer.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.phone}</p>
                      </div>
                    </div>
                    <Badge variant="warning">{fmt(customer.financials?.outstandingBalance)} ج.م</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {agingBuckets.map((bucket) => (
                      <div key={bucket.key} className="rounded-2xl bg-black/[0.03] p-3 text-center dark:bg-white/[0.04]">
                        <p className="text-[11px] text-gray-400">{bucket.label}</p>
                        <p className={`mt-1 font-bold ${BUCKET_STYLES[bucket.key]?.text}`}>
                          {customer.aging?.[bucket.key] > 0 ? fmt(customer.aging[bucket.key]) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-gray-400">{t('aging_report_page.ui.k1iirc3')}</p>
                      <p className="mt-1 font-bold">{customer.paymentBehavior?.avgPaymentDays || 0} يوم</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                      <p className="text-gray-400">{t('aging_report_page.ui.k9zpd1v')}</p>
                      <p className="mt-1 font-bold">{fmt(customer.financials?.creditLimit)} ج.م</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                <thead className="app-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]" onClick={() => toggleSort('name')}>
                      <div className="flex items-center gap-1">{t('aging_report_page.ui.kab4izh')} <SortIcon field="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]" onClick={() => toggleSort('outstanding')}>
                      <div className="flex items-center justify-center gap-1">{t('aging_report_page.ui.krh6w30')} <SortIcon field="outstanding" /></div>
                    </th>
                    {agingBuckets.map((bucket) => (
                      <th 
                        key={bucket.key}
                        className={`px-4 py-3 text-center font-semibold cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${BUCKET_STYLES[bucket.key]?.text}`}
                        onClick={() => toggleSort(bucket.key)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {bucket.label} <SortIcon field={bucket.key} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold">{t('aging_report_page.ui.kvfmk6')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedCustomers.map((customer) => (
                    <React.Fragment key={customer._id}>
                      <tr className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                              {customer.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{customer.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {customer.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {fmt(customer.financials?.outstandingBalance)} ج.م
                        </td>
                        {agingBuckets.map((bucket) => (
                          <td key={bucket.key} className={`px-4 py-3 text-center font-medium ${BUCKET_STYLES[bucket.key]?.text}`}>
                            {customer.aging?.[bucket.key] > 0 ? fmt(customer.aging[bucket.key]) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setExpandedCustomer(expandedCustomer === customer._id ? null : customer._id)}
                              className="rounded-lg p-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                              title={t('aging_report_page.titles.k3y9kzm')}
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            <a
                              href={`tel:${customer.phone}`}
                              className="p-2 hover:bg-green-50 text-green-500 rounded-lg transition-colors"
                              title={t('aging_report_page.titles.kouxd0v')}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                      {expandedCustomer === customer._id && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-400">{t('aging_report_page.ui.k1iirc3')}</p>
                                <p className="font-bold">{customer.paymentBehavior?.avgPaymentDays || 0} يوم</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{t('aging_report_page.ui.k861ybb')}</p>
                                <p className="font-bold">{fmt(customer.financials?.totalPurchases)} ج.م</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{t('aging_report_page.ui.khtnkti')}</p>
                                <p className="font-bold text-emerald-600">{fmt(customer.financials?.totalPaid)} ج.م</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{t('aging_report_page.ui.k9zpd1v')}</p>
                                <p className="font-bold">{fmt(customer.financials?.creditLimit)} ج.م</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-right">الإجمالي ({filteredCustomers.length} عميل)</td>
                    <td className="px-4 py-3 text-center">{fmt(summary.totalOutstanding)} ج.م</td>
                    {agingBuckets.map((bucket) => (
                      <td key={bucket.key} className={`px-4 py-3 text-center ${BUCKET_STYLES[bucket.key]?.text}`}>
                        {fmt(summary[bucket.key])}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-100/80 p-4 dark:border-white/10">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={filteredCustomers.length}
                itemsPerPage={limit}
              />
            </div>
          </>
        )}
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          table { font-size: 10px !important; }
        }
      `}</style>
    </div>
  );
}
