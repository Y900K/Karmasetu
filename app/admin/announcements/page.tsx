'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import KPICard from '@/components/admin/shared/KPICard';
import Modal from '@/components/admin/shared/Modal';
import { useToast } from '@/components/admin/shared/Toast';
import { DEPT_OPTIONS, PRIORITY_OPTIONS } from '@/data/mockAdminData';
import { Megaphone, Calendar, Users, Pencil, Trash } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useGlobalStats } from '@/context/GlobalStatsContext';

const priorityStyles: Record<string, { border: string; badge: string }> = {
  HIGH: { border: 'border-l-red-500', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
  INFO: { border: 'border-l-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  REMINDER: { border: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  URGENT: { border: 'border-l-red-500', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const MAX_ANNOUNCEMENT_AGE_DAYS = 15;
const RECENT_WINDOW_DAYS = 7;
const RETENTION_REVIEW_INTERVAL_DAYS = 15;
const RETENTION_REVIEW_KEY = 'ks_admin_announcements_retention_reviewed_at';

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  sentTo: string[];
  sentBy: string;
  date: string;
  priority: string;
  status?: 'sent' | 'scheduled' | 'archived';
  scheduledAt?: string | null;
};

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function ageInDays(value: string): number {
  const parsed = parseDate(value);
  if (!parsed) {
    return Number.MAX_SAFE_INTEGER;
  }
  const diffMs = Date.now() - parsed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'HIGH' | 'INFO' | 'REMINDER' | 'URGENT'>('all');
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [retentionMode, setRetentionMode] = useState<'keep' | 'hide'>('keep');
  const [showRetentionPrompt, setShowRetentionPrompt] = useState(false);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const { adminStats } = useGlobalStats();

  useEffect(() => {
    let isMounted = true;

    const loadAnnouncements = async () => {
      try {
        setIsLoadingAnnouncements(true);
        const response = await fetch('/api/admin/announcements');
        const data = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.ok || !Array.isArray(data.announcements)) {
          throw new Error(data.message || 'Failed to load announcements');
        }

        setAnnouncements(
          data.announcements.map((item: AnnouncementRow) => ({
            ...item,
            sentTo: Array.isArray(item.sentTo) ? item.sentTo : ['All Departments'],
            priority: typeof item.priority === 'string' ? item.priority : 'INFO',
          }))
        );
      } catch (error) {
        if (isMounted) {
          showToast(error instanceof Error ? error.message : 'Failed to load announcements', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAnnouncements(false);
        }
      }
    };

    loadAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const activeAnnouncements = useMemo(
    () => announcements.filter((ann) => ageInDays(ann.date) <= MAX_ANNOUNCEMENT_AGE_DAYS),
    [announcements]
  );

  const staleAnnouncements = useMemo(
    () => announcements.filter((ann) => ageInDays(ann.date) > MAX_ANNOUNCEMENT_AGE_DAYS),
    [announcements]
  );

  useEffect(() => {
    if (staleAnnouncements.length === 0) {
      setShowRetentionPrompt(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(RETENTION_REVIEW_KEY);
    const lastReviewed = saved ? Number(saved) : 0;
    const reviewAgeDays = lastReviewed > 0 ? Math.floor((Date.now() - lastReviewed) / (1000 * 60 * 60 * 24)) : Number.MAX_SAFE_INTEGER;

    if (!Number.isFinite(reviewAgeDays) || reviewAgeDays >= RETENTION_REVIEW_INTERVAL_DAYS) {
      setShowRetentionPrompt(true);
    }
  }, [staleAnnouncements.length]);

  const baseAnnouncements = retentionMode === 'hide' ? activeAnnouncements : announcements;

  const hiddenCount = retentionMode === 'hide' ? staleAnnouncements.length : 0;

  const filteredAnnouncements = useMemo(() => {
    if (activeFilter === 'all') {
      return baseAnnouncements;
    }

    if (activeFilter === 'recent') {
      return baseAnnouncements.filter((ann) => ageInDays(ann.date) <= RECENT_WINDOW_DAYS);
    }

    return baseAnnouncements.filter((ann) => ann.priority === activeFilter);
  }, [baseAnnouncements, activeFilter]);

  const thisWeekCount = useMemo(
    () => baseAnnouncements.filter((ann) => ageInDays(ann.date) <= RECENT_WINDOW_DAYS).length,
    [baseAnnouncements]
  );

  const audienceReached = adminStats?.totalTrainees ?? 0;

  const filterTabs = useMemo(
    () => [
      { key: 'all' as const, label: t('admin.announcements.filter.all'), count: baseAnnouncements.length },
      { key: 'recent' as const, label: t('admin.announcements.filter.recent'), count: baseAnnouncements.filter((ann) => ageInDays(ann.date) <= RECENT_WINDOW_DAYS).length },
      { key: 'HIGH' as const, label: t('admin.announcements.filter.high'), count: baseAnnouncements.filter((ann) => ann.priority === 'HIGH').length },
      { key: 'INFO' as const, label: t('admin.announcements.filter.info'), count: baseAnnouncements.filter((ann) => ann.priority === 'INFO').length },
      { key: 'REMINDER' as const, label: t('admin.announcements.filter.reminder'), count: baseAnnouncements.filter((ann) => ann.priority === 'REMINDER').length },
      { key: 'URGENT' as const, label: t('admin.announcements.filter.urgent'), count: baseAnnouncements.filter((ann) => ann.priority === 'URGENT').length },
    ],
    [baseAnnouncements, t]
  );

  return (
    <>
      <PageHeader title={t('admin.announcements.title')} sub={t('admin.announcements.subtitle')}
          action={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors"><Megaphone className="h-4 w-4" /> {t('admin.announcements.new_announcement')}</button>} />

      {showRetentionPrompt && staleAnnouncements.length > 0 && (
        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
          <div className="font-semibold mb-2">
            {staleAnnouncements.length} {t('admin.announcements.retention_prompt_prefix')} {MAX_ANNOUNCEMENT_AGE_DAYS} {t('admin.announcements.retention_prompt_suffix')}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setRetentionMode('keep');
                setShowRetentionPrompt(false);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(RETENTION_REVIEW_KEY, String(Date.now()));
                }
                showToast(t('admin.announcements.retention_kept'), 'success');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#020817] border border-[#334155] text-slate-300 hover:text-white"
            >
              {t('admin.announcements.keep_old')}
            </button>
            <button
              onClick={() => {
                setRetentionMode('hide');
                setShowRetentionPrompt(false);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(RETENTION_REVIEW_KEY, String(Date.now()));
                }
                showToast(t('admin.announcements.retention_hidden'), 'success');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#020817] border border-cyan-500/30 text-cyan-300 hover:text-cyan-200"
            >
              {t('admin.announcements.hide_old')}
            </button>
            <button
              onClick={() => {
                setAnnouncements((prev) => prev.filter((ann) => ageInDays(ann.date) <= MAX_ANNOUNCEMENT_AGE_DAYS));
                setRetentionMode('hide');
                setShowRetentionPrompt(false);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(RETENTION_REVIEW_KEY, String(Date.now()));
                }
                showToast(t('admin.announcements.retention_removed'), 'error');
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:text-red-200"
            >
              {t('admin.announcements.remove_old')}
            </button>
          </div>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          {hiddenCount} {t('admin.announcements.hidden_old_count_suffix')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard label={t('admin.announcements.kpi.total_active')} value={baseAnnouncements.length} icon={<Megaphone className="h-6 w-6 text-cyan-400" />} themeColor="cyan" valueColor="text-cyan-400" />
        <KPICard label={t('admin.announcements.kpi.recent_7d')} value={thisWeekCount} icon={<Calendar className="h-6 w-6 text-blue-400" />} themeColor="blue" valueColor="text-blue-400" />
        <KPICard label={t('admin.announcements.kpi.audience_reached')} value={audienceReached} icon={<Users className="h-6 w-6 text-emerald-400" />} themeColor="emerald" valueColor="text-emerald-400" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 text-sm rounded-full border cursor-pointer transition-colors ${activeFilter === tab.key ? 'bg-cyan-500 text-slate-900 border-cyan-500 font-semibold' : 'border-[#334155] text-slate-400 hover:text-white'}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoadingAnnouncements && announcements.length === 0 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-8 text-center text-slate-500 text-sm">
            Loading announcements...
          </div>
        )}
        {filteredAnnouncements.map((ann) => {
          const style = priorityStyles[ann.priority] || priorityStyles.INFO;
          return (
            <div key={ann.id} className={`bg-[#1e293b] border border-[#334155] border-l-4 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors ${style.border}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>{ann.priority}</span>
                    <span className="text-sm font-semibold text-white">{ann.title}</span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{ann.body}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs text-slate-500">{t('admin.announcements.sent_to_label')}</span>
                    {ann.sentTo.map((d) => (
                      <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-[#020817] border border-[#334155] text-slate-400">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500">{ann.date}</span>
                  <button title={t('admin.announcements.edit')} aria-label={t('admin.announcements.edit')} className="h-7 w-7 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 text-xs cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/admin/announcements/${encodeURIComponent(ann.id)}`, { method: 'DELETE' });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok || !data.ok) {
                          throw new Error(data.message || 'Failed to delete announcement');
                        }
                        setAnnouncements((prev) => prev.filter((item) => item.id !== ann.id));
                        showToast(t('admin.announcements.deleted'), 'error');
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : 'Failed to delete announcement', 'error');
                      }
                    }}
                    title={t('admin.announcements.delete')}
                    aria-label={t('admin.announcements.delete')}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 text-xs cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAnnouncements.length === 0 && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-8 text-center text-slate-500 text-sm">
            {t('admin.announcements.empty')}
          </div>
        )}
      </div>

      <NewAnnouncementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={(announcement) => {
          setAnnouncements((prev) => [announcement, ...prev]);
          setActiveFilter('all');
        }}
      />
    </>
  );
}

function NewAnnouncementModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (announcement: AnnouncementRow) => void;
}) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState(PRIORITY_OPTIONS[0] || 'INFO');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputCls = 'w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors';

  const toggleAll = () => {
    if (selectedDepts.length === DEPT_OPTIONS.length) setSelectedDepts([]);
    else setSelectedDepts([...DEPT_OPTIONS]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin.announcements.new_announcement')}>
      <div className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('admin.announcements.title_placeholder')}
          title={t('admin.announcements.title_placeholder')}
          aria-label={t('admin.announcements.title_placeholder')}
          className={inputCls}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          title={t('admin.announcements.priority')}
          aria-label={t('admin.announcements.priority')}
          className={`${inputCls} cursor-pointer`}
        >
          {PRIORITY_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
        </select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('admin.announcements.message_placeholder')}
          title={t('admin.announcements.message')}
          aria-label={t('admin.announcements.message')}
          rows={4}
          className={inputCls}
        />
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">{t('admin.announcements.send_to')}</label>
          <div className="bg-[#020817] border border-[#1e293b] rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer font-medium">
              <input type="checkbox" checked={selectedDepts.length === DEPT_OPTIONS.length} onChange={toggleAll} className="accent-cyan-500" />{t('admin.announcements.all_departments')}
            </label>
            {DEPT_OPTIONS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer pl-4">
                <input type="checkbox" checked={selectedDepts.includes(d)} onChange={() => setSelectedDepts((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d])} className="accent-cyan-500" />{d}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{t('admin.announcements.send_now')}</span>
          <button onClick={() => setScheduled(!scheduled)} title={t('admin.announcements.toggle_schedule')} aria-label={t('admin.announcements.toggle_schedule')} className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${scheduled ? 'bg-cyan-500' : 'bg-[#334155]'}`}>
            <div className={`h-5 w-5 rounded-full bg-white absolute top-0.5 transition-transform ${scheduled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-slate-400">{t('admin.announcements.schedule_later')}</span>
        </div>
        {scheduled && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            title={t('admin.announcements.scheduled_datetime')}
            aria-label={t('admin.announcements.scheduled_datetime')}
            className={inputCls}
          />
        )}
        <button
          onClick={async () => {
            try {
              setIsSubmitting(true);

              const response = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  body,
                  priority,
                  sentTo: selectedDepts.length > 0 ? selectedDepts : [t('admin.announcements.all_departments')],
                  scheduledAt: scheduled ? scheduledAt : undefined,
                }),
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data.ok || !data.announcement) {
                throw new Error(data.message || 'Failed to create announcement');
              }

              onCreate(data.announcement as AnnouncementRow);
              showToast(`${t('admin.announcements.sent_to')} ${selectedDepts.length || t('admin.announcements.all_short')} ${t('admin.announcements.departments_suffix')}`);
              setTitle('');
              setBody('');
              setSelectedDepts([]);
              setScheduled(false);
              setScheduledAt('');
              setTimeout(onClose, 600);
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'Failed to create announcement', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors disabled:opacity-60"
        >
          <Megaphone className="h-4 w-4" /> {isSubmitting ? 'Saving...' : t('admin.announcements.send_announcement')}
        </button>
      </div>
    </Modal>
  );
}
