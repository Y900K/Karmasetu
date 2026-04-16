import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { normalizeCourseModules } from '@/lib/courseUtils';
import { collapseEnrollmentRecords } from '@/lib/enrollmentMetrics';

const MAX_STUDY_TIME_INCREMENT_MS = 60 * 60 * 1000;

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

  const totalCount = Math.max(videoCount + pdfCount, storedCount);
  if (totalCount > 0) {
    return totalCount;
  }

  return 1;
}

type CourseLookupResult = {
  id: string;
  title: string;
  blocks: number;
  passingScore: number;
  quizQuestionCount: number;
  code?: string;
  slug?: string;
};

async function findCourse(db: Awaited<ReturnType<typeof getMongoDb>>, courseId: string) {
  // Try to find in MongoDB first (by _id or by code/slug)
  let dbCourse = null;
  if (ObjectId.isValid(courseId)) {
    dbCourse = await db
      .collection(COLLECTIONS.courses)
      .findOne({ _id: new ObjectId(courseId), isDeleted: { $ne: true } });
  }
  if (!dbCourse) {
    dbCourse = await db.collection(COLLECTIONS.courses).findOne({
      $or: [{ code: courseId }, { slug: courseId }],
      isDeleted: { $ne: true },
    });
  }
  if (dbCourse) {
    return {
      id: dbCourse._id.toString(),
      title: typeof dbCourse.title === 'string' ? dbCourse.title : 'Untitled Course',
      blocks: resolveCourseBlockCount(dbCourse),
      passingScore: typeof dbCourse.passingScore === 'number' ? dbCourse.passingScore : 70,
      quizQuestionCount: Array.isArray(dbCourse.quiz?.questions) ? dbCourse.quiz.questions.length : 0,
      code: typeof dbCourse.code === 'string' ? dbCourse.code : undefined,
      slug: typeof dbCourse.slug === 'string' ? dbCourse.slug : undefined,
    };
  }

  // FIX: Removed mock data fallback — only real MongoDB courses should be enrollable.
  // This prevents phantom enrollments from mock data.
  return null;
}

type ProgressBody = {
  progressPct?: number;
  completedBlocks?: number;
  score?: number;
  studyTimeMsIncrement?: number;
  viewedDocIds?: string[];
  lastActiveModuleId?: string;
  lastActiveView?: 'video' | 'pdf' | 'quiz';
  videoCurrentTime?: number;
  quizAttempt?: {
    score: number;
    passed: boolean;
    reason: 'manual' | 'auto_timeout';
  };
  courseFeedback?: {
    rating: number;
    comment: string;
  };
};

function buildVerificationHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function buildEnrollmentFilter(userId: string, resolvedCourseId: string, courseCode?: string, courseSlug?: string) {
  const courseIds = [resolvedCourseId];
  if (typeof courseCode === 'string' && courseCode.trim().length > 0 && courseCode !== resolvedCourseId) {
    courseIds.push(courseCode.trim());
  }
  if (
    typeof courseSlug === 'string' &&
    courseSlug.trim().length > 0 &&
    courseSlug !== resolvedCourseId &&
    courseSlug !== courseCode
  ) {
    courseIds.push(courseSlug.trim());
  }

  return { userId, courseId: { $in: Array.from(new Set(courseIds)) } };
}

function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const suffix = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `KS-CERT-${year}-${suffix}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const { courseId } = await params;
    const course = await findCourse(db, courseId);
    if (!course) {
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }
    const resolvedCourseId = course.id;

    const userId = session.user._id.toString();
    const now = new Date();

    // FIX: Store user's department on enrollment for department-based compliance reporting
    const userDepartment = typeof session.user.department === 'string' ? session.user.department : undefined;

    const setOnInsertFields: Record<string, unknown> = {
      userId,
      courseId: resolvedCourseId,
      assignedAt: now,
      studyTimeMs: 0,
    };
    if (userDepartment) {
      setOnInsertFields.department = userDepartment;
    }

    const enrollmentFilter = buildEnrollmentFilter(userId, resolvedCourseId, course.code, course.slug);
    const existingRecords = await db
      .collection(COLLECTIONS.enrollments)
      .find(enrollmentFilter)
      .project({ _id: 1 })
      .toArray();

    if (existingRecords.length > 0) {
      await db.collection(COLLECTIONS.enrollments).updateMany(
        enrollmentFilter,
        {
          $set: {
            courseId: resolvedCourseId,
            progressPct: 0,
            completedModuleIds: [],
            status: 'in_progress',
            updatedAt: now,
          },
        }
      );
    } else {
      await db.collection(COLLECTIONS.enrollments).updateOne(
        { userId, courseId: resolvedCourseId },
        {
          $setOnInsert: setOnInsertFields,
          $set: {
            progressPct: 0,
            completedModuleIds: [],
            status: 'in_progress',
            updatedAt: now,
          },
        },
        { upsert: true }
      );
    }

    await db.collection(COLLECTIONS.enrollmentAudit).insertOne({
      userId,
      courseId: resolvedCourseId,
      action: 'enrolled',
      actorUserId: userId,
      source: 'trainee_api',
      createdAt: now,
      metadata: {
        endpoint: '/api/trainee/enrollments/[courseId]#POST',
      },
    });

    return NextResponse.json({ ok: true, message: 'Enrollment started.' });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to enroll user.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const { courseId } = await params;
    const course = await findCourse(db, courseId);
    if (!course) {
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }
    const resolvedCourseId = course.id; // Store as string for cross-portal consistency
    const userId = session.user._id.toString();

    const enrollmentFilter = { 
      userId, 
      courseId: resolvedCourseId
    };
    const existingEnrollmentRecords = await db.collection(COLLECTIONS.enrollments).find(enrollmentFilter).toArray();
    
    // Collapse to one logical enrollment
    const existingEnrollment = existingEnrollmentRecords.length > 0
      ? collapseEnrollmentRecords(existingEnrollmentRecords)
      : null;

    const body = (await request.json().catch(() => ({}))) as ProgressBody;
    
    // Calculate normalized progress
    const requestedProgress = Math.max(0, Math.min(100, Math.round(body.progressPct || 0)));
    
    // If not mark complete, use the progress directly for the DB update
    // If it is mark complete, we calculate the jump
    const normalizedCompletedBlocks = Math.max(
      0,
      Math.min(
        course.blocks,
        body.completedBlocks || 0
      )
    );

    const now = new Date();
    const setFields: Record<string, unknown> = {
      courseId: resolvedCourseId, // Normalizing to string
      updatedAt: now,
    };

    if (body.lastActiveModuleId) setFields.lastActiveModuleId = body.lastActiveModuleId;
    if (body.lastActiveView) setFields.lastActiveView = body.lastActiveView;
    if (typeof body.videoCurrentTime === 'number') setFields.videoCurrentTime = body.videoCurrentTime;

    const maxFields: Record<string, unknown> = {
      progressPct: requestedProgress,
    };

    const addToSet: Record<string, unknown> = {};
    if (body.completedBlocks) {
      // Use the actual lesson/doc ID if we can find it, otherwise block-N
      addToSet.completedModuleIds = body.lastActiveModuleId || `block-${body.completedBlocks}`;
    }

    if (Array.isArray(body.viewedDocIds)) {
      const validDocIds = body.viewedDocIds.filter(id => typeof id === 'string' && id.trim().length > 0);
      if (validDocIds.length > 0) addToSet.viewedDocIds = { $each: validDocIds };
    }

    // Determine status - if completedBlocks matches total course blocks, it's completed
    let status = 'in_progress';
    if (normalizedCompletedBlocks >= course.blocks || requestedProgress >= 100) {
      status = 'completed';
      setFields.completedAt = now;
    }
    setFields.status = status;

    const updateDoc: Record<string, unknown> = {
      $set: setFields,
      $max: maxFields,
    };

    if (Object.keys(addToSet).length > 0) updateDoc.$addToSet = addToSet;
    if (body.quizAttempt) {
      updateDoc.$push = {
        quizAttempts: {
          score: Math.max(0, Math.min(100, Math.round(body.quizAttempt.score))),
          passed: Boolean(body.quizAttempt.passed),
          submittedAt: now,
        },
      };
    }

    // STUDY TIME: Incremental only
    const normalizedStudyTimeIncrement = Math.max(0, Math.min(MAX_STUDY_TIME_INCREMENT_MS, Math.round(body.studyTimeMsIncrement || 0)));
    if (normalizedStudyTimeIncrement > 0) {
      updateDoc.$inc = { studyTimeMs: normalizedStudyTimeIncrement };
    }

    // COURSE FEEDBACK Persistence
    if (body.courseFeedback && typeof body.courseFeedback.rating === 'number') {
      const { rating, comment } = body.courseFeedback;
      await db.collection(COLLECTIONS.traineeFeedback).updateOne(
        { userId, courseId: resolvedCourseId.toString() },
        { 
          $set: {
            rating: Math.max(1, Math.min(5, Math.floor(rating))),
            message: (comment || '').trim(),
            category: 'course_review',
            userName: session.user.fullName || session.user.name || 'Trainee',
            userEmail: session.user.email,
            status: 'open',
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            userId,
          }
        },
        { upsert: true }
      );
    }

    await db.collection(COLLECTIONS.enrollments).updateOne(
      { userId, courseId: resolvedCourseId },
      updateDoc as Record<string, unknown>,
      { upsert: true }
    );

    // AUDIT LOG
    await db.collection(COLLECTIONS.enrollmentAudit).insertOne({
      userId,
      courseId: resolvedCourseId,
      action: status === 'completed' ? 'completed' : 'progress_updated',
      progressPct: requestedProgress,
      createdAt: now,
      metadata: { 
        source: 'trainee_api',
        lastActiveModuleId: body.lastActiveModuleId,
        quizPassed: body.quizAttempt?.passed
      },
    });

    // AUTOMATIC CERTIFICATE GENERATION
    let certNo = null;
    if (status === 'completed' && (body.quizAttempt?.passed || requestedProgress >= 100)) {
      // Check if certificate already exists to prevent duplicate numbering
      const existingCert = await db.collection(COLLECTIONS.certificates).findOne({
        userId,
        courseId: resolvedCourseId.toString()
      });

      if (existingCert) {
        certNo = existingCert.certNo;
      } else {
        certNo = generateCertificateNumber();
        const score = body.quizAttempt?.score || body.score || requestedProgress;
        
        await db.collection(COLLECTIONS.certificates).insertOne({
          certNo,
          userId,
          userName: session.user.fullName || session.user.name || 'Trainee',
          courseId: resolvedCourseId.toString(),
          courseTitle: course.title,
          issuedAt: now,
          status: 'valid',
          score,
          verificationHash: buildVerificationHash(`${userId}:${resolvedCourseId.toString()}:${certNo}`),
          createdAt: now,
          updatedAt: now,
        });

        // Also update enrollment record with certificate info
        await db.collection(COLLECTIONS.enrollments).updateOne(
          { userId, courseId: resolvedCourseId },
          { $set: { certificateNo: certNo, certifiedAt: now } }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: status === 'completed' ? 'Course completed!' : 'Progress updated.',
      progressPct: requestedProgress,
      status,
      certNo
    });
  } catch (error) {
    console.error('Enrollment PATCH error:', error);
    return NextResponse.json(
      { ok: false, message: 'Failed to update progress.' },
      { status: 500 }
    );
  }
}
