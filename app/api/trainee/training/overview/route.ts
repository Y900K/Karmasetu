import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { normalizeCourseModules, toDateOnly } from '@/lib/courseUtils';
import { dedupeEnrollmentsByCourse, getEnrollmentStudyTimeMs } from '@/lib/enrollmentMetrics';
import { requireTrainee } from '@/lib/auth/requireTrainee';

type CourseStatus = 'Not Started' | 'In Progress' | 'Completed';
type DbEnrollment = Record<string, unknown> & {
  courseId?: string;
  progressPct?: number;
  completedModuleIds?: unknown[];
  status?: string;
  studyTimeMs?: number;
  updatedAt?: Date;
  assignedAt?: Date;
};
type DbCourse = Record<string, unknown> & {
  _id: { toString: () => string };
  slug?: string;
  title?: string;
  category?: string;
  level?: string;
  deadline?: unknown;
  icon?: string;
  theme?: string;
  videoUrl?: string;
  pdfUrl?: string;
  quiz?: { questions?: Array<{ text: string; options: string[]; correct: number }> };
  passingScore?: number;
};

function mapStatus(value: unknown): CourseStatus {
  if (value === 'completed') {
    return 'Completed';
  }

  if (value === 'in_progress') {
    return 'In Progress';
  }

  return 'Not Started';
}

function normalizeUrls(listValue: unknown, singleValue: unknown): string[] {
  if (Array.isArray(listValue)) {
    return listValue.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
  }

  if (typeof singleValue === 'string' && singleValue.trim().length > 0) {
    return [singleValue.trim()];
  }

  return [];
}

function resolveCourseBlockCount(course: Record<string, unknown>) {
  const moduleCount = normalizeCourseModules(course.modules).length;
  if (moduleCount > 0) {
    return moduleCount;
  }

  const videoCount = normalizeUrls(course.videoUrls, course.videoUrl).length;
  const pdfCount = normalizeUrls(course.pdfUrls, course.pdfUrl).length;
  const storedCount =
    typeof course.modulesCount === 'number' && course.modulesCount > 0 ? course.modulesCount : 0;

  if (videoCount > 0) {
    return videoCount;
  }

  if (pdfCount > 0) {
    return pdfCount;
  }

  return Math.max(storedCount, 1);
}

export async function GET(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const userId = session.user._id.toString();

    // Fetch enrollments and courses separately to handle mixed ID formats
    const rawEnrollments = await db
      .collection(COLLECTIONS.enrollments)
      .find({ userId })
      .toArray();
    const enrollments = dedupeEnrollmentsByCourse(rawEnrollments as DbEnrollment[]);

    const allCourses = await db
      .collection(COLLECTIONS.courses)
      .find({}) // Fetch all courses to ensure historical enrollments have associated metadata
      .toArray();

    // Build a lookup map supporting both ObjectId and string-based courseIds
    const courseById = new Map<string, DbCourse>();
    for (const course of allCourses) {
      const normalizedCourse = course as DbCourse;
      courseById.set(normalizedCourse._id.toString(), normalizedCourse);
      if (typeof course.slug === 'string') {
        courseById.set(course.slug, normalizedCourse);
      }
    }

    // Join enrollments with courses
    const enrollmentsWithCourses: Array<{ enrollment: DbEnrollment; course: DbCourse }> = [];
    for (const enrollment of enrollments) {
      const cid = typeof enrollment.courseId === 'string' ? enrollment.courseId : '';
      const course = courseById.get(cid);
      if (course) {
        // If a course is deleted or unpublished, hide it completely 
        // UNLESS the trainee has already completed it (so they keep their history/certs)
        const isHidden = course.isDeleted === true || course.isPublished === false;
        if (isHidden && enrollment.status !== 'completed') {
          continue;
        }
        enrollmentsWithCourses.push({ enrollment: enrollment as DbEnrollment, course });
      }
    }

    const courses = enrollmentsWithCourses
      .map((entry) => {
        const course = entry.course;
        const enrollment = entry.enrollment;

        const blocks = resolveCourseBlockCount(course);
        const progressPct =
          typeof enrollment.progressPct === 'number'
            ? Math.max(0, Math.min(100, Math.round(enrollment.progressPct)))
            : 0;

        const completedBlockIds =
          Array.isArray(enrollment.completedModuleIds)
            ? enrollment.completedModuleIds.filter((id): id is string => typeof id === 'string')
            : [];

        const completedBlocks = Math.max(
          Math.min(completedBlockIds.length, blocks),
          progressPct === 100 ? blocks : 0
        );
        const updatedAt = enrollment.updatedAt instanceof Date ? enrollment.updatedAt : null;
        const assignedAt = enrollment.assignedAt instanceof Date ? enrollment.assignedAt : null;
        const lastAccessedAt = updatedAt || assignedAt;

        return {
          id: course._id.toString(),
          title: typeof course.title === 'string' ? course.title : 'Untitled Course',
          category: typeof course.category === 'string' ? course.category : 'General',
          level: typeof course.level === 'string' ? course.level : 'Beginner',
          blocks,
          progress: progressPct,
          status: mapStatus(enrollment.status),
          deadline: toDateOnly(course.deadline) || '',
          icon: typeof course.icon === 'string' ? course.icon : '📘',
          theme: typeof course.theme === 'string' ? course.theme : 'from-cyan-600 to-sky-500',
          videoUrl: typeof course.videoUrl === 'string' ? course.videoUrl : '',
          pdfUrl: typeof course.pdfUrl === 'string' ? course.pdfUrl : '',
          completedBlocks,
          quiz: Array.isArray(course.quiz?.questions)
            ? course.quiz.questions.map((question: { text: string; options: string[]; correct: number }) => ({
                q: question.text,
                options: question.options,
                correct: question.correct,
              }))
            : [],
          passingScore: typeof course.passingScore === 'number' ? course.passingScore : 70,
          lastAccessedAt: lastAccessedAt ? lastAccessedAt.toISOString() : undefined,
          studyTimeMs: getEnrollmentStudyTimeMs(enrollment),
          isArchived: course.isDeleted === true || course.isPublished === false,
          isDeleted: course.isDeleted === true,
        };
      })
      .filter((course): course is NonNullable<typeof course> => Boolean(course))
      .sort((a, b) => {
        if (a.isArchived && !b.isArchived) return 1;
        if (!a.isArchived && b.isArchived) return -1;

        if (a.status !== b.status) {
          const order: Record<CourseStatus, number> = {
            'In Progress': 0,
            'Not Started': 1,
            Completed: 2,
          };

          return order[a.status] - order[b.status];
        }

        const aTs = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
        const bTs = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
        return bTs - aTs;
      });

    const certificateCount = await db
      .collection(COLLECTIONS.certificates)
      .countDocuments({ userId, status: { $ne: 'revoked' } });
    const totalEnrollmentCount = enrollments.length;
    const totalCompletedCount = enrollments.filter((entry) => entry.status === 'completed').length;
    const totalStudyTimeMs = enrollments.reduce(
      (sum, entry) => sum + getEnrollmentStudyTimeMs(entry),
      0
    );

    return NextResponse.json({
      ok: true,
      courses,
      certificateCount,
      totalEnrollmentCount,
      totalCompletedCount,
      totalStudyTimeMs,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load trainee training overview.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
