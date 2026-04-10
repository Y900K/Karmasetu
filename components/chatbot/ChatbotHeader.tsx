'use client';

import React from 'react';
import { useChatbot } from '@/context/ChatbotContext';
import { RotateCcw, X } from 'lucide-react';

export default function ChatbotHeader() {
  const {
    isOpen,
    setIsOpen,
    clearMessages,
    buddyLanguage,
    setBuddyLanguage,
  } = useChatbot();

  if (!isOpen) return null;

  return (
    <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#334155] bg-[#1e293b] px-3 shadow-lg sm:h-16 sm:px-4">
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-lg shadow-lg shadow-cyan-500/20 sm:h-10 sm:w-10 sm:rounded-xl sm:text-xl">
            🤖
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#1e293b] rounded-full" />
        </div>
        <div>
          <h3 className="leading-none tracking-tight text-white text-[11px] font-black sm:text-sm">BUDDY AI <span className="text-cyan-400">ASSISTANT</span></h3>
          <p className="mt-1.5 hidden items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            Industrial Safety Expert
          </p>
        </div>
      </div>

      {/* Right section: Language, Restart, & Close */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Language Controls */}
        <div className="flex h-7 items-center rounded-lg border border-white/5 bg-[#0f172a] p-0.5 sm:h-8">
          <button
            type="button"
            onClick={() => setBuddyLanguage('english')}
            className={`rounded-[6px] px-2 py-1 text-[9px] font-black transition-all sm:px-2.5 sm:text-[10px] ${
              buddyLanguage === 'english'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Switch Buddy language to English"
            aria-label="Switch Buddy language to English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setBuddyLanguage('hinglish')}
            className={`rounded-[6px] px-2 py-1 text-[9px] font-black transition-all sm:px-2.5 sm:text-[10px] ${
              buddyLanguage === 'hinglish'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            title="Switch Buddy language to Hinglish"
            aria-label="Switch Buddy language to Hinglish"
          >
            हि
          </button>
        </div>

        {/* Action Buttons */}
        <div className="ml-1 flex items-center gap-1 border-l border-white/10 pl-1.5 sm:pl-2">
          <button
            type="button"
            onClick={() => clearMessages()}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-slate-800/30 text-slate-400 transition-all hover:bg-slate-700/50 hover:text-white sm:h-8 sm:w-8"
            title="Restart Session"
            aria-label="Restart Session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="group flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 sm:h-8 sm:w-8"
            title="Close Buddy AI"
            aria-label="Close Buddy AI"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
