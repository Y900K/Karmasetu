import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';
import type { CourseThumbnailMeta } from '@/lib/courseUtils';
import {
  buildCourseModules,
  extractModuleMedia,
  normalizeCourseModules,
  normalizeIcon,
  normalizeObjectives,
  normalizeUrlArray,
  normalizeVideoDurations,
  normalizeVideoTitles,
  resolveModulesCount,
  toDateOnly,
  validateQuizQuestions,
} from '@/lib/courseUtils';
import { importThumbnailAsset } from '@/lib/server/courseThumbnail';

type CourseInput = {
  title?: string;
  category?: string;
  level?: string;
  modules?: number;
  deadline?: string | null;
  status?: string;
  theme?: string;
  icon?: string;
  description?: string;
  instructorName?: string;
  instructorRole?: string;
  objectives?: string[];
  passingScore?: number;
  departments?: string[];
  videoUrl?: string;
  pdfUrl?: string;
  videoUrls?: string[];
  pdfUrls?: string[];
  videoTitles?: string[];
  videoDurations?: string[];
  modulesData?: Array<Record<string, unknown>>;
  thumbnail?: string;
  thumbnailMeta?: CourseThumbnailMeta;
  quiz?: { questions?: Array<{ text: string; options: string[]; correct: number }> };
  quizTimeLimit?: number;
  isDefaultForNewTrainees?: boolean;
};

function toCourseCode(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${slug || 'course'}_${Date.now()}`;
}

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

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db } = admin;

    const [courses, enrollmentStats] = await Promise.all([
      db.collection(COLLECTIONS.courses).find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).toArray(),
      db
        .collection(COLLECTIONS.enrollments)
        .aggregate<{ _id: string; enrolled: number; completionRate: number }>([
          {
            $group: {
              _id: '$courseId',
              enrolled: { $sum: 1 },
              completionRate: { $avg: '$progressPct' },
            },
          },
        ])
        .toArray(),
    ]);

    const statMap = new Map<string, { enrolled: number; completionRate: number }>(
      enrollmentStats.map((entry) => [
        entry._id,
        {
          enrolled: entry.enrolled || 0,
          completionRate: Math.round(entry.completionRate || 0),
        },
      ])
    );

    const rows = courses.map((course) => {
      const id = course._id.toString();
      const stats = statMap.get(id) || { enrolled: 0, completionRate: 0 };
      const title = typeof course.title === 'string' ? course.title : 'Untitled Course';
      const normalizedModules = normalizeCourseModules(course.modules, title);
      const moduleMedia = extractModuleMedia(normalizedModules);
      const legacyVideoUrls = normalizeUrlArray(course.videoUrls, course.videoUrl);
      const legacyPdfUrls = normalizeUrlArray(course.pdfUrls, course.pdfUrl);
      const videoUrls = moduleMedia.videoUrls.length > 0 ? moduleMedia.videoUrls : legacyVideoUrls;
      const pdfUrls = moduleMedia.pdfUrls.length > 0 ? moduleMedia.pdfUrls : legacyPdfUrls;
      const videoTitles =
        moduleMedia.videoTitles.length > 0
          ? moduleMedia.videoTitles
          : normalizeVideoTitles(course.videoTitles, videoUrls, title);
      const videoDurations =
        moduleMedia.videoDurations.length > 0
          ? moduleMedia.videoDurations
          : normalizeVideoDurations(course.videoDurations, videoUrls);
      const modules =
        normalizedModules.length > 0
          ? normalizedModules
          : buildCourseModules(videoUrls, pdfUrls, videoTitles, videoDurations, title);

      return {
        id,
        title,
        category: typeof course.category === 'string' ? course.category : 'General',
        level: typeof course.level === 'string' ? course.level : 'Beginner',
        modules: resolveModulesCount(course.modulesCount, videoUrls, pdfUrls, modules),
        enrolled: stats.enrolled,
        completionRate: stats.completionRate,
        deadline: toDateOnly(course.deadline),
        status: course.isPublished ? 'Active' : 'Inactive',
        theme: typeof course.theme === 'string' ? course.theme : 'from-cyan-600 to-sky-500',
        icon: normalizeIcon(course.icon, typeof course.category === 'string' ? course.category : undefined),
        description: typeof course.description === 'string' ? course.description : '',
        instructorName: typeof course.instructorName === 'string' ? course.instructorName : '',
        instructorRole: typeof course.instructorRole === 'string' ? course.instructorRole : '',
        objectives: normalizeObjectives(course.objectives),
        passingScore: typeof course.passingScore === 'number' ? course.passingScore : 70,
        departments: Array.isArray(course.departments) ? course.departments : [],
        videoUrl: videoUrls[0] || '',
        pdfUrl: pdfUrls[0] || '',
        videoUrls,
        pdfUrls,
        videoTitles,
        videoDurations,
        modulesData: modules,
        thumbnail: typeof course.thumbnail === 'string' ? course.thumbnail : '',
        thumbnailMeta:
          course.thumbnailMeta && typeof course.thumbnailMeta === 'object'
            ? (course.thumbnailMeta as CourseThumbnailMeta)
            : undefined,
        quiz: course.quiz || { questions: [] },
        quizTimeLimit: typeof course.quizTimeLimit === 'number' ? course.quizTimeLimit : 15,
      isDefaultForNewTrainees: !!course.isDefaultForNewTrainees,
    };
  });

    return NextResponse.json({ ok: true, courses: rows });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load courses.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'admin_course_create', 'Blocked course creation due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = (await request.json()) as CourseInput;
    const title = body.title?.trim();

    if (!title) {
      await logSystemEvent(
        'WARN',
        'admin_course_create',
        'Rejected course creation due to missing title.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Course title is required.' }, { status: 400 });
    }

    let quizToSave: { questions: Array<{ text: string; options: string[]; correct: number }> } = { questions: [] };
    if (body.quiz && Array.isArray(body.quiz.questions)) {
      const validation = validateQuizQuestions(body.quiz.questions);
      if (!validation.valid) {
        await logSystemEvent(
          'WARN',
          'admin_course_create',
          'Rejected course creation due to invalid quiz payload.',
          { actorAdminId: session.user._id.toString(), title },
          session.user._id.toString()
        );
        return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });
      }
      quizToSave = { questions: validation.questions || [] };
    }

    const code = toCourseCode(title);
    const now = new Date();
    const incomingModules = normalizeCourseModules(body.modulesData, title);
    const incomingMedia = extractModuleMedia(incomingModules);
    const fallbackVideoUrls = normalizeUrlArray(body.videoUrls, body.videoUrl);
    const fallbackPdfUrls = normalizeUrlArray(body.pdfUrls, body.pdfUrl);
    const videoUrls = incomingMedia.videoUrls.length > 0 ? incomingMedia.videoUrls : fallbackVideoUrls;
    const pdfUrls = incomingMedia.pdfUrls.length > 0 ? incomingMedia.pdfUrls : fallbackPdfUrls;
    const videoTitles =
      incomingMedia.videoTitles.length > 0
        ? incomingMedia.videoTitles
        : normalizeVideoTitles(body.videoTitles, videoUrls, title);
    const videoDurations =
      incomingMedia.videoDurations.length > 0
        ? incomingMedia.videoDurations
        : normalizeVideoDurations(body.videoDurations, videoUrls);
    const modulesData =
      incomingModules.length > 0
        ? incomingModules
        : buildCourseModules(videoUrls, pdfUrls, videoTitles, videoDurations, title);
    const modulesCount = resolveModulesCount(body.modules, videoUrls, pdfUrls, modulesData);
    const persistedThumbnail = await resolveThumbnailPersistence(body.thumbnail, body.thumbnailMeta, title);

    const result = await db.collection(COLLECTIONS.courses).insertOne({
      code,
      title,
      category: body.category || 'General',
      level: body.level || 'Beginner',
      modulesCount,
      isPublished: body.status !== 'Inactive',
      ...(body.deadline ? { deadline: new Date(body.deadline) } : {}),
      theme: body.theme || 'from-cyan-600 to-sky-500',
      icon: normalizeIcon(body.icon, body.category),
      description: body.description || '',
      instructorName: typeof body.instructorName === 'string' ? body.instructorName.trim() : '',
      instructorRole: typeof body.instructorRole === 'string' ? body.instructorRole.trim() : '',
      objectives: normalizeObjectives(body.objectives),
      thumbnail: persistedThumbnail.thumbnail,
      ...(persistedThumbnail.thumbnailMeta ? { thumbnailMeta: persistedThumbnail.thumbnailMeta } : {}),
      passingScore: typeof body.passingScore === 'number' ? body.passingScore : 70,
      isDefaultForNewTrainees: !!body.isDefaultForNewTrainees,
      departments: Array.isArray(body.departments) ? body.departments : [],
      videoUrl: videoUrls[0] || '',
      pdfUrl: pdfUrls[0] || '',
      videoUrls,
      pdfUrls,
      videoTitles,
      videoDurations,
      modules: modulesData,
      quiz: quizToSave,
      quizTimeLimit: typeof body.quizTimeLimit === 'number' ? body.quizTimeLimit : 15,
      version: 1,
      createdBy: 'admin',
      createdAt: now,
      updatedAt: now,
      externalId: randomUUID(),
    });

    const createdCourseId = result.insertedId.toString();

    await logSystemEvent(
      'INFO',
      'admin_course_create',
      'Course created by admin.',
      {
        actorAdminId: session.user._id.toString(),
        courseId: createdCourseId,
        title,
        isDefaultForNewTrainees: !!body.isDefaultForNewTrainees,
      },
      session.user._id.toString()
    );

    if (body.status !== 'Inactive' && body.isDefaultForNewTrainees) {
      const trainees = await db
        .collection(COLLECTIONS.users)
        .find({ role: 'trainee' })
        .project({ _id: 1, department: 1 })
        .toArray();

      if (trainees.length > 0) {
        const assignmentOps = trainees.map((trainee) => {
          const setOnInsert: Record<string, unknown> = {
            userId: trainee._id.toString(),
            courseId: createdCourseId,
            progressPct: 0,
            completedModuleIds: [],
            assignedAt: now,
          };

          if (typeof trainee.department === 'string' && trainee.department.trim()) {
            setOnInsert.department = trainee.department;
          }

          return {
            updateOne: {
              filter: { userId: trainee._id.toString(), courseId: createdCourseId },
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

        if (assignmentOps.length > 0) {
          await db.collection(COLLECTIONS.enrollments).bulkWrite(assignmentOps, { ordered: false });
          await db.collection(COLLECTIONS.enrollmentAudit).insertMany(
            trainees.map((trainee) => ({
              userId: trainee._id.toString(),
              courseId: createdCourseId,
              action: 'assigned_by_admin',
              source: 'admin_api',
              createdAt: now,
              metadata: {
                endpoint: '/api/admin/courses#POST',
              },
            }))
          );
        }
      }
    }

    return NextResponse.json({ ok: true, message: 'Course created.', courseId: createdCourseId });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_course_create',
      'Admin course creation route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to create course.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}


