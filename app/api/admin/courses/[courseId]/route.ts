import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';
import type { CourseThumbnailMeta } from '@/lib/courseUtils';
import {
  buildCourseModules,
  extractModuleMedia,
  normalizeCourseModules,
  normalizeObjectives,
  normalizeUrlArray,
  normalizeVideoDurations,
  normalizeVideoTitles,
  resolveModulesCount,
  validateQuizQuestions,
} from '@/lib/courseUtils';
import { importThumbnailAsset } from '@/lib/server/courseThumbnail';

type UpdateCourseBody = {
  title?: string;
  description?: string;
  category?: string;
  level?: string;
  modules?: number;
  deadline?: string | null;
  status?: string;
  passingScore?: number;
  departments?: string[];
  videoUrl?: string;
  pdfUrl?: string;
  videoUrls?: string[];
  pdfUrls?: string[];
  instructorName?: string;
  instructorRole?: string;
  objectives?: string[];
  theme?: string;
  icon?: string;
  thumbnail?: string;
  thumbnailMeta?: CourseThumbnailMeta;
  quiz?: { questions?: Array<{ text: string; options: string[]; correct: number }> };
  quizTimeLimit?: number;
  videoTitles?: string[];
  videoDurations?: string[];
  modulesData?: Array<Record<string, unknown>>;
  isDefaultForNewTrainees?: boolean;
};

async function resolveThumbnailPersistence(
  rawThumbnail: unknown,
  rawThumbnailMeta: unknown,
  title: string
) {
  const thumbnail = typeof rawThumbnail === 'string' ? rawThumbnail.trim() : '';
  const thumbnailMeta =
    rawThumbnailMeta && typeof rawThumbnailMeta === 'object'
      ? (rawThumbnailMeta as CourseThumbnailMeta)
      : undefined;

  if (!thumbnail) {
    return {
      thumbnail: '',
      thumbnailMeta: undefined as CourseThumbnailMeta | undefined,
    };
  }

  if (thumbnail.startsWith('/uploads/course-thumbnails/')) {
    return {
      thumbnail,
      thumbnailMeta,
    };
  }

  const imported = await importThumbnailAsset(thumbnail, {
    title,
    provider: thumbnailMeta?.provider || 'manual_import',
    keywords: thumbnailMeta?.keywords,
  });

  return {
    thumbnail: imported.url,
    thumbnailMeta: imported.thumbnailMeta,
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'admin_course_update', 'Blocked course update due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const { courseId } = await params;
    if (!ObjectId.isValid(courseId)) {
      await logSystemEvent(
        'WARN',
        'admin_course_update',
        'Rejected course update due to invalid course id format.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid course id.' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateCourseBody;
    const existingCourse = await db
      .collection(COLLECTIONS.courses)
      .findOne({ _id: new ObjectId(courseId), isDeleted: { $ne: true } });

    if (!existingCourse) {
      await logSystemEvent(
        'WARN',
        'admin_course_update',
        'Rejected course update because course was not found.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }

    const resolvedTitle =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : typeof existingCourse.title === 'string' && existingCourse.title.trim()
        ? existingCourse.title
        : 'Course';

    const updateSet: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    const updateUnset: Record<string, ''> = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      updateSet.title = body.title.trim();
    }

    if (typeof body.description === 'string') {
      updateSet.description = body.description;
    }

    if (typeof body.category === 'string') {
      updateSet.category = body.category;
    }

    if (typeof body.level === 'string') {
      updateSet.level = body.level;
    }

    if (typeof body.theme === 'string') {
      updateSet.theme = body.theme;
    }

    if (typeof body.icon === 'string') {
      updateSet.icon = body.icon;
    }

    if (typeof body.instructorName === 'string') {
      updateSet.instructorName = body.instructorName.trim();
    }

    if (typeof body.instructorRole === 'string') {
      updateSet.instructorRole = body.instructorRole.trim();
    }

    if (Array.isArray(body.objectives)) {
      updateSet.objectives = normalizeObjectives(body.objectives);
    }

    if (typeof body.passingScore === 'number') {
      updateSet.passingScore = body.passingScore;
    }

    if (typeof body.status === 'string') {
      updateSet.isPublished = body.status !== 'Inactive';
    }

    if (Array.isArray(body.departments)) {
      updateSet.departments = body.departments;
    }

    if (typeof body.isDefaultForNewTrainees === 'boolean') {
      updateSet.isDefaultForNewTrainees = body.isDefaultForNewTrainees;
    }

    if (typeof body.thumbnail === 'string') {
      const persistedThumbnail = await resolveThumbnailPersistence(body.thumbnail, body.thumbnailMeta, resolvedTitle);
      updateSet.thumbnail = persistedThumbnail.thumbnail;

      if (persistedThumbnail.thumbnailMeta) {
        updateSet.thumbnailMeta = persistedThumbnail.thumbnailMeta;
      } else if (!persistedThumbnail.thumbnail) {
        updateUnset.thumbnailMeta = '';
      }
    }

    if (body.quiz && Array.isArray(body.quiz.questions)) {
      const validation = validateQuizQuestions(body.quiz.questions);
      if (!validation.valid) {
        await logSystemEvent(
          'WARN',
          'admin_course_update',
          'Rejected course update due to invalid quiz payload.',
          { actorAdminId: session.user._id.toString(), courseId },
          session.user._id.toString()
        );
        return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });
      }
      updateSet.quiz = { questions: validation.questions };
    }

    if (typeof body.quizTimeLimit === 'number') {
      updateSet.quizTimeLimit = body.quizTimeLimit;
    }

    const existingVideoUrls = normalizeUrlArray(existingCourse.videoUrls, existingCourse.videoUrl);
    const existingPdfUrls = normalizeUrlArray(existingCourse.pdfUrls, existingCourse.pdfUrl);

    const incomingModules = normalizeCourseModules(body.modulesData, resolvedTitle);
    const incomingMedia = extractModuleMedia(incomingModules);

    const bodyVideoUrls = normalizeUrlArray(body.videoUrls, body.videoUrl);
    const bodyPdfUrls = normalizeUrlArray(body.pdfUrls, body.pdfUrl);

    const videoUrls = incomingMedia.videoUrls.length > 0 ? incomingMedia.videoUrls : bodyVideoUrls;
    const pdfUrls = incomingMedia.pdfUrls.length > 0 ? incomingMedia.pdfUrls : bodyPdfUrls;
    const shouldUpdateVideos = Array.isArray(body.videoUrls) || typeof body.videoUrl === 'string';

    if (shouldUpdateVideos) {
      updateSet.videoUrls = videoUrls;
      updateSet.videoUrl = videoUrls[0] || '';
      updateSet.videoTitles = normalizeVideoTitles(body.videoTitles, videoUrls, resolvedTitle);
      updateSet.videoDurations = normalizeVideoDurations(body.videoDurations, videoUrls);
    } else {
      if (Array.isArray(body.videoTitles)) {
        const currentVideoUrls = normalizeUrlArray(existingCourse.videoUrls, existingCourse.videoUrl);
        updateSet.videoTitles = normalizeVideoTitles(body.videoTitles, currentVideoUrls, resolvedTitle);
      }

      if (Array.isArray(body.videoDurations)) {
        const currentVideoUrls = normalizeUrlArray(existingCourse.videoUrls, existingCourse.videoUrl);
        updateSet.videoDurations = normalizeVideoDurations(body.videoDurations, currentVideoUrls);
      }
    }

    if (Array.isArray(body.pdfUrls) || typeof body.pdfUrl === 'string') {
      updateSet.pdfUrls = pdfUrls;
      updateSet.pdfUrl = pdfUrls[0] || '';
    }

    const effectiveVideoUrls = shouldUpdateVideos ? videoUrls : existingVideoUrls;
    const effectivePdfUrls = Array.isArray(body.pdfUrls) || typeof body.pdfUrl === 'string' ? pdfUrls : existingPdfUrls;
    const effectiveVideoTitles = Array.isArray(body.videoTitles)
      ? normalizeVideoTitles(body.videoTitles, effectiveVideoUrls, resolvedTitle)
      : normalizeVideoTitles(existingCourse.videoTitles, effectiveVideoUrls, resolvedTitle);
    const effectiveVideoDurations = Array.isArray(body.videoDurations)
      ? normalizeVideoDurations(body.videoDurations, effectiveVideoUrls)
      : normalizeVideoDurations(existingCourse.videoDurations, effectiveVideoUrls);

    const effectiveModules =
      incomingModules.length > 0
        ? incomingModules
        : buildCourseModules(
            effectiveVideoUrls,
            effectivePdfUrls,
            effectiveVideoTitles,
            effectiveVideoDurations,
            resolvedTitle
          );

    updateSet.modules = effectiveModules;

    const shouldUpdateModuleCount =
      typeof body.modules === 'number' ||
      Array.isArray(body.videoUrls) ||
      typeof body.videoUrl === 'string' ||
      Array.isArray(body.pdfUrls) ||
      typeof body.pdfUrl === 'string' ||
      incomingModules.length > 0;

    if (shouldUpdateModuleCount) {
      updateSet.modulesCount = resolveModulesCount(body.modules, effectiveVideoUrls, effectivePdfUrls, effectiveModules);
    }

    if (body.deadline === null) {
      updateUnset.deadline = '';
    } else if (typeof body.deadline === 'string' && body.deadline) {
      updateSet.deadline = new Date(body.deadline);
    }

    const updateDoc: Record<string, unknown> = {
      $set: updateSet,
      $inc: { version: 1 },
    };

    if (Object.keys(updateUnset).length > 0) {
      updateDoc.$unset = updateUnset;
    }

    await db.collection(COLLECTIONS.courses).updateOne(
      { _id: new ObjectId(courseId), isDeleted: { $ne: true } },
      updateDoc
    );

    await logSystemEvent(
      'INFO',
      'admin_course_update',
      'Course updated by admin.',
      { actorAdminId: session.user._id.toString(), courseId },
      session.user._id.toString()
    );

    if (body.status !== 'Inactive' && body.isDefaultForNewTrainees === true) {
      const trainees = await db.collection(COLLECTIONS.users)
          .find({ role: 'trainee' })
          .project({ _id: 1, department: 1 })
          .toArray();

      if (trainees.length > 0) {
        const now = new Date();
        const assignmentOps = trainees.map((trainee) => {
          const setOnInsert: Record<string, unknown> = {
            userId: trainee._id.toString(),
            courseId: courseId,
            progressPct: 0,
            completedModuleIds: [],
            assignedAt: now,
          };

          if (typeof trainee.department === 'string' && trainee.department.trim()) {
            setOnInsert.department = trainee.department;
          }

          return {
            updateOne: {
              filter: { userId: trainee._id.toString(), courseId: courseId },
              update: {
                $setOnInsert: setOnInsert,
                $set: {
                  status: 'assigned',
                  updatedAt: now,
                },
              },
              upsert: true,
            },
          };
        });

        await db.collection(COLLECTIONS.enrollments).bulkWrite(assignmentOps, { ordered: false });
      }
    }

    return NextResponse.json({ ok: true, message: 'Course updated.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_course_update',
      'Admin course update route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update course.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'admin_course_delete', 'Blocked course deletion due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const { courseId } = await params;
    if (!ObjectId.isValid(courseId)) {
      await logSystemEvent(
        'WARN',
        'admin_course_delete',
        'Rejected course deletion due to invalid course id format.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid course id.' }, { status: 400 });
    }

    const _id = new ObjectId(courseId);
    const now = new Date();

    const result = await db.collection(COLLECTIONS.courses).updateOne(
      { _id },
      {
        $set: {
          isDeleted: true,
          isPublished: false,
          deletedAt: now,
          updatedAt: now,
        },
      }
    );

    if (!result.matchedCount) {
      await logSystemEvent(
        'WARN',
        'admin_course_delete',
        'Rejected course deletion because course was not found.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }

    await db.collection(COLLECTIONS.enrollments).updateMany(
      { courseId },
      {
        $set: {
          status: 'expired',
          updatedAt: now,
        },
      }
    );

    await db.collection(COLLECTIONS.enrollmentAudit).insertOne({
      courseId,
      action: 'course_deleted',
      source: 'admin_api',
      createdAt: now,
      metadata: {
        endpoint: '/api/admin/courses/[courseId]#DELETE',
        actorAdminId: session.user._id.toString(),
      },
    });

    await logSystemEvent(
      'INFO',
      'admin_course_delete',
      'Course deleted by admin.',
      { actorAdminId: session.user._id.toString(), courseId },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Course deleted.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_course_delete',
      'Admin course deletion route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to delete course.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
