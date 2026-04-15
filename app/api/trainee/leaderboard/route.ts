import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';

type LeaderboardRow = {
  rank: number;
  name: string;
  avatar: string;
  dept: string;
  pts: number;
  courses: string;
  certs: number;
  badge: string | null;
  badgeColor: string | null;
  lastActivityAt?: string;
  isCurrentUser?: boolean;
};

function initials(name: string): string {
  if (!name || typeof name !== 'string') return '??';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function badgeForRank(rank: number, pts: number): { badge: string | null; badgeColor: string | null } {
  if (pts <= 0) return { badge: null, badgeColor: null };
  if (rank === 1) return { badge: 'Gold', badgeColor: '#f59e0b' };
  if (rank === 2) return { badge: 'Silver', badgeColor: '#94a3b8' };
  if (rank === 3) return { badge: 'Bronze', badgeColor: '#f97316' };
  if (rank <= 5) return { badge: 'Rising Star', badgeColor: '#8b5cf6' };
  return { badge: null, badgeColor: null };
}

export async function GET(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;
    const url = new URL(request.url);
    const requestedDepartment = url.searchParams.get('department')?.trim() || 'All Departments';
    const requestedTimeframe = url.searchParams.get('timeframe')?.trim() || 'all';
    const since =
      requestedTimeframe === 'week'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : requestedTimeframe === 'month'
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : null;

    const userFilter: Record<string, unknown> = {
      isActive: true,
      role: { $ne: 'admin' },
    };

    if (requestedDepartment !== 'All Departments') {
      userFilter.department = requestedDepartment;
    }

    const users = await db
      .collection(COLLECTIONS.users)
      .find(userFilter)
      .project({ _id: 1, fullName: 1, department: 1, createdAt: 1, updatedAt: 1 })
      .toArray();

    if (users.length === 0) {
      return NextResponse.json({ ok: true, leaderboard: [] });
    }

    const userIds = users.map((user) => user._id.toString());
    const enrollmentMatch: Record<string, unknown> = {
      userId: { $in: userIds },
    };
    const certificateMatch: Record<string, unknown> = {
      userId: { $in: userIds },
      status: { $ne: 'revoked' },
    };

    if (since) {
      enrollmentMatch.updatedAt = { $gte: since };
      certificateMatch.issuedAt = { $gte: since };
    }

    const [enrollmentStats, certificates] = await Promise.all([
      db
        .collection(COLLECTIONS.enrollments)
        .aggregate<{
          _id: string;
          avgProgress: number;
          completedCount: number;
          totalCount: number;
          lastActivityAt?: Date;
        }>([
          { $match: enrollmentMatch },
          {
            $addFields: {
              progressSafe: {
                $cond: [{ $isNumber: '$progressPct' }, '$progressPct', 0],
              },
              completedModuleCount: {
                $size: { $ifNull: ['$completedModuleIds', []] },
              },
              statusPriority: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$status', 'completed'] }, then: 3 },
                    { case: { $eq: ['$status', 'in_progress'] }, then: 2 },
                    { case: { $eq: ['$status', 'assigned'] }, then: 1 },
                  ],
                  default: 0,
                },
              },
              updatedAtSafe: { $ifNull: ['$updatedAt', '$assignedAt'] },
            },
          },
          {
            $sort: {
              userId: 1,
              courseId: 1,
              progressSafe: -1,
              statusPriority: -1,
              completedModuleCount: -1,
              updatedAtSafe: -1,
            },
          },
          {
            $group: {
              _id: { userId: '$userId', courseId: '$courseId' },
              progressPct: { $first: '$progressSafe' },
              status: { $first: '$status' },
              lastActivityAt: { $max: '$updatedAtSafe' },
            },
          },
          {
            $group: {
              _id: '$_id.userId',
              avgProgress: { $avg: '$progressPct' },
              completedCount: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
                },
              },
              totalCount: { $sum: 1 },
              lastActivityAt: { $max: '$lastActivityAt' },
            },
          },
        ])
        .toArray(),
      db
        .collection(COLLECTIONS.certificates)
        .aggregate<{ _id: string; certCount: number; latestIssuedAt?: Date }>([
          { $match: certificateMatch },
          {
            $group: {
              _id: '$userId',
              certCount: { $sum: 1 },
              latestIssuedAt: { $max: '$issuedAt' },
            },
          },
        ])
        .toArray(),
    ]);

    const enrollmentMap = new Map<
      string,
      { avgProgress: number; completedCount: number; totalCount: number; lastActivityAt?: Date }
    >();
    enrollmentStats.forEach((entry) => {
      if (entry._id) {
        enrollmentMap.set(entry._id.toString(), entry);
      }
    });

    const certMap = new Map<string, { certCount: number; latestIssuedAt?: Date }>();
    certificates.forEach((entry) => {
      if (entry._id) {
        certMap.set(entry._id.toString(), {
          certCount: entry.certCount,
          latestIssuedAt: entry.latestIssuedAt,
        });
      }
    });

    const scoredUsers = users
      .map((user) => {
        const id = user._id.toString();
        const enrollment = enrollmentMap.get(id);
        const avgProgress = Math.round(enrollment?.avgProgress || 0);
        const completedCount = enrollment?.completedCount || 0;
        const totalCount = enrollment?.totalCount || 0;
        const certStats = certMap.get(id);
        const certCount = certStats?.certCount || 0;
        const points = Math.round(avgProgress * 0.7 + completedCount * 8 + certCount * 12);
        const lastActivityCandidates = [
          enrollment?.lastActivityAt instanceof Date ? enrollment.lastActivityAt.getTime() : 0,
          certStats?.latestIssuedAt instanceof Date ? certStats.latestIssuedAt.getTime() : 0,
          !since && user.updatedAt instanceof Date ? user.updatedAt.getTime() : 0,
          !since && user.createdAt instanceof Date ? user.createdAt.getTime() : 0,
        ].filter((value) => value > 0);
        const lastActivityAt =
          lastActivityCandidates.length > 0
            ? new Date(Math.max(...lastActivityCandidates)).toISOString()
            : undefined;

        return {
          id,
          name: typeof user.fullName === 'string' ? user.fullName : 'Trainee User',
          dept: typeof user.department === 'string' ? user.department : 'General',
          pts: points,
          completedCount,
          totalCount,
          certCount,
          lastActivityAt,
        };
      })
      .filter((user) => (since ? user.pts > 0 || Boolean(user.lastActivityAt) : true));

    scoredUsers.sort((a, b) => b.pts - a.pts);

    const selfId = session.user?._id?.toString();

    const leaderboard: LeaderboardRow[] = scoredUsers.map((user, index) => {
      const rank = index + 1;
      const badge = badgeForRank(rank, user.pts);

      return {
        rank,
        name: user.name,
        avatar: initials(user.name),
        dept: user.dept,
        pts: user.pts,
        courses: `${user.completedCount}/${Math.max(user.totalCount, 1)}`,
        certs: user.certCount,
        badge: badge.badge,
        badgeColor: badge.badgeColor,
        lastActivityAt: user.lastActivityAt,
        isCurrentUser: selfId ? user.id === selfId : false,
      };
    });

    return NextResponse.json({ ok: true, leaderboard });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Leaderboard API] Fatal Error:', details);
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load leaderboard.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
