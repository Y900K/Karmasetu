
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import { useToast } from '@/components/admin/shared/Toast';
import { useTraineeIdentity } from '@/context/TraineeIdentityContext';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { formatStudyHours } from '@/lib/enrollmentMetrics';

type ProfileState = {
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  phone: string;
  completedCount: number;
  totalEnrollments: number;
  averageProgress: number;
  certCount: number;
  recentActivity: Array<{ text: string; time: string; color: string }>;
};

const defaultProfile: ProfileState = {
  name: 'Trainee User',
  email: '',
  role: 'Trainee',
  department: 'General',
  avatar: 'TU',
  phone: '',
  completedCount: 0,
  totalEnrollments: 0,
  averageProgress: 0,
  certCount: 0,
  recentActivity: [],
};

function ProfileContent() {
  const { showToast } = useToast();
  const { refreshIdentity } = useTraineeIdentity();
  const {
    courses,
    completedCoursesCount,
    certificateCount,
    averageProgress,
    totalAssignedCourses,
    totalStudyTimeMs,
    isLoading,
  } = useGlobalStats();
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [editName, setEditName] = useState(defaultProfile.name);
  const [editPhone, setEditPhone] = useState(defaultProfile.phone);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await fetch('/api/trainee/profile', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (response.ok && data.ok && data.profile) {
          const nextProfile: ProfileState = {
            name: data.profile.name || defaultProfile.name,
            email: data.profile.email || defaultProfile.email,
            role: data.profile.role || defaultProfile.role,
            department: data.profile.department || defaultProfile.department,
            avatar: data.profile.avatar || defaultProfile.avatar,
            phone: data.profile.phone || defaultProfile.phone,
            completedCount:
              typeof data.profile.completedCount === 'number'
                ? data.profile.completedCount
                : defaultProfile.completedCount,
            totalEnrollments:
              typeof data.profile.totalEnrollments === 'number'
                ? data.profile.totalEnrollments
                : defaultProfile.totalEnrollments,
            averageProgress:
              typeof data.profile.averageProgress === 'number'
                ? data.profile.averageProgress
                : defaultProfile.averageProgress,
            certCount:
              typeof data.profile.certCount === 'number'
                ? data.profile.certCount
                : defaultProfile.certCount,
            recentActivity: data.profile.recentActivity || [],
          };
          setProfile(nextProfile);
          setEditName(nextProfile.name);
          setEditPhone(nextProfile.phone);
        }
      } catch {
        if (isMounted) {
          setProfile(defaultProfile);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('traineeName');
      window.location.href = '/';
    }
  };

  // Shared overview stats are now the source of truth for KPI counts and study time.
  const completedCount = completedCoursesCount;
  const totalEnrolled = totalAssignedCourses;
  const avgProgress = averageProgress;
  const profileCertCount = certificateCount;
  const studyHours = `${formatStudyHours(totalStudyTimeMs)}h`;

  const saveProfile = async () => {
    try {
      const response = await fetch('/api/trainee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfile((prev) => ({ ...prev, name: editName, phone: editPhone }));
      await refreshIdentity();
      showToast('Profile updated!');
      setEditing(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update profile.', 'error');
    }
  };

  const updatePassword = async () => {
    try {
      const passwordError = getPasswordPolicyError(newPw);
      if (passwordError) {
        throw new Error(passwordError);
      }

      const response = await fetch('/api/trainee/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      showToast('Password updated!');
      setShowPw(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update password.', 'error');
    }
  };

  const getStrength = (pw: string) => {
    if (pw.length >= 10 && /\d/.test(pw) && /[!@#$%^&*]/.test(pw)) return { level: 4, label: 'Very Strong', color: '#10b981' };
    if (pw.length >= 8 && /\d/.test(pw)) return { level: 3, label: 'Strong', color: '#f59e0b' };
    if (pw.length >= 6) return { level: 2, label: 'Fair', color: '#f97316' };
    if (pw.length > 0) return { level: 1, label: 'Weak', color: '#ef4444' };
    return { level: 0, label: '', color: '#334155' };
  };

  const strength = useMemo(() => getStrength(newPw), [newPw]);
  const inputCls = 'w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors';

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-slate-400 mt-1">{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} · {profile.department}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
            {editing ? (
              <div className="space-y-4">
                <div className="text-sm font-semibold text-white mb-2">Edit Profile</div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Full Name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="Phone" type="tel" className={inputCls} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={saveProfile} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer">💾 Save</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2.5 border border-[#334155] text-slate-400 rounded-xl text-sm cursor-pointer hover:text-white">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-cyan-500 flex items-center justify-center text-2xl font-black text-slate-900 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#1e293b]">{profile.avatar}</div>
                  <div className="text-xl font-bold text-white mt-3">{profile.name}</div>
                  <div className="text-sm text-slate-400">{profile.email}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">TRAINEE</span>
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-600/30 text-slate-400 border border-slate-600/50">{profile.department}</span>
                  </div>
                </div>
                <button onClick={() => setEditing(true)} className="w-full mt-4 py-2.5 border border-[#334155] rounded-xl text-sm text-slate-400 hover:border-cyan-500 hover:text-cyan-400 cursor-pointer transition-colors">✏️ Edit Profile</button>
              </>
            )}

            <div className="border-t border-[#334155] mt-4 pt-4">
              <button onClick={() => setShowPw(!showPw)} className="w-full py-2.5 bg-[#020817] border border-[#334155] rounded-xl text-sm text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer transition-colors">🔒 Change Password</button>
              {showPw && (
                <div className="mt-3 space-y-3">
                  <input value={currentPw} onChange={(event) => setCurrentPw(event.target.value)} placeholder="Current Password" type="password" className={inputCls} />
                  <div>
                    <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New Password" type="password" className={inputCls} />
                    {newPw && (
                      <div className="mt-2">
                        <div className="flex gap-1 h-1.5">
                          {[1, 2, 3, 4].map((s) => {
                            const isActive = s <= strength.level;
                            return (
                              <div
                                key={s}
                                className={`flex-1 rounded-full transition-colors ${
                                  isActive
                                    ? strength.level === 4
                                      ? 'bg-emerald-500'
                                      : strength.level === 3
                                      ? 'bg-amber-500'
                                      : strength.level === 2
                                      ? 'bg-orange-500'
                                      : 'bg-red-500'
                                    : 'bg-slate-700'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div
                          className={`text-[10px] mt-1 ${
                            strength.level === 4
                              ? 'text-emerald-400'
                              : strength.level === 3
                              ? 'text-amber-400'
                              : strength.level === 2
                              ? 'text-orange-400'
                              : 'text-red-400'
                          }`}
                        >
                          {strength.label}
                        </div>
                      </div>
                    )}
                  </div>
                  <input value={confirmPw} onChange={(event) => setConfirmPw(event.target.value)} placeholder="Confirm New Password" type="password" className={inputCls} />
                  <button onClick={updatePassword} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer">Update Password</button>
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="w-full mt-2 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors">🚪 Logout</button>
          </div>
        </div>

        {/* Right: Stats + Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { 
                value: (isLoading || isLoadingProfile) ? '...' : `${completedCount}/${Math.max(totalEnrolled, completedCount)}`, 
                label: 'Courses Completed', 
                icon: '✅', 
                colorClass: 'text-emerald-400' 
              },
              { 
                value: (isLoading || isLoadingProfile) ? '...' : `${avgProgress}%`, 
                label: 'Avg Progress', 
                icon: '📊', 
                colorClass: 'text-cyan-400' 
              },
              { 
                value: (isLoading || isLoadingProfile) ? '...' : `${profileCertCount}`, 
                label: 'Certificates', 
                icon: '🏅', 
                colorClass: 'text-amber-400' 
              },
              { 
                value: (isLoading || isLoadingProfile) ? '...' : studyHours, 
                label: 'Study Hours', 
                icon: '⏱', 
                colorClass: 'text-violet-400' 
              },
            ].map((s) => (
              <div key={s.label} className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
                <div className="text-lg mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</div>
                <div className="text-[10px] text-slate-400 uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Course Progress */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Course Progress</h3>
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${course.theme} flex items-center justify-center text-xs flex-shrink-0`}>{course.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{course.title}</div>
                    <ProgressBar value={course.progress} height="h-1" className="mt-1" />
                  </div>
                  <span className={`text-xs font-semibold w-10 text-right ${course.progress >= 80 ? 'text-emerald-400' : course.progress >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{course.progress}%</span>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="text-xs text-slate-500">No assigned courses yet.</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Recent Activity (Last 48h)</h3>
            <div className="space-y-0">
              {profile.recentActivity.length > 0 ? profile.recentActivity.map((a, i) => {
                const borderColorMap: Record<string, string> = {
                  cyan: 'border-l-cyan-500',
                  green: 'border-l-emerald-500',
                  blue: 'border-l-blue-500',
                  gold: 'border-l-amber-500',
                  red: 'border-l-red-500'
                };
                const borderClass = borderColorMap[a.color] || 'border-l-slate-600';
                return (
                  <div key={i} className={`flex gap-3 py-2.5 border-l-4 pl-3 ${borderClass}`}>
                    <div className="flex-1">
                      <p className="text-sm text-white">{a.text}</p>
                      <span className="text-xs text-slate-500">{a.time}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-xs text-slate-500 py-2">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

export default function TraineeProfilePage() {
  return <TraineeLayout><ProfileContent /></TraineeLayout>;
}
