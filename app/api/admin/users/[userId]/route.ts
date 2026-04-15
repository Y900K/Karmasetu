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

    const now = new Date();
    const deactivateResult = await db.collection(COLLECTIONS.users).updateOne(
      { _id },
      {
        $set: {
          isActive: false,
          deletedAt: now,
          updatedAt: now,
        },
      }
    );
    if (!deactivateResult.matchedCount) {
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    await db.collection(COLLECTIONS.sessions).deleteMany({ userId });

    await logSystemEvent(
      'INFO',
      'admin_user_deactivate',
      'User deactivated by admin while preserving history.',
      { actorAdminId: session.user._id.toString(), targetUserId: userId },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'User deactivated. Historical data preserved.' });
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

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_user_update');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;
    const body = await request.json().catch(() => ({}));

    if (!body.approvalStatus || !['approved', 'restricted'].includes(body.approvalStatus)) {
      return NextResponse.json({ ok: false, message: 'Invalid approval status.' }, { status: 400 });
    }

    const { userId } = await params;
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ ok: false, message: 'Invalid user id.' }, { status: 400 });
    }

    const _id = new ObjectId(userId);
    const targetUser = await db.collection(COLLECTIONS.users).findOne({ _id });

    if (!targetUser) {
      return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ ok: false, message: 'Cannot modify admin users via this endpoint.' }, { status: 403 });
    }

    const accessLevel = body.approvalStatus === 'approved' ? 'full' : 'basic';

    await db.collection(COLLECTIONS.users).updateOne(
      { _id },
      {
        $set: {
          approvalStatus: body.approvalStatus,
          accessLevel: accessLevel,
          updatedAt: new Date(),
        },
      }
    );

    // If restricting, kill their active sessions
    if (body.approvalStatus === 'restricted') {
      await db.collection(COLLECTIONS.sessions).deleteMany({ userId });
    }

    await logSystemEvent(
      'INFO',
      'admin_user_update',
      `User status changed to ${body.approvalStatus}`,
      { actorAdminId: session.user._id.toString(), targetUserId: userId, newStatus: body.approvalStatus },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: `User status changed to ${body.approvalStatus}.` });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update user status.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
