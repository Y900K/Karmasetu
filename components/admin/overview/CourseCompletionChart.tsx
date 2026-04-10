'use client';

import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import { useLanguage } from '@/context/LanguageContext';

const shortNames: Record<string, string> = {
  'Fire Safety Protocol': 'Fire Safety',
  'Chemical Handling SOP': 'Chemical SOP',
  'Machine Operations Level 1': 'Machine Ops',
  'Electrical Safety Basics': 'Electrical',
  'PPE & Hazard Awareness': 'PPE Hazard',
  'Leadership & Safety SOPs': 'Leadership',
};

const getColor = (v: number) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';

interface CompletionData {
  index: number;
  name: string;
  completion: number;
  change: number;
}

interface TooltipPayload {
  value: number;
  payload: CompletionData;
  dataKey?: string;
}

const CustomTooltip = ({ active, payload, t }: { active?: boolean; payload?: TooltipPayload[], t: (key: string) => string }) => {
  if (!active || !payload?.length) return null;

  const course = payload[0].payload;
  const changePrefix = course.change > 0 ? '+' : '';
  const changeColor = course.change > 0 ? 'text-emerald-400' : course.change < 0 ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white shadow-2xl">
      <div className="font-extrabold tracking-wide uppercase text-xs mb-1">{course.name}</div>
      <div className="text-cyan-400 font-bold text-lg">{course.completion}% <span className="text-slate-400 text-xs font-normal">{t('admin.overview.pass_rate')}</span></div>
      <div className={`text-xs mt-1 font-semibold ${changeColor}`}>Change vs previous: {changePrefix}{course.change}%</div>
    </div>
  );
};

function normalizeCompletionData(raw: Array<{ name: string; value: number }> | undefined): CompletionData[] {
  if (!Array.isArray(raw)) return [];

  const normalized = raw
    .filter((entry) => typeof entry?.name === 'string' && Number.isFinite(entry?.value))
    .map((entry) => ({
      name: shortNames[entry.name] || (entry.name.trim().length > 0 ? entry.name : 'Untitled Course'),
      completion: Math.max(0, Math.min(100, Math.round(entry.value))),
    }))
    .slice(0, 15);

  return normalized.map((entry, index) => {
    const prev = index > 0 ? normalized[index - 1].completion : entry.completion;
    return {
      index: index + 1,
      name: entry.name,
      completion: entry.completion,
      change: entry.completion - prev,
    };
  });
}

function shortAxisLabel(label: string): string {
  return label.length > 24 ? `${label.slice(0, 22)}...` : label;
}

export default function CourseCompletionChart() {
  const { t } = useLanguage();
  const { adminStats, isLoading } = useGlobalStats();

  const data = useMemo(() => normalizeCompletionData(adminStats?.completionRates), [adminStats?.completionRates]);
  const hasData = data.length > 0;
  const hasAnyCompletion = data.some((item) => item.completion > 0);
  const hasManyPoints = data.length > 6;
  const barSize = Math.max(10, Math.min(30, Math.floor(280 / Math.max(data.length, 1))));
  const avgCompletion = hasData ? Math.round(data.reduce((sum, item) => sum + item.completion, 0) / data.length) : 0;

  if (isLoading) {
    return <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 h-[300px] animate-pulse" />;
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group h-full">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          {t('admin.overview.course_completion')}
        </h3>
        {hasData && (
          <div className="text-[11px] text-slate-400 font-semibold">
            {data.length} courses · avg {avgCompletion}%
          </div>
        )}
      </div>
      {hasData && hasAnyCompletion ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="99%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: hasManyPoints ? 50 : 25, left: -18 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={shortAxisLabel}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={hasManyPoints ? -35 : 0}
                textAnchor={hasManyPoints ? 'end' : 'middle'}
                height={hasManyPoints ? 60 : 30}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="completion" radius={[4, 4, 0, 0]} animationBegin={200} animationDuration={900} barSize={barSize}>
                {data.map((entry, i) => (<Cell key={`${entry.name}-${i}`} fill={getColor(entry.completion)} />))}
              </Bar>
              <Line
                type="monotone"
                dataKey="change"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ r: 2, fill: '#22d3ee' }}
                activeDot={{ r: 4 }}
                animationBegin={450}
                animationDuration={900}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-center gap-2">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            No completion data yet
          </div>
          <div className="text-slate-500 text-[11px]">
            The chart will auto-populate once trainees start completing assigned courses.
          </div>
        </div>
      )}
    </div>
  );
}
