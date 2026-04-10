import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { getMongoDb } from '@/lib/mongodb';
import { resolveSessionUser } from '@/lib/auth/session';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type AnnouncementPriority = 'INFO' | 'REMINDER' | 'HIGH' | 'URGENT';
type AnnouncementStatus = 'sent' | 'scheduled' | 'archived';

type CreateAnnouncementBody = {
  title?: string;
  body?: string;
  sentTo?: string[];
  priority?: AnnouncementPriority;
  scheduledAt?: string;
};

const ALLOWED_PRIORITIES: AnnouncementPriority[] = ['INFO', 'REMINDER', 'HIGH', 'URGENT'];

function normalizePriority(value: unknown): AnnouncementPriority {
  return ALLOWED_PRIORITIES.includes(value as AnnouncementPriority)
    ? (value as AnnouncementPriority)
    : 'INFO';
}

export async function GET(request: Request) {
  try {
    const db = await getMongoDb();
    const session = await resolveSessionUser(db, request);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access denied.' }, { status: 403 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Archive announcements older than 7 days to keep the feed current.
    await db.collection(COLLECTIONS.adminAnnouncements).updateMany(
      {
        status: { $ne: 'archived' },
        createdAt: { $lt: sevenDaysAgo },
      },
      {
        $set: { status: 'archived', updatedAt: new Date() },
      }
    );

    const docs = await db
      .collection(COLLECTIONS.adminAnnouncements)
      .find({ status: { $ne: 'archived' }, createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();

    const announcements = docs.map((doc) => ({
      id: doc._id.toString(),
      title: typeof doc.title === 'string' ? doc.title : 'Untitled Announcement',
      body: typeof doc.body === 'string' ? doc.body : '',
      sentTo: Array.isArray(doc.sentTo) ? doc.sentTo.filter((v): v is string => typeof v === 'string') : ['All Departments'],
      sentBy: typeof doc.sentBy === 'string' ? doc.sentBy : 'Admin',
      date: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      priority: normalizePriority(doc.priority),
      status: (doc.status === 'scheduled' || doc.status === 'archived') ? doc.status : 'sent',
      scheduledAt: doc.scheduledAt instanceof Date ? doc.scheduledAt.toISOString() : null,
    }));

    return NextResponse.json({ ok: true, announcements }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load announcements.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_announcement_create');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = (await request.json().catch(() => ({}))) as CreateAnnouncementBody;

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.body === 'string' ? body.body.trim() : '';
    const sentTo = Array.isArray(body.sentTo)
      ? body.sentTo.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    const priority = normalizePriority(body.priority);
    const scheduledAt = typeof body.scheduledAt === 'string' && body.scheduledAt.trim().length > 0
      ? new Date(body.scheduledAt)
      : null;

    if (title.length < 3) {
      await logSystemEvent(
        'WARN',
        'admin_announcement_create',
        'Rejected announcement create due to short title.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Title must be at least 3 characters.' }, { status: 400 });
    }

    if (message.length < 5) {
      await logSystemEvent(
        'WARN',
        'admin_announcement_create',
        'Rejected announcement create due to short message.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Message must be at least 5 characters.' }, { status: 400 });
    }

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      await logSystemEvent(
        'WARN',
        'admin_announcement_create',
        'Rejected announcement create due to invalid schedule date.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid schedule date.' }, { status: 400 });
    }

    const now = new Date();
    const insertDoc = {
      title,
      body: message,
      sentTo: sentTo.length > 0 ? sentTo : ['All Departments'],
      sentBy: typeof session.user.fullName === 'string' && session.user.fullName.trim().length > 0
        ? session.user.fullName
        : 'Admin',
      priority,
      status: scheduledAt && scheduledAt.getTime() > now.getTime() ? 'scheduled' as AnnouncementStatus : 'sent' as AnnouncementStatus,
      scheduledAt,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.adminAnnouncements).insertOne(insertDoc);

    await logSystemEvent(
      'INFO',
      'admin_announcement_create',
      'Announcement created by admin.',
      { actorAdminId: session.user._id.toString(), announcementId: result.insertedId.toString() },
      session.user._id.toString()
    );

    return NextResponse.json({
      ok: true,
      announcement: {
        id: result.insertedId.toString(),
        title: insertDoc.title,
        body: insertDoc.body,
        sentTo: insertDoc.sentTo,
        sentBy: insertDoc.sentBy,
        date: insertDoc.createdAt.toISOString(),
        priority: insertDoc.priority,
        status: insertDoc.status,
        scheduledAt: insertDoc.scheduledAt ? insertDoc.scheduledAt.toISOString() : null,
      },
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_announcement_create',
      'Announcement create route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to create announcement.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
