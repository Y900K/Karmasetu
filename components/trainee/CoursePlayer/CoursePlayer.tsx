'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { Course, COURSE_REGISTRY } from '@/data/coursePlayerDummyData';
import { useLanguage } from '@/context/LanguageContext';
import PlayerTopBar from './PlayerTopBar';
import CourseSidebar from './CourseSidebar';
import MobileDrawer from './MobileDrawer';
import SidebarContent from './SidebarContent';
import VideoView from './VideoView';
import PDFView from './PDFView';
import QuizView from './QuizView';
import QuizResults from './QuizResults';
import CourseOverview from './CourseOverview';
import { calculateCourseEstimate } from '@/lib/utils/courseMath';

type FullscreenDocumentLike = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElementLike = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getInitialLessonId(course: Course | null) {
  if (!course || course.lessons.length === 0) {
    return null;
  }

  return (
    course.lessons.find((lesson) => !lesson.locked && !lesson.completed)?.id ||
    course.lessons.find((lesson) => !lesson.locked)?.id ||
    course.lessons[0].id
  );
}

function getInitialDocId(course: Course | null) {
  if (!course || course.documents.length === 0) {
    return null;
  }

  return course.documents[0].id;
}

function getInitialView(course: Course | null): 'video' | 'pdf' | 'quiz' {
  if (!course) {
    return 'video';
  }

  if (course.lessons.length > 0) {
    return 'video';
  }

  if (course.documents.length > 0) {
    return 'pdf';
  }

  return 'quiz';
}

function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col overflow-hidden">
      {/* Top Bar Skeleton */}
      <div className="h-[52px] bg-[#1b263b] border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-48 bg-white/5 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-white/5 animate-pulse" />
        </div>
      </div>
      
      <div className="flex-1 flex">
        {/* Main Content Area Skeleton */}
        <div className="flex-1 p-4 sm:p-8 lg:pr-[350px]">
          <div className="aspect-video w-full rounded-2xl bg-[#1b263b]/50 animate-pulse border border-white/5 overflow-hidden flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          </div>
          <div className="mt-8 space-y-4">
            <div className="h-8 w-3/4 bg-white/5 animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded" />
            <div className="pt-4 space-y-2">
              <div className="h-4 w-full bg-white/5 animate-pulse rounded" />
              <div className="h-4 w-full bg-white/5 animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton (Desktop Only) */}
        <div className="hidden lg:block fixed right-0 top-[52px] bottom-0 w-[350px] border-l border-white/5 bg-[#1b263b]/40 p-4 space-y-4">
          <div className="h-10 w-full bg-white/5 animate-pulse rounded-xl" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoursePlayer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { language } = useLanguage();
  const registryCourse = COURSE_REGISTRY[courseId] || null;

  const [course, setCourse] = useState<Course | null>(registryCourse);
  const [isLoadingCourse, setIsLoadingCourse] = useState(!registryCourse);
  const [courseLoadError, setCourseLoadError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'video' | 'pdf' | 'quiz' | 'quiz-results'>(() => getInitialView(registryCourse));
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => getInitialLessonId(registryCourse));
  const [activeDocId, setActiveDocId] = useState<string | null>(() => getInitialDocId(registryCourse));
  const [viewedDocIds, setViewedDocIds] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'videos' | 'docs' | 'quiz'>(() =>
    registryCourse?.lessons.length
      ? 'videos'
      : registryCourse?.documents.length
      ? 'docs'
      : 'quiz'
  );
  const [sidebarOpenDesktop, setSidebarOpenDesktop] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [certNo, setCertNo] = useState<string | null>(null);
  const [isFirstAttempt, setIsFirstAttempt] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showOverview, setShowOverview] = useState(false);
  const [hasCheckedInitialProgress, setHasCheckedInitialProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const studySyncAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let ignore = false;

    setCourse(registryCourse);
    setIsLoadingCourse(!registryCourse);
    setCurrentView(getInitialView(registryCourse));
    setActiveDocId(getInitialDocId(registryCourse));
    setViewedDocIds([]);
    setSidebarTab(
      registryCourse?.lessons.length
        ? 'videos'
        : registryCourse?.documents.length
        ? 'docs'
        : 'quiz'
    );
    setActiveLessonId(getInitialLessonId(registryCourse));
    setIsFirstAttempt(false);
    setUserAnswers({});
    studySyncAtRef.current = Date.now();

    if (registryCourse) {
      return;
    }

    async function loadCourse() {
      try {
        const response = await fetch(`/api/trainee/training/course/${encodeURIComponent(courseId)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.ok || !data?.course) {
          throw new Error(data?.message || 'This course could not be loaded.');
        }

        if (ignore) {
          return;
        }

        const loadedCourse = data.course as Course;
        setCourse(loadedCourse);
        setViewedDocIds(loadedCourse.viewedDocIds || []);
        
        // Restore Last Work Bookmark
        if (loadedCourse.lastActiveModuleId) {
          const isLesson = loadedCourse.lessons.some(l => l.id === loadedCourse.lastActiveModuleId);
          const isDoc = loadedCourse.documents.some(d => d.id === loadedCourse.lastActiveModuleId);
          
          if (isLesson) {
            setActiveLessonId(loadedCourse.lastActiveModuleId);
            setCurrentView('video');
            setSidebarTab('videos');
          } else if (isDoc) {
            setActiveDocId(loadedCourse.lastActiveModuleId);
            setCurrentView('pdf');
            setSidebarTab('docs');
          }
        } else {
          setActiveLessonId(getInitialLessonId(loadedCourse));
          setActiveDocId(getInitialDocId(loadedCourse));
          setCurrentView(getInitialView(loadedCourse));
          setSidebarTab(loadedCourse.lessons.length > 0 ? 'videos' : loadedCourse.documents.length > 0 ? 'docs' : 'quiz');
        }

        if (loadedCourse.lastActiveView === 'quiz') {
          setCurrentView('quiz');
          setSidebarTab('quiz');
        }

        setUserAnswers({});

        // Check if course is just starting
        const completedLessons = loadedCourse.lessons.filter(l => l.completed).length;
        const viewedDocs = loadedCourse.viewedDocIds?.length || 0;
        if (completedLessons === 0 && viewedDocs === 0 && !hasCheckedInitialProgress && !loadedCourse.lastActiveModuleId) {
          setShowOverview(true);
        }
        setHasCheckedInitialProgress(true);
      } catch (error) {
        if (ignore) {
          return;
        }

        setCourse(null);
        setCourseLoadError(error instanceof Error ? error.message : 'This course could not be loaded.');
      } finally {
        if (!ignore) {
          setIsLoadingCourse(false);
        }
      }
    }

    void loadCourse();

    return () => {
      ignore = true;
    };
  }, [courseId, registryCourse, hasCheckedInitialProgress]);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    if (isLoadingCourse) {
      document.title = 'Opening Course | KarmaSetu';
      return () => {
        document.title = 'KarmaSetu';
      };
    }

    if (course) {
      document.title = `${course.title} | KarmaSetu`;
    } else {
      redirectTimer = setTimeout(() => router.push('/trainee/training'), 2500);
    }

    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }

      document.title = 'KarmaSetu';
    };
  }, [course, isLoadingCourse, router]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fsDoc = document as FullscreenDocumentLike;
      setIsFullscreen(Boolean(document.fullscreenElement || fsDoc.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  if (isLoadingCourse) {
    return <CourseSkeleton />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-2xl font-bold mb-6 border border-red-500/20">
          404
        </div>
        <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
        <p className="text-slate-400 mb-3 max-w-sm">
          The course you are looking for does not exist or has not been assigned to you yet.
        </p>
        {courseLoadError ? (
          <p className="text-sm text-amber-400/90 mb-8 max-w-md">{courseLoadError}</p>
        ) : (
          <div className="mb-8" />
        )}
        <button
          onClick={() => router.push('/trainee/training')}
          className="px-8 py-3 bg-cyan-500 text-[#0d1b2a] font-bold rounded-xl active:scale-95 transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const completedLessonsCount = course.lessons.filter((lesson) => lesson.completed).length;
  const progressCourseId = course.id || courseId;
  const fallbackContentView: 'video' | 'pdf' | 'quiz' =
    course.lessons.length > 0 ? 'video' : course.documents.length > 0 ? 'pdf' : 'quiz';

  const estimatedDuration = calculateCourseEstimate({
    videoDurations: course.lessons.map(l => l.duration),
    documentsCount: course.documents.length,
    quizQuestionsCount: course.quiz.questions.length
  });

  if (showOverview) {
    return (
      <CourseOverview 
        course={course} 
        onBegin={() => setShowOverview(false)} 
        estimatedDuration={estimatedDuration}
      />
    );
  }

  const persistProgress = async (options: {
    progressPct?: number;
    completedBlocks?: number;
    score?: number;
    studyTimeMsIncrement?: number;
    viewedDocIds?: string[];
    videoCurrentTime?: number;
    lastActiveModuleId?: string;
    lastActiveView?: 'video' | 'pdf' | 'quiz' | 'quiz-results';
    quizAttempt?: { score: number; passed: boolean; reason: 'manual' | 'auto_timeout' };
    courseFeedback?: { rating: number; comment: string };
  }, retryCount = 0): Promise<string | undefined> => {
    try {
      setSyncStatus('syncing');
      const now = Date.now();
      const elapsedMs = Math.max(0, now - studySyncAtRef.current);
      studySyncAtRef.current = now;
      
      const res = await fetch(`/api/trainee/enrollments/${encodeURIComponent(progressCourseId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...options,
          lastActiveModuleId: options.lastActiveModuleId || activeLessonId || activeDocId,
          lastActiveView: (options.lastActiveView || currentView) === 'quiz-results' ? 'quiz' : (options.lastActiveView || currentView),
          studyTimeMsIncrement: Math.min(elapsedMs, 60 * 60 * 1000),
        }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Sync failed');
      }

      setSyncStatus('synced');
      
      // Instantly refresh dashboards and stats across tabs/windows
      mutate('/api/trainee/training/overview');
      mutate('/api/trainee/training/stats');
      mutate('/api/trainee/certificates');

      if (data.certNo) {
        setCertNo(data.certNo);
        return data.certNo;
      }
    } catch (err) {
      console.error('Progress sync error:', err);
      
      if (retryCount < 3) {
        // Linear backoff retry
        const delay = (retryCount + 1) * 2000;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(persistProgress(options, retryCount + 1));
          }, delay);
        });
      }
      
      setSyncStatus('error');
      // Keep the player responsive even if background progress sync fails.
      return undefined;
    }
  };

  const handleMarkComplete = (lessonId: string) => {
    if (!course) return;

    const currentIdx = course.lessons.findIndex((lesson) => lesson.id === lessonId);
    
    setCourse((prev) => {
      if (!prev) return null;
      
      const newLessons = prev.lessons.map((lesson, idx) => {
        if (lesson.id === lessonId) {
          return { ...lesson, completed: true };
        }
        // Unlock next lesson
        if (idx === currentIdx + 1) {
          return { ...lesson, locked: false };
        }
        return lesson;
      });

      const nextCourse = { ...prev, lessons: newLessons };
      
      const totalBlocks = nextCourse.lessons.length + nextCourse.documents.length;
      const completedCount = nextCourse.lessons.filter(l => l.completed).length + viewedDocIds.length;
      const nextProgressPct = Math.round((completedCount / Math.max(1, totalBlocks)) * 100);

      void persistProgress({ 
        progressPct: nextProgressPct, 
        completedBlocks: completedCount,
        lastActiveModuleId: lessonId
      });
      
      return nextCourse;
    });

    if (currentIdx + 1 < course.lessons.length) {
      setTimeout(() => {
        setActiveLessonId(course.lessons[currentIdx + 1].id);
      }, 500);
    } else if (course.documents.length > 0) {
      setTimeout(() => {
        setSidebarTab('docs');
      }, 500);
    }
  };

  const handleSelectLesson = (id: string) => {
    setActiveLessonId(id);
    setCurrentView('video');
    setSidebarOpenMobile(false);
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    setViewedDocIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      const totalBlocks = course.lessons.length + course.documents.length;
      const completedCount = completedLessonsCount + next.length;
      const nextProgressPct = Math.round((completedCount / Math.max(1, totalBlocks)) * 100);
      
      void persistProgress({ 
        progressPct: nextProgressPct, 
        completedBlocks: completedCount, 
        viewedDocIds: next,
        lastActiveModuleId: id
      });
      return next;
    });
    setCurrentView('pdf');
    setSidebarOpenMobile(false);
  };

  const handleStartQuiz = () => {
    setCurrentView('quiz');
    setSidebarOpenMobile(false);
  };

  const handleQuizComplete = (score: number, passed: boolean, _reason: 'manual' | 'auto_timeout' = 'manual', answers: Record<number, number> = {}) => {
    setUserAnswers(answers);
    const percentScore = Math.round((score / Math.max(1, course.quiz.questions.length)) * 100);
    
    setCourse((prev) => {
      if (!prev) return null;
      return { ...prev, quiz: { ...prev.quiz, attempted: true, score, passed } };
    });

    const totalBlocks = course.lessons.length + course.documents.length;
    const completedCount = completedLessonsCount + viewedDocIds.length;
    const baseProgress = Math.round((completedCount / Math.max(1, totalBlocks)) * 100);

    if (passed) {
      void persistProgress({ 
        progressPct: 100, 
        completedBlocks: totalBlocks, 
        score: percentScore,
        quizAttempt: { score: percentScore, passed: true, reason: 'manual' }
      });
    } else {
      void persistProgress({ 
        progressPct: baseProgress, 
        completedBlocks: completedCount, 
        score: percentScore,
        quizAttempt: { score: percentScore, passed: false, reason: 'manual' }
      });
    }

    setCurrentView('quiz-results');
  };

  const currentLessonIndex = course.lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const currentDocIndex = course.documents.findIndex((doc) => doc.id === activeDocId);
  
  const handleAbsolutePrevious = () => {
    if (currentView === 'pdf') {
      if (currentDocIndex > 0) {
        setActiveDocId(course.documents[currentDocIndex - 1].id);
      } else if (course.lessons.length > 0) {
        setCurrentView('video');
        setSidebarTab('videos');
        setActiveLessonId(course.lessons[course.lessons.length - 1].id);
      }
    } else if (currentView === 'quiz') {
      if (course.documents.length > 0) {
        setCurrentView('pdf');
        setSidebarTab('docs');
        setActiveDocId(course.documents[course.documents.length - 1].id);
      } else if (course.lessons.length > 0) {
        setCurrentView('video');
        setSidebarTab('videos');
        setActiveLessonId(course.lessons[course.lessons.length - 1].id);
      }
    } else if (currentView === 'video') {
      if (currentLessonIndex > 0) {
        setActiveLessonId(course.lessons[currentLessonIndex - 1].id);
      }
    }
  };

  const handleAbsoluteNext = () => {
    if (currentView === 'video') {
      if (currentLessonIndex < course.lessons.length - 1) {
        setActiveLessonId(course.lessons[currentLessonIndex + 1].id);
      } else if (course.documents.length > 0) {
        setCurrentView('pdf');
        setSidebarTab('docs');
        handleSelectDoc(course.documents[0].id);
      } else {
        setCurrentView('quiz');
        setSidebarTab('quiz');
      }
    } else if (currentView === 'pdf') {
      if (currentDocIndex < course.documents.length - 1) {
        handleSelectDoc(course.documents[currentDocIndex + 1].id);
      } else {
        setCurrentView('quiz');
        setSidebarTab('quiz');
      }
    }
  };

  const toggleFullscreen = () => {
    const fsDoc = document as FullscreenDocumentLike;
    const fsEl = document.documentElement as FullscreenElementLike;

    if (!document.fullscreenElement && !fsDoc.webkitFullscreenElement) {
      if (fsEl.requestFullscreen) void fsEl.requestFullscreen();
      else if (fsEl.webkitRequestFullscreen) void fsEl.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) void document.exitFullscreen();
      else if (fsDoc.webkitExitFullscreen) void fsDoc.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  const sidebarContent = (
    <SidebarContent
      course={course}
      activeTab={sidebarTab}
      setActiveTab={setSidebarTab}
      activeLessonId={activeLessonId}
      activeDocId={activeDocId}
      onSelectLesson={handleSelectLesson}
      onSelectDoc={handleSelectDoc}
      onStartQuiz={handleStartQuiz}
      completedLessonsCount={completedLessonsCount}
      viewedDocIds={viewedDocIds}
    />
  );

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white flex flex-col font-sans overflow-hidden fixed top-0 left-0 right-0 bottom-0 z-[1000]">
      <PlayerTopBar
        courseTitle={course.title}
        instructor={course.instructor ? `${course.instructor} (${course.instructorRole || 'Lead'})` : undefined}
        category={course.category}
        completedLessons={completedLessonsCount}
        totalLessons={course.lessons.length}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        syncStatus={syncStatus}
        onRetrySync={() => persistProgress({})}
      />

      <div className="flex-1 mt-[52px] flex relative h-[calc(100vh-52px)]">
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out p-4 sm:p-8 ${
            sidebarOpenDesktop && currentView !== 'quiz' && currentView !== 'quiz-results'
              ? 'lg:pr-[350px]'
              : 'pr-4 sm:pr-8'
          }`}
        >
          {currentView === 'video' && activeLessonId && (
            <VideoView
              key={activeLessonId}
              lesson={course.lessons.find((lesson) => lesson.id === activeLessonId)!}
              onMarkComplete={handleMarkComplete}
              onPrevious={handleAbsolutePrevious}
              onNext={handleAbsoluteNext}
              hasPrevious={currentLessonIndex > 0}
              hasNext={currentLessonIndex < course.lessons.length - 1 || course.documents.length > 0 || !course.quiz.passed}
              language={language}
              totalLessons={course.lessons.length}
              currentLessonIndex={currentLessonIndex}
              hasDocs={course.documents.length > 0}
              videoCurrentTime={course.videoCurrentTime}
              onUpdatePartialProgress={(pct, time) => {
                // Throttle intense time updates
                persistProgress({ videoCurrentTime: time, lastActiveModuleId: activeLessonId || undefined });
              }}
            />
          )}

          {currentView === 'pdf' && activeDocId && (
            <PDFView 
              document={course.documents.find((documentItem) => documentItem.id === activeDocId)!} 
              onPrevious={handleAbsolutePrevious}
              onNext={handleAbsoluteNext}
              hasPrevious={true} 
              hasNext={currentDocIndex < course.documents.length - 1 || !!course.quiz}
              isLastDoc={currentDocIndex === course.documents.length - 1}
              language={language}
            />
          )}

          {currentView === 'quiz' && (
            <QuizView
              course={course}
              onComplete={handleQuizComplete}
              onExit={() => setCurrentView(fallbackContentView)}
            />
          )}

          {currentView === 'quiz-results' && (
            <QuizResults
              course={course}
              score={course.quiz.score || 0}
              passed={course.quiz.passed}
              certNo={certNo}
              isFirstAttempt={isFirstAttempt}
              userAnswers={userAnswers}
              onRetake={() => setCurrentView('quiz')}
              onBackToCourse={() => setCurrentView(fallbackContentView)}
              onSubmitFeedback={async (rating, comment) => {
                await persistProgress({ courseFeedback: { rating, comment } });
              }}
            />
          )}
        </div>

        {currentView !== 'quiz' && currentView !== 'quiz-results' && (
          <>
            <CourseSidebar
              isOpen={sidebarOpenDesktop}
              onToggle={() => setSidebarOpenDesktop(!sidebarOpenDesktop)}
            >
              {sidebarContent}
            </CourseSidebar>

            <MobileDrawer isOpen={sidebarOpenMobile} onClose={() => setSidebarOpenMobile(false)}>
              {sidebarContent}
            </MobileDrawer>
          </>
        )}
      </div>

      {currentView !== 'quiz' && currentView !== 'quiz-results' && !sidebarOpenMobile && (
        <button
          onClick={() => setSidebarOpenMobile(true)}
          className="lg:hidden fixed bottom-6 right-6 bg-[#00c8ff] text-[#0d1b2a] px-5 py-3 rounded-full font-bold shadow-[0_4px_16px_rgba(0,200,255,0.4)] flex items-center gap-2 z-40 transition-transform active:scale-95"
        >
          <span className="text-xl leading-none">+</span>
          <span>Lessons</span>
        </button>
      )}
    </div>
  );
}
