import { NextResponse } from 'next/server';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { COLLECTIONS } from '@/lib/db/collections';
import { dedupeEnrollmentsByCourse } from '@/lib/enrollmentMetrics';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const auth = await requireTrainee(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { db, session } = auth;
    const userId = session.user._id.toString();

    // 1. Fetch all enrollments for this user
    const rawEnrollments = await db
      .collection(COLLECTIONS.enrollments)
      .find({ userId })
      .toArray();
    const enrollments = dedupeEnrollmentsByCourse(rawEnrollments);

    const validCourseIds = enrollments
      .map(e => typeof e.courseId === 'string' ? e.courseId : '')
      .filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    const courseIds = validCourseIds.map(id => new ObjectId(id));
    const courses = courseIds.length > 0
      ? await db.collection(COLLECTIONS.courses).find({ _id: { $in: courseIds } }).toArray()
      : [];

    const courseMap = new Map(courses.map(c => [c._id.toString(), c]));

    // 2. Fetch recent audit logs for activity trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const auditLogs = await db
      .collection(COLLECTIONS.enrollmentAudit)
      .find({ 
        userId, 
        createdAt: { $gte: thirtyDaysAgo } 
      })
      .sort({ createdAt: 1 })
      .toArray();

    // 3. Process Radar Data (Course Progress)
    const radarData = enrollments.slice(0, 6).map(e => ({
      subject: courseMap.get(e.courseId)?.title || 'Course',
      A: e.progressPct || 0,
      fullMark: 100,
    }));

    // 4. Process Line Data (Quiz Scores History)
    // Only looking for 'completed' actions with scores
    const scoreHistory = auditLogs
      .filter(log => log.action === 'completed' && typeof log.score === 'number')
      .map(log => ({
        date: new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: log.score
      }));

    // 5. Process Bar Data (Weekly Activity Trend - last 7 days)
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days[label] = 0;
    }

    auditLogs.forEach(log => {
      const label = new Date(log.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (last7Days[label] !== undefined) {
        last7Days[label]++;
      }
    });

    const activityData = Object.entries(last7Days).map(([name, interactions]) => ({
      name,
      interactions
    }));

    // 6. Stats Summary
    const totalCerts = await db.collection(COLLECTIONS.certificates).countDocuments({ userId, status: 'valid' });
    const avgScore = enrollments.length > 0 
      ? Math.round(enrollments.reduce((acc, e) => acc + (e.score || 0), 0) / enrollments.length)
      : 0;

    return NextResponse.json({
      ok: true,
      stats: {
        avgScore,
        coursesCompleted: enrollments.filter(e => e.status === 'completed').length,
        totalInteractions: auditLogs.length,
        certificates: totalCerts,
      },
      charts: {
        radar: radarData,
        line: scoreHistory,
        bar: activityData,
      }
    });

  } catch (error) {
    console.error('Trainee Analytics API Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
