import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { Star, MessageSquare, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

function StarRating({ value, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`transition-transform ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`${sizeClass} ${(hovered || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, t }) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="app-surface rounded-2xl p-4 border border-gray-100/80 dark:border-white/10 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <StarRating value={review.rating} />
          {review.title && <p className="font-bold text-gray-900 dark:text-white mt-1">{review.title}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {review.isVerifiedPurchase && (
            <span className="flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> {t('reviews.verified')}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${review.status === 'approved'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : review.status === 'rejected'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}>
            {review.status === 'approved' ? t('reviews.status_approved') : review.status === 'rejected' ? t('reviews.status_rejected') : t('reviews.status_pending')}
          </span>
        </div>
      </div>

      {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{review.body}</p>}
      {review.product && (
        <p className="text-xs text-primary-500 mt-2">{t('reviews.product_label', { name: review.product.name })}</p>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        {new Date(review.createdAt).toLocaleDateString('ar-EG')}
      </p>

      {/* Vendor Reply */}
      {review.reply?.body && (
        <div className="app-surface-muted mt-3 rounded-xl p-3 border border-gray-100/80 dark:border-white/10">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-primary-500" />
            {t('reviews.store_reply')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{review.reply.body}</p>
        </div>
      )}
    </div>
  );
}

export default function PortalReviews() {
  const { fetchMyReviews, submitReview } = usePortalStore();
  const { dark } = useThemeStore();
  const { t, i18n } = useTranslation('portal');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'store',
    rating: 0,
    title: '',
    body: '',
  });

  const ratingLabels = {
    0: t('reviews.rating_select'),
    1: t('reviews.rating_1'),
    2: t('reviews.rating_2'),
    3: t('reviews.rating_3'),
    4: t('reviews.rating_4'),
    5: t('reviews.rating_5'),
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchMyReviews();
    setReviews(data?.reviews || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (form.rating === 0) {
      notify.error(t('reviews.rating_required'));
      return;
    }
    if (!form.body.trim()) {
      notify.error(t('reviews.body_required'));
      return;
    }

    setSubmitting(true);
    const res = await submitReview({
      type: form.type,
      rating: form.rating,
      title: form.title,
      body: form.body,
    });
    setSubmitting(false);

    if (res.success) {
      notify.success(res.message || t('reviews.submit_success'));
      setShowForm(false);
      setForm({ type: 'store', rating: 0, title: '', body: '' });
      loadReviews();
    } else {
      notify.error(res.message);
    }
  };

  return (
    <div className="space-y-4 pb-20 app-text-soft" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          {t('reviews.title')}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? t('reviews.cancel') : t('reviews.new_review')}
        </button>
      </div>

      {/* New Review Form */}
      {showForm && (
        <div className="app-surface rounded-2xl p-5 border border-gray-100/80 dark:border-white/10 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">{t('reviews.add_review')}</h3>

          {/* Type */}
          <div className="flex gap-2">
            {[
              { value: 'store', label: t('reviews.type_store') },
              { value: 'service', label: t('reviews.type_service') },
            ].map((tp) => (
              <button
                key={tp.value}
                onClick={() => setForm({ ...form, type: tp.value })}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${form.type === tp.value
                  ? 'bg-primary-500 text-white'
                  : 'app-surface-muted text-gray-600 dark:text-gray-400'
                  }`}
              >
                {tp.label}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('reviews.rating_label')}</label>
            <StarRating value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} size="lg" />
            <p className="text-xs text-gray-400 mt-1">
              {ratingLabels[form.rating]}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('reviews.review_title')}</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('reviews.title_placeholder')}
              maxLength={100}
              className="app-surface w-full rounded-xl border border-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('reviews.review_body')}</label>
            <textarea
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={t('reviews.body_placeholder')}
              maxLength={2000}
              className="app-surface w-full resize-none rounded-xl border border-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{form.body.length}/2000</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {submitting ? t('reviews.submitting') : t('reviews.submit')}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <PortalSkeleton count={4} type="card" className="mt-4" />
      ) : reviews.length === 0 ? (
        <PortalEmptyState
          icon={Star}
          title={t('reviews.empty_title')}
          message={t('reviews.empty_message')}
          className="my-8"
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
