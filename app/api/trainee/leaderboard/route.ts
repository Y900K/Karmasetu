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
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function badgeForRank(rank: number): { badge: string | null; badgeColor: string | null } {
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

    const [users, enrollmentStats, certificates] = await Promise.all([
      db.collection(COLLECTIONS.users).find({ isActive: true, role: { $ne: 'admin' } }).toArray(),
      db
        .collection(COLLECTIONS.enrollments)
        .aggregate<{
          _id: string;
          avgProgress: number;
          completedCount: number;
          totalCount: number;
        }>([
          {
            $group: {
              _id: '$userId',
              avgProgress: { $avg: '$progressPct' },
              // ONLY count completed entries if they are truly marked "completed"
              completedCount: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
                },
              },
              totalCount: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      db
        .collection(COLLECTIONS.certificates)
        .aggregate<{ _id: string; certCount: number }>([
          { $match: { status: { $ne: 'revoked' } } },
          { $group: { _id: '$userId', certCount: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const enrollmentMap = new Map(enrollmentStats.map((entry) => [entry._id, entry]));
    const certMap = new Map(certificates.map((entry) => [entry._id, entry.certCount]));

    const scoredUsers = users.map((user) => {
      const id = user._id.toString();
      const enrollment = enrollmentMap.get(id);
      const avgProgress = Math.round(enrollment?.avgProgress || 0);
      const completedCount = enrollment?.completedCount || 0;
      const totalCount = enrollment?.totalCount || 0;
      const certCount = certMap.get(id) || 0;

      const points = Math.round(avgProgress * 0.7 + completedCount * 8 + certCount * 12);

      return {
        id,
        name: typeof user.fullName === 'string' ? user.fullName : 'Trainee User',
        dept: typeof user.department === 'string' ? user.department : 'General',
        pts: points,
        completedCount,
        totalCount,
        certCount,
        lastActivityAt:
          user.updatedAt instanceof Date
            ? user.updatedAt.toISOString()
            : user.createdAt instanceof Date
            ? user.createdAt.toISOString()
            : undefined,
      };
    });

    scoredUsers.sort((a, b) => b.pts - a.pts);

    const leaderboard: LeaderboardRow[] = scoredUsers.map((user, index) => {
      const rank = index + 1;
      const badge = badgeForRank(rank);

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
        isCurrentUser: user.id === session.user._id.toString(),
      };
    });

    return NextResponse.json({ ok: true, leaderboard });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
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
