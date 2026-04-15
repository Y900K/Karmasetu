'use client';

import React, { useMemo, useState, useEffect } from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import StatusBadge from '@/components/admin/shared/StatusBadge';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import Modal from '@/components/admin/shared/Modal';
import { useToast } from '@/components/admin/shared/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_OPTIONS, DEPT_OPTIONS } from '@/data/mockAdminData';
import { getPasswordPolicyError, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy';
import { useAPI } from '@/lib/hooks/useAPI';
import TableSkeleton from '@/components/admin/shared/TableSkeleton';
import { Search, Eye, EyeOff, Trash, BookPlus, X, Send, Download, Plus, SearchX, SlidersHorizontal, ArrowUpDown, Key, CheckCircle2, Ban } from 'lucide-react';

type UserRow = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  progress: number;
  status: 'Active' | 'Overdue' | 'Inactive';
  approvalStatus?: 'approved' | 'restricted' | 'pending';
  lastLogin: string;
  phone: string;
};

type CourseOption = {
  id: string;
  title: string;
};

type SortKey = 'name' | 'role' | 'department' | 'progress' | 'status' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

type AssignmentHistoryPayload = {
  user: { id: string; name: string; email: string };
  assignments: Array<{
    courseId: string;
    courseTitle: string;
    status: string;
    progressPct: number;
    score?: number;
    assignedAt?: string;
    updatedAt?: string;
  }>;
  timeline: Array<{
    id: string;
    action: string;
    source: string;
    courseTitle: string;
    progressPct?: number;
    score?: number;
    createdAt: string;
  }>;
};

const avatarColors = ['bg-cyan-600','bg-purple-600','bg-red-600','bg-green-600','bg-blue-600','bg-amber-600','bg-pink-600','bg-indigo-600'];

export default function UsersPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [assignUser, setAssignUser] = useState<UserRow | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null);
  const [historyData, setHistoryData] = useState<AssignmentHistoryPayload | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isResettingPw, setIsResettingPw] = useState(false);

  // SWR-based Data Fetching
  const { data: userData, isLoading: isUsersLoading, mutate: mutateUsers } = useAPI<{ ok: boolean; users: UserRow[] }>('/api/admin/users');
  const { data: courseData } = useAPI<{ ok: boolean; courses: { id: string; title: string }[] }>('/api/admin/courses');

  const users = useMemo(() => userData?.ok ? userData.users : [], [userData]);
  const courseOptions = useMemo(() => courseData?.ok ? courseData.courses.map((c) => ({ id: c.id, title: c.title })) : [], [courseData]);

  const tabs = useMemo(
    () => [
      { label: 'All', count: users.length, filter: '' },
      { label: 'Pending Review', count: users.filter((t) => t.approvalStatus === 'pending').length, filter: 'Pending' },
      { label: 'Active', count: users.filter((t) => t.status === 'Active' && t.approvalStatus !== 'pending').length, filter: 'Active' },
      { label: 'Overdue', count: users.filter((t) => t.status === 'Overdue' && t.approvalStatus !== 'pending').length, filter: 'Overdue' },
      { label: 'Inactive', count: users.filter((t) => t.status === 'Inactive' && t.approvalStatus !== 'pending').length, filter: 'Inactive' },
    ],
    [users]
  );

  const filtered = useMemo(() => {
    let list = users;
    if (activeTab === 'Pending') {
      list = list.filter((t) => t.approvalStatus === 'pending');
    } else if (activeTab) {
      list = list.filter((t) => t.status === activeTab && t.approvalStatus !== 'pending');
    }
    if (search) list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter) list = list.filter((t) => t.role === roleFilter);
    if (deptFilter) list = list.filter((t) => t.department === deptFilter);

    const sorted = [...list].sort((a, b) => {
      const order = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'progress') {
        return (a.progress - b.progress) * order;
      }

      const getSortableValue = (row: UserRow): string => {
        switch (sortKey) {
          case 'name':
            return row.name;
          case 'role':
            return row.role;
          case 'department':
            return row.department;
          case 'status':
            return row.status;
          case 'lastLogin':
            return row.lastLogin;
          default:
            return row.name;
        }
      };

      return getSortableValue(a).localeCompare(getSortableValue(b)) * order;
    });

    return sorted;
  }, [activeTab, search, roleFilter, deptFilter, sortKey, sortDirection, users]);

  const hasAdvancedFilters = roleFilter || deptFilter || sortKey !== 'name' || sortDirection !== 'asc';

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.includes(t.id));

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(filtered.map((t) => t.id));
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to deactivate user');
      }

      mutateUsers();
      setSelected((prev) => prev.filter((id) => id !== userId));
      showToast('Trainee deactivated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to deactivate trainee', 'error');
    }
  };

  const updateApprovalStatus = async (userId: string, newStatus: 'approved' | 'restricted') => {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: newStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to update approval status');
      }
      mutateUsers();
      showToast(`User status updated to ${newStatus}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update approval status', 'error');
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      setIsResettingPw(true);
      showToast('Generating secure temporary password...', 'success');
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to generate password');
      }

      setGeneratedPassword(data.temporaryPassword);
      setResetPwUser(users.find(u => u.id === userId) || null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to reset password', 'error');
    } finally {
      setIsResettingPw(false);
    }
  };

  const deleteSelectedUsers = async () => {
    try {
      await Promise.all(
        selected.map(async (userId) => {
          await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
        })
      );
      mutateUsers();
      showToast(`Trainees deactivated (${selected.length})`, 'success');
      setSelected([]);
    } catch {
      showToast('Failed to deactivate some trainees.', 'error');
      mutateUsers();
    }
  };

  const assignCourseBulk = async (courseId: string) => {
    try {
      const response = await fetch('/api/admin/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selected, courseId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed bulk assignment');
      }

      showToast(`Assigned course to ${data.assignedCount || selected.length} trainees`, 'success');
      setShowBulkAssignModal(false);
      mutateUsers();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed bulk assignment', 'error');
    }
  };

  const assignCourse = async (userId: string, courseId: string) => {
    try {
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to assign course');
      }

      showToast('Course assigned successfully!', 'success');
      setAssignUser(null);
      mutateUsers();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to assign course', 'error');
    }
  };

  const openHistory = async (user: UserRow) => {
    setHistoryUser(user);
    setHistoryData(null);

    try {
      setIsHistoryLoading(true);
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/assignments`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to load assignment history');
      }

      setHistoryData(data as AssignmentHistoryPayload);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load assignment history', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <>
      <PageHeader
          title={t('admin.users.title')}
          sub={`${users.length} registered users`}
          action={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors"><Plus className="h-4 w-4" /> {t('admin.users.btn_add')}</button>}
        />

      {/* Unified controls panel */}
      <div className="mb-5 rounded-2xl border border-[#334155] bg-[#0f172a]/60 p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.label} onClick={() => setActiveTab(tab.filter)}
              className={`px-4 py-2 text-sm rounded-full border cursor-pointer transition-colors ${activeTab === tab.filter ? 'bg-cyan-500 text-slate-900 border-cyan-500 font-semibold' : 'border-[#334155] text-slate-400 hover:text-white'}`}>
              {tab.label} ({tab.count})
              {tab.label === 'Overdue' && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full bg-[#020817] border border-[#1e293b] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors" />
          {search && <button onClick={() => setSearch('')} title="Clear search" aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>}
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#020817]/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              Users Filters & Sorting
            </div>
            {hasAdvancedFilters && (
              <button
                onClick={() => {
                  setRoleFilter('');
                  setDeptFilter('');
                  setSortKey('name');
                  setSortDirection('asc');
                }}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <select
              title="Filter by role"
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              title="Filter by department"
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="">All Departments</option>
              {DEPT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              title="Sort users by"
              aria-label="Sort users by"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="name">Sort: Name</option>
              <option value="progress">Sort: Progress</option>
              <option value="status">Sort: Status</option>
              <option value="role">Sort: Role</option>
              <option value="department">Sort: Department</option>
              <option value="lastLogin">Sort: Last Login</option>
            </select>

            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              title="Toggle sort direction"
              aria-label="Toggle sort direction"
            >
              <ArrowUpDown className="h-4 w-4 text-cyan-400" />
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="bg-[#1e293b] border-b border-[#334155] px-6 py-3 flex items-center gap-3 rounded-t-2xl animate-[slideIn_0.2s_ease]">
          <span className="text-sm text-white font-medium">{selected.length} trainees selected</span>
          <button onClick={() => setShowBulkAssignModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"><BookPlus className="h-3.5 w-3.5" /> Assign Course</button>
          <button onClick={() => showToast(`Reminders sent to ${selected.length} trainees`)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#334155] text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"><Send className="h-3.5 w-3.5" /> Send Reminder</button>
          <button onClick={() => showToast(`Exporting ${selected.length} trainee records...`)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#334155] text-slate-400 hover:bg-white/5 cursor-pointer"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={deleteSelectedUsers} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash className="h-3.5 w-3.5" /> Deactivate</button>
        </div>
      )}

      {/* Table Section */}
      {isUsersLoading || !userData ? (
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
          <table className="w-full min-w-[900px]">
             <thead>
                <tr className="border-b border-white/5 bg-slate-900/50 animate-pulse">
                  <th className="px-6 py-4 text-left w-12"><div className="h-4 w-4 bg-slate-700 rounded mx-auto" /></th>
                  {['Trainee','Role','Department','Progress','Status','Last Login','Actions'].map(h => (
                    <th key={h} className="px-3 py-4 text-left"><div className="h-2 w-16 bg-slate-700 rounded" /></th>
                  ))}
                </tr>
              </thead>
            <tbody>
              <TableSkeleton rows={8} cols={8} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/50">
                  <th className="px-6 py-4 text-left w-12">
                    <input 
                      type="checkbox" 
                      title="Select all trainees" 
                      aria-label="Select all trainees" 
                      checked={allSelected} 
                      onChange={toggleAll} 
                      className="accent-cyan-500 cursor-pointer" 
                    />
                  </th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold">{t('admin.users.table_trainee')}</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold">Role</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold">{t('admin.users.table_dept')}</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold">Progress</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold w-24">Status</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold">Last Login</th>
                  <th className="px-3 py-4 text-left text-[11px] text-slate-300 uppercase tracking-widest font-bold w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-all duration-200">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        title={`Select ${t.name}`} 
                        aria-label={`Select ${t.name}`} 
                        checked={selected.includes(t.id)} 
                        onChange={() => setSelected((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])} 
                        className="accent-cyan-500 cursor-pointer" 
                      />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-xs font-black shadow-lg text-white`}>
                          {t.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="max-w-[150px]">
                          <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-300 font-medium">{t.role}</td>
                    <td className="px-3 py-4 text-xs text-slate-400">{t.department}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 w-28">
                        <ProgressBar value={t.progress} height="h-1.5" />
                        <span className="text-[11px] font-mono text-slate-300">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-4"><StatusBadge status={t.approvalStatus === 'pending' ? 'Pending' : t.approvalStatus === 'restricted' ? 'Restricted' : t.status} /></td>
                    <td className="px-3 py-4 text-[10px] text-slate-500 font-mono whitespace-nowrap">{t.lastLogin}</td>
                    <td className="px-3 py-4">
                      <div className="flex gap-1.5">
                        {t.approvalStatus === 'pending' ? (
                          <>
                            <button onClick={() => updateApprovalStatus(t.id, 'approved')} className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                            <button onClick={() => updateApprovalStatus(t.id, 'restricted')} className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm" title="Restrict"><Ban className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openHistory(t)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm" title="View History"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => setAssignUser(t)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm" title="Assign Course"><BookPlus className="h-4 w-4" /></button>
                            <button disabled={isResettingPw} onClick={() => resetPassword(t.id)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50" title="Reset Password"><Key className="h-4 w-4" /></button>
                            <button onClick={() => deleteUser(t.id)} className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs cursor-pointer shadow-sm" title="Deactivate"><Trash className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex justify-center mb-3"><SearchX className="h-8 w-8 text-slate-500" /></div>
                      <div className="text-white font-medium">No results found</div>
                      <div className="text-sm text-slate-500 mt-1">Try adjusting your filters or search terms.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Trainee Modal */}
      <AddTraineeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={async () => {
          mutateUsers();
        }}
      />

      {assignUser && (
        <AssignCourseModal
          user={assignUser}
          courses={courseOptions}
          onClose={() => setAssignUser(null)}
          onAssign={assignCourse}
        />
      )}

      {showBulkAssignModal && (
        <BulkAssignCourseModal
          selectedCount={selected.length}
          courses={courseOptions}
          onClose={() => setShowBulkAssignModal(false)}
          onAssign={assignCourseBulk}
        />
      )}

      {historyUser && (
        <AssignmentHistoryModal
          user={historyUser}
          data={historyData}
          isLoading={isHistoryLoading}
          onClose={() => {
            setHistoryUser(null);
            setHistoryData(null);
          }}
        />
      )}

      {resetPwUser && generatedPassword && (
        <Modal isOpen={true} onClose={() => { setResetPwUser(null); setGeneratedPassword(null); }} title="TEMPORARY PASSWORD GENERATED">
          <div className="space-y-4 text-center pb-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Password Reset Successful</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
              Please provide this temporary password to <strong className="text-white">{resetPwUser.name}</strong>. They can use it to log in immediately.
            </p>
            <div className="mt-6 bg-[#020817] p-6 rounded-xl border border-emerald-500/30">
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-2">Temporary Password</div>
              <div className="text-2xl font-mono text-emerald-300 tracking-widest select-all">{generatedPassword}</div>
            </div>
            <button
              onClick={() => { setResetPwUser(null); setGeneratedPassword(null); }}
              className="mt-6 w-full py-3 bg-cyan-500 text-[#0d1b2a] font-bold rounded-xl active:scale-95 transition-transform cursor-pointer hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function formatDate(value?: string): string {
  if (!value) {
    return 'NA';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'NA';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AssignmentHistoryModal({
  user,
  data,
  isLoading,
  onClose,
}: {
  user: UserRow;
  data: AssignmentHistoryPayload | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title="ASSIGNMENT HISTORY" maxWidth="max-w-4xl">
      <div className="space-y-6">
        <div className="text-sm text-slate-300">
          <span className="text-white font-semibold">{user.name}</span> • {user.email}
        </div>

        {isLoading && <div className="text-sm text-slate-400">Loading history...</div>}

        {!isLoading && (
          <>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Assignments</div>
              <div className="border border-[#334155] rounded-xl overflow-hidden">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#020817]">
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Course</th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Progress</th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Score</th>
                      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.assignments || []).map((row) => (
                      <tr key={`${row.courseId}-${row.updatedAt || row.assignedAt}`} className="border-b border-white/5">
                        <td className="px-3 py-2 text-sm text-white">{row.courseTitle}</td>
                        <td className="px-3 py-2 text-xs text-slate-300">{row.status}</td>
                        <td className="px-3 py-2 text-xs text-cyan-400">{row.progressPct}%</td>
                        <td className="px-3 py-2 text-xs text-slate-300">{typeof row.score === 'number' ? `${row.score}%` : '-'}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{formatDate(row.updatedAt || row.assignedAt)}</td>
                      </tr>
                    ))}
                    {(!data || data.assignments.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">No assignments yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Activity Timeline</div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(data?.timeline || []).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[#334155] bg-[#020817] px-3 py-2">
                    <div className="text-sm text-white">{entry.courseTitle}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {entry.action} via {entry.source}
                      {typeof entry.progressPct === 'number' ? ` • ${entry.progressPct}%` : ''}
                      {typeof entry.score === 'number' ? ` • score ${entry.score}%` : ''}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{formatDate(entry.createdAt)}</div>
                  </div>
                ))}
                {(!data || data.timeline.length === 0) && (
                  <div className="text-sm text-slate-500">No recent activity.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function AssignCourseModal({
  user,
  courses,
  onClose,
  onAssign,
}: {
  user: UserRow;
  courses: CourseOption[];
  onClose: () => void;
  onAssign: (userId: string, courseId: string) => Promise<void>;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    setSelectedCourseId(courses[0]?.id || '');
  }, [courses]);

  return (
    <Modal isOpen={true} onClose={onClose} title="ASSIGN COURSE">
      <div className="space-y-4">
        <div className="text-sm text-slate-300">
          Assigning course to <span className="text-white font-semibold">{user.name}</span>
        </div>

        <select
          title="Select course"
          aria-label="Select course"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
          className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
        >
          {courses.length === 0 && <option value="">No courses available</option>}
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#334155] rounded-xl text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!selectedCourseId || isAssigning) {
                return;
              }

              setIsAssigning(true);
              try {
                await onAssign(user.id, selectedCourseId);
              } finally {
                setIsAssigning(false);
              }
            }}
            disabled={!selectedCourseId || isAssigning || courses.length === 0}
            className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BulkAssignCourseModal({
  selectedCount,
  courses,
  onClose,
  onAssign,
}: {
  selectedCount: number;
  courses: CourseOption[];
  onClose: () => void;
  onAssign: (courseId: string) => Promise<void>;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    setSelectedCourseId(courses[0]?.id || '');
  }, [courses]);

  return (
    <Modal isOpen={true} onClose={onClose} title="BULK ASSIGN COURSE">
      <div className="space-y-4">
        <div className="text-sm text-slate-300">
          Assigning one course to <span className="text-white font-semibold">{selectedCount} selected trainees</span>
        </div>

        <select
          title="Select course for bulk assignment"
          aria-label="Select course for bulk assignment"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
          className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
        >
          {courses.length === 0 && <option value="">No courses available</option>}
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#334155] rounded-xl text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!selectedCourseId || isAssigning) {
                return;
              }

              setIsAssigning(true);
              try {
                await onAssign(selectedCourseId);
              } finally {
                setIsAssigning(false);
              }
            }}
            disabled={!selectedCourseId || isAssigning || courses.length === 0 || selectedCount === 0}
            className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Assign to Selected'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddTraineeModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => Promise<void> }) {
  const { showToast } = useToast();
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', dept: '', empId: '', email: '', password: '', confirm: '' });
  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const pwMatch = form.password === form.confirm;
  const passwordError = getPasswordPolicyError(form.password);
  const canSubmit = form.name && form.role && form.dept && form.email && form.password && form.confirm && pwMatch && !passwordError;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to create trainee profile');
      }

      showToast('Trainee profile created successfully!');
      setForm({ name: '', role: '', dept: '', empId: '', email: '', password: '', confirm: '' });
      await onCreated();
      setTimeout(onClose, 500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create trainee profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors';
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CREATE TRAINEE PROFILE">
      <div className="space-y-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Personal Information</div>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Ravi Sharma" className={inputCls} />
        <select title="Trainee role" aria-label="Trainee role" value={form.role} onChange={(e) => update('role', e.target.value)} className={selectCls}>
          <option value="">Select Role</option>
          {ROLE_OPTIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
        </select>
        <select title="Trainee department" aria-label="Trainee department" value={form.dept} onChange={(e) => update('dept', e.target.value)} className={selectCls}>
          <option value="">Select Department</option>
          {DEPT_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
        </select>
        <div>
          <input value={form.empId} onChange={(e) => update('empId', e.target.value)} placeholder="e.g. EMP-2024-001" className={inputCls} />
          <p className="text-[10px] text-slate-500 mt-1">(Optional)</p>
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium pt-2">Login Credentials</div>
        <input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Enter trainee email address" type="email" className={inputCls} />
        <div className="relative">
          <input value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Strong password" type={showPw ? 'text' : 'password'} className={inputCls} />
          <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <p className="text-[10px] text-slate-500 -mt-2">{PASSWORD_POLICY_MESSAGE}</p>
        <div>
          <input value={form.confirm} onChange={(e) => update('confirm', e.target.value)} placeholder="Re-enter password" type="password" className={inputCls} />
          {form.confirm && !pwMatch && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
          {form.password && passwordError && <p className="text-xs text-red-400 mt-1">{passwordError}</p>}
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${canSubmit ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : 'bg-[#334155] text-slate-500 cursor-not-allowed'}`}>
          {isSubmitting ? 'Creating...' : <><Plus className="h-4 w-4" /> Create Trainee Profile</>}
        </button>
      </div>
    </Modal>
  );
}
