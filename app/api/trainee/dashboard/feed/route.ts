import { NextResponse } from 'next/server';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { ACHIEVEMENTS, SAFETY_TIPS, UPCOMING_EVENTS } from '@/data/mockTraineeData';
import { COLLECTIONS } from '@/lib/db/collections';

type TraineeAnnouncementEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  type: string;
  mandatory?: boolean;
};

export async function GET(request: Request) {
  const trainee = await requireTrainee(request);
  if (!trainee.ok) {
    return trainee.response;
  }

  const { db, session } = trainee;
  const userDept = typeof session.user.department === 'string' && session.user.department.trim().length > 0
    ? session.user.department.trim()
    : 'General';
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const announcements = await db
    .collection(COLLECTIONS.adminAnnouncements)
    .find({ status: { $ne: 'archived' }, createdAt: { $gte: sevenDaysAgo } })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  const mappedAnnouncementEvents: TraineeAnnouncementEvent[] = announcements
    .filter((doc) => {
      const sentTo = Array.isArray(doc.sentTo)
        ? doc.sentTo.filter((value): value is string => typeof value === 'string').map((value) => value.trim())
        : ['All Departments'];

      return (
        sentTo.includes('All Departments') ||
        sentTo.includes('General') ||
        sentTo.includes(userDept)
      );
    })
    .map((doc, idx) => {
      const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date();
      return {
        id: idx + 1,
        title: typeof doc.title === 'string' ? doc.title : 'Platform Announcement',
        date: createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: typeof doc.priority === 'string' ? doc.priority : 'INFO',
        mandatory: doc.priority === 'URGENT' || doc.priority === 'HIGH',
      };
    });

  const mergedEvents = [...mappedAnnouncementEvents, ...UPCOMING_EVENTS]
    .slice(0, 8);

  return NextResponse.json({
    ok: true,
    feed: {
      safetyTips: SAFETY_TIPS,
      upcomingEvents: mergedEvents,
      achievements: ACHIEVEMENTS,
      generatedAt: new Date().toISOString(),
      version: '2026-04-10-feed-v2',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
