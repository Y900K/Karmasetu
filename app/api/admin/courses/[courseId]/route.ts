import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
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
  CourseQuizQuestion,
} from '@/lib/courseUtils';
import { importThumbnailAsset, resolveThumbnailPersistence } from '@/lib/server/courseThumbnail';

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
  quiz?: { questions?: Array<{ text: string; options: string[]; correct: number; explanation?: string }> };
  quizTimeLimit?: number;
  videoTitles?: string[];
  videoDurations?: string[];
  modulesData?: Array<Record<string, unknown>>;
  isDefaultForNewTrainees?: boolean;
};


export async function PUT(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_course_update');
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
      updateSet.quiz = { questions: validation.questions as CourseQuizQuestion[] };
    }

    if (typeof body.quizTimeLimit === 'number') {
      updateSet.quizTimeLimit = body.quizTimeLimit;
    }

    const incomingModules = normalizeCourseModules(body.modulesData, resolvedTitle);
    const incomingMedia = extractModuleMedia(incomingModules);
    const fallbackVideoUrls = normalizeUrlArray(body.videoUrls, body.videoUrl);
    const fallbackPdfUrls = normalizeUrlArray(body.pdfUrls, body.pdfUrl);

    const videoUrls = incomingMedia.videoUrls.length > 0 ? incomingMedia.videoUrls : fallbackVideoUrls;
    const pdfUrls = incomingMedia.pdfUrls.length > 0 ? incomingMedia.pdfUrls : fallbackPdfUrls;

    const videoTitles =
      incomingMedia.videoTitles.length > 0
        ? incomingMedia.videoTitles
        : normalizeVideoTitles(body.videoTitles, videoUrls, resolvedTitle);

    const videoDurations =
      incomingMedia.videoDurations.length > 0
        ? incomingMedia.videoDurations
        : normalizeVideoDurations(body.videoDurations, videoUrls);

    const finalModules =
      incomingModules.length > 0
        ? incomingModules
        : buildCourseModules(videoUrls, pdfUrls, videoTitles, videoDurations, resolvedTitle);

    if (finalModules.length > 0) {
      updateSet.modules = finalModules;
      updateSet.modulesCount = resolveModulesCount(body.modules, videoUrls, pdfUrls, finalModules);
    } else if (typeof body.modules === 'number') {
      updateSet.modulesCount = body.modules;
    }

    if (body.deadline === null) {
      updateUnset.deadline = '';
    } else if (typeof body.deadline === 'string' && body.deadline) {
      updateSet.deadline = new Date(body.deadline);
    }

    const newVersion = (existingCourse.version || 1) + 1;
    const now = new Date();

    // Prepare the new document by merging existing with updates
    const newCourseDoc = {
      ...existingCourse,
      ...updateSet,
      version: newVersion,
      isLatest: true,
      updatedAt: now,
    };
    delete (newCourseDoc as any)._id;

    // Apply unsets to the new document object
    if (Object.keys(updateUnset).length > 0) {
      for (const key of Object.keys(updateUnset)) {
        delete (newCourseDoc as any)[key];
      }
    }

    const insertResult = await db.collection(COLLECTIONS.courses).insertOne(newCourseDoc);
    const newCourseId = insertResult.insertedId.toString();

    // Mark original document as legacy
    await db.collection(COLLECTIONS.courses).updateOne(
      { _id: new ObjectId(courseId) },
      { $set: { isLatest: false, isPublished: false, updatedAt: now } }
    );

    await logSystemEvent(
      'INFO',
      'admin_course_update',
      'Course versioned update created by admin.',
      { 
        actorAdminId: session.user._id.toString(), 
        originalCourseId: courseId, 
        newCourseId,
        version: newVersion 
      },
      session.user._id.toString()
    );

    if (body.status !== 'Inactive' && body.isDefaultForNewTrainees === true) {
      const traineeFilter: Record<string, any> = { role: 'trainee' };
      if (Array.isArray(body.departments) && body.departments.length > 0) {
        traineeFilter.department = { $in: body.departments };
      }

      const trainees = await db.collection(COLLECTIONS.users)
          .find(traineeFilter)
          .project({ _id: 1, department: 1 })
          .toArray();

      if (trainees.length > 0) {
        // Find all course IDs that belong to the same logical course (externalId)
        const logicalCourseIds = await db.collection(COLLECTIONS.courses)
          .find({ externalId: existingCourse.externalId })
          .project({ _id: 1 })
          .toArray()
          .then(docs => docs.map(d => d._id.toString()));

        const assignmentOps = trainees.map((trainee) => {
          const traineeId = trainee._id.toString();
          const setOnInsert: Record<string, unknown> = {
            userId: traineeId,
            courseId: newCourseId,
            progressPct: 0,
            completedModuleIds: [],
            assignedAt: now,
          };

          if (typeof trainee.department === 'string' && trainee.department.trim()) {
            setOnInsert.department = trainee.department;
          }

          return {
            updateOne: {
              // Only enroll if they don't have ANY version of this logical course
              filter: { userId: traineeId, courseId: { $in: logicalCourseIds } },
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

    return NextResponse.json({ ok: true, message: 'Course updated and versioned.', courseId: newCourseId });
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
    const admin = await requireSecureAdminMutation(request, 'admin_course_delete');
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
