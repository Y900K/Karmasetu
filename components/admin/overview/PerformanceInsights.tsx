import { useGlobalStats } from '@/context/GlobalStatsContext';

import { Sparkles } from 'lucide-react';

type PerformanceMetric = {
  value: string;
  label: string;
  color: string;
};

export default function PerformanceInsights() {
  const { adminStats, isLoading } = useGlobalStats();

  const metrics: PerformanceMetric[] = adminStats?.performanceInsights || [
    { value: '0%', label: 'OVERALL PASS RATE', color: '#f59e0b' },
    { value: '0', label: 'ACTIVE COURSES', color: '#06b6d4' },
    { value: '0', label: 'AVG MODULES/COURSE', color: '#f8fafc' },
    { value: '0%', label: 'CERTIFICATION RATE', color: '#10b981' },
  ];

  if (isLoading) {
    return <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-6 h-48 animate-pulse" />;
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        Performance Insights
      </h3>
      <div className="grid grid-cols-2 gap-4 relative z-10">
        {metrics.map((m) => {
          const isWarning = m.color === '#f59e0b';
          const isInfo = m.color === '#06b6d4';
          const isSuccess = m.color === '#10b981';
          const textColor = isWarning ? 'text-amber-500' : isInfo ? 'text-cyan-400' : isSuccess ? 'text-emerald-400' : 'text-slate-200';
          const glowColor = isWarning ? 'shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' : isInfo ? 'shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]' : isSuccess ? 'shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' : 'shadow-[inset_0_0_20px_rgba(248,250,252,0.02)]';
          
          return (
            <div key={m.label} className={`bg-slate-800/40 rounded-xl p-4 text-center border border-slate-700/50 hover:border-slate-600 transition-colors ${glowColor}`}>
              <div className={`text-2xl font-black ${textColor} drop-shadow-md`}>{m.value}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
