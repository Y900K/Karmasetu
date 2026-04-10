'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';
import { useGlobalStats } from '@/context/GlobalStatsContext';

interface DataEntry {
  name: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DataEntry }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 text-sm text-white shadow-2xl ring-1 ring-white/5">
        <div className="font-black tracking-tighter uppercase text-[10px] text-slate-400 mb-2 border-b border-white/5 pb-2">Status Analysis</div>
        <p className="font-black text-white uppercase tracking-wider mb-1">{payload[0].name}</p>
        <p className="text-2xl text-cyan-400 font-black flex items-baseline gap-1">
          {payload[0].value} 
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-1">Trainees</span>
        </p>
      </div>
    );
  }
  return null;
}

import { useLanguage } from '@/context/LanguageContext';

type StatusName = 'Active' | 'Overdue' | 'Inactive';

const STATUS_COLORS: Record<StatusName, string> = {
  Active: '#10b981',
  Overdue: '#ef4444',
  Inactive: '#475569',
};

function normalizeDistribution(raw: Array<{ name: string; value: number; color?: string }> | undefined): DataEntry[] {
  const totals: Record<StatusName, number> = {
    Active: 0,
    Overdue: 0,
    Inactive: 0,
  };

  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (!entry || typeof entry.name !== 'string' || !Number.isFinite(entry.value)) {
        return;
      }

      const normalizedName = entry.name.trim().toLowerCase();
      if (normalizedName === 'active') totals.Active += Math.max(0, Math.round(entry.value));
      if (normalizedName === 'overdue') totals.Overdue += Math.max(0, Math.round(entry.value));
      if (normalizedName === 'inactive') totals.Inactive += Math.max(0, Math.round(entry.value));
    });
  }

  return (Object.keys(totals) as StatusName[]).map((name) => ({
    name,
    value: totals[name],
    color: STATUS_COLORS[name],
  }));
}

export default function TraineeStatusDonut() {
  const { t } = useLanguage();
  const { adminStats, isLoading } = useGlobalStats();
  const legendData = useMemo(() => normalizeDistribution(adminStats?.distribution), [adminStats?.distribution]);
  const totalTrainees = legendData.reduce((sum, entry) => sum + entry.value, 0);
  const hasLiveData = totalTrainees > 0;
  const chartData: DataEntry[] = hasLiveData
    ? legendData
    : [{ name: 'No Data', value: 1, color: '#1e293b' }];
  
  if (isLoading) {
    return (
      <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 h-[320px] animate-pulse flex flex-col gap-4">
        <div className="h-4 w-32 bg-white/5 rounded-full" />
        <div className="flex-1 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group h-full transition-all duration-500 hover:border-amber-500/20">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/5 blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></span>
          {t('admin.overview.trainee_status')}
        </h3>
        <div className="text-[10px] font-bold text-amber-500/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          REAL-TIME DATA
        </div>
      </div>

      <div className="relative z-10">
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="99%" height="100%">
            <PieChart>
              <Pie 
                data={chartData}
                cx="50%" 
                cy="50%" 
                innerRadius={48} 
                outerRadius={72} 
                paddingAngle={4} 
                dataKey="value" 
                stroke="none"
                animationDuration={1500}
              >
                {chartData.map((entry: DataEntry, i: number) => (<Cell key={i} fill={entry.color} />))}
                <Label 
                  position="center"
                  content={({ viewBox }) => {
                    if (!viewBox || !('cx' in viewBox)) return null;
                    return (
                      <g>
                        <text x={viewBox.cx} y={(viewBox.cy || 0) - 5} textAnchor="middle" dominantBaseline="middle" className="fill-white font-black text-2xl tracking-tighter">
                          {totalTrainees}
                        </text>
                        <text x={viewBox.cx} y={(viewBox.cy || 0) + 15} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 font-black text-[8px] uppercase tracking-widest">
                          {hasLiveData ? 'TOTAL' : 'NO DATA'}
                        </text>
                      </g>
                    );
                  }}
                />
              </Pie>
              {hasLiveData && <Tooltip content={<CustomTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {legendData.map((d: DataEntry) => {
            const colorClass =
              d.color === '#10b981'
                ? 'bg-emerald-400 ring-2 ring-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : d.color === '#ef4444'
                ? 'bg-red-500 ring-2 ring-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                : 'bg-slate-500 ring-2 ring-slate-500/20';
            
            return (
              <div key={d.name} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/5 transition-all hover:bg-white/[0.08] hover:border-white/10 group/btn">    
                <span className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />     
                <span className="text-slate-500 group-hover/btn:text-slate-400 transition-colors uppercase tracking-[0.1em]">{d.name}</span>
                <span className="text-white ml-1 font-black text-xs">{d.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}