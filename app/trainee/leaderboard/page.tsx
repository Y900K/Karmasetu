'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';

type LeaderboardUser = {
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

const podiumLabels = ['🥇', '🥈', '🥉'];
const podiumAvatarClasses = ['bg-amber-500', 'bg-slate-400', 'bg-orange-500'];
const podiumTextClasses = ['text-amber-400', 'text-slate-300', 'text-orange-400'];
const podiumBlockClasses = [
  'bg-gradient-to-t from-amber-500/10 to-amber-500/30 border border-amber-500/40',
  'bg-gradient-to-t from-slate-400/10 to-slate-400/30 border border-slate-400/40',
  'bg-gradient-to-t from-orange-500/10 to-orange-500/30 border border-orange-500/40',
];

const badgeClassMap: Record<string, string> = {
  Gold: 'border-amber-500/50 text-amber-400 bg-amber-500/15',
  Silver: 'border-slate-400/50 text-slate-300 bg-slate-400/15',
  Bronze: 'border-orange-500/50 text-orange-400 bg-orange-500/15',
  'Rising Star': 'border-violet-500/50 text-violet-400 bg-violet-500/15',
};

function LeaderboardContent() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [timeFilter, setTimeFilter] = useState<'All Time' | 'This Month' | 'This Week'>('All Time');
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUserRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError('');

        const response = await fetch('/api/trainee/leaderboard');
        const data = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (!response.ok || !data.ok || !Array.isArray(data.leaderboard)) {
          throw new Error(data.message || 'Failed to load leaderboard.');
        }

        setLeaderboard(data.leaderboard as LeaderboardUser[]);
      } catch (loadError) {
        if (isMounted) {
          setLeaderboard([]);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load leaderboard.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const departments = useMemo(() => {
    const values = Array.from(new Set(leaderboard.map((entry) => entry.dept)));
    return ['All Departments', ...values];
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const now = currentTimestamp;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    return leaderboard.filter((entry) => {
      const matchesDepartment =
        departmentFilter === 'All Departments' || entry.dept === departmentFilter;

      if (!matchesDepartment) {
        return false;
      }

      if (timeFilter === 'All Time') {
        return true;
      }

      const activityTs = entry.lastActivityAt ? new Date(entry.lastActivityAt).getTime() : 0;
      if (!activityTs) {
        return false;
      }

      if (timeFilter === 'This Week') {
        return activityTs >= weekAgo;
      }

      return activityTs >= monthAgo;
    });
  }, [leaderboard, departmentFilter, timeFilter, currentTimestamp]);

  const rankedLeaderboard = useMemo(
    () =>
      [...filteredLeaderboard]
        .sort((a, b) => b.pts - a.pts)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
    [filteredLeaderboard]
  );

  const top10AndMe = useMemo(() => {
    const top10 = rankedLeaderboard.slice(0, 10);
    const me = rankedLeaderboard.find(u => u.isCurrentUser);
    
    if (me && me.rank > 10) {
      return [...top10, me];
    }
    return top10;
  }, [rankedLeaderboard]);

  const top3 = useMemo(() => rankedLeaderboard.slice(0, 3), [rankedLeaderboard]);

  useEffect(() => {
    if (currentUserRowRef.current) {
      currentUserRowRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [top10AndMe]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-1">Top performers in department training programs</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Department</label>
          <select
            title="Department filter"
            aria-label="Department filter"
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
            }}
            className="w-full bg-[#1e293b] border border-[#334155] text-white rounded-xl px-3 py-2 text-sm"
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Time Period</label>
          <select
            title="Time period filter"
            aria-label="Time period filter"
            value={timeFilter}
            onChange={(event) => {
              setTimeFilter(event.target.value as 'All Time' | 'This Month' | 'This Week');
              setCurrentTimestamp(Date.now());
            }}
            className="w-full bg-[#1e293b] border border-[#334155] text-white rounded-xl px-3 py-2 text-sm"
          >
            <option>All Time</option>
            <option>This Month</option>
            <option>This Week</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-10 text-center text-slate-400">
          Loading leaderboard...
        </div>
      ) : error ? (
        <div className="bg-[#1e293b] border border-red-500/20 rounded-2xl p-10 text-center text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="flex items-end justify-center gap-4 mb-8">
            {[top3[1], top3[0], top3[2]].map((user) => {
              if (!user) {
                return null;
              }

              const rankIndex = Math.max(0, Math.min(2, user.rank - 1));
              const height = rankIndex === 0 ? 'h-36' : rankIndex === 1 ? 'h-28' : 'h-24';

              return (
                <div key={`${user.name}-${user.rank}`} className="flex flex-col items-center">
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-slate-900 mb-2 ring-2 ring-offset-2 ring-offset-[#020817] ${podiumAvatarClasses[rankIndex]}`}
                  >
                    {user.avatar}
                  </div>
                  <div className="text-sm font-semibold text-white text-center">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.dept}</div>
                  <div className={`text-lg font-bold mt-1 ${podiumTextClasses[rankIndex]}`}>
                    {user.pts} pts
                  </div>
                  <div
                    className={`${height} w-24 rounded-t-xl flex items-start justify-center pt-3 mt-2 ${podiumBlockClasses[rankIndex]}`}
                  >
                    <span className="text-2xl">{podiumLabels[rankIndex]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
            <div className="px-6 py-3 text-[10px] text-slate-500 uppercase tracking-wider font-medium border-b border-[#334155]">
              Full Rankings
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Rank', 'Trainee', 'Dept', 'Points', 'Courses', 'Certs', 'Badge'].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2 text-left text-[10px] text-slate-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10AndMe.map((user, index) => {
                    const isMe = Boolean(user.isCurrentUser);
                    // Add a separator visual if there's a big jump in ranks to the current user
                    const prevRow = index > 0 ? top10AndMe[index - 1] : null;
                    const showJump = prevRow && (user.rank - prevRow.rank > 1);

                    return (
                      <React.Fragment key={`${user.name}-${user.rank}`}>
                        {showJump && (
                          <tr className="border-b border-white/5 bg-[#0f172a]/50">
                            <td colSpan={7} className="px-4 py-2 text-center text-slate-600 text-lg tracking-widest leading-none">
                              &bull; &bull; &bull;
                            </td>
                          </tr>
                        )}
                        <tr
                          ref={isMe ? currentUserRowRef : null}
                          className={`border-b border-white/5 ${isMe ? 'bg-cyan-500/[0.05] border-l-[3px] border-l-cyan-500' : ''}`}
                        >
                        <td className="px-4 py-3">
                          {user.rank <= 3 ? (
                            <span className="text-lg">{podiumLabels[user.rank - 1]}</span>
                          ) : (
                            <span className="text-sm text-slate-500">{user.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 ${isMe ? 'bg-cyan-500' : 'bg-slate-600 text-white'}`}
                            >
                              {user.avatar}
                            </div>
                            <div>
                              <span className="text-sm text-white font-medium">{user.name}</span>
                              {isMe && (
                                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{user.dept}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{user.pts} pts</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{user.courses}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{user.certs}</td>
                        <td className="px-4 py-3">
                          {user.badge ? (
                            <span
                              className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${badgeClassMap[user.badge] || 'border-slate-500/50 text-slate-300 bg-slate-500/15'}`}
                            >
                              {user.badge}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {top10AndMe.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
                        No leaderboard data for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}
    </>
  );
}

export default function TraineeLeaderboardPage() {
  return (
    <TraineeLayout>
      <LeaderboardContent />
    </TraineeLayout>
  );
}
