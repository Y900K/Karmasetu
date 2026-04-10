import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  source: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  progressPct?: number;
  score?: number;
  metadata?: Record<string, unknown>;
};

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db } = admin;

    const url = new URL(request.url);
    const parsedLimit = Number(url.searchParams.get('limit') || '50');
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(500, Math.floor(parsedLimit))) : 50;

    const entries = await db
      .collection(COLLECTIONS.enrollmentAudit)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const userIds = entries
      .map((entry) => (typeof entry.userId === 'string' && ObjectId.isValid(entry.userId) ? new ObjectId(entry.userId) : null))
      .filter((value): value is ObjectId => Boolean(value));

    const courseIds = entries
      .map((entry) => (typeof entry.courseId === 'string' && ObjectId.isValid(entry.courseId) ? new ObjectId(entry.courseId) : null))
      .filter((value): value is ObjectId => Boolean(value));

    // Also collect non-ObjectId courseIds (e.g. mock course codes)
    const courseCodeIds = entries
      .map((entry) => (typeof entry.courseId === 'string' && !ObjectId.isValid(entry.courseId) ? entry.courseId : null))
      .filter((value): value is string => Boolean(value));

    const [users, coursesByOid, coursesByCode] = await Promise.all([
      userIds.length ? db.collection(COLLECTIONS.users).find({ _id: { $in: userIds } }).toArray() : [],
      courseIds.length ? db.collection(COLLECTIONS.courses).find({ _id: { $in: courseIds } }).toArray() : [],
      courseCodeIds.length ? db.collection(COLLECTIONS.courses).find({ code: { $in: courseCodeIds } }).toArray() : [],
    ]);

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const courseMap = new Map(coursesByOid.map((course) => [course._id.toString(), course]));
    // Also map by code for legacy/mock references
    for (const c of coursesByCode) {
      if (typeof c.code === 'string') courseMap.set(c.code, c);
    }

    function resolveCourseTitle(courseId: unknown): string {
      if (typeof courseId !== 'string') return 'Unknown Course';
      const found = courseMap.get(courseId);
      if (found?.title) return String(found.title);
      // Better fallback for deleted/orphaned courses
      const shortId = courseId.length > 12 ? `${courseId.slice(0, 6)}…${courseId.slice(-4)}` : courseId;
      return `Deleted Course (ID: ${shortId})`;
    }

    const rows: AuditRow[] = entries.map((entry) => ({
      id: entry._id.toString(),
      createdAt:
        entry.createdAt instanceof Date
          ? entry.createdAt.toISOString()
          : new Date().toISOString(),
      action: typeof entry.action === 'string' ? entry.action : 'unknown',
      source: typeof entry.source === 'string' ? entry.source : 'unknown',
      userId: typeof entry.userId === 'string' ? entry.userId : 'unknown',
      userName:
        typeof entry.userId === 'string' && userMap.get(entry.userId)?.fullName
          ? String(userMap.get(entry.userId)?.fullName)
          : 'Unknown User',
      courseId: typeof entry.courseId === 'string' ? entry.courseId : 'unknown',
      courseTitle: resolveCourseTitle(entry.courseId),
      progressPct: typeof entry.progressPct === 'number' ? entry.progressPct : undefined,
      score: typeof entry.score === 'number' ? entry.score : undefined,
      metadata:
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : undefined,
    }));

    return NextResponse.json(
      { ok: true, count: rows.length, rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load enrollment audit report.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
