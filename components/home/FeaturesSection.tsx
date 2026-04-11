'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import { featuresData } from '@/data/featuresData';
import { useLanguage } from '@/context/LanguageContext';

/* ───────────────── CARD 1: AI Chatbot ───────────────── */
function ChatbotMockup() {
  return (
    <div className="rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden text-[10px]">
      <div className="px-3 py-2 border-b border-[#1e293b] flex items-center gap-1.5">
        <span>🤖</span>
        <span className="font-semibold text-purple-400">Buddy AI</span>
      </div>
      <div className="p-2.5 space-y-1.5 min-h-[80px]">
        <div className="flex justify-end">
          <div className="rounded-lg bg-cyan-500/20 px-2 py-1 max-w-[80%]">
            <span className="text-cyan-400">PPE for chemical handling?</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-lg bg-[#1e293b] px-2 py-1 max-w-[80%]">
            <span className="text-slate-400">Acid-resistant gloves, face shield and safety boots.</span>
          </div>
        </div>
      </div>
      <div className="px-2.5 pb-2.5">
        <div className="rounded-full bg-[#1e293b] px-3 py-1.5 flex items-center justify-between">
          <span className="text-slate-500 text-[9px]">Type message...</span>
          <span className="text-cyan-400">→</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── CARD 2: AI Quiz Generator ───────────────── */
function QuizMockup() {
  const options = [
    { label: 'A', text: 'Call supervisor', selected: false },
    { label: 'B', text: 'Activate fire alarm', selected: true },
    { label: 'C', text: 'Use extinguisher', selected: false },
    { label: 'D', text: 'Evacuate immediately', selected: false },
  ];
  return (
    <div className="rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden text-[10px]">
      <div className="px-3 py-2 border-b border-[#1e293b] flex items-center justify-between">
        <span className="font-semibold text-cyan-400">📝 QUIZ — Question 2 of 5</span>
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="text-white font-medium text-[11px] mb-2">
          &ldquo;What is the first step in a fire emergency?&rdquo;
        </p>
        {options.map((opt) => (
          <div
            key={opt.label}
            className={`rounded-lg px-2.5 py-1.5 flex items-center gap-2 border ${
              opt.selected
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                : 'border-[#1e293b] bg-[#1e293b] text-slate-400'
            }`}
          >
            <span className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
              opt.selected ? 'border-cyan-400' : 'border-slate-600'
            }`}>
              {opt.selected && <span className="block w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </span>
            <span>{opt.label}  {opt.text}</span>
            {opt.selected && <span className="ml-auto text-cyan-400">✓</span>}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#1e293b]">
            <div className="h-full w-[40%] rounded-full bg-cyan-500" />
          </div>
          <span className="text-slate-500 text-[9px]">40% Complete</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── CARD 3: Interactive Training ───────────────── */
function TrainingMockup() {
  const modules = [
    { name: 'Module 1 - Introduction', status: 'done' },
    { name: 'Module 2 - Equipment', status: 'done' },
    { name: 'Module 3 - Procedures', status: 'current' },
    { name: 'Module 4 - Assessment', status: 'locked' },
  ];
  return (
    <div className="rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden text-[10px]">
      <div className="px-3 py-2 border-b border-[#1e293b]">
        <div className="font-semibold text-white">🔥 Fire Safety Protocol</div>
        <div className="text-slate-500 text-[9px]">Health & Safety · Beginner</div>
      </div>
      {/* Video area */}
      <div className="relative bg-slate-800 h-16 flex items-center justify-center mx-2.5 mt-2 rounded-lg">
        <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
          <span className="text-cyan-400 text-sm ml-0.5">▶</span>
        </div>
      </div>
      {/* Module list */}
      <div className="p-2.5 space-y-1">
        <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mb-1">Module List:</div>
        {modules.map((mod) => (
          <div key={mod.name} className="flex items-center gap-1.5 text-[9px]">
            {mod.status === 'done' && <span className="text-emerald-400">✅</span>}
            {mod.status === 'current' && <span className="text-blue-400">🔵</span>}
            {mod.status === 'locked' && <span className="text-slate-600">🔒</span>}
            <span className={
              mod.status === 'current' ? 'text-white font-medium' :
              mod.status === 'locked' ? 'text-slate-600' : 'text-slate-400'
            }>{mod.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-[#1e293b]">
            <div className="h-full w-[75%] rounded-full bg-emerald-500" />
          </div>
          <span className="text-slate-500 text-[9px]">3/4 done</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── CARD 4: Smart Certificates ───────────────── */
function CertificateMockup() {
  return (
    <div className="rounded-xl bg-[#020817] border border-amber-500/30 overflow-hidden text-[10px]">
      {/* Gold decorative line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      <div className="p-3 text-center">
        <div className="text-[9px] tracking-[0.2em] text-amber-400/80">✦ CERTIFICATE ✦</div>
        <div className="text-[9px] text-slate-400 mb-2">of Completion</div>
        <div className="border-t border-b border-[#1e293b] py-2 my-1.5">
          <div className="text-[8px] text-slate-500 mb-0.5">This certifies that</div>
          <div className="text-amber-400 font-bold text-xs tracking-widest">══ YOGESH KUMAR ══</div>
        </div>
        <div className="text-white font-medium text-[10px] mt-1.5">Fire Safety Protocol</div>
        <div className="text-slate-400 mt-0.5">Score: 91% · Jan 2026</div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-[8px] text-slate-500">
            <div className="w-5 h-5 rounded bg-[#1e293b] flex items-center justify-center text-[6px] text-slate-600">QR</div>
            <span>KS-CERT-2026-001</span>
          </div>
          <div className="h-6 w-6 rounded-full border-2 border-amber-500/60 flex items-center justify-center">
            <span className="text-[7px] text-amber-400 font-bold">KS</span>
          </div>
        </div>
      </div>
      {/* Gold decorative line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
    </div>
  );
}

/* ───────────────── CARD 5: Live Analytics ───────────────── */
function AnalyticsMockup() {
  const departments = [
    { name: 'Safety & EHS', pct: 94 },
    { name: 'Production', pct: 81 },
    { name: 'Maintenance', pct: 67 },
    { name: 'Electrical', pct: 73 },
  ];
  return (
    <div className="rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden text-[10px]">
      <div className="px-3 py-2 border-b border-[#1e293b]">
        <span className="font-semibold text-blue-400">📊 COMPLIANCE OVERVIEW</span>
      </div>
      <div className="p-2.5 space-y-1.5">
        {departments.map((dept) => {
          const barColor = dept.pct > 80 ? 'bg-emerald-500' : 'bg-amber-500';
          return (
            <div key={dept.name} className="flex items-center gap-2">
              <span className="text-slate-400 w-20 truncate text-[9px]">{dept.name}</span>
              <progress className={`flex-1 h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[#1e293b] ${barColor === 'bg-emerald-500' ? '[&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500' : '[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500'}`} value={dept.pct} max={100} />
              <span className="text-slate-400 w-7 text-right text-[9px]">{dept.pct}%</span>
            </div>
          );
        })}
        <div className="pt-1.5 border-t border-[#1e293b] mt-1.5 flex items-center gap-1.5">
          <span className="text-white font-medium">Overall: 78%</span>
          <span className="text-amber-400 text-[9px]">⚠️ Below 80%</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── CARD 6: Admin Dashboard ───────────────── */
function AdminMockup() {
  const users = [
    { name: 'Ravi S.', pct: 82, status: 'active' },
    { name: 'Priya V.', pct: 65, status: 'active' },
    { name: 'Suresh K.', pct: 34, status: 'overdue' },
  ];
  return (
    <div className="rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden text-[10px]">
      <div className="px-3 py-2 border-b border-[#1e293b]">
        <span className="font-semibold text-red-400">👥 USER MANAGEMENT</span>
      </div>
      <div className="p-2.5">
        {/* Header row */}
        <div className="flex items-center gap-2 text-[8px] text-slate-500 uppercase tracking-wider mb-1.5 px-1">
          <span className="w-14">Name</span>
          <span className="flex-1">Progress</span>
          <span className="w-4 text-center">St</span>
        </div>
        {users.map((user, i) => (
          <div key={user.name} className={`flex items-center gap-2 px-1 py-1 rounded ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
            <span className="text-slate-300 w-14 truncate text-[9px]">{user.name}</span>
            <div className="flex-1 flex items-center gap-1.5">
              <progress className={`flex-1 h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[#1e293b] ${user.pct > 50 ? '[&::-webkit-progress-value]:bg-cyan-500 [&::-moz-progress-bar]:bg-cyan-500' : '[&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500'}`} value={user.pct} max={100} />
              <span className="text-slate-400 text-[9px] w-7 text-right">{user.pct}%</span>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${user.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>
        ))}
        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[#1e293b]">
          <div className="flex-1 text-center py-1 rounded border border-[#1e293b] text-cyan-400 text-[9px] cursor-pointer hover:bg-cyan-500/10 transition-colors">
            + Add Trainee
          </div>
          <div className="flex-1 text-center py-1 rounded border border-[#1e293b] text-slate-400 text-[9px] cursor-pointer hover:bg-white/5 transition-colors">
            Export ↓
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Mockup map ───────────────── */
const mockupComponents: Record<string, React.FC> = {
  chatbot: ChatbotMockup,
  quiz: QuizMockup,
  training: TrainingMockup,
  certificate: CertificateMockup,
  analytics: AnalyticsMockup,
  admin: AdminMockup,
};

/* ═════════════════ FEATURES SECTION ═════════════════ */
export default function FeaturesSection() {
  const { t } = useLanguage();
  return (
    <section id="features" className="relative py-10 sm:py-12 lg:py-16">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-10 lg:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="cyan" className="mb-4">{t('features.badge')}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold max-w-2xl mx-auto"
          >
            {t('features.title_prefix')}{' '}
            <span className="text-cyan-400">{t('features.title_highlight')}</span>
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {featuresData.map((feature, i) => {
            const MockupComponent = mockupComponents[feature.mockupType];
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group rounded-2xl bg-[#0f172a] border border-[#1e293b] p-6 transition-all duration-300
                  hover:border-cyan-500 hover:shadow-[0_0_0_1px_#06b6d4,0_20px_40px_rgba(6,182,212,0.1)] hover:scale-[1.02]"
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${feature.iconBg} mb-4 text-lg`}>
                  {feature.icon}
                </div>

                {/* Mockup container */}
                <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-2">
                  <MockupComponent />
                </div>

                {/* Text */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {t(`feature.${feature.id}.title`)}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t(`feature.${feature.id}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
