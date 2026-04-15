'use client';

import React, { useState, useEffect } from 'react';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import KPICard from '@/components/admin/shared/KPICard';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Award, Target, 
  Zap, BarChart3, Activity, Shield 
} from 'lucide-react';

const RAW_COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

type TraineeAnalyticsData = {
  stats: {
    avgScore?: number;
    coursesCompleted?: number;
    totalInteractions?: number;
    certificates?: number;
  };
  charts: {
    radar?: Array<{ subject: string; A: number }>;
    line?: Array<{ date: string; score: number }>;
    bar?: Array<{ name: string; interactions: number }>;
  };
};

type TraineeAnalyticsResponse = {
  ok: true;
  stats: TraineeAnalyticsData['stats'];
  charts: TraineeAnalyticsData['charts'];
} | {
  ok: false;
  message?: string;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-white">
          {payload[0].value} <span className="text-[10px] text-slate-400 font-bold tracking-normal uppercase">
            {payload[0].name === 'score' ? '%' : 'Units'}
          </span>
        </p>
      </div>
    );
  }
  return null;
}

export default function TraineeAnalyticsPage() {
  const [data, setData] = useState<TraineeAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/trainee/analytics');
        const json = (await res.json()) as TraineeAnalyticsResponse;
        if (json.ok) {
          setData({ stats: json.stats, charts: json.charts });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  return (
    <TraineeLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
             <h1 className="text-2xl font-black text-white tracking-tight uppercase">Industrial Intelligence</h1>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Personal Performance Metrics & Telemetry</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard 
          label="AGGR. SCORE" 
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : `${data?.stats?.avgScore || 0}%`}
          icon={<Target className="h-6 w-6 text-cyan-400" />}
          themeColor="cyan"
          valueColor="text-cyan-400"
          delay={0}
        />
        <KPICard 
          label="COMPLETED" 
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : (data?.stats?.coursesCompleted || 0)}
          icon={<Shield className="h-6 w-6 text-amber-400" />}
          themeColor="amber"
          valueColor="text-amber-400"
          delay={100}
        />
        <KPICard 
          label="TELEMETRY" 
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : (data?.stats?.totalInteractions || 0)}
          icon={<Activity className="h-6 w-6 text-blue-400" />}
          themeColor="blue"
          valueColor="text-blue-400"
          delay={200}
        />
        <KPICard 
          label="CREDENTIALS" 
          value={isLoading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : (data?.stats?.certificates || 0)}
          icon={<Award className="h-6 w-6 text-emerald-400" />}
          themeColor="emerald"
          valueColor="text-emerald-400"
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Radar Chart: Skill Distribution */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] shadow-2xl group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Vector Analysis</h3>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {isLoading ? (
               <div className="h-full w-full flex items-center justify-center"><Zap className="h-8 w-8 text-slate-800 animate-pulse" /></div>
            ) : (data?.charts?.radar?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data?.charts?.radar ?? []}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Progress"
                    dataKey="A"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Insufficient course data</div>
            )}
          </div>
        </div>

        {/* Line Chart: Score History */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] shadow-2xl group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Quality Gradient</h3>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {isLoading ? (
               <div className="h-full w-full flex items-center justify-center"><Zap className="h-8 w-8 text-slate-800 animate-pulse" /></div>
            ) : (data?.charts?.line?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                <LineChart data={data?.charts?.line ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No assessment history available</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart: Weekly Activity */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] shadow-2xl group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interaction Velocity</h3>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            {isLoading ? (
               <div className="h-full w-full flex items-center justify-center"><Zap className="h-8 w-8 text-slate-800 animate-pulse" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                <BarChart data={data?.charts?.bar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="interactions" radius={[4, 4, 0, 0]}>
                    {data?.charts?.bar?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RAW_COLORS[index % RAW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Achievement Status - Donut */}
        <div className="bg-[#0f172a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col min-h-[400px] shadow-2xl group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achievement Phase</h3>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center pt-4">
             <div className="relative h-64 w-64">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                   <Award className="h-8 w-8 text-blue-500 mb-1" />
                   <div className="text-3xl font-black text-white">{data?.stats?.certificates || 0}</div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certs Issued</div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: data?.stats?.coursesCompleted || 0 },
                        { name: 'Remaining', value: Math.max(0, 10 - (data?.stats?.coursesCompleted || 0)) }
                      ]}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#1e293b" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-6 flex gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Certs</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-[#1e293b]"></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Goal Delta</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </TraineeLayout>
  );
}
