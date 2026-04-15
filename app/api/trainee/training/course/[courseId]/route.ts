import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import type { Course } from '@/data/coursePlayerDummyData';
import { collapseEnrollmentRecords } from '@/lib/enrollmentMetrics';
import {
  extractModuleMedia,
  normalizeQuizQuestions,
  normalizeCourseModules,
  normalizeObjectives,
  normalizeUrlArray,
  normalizeVideoDurations,
  normalizeVideoTitles,
  toDateOnly,
} from '@/lib/courseUtils';

function getStoredScoreState(scoreValue: unknown, questionCount: number) {
  if (typeof scoreValue !== 'number' || Number.isNaN(scoreValue)) {
    return {
      rawScore: null as number | null,
      percentScore: null as number | null,
    };
  }

  const normalizedQuestionCount = Math.max(questionCount, 1);

  if (scoreValue <= normalizedQuestionCount) {
    return {
      rawScore: scoreValue,
      percentScore: Math.round((scoreValue / normalizedQuestionCount) * 100),
    };
  }

  return {
    rawScore: Math.round((scoreValue / 100) * normalizedQuestionCount),
    percentScore: Math.round(scoreValue),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const { courseId } = await params;
    const course = ObjectId.isValid(courseId)
      // Remove isDeleted filter so historical records can still be viewed by enrolled trainees
      ? await db.collection(COLLECTIONS.courses).findOne({ _id: new ObjectId(courseId) })
      : await db.collection(COLLECTIONS.courses).findOne({
          $or: [{ code: courseId }, { slug: courseId }],
        });

    if (!course) {
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }

    const resolvedCourseId = course._id.toString();
    const courseIds = [resolvedCourseId];
    if (typeof course.code === 'string' && course.code.trim().length > 0 && course.code !== resolvedCourseId) {
      courseIds.push(course.code.trim());
    }
    if (typeof course.slug === 'string' && course.slug.trim().length > 0 && course.slug !== resolvedCourseId && course.slug !== course.code) {
      courseIds.push(course.slug.trim());
    }
    const enrollmentRecords = await db.collection(COLLECTIONS.enrollments).find({
      userId: session.user._id.toString(),
      courseId: { $in: Array.from(new Set(courseIds)) },
    }).toArray();
    const enrollment = enrollmentRecords.length > 0 ? collapseEnrollmentRecords(enrollmentRecords) : null;

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
    const objectives = normalizeObjectives(course.objectives);
    const questionList = normalizeQuizQuestions(course.quiz?.questions);
    const storedCompletedCount = Array.isArray(enrollment?.completedModuleIds)
      ? enrollment.completedModuleIds.filter((value): value is string => typeof value === 'string').length
      : 0;
    const viewedDocIds = Array.isArray(enrollment?.viewedDocIds)
      ? enrollment.viewedDocIds.filter((value): value is string => typeof value === 'string')
      : [];

    const videoModules = normalizedModules.filter((module) => module.type === 'video');
    const documentModules = normalizedModules.filter((module) => module.type === 'document');

    const lessons: Course['lessons'] =
      videoModules.length > 0
        ? videoModules.map((module, index) => ({
            id: module.id || `lesson_${index + 1}_${resolvedCourseId}`,
            number: index + 1,
            title: module.title,
            description:
              module.description ||
              (typeof course.description === 'string' && course.description.trim().length > 0
                ? course.description
                : 'Review this training lesson carefully before moving to the next step.'),
            youtubeURL: module.url,
            duration: module.duration || 'Self-paced',
            completed: index < storedCompletedCount,
            locked: index > storedCompletedCount,
          }))
        : videoUrls.map((url, index) => ({
            id: `lesson_${index + 1}_${resolvedCourseId}`,
            number: index + 1,
            title: videoTitles[index] || (videoUrls.length === 1 ? title : `${title} - Lesson ${index + 1}`),
            description:
              typeof course.description === 'string' && course.description.trim().length > 0
                ? course.description
                : 'Review this training lesson carefully before moving to the next step.',
            youtubeURL: url,
            duration: videoDurations[index] || 'Self-paced',
            completed: index < storedCompletedCount,
            locked: index > storedCompletedCount,
          }));

    const documents: Course['documents'] =
      documentModules.length > 0
        ? documentModules.map((module, index) => ({
            id: module.id || `doc_${index + 1}_${resolvedCourseId}`,
            title: module.title,
            driveURL: module.url,
            type: 'PDF',
          }))
        : pdfUrls.map((url, index) => ({
            id: `doc_${index + 1}_${resolvedCourseId}`,
            title: pdfUrls.length > 1 ? `Course Material ${index + 1}` : `${title} Material`,
            driveURL: url,
            type: 'PDF',
          }));

    const quizQuestions: Course['quiz']['questions'] = questionList.map(
      (question, index: number) => ({
        id: `quiz_q_${index + 1}_${resolvedCourseId}`,
        text: question.text || `Question ${index + 1}`,
        options: question.options,
        correct: question.correct,
        flagged: false,
      })
    );

    const { rawScore, percentScore } = getStoredScoreState(enrollment?.score, quizQuestions.length);
    const passingScore = typeof course.passingScore === 'number' ? course.passingScore : 70;

    const translatedCourse: Course = {
      id: resolvedCourseId,
      title,
      category: typeof course.category === 'string' ? course.category : 'General',
      level: typeof course.level === 'string' ? course.level : 'Beginner',
      deadline: toDateOnly(course.deadline) || '',
      thumbnail: typeof course.thumbnail === 'string' ? course.thumbnail : '',
      instructor:
        typeof course.instructorName === 'string' && course.instructorName.trim().length > 0
          ? course.instructorName.trim()
          : undefined,
      instructorRole:
        typeof course.instructorRole === 'string' && course.instructorRole.trim().length > 0
          ? course.instructorRole.trim()
          : undefined,
      objectives,
      totalLessons: lessons.length,
      passingScore,
      quizTimeLimit: typeof course.quizTimeLimit === 'number' ? course.quizTimeLimit : 15,
      viewedDocIds,
      lessons,
      documents,
      quiz: {
        id: `quiz_${resolvedCourseId}`,
        unlocked: lessons.length === 0 || storedCompletedCount >= lessons.length,
        attempted: percentScore !== null,
        score: rawScore,
        passed: percentScore !== null ? percentScore >= passingScore : false,
        questions: quizQuestions,
      },
    };

    return NextResponse.json({ ok: true, course: translatedCourse });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to fetch course details.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
