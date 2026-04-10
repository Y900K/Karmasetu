'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Audit log or error reporting service integration point
    console.error('Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-8">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">System Interruption</h1>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm">
          We encountered an unexpected error while processing your request. Our technical team has been notified of the instance.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="uppercase tracking-widest text-xs">Restore Session</span>
          </button>
          
          <Link
            href="/"
            className="w-full py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold rounded-2xl transition-all flex items-center justify-center gap-3"
          >
            <Home className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs font-black">Back to Safety</span>
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl text-left overflow-auto max-h-60">
            <p className="text-red-400 font-mono text-[10px] break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="mt-4 text-slate-600 font-mono text-[8px] whitespace-pre-wrap leading-relaxed">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
