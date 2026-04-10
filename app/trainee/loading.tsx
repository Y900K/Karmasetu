export default function TraineeLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#020817]/50 min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-4 border-white/10" />
          <div className="absolute h-full w-full rounded-full border-4 border-amber-400 border-t-transparent animate-spin drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
          <span className="text-[10px] font-bold text-amber-400">Loading</span>
        </div>
        <p className="text-sm text-slate-400 animate-pulse tracking-widest pl-2">Syncing Progress...</p>
      </div>
    </div>
  );
}