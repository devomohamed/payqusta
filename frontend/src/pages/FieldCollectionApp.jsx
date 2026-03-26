/**
 * Field Collection App - Main Component
 * Mobile-optimized interface for field collectors
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin, 
  Navigation, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  User,
  Phone,
  FileText,
  Clock,
  TrendingUp,
  Camera,
  Edit3
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import SignatureCanvas from '../components/SignatureCanvas';
import PhotoUpload from '../components/PhotoUpload';

const FieldCollectionApp = () => {
  const { t } = useTranslation('admin');
  const [tasks, setTasks] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [collectionData, setCollectionData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    collected: 0
  });

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      // Fetch today's tasks
      const tasksRes = await api.get('/collection/tasks/today');
      const taskData = tasksRes.data.data || [];
      setTasks(taskData);

      // Calculate stats
      const stats = {
        total: taskData.length,
        completed: taskData.filter(t => t.status === 'collected').length,
        collected: taskData
          .filter(t => t.status === 'collected')
          .reduce((sum, t) => sum + (t.collectedAmount || 0), 0)
      };
      setStats(stats);

      // Try to fetch route
      try {
        const routeRes = await api.get('/collection/routes/today');
        setRoute(routeRes.data.data);
      } catch (err) {
        console.log('No route for today');
      }
    } catch (error) {
      toast.error(t('field_collection_app.toasts.kkqsu4s'));
    } finally {
      setLoading(false);
    }
  };

  const handleVisit = async (taskId) => {
    try {
      await api.post(`/collection/tasks/${taskId}/visit`);
      toast.success(t('field_collection_app.toasts.kmvpkda'));
      fetchTodayData();
    } catch (error) {
      toast.error(t('field_collection_app.toasts.ksdqqi0'));
    }
  };

  const handleCollect = async (taskId, amount, method) => {
    try {
      await api.post(`/collection/tasks/${taskId}/collect`, {
        amount,
        paymentMethod: method
      });
      toast.success('✅ تم التحصيل بنجاح');
      setSelectedTask(null);
      fetchTodayData();
    } catch (error) {
      toast.error(t('field_collection_app.toasts.ksinav7'));
    }
  };

  const handleSkip = async (taskId, reason) => {
    try {
      await api.post(`/collection/tasks/${taskId}/skip`, { reason });
      toast.success(t('field_collection_app.toasts.ketr6xz'));
      fetchTodayData();
    } catch (error) {
      toast.error(t('field_collection_app.toasts.k43pxy5'));
    }
  };

  const openInMaps = (task) => {
    if (task.location && task.location.coordinates) {
      const [lng, lat] = task.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      toast.error(t('field_collection_app.toasts.kdj7ij9'));
    }
  };

  if (loading) {
    return (
      <div className="app-shell-bg flex h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => 
    ['pending', 'assigned', 'in-progress', 'visited'].includes(t.status)
  );

  return (
    <div className="app-shell-bg min-h-screen pb-20 app-text-soft">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-4">{t('field_collection_app.ui.k3hsy0h')}</h1>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/20 p-3 shadow-sm backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-blue-100">{t('field_collection_app.ui.kfgq6ge')}</div>
          </div>
          <div className="rounded-2xl bg-white/20 p-3 shadow-sm backdrop-blur-sm">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-blue-100">{t('field_collection_app.ui.kar7gk6')}</div>
          </div>
          <div className="rounded-2xl bg-white/20 p-3 shadow-sm backdrop-blur-sm">
            <div className="text-2xl font-bold">
              {stats.collected.toLocaleString()}
            </div>
            <div className="text-sm text-blue-100">{t('field_collection_app.ui.kwlxf')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{t('field_collection_app.ui.kabe6np')}</span>
            <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {pendingTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {t('field_collection_app.ui.kautb38')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {t('field_collection_app.ui.kufhzrg')}
            </p>
          </div>
        ) : (
          pendingTasks.map(task => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="app-surface overflow-hidden rounded-[1.75rem] shadow-sm transition-transform duration-200 motion-safe:hover:-translate-y-0.5"
            >
              {/* Task Header */}
              <div className="border-b border-gray-100/80 p-4 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={20} className="text-gray-400" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      {task.customer?.name || t('field_collection_app.toasts.kt7bza')}
                    </span>
                  </div>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${task.priority === 'urgent' 
                      ? 'bg-red-100 text-red-700'
                      : task.priority === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : 'app-surface-muted text-gray-700 dark:text-gray-300'
                    }
                  `}>
                    {task.priority === 'urgent' ? t('field_collection_app.ui.kt6p0m') : task.priority === 'high' ? t('field_collection_app.ui.kc4wr4o') : 'عادي'}
                  </span>
                </div>

                {/* Customer Info */}
                {task.customer?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={16} />
                    <a href={`tel:${task.customer.phone}`} className="hover:text-blue-600">
                      {task.customer.phone}
                    </a>
                  </div>
                )}

                {task.invoice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <FileText size={16} />
                    <span>فاتورة #{task.invoice.invoiceNumber}</span>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="app-surface-muted p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <DollarSign size={20} />
                    <span className="text-sm">{t('field_collection_app.ui.kdfjle3')}</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {task.amount?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex gap-2">
                <button
                  onClick={() => openInMaps(task)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  {t('field_collection_app.ui.kzcgcj2')}
                </button>
                
                <button
                  onClick={() => setSelectedTask(task)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  {t('field_collection_app.ui.kowmolo')}
                </button>

                <button
                  onClick={() => {
                    const reason = prompt(t('field_collection_app.ui.kbu4y8p'));
                    if (reason) handleSkip(task._id, reason);
                  }}
                  className="app-surface rounded-xl px-4 font-medium text-gray-700 transition-colors hover:bg-black/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Collection Modal */}
      {selectedTask && (
        <CollectionModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onCollect={handleCollect}
        />
      )}
    </div>
  );
};

// Collection Modal Component
const CollectionModal = ({ task, onClose, onCollect }) => {
  const [amount, setAmount] = useState(task.amount);
  const [method, setMethod] = useState('cash');

  const handleSubmit = () => {
    if (amount <= 0 || amount > task.amount) {
      toast.error(t('field_collection_app.toasts.kod5l8k'));
      return;
    }
    onCollect(task._id, amount, method);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="app-surface w-full max-w-md rounded-t-3xl p-6 pb-8 shadow-2xl"
      >
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-black/10 dark:bg-white/15" />
        
        <h3 className="font-bold text-xl mb-4 text-gray-900 dark:text-white">
          تحصيل من {task.customer?.name}
        </h3>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('field_collection_app.ui.kirhpwe')}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            max={task.amount}
            className="app-surface w-full rounded-2xl border border-transparent px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-primary-500/20"
          />
          <p className="text-xs text-gray-500 mt-1">
            المبلغ المطلوب: {task.amount} ج.م
          </p>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('field_collection_app.ui.kfj3di7')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['cash', 'card', 'bank_transfer', 'mobile_wallet'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`
                  rounded-xl border-2 px-4 py-2 font-medium transition-all
                  ${method === m 
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'app-surface text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {m === 'cash' ? t('field_collection_app.ui.ktfjxz') : m === 'card' ? t('field_collection_app.ui.kovp6ov') : m === 'bank_transfer' ? t('field_collection_app.ui.kown2ov') : 'محفظة'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="app-surface flex-1 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-black/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            {t('field_collection_app.ui.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700"
          >
            {t('field_collection_app.ui.krksgke')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FieldCollectionApp;
