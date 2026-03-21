import React, { useState, useEffect } from 'react';
import { adminApi } from '../store';
import { Card, Badge, LoadingSpinner, Button } from '../components/UI';
import { Shield, User, Clock, Search, Activity, Calendar, ChevronDown, ChevronUp, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: format(new Date().setDate(new Date().getDate() - 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // We can also have aggregation stats here if the API provides it
  // For now, simple list

  useEffect(() => {
    fetchLogs();
  }, [page, filter, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Assuming GET /admin/audit-logs accepts page, limit, sort, search
      const { data } = await adminApi.getAuditLogs({
        page,
        limit: 20,
        sort: '-createdAt',
        search: filter,
        from: dateRange.from,
        to: dateRange.to
      });
      setLogs(data.data);
      setTotalPages(Math.ceil(data.total / 20));
    } catch (error) {
      toast.error('فشل تحميل السجلات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ACTION_COLORS = {
    'create': 'green',
    'update': 'blue',
    'delete': 'red',
    'login': 'purple',
    'logout': 'gray',
    'import': 'orange',
  };

  const getActionColor = (action) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
    return ACTION_COLORS[key] || 'gray';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 app-text-soft">
      <div className="app-surface-muted flex items-center justify-between rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">سجلات النظام (Audit Logs)</h1>
            <p className="text-sm text-gray-500">تتبع نشاط المستخدمين والعمليات الحساسة</p>
          </div>
        </div>
      </div>

      <Card className="app-surface-muted flex flex-wrap items-center gap-4 p-4">
        <div className="app-surface flex min-w-[200px] flex-1 items-center gap-2 rounded-xl p-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث في السجلات..."
            className="bg-transparent border-none outline-none w-full text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="app-surface flex items-center gap-2 rounded-xl p-2 text-sm font-bold">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="bg-transparent border-none p-0 text-xs" />
          <span>-</span>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="bg-transparent border-none p-0 text-xs" />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد سجلات مطابقة</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log._id} className="app-surface overflow-hidden border-none p-0 transition-all hover:shadow-md">
                <div 
                  className="flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    log.action.includes('delete') ? 'bg-red-500' :
                    log.action.includes('create') ? 'bg-green-500' :
                    log.action.includes('update') ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* User Info */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black uppercase text-indigo-600">
                          {log.user?.name?.substring(0, 2) || '??'}
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[120px]">{log.user?.name || 'مستخدم محذوف'}</p>
                          <p className="text-[10px] text-gray-400">{log.user?.role || 'User'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action & Resource */}
                    <div className="col-span-1 md:col-span-2">
                       <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                             {log.action}
                           </span>
                           <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                             {log.resource}
                           </span>
                         </div>
                         <p className="text-[11px] text-gray-500 mt-0.5 truncate">{log.description || `عملية على ${log.resource}`}</p>
                       </div>
                    </div>

                    {/* Meta (IP & Time) */}
                    <div className="col-span-1 flex items-center justify-end gap-3 text-left">
                       <div className="flex flex-col items-end gap-1">
                         <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                           <Clock className="w-3 h-3" /> {formatDate(log.createdAt)}
                         </div>
                         {log.ipAddress && (
                           <span className="text-[10px] text-gray-400 font-mono">IP: {log.ipAddress}</span>
                         )}
                       </div>
                       {expandedLog === log._id ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                    </div>
                  </div>
                </div>

                {/* Details View */}
                {expandedLog === log._id && (
                  <div className="bg-gray-900 p-6 border-t border-gray-800 animate-slide-down">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        تفاصيل العملية وخصائصها
                      </h4>
                      <Badge variant="neutral" className="bg-gray-800 text-gray-400 border-none">{log.resourceId || 'N/A'}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 font-madi">التفاصيل (Metadata)</p>
                        <pre className="text-[11px] text-blue-400 bg-gray-800/50 p-4 rounded-xl overflow-x-auto border border-gray-700 font-mono leading-relaxed">
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 font-madi">سجل التغييرات (Audit Trail)</p>
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 min-h-[100px] flex items-center justify-center">
                          {log.changes ? (
                             <pre className="text-[11px] text-green-400 w-full font-mono">
                               {JSON.stringify(log.changes, null, 2)}
                             </pre>
                          ) : (
                            <div className="text-center">
                              <Activity className="w-5 h-5 text-gray-700 mx-auto mb-2" />
                              <p className="text-[10px] text-gray-600">لا توجد سجلات تغيير مفصلة لهذه العملية</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              السابق
            </Button>
            <span className="flex items-center px-4 font-bold text-sm">
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
