import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, XCircle, MessageSquare, Trash2, Filter, RefreshCw } from 'lucide-react';
import { reviewsApi } from '../store';
import { useThemeStore } from '../store';
import { Card, Badge, Button, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import { useTranslation } from 'react-i18next';

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${value >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { t } = useTranslation('admin');
  const { dark } = useThemeStore();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        reviewsApi.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        reviewsApi.getStats(),
      ]);
      setReviews(reviewsRes.data.data.reviews || []);
      setStats(statsRes.data.data);
    } catch (err) {
      notify.error(t('reviews_page.toasts.kmay528'));
    }
    setLoading(false);
  };

  const handleStatus = async (id, status) => {
    try {
      await reviewsApi.updateStatus(id, status);
      notify.success(status === 'approved' ? t('reviews_page.ui.kvijlkn') : t('reviews_page.ui.kwkjtsf'));
      loadData();
    } catch {
      notify.error(t('reviews_page.toasts.kjwcs3i'));
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return notify.error(t('reviews_page.toasts.k6owwp3'));
    setReplyLoading(true);
    try {
      await reviewsApi.addReply(replyModal._id, replyText);
      notify.success(t('reviews_page.toasts.ko2cx7a'));
      setReplyModal(null);
      setReplyText('');
      loadData();
    } catch {
      notify.error(t('reviews_page.toasts.khxtbbg'));
    }
    setReplyLoading(false);
  };

  const handleDelete = async (id) => {
    notify.custom({
      title: t('reviews_page.ui.kew89qq'),
      message: t('reviews_page.ui.kq3x34'),
      type: 'warning',
      actions: [
        {
          label: t('reviews_page.ui.kxnge'),
          onClick: async () => {
            try {
              await reviewsApi.delete(id);
              notify.success(t('reviews_page.toasts.kptz52h'));
              loadData();
            } catch {
              notify.error(t('reviews_page.toasts.kpndy7i'));
            }
          },
          style: 'danger',
        },
        { label: t('reviews_page.ui.kouah6d'), onClick: () => { }, style: 'secondary' },
      ],
    });
  };

  const statusFilters = [
    { value: 'pending', label: t('reviews_page.ui.khwh8k7') },
    { value: 'approved', label: t('reviews_page.ui.kpbx2ho') },
    { value: 'rejected', label: t('reviews_page.ui.kpbjxer') },
    { value: 'all', label: t('reviews_page.ui.ksvtb2') },
  ];

  return (
    <div className="space-y-6 animate-fade-in app-text-soft">
      {/* Header */}
      <div className="app-surface-muted flex items-center justify-between rounded-3xl p-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            {t('reviews_page.ui.kx9li0j')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('reviews_page.ui.khp4x52')}</p>
        </div>
        <Button onClick={loadData} icon={<RefreshCw className="w-4 h-4" />} variant="outline">
          {t('reviews_page.ui.update')}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-yellow-500">{stats.avgRating || '—'}</p>
            <StarDisplay value={Math.round(stats.avgRating || 0)} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reviews_page.ui.koq4l9z')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-blue-500">{stats.pending || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reviews_page.ui.khwh8k7')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-green-500">{stats.approved || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reviews_page.ui.kpbx2ho')}</p>
          </Card>
          <Card className="app-surface-muted p-4 text-center">
            <p className="text-3xl font-black text-gray-500">{stats.total || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reviews_page.ui.krh6w30')}</p>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats?.ratingDistribution && (
        <Card className="app-surface p-4 rounded-3xl">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm">{t('reviews_page.ui.k93shuy')}</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star] || 0;
              const pct = stats.totalApproved > 0 ? (count / stats.totalApproved) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-4">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${statusFilter === f.value
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                : `app-surface text-gray-600 dark:text-gray-400 border border-gray-200/80 dark:border-white/10`
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : reviews.length === 0 ? (
        <Card className="app-surface-muted p-10 text-center rounded-3xl">
          <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('reviews_page.ui.kjmywgi')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review._id} className="app-surface p-4 rounded-3xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {review.customer?.name || t('reviews_page.toasts.kt7bza')}
                    </p>
                    {review.isVerifiedPurchase && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                        {t('reviews_page.ui.kd9c01p')}
                      </span>
                    )}
                  </div>
                  <StarDisplay value={review.rating} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${review.status === 'approved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : review.status === 'rejected'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                    {review.status === 'approved' ? t('reviews_page.ui.kpbx2ho') : review.status === 'rejected' ? t('reviews_page.ui.kpbjxer') : 'قيد المراجعة'}
                  </span>
                </div>
              </div>

              {review.title && <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{review.title}</p>}
              {review.body && <p className="text-sm text-gray-600 dark:text-gray-400">{review.body}</p>}

              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(review.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                {review.product && ` · منتج: ${review.product.name}`}
              </p>

              {/* Vendor Reply */}
              {review.reply?.body && (
                <div className="mt-3 bg-primary-50 dark:bg-primary-900/10 rounded-xl p-3 border border-primary-100 dark:border-primary-800">
                  <p className="text-xs font-bold text-primary-700 dark:text-primary-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> ردك:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{review.reply.body}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {review.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatus(review._id, 'approved')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-200 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> قبول
                    </button>
                    <button
                      onClick={() => handleStatus(review._id, 'rejected')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> رفض
                    </button>
                  </>
                )}
                {!review.reply?.body && (
                  <button
                    onClick={() => { setReplyModal(review); setReplyText(''); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> رد
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review._id)}
                  className="app-surface flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="app-surface w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              {t('reviews_page.ui.kx3oa6v')}
            </h3>

            <div className="app-surface-muted rounded-xl p-3">
              <StarDisplay value={replyModal.rating} />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{replyModal.body}</p>
            </div>

            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('reviews_page.placeholders.kg70t4p')}
              className="app-surface w-full px-4 py-2.5 rounded-xl border border-transparent text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReply}
                disabled={replyLoading}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition disabled:opacity-50"
              >
                {replyLoading ? t('reviews_page.ui.ktnxbjh') : 'إرسال الرد'}
              </button>
              <button
                onClick={() => setReplyModal(null)}
                className="app-surface px-4 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-bold transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                {t('reviews_page.ui.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
