import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_global_bulk_assign');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = await request.json().catch(() => ({}));
    const { courseIds } = body;

    const validCourseIds = Array.isArray(courseIds)
      ? courseIds
          .filter((id): id is string => typeof id === 'string' && ObjectId.isValid(id))
          .map((id) => id.trim())
      : [];

    if (validCourseIds.length === 0) {
      await logSystemEvent(
        'WARN',
        'admin_global_bulk_assign',
        'Rejected global bulk assign due to invalid courseIds.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'No courses provided to assign.' }, { status: 400 });
    }

    const foundCourses = await db
      .collection(COLLECTIONS.courses)
      .find({ _id: { $in: validCourseIds.map((id) => new ObjectId(id)) }, isDeleted: { $ne: true } })
      .project({ _id: 1 })
      .toArray();

    const foundIdSet = new Set(foundCourses.map((course) => course._id.toString()));
    const assignableCourseIds = validCourseIds.filter((id) => foundIdSet.has(id));

    if (assignableCourseIds.length === 0) {
      return NextResponse.json({ ok: false, message: 'No valid active courses found.' }, { status: 404 });
    }

    // Fetch all non-admin users to assign these courses to
    const trainees = await db.collection(COLLECTIONS.users).find({ role: 'trainee' }).project({ _id: 1 }).toArray();
    
    if (trainees.length === 0) {
      return NextResponse.json({ ok: false, message: 'No trainees found in the system.' }, { status: 404 });
    }

    const now = new Date();
    const bulkOps: Array<Record<string, unknown>> = [];

    // For every selected course and every trainee, attempt to insert an assignment
    for (const courseId of assignableCourseIds) {
      for (const trainee of trainees) {
        bulkOps.push({
          updateOne: {
            filter: { userId: trainee._id.toString(), courseId: String(courseId) },
            update: {
              $setOnInsert: {
                userId: trainee._id.toString(),
                courseId: String(courseId),
                progressPct: 0,
                completedModuleIds: [],
                status: 'assigned',
                score: null,
                assignedAt: now,
                updatedAt: now,
              }
            },
            upsert: true
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await db.collection(COLLECTIONS.enrollments).bulkWrite(
        bulkOps as Array<{
          updateOne: {
            filter: Record<string, unknown>;
            update: Record<string, unknown>;
            upsert: boolean;
          };
        }>,
        { ordered: false }
      );
    }

    await logSystemEvent(
      'INFO',
      'admin_global_bulk_assign',
      'Global bulk assignment completed.',
      {
        actorAdminId: session.user._id.toString(),
        traineeCount: trainees.length,
        courseCount: assignableCourseIds.length,
      },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: `Courses successfully assigned to ${trainees.length} trainees.` });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_global_bulk_assign',
      'Global bulk assignment route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, message: 'Failed to assign courses.', details: process.env.NODE_ENV === 'development' ? details : undefined },
      { status: 500 }
    );
  }
}
