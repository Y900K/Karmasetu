import { NextResponse } from 'next/server';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { SAFETY_TIPS } from '@/data/mockTraineeData';
import { COLLECTIONS } from '@/lib/db/collections';
import { dedupeEnrollmentsByCourse } from '@/lib/enrollmentMetrics';

type TraineeAnnouncementEvent = {
  id: string;
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
  const userId = session.user._id.toString();
  const userDept = typeof session.user.department === 'string' && session.user.department.trim().length > 0
    ? session.user.department.trim()
    : 'General';
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch admin announcements from database only (no mock events)
  const announcements = await db
    .collection(COLLECTIONS.adminAnnouncements)
    .find({ status: { $ne: 'archived' }, createdAt: { $gte: sevenDaysAgo } })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  const upcomingEvents: TraineeAnnouncementEvent[] = announcements
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
    .map((doc) => {
      const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date();
      return {
        id: doc._id.toString(),
        title: typeof doc.title === 'string' ? doc.title : 'Platform Announcement',
        date: createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: typeof doc.priority === 'string' ? doc.priority : 'INFO',
        mandatory: doc.priority === 'URGENT' || doc.priority === 'HIGH',
      };
    });

  // Dynamic achievements based on real enrollments + certificates
  const rawEnrollments = await db.collection(COLLECTIONS.enrollments).find({ userId }).toArray();
  const enrollments = dedupeEnrollmentsByCourse(rawEnrollments);

  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  
  const dynamicAchievements = [
    { 
      id: 1, 
      title: "First Course Completed", 
      icon: "🎓", 
      unlocked: completedCount >= 1, 
      hint: "Complete your first safety training" 
    },
    { 
      id: 2, 
      title: "10 Quizzes Passed", 
      icon: "📝", 
      unlocked: completedCount >= 10, 
      hint: "Successfully complete 10 training assessments" 
    },
    { 
      id: 3, 
      title: "Safety Champion", 
      icon: "🏆", 
      unlocked: completedCount >= 5, 
      hint: "Complete 5 courses to unlock" 
    },
    { 
      id: 4, 
      title: "100% Compliance Streak", 
      icon: "⭐", 
      unlocked: enrollments.length > 0 && enrollments.every(e => e.status === 'completed'), 
      hint: "Complete all assigned courses to earn this badge" 
    },
  ];

  return NextResponse.json({
    ok: true,
    feed: {
      safetyTips: SAFETY_TIPS,
      upcomingEvents,
      achievements: dynamicAchievements,
      generatedAt: new Date().toISOString(),
      version: '2026-04-15-feed-fixed',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
