'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart3 } from 'lucide-react';

type DeptCompliance = {
  name: string;
  compliance: number;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DeptCompliance }> }) {
  if (!active || !payload?.[0]) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white shadow-xl">
      <div className="font-semibold text-slate-200 mb-1">{row.name}</div>
      <div className="text-cyan-400 font-bold">{row.compliance}%</div>
    </div>
  );
}

function getBarColor(value: number): string {
  if (value >= 80) return '#10b981';
  if (value >= 60) return '#f59e0b';
  return '#ef4444';
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 12)}...` : label;
}

export default function DeptComplianceSection() {
  const { adminStats, isLoading } = useGlobalStats();
  const { t } = useLanguage();

  const raw = Array.isArray(adminStats?.deptCompliance) ? adminStats.deptCompliance : [];
  const data: DeptCompliance[] = raw
    .filter((dept): dept is DeptCompliance => typeof dept?.name === 'string' && Number.isFinite(dept?.compliance))
    .map((dept) => ({
      name: dept.name,
      compliance: Math.max(0, Math.min(100, Math.round(dept.compliance))),
    }))
    .sort((a, b) => b.compliance - a.compliance)
    .slice(0, 15);

  if (isLoading) {
    return <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 h-[320px] animate-pulse" />;
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
        <BarChart3 className="w-4 h-4 text-amber-400" />
        {t('admin.overview.dept_compliance')}
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-slate-500">{t('admin.overview.no_dept_data')}</p>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 44 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={truncateLabel}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-24}
                textAnchor="end"
                height={56}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={<CustomTooltip />}
              />
              <Bar dataKey="compliance" radius={[4, 4, 0, 0]} animationDuration={900}>
                {data.map((entry, idx) => (
                  <Cell key={`${entry.name}-${idx}`} fill={getBarColor(entry.compliance)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
