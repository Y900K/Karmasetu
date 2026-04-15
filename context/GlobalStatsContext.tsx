'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAPI } from '@/lib/hooks/useAPI';

export type TraineeCourse = {
  id: string;
  title: string;
  category: string;
  level: string;
  blocks: number;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  deadline: string;
  icon: string;
  theme: string;
  videoUrl?: string;
  pdfUrl?: string;
  videoUrls?: string[];
  pdfUrls?: string[];
  completedBlocks: number;
  quiz?: Array<{ q: string; options: string[]; correct: number }>;
  passingScore: number;
  lastAccessedAt?: string;
  studyTimeMs?: number;
};

type GlobalStats = {
  // Trainee Specific
  courses: TraineeCourse[];
  activeCourses: TraineeCourse[];
  assignedCourses: TraineeCourse[];
  totalEnrollmentCount: number;
  totalAssignedCourses: number;
  completedCoursesCount: number;
  certificateCount: number;
  averageProgress: number;
  totalStudyTimeMs: number;
  resumeCourse: TraineeCourse | null;
  
  // Admin Specific
  adminStats?: {
    totalTrainees: number;
    activeCourses: number;
    validCertificates: number;
    compliance: string;
    overdueTrainees: number;
    overdueList: Array<{ name: string; dept: string; course: string; daysOverdue: number }>;
    totalCourses: number;
    distribution: Array<{ name: string; value: number; color: string }>;
    completionRates: Array<{ name: string; value: number }>;
    deptCompliance: Array<{ name: string; compliance: number }>;
    performanceInsights: Array<{ value: string; label: string; color: string }>;
  };

  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<unknown>;
};

const GlobalStatsContext = createContext<GlobalStats | undefined>(undefined);

export function GlobalStatsProvider({ children, scope = 'auto' }: { children: ReactNode; scope?: 'auto' | 'admin' | 'trainee' }) {
  const pathname = usePathname();
  const isAdmin =
    scope === 'admin'
      ? true
      : scope === 'trainee'
      ? false
      : pathname.startsWith('/admin') || pathname === '/dashboard';
  
  const endpoint = isAdmin ? '/api/admin/overview/stats' : '/api/trainee/training/overview';
  const { data, isLoading, isValidating, mutate } = useAPI<{
    ok: boolean;
    stats?: GlobalStats['adminStats'];
    courses?: TraineeCourse[];
    certificateCount?: number;
    totalEnrollmentCount?: number;
    totalCompletedCount?: number;
    totalStudyTimeMs?: number;
  }>(
    endpoint,
    isAdmin
      ? {
          refreshInterval: 15_000,
          dedupingInterval: 5_000,
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
        }
      : undefined
  );

  const courses = useMemo(() => {
    return !isAdmin && data?.ok && Array.isArray(data.courses) ? data.courses : [];
  }, [isAdmin, data]);

  const {
    activeCourses,
    assignedCourses,
    completedCourses,
    visibleCourseCount,
    averageProgress,
    resumeCourse,
  } = useMemo(() => {
    const nextActive = courses.filter((c) => c.status === 'In Progress');
    const nextAssigned = courses.filter((c) => c.status === 'Not Started');
    const nextCompleted = courses.filter((c) => c.status === 'Completed');
    
    const avgProgress = courses.length > 0
      ? Math.round(courses.reduce((sum: number, course) => sum + course.progress, 0) / courses.length)
      : 0;

    const nextResumeCourse =
      nextActive.length > 0
        ? [...nextActive].sort((a, b) => {
            const aTs = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
            const bTs = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
            return bTs - aTs;
          })[0]
        : nextAssigned[0] || null;

    return {
      activeCourses: nextActive,
      assignedCourses: nextAssigned,
      completedCourses: nextCompleted,
      visibleCourseCount: courses.length,
      averageProgress: avgProgress,
      resumeCourse: nextResumeCourse,
    };
  }, [courses]);

  const certificateCount = data?.ok && typeof data.certificateCount === 'number' ? data.certificateCount : completedCourses.length;
  const totalEnrollmentCount =
    !isAdmin && data?.ok && typeof data.totalEnrollmentCount === 'number'
      ? data.totalEnrollmentCount
      : visibleCourseCount;
  const totalAssignedCourses = totalEnrollmentCount;
  const completedCoursesCount =
    !isAdmin && data?.ok && typeof data.totalCompletedCount === 'number'
      ? data.totalCompletedCount
      : completedCourses.length;
  const totalStudyTimeMs =
    !isAdmin && data?.ok && typeof data.totalStudyTimeMs === 'number'
      ? data.totalStudyTimeMs
      : courses.reduce((sum, course) => sum + (typeof course.studyTimeMs === 'number' ? course.studyTimeMs : 0), 0);
  const adminStats = isAdmin && data?.ok ? data.stats : undefined;

  return (
    <GlobalStatsContext.Provider
      value={{
        courses,
        activeCourses,
        assignedCourses,
        totalEnrollmentCount,
        totalAssignedCourses,
        completedCoursesCount,
        certificateCount,
        averageProgress,
        totalStudyTimeMs,
        resumeCourse,
        adminStats,
        isLoading,
        isValidating,
        mutate,
      }}
    >
      {children}
    </GlobalStatsContext.Provider>
  );
}

export function useGlobalStats() {
  const context = useContext(GlobalStatsContext);
  if (context === undefined) {
    throw new Error('useGlobalStats must be used within a GlobalStatsProvider');
  }
  return context;
}
