import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type BulkAssignmentBody = {
  userIds?: string[];
  courseId?: string;
};

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_bulk_assignment');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = (await request.json().catch(() => ({}))) as BulkAssignmentBody;
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.filter((value): value is string => typeof value === 'string' && ObjectId.isValid(value))
      : [];
    const courseId = body.courseId?.trim();

    if (!courseId || !ObjectId.isValid(courseId)) {
      await logSystemEvent(
        'WARN',
        'admin_bulk_assignment',
        'Rejected bulk assignment due to invalid courseId.',
        { actorAdminId: session.user._id.toString(), courseId: courseId || 'none' },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Valid courseId is required.' }, { status: 400 });
    }

    if (!userIds.length) {
      await logSystemEvent(
        'WARN',
        'admin_bulk_assignment',
        'Rejected bulk assignment due to empty/invalid userIds.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'At least one valid userId is required.' }, { status: 400 });
    }

    const [course, users] = await Promise.all([
      db.collection(COLLECTIONS.courses).findOne({ _id: new ObjectId(courseId) }),
      db
        .collection(COLLECTIONS.users)
        .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) }, role: 'trainee' })
        .toArray(),
    ]);

    if (!course) {
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }

    if (!users.length) {
      await logSystemEvent(
        'WARN',
        'admin_bulk_assignment',
        'Bulk assignment matched no trainee users.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'No matching users found.' }, { status: 404 });
    }

    const now = new Date();

    await db.collection(COLLECTIONS.enrollments).bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { userId: user._id.toString(), courseId },
          update: {
            $setOnInsert: {
              userId: user._id.toString(),
              courseId,
              progressPct: 0,
              completedModuleIds: [],
              assignedAt: now,
            },
            $set: {
              status: 'assigned',
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    await db.collection(COLLECTIONS.enrollmentAudit).insertMany(
      users.map((user) => ({
        userId: user._id.toString(),
        courseId,
        action: 'assigned_by_admin',
        source: 'admin_api',
        createdAt: now,
        metadata: {
          endpoint: '/api/admin/assignments/bulk',
          actorAdminId: session.user._id.toString(),
        },
      }))
    );

    await logSystemEvent(
      'INFO',
      'admin_bulk_assignment',
      'Bulk course assignment completed.',
      { actorAdminId: session.user._id.toString(), courseId, assignedCount: users.length },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Course assigned to selected users.', assignedCount: users.length });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_bulk_assignment',
      'Bulk assignment route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed bulk assignment.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
