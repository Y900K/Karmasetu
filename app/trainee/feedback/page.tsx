'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import { useToast } from '@/components/admin/shared/Toast';
import { useLanguage } from '@/context/LanguageContext';

type FeedbackRow = {
  id: string;
  category: 'suggestion' | 'issue' | 'feature' | 'general';
  message: string;
  rating?: number;
  status: 'open' | 'reviewing' | 'resolved';
  adminNote?: string;
  createdAt: string;
};

const categories: Array<FeedbackRow['category']> = ['suggestion', 'issue', 'feature', 'general'];

const statusClass: Record<FeedbackRow['status'], string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  reviewing: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

export default function TraineeFeedbackPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackRow['category']>('suggestion');
  const [rating, setRating] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [timeframe, setTimeframe] = useState('default');

  const loadFeedback = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);

      const response = await fetch(`/api/trainee/feedback?timeframe=${timeframe}`);
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error(t('trainee.feedback.error_auth'));
      }
      if (!response.ok || !data.ok || !Array.isArray(data.feedback)) {
        throw new Error(data.message || t('trainee.feedback.error_load'));
      }

      setRows(data.feedback as FeedbackRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('trainee.feedback.error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t, timeframe]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    if (error.toLowerCase().includes('not authenticated') || error === t('trainee.feedback.error_auth')) {
      const timer = setTimeout(() => {
        router.replace('/login');
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, router, t]);

  const submitFeedback = async () => {
    try {
      setError('');
      setNotice('');
      setIsSubmitting(true);

      if (message.trim().length < 10) {
        throw new Error(t('trainee.feedback.error_min_length'));
      }

      const response = await fetch('/api/trainee/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, rating }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || t('trainee.feedback.error_submit'));
      }

      setNotice(t('trainee.feedback.notice_submitted'));
      showToast(t('trainee.feedback.toast_success'), 'success');
      setMessage('');
      await loadFeedback();
    } catch (err) {
      const fallbackMessage = t('trainee.feedback.error_retry');
      const uiError = err instanceof Error ? err.message : fallbackMessage;
      setError(uiError);
      showToast(uiError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TraineeLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('trainee.feedback.page_title')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('trainee.feedback.page_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-[#1e293b] border border-[#334155] rounded-2xl p-5 h-fit">
          <h2 className="text-sm font-semibold text-white mb-4">{t('trainee.feedback.submit_title')}</h2>

          {error && (
            <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              {notice}
            </div>
          )}

          <label className="block text-xs text-slate-400 mb-1">{t('trainee.feedback.label_category')}</label>
          <select
            title={t('trainee.feedback.label_category')}
            aria-label={t('trainee.feedback.label_category')}
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackRow['category'])}
            className="w-full bg-[#020817] border border-[#334155] text-white rounded-xl px-3 py-2 text-sm mb-3"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {t(`admin.feedback.category_${item}`)}
              </option>
            ))}
          </select>

          <label className="block text-xs text-slate-400 mb-1">{t('trainee.feedback.label_rating')}</label>
          <div className="flex items-center gap-1 mb-1" aria-label={t('trainee.feedback.label_rating')}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= rating;

              return (
                <button
                  key={value}
                  type="button"
                  title={`${t('trainee.feedback.rate_prefix')} ${value}`}
                  aria-label={`${t('trainee.feedback.rate_prefix')} ${value}`}
                  onClick={() => setRating(value)}
                  className={`text-2xl leading-none transition-colors ${
                    active ? 'text-amber-400' : 'text-slate-600 hover:text-amber-300'
                  }`}
                >
                  ★
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-400 mb-3">{rating}/5</div>

          <label className="block text-xs text-slate-400 mb-1">{t('trainee.feedback.label_message')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={t('trainee.feedback.placeholder_message')}
            className="w-full bg-[#020817] border border-[#334155] text-white rounded-xl px-3 py-2 text-sm resize-none"
          />

          <button
            onClick={submitFeedback}
            disabled={isSubmitting}
            className="mt-3 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-xl disabled:opacity-50"
          >
            {isSubmitting ? t('trainee.feedback.btn_submitting') : t('trainee.feedback.btn_submit')}
          </button>
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">{t('trainee.feedback.history_title')}</h2>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-[#020817] border border-[#334155] text-white rounded-xl px-3 py-1 text-xs"
              aria-label="Filter timeframe"
            >
              <option value="default">Default (5 items)</option>
              <option value="24h">Past 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-slate-400">{t('trainee.feedback.loading')}</p>}
            {!isLoading && rows.length === 0 && (
              <p className="text-sm text-slate-500">{t('trainee.feedback.empty')}</p>
            )}
            {rows.map((row) => (
              <div key={row.id} className="bg-[#020817] border border-[#334155] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 uppercase">
                        {t(`admin.feedback.category_${row.category}`)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusClass[row.status]}`}>
                        {t(`admin.feedback.status_${row.status}`)}
                      </span>
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{row.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(row.createdAt).toLocaleString(language === 'HINGLISH' ? 'hi-IN' : 'en-IN')}
                    </p>
                  </div>
                  <div className="text-xs text-amber-300">
                    {typeof row.rating === 'number' ? `★ ${row.rating}/5` : '-'}
                  </div>
                </div>
                {row.adminNote && (
                  <div className="mt-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1">
                    {t('trainee.feedback.admin_note')}: {row.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TraineeLayout>
  );
}
