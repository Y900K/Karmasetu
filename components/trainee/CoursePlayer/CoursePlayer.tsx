'use client';

import React, { useEffect, useState } from 'react';
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
  const [showOverview, setShowOverview] = useState(false);
  const [hasCheckedInitialProgress, setHasCheckedInitialProgress] = useState(false);

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
        setActiveLessonId(getInitialLessonId(loadedCourse));
        setActiveDocId(getInitialDocId(loadedCourse));
        setCurrentView(getInitialView(loadedCourse));
        setSidebarTab(loadedCourse.lessons.length > 0 ? 'videos' : loadedCourse.documents.length > 0 ? 'docs' : 'quiz');

        // Check if course is just starting
        const completedLessons = loadedCourse.lessons.filter(l => l.completed).length;
        const viewedDocs = loadedCourse.viewedDocIds?.length || 0;
        if (completedLessons === 0 && viewedDocs === 0 && !hasCheckedInitialProgress) {
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
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Opening Course</h2>
        <p className="text-slate-400 max-w-md">
          Loading the latest training content for this course.
        </p>
      </div>
    );
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
    viewedDocIds?: string[];
    quizAttempt?: { score: number; passed: boolean; reason: 'manual' | 'auto_timeout' };
    courseFeedback?: { rating: number; comment: string };
  }) => {
    try {
      const res = await fetch(`/api/trainee/enrollments/${encodeURIComponent(progressCourseId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      const data = await res.json().catch(() => ({}));
      
      // Instantly refresh dashboards across tabs/windows using SWR cross-component update
      if (data.ok) {
        mutate('/api/trainee/training/overview');
      }

      if (data.ok && data.certNo) {
        setCertNo(data.certNo);
        return data.certNo;
      }
    } catch {
      // Keep the player responsive even if background progress sync fails.
    }
  };

  const handleMarkComplete = (lessonId: string) => {
    const lessonWasAlreadyCompleted = course.lessons.some((lesson) => lesson.id === lessonId && lesson.completed);
    const nextCompletedLessons = lessonWasAlreadyCompleted
      ? completedLessonsCount
      : Math.min(course.lessons.length, completedLessonsCount + 1);
    const nextProgressPct = Math.round((nextCompletedLessons / Math.max(1, course.lessons.length)) * 100);

    setCourse((prev) => {
      if (!prev) {
        return null;
      }

      const nextCourse = {
        ...prev,
        lessons: prev.lessons.map((lesson) => ({ ...lesson })),
      };
      const lessonIndex = nextCourse.lessons.findIndex((lesson) => lesson.id === lessonId);

      if (lessonIndex > -1) {
        nextCourse.lessons[lessonIndex].completed = true;

        if (lessonIndex + 1 < nextCourse.lessons.length) {
          nextCourse.lessons[lessonIndex + 1].locked = false;
        }
      }

      return nextCourse;
    });

    void persistProgress({ progressPct: nextProgressPct, completedBlocks: nextCompletedLessons });

    const currentIdx = course.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (currentIdx + 1 < course.lessons.length) {
      setTimeout(() => {
        setActiveLessonId(course.lessons[currentIdx + 1].id);
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
      // Progress calculation
      const totalItems = course.lessons.length + course.documents.length;
      const completedItems = completedLessonsCount + next.length;
      const nextProgressPct = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
      void persistProgress({ progressPct: nextProgressPct, viewedDocIds: next });
      return next;
    });
    setCurrentView('pdf');
    setSidebarOpenMobile(false);
  };

  const handleStartQuiz = () => {
    setCurrentView('quiz');
    setSidebarOpenMobile(false);
  };

  const handleQuizComplete = (score: number, passed: boolean, reason: 'manual' | 'auto_timeout' = 'manual') => {
    const questionCount = Math.max(1, course.quiz.questions.length);
    const percentScore = Math.round((score / questionCount) * 100);
    const currentProgressPct = Math.round((completedLessonsCount / Math.max(1, course.lessons.length)) * 100);

    const firstTime = !course.quiz.attempted;
    setIsFirstAttempt(firstTime);

    setCourse((prev) => {
      if (!prev) {
        return null;
      }

      return {
        ...prev,
        quiz: { ...prev.quiz, attempted: true, score, passed },
      };
    });

    const quizAttempt = { score: percentScore, passed, reason };

    void persistProgress({ progressPct: currentProgressPct, score: percentScore, quizAttempt });

    if (passed) {
      void persistProgress({ progressPct: 100, completedBlocks: course.lessons.length, score: percentScore });
    } else {
      void persistProgress({ progressPct: currentProgressPct, completedBlocks: completedLessonsCount, score: percentScore });
    }

    setCurrentView('quiz-results');
  };

  const currentLessonIndex = course.lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const currentDocIndex = course.documents.findIndex((doc) => doc.id === activeDocId);
 
  const handleAbsolutePrevious = () => {
    if (currentView === 'pdf') {
      if (currentDocIndex > 0) {
        setActiveDocId(course.documents[currentDocIndex - 1].id);
      } else {
        // Switch back to last Lesson
        setCurrentView('video');
        setSidebarTab('videos');
        setActiveLessonId(course.lessons[course.lessons.length - 1].id);
      }
    } else if (currentView === 'quiz') {
      if (course.documents.length > 0) {
        setCurrentView('pdf');
        setSidebarTab('docs');
        setActiveDocId(course.documents[course.documents.length - 1].id);
      } else {
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
        // Switch to first PDF
        setCurrentView('pdf');
        setSidebarTab('docs');
        handleSelectDoc(course.documents[0].id);
      } else {
        // Switch to Quiz
        setCurrentView('quiz');
        setSidebarTab('quiz');
      }
    } else if (currentView === 'pdf') {
      if (currentDocIndex < course.documents.length - 1) {
        handleSelectDoc(course.documents[currentDocIndex + 1].id);
      } else {
        // Switch to Quiz
        setCurrentView('quiz');
        setSidebarTab('quiz');
      }
    }
  };

  const toggleFullscreen = () => {
    const fsDoc = document as FullscreenDocumentLike;
    const fsEl = document.documentElement as FullscreenElementLike;

    if (!document.fullscreenElement && !fsDoc.webkitFullscreenElement) {
      if (fsEl.requestFullscreen) {
        void fsEl.requestFullscreen();
      } else if (fsEl.webkitRequestFullscreen) {
        void fsEl.webkitRequestFullscreen();
      }

      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if (fsDoc.webkitExitFullscreen) {
        void fsDoc.webkitExitFullscreen();
      }

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
            />
          )}

          {currentView === 'pdf' && activeDocId && (
            <PDFView 
              document={course.documents.find((documentItem) => documentItem.id === activeDocId)!} 
              onPrevious={handleAbsolutePrevious}
              onNext={handleAbsoluteNext}
              hasPrevious={true} // Can always go back to videos/prev pdf
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
