'use client';

import React, { useMemo } from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import StatusBadge from '@/components/admin/shared/StatusBadge';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import { useToast } from '@/components/admin/shared/Toast';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { useLanguage } from '@/context/LanguageContext';
import { AlertTriangle, Send, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { motion } from 'framer-motion';

type DeptComplianceRow = {
  name: string;
  compliance: number;
  status?: string;
};

type OverdueRow = {
  name: string;
  dept: string;
  course: string;
  daysOverdue: number;
};

function ComplianceContent() {
  const { adminStats, isLoading } = useGlobalStats();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const complianceValue = parseInt(adminStats?.compliance || '0', 10);
  const dashArray = `${complianceValue} ${100 - complianceValue}`;
  const targetThreshold = 80;

  const deptCompliance = useMemo<DeptComplianceRow[]>(() => {
    const raw = Array.isArray(adminStats?.deptCompliance) ? adminStats.deptCompliance : [];
    return raw
      .filter((row): row is DeptComplianceRow => typeof row?.name === 'string' && typeof row?.compliance === 'number')
      .map((row) => ({
        ...row,
        compliance: Math.max(0, Math.min(100, Math.round(row.compliance))),
      }));
  }, [adminStats?.deptCompliance]);

  const overdueList = useMemo<OverdueRow[]>(() => {
    const raw = Array.isArray(adminStats?.overdueList) ? adminStats.overdueList : [];
    return raw.filter(
      (item): item is OverdueRow =>
        typeof item?.name === 'string' &&
        typeof item?.dept === 'string' &&
        typeof item?.course === 'string' &&
        typeof item?.daysOverdue === 'number'
    );
  }, [adminStats?.overdueList]);

  const deptSorted = useMemo(() => [...deptCompliance].sort((a, b) => b.compliance - a.compliance), [deptCompliance]);

  const avgDeptCompliance = useMemo(() => {
    if (deptCompliance.length === 0) return 0;
    const total = deptCompliance.reduce((sum, row) => sum + row.compliance, 0);
    return Math.round(total / deptCompliance.length);
  }, [deptCompliance]);

  const bestDept = deptSorted[0];
  const worstDept = deptSorted[deptSorted.length - 1];
  const complianceGap = Math.max(0, targetThreshold - complianceValue);

  const deptBuckets = useMemo(() => {
    return {
      healthy: deptCompliance.filter((d) => d.compliance >= 80).length,
      watch: deptCompliance.filter((d) => d.compliance >= 60 && d.compliance < 80).length,
      critical: deptCompliance.filter((d) => d.compliance < 60).length,
    };
  }, [deptCompliance]);

  const interventionBuckets = useMemo(() => {
    return {
      critical: overdueList.filter((row) => row.daysOverdue > 14),
      high: overdueList.filter((row) => row.daysOverdue > 7 && row.daysOverdue <= 14),
      medium: overdueList.filter((row) => row.daysOverdue <= 7),
    };
  }, [overdueList]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-white/5 rounded-2xl" />
        <div className="h-40 bg-white/5 rounded-2xl" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t('admin.compliance.title')} sub={t('admin.compliance.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Factory Compliance Score */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
          
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
              <motion.circle 
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: dashArray }}
                transition={{ duration: 2, ease: "easeOut" }}
                cx="18" cy="18" r="15.915" fill="none" 
                stroke={complianceValue >= 80 ? "#10b981" : complianceValue >= 60 ? "#f59e0b" : "#ef4444"} 
                strokeWidth="3.5" strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white tracking-tighter">{adminStats?.compliance}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Global</span>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Industrial Safety Registry</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Factory Compliance Index</h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4">
              Current safety standing across {deptCompliance.length} departments based on mandatory training certifications and drill completion.
            </p>
            {complianceValue < 80 ? (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" /> 
                Action Required: {complianceGap}% below safety threshold
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                <ShieldAlert className="h-4 w-4" /> 
                Good Standing: Operational Safety Standards Met
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 flex items-center gap-4 transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <ShieldAlert className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{adminStats?.overdueTrainees}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical Overdue</div>
            </div>
          </div>
          <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 flex items-center gap-4 transition-all hover:bg-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <History className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">24h</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Sync Cycle</div>
            </div>
          </div>
          <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Relative Positioning</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between"><span className="text-slate-400">Global Index</span><span className="font-black text-white">{complianceValue}%</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Dept Avg</span><span className="font-black text-cyan-400">{avgDeptCompliance}%</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Top Dept</span><span className="font-black text-emerald-400">{bestDept ? `${bestDept.name} (${bestDept.compliance}%)` : 'NA'}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">At-Risk Dept</span><span className="font-black text-amber-400">{worstDept ? `${worstDept.name} (${worstDept.compliance}%)` : 'NA'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Departmental Integrity Status
            </h3>
          </div>
          <div className="space-y-6">
            {deptSorted.map((dept, idx) => {
              const status = dept.status || 'Warning';
              return (
                <motion.div 
                  key={`${dept.name}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group/item"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-white uppercase tracking-wider">{dept.name}</span>
                      <StatusBadge status={status as 'Compliant' | 'Warning' | 'At Risk'} />
                    </div>
                    <span className={`text-xs font-black tabular-nums ${dept.compliance >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {dept.compliance}%
                    </span>
                  </div>
                  <ProgressBar 
                    value={dept.compliance} 
                    height="h-2" 
                    color={dept.compliance >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'} 
                  />
                </motion.div>
              );
            })}
            {deptSorted.length === 0 && (
              <div className="text-xs text-slate-500 uppercase tracking-wider">No department compliance data available.</div>
            )}
          </div>
        </div>

        <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-5">Risk Segmentation</h3>
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-black">Healthy (80%+)</div>
              <div className="text-2xl font-black text-white mt-1">{deptBuckets.healthy}</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-black">Watch (60-79%)</div>
              <div className="text-2xl font-black text-white mt-1">{deptBuckets.watch}</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-red-400 font-black">Critical (&lt;60%)</div>
              <div className="text-2xl font-black text-white mt-1">{deptBuckets.critical}</div>
            </div>
          </div>
        </div>

        {/* Immediate Action Table */}
        <div className="xl:col-span-3 bg-[#0f172a]/80 backdrop-blur-xl border border-red-500/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              CRITICAL INTERVENTION QUEUE
            </h3>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Critical: {interventionBuckets.critical.length} | High: {interventionBuckets.high.length} | Medium: {interventionBuckets.medium.length}
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5">
                  {['Trainee Identity','Operational Unit','Safety Course','Violation Period','Protocol Enforcement'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {overdueList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                      No active violations detected. All personnel are compliant.
                    </td>
                  </tr>
                ) : (
                  overdueList
                    .sort((a, b) => b.daysOverdue - a.daysOverdue)
                    .slice(0, 10)
                    .map((t, idx: number) => (
                    <motion.tr 
                      key={`${t.name}-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group/row hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-white text-sm tracking-tight">{t.name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/5">{t.dept}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs text-slate-300 font-medium">{t.course}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`flex items-center gap-2 font-black tabular-nums ${t.daysOverdue > 14 ? 'text-red-500' : 'text-amber-500'}`}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t.daysOverdue}D OVERDUE
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/admin/announcements', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  title: `Compliance Warning: ${t.name}`,
                                  body: `${t.name} is overdue by ${t.daysOverdue} days for ${t.course}. Immediate completion is required.`,
                                  sentTo: [t.dept],
                                  priority: t.daysOverdue > 14 ? 'URGENT' : 'HIGH',
                                }),
                              });

                              const data = await response.json().catch(() => ({}));
                              if (!response.ok || !data.ok) {
                                throw new Error(data.message || 'Failed to send directive');
                              }

                              showToast(`Critical safety directive sent to ${t.name}.`);
                            } catch (error) {
                              showToast(error instanceof Error ? error.message : 'Failed to send directive', 'error');
                            }
                          }}
                          className="flex items-center gap-2 text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-xl transition-all hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 uppercase tracking-widest"
                        >
                          <Send className="h-3 w-3" /> Execute Warning
                        </button>
                      </td>
                    </motion.tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CompliancePage() {
  return (
    <ComplianceContent />
  );
}
