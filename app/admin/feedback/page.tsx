'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import PageHeader from '@/components/admin/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';

type FeedbackRow = {
  id: string;
  userName: string;
  userEmail?: string;
  category: 'suggestion' | 'issue' | 'feature' | 'general';
  message: string;
  rating?: number;
  status: 'open' | 'reviewing' | 'resolved';
  adminNote?: string;
  createdAt: string;
};

const statusClass: Record<FeedbackRow['status'], string> = {
  open: 'text-amber-400',
  reviewing: 'text-blue-400',
  resolved: 'text-emerald-400',
};

export default function AdminFeedbackPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackRow['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FeedbackRow['category']>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'unrated' | '1' | '2' | '3' | '4' | '5'>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const loadRows = async () => {
    try {
      setError('');
      setIsLoading(true);
      const response = await fetch('/api/admin/feedback?limit=200');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !Array.isArray(data.feedback)) {
        throw new Error(data.message || 'Failed to load feedback.');
      }
      const nextRows = data.feedback as FeedbackRow[];
      setRows(nextRows);
      setNoteDrafts(
        nextRows.reduce<Record<string, string>>((acc, row) => {
          acc[row.id] = row.adminNote || '';
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    if (error.toLowerCase().includes('not authenticated')) {
      const timer = setTimeout(() => {
        router.replace('/login');
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (error.toLowerCase().includes('admin access denied')) {
      const timer = setTimeout(() => {
        router.replace('/trainee/dashboard');
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, router]);

  const updateStatus = async (id: string, status: FeedbackRow['status']) => {
    try {
      setUpdatingIds((prev) => [...prev, id]);
      const adminNote = (noteDrafts[id] || '').trim();
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: adminNote || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to update feedback.');
      }
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status, adminNote: adminNote || row.adminNote } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback.');
    } finally {
      setUpdatingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const filteredRows = useMemo(() => {
    const now = Date.now();

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && row.category !== categoryFilter) {
        return false;
      }

      if (dateFilter !== 'all') {
        const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
        const ts = new Date(row.createdAt).getTime();
        if (Number.isFinite(ts) && now - ts > days * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      if (ratingFilter === 'unrated') {
        return typeof row.rating !== 'number';
      }

      if (ratingFilter !== 'all') {
        const min = Number(ratingFilter);
        if (typeof row.rating !== 'number' || row.rating < min) {
          return false;
        }
      }

      return true;
    });
  }, [rows, statusFilter, categoryFilter, dateFilter, ratingFilter]);

  return (
    <>
    <PageHeader title={t('admin.feedback.title')} sub={t('admin.feedback.subtitle')} />

      {error && (
        <div className="mb-4 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error.toLowerCase().includes('admin access denied') ? t('admin.feedback.access_denied_redirect') : error}
        </div>
      )}

      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500">{t('admin.feedback.filter_status')}</label>
            <select
              title={t('admin.feedback.filter_status')}
              aria-label={t('admin.feedback.filter_status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | FeedbackRow['status'])}
              className="mt-1 w-full bg-[#020817] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">{t('admin.feedback.option_all')}</option>
              <option value="open">{t('admin.feedback.status_open')}</option>
              <option value="reviewing">{t('admin.feedback.status_reviewing')}</option>
              <option value="resolved">{t('admin.feedback.status_resolved')}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500">{t('admin.feedback.filter_category')}</label>
            <select
              title={t('admin.feedback.filter_category')}
              aria-label={t('admin.feedback.filter_category')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | FeedbackRow['category'])}
              className="mt-1 w-full bg-[#020817] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">{t('admin.feedback.option_all')}</option>
              <option value="suggestion">{t('admin.feedback.category_suggestion')}</option>
              <option value="issue">{t('admin.feedback.category_issue')}</option>
              <option value="feature">{t('admin.feedback.category_feature')}</option>
              <option value="general">{t('admin.feedback.category_general')}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500">{t('admin.feedback.filter_date')}</label>
            <select
              title={t('admin.feedback.filter_date')}
              aria-label={t('admin.feedback.filter_date')}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | '7d' | '30d' | '90d')}
              className="mt-1 w-full bg-[#020817] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">{t('admin.feedback.date_all_time')}</option>
              <option value="7d">{t('admin.feedback.date_7d')}</option>
              <option value="30d">{t('admin.feedback.date_30d')}</option>
              <option value="90d">{t('admin.feedback.date_90d')}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500">{t('admin.feedback.filter_rating')}</label>
            <select
              title={t('admin.feedback.filter_rating')}
              aria-label={t('admin.feedback.filter_rating')}
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as 'all' | 'unrated' | '1' | '2' | '3' | '4' | '5')}
              className="mt-1 w-full bg-[#020817] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">{t('admin.feedback.rating_any')}</option>
              <option value="unrated">{t('admin.feedback.rating_unrated')}</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">{t('admin.feedback.rating_5_only')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5 overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-slate-400">{t('admin.feedback.loading')}</p>
        ) : (
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  t('admin.feedback.table_trainee'),
                  t('admin.feedback.table_category'),
                  t('admin.feedback.table_message'),
                  t('admin.feedback.table_rating'),
                  t('admin.feedback.table_status'),
                  t('admin.feedback.table_created'),
                  t('admin.feedback.table_resolution_context'),
                  t('admin.feedback.table_actions'),
                ].map((header) => (
                  <th key={header} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-3 py-2 text-sm text-white">
                    <div>{row.userName}</div>
                    <div className="text-xs text-slate-500">{row.userEmail || '-'}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-cyan-300 uppercase">{t(`admin.feedback.category_${row.category}`)}</td>
                  <td className="px-3 py-2 text-sm text-slate-300 max-w-[380px] whitespace-pre-wrap">{row.message}</td>
                  <td className="px-3 py-2 text-xs text-amber-300">{typeof row.rating === 'number' ? `${row.rating}/5` : '-'}</td>
                  <td className={`px-3 py-2 text-xs uppercase ${statusClass[row.status]}`}>{t(`admin.feedback.status_${row.status}`)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(row.createdAt).toLocaleString(language === 'HINGLISH' ? 'hi-IN' : 'en-IN')}</td>
                  <td className="px-3 py-2 min-w-[240px]">
                    <textarea
                      title={t('admin.feedback.table_resolution_context')}
                      aria-label={t('admin.feedback.table_resolution_context')}
                      rows={2}
                      value={noteDrafts[row.id] || ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder={t('admin.feedback.placeholder_add_context')}
                      className="w-full bg-[#020817] border border-[#334155] rounded-lg px-2 py-1.5 text-xs text-white resize-none"
                    />
                    {row.adminNote && <div className="text-[10px] text-blue-300 mt-1">{t('admin.feedback.saved_prefix')} {row.adminNote}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStatus(row.id, 'reviewing')}
                        disabled={updatingIds.includes(row.id)}
                        className="text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                      >
                        {t('admin.feedback.status_reviewing')}
                      </button>
                      <button
                        onClick={() => updateStatus(row.id, 'resolved')}
                        disabled={updatingIds.includes(row.id) || (noteDrafts[row.id] || '').trim().length < 5}
                        className="text-xs px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        {t('admin.feedback.action_resolve')}
                      </button>
                    </div>
                    {(noteDrafts[row.id] || '').trim().length < 5 && row.status !== 'resolved' && (
                      <p className="text-[10px] text-slate-500 mt-1">{t('admin.feedback.min_note_hint')}</p>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-sm text-slate-500">{t('admin.feedback.no_rows')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
