'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/admin/shared/Toast';
import { ADMIN_USER, DEPT_OPTIONS } from '@/data/mockAdminData';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { useLanguage } from '@/context/LanguageContext';

type AdminProfileData = {
  name: string;
  role: string;
  department: string;
  email: string;
  avatar: string;
  phone: string;
};

const defaultProfile: AdminProfileData = {
  name: ADMIN_USER.name,
  role: ADMIN_USER.role,
  department: ADMIN_USER.department,
  email: ADMIN_USER.email,
  avatar: ADMIN_USER.avatar,
  phone: '+91 XXXXX XXXXX',
};

export default function AdminProfileContent() {
  const { adminStats } = useGlobalStats();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [showPwPanel, setShowPwPanel] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [profile, setProfile] = useState<AdminProfileData>(defaultProfile);

  const getStrength = (pw: string) => {
    if (pw.length >= 10 && /\d/.test(pw) && /[!@#$%^&*]/.test(pw)) return { level: 4, label: t('admin.profile.password.very_strong'), barClass: 'bg-emerald-500', textClass: 'text-emerald-400' };
    if (pw.length >= 8 && /\d/.test(pw)) return { level: 3, label: t('admin.profile.password.strong'), barClass: 'bg-amber-500', textClass: 'text-amber-400' };
    if (pw.length >= 6) return { level: 2, label: t('admin.profile.password.fair'), barClass: 'bg-orange-500', textClass: 'text-orange-400' };
    if (pw.length > 0) return { level: 1, label: t('admin.profile.password.weak'), barClass: 'bg-red-500', textClass: 'text-red-400' };
    return { level: 0, label: '', barClass: 'bg-slate-700', textClass: 'text-slate-500' };
  };

  const strength = getStrength(newPw);
  const inputCls = 'w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('adminName');
      window.location.href = '/login';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-white mb-4">{t('admin.profile.edit_profile')}</div>
              <input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} placeholder={t('admin.profile.full_name')} className={inputCls} />
              <input value={profile.role} onChange={(e) => setProfile((prev) => ({ ...prev, role: e.target.value }))} placeholder={t('admin.profile.job_title')} className={inputCls} />
              <select value={profile.department} onChange={(e) => setProfile((prev) => ({ ...prev, department: e.target.value }))} className={`${inputCls} cursor-pointer`} aria-label={t('admin.profile.select_department')} title={t('admin.profile.select_department')}>
                {DEPT_OPTIONS.map((d) => (<option key={d}>{d}</option>))}
              </select>
              <input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" type="tel" className={inputCls} />
              <div className="flex gap-2">
                <button onClick={() => { showToast(t('admin.profile.toast_updated')); setEditing(false); }} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer">💾 {t('admin.profile.save_changes')}</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2.5 border border-[#334155] text-slate-400 rounded-xl text-sm cursor-pointer hover:text-white">{t('admin.profile.cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-amber-500 flex items-center justify-center text-2xl font-black text-slate-900 ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#1e293b]">{profile.avatar}</div>
                <div className="text-xl font-bold text-white mt-3">{profile.name}</div>
                <div className="text-sm text-slate-400">{profile.email}</div>
                <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">{t('admin.profile.badge.admin')}</span>
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-600/30 text-slate-400 border border-slate-600/50">{t('admin.profile.badge.management')}</span>
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="w-full mt-4 py-2.5 border border-[#334155] rounded-xl text-sm text-slate-400 hover:border-cyan-500 hover:text-cyan-400 cursor-pointer transition-colors">✏️ {t('admin.profile.edit_profile')}</button>
            </>
          )}

          <div className="border-t border-[#334155] mt-4 pt-4">
            <button onClick={() => setShowPwPanel(!showPwPanel)} className="w-full py-2.5 bg-[#020817] border border-[#334155] rounded-xl text-sm text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer transition-colors">🔒 {t('admin.profile.change_password')}</button>
            {showPwPanel && (
              <div className="mt-3 space-y-3 animate-[slideIn_0.3s_ease]">
                <input placeholder={t('admin.profile.password.current')} type="password" className={inputCls} />
                <div>
                  <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder={t('admin.profile.password.new')} type="password" className={inputCls} />
                  {newPw && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map((s) => (
                          <div key={s} className={`flex-1 rounded-full transition-colors ${s <= strength.level ? strength.barClass : 'bg-slate-700'}`} />
                        ))}
                      </div>
                      <div className={`text-[10px] mt-1 ${strength.textClass}`}>{strength.label}</div>
                    </div>
                  )}
                </div>
                <input placeholder={t('admin.profile.password.confirm')} type="password" className={inputCls} />
                <button onClick={() => { showToast(t('admin.profile.toast_password_updated')); setShowPwPanel(false); setNewPw(''); }} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer">{t('admin.profile.password.update')}</button>
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="w-full mt-2 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/20 cursor-pointer transition-colors">🚪 {t('nav.logout')}</button>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: String(adminStats?.totalTrainees ?? 0), label: t('admin.profile.stat.trainees_managed'), icon: '👥', colorClass: 'text-cyan-400' },
            { value: String(adminStats?.validCertificates ?? 0), label: t('admin.profile.stat.certs_issued'), icon: '🏅', colorClass: 'text-amber-400' },
            { value: String(adminStats?.activeCourses ?? 0), label: t('admin.profile.stat.active_courses'), icon: '🎓', colorClass: 'text-blue-400' },
            { value: t('admin.profile.stat.admin_role_value'), label: t('admin.profile.stat.role'), icon: '🛡', colorClass: 'text-purple-400', sub: t('admin.profile.stat.full_access') },
          ].map((s) => (
            <div key={s.label} className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 text-center">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.colorClass}`}>{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-0.5">{s.label}</div>
              {s.sub && <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">{t('admin.overview.recent_activity')}</h3>
          <div className="space-y-0">
            {[
              { icon: '🟢', text: t('admin.profile.activity.course_created'), time: t('admin.profile.activity.time_2d') },
              { icon: '🔵', text: t('admin.profile.activity.cert_issued'), time: t('admin.profile.activity.time_3d') },
              { icon: '🟡', text: t('admin.profile.activity.announcement_sent'), time: t('admin.profile.activity.time_mar12') },
              { icon: '🟢', text: t('admin.profile.activity.trainee_added'), time: t('admin.profile.activity.time_mar10') },
            ].map((a, i) => (
              <div key={i} className="flex gap-3 py-2.5 border-l-[3px] border-cyan-500/30 pl-3">
                <span className="text-sm">{a.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-white">{a.text}</p>
                  <span className="text-xs text-slate-500">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">{t('admin.profile.view_activity_log')}</button>
        </div>
      </div>
    </div>
  );
}
