'use client';

import React, { useMemo, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '@/components/admin/shared/PageHeader';
import KPICard from '@/components/admin/shared/KPICard';
import { useAPI } from '@/lib/hooks/useAPI';
import { useLanguage } from '@/context/LanguageContext';
// ErrorBoundaryWrapper removed as it was unused
import { Download, Users, CheckCircle2, BarChart3, Award, ChevronsUpDown } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload) return null;

  const colorClassByHex: Record<string, string> = {
    '#06b6d4': 'text-cyan-400',
    '#10b981': 'text-emerald-400',
    '#3b82f6': 'text-blue-400',
    '#f59e0b': 'text-amber-400',
    '#ef4444': 'text-red-400',
  };

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm shadow-xl">
      <div className="text-white font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className={`text-xs ${colorClassByHex[p.color] ?? 'text-slate-300'}`}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

type AuditEntry = {
  id: string;
  createdAt: string;
  action: string;
  source: string;
  userName: string;
  courseTitle: string;
  progressPct?: number;
  score?: number;
};

const RAW_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'NA';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function progressWidthClass(progress: number): string {
  const clamped = Math.max(0, Math.min(100, progress));
  const snapped = Math.round(clamped / 5) * 5;
  return `ks-progress-${snapped}`;
}

function renderLegendLabel(value: string): React.ReactNode {
  return <span className="ks-reports-legend-text">{value}</span>;
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof AuditEntry; direction: 'asc'|'desc' } | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'admin_api' | 'trainee_api' | 'system'>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'completion' | 'progress' | 'assignment'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'unscored'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  
  // ── SWR-cached data fetching ──────────────────────────────────
  const { data: auditData, isLoading: isAuditLoading } = useAPI<{ ok: boolean; rows: AuditEntry[] }>(
    '/api/admin/reports/enrollment-audit?limit=500',
    {
      refreshInterval: 15_000,
      dedupingInterval: 5_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
  const auditRows = useMemo(() => {
    return auditData?.ok && Array.isArray(auditData.rows) ? auditData.rows : [];
  }, [auditData]);

  const availableCourses = useMemo(() => {
    return Array.from(new Set(auditRows.map((row) => row.courseTitle).filter((title) => title && title !== 'Unknown Course')))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30);
  }, [auditRows]);

  const analyticsRows = useMemo(() => {
    const now = Date.now();
    return auditRows.filter((row) => {
      if (timeFilter !== 'all') {
        const ts = new Date(row.createdAt).getTime();
        if (!Number.isFinite(ts)) return false;
        const maxAgeDays = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
        const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
        if (diffDays > maxAgeDays) return false;
      }

      if (sourceFilter !== 'all' && row.source !== sourceFilter) {
        return false;
      }

      if (courseFilter !== 'all' && row.courseTitle !== courseFilter) {
        return false;
      }

      if (actionFilter !== 'all') {
        const action = row.action.toLowerCase();
        if (actionFilter === 'completion' && !action.includes('complete')) return false;
        if (actionFilter === 'progress' && !action.includes('progress')) return false;
        if (actionFilter === 'assignment' && !(action.includes('assign') || action.includes('enroll'))) return false;
      }

      if (scoreFilter !== 'all') {
        const score = row.score;
        if (scoreFilter === 'unscored') return typeof score !== 'number';
        if (typeof score !== 'number') return false;
        if (scoreFilter === 'high') return score >= 80;
        if (scoreFilter === 'medium') return score >= 60 && score < 80;
        if (scoreFilter === 'low') return score < 60;
      }

      return true;
    });
  }, [auditRows, timeFilter, sourceFilter, actionFilter, scoreFilter, courseFilter]);

  const sortedAndFilteredAudits = useMemo(() => {
    const sortableItems = [...analyticsRows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return showAllRecords ? sortableItems : sortableItems.slice(0, 10);
  }, [analyticsRows, sortConfig, showAllRecords]);

  const requestSort = (key: keyof AuditEntry) => {
    let direction: 'asc'|'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const TABLE_HEADERS: { label: string; key: keyof AuditEntry }[] = [
    { label: 'Time', key: 'createdAt' },
    { label: 'Action', key: 'action' },
    { label: 'Source', key: 'source' },
    { label: 'User', key: 'userName' },
    { label: 'Course', key: 'courseTitle' },
    { label: 'Progress', key: 'progressPct' },
    { label: 'Score', key: 'score' },
  ];

  // ── Dynamic Aggregations ──────────────────────────────────────
  const kpis = useMemo(() => {
    let testCompletions = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    const uniqueUsers = new Set<string>();

    analyticsRows.forEach((row) => {
      if (row.userName && row.userName !== 'Unknown User') uniqueUsers.add(row.userName);
      
      const isCompletion = row.action.includes('complete') && (row.action.includes('test') || row.action.includes('quiz') || row.action.includes('course'));
      if (isCompletion) {
        testCompletions++;
      }
      if (typeof row.score === 'number' && row.score > 0) {
        scoreSum += row.score;
        scoreCount++;
      }
    });

    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

    return {
      totalEvents: analyticsRows.length,
      uniqueLearners: uniqueUsers.size,
      assessmentsCompleted: testCompletions,
      averageScore: avgScore,
    };
  }, [analyticsRows]);

  const dailyActivityData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsRows.forEach((row) => {
      const dateStr = new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateStr !== 'Invalid Date') {
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });
    // Reverse because auditRows is sorted descending chronologically
    return Object.entries(counts).map(([date, count]) => ({ date, interactions: count })).reverse();
  }, [analyticsRows]);

  const actionDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsRows.forEach((row) => {
      counts[row.action] = (counts[row.action] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], idx) => ({ 
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // capitalize
      value,
      color: RAW_COLORS[idx % RAW_COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [analyticsRows]);

  const courseInteractionData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsRows.forEach((row) => {
      if (row.courseTitle !== 'Unknown Course') {
        counts[row.courseTitle] = (counts[row.courseTitle] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0,20)+'...' : name, interactions: value }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 6); // Top 6 courses
  }, [analyticsRows]);

  const insightSummary = useMemo(() => {
    const topAction = actionDistributionData[0];
    const peakDay = dailyActivityData.reduce<{ date: string; interactions: number } | null>((max, current) => {
      if (!max || current.interactions > max.interactions) return current;
      return max;
    }, null);
    const topCourse = courseInteractionData[0];

    let scoredRows = 0;
    let lowScoreCount = 0;
    let progressCount = 0;
    let progressSum = 0;

    analyticsRows.forEach((row) => {
      if (typeof row.score === 'number') {
        scoredRows++;
        if (row.score < 60) lowScoreCount++;
      }

      if (typeof row.progressPct === 'number') {
        progressCount++;
        progressSum += row.progressPct;
      }
    });

    return {
      topActionName: topAction?.name || 'NA',
      topActionCount: topAction?.value || 0,
      peakDayLabel: peakDay?.date || 'NA',
      peakDayVolume: peakDay?.interactions || 0,
      topCourseName: topCourse?.name || 'NA',
      topCourseInteractions: topCourse?.interactions || 0,
      lowScoreRate: scoredRows > 0 ? Math.round((lowScoreCount / scoredRows) * 100) : 0,
      avgProgress: progressCount > 0 ? Math.round(progressSum / progressCount) : 0,
    };
  }, [actionDistributionData, dailyActivityData, courseInteractionData, analyticsRows]);

  const scoreBandData = useMemo(() => {
    const bands = {
      High: 0,
      Medium: 0,
      'At Risk': 0,
      Unscored: 0,
    };

    analyticsRows.forEach((row) => {
      if (typeof row.score !== 'number') {
        bands.Unscored++;
      } else if (row.score >= 80) {
        bands.High++;
      } else if (row.score >= 60) {
        bands.Medium++;
      } else {
        bands['At Risk']++;
      }
    });

    return [
      { name: 'High', value: bands.High, color: '#10b981' },
      { name: 'Medium', value: bands.Medium, color: '#f59e0b' },
      { name: 'At Risk', value: bands['At Risk'], color: '#ef4444' },
      { name: 'Unscored', value: bands.Unscored, color: '#64748b' },
    ];
  }, [analyticsRows]);

  const forensicInsights = useMemo(() => {
    const total = analyticsRows.length || 1;
    const adminApiEvents = analyticsRows.filter((row) => row.source === 'admin_api').length;
    const traineeApiEvents = analyticsRows.filter((row) => row.source === 'trainee_api').length;
    const systemEvents = analyticsRows.filter((row) => row.source === 'system').length;

    const completionEvents = analyticsRows.filter((row) => row.action.includes('complete')).length;
    const progressEvents = analyticsRows.filter((row) => row.action.includes('progress')).length;

    return {
      adminControlShare: Math.round((adminApiEvents / total) * 100),
      learnerDrivenShare: Math.round((traineeApiEvents / total) * 100),
      systemAutomationShare: Math.round((systemEvents / total) * 100),
      completionToProgressRatio: progressEvents > 0 ? (completionEvents / progressEvents).toFixed(2) : '0.00',
    };
  }, [analyticsRows]);

  return (
    <>
      <PageHeader title={t('admin.reports.title')} sub={t('admin.reports.subtitle')}
          action={
            <div className="flex items-center gap-3">
               <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Telemetry Active</span>
               </div>
               <a href="/api/admin/reports/enrollment-audit/export?limit=5000" className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] border border-white/10 text-slate-300 hover:text-white rounded-xl text-sm cursor-pointer transition-all hover:bg-slate-800 active:scale-95 shadow-lg"><Download className="h-4 w-4" /> Export CSV</a>
            </div>
          } 
        />

      {/* Analytics Filters */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#0f172a]/55 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)} className="bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" title="Filter by time range" aria-label="Filter by time range">
            <option value="all">Time: All</option>
            <option value="7d">Time: Last 7 days</option>
            <option value="30d">Time: Last 30 days</option>
            <option value="90d">Time: Last 90 days</option>
          </select>

          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)} className="bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" title="Filter by source" aria-label="Filter by source">
            <option value="all">Source: All</option>
            <option value="admin_api">Admin API</option>
            <option value="trainee_api">Trainee API</option>
            <option value="system">System</option>
          </select>

          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)} className="bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" title="Filter by action group" aria-label="Filter by action group">
            <option value="all">Action: All</option>
            <option value="completion">Completion Events</option>
            <option value="progress">Progress Events</option>
            <option value="assignment">Assignment Events</option>
          </select>

          <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value as typeof scoreFilter)} className="bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" title="Filter by score band" aria-label="Filter by score band">
            <option value="all">Score: All</option>
            <option value="high">High (80+)</option>
            <option value="medium">Medium (60-79)</option>
            <option value="low">Low (&lt;60)</option>
            <option value="unscored">Unscored</option>
          </select>

          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" title="Filter by course" aria-label="Filter by course">
            <option value="all">Course: All</option>
            {availableCourses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="UNIQUE TRAINEES" value={isAuditLoading ? '...' : (kpis.uniqueLearners || 0)} icon={<Users className="h-6 w-6 text-cyan-400" />} themeColor="cyan" valueColor="text-cyan-400" delay={0} />
        <KPICard label="TELEMETRY EVENTS" value={isAuditLoading ? '...' : (kpis.totalEvents || 0)} icon={<BarChart3 className="h-6 w-6 text-blue-400" />} themeColor="blue" valueColor="text-blue-400" delay={200} />
        <KPICard label="QUIZZES PASSED" value={isAuditLoading ? '...' : (kpis.assessmentsCompleted || 0)} icon={<CheckCircle2 className="h-6 w-6 text-amber-400" />} themeColor="amber" valueColor="text-amber-400" delay={400} />
        <KPICard label="AGGREGATE SCORE" value={isAuditLoading ? '...' : `${kpis.averageScore || 0}%`} icon={<Award className="h-6 w-6 text-emerald-400" />} themeColor="emerald" valueColor="text-emerald-400" delay={600} />
      </div>

      {/* Executive Insight Layer */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Dominant Action</div>
          <div className="text-sm text-white font-bold leading-snug">{insightSummary.topActionName}</div>
          <div className="text-[11px] text-cyan-400 font-black mt-2">{insightSummary.topActionCount} events</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Peak Traffic Window</div>
          <div className="text-sm text-white font-bold leading-snug">{insightSummary.peakDayLabel}</div>
          <div className="text-[11px] text-blue-400 font-black mt-2">{insightSummary.peakDayVolume} interactions</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Highest Course Pull</div>
          <div className="text-sm text-white font-bold leading-snug">{insightSummary.topCourseName}</div>
          <div className="text-[11px] text-amber-400 font-black mt-2">{insightSummary.topCourseInteractions} interactions</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Risk Marker</div>
          <div className="text-sm text-white font-bold leading-snug">Low Score Rate: {insightSummary.lowScoreRate}%</div>
          <div className="text-[11px] text-emerald-400 font-black mt-2">Avg Progress: {insightSummary.avgProgress}%</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
             <div className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Training Audit Feed</h3>
          </div>
          <div className="text-[9px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
            {analyticsRows.length} RECORDS INDEXED
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[850px] border-separate border-spacing-y-2">
            <thead>
              <tr>
                {TABLE_HEADERS.map((col) => (
                  <th key={col.key} onClick={() => requestSort(col.key)} className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 cursor-pointer hover:text-cyan-400 transition-colors select-none group">
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <ChevronsUpDown className={`h-3 w-3 transition-opacity ${sortConfig?.key === col.key ? 'opacity-100 text-cyan-400' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isAuditLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={`skel-${i}`} className="animate-pulse">
                      {TABLE_HEADERS.map((_, idx) => (
                        <td key={idx} className="px-4 py-4 bg-white/5 first:rounded-l-xl last:rounded-r-xl border-y border-white/5"><div className="h-3 w-full bg-white/5 rounded" /></td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
              {!isAuditLoading &&
                sortedAndFilteredAudits.map((row) => (
                  <tr key={row.id} className="group hover:translate-x-1 transition-all">
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-l border-white/5 rounded-l-xl text-[10px] font-bold text-slate-500 tracking-tighter">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-white/5 text-xs">
                      <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold uppercase text-[9px] tracking-wider border border-cyan-500/20">{row.action}</span>
                    </td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.source}</td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-white/5 text-sm font-bold text-white/90">{row.userName}</td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-white/5 text-sm font-medium text-slate-300">{row.courseTitle}</td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-white/5">
                      {typeof row.progressPct === 'number' && (
                        <div className="flex items-center gap-2">
                           <div className="flex-1 w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] ${progressWidthClass(row.progressPct)}`}></div>
                           </div>
                           <span className="text-[10px] font-black text-white">{row.progressPct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 bg-white/[0.02] border-y border-r border-white/5 rounded-r-xl text-xs font-black text-emerald-400">
                      {typeof row.score === 'number' ? `${row.score}%` : <span className="text-slate-600">-</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!isAuditLoading && analyticsRows.length > 10 && (
          <div className="mt-6 flex justify-center pt-2">
            <button
               onClick={() => setShowAllRecords(!showAllRecords)}
               className="text-[10px] font-black tracking-widest uppercase px-6 py-2.5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 rounded-xl cursor-pointer"
            >
              {showAllRecords ? "Show Summarized Log" : `Show Complete Historical Audit (${analyticsRows.length} Rows)`}
            </button>
          </div>
        )}
      </div>

      {/* Advanced Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Activity Area Chart */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl group transition-all duration-500 hover:border-cyan-500/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse"></span>
              Platform Interaction momentum
            </h3>
            <div className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 tracking-widest">
              TELEMETRY STREAM
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            {dailyActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyActivityData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="interactions" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Synchronizing sensors...</div>
            )}
          </div>
        </div>

        {/* Action Distribution Pie Chart */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl group transition-all duration-500 hover:border-amber-500/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></span>
              Industrial Action Index
            </h3>
            <div className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 tracking-widest">
              DISTRIBUTION
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {actionDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {actionDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" className="ks-reports-pie-legend" formatter={renderLegendLabel} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Analyzing event stream...</div>
            )}
          </div>
        </div>
      </div>

      {/* Throughput + Score Bands Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 h-[320px] shadow-2xl transition-all duration-500 hover:border-blue-500/20 group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></span>
              Critical Training Throughput
            </h3>
            <div className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 tracking-widest uppercase">
              Productivity Analysis
            </div>
          </div>

          <div className="w-full h-[230px]">
            {courseInteractionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseInteractionData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="interactions" radius={[6, 6, 0, 0]}>
                    {courseInteractionData.map((entry, index) => (
                      <Cell key={`throughput-${index}`} fill={RAW_COLORS[index % RAW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest text-center">Not enough data to calculate<br/>throughput patterns.</div>
            )}
          </div>
        </div>

        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 h-[320px] shadow-2xl transition-all duration-500 hover:border-emerald-500/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
              Score Quality Bands
            </h3>
            <div className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-widest">
              PERFORMANCE MIX
            </div>
          </div>
          <div className="w-full h-[230px]">
            {scoreBandData.some((row) => row.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreBandData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {scoreBandData.map((entry, index) => (
                      <Cell key={`score-band-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest text-center">
                No scored assessments available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Narrative Insight Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-black mb-2">Behavioral Signal</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Most activity concentrates around <span className="text-white font-semibold">{insightSummary.topActionName}</span>, indicating this workflow is currently driving platform throughput.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-amber-400 font-black mb-2">Quality Watch</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Low-score incidence is <span className="text-white font-semibold">{insightSummary.lowScoreRate}%</span>. Prioritize remediation on high-interaction courses to improve outcomes fastest.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-2">Action Recommendation</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Use peak window <span className="text-white font-semibold">{insightSummary.peakDayLabel}</span> for nudges and deploy targeted follow-ups where progress is below <span className="text-white font-semibold">{insightSummary.avgProgress}%</span>.
          </p>
        </div>
      </div>

      {/* Forensic Analysis Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-blue-400 font-black mb-2">Admin Control Share</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-white font-semibold">{forensicInsights.adminControlShare}%</span> of events were initiated via admin APIs.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-black mb-2">Learner-Led Activity</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-white font-semibold">{forensicInsights.learnerDrivenShare}%</span> of interactions are trainee-driven.
          </p>
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-purple-400 font-black mb-2">Automation Footprint</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            System automation contributes <span className="text-white font-semibold">{forensicInsights.systemAutomationShare}%</span> of total telemetry.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-[10px] uppercase tracking-widest text-amber-400 font-black mb-2">Completion Efficiency</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Completion-to-progress ratio is <span className="text-white font-semibold">{forensicInsights.completionToProgressRatio}</span>, indicating conversion health.
          </p>
        </div>
      </div>
    </>
  );
}
