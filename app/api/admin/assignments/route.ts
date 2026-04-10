import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type AssignmentBody = {
  userId?: string;
  courseId?: string;
};

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_assignment');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = (await request.json().catch(() => ({}))) as AssignmentBody;
    const userId = body.userId?.trim();
    const courseId = body.courseId?.trim();

    if (!userId || !courseId) {
      await logSystemEvent(
        'WARN',
        'admin_assignment',
        'Rejected assignment request due to missing userId/courseId.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'userId and courseId are required.' }, { status: 400 });
    }

    if (!ObjectId.isValid(userId)) {
      await logSystemEvent(
        'WARN',
        'admin_assignment',
        'Rejected assignment request due to invalid userId.',
        { actorAdminId: session.user._id.toString(), targetUserId: userId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid userId format.' }, { status: 400 });
    }

    if (!ObjectId.isValid(courseId)) {
      await logSystemEvent(
        'WARN',
        'admin_assignment',
        'Rejected assignment request due to invalid courseId.',
        { actorAdminId: session.user._id.toString(), courseId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid courseId format.' }, { status: 400 });
    }

    const [user, course] = await Promise.all([
      db.collection(COLLECTIONS.users).findOne({ _id: new ObjectId(userId) }),
      db.collection(COLLECTIONS.courses).findOne({ _id: new ObjectId(courseId) }),
    ]);

    if (!user) {
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    if (user.role !== 'trainee') {
      await logSystemEvent(
        'WARN',
        'admin_assignment',
        'Blocked assignment attempt for non-trainee target user.',
        { actorAdminId: session.user._id.toString(), targetUserId: userId, targetRole: user.role },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Only trainee users can be assigned courses.' }, { status: 400 });
    }

    if (!course) {
      return NextResponse.json({ ok: false, message: 'Course not found.' }, { status: 404 });
    }

    await db.collection(COLLECTIONS.enrollments).updateOne(
      { userId, courseId },
      {
        $setOnInsert: {
          userId,
          courseId,
          progressPct: 0,
          completedModuleIds: [],
          assignedAt: new Date(),
        },
        $set: {
          status: 'assigned',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    await db.collection(COLLECTIONS.enrollmentAudit).insertOne({
      userId,
      courseId,
      action: 'assigned_by_admin',
      source: 'admin_api',
      createdAt: new Date(),
      metadata: {
        endpoint: '/api/admin/assignments',
        actorAdminId: session.user._id.toString(),
      },
    });

    await logSystemEvent(
      'INFO',
      'admin_assignment',
      'Course assigned by admin.',
      { actorAdminId: session.user._id.toString(), targetUserId: userId, courseId },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Course assigned successfully.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_assignment',
      'Admin assignment route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to assign course.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
