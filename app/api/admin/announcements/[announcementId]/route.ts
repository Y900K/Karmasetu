import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ announcementId: string }> }
) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_announcement_archive');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const { announcementId } = await context.params;
    if (!ObjectId.isValid(announcementId)) {
      await logSystemEvent(
        'WARN',
        'admin_announcement_archive',
        'Rejected archive request due to invalid announcement id.',
        { actorAdminId: session.user._id.toString(), announcementId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid announcement id.' }, { status: 400 });
    }

    const result = await db.collection(COLLECTIONS.adminAnnouncements).updateOne(
      { _id: new ObjectId(announcementId) },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      await logSystemEvent(
        'WARN',
        'admin_announcement_archive',
        'Archive target announcement not found.',
        { actorAdminId: session.user._id.toString(), announcementId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Announcement not found.' }, { status: 404 });
    }

    await logSystemEvent(
      'INFO',
      'admin_announcement_archive',
      'Announcement archived by admin.',
      { actorAdminId: session.user._id.toString(), announcementId },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Announcement archived.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_announcement_archive',
      'Announcement archive route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to archive announcement.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
