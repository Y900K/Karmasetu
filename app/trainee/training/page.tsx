'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import { useToast } from '@/components/admin/shared/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAPI } from '@/lib/hooks/useAPI';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';

type TraineeCourse = {
  id: string;
  title: string;
  category: string;
  level: string;
  blocks: number;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  deadline: string;
  icon: string;
  thumbnail?: string;
  thumbnailMeta?: Record<string, unknown>;
  theme: string;
  videoUrl?: string;
  pdfUrl?: string;
  completedBlocks: number;
  passingScore: number;
  lastAccessedAt?: string;
  isArchived?: boolean;
};

function TrainingContent() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();
  const {
    data: overviewData,
    error: overviewError,
    isLoading,
    mutate: mutateCourses,
  } = useAPI<{ ok: boolean; courses: TraineeCourse[] }>('/api/trainee/training/overview');

  const courses = useMemo(() => {
    return overviewData?.ok && Array.isArray(overviewData.courses) ? overviewData.courses : [];
  }, [overviewData]);

  const [selectedId, setSelectedId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (courses.length === 0) {
      if (!isLoading) {
        setSelectedId('');
      }
      return;
    }

    const stillExists = courses.some((course) => course.id === selectedId);
    if (!selectedId || !stillExists) {
      setSelectedId(courses[0].id);
    }
  }, [courses, isLoading, selectedId]);

  const selected = useMemo(
    () => courses.find((course) => course.id === selectedId) || courses[0] || null,
    [courses, selectedId]
  );

  const activeCourses = courses.filter((course) => course.status === 'In Progress');
  const assignedCourses = courses.filter((course) => course.status === 'Not Started');
  const completedCourses = courses.filter((course) => course.status === 'Completed');

  const getActionButtonConfig = (status: TraineeCourse['status']) => {
    switch (status) {
      case 'Completed':
        return {
          text: t('training.action.review'),
          color: 'bg-emerald-500 hover:bg-emerald-400',
        };
      case 'In Progress':
        return {
          text: t('training.action.resume'),
          color: 'bg-cyan-500 hover:bg-cyan-400',
        };
      default:
        return {
          text: t('training.action.enroll'),
          color: 'bg-[#00c8ff] hover:bg-[#33d4ff]',
        };
    }
  };

  const actionConfig = selected ? getActionButtonConfig(selected.status) : getActionButtonConfig('Not Started');

  const handleCourseAction = async () => {
    if (!selected) return;

    if (selected.status === 'Not Started') {
      setIsEnrolling(true);
      try {
        const response = await fetch(`/api/trainee/enrollments/${encodeURIComponent(selected.id)}`, {
          method: 'POST',
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'Failed to enroll in course.');
        }

        await mutateCourses();
        showToast(`Enrolled in ${selected.title}!`, 'success');
        // We keep isEnrolling true while we start the navigation transition
      } catch (error) {
        setIsEnrolling(false);
        showToast(error instanceof Error ? error.message : 'Failed to enroll.', 'error');
        return;
      }
    }

    startTransition(() => {
      // router.push is handled by useTransition's isPending state
      router.push(`/trainee/course/${selected.id}`);
    });
    
    // Safety clear for isEnrolling if it was set
    if (selected.status === 'Not Started') {
       setTimeout(() => setIsEnrolling(false), 5000); 
    }
  };

  const CourseItem = ({ course }: { course: TraineeCourse }) => {
    const isSelected = course.id === selectedId;
    const isArchived = course.isArchived;

    return (
      <button
        onClick={() => setSelectedId(course.id)}
        className={`w-full text-left flex gap-3 px-4 py-3 transition-colors cursor-pointer ${
          isSelected
            ? 'bg-cyan-500/[0.08] border-l-[3px] border-cyan-500'
            : 'border-l-[3px] border-transparent hover:bg-white/[0.03]'
        } ${isArchived ? 'opacity-60 grayscale-[50%]' : ''}`}
      >
        <div className="relative flex-shrink-0">
          <div
            className={`h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-sm shadow-sm overflow-hidden opacity-90 ${isArchived ? 'from-slate-600 to-slate-800 text-slate-400' : course.theme}`}
          >
            {course.thumbnail ? (
              <Image 
                src={course.thumbnail} 
                alt={course.title} 
                width={36} 
                height={36} 
                className="w-full h-full object-cover"
              />
            ) : (
              course.icon
            )}
          </div>
          {course.status === 'Not Started' && !isArchived && (
            <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#0f172a] border border-white/10 flex items-center justify-center text-slate-500 shadow-xl">
              <Lock className="h-2.5 w-2.5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white line-clamp-2 leading-snug">{course.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-tighter">{course.category}</span>
            {isArchived && <span className="text-[9px] px-1 py-0.5 rounded-sm bg-slate-800 text-slate-400 uppercase tracking-tighter border border-slate-700">Archived</span>}
            {course.status === 'Completed' ? (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="h-2 w-2" /> DONE
              </span>
            ) : course.status === 'In Progress' ? (
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-tighter">Active</span>
            ) : (
              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Locked</span>
            )}
          </div>
          {course.progress > 0 && course.progress < 100 && (
            <ProgressBar value={course.progress} height="h-0.5" className="mt-1.5" />
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('training.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">{t('training.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 border border-[#1e293b] rounded-2xl overflow-hidden bg-[#0f172a] shadow-2xl">
        <div className="w-full lg:w-[300px] lg:min-w-[300px] border-b lg:border-b-0 lg:border-r border-[#1e293b] overflow-y-auto max-h-[calc(100vh-200px)] bg-[#0a1120]">
          {activeCourses.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-3 text-[10px] text-cyan-400 uppercase tracking-widest font-bold bg-cyan-500/[0.03] flex items-center justify-between">
                <span>{t('training.modules.active')}</span>
                <span className="h-4 w-4 rounded bg-cyan-500/20 flex items-center justify-center text-[9px]">
                  {activeCourses.length}
                </span>
              </div>
              {activeCourses.map((course) => (
                <CourseItem key={course.id} course={course} />
              ))}
            </div>
          )}

          {assignedCourses.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-3 text-[10px] text-amber-400 uppercase tracking-widest font-bold bg-amber-500/[0.03] flex items-center justify-between">
                <span>{t('training.modules.assigned')}</span>
                <span className="h-4 w-4 rounded bg-amber-500/20 flex items-center justify-center text-[9px]">
                  {assignedCourses.length}
                </span>
              </div>
              {assignedCourses.map((course) => (
                <CourseItem key={course.id} course={course} />
              ))}
            </div>
          )}

          {completedCourses.length > 0 && (
            <div>
              <div className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.02] flex items-center justify-between">
                <span>{t('training.modules.completed')}</span>
                <span className="h-4 w-4 rounded bg-white/10 flex items-center justify-center text-[9px]">
                  {completedCourses.length}
                </span>
              </div>
              {completedCourses.map((course) => (
                <CourseItem key={course.id} course={course} />
              ))}
            </div>
          )}

          {!isLoading && courses.length === 0 && !overviewError && (
            <div className="px-4 py-10 text-sm text-slate-500 text-center">
              No courses available right now.
            </div>
          )}
        </div>

        <div className="flex-1 p-6 sm:p-10 overflow-y-auto max-h-[calc(100vh-200px)] bg-gradient-to-b from-[#0f172a] to-[#020817]">
          {isLoading && courses.length === 0 ? (
            <div className="bg-[#1e293b] rounded-2xl p-10 border border-[#334155] text-center shadow-2xl text-slate-400">
              Loading your assigned courses...
            </div>
          ) : overviewError && courses.length === 0 ? (
            <div className="bg-[#1e293b] rounded-2xl p-10 border border-red-500/20 text-center shadow-2xl text-red-300">
              {overviewError.message || 'Failed to load your training dashboard.'}
            </div>
          ) : !selected ? (
            <div className="bg-[#1e293b] rounded-2xl p-10 border border-[#334155] text-center shadow-2xl text-slate-400">
              No courses available.
            </div>
          ) : (
            <>
              <div className="mb-8 p-6 bg-[#1e293b]/30 rounded-2xl border border-[#334155]/50 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-black text-white leading-tight">{selected.title}</h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge variant="cyan">{selected.category}</Badge>
                      <Badge variant={
                        selected.level === 'Beginner' ? 'green' : 
                        selected.level === 'Intermediate' ? 'amber' : 'red'
                      }>
                        {selected.level}
                      </Badge>
                    </div>
                  </div>
                  <div
                    className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${selected.theme} flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/10 overflow-hidden relative`}
                  >
                    {selected.thumbnail ? (
                      <Image 
                        src={selected.thumbnail} 
                        alt={selected.title} 
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <span className="relative z-10">{selected.icon}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2 mt-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>
                      {selected.completedBlocks} of {selected.blocks} {t('dashboard.courses.blocks')} {t('dashboard.completed')}
                    </span>
                    <span className="text-white font-bold">{selected.progress}%</span>
                  </div>
                  <ProgressBar value={selected.progress} height="h-2" className="bg-slate-800" />
                </div>
              </div>

              <div className="bg-[#1e293b] rounded-2xl p-10 border border-[#334155] text-center shadow-2xl relative overflow-hidden group">
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${selected.theme} opacity-[0.03] blur-3xl group-hover:opacity-[0.08] transition-opacity`}
                />

                <div className="w-20 h-20 bg-[#0f172a] border border-[#334155] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10 overflow-hidden">
                  {selected.thumbnail ? (
                    <Image 
                      src={selected.thumbnail} 
                      alt={selected.title} 
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-4xl">{selected.icon}</span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white mb-3 relative z-10">
                  {selected.status === 'Not Started'
                    ? t('training.viewer.ready')
                    : selected.status === 'Completed'
                    ? t('training.viewer.review')
                    : t('training.viewer.active')}
                </h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-10 leading-relaxed relative z-10">
                  {selected.status === 'Not Started'
                    ? t('training.viewer.desc_start')
                    : t('training.viewer.desc_continue')}
                </p>

                <button
                  className={`group inline-flex items-center gap-4 px-10 py-4 ${selected.isArchived ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : actionConfig.color + ' text-[#0d1b2a] hover:-translate-y-1 active:scale-95'} font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl transition-all relative z-10`}
                  onClick={handleCourseAction}
                  disabled={isLoading || isPending || isEnrolling || selected.isArchived}
                >
                  <span>{selected.isArchived ? 'Course Archived' : (isPending || isEnrolling) ? t('training.modules.active') + '...' : actionConfig.text}</span>
                  {!selected.isArchived && (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    {(isPending || isEnrolling) ? (
                      <div className="h-3.5 w-3.5 border-2 border-[#0d1b2a] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function TraineeTrainingPage() {
  return (
    <TraineeLayout>
      <TrainingContent />
    </TraineeLayout>
  );
}
