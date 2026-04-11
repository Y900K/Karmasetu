'use client';

import React, { useState } from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import { useToast } from '@/components/admin/shared/Toast';
import { useLanguage } from '@/context/LanguageContext';
import DepartmentManager from '@/components/admin/settings/DepartmentManager';

type SettingsSection = 'general' | 'compliance' | 'notifications' | 'roles' | 'departments';

type InputFieldProps = {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
};

function InputField({ label, value, onChange, type = 'text', hint }: InputFieldProps) {
  const fieldId = `settings-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        id={fieldId}
        type={type}
        value={value}
        title={label}
        aria-label={label}
        placeholder={label}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
      />
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
};

function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1e293b] last:border-0">
      <div>
        <div className="text-sm text-white">{label}</div>
        {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        title={label}
        aria-label={label}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-cyan-500' : 'bg-[#334155]'}`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

const DEFAULT_SETTINGS = {
  companyName: 'KarmaSetu Industrial Training',
  companyLogo: '/logo.png',
  defaultRole: 'Worker / Operator',
  complianceThreshold: 80,
  certificateExpiry: 12,
  autoAssignNewCourses: true,
  overdueGracePeriod: 7,
  notifyOnEnrollment: true,
  notifyOnCompletion: true,
  notifyOnOverdue: true,
  notifyFrequency: 'daily',
  emailDigest: true,
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    showToast(t('admin.settings.saved_success'), 'success');
  };

  const sections: { key: SettingsSection; label: string; icon: string }[] = [
    { key: 'general', label: t('admin.settings.section.general'), icon: '🟦' },
    { key: 'departments', label: typeof t('admin.settings.section.departments') === 'string' && t('admin.settings.section.departments') !== 'admin.settings.section.departments' ? t('admin.settings.section.departments') : 'Departments', icon: '🏢' },
    { key: 'compliance', label: t('admin.settings.section.compliance'), icon: '🛡️' },
    { key: 'notifications', label: t('admin.settings.section.notifications'), icon: '🔔' },
    { key: 'roles', label: typeof t('admin.settings.section.roles') === 'string' && t('admin.settings.section.roles') !== 'admin.settings.section.roles' ? t('admin.settings.section.roles') : 'Roles and Defaults', icon: '👥' },
  ];

  return (
    <>
      <PageHeader
        title={t('admin.settings.title')}
        sub={t('admin.settings.subtitle')}
        action={
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors disabled:opacity-50"
          >
            {isSaving ? t('admin.settings.saving') : t('admin.settings.save_changes')}
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Section Tabs */}
        <div className="lg:w-56 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeSection === s.key
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Panel */}
        <div className="flex-1 bg-[#1e293b] border border-[#334155] rounded-2xl p-6">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🏢 General Settings</h3>
              <InputField
                label="Company Name"
                value={settings.companyName}
                onChange={(v) => setSettings({ ...settings, companyName: v })}
                hint="Displayed in headers, certificates, and emails"
              />
              <InputField
                label="Logo URL"
                value={settings.companyLogo}
                onChange={(v) => setSettings({ ...settings, companyLogo: v })}
                hint="Path or URL to your company logo (recommended: 128×128px)"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Certificate Validity</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    title="Certificate validity in months"
                    aria-label="Certificate validity in months"
                    placeholder="12"
                    value={settings.certificateExpiry}
                    onChange={(e) => setSettings({ ...settings, certificateExpiry: parseInt(e.target.value) || 12 })}
                    className="w-24 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  />
                  <span className="text-sm text-slate-400">months after issue date</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'departments' && (
            <DepartmentManager />
          )}

          {activeSection === 'compliance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🛡️ Compliance Settings</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance Threshold (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    title="Compliance threshold percentage"
                    aria-label="Compliance threshold percentage"
                    min={50}
                    max={100}
                    value={settings.complianceThreshold}
                    onChange={(e) => setSettings({ ...settings, complianceThreshold: parseInt(e.target.value) })}
                    className="flex-1 accent-cyan-500"
                  />
                  <span className="text-xl font-bold text-cyan-400 w-14 text-right">{settings.complianceThreshold}%</span>
                </div>
                <p className="text-[10px] text-slate-500">Departments below this threshold are flagged as &ldquo;At Risk&rdquo;</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Grace Period</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    title="Overdue grace period in days"
                    aria-label="Overdue grace period in days"
                    placeholder="7"
                    value={settings.overdueGracePeriod}
                    onChange={(e) => setSettings({ ...settings, overdueGracePeriod: parseInt(e.target.value) || 0 })}
                    className="w-24 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  />
                  <span className="text-sm text-slate-400">days after deadline before marking overdue</span>
                </div>
              </div>
              <Toggle
                label="Auto-assign new courses to all trainees"
                checked={settings.autoAssignNewCourses}
                onChange={(v) => setSettings({ ...settings, autoAssignNewCourses: v })}
                hint="When enabled, newly created courses are automatically assigned to all active trainees"
              />
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🔔 Notification Settings</h3>
              <Toggle
                label="Enrollment Notifications"
                checked={settings.notifyOnEnrollment}
                onChange={(v) => setSettings({ ...settings, notifyOnEnrollment: v })}
                hint="Notify admin when a trainee enrolls in a course"
              />
              <Toggle
                label="Completion Notifications"
                checked={settings.notifyOnCompletion}
                onChange={(v) => setSettings({ ...settings, notifyOnCompletion: v })}
                hint="Notify admin when a trainee completes a course"
              />
              <Toggle
                label="Overdue Alerts"
                checked={settings.notifyOnOverdue}
                onChange={(v) => setSettings({ ...settings, notifyOnOverdue: v })}
                hint="Send alerts when trainees miss their deadlines"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alert Frequency</label>
                <div className="flex gap-2">
                  {['instant', 'daily', 'weekly'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setSettings({ ...settings, notifyFrequency: freq })}
                      className={`px-4 py-2 rounded-xl text-sm capitalize cursor-pointer transition-colors ${settings.notifyFrequency === freq ? 'bg-cyan-500 text-slate-900 font-semibold' : 'bg-[#0f172a] border border-[#334155] text-slate-400 hover:text-white'}`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle
                label="Weekly Email Digest"
                checked={settings.emailDigest}
                onChange={(v) => setSettings({ ...settings, emailDigest: v })}
                hint="Send a weekly summary of platform activity to admin email"
              />
            </div>
          )}

          {activeSection === 'roles' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">👥 Roles & Defaults</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default Role for New Users</label>
                <select
                  title="Default role for new users"
                  aria-label="Default role for new users"
                  value={settings.defaultRole}
                  onChange={(e) => setSettings({ ...settings, defaultRole: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {['Worker / Operator', 'Supervisor / Team Lead', 'Manager / Department Head', 'Safety Officer', 'HR / Admin'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">Role assigned to new registrations by default</p>
              </div>

              <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-white mb-3">Available Roles</h4>
                <div className="space-y-2">
                  {[
                    { role: 'Worker / Operator', desc: 'Standard trainee with access to assigned courses and quizzes', color: 'bg-cyan-500/15 text-cyan-400' },
                    { role: 'Supervisor / Team Lead', desc: 'Can view team progress and compliance reports', color: 'bg-amber-500/15 text-amber-400' },
                    { role: 'Safety Officer', desc: 'Access to safety reports and compliance dashboards', color: 'bg-emerald-500/15 text-emerald-400' },
                    { role: 'HR / Admin', desc: 'Full administrative access to all platform features', color: 'bg-purple-500/15 text-purple-400' },
                  ].map((r) => (
                    <div key={r.role} className="flex items-center gap-3 py-2 border-b border-[#1e293b] last:border-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.color}`}>{r.role}</span>
                      <span className="text-xs text-slate-500 flex-1">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
