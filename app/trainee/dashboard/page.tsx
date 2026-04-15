'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import { useLanguage } from '@/context/LanguageContext';
import { useChatbot } from '@/context/ChatbotContext';
import KPICard from '@/components/admin/shared/KPICard';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { useTraineeIdentity } from '@/context/TraineeIdentityContext';
import { formatStudyHours } from '@/lib/enrollmentMetrics';
import { Bot, Shield, GraduationCap, Clock, AlertTriangle, Zap, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

type DashboardEvent = {
  id: string | number;
  title: string;
  date: string;
  time: string;
  type: string;
  mandatory?: boolean;
};

type DashboardAchievement = {
  id: number;
  title: string;
  icon: string;
  unlocked: boolean;
  hint?: string;
};

type DashboardFeed = {
  safetyTips: string[];
  upcomingEvents: DashboardEvent[];
  achievements: DashboardAchievement[];
};

const EMPTY_FEED: DashboardFeed = {
  safetyTips: [],
  upcomingEvents: [],
  achievements: [],
};

function TraineeDashboardContent() {
  const { t } = useLanguage();
  const { setIsOpen } = useChatbot();
  const [tipIndex, setTipIndex] = useState(0);
  const [feed, setFeed] = useState<DashboardFeed>(EMPTY_FEED);
  const currentTip = feed.safetyTips.length > 0 ? feed.safetyTips[tipIndex % feed.safetyTips.length] : 'Loading safety intelligence…';

  React.useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const response = await fetch('/api/trainee/dashboard/feed', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; feed?: DashboardFeed }
          | null;

        if (!response.ok || !payload?.ok || !payload.feed || !active) {
          return;
        }

        setFeed({
          safetyTips: Array.isArray(payload.feed.safetyTips) ? payload.feed.safetyTips : [],
          upcomingEvents: Array.isArray(payload.feed.upcomingEvents) ? payload.feed.upcomingEvents : [],
          achievements: Array.isArray(payload.feed.achievements) ? payload.feed.achievements : [],
        });
      } catch {
        // Keep a safe empty feed if request fails.
      }
    }

    void loadFeed();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (feed.safetyTips.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setTipIndex((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [feed.safetyTips.length]);

  const {
    activeCourses,
    assignedCourses,
    completedCoursesCount,
    averageProgress,
    totalStudyTimeMs,
    resumeCourse,
    isLoading
  } = useGlobalStats();
  
  const { identity, loading: identityLoading } = useTraineeIdentity();

  const studyHours = `${formatStudyHours(totalStudyTimeMs)}h`;
  const safetyAlertCount = feed.upcomingEvents.filter((event) => event.mandatory).length;
  const mandatoryTrainingPct = averageProgress;
  const unlockedAchievementCount = feed.achievements.filter((achievement) => achievement.unlocked).length;

  const hour = new Date().getHours();

  return (
    <main className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            {hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'} {t('dashboard.welcome')}, <span className="text-cyan-400">{identityLoading || !identity?.name ? <span className="inline-block w-32 h-8 bg-cyan-900/40 rounded-lg animate-pulse align-middle ml-2" /> : (identity?.name?.split(' ')[0] || 'Trainee')}</span>
          </h1>
          <div className="flex items-center gap-3">
             <div className={`flex items-center gap-1.5 px-2.5 py-1 ${safetyAlertCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-full`}>
                <span className={`w-1.5 h-1.5 rounded-full ${safetyAlertCount > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'} animate-pulse`}></span>
                <span className={`text-[10px] font-black ${safetyAlertCount > 0 ? 'text-amber-400' : 'text-emerald-400'} uppercase tracking-widest`}>
                   Profile: {safetyAlertCount > 0 ? 'Attention Required' : 'In Compliance'}
                </span>
             </div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{t('dashboard.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsOpen(true)}
             className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all shadow-lg active:scale-95"
           >
             <Bot className="h-4 w-4" /> Ask Buddy AI
           </button>
        </div>
      </div>

      {identity?.approvalStatus === 'pending' && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-amber-200">{identity.authMessage}</p>
          <p className="mt-1 text-xs text-amber-300/90">
            Basic access is active now. You can complete assigned default courses while admin verification continues.
          </p>
        </div>
      )}

      {/* Quick Resume Card - Industrial Command Style */}
      {resumeCourse && (
        <div className="relative group overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#0f172a]/60 backdrop-blur-xl p-8 shadow-2xl transition-all duration-500 hover:border-cyan-500/50">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className={`h-20 w-20 flex-shrink-0 rounded-2xl bg-gradient-to-br ${resumeCourse.theme} flex items-center justify-center text-3xl shadow-2xl relative`}>
              {resumeCourse.icon}
              <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-slate-900 rounded-full border-4 border-slate-900 flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-cyan-500 animate-ping"></div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Active unit: {resumeCourse.progress}% Complete</span>
               </div>
               <h2 className="text-xl md:text-2xl font-black text-white mb-2 line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{resumeCourse.title}</h2>
               <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="flex-1 max-w-[240px] h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${resumeCourse.progress}%` }}
                        className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                     />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 tracking-wider">RESUME UNIT 0{Math.max(1, Math.ceil(resumeCourse.progress / 20))}</span>
               </div>
            </div>

            <Link
              href={`/trainee/course/${resumeCourse.id}`}
              className="w-full md:w-auto px-8 py-4 bg-cyan-500 text-slate-900 font-black rounded-2xl shadow-2xl shadow-cyan-900/40 hover:bg-cyan-400 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
            >
              ▶ {t('dashboard.resume_btn')}
            </Link>
          </div>
        </div>
      )}

      {/* Industrial KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t('stats.mandatory')}
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : `${mandatoryTrainingPct}%`}
          icon={<Shield className="h-6 w-6 text-amber-500" />}
          themeColor="amber"
          valueColor="text-amber-500"
          href="/trainee/training"
          sub={t('stats.mandatory_desc')}
          subColor="text-amber-500/60"
          delay={0}
        />
        <KPICard
          label="COURSES FINISHED"
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : completedCoursesCount}
          icon={<GraduationCap className="h-6 w-6 text-emerald-500" />}
          themeColor="emerald"
          valueColor="text-emerald-500"
          href="/trainee/certificates"
          sub="Verified Registry"
          subColor="text-emerald-500/60"
          delay={150}
        />
        <KPICard
          label="STUDY HOURS"
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : studyHours}
          icon={<Clock className="h-6 w-6 text-blue-500" />}
          themeColor="blue"
          valueColor="text-blue-500"
          href="/trainee/analytics"
          sub="Persistent Training Time"
          subColor="text-blue-500/60"
          delay={300}
        />
        <KPICard
          label="CRITICAL ALERTS"
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : safetyAlertCount}
          icon={
            safetyAlertCount > 0
              ? <AlertTriangle className="h-6 w-6 text-rose-500" />
              : <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          }
          themeColor={safetyAlertCount > 0 ? 'red' : 'emerald'}
          valueColor={safetyAlertCount > 0 ? 'text-rose-500' : 'text-emerald-500'}
          href={safetyAlertCount > 0 ? '#upcoming-events' : undefined}
          sub={safetyAlertCount > 0 ? 'Response Required' : 'System Clear'}
          subColor={safetyAlertCount > 0 ? 'text-rose-500/60' : 'text-emerald-500/60'}
          delay={450}
        />
      </div>

      {/* Industrial Intelligence Feed (Safety Tip) */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 group">
        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
        <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                 <Zap className="h-5 w-5 text-slate-900" />
              </div>
              <div>
                 <div className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.2em]">{t('tip.label')}</div>
                 <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Automated Intelligence Feed</div>
              </div>
           </div>
           <p className="flex-1 text-sm font-medium text-slate-300 leading-relaxed italic group-hover:text-white transition-colors">{`"${currentTip}"`}</p>
           <button
             type="button"
             onClick={() => setTipIndex((prev) => prev + 1)}
             aria-label="Show next safety tip"
             title="Show next safety tip"
             className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-90"
           >
             <RotateCcw className="h-4 w-4" />
           </button>
        </div>
      </div>

      {/* Quick Actions Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-white/5 bg-[#1e293b]/50 hover:bg-[#1e293b] hover:border-cyan-500/50 transition-all shadow-xl active:scale-95"
        >
          <Bot className="h-5 w-5 text-cyan-400" />
          <span className="text-xs font-black text-white uppercase tracking-widest">{t('dashboard.quick_actions.ai')}</span>
        </button>

        {[
          { icon: <GraduationCap className="h-5 w-5 text-amber-400" />, text: t('dashboard.quick_actions.browse'), href: '/trainee/training' },
          { icon: <Award className="h-5 w-5 text-emerald-400" />, text: t('dashboard.quick_actions.leaderboard'), href: '/trainee/leaderboard' },
        ].map((action) => (
          <Link
            key={action.text}
            href={action.href}
            className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-white/5 bg-[#1e293b]/50 hover:bg-[#1e293b] hover:border-white/10 transition-all shadow-xl active:scale-95"
          >
            {action.icon}
            <span className="text-xs font-black text-white uppercase tracking-widest">{action.text}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                🔄 {t('courses.active')}
                <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400">{activeCourses.length}</span>
              </h2>
              <Link href="/trainee/training" className="text-xs text-cyan-400 hover:text-cyan-300">
                {t('courses.view_all')}
              </Link>
            </div>

            {activeCourses.length > 0 ? (
              <div className="space-y-3">
                {activeCourses.map((course) => (
                  <div key={course.id} className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 transition-colors hover:border-cyan-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`h-11 w-11 flex-shrink-0 rounded-full bg-gradient-to-br ${course.theme} flex items-center justify-center text-lg`}>
                          {course.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white mb-1.5">{course.title}</div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <ProgressBar value={course.progress} height="h-1.5" className="bg-[#020817]" />
                            </div>
                            <div className={`text-xs font-bold ${course.progress >= 80 ? 'text-emerald-400' : course.progress >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                              {course.progress}%
                            </div>
                          </div>
                          <div className="mt-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                            {course.completedBlocks} / {course.blocks} {t('dashboard.courses.blocks')}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 sm:self-center border-t border-[#334155] sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0 mt-1 sm:mt-0">
                        <Link
                          href={`/trainee/course/${course.id}`}
                          className="flex items-center justify-center w-full sm:w-auto rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-[11px] font-semibold tracking-wider uppercase text-cyan-400 transition-colors hover:bg-cyan-500 hover:text-slate-900"
                        >
                          {t('courses.continue')}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#334155] bg-[#1e293b]/50 p-8 text-center text-sm text-slate-500">
                {t('dashboard.courses.no_active')}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                🆕 {t('dashboard.courses.assigned_count')}
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{assignedCourses.length}</span>
              </h2>
            </div>

            {assignedCourses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assignedCourses.map((course) => (
                  <div key={course.id} className="group rounded-xl border border-[#334155] bg-[#1e293b] p-4 transition-colors hover:border-amber-500/30">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br ${course.theme} flex items-center justify-center text-lg shadow-lg transition-transform group-hover:scale-110`}>
                        {course.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-white">{course.title}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{course.category}</div>
                      </div>
                    </div>
                    <Link
                      href="/trainee/training"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-400 transition-all group-hover:border-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-900"
                    >
                      {t('dashboard.courses.enroll_btn')}
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#334155] bg-[#1e293b]/50 p-8 text-center text-sm text-slate-500">
                {t('dashboard.courses.no_active')}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div id="upcoming-events" className="rounded-2xl border border-[#334155] bg-[#1e293b] p-5 shadow-xl scroll-mt-20">
            <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">📅 {t('events.title')}</span>
              {feed.upcomingEvents.length > 0 && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">{feed.upcomingEvents.length}</span>}
            </h3>
            <div className={`space-y-4 overflow-y-auto pr-2 custom-scrollbar ${feed.upcomingEvents.length > 5 ? 'max-h-[400px]' : ''}`}>
              {feed.upcomingEvents.length > 0 ? (
                feed.upcomingEvents.map((event) => {
                  const date = new Date(event.date);
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#020817]/40 border border-white/5 hover:border-cyan-500/30 transition-all group">
                      <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-[#334155] bg-[#020817] group-hover:border-cyan-500/30 transition-colors">
                        <span className="text-lg font-bold leading-none text-white">{date.getDate()}</span>
                        <span className="text-[9px] uppercase text-slate-500 font-black">{date.toLocaleString('en', { month: 'short' })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">{event.title}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{event.time}</div>
                      </div>
                      <span className={`rounded-xl px-2.5 py-1 text-[9px] font-black tracking-widest border ${
                        event.type === 'DRILL' || event.mandatory 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {event.mandatory ? 'URGENT' : event.type}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Clear</p>
                  <p className="text-[10px] text-slate-600 mt-1">No active alerts or events found</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#334155] bg-[#1e293b] p-5 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">🏆 {t('achievements.title')}</h3>
            <div className={`space-y-3 overflow-y-auto pr-2 custom-scrollbar ${feed.achievements.length > 5 ? 'max-h-[350px]' : ''}`}>
              {feed.achievements.length > 0 ? (
                feed.achievements.map((achievement) => (
                  <div key={achievement.id} className="group relative flex items-center gap-3 p-2 rounded-xl border border-transparent hover:bg-white/[0.02] transition-all">
                    <div className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center text-lg shadow-inner ${achievement.unlocked ? 'border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/10' : 'border border-[#334155] bg-[#020817]'}`}>
                      <span className={achievement.unlocked ? 'drop-shadow-sm' : 'grayscale opacity-40'}>{achievement.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-bold ${achievement.unlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                        {achievement.title}
                      </div>
                      {!achievement.unlocked && achievement.hint && (
                         <div className="text-[9px] text-slate-600 italic mt-0.5">{achievement.hint}</div>
                      )}
                    </div>
                    {achievement.unlocked ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <span className="text-[10px]">✅</span>
                      </div>
                    ) : (
                      <span className="text-xs opacity-20">🔒</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-600 text-center py-4 italic">No achievements available yet</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{unlockedAchievementCount} / {Math.max(4, feed.achievements.length)} Unlocked</div>
                <div className="text-[10px] font-black text-amber-500">{Math.round((unlockedAchievementCount / Math.max(1, feed.achievements.length)) * 100)}%</div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#020817] border border-white/5 shadow-inner">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(unlockedAchievementCount / Math.max(1, feed.achievements.length)) * 100}%` }}
                   className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TraineeDashboardPage() {
  return (
    <TraineeLayout>
      <TraineeDashboardContent />
    </TraineeLayout>
  );
}
