import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_user_delete');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;
    const { userId } = await params;
    if (!ObjectId.isValid(userId)) {
      await logSystemEvent(
        'WARN',
        'admin_user_delete',
        'Rejected user deletion due to invalid user id format.',
        { actorAdminId: session.user._id.toString(), userId }
      );
      return NextResponse.json({ ok: false, message: 'Invalid user id.' }, { status: 400 });
    }

    const _id = new ObjectId(userId);
    const targetUser = await db.collection(COLLECTIONS.users).findOne({ _id });

    if (!targetUser) {
      await logSystemEvent(
        'WARN',
        'admin_user_delete',
        'Rejected user deletion because target user was not found.',
        { actorAdminId: session.user._id.toString(), targetUserId: userId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      await logSystemEvent(
        'WARN',
        'admin_user_delete',
        'Blocked attempt to delete an admin user.',
        { actorAdminId: session.user._id.toString(), targetUserId: userId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Admin users cannot be deleted via this endpoint.' }, { status: 403 });
    }

    const deleteResult = await db.collection(COLLECTIONS.users).deleteOne({ _id });
    if (!deleteResult.deletedCount) {
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    await Promise.all([
      db.collection(COLLECTIONS.sessions).deleteMany({ userId }),
      db.collection(COLLECTIONS.enrollments).deleteMany({ userId }),
      db.collection(COLLECTIONS.certificates).deleteMany({ userId }),
    ]);

    await logSystemEvent(
      'INFO',
      'admin_user_delete',
      'User deleted by admin.',
      { actorAdminId: session.user._id.toString(), targetUserId: userId },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'User deleted.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_user_delete',
      'Admin user deletion route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to delete user.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
