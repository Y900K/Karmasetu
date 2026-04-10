import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { normalizeCourseModules } from '@/lib/courseUtils';

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

async function findCourse(db: Awaited<ReturnType<typeof getMongoDb>>, courseId: string) {
  // Try to find in MongoDB first (by _id or by code)
  let dbCourse = null;
  if (ObjectId.isValid(courseId)) {
    dbCourse = await db
      .collection(COLLECTIONS.courses)
      .findOne({ _id: new ObjectId(courseId), isDeleted: { $ne: true } });
  }
  if (!dbCourse) {
    dbCourse = await db.collection(COLLECTIONS.courses).findOne({ code: courseId, isDeleted: { $ne: true } });
  }
  if (dbCourse) {
    return {
      id: dbCourse._id.toString(),
      title: typeof dbCourse.title === 'string' ? dbCourse.title : 'Untitled Course',
      blocks: resolveCourseBlockCount(dbCourse),
      passingScore: typeof dbCourse.passingScore === 'number' ? dbCourse.passingScore : 70,
      quizQuestionCount: Array.isArray(dbCourse.quiz?.questions) ? dbCourse.quiz.questions.length : 0,
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
  viewedDocIds?: string[];
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
    };
    if (userDepartment) {
      setOnInsertFields.department = userDepartment;
    }

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
    const resolvedCourseId = course.id;
    const userId = session.user._id.toString();

    const existingEnrollment = await db.collection(COLLECTIONS.enrollments).findOne({
      userId,
      courseId: resolvedCourseId,
    });

    const existingCompletedBlocks = Array.isArray(existingEnrollment?.completedModuleIds)
      ? existingEnrollment.completedModuleIds.length
      : typeof existingEnrollment?.progressPct === 'number'
      ? Math.round((Math.max(0, Math.min(100, existingEnrollment.progressPct)) / 100) * course.blocks)
      : 0;

    const body = (await request.json().catch(() => ({}))) as ProgressBody;
    const requestedProgress = Math.max(0, Math.min(100, Math.round(body.progressPct || 0)));
    const normalizedCompletedBlocks = Math.max(
      0,
      Math.min(course.blocks, Math.round(body.completedBlocks ?? Math.round((requestedProgress / 100) * course.blocks)))
    );

    const normalizedProgress = course.blocks > 0
      ? Math.round((normalizedCompletedBlocks / course.blocks) * 100)
      : 0;

    const completedModuleIds = Array.from(
      { length: normalizedCompletedBlocks },
      (_, index) => `block-${index + 1}`
    );

    const normalizedScore =
      typeof body.score === 'number'
        ? Math.max(0, Math.min(100, Math.round(body.score)))
        : undefined;

    const hasFinishedBlocks = normalizedCompletedBlocks >= course.blocks;
    const quizRequired = course.quizQuestionCount > 0;
    const hasPassingScore = typeof normalizedScore === 'number' && normalizedScore >= course.passingScore;
    const completionEligible = hasFinishedBlocks && (!quizRequired || hasPassingScore);

    if (normalizedCompletedBlocks < existingCompletedBlocks) {
      return NextResponse.json(
        { ok: false, message: 'Progress cannot move backwards.' },
        { status: 400 }
      );
    }

    const progressJump = normalizedCompletedBlocks - existingCompletedBlocks;
    if (progressJump > 1 && !body.quizAttempt) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Progress update rejected. Please complete modules sequentially.',
        },
        { status: 400 }
      );
    }

    const status = completionEligible ? 'completed' : normalizedProgress > 0 ? 'in_progress' : 'assigned';
    const now = new Date();

    // FIX: Build $set object without undefined values — MongoDB doesn't handle undefined well
    const setFields: Record<string, unknown> = {
      progressPct: normalizedProgress,
      completedModuleIds,
      status,
      updatedAt: now,
    };

    const maxFields: Record<string, unknown> = {};

    // Only set score if actually provided (use max to avoid overwriting with a lower score on retake)
    if (typeof normalizedScore === 'number') {
      maxFields.score = normalizedScore;
    }

    // Persist viewed document IDs (fixes quiz-lock-on-reload bug)
    if (Array.isArray(body.viewedDocIds)) {
      setFields.viewedDocIds = body.viewedDocIds.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      );
    }

    // Store course feedback (post-quiz rating)
    if (body.courseFeedback && typeof body.courseFeedback.rating === 'number') {
      setFields.courseFeedback = {
        rating: Math.max(1, Math.min(5, Math.round(body.courseFeedback.rating))),
        comment: typeof body.courseFeedback.comment === 'string' ? body.courseFeedback.comment.slice(0, 1000) : '',
        submittedAt: now,
      };
      // Also insert into trainee_feedback collection for admin dashboard
      try {
        await db.collection(COLLECTIONS.traineeFeedback).insertOne({
          userId,
          userName: typeof session.user.fullName === 'string' ? session.user.fullName : 'Unknown',
          userEmail: typeof session.user.email === 'string' ? session.user.email : undefined,
          category: 'general',
          message: `Course rating: ${body.courseFeedback.rating}/5. ${body.courseFeedback.comment || ''}`.trim(),
          rating: Math.max(1, Math.min(5, Math.round(body.courseFeedback.rating))),
          status: 'open',
          courseId: resolvedCourseId,
          createdAt: now,
          updatedAt: now,
        });
      } catch { /* non-critical — enrollment update is primary */ }
    }

    // Only set completedAt when status is completed
    if (status === 'completed') {
      setFields.completedAt = now;
    }

    // FIX: Store user's department on enrollment for department-based compliance reporting
    const userDepartment = typeof session.user.department === 'string' ? session.user.department : undefined;

    const setOnInsertFields: Record<string, unknown> = {
      userId,
      courseId: resolvedCourseId,
      assignedAt: now,
    };
    if (userDepartment) {
      setOnInsertFields.department = userDepartment;
    }

    const updateDoc: Record<string, unknown> = {
      $setOnInsert: setOnInsertFields,
      $set: setFields,
    };
    
    if (Object.keys(maxFields).length > 0) {
      updateDoc.$max = maxFields;
    }

    if (body.quizAttempt) {
      updateDoc.$push = {
        quizAttempts: {
          score: Math.max(0, Math.min(100, Math.round(body.quizAttempt.score))),
          passed: Boolean(body.quizAttempt.passed),
          reason: body.quizAttempt.reason === 'auto_timeout' ? 'auto_timeout' : 'manual',
          submittedAt: now,
        },
      } as unknown;
    }

    await db.collection(COLLECTIONS.enrollments).updateOne(
      { userId, courseId: resolvedCourseId },
      updateDoc,
      { upsert: true }
    );

    const auditScore = normalizedScore;
    const auditDoc: Record<string, unknown> = {
      userId,
      courseId: resolvedCourseId,
      action: status === 'completed' ? 'completed' : 'progress_updated',
      actorUserId: userId,
      progressPct: normalizedProgress,
      source: 'trainee_api',
      createdAt: now,
      metadata: {
        endpoint: '/api/trainee/enrollments/[courseId]#PATCH',
        completedBlocks: normalizedCompletedBlocks,
      },
    };
    if (auditScore !== undefined) {
      auditDoc.score = auditScore;
    }

    await db.collection(COLLECTIONS.enrollmentAudit).insertOne(auditDoc);

    let certNo = undefined;
    if (status === 'completed') {
      const certificates = db.collection(COLLECTIONS.certificates);
      const candidateCertNo = generateCertificateNumber();
      const score = typeof normalizedScore === 'number' ? normalizedScore : 100;
      const issuedAt = now;
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await certificates.updateOne(
        { userId, courseId: resolvedCourseId, status: { $ne: 'revoked' } },
        {
          $setOnInsert: {
            certNo: candidateCertNo,
            userId,
            courseId: resolvedCourseId,
            issuedAt,
            expiresAt,
            score,
            status: 'valid',
            verificationHash: buildVerificationHash(`${candidateCertNo}:${userId}:${resolvedCourseId}:${randomUUID()}`),
          },
        },
        { upsert: true }
      );

      const certificate = await certificates.findOne(
        { userId, courseId: resolvedCourseId, status: { $ne: 'revoked' } },
        { projection: { certNo: 1 } }
      );
      certNo = typeof certificate?.certNo === 'string' ? certificate.certNo : undefined;
    }

    return NextResponse.json({
      ok: true,
      message: 'Progress updated.',
      progressPct: normalizedProgress,
      completedBlocks: normalizedCompletedBlocks,
      status,
      completed: status === 'completed',
      certNo,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update progress.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
