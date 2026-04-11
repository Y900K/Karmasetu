'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/admin/shared/Toast';

export default function DepartmentManager() {
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [editingDept, setEditingDept] = useState<{ old: string; new: string } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.ok) {
        setDepartments(data.departments);
      }
    } catch {
      showToast('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: newDept })
      });
      const data = await res.json();
      if (data.ok) {
        setDepartments(data.departments);
        setNewDept('');
        showToast('Department added', 'success');
      } else {
        showToast(data.message || 'Error adding department', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleEdit = async () => {
    if (!editingDept || !editingDept.new.trim()) return;
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: editingDept.old, newName: editingDept.new })
      });
      const data = await res.json();
      if (data.ok) {
        setDepartments(data.departments);
        setEditingDept(null);
        showToast('Department renamed and cascaded to all users', 'success');
      } else {
        showToast(data.message || 'Error renaming', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (dept: string) => {
    if (!confirm(`Are you sure you want to delete "${dept}"? Affected users will be moved to 'General'.`)) return;
    try {
      const res = await fetch(`/api/admin/departments?department=${encodeURIComponent(dept)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.ok) {
        setDepartments(data.departments);
        showToast('Department deleted and users migrated', 'success');
      } else {
        showToast(data.message || 'Error deleting', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  if (loading) return <div className="text-slate-400 p-4">Loading departments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">🏢 Department Map</h3>
      </div>
      <p className="text-sm text-slate-400">
        Changes to department names will automatically cascade to all Trainees, Courses, and Announcements that use them.
      </p>

      <form onSubmit={handleAdd} className="flex gap-3 mt-4">
        <input 
          type="text"
          required
          placeholder="New Department Name"
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
          className="flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
        />
        <button type="submit" className="bg-cyan-500 text-slate-900 font-bold px-6 rounded-xl hover:bg-cyan-400 transition-colors">Add</button>
      </form>

      <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl overflow-hidden mt-6">
        {departments.length === 0 ? (
           <div className="p-6 text-center text-slate-500 text-sm">No departments configured</div>
        ) : (
           <div className="divide-y divide-slate-700/50">
             {departments.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-4 group hover:bg-slate-800/30 transition-colors">
                  {editingDept?.old === dept ? (
                     <div className="flex-1 flex gap-3 mr-4">
                        <input
                           autoFocus
                           className="flex-1 bg-[#1e293b] border border-cyan-500/50 rounded px-3 py-1.5 text-sm text-white outline-none"
                           value={editingDept.new}
                           title="Edit department name"
                           aria-label="Edit department name"
                           onChange={(e) => setEditingDept({ ...editingDept, new: e.target.value })}
                        />
                        <button onClick={handleEdit} className="text-cyan-400 text-sm font-bold hovering:text-cyan-300">Save</button>
                        <button onClick={() => setEditingDept(null)} className="text-slate-400 text-sm font-medium hover:text-white">Cancel</button>
                     </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                         <span className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 shrink-0">🏢</span>
                         <span className="text-sm font-medium text-slate-200">{dept}</span>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setEditingDept({ old: dept, new: dept })} className="text-xs font-semibold text-cyan-500 hover:text-cyan-400">Edit</button>
                         <button onClick={() => handleDelete(dept)} className="text-xs font-semibold text-red-500 hover:text-red-400">Delete</button>
                      </div>
                    </>
                  )}
                </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}