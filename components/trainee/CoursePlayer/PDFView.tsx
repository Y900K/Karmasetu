'use client';

import React, { useState, useEffect } from 'react';
import { getEmbeddableUrl } from '@/utils/resourceParser';
import { Document } from '@/data/coursePlayerDummyData';
import { AnimatePresence, motion } from 'framer-motion';

interface PDFViewProps {
  document: Document;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isLastDoc: boolean;
  language: 'HINGLISH' | 'EN';
}

export default function PDFView({ 
  document,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLastDoc,
  language,
}: PDFViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const embedUrl = getEmbeddableUrl(document.driveURL);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);



  const renderViewerContent = (className = '') => (
    <div className={`flex flex-col bg-[#1e2d3d] overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="h-16 bg-[#0a121d] border-b border-white/5 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl shadow-inner">📄</div>
          <div>
            <h4 className="text-white font-black text-xs uppercase tracking-widest truncate max-w-[140px] sm:max-w-md leading-none">
              {document.title}
            </h4>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1 block italic opacity-60">Verified Document Layer • 2026 r2</span>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">

          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 w-10 h-10 sm:w-auto sm:px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest border border-white/5"
            >
              <span className="text-lg leading-none">⛶</span>
              <span className="hidden sm:inline">Maximize</span>
            </button>
          )}
          <a
            href={document.driveURL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0d1b2a] bg-cyan-500 hover:bg-cyan-400 w-10 h-10 sm:w-auto sm:px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 font-black uppercase tracking-[0.1em] shadow-[0_5px_15px_-3px_rgba(6,182,212,0.4)] active:scale-95"
          >
            <span className="hidden sm:inline">Link</span>
            <span className="text-lg leading-none mt-[-2px]">↗</span>
          </a>
        </div>
      </div>

      <div className="flex-1 bg-black/20 w-full h-full relative flex flex-col">
        {embedUrl ? (
          <div className="w-full h-full relative bg-slate-900">
            <iframe 
              src={embedUrl} 
              className="w-full h-full border-none"
              title={document.title}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            {/* Fallback overlay (only visible if iframe doesn't cover it, or for styled loading) */}
            <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Synthesizing Document Stream...</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm font-semibold text-slate-300">Unable to embed this document preview.</p>
            <a
              href={document.driveURL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-2 text-xs font-black uppercase tracking-wide text-cyan-300 hover:bg-cyan-500/20"
            >
              Open Document Link ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={document.id}
        className="max-w-5xl mx-auto w-full h-[70vh] md:h-[calc(100vh-280px)] rounded-[2rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5"
      >
        {renderViewerContent('w-full h-full')}
      </motion.div>

      {/* Navigation Footer */}
      <div className="max-w-5xl mx-auto w-full mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-12">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl border border-[#334155] text-slate-300 font-medium hover:bg-white/5 hover:text-white disabled:opacity-30 transition-all flex items-center justify-center gap-2 group/prev"
        >
          <span className="group-hover/prev:-translate-x-1 transition-transform">←</span>
          {language === 'HINGLISH' ? 'पिछला' : 'Previous'}
        </button>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Reading Material Progress: <span className="text-cyan-400">Stable</span>
        </div>

        <button
          onClick={onNext}
          disabled={!hasNext}
          className="w-full sm:w-auto min-h-[48px] px-8 py-2.5 rounded-xl bg-cyan-500 text-[#0d1b2a] font-black hover:bg-cyan-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_-5px_rgba(6,182,212,0.3)] group/next"
        >
          {isLastDoc 
            ? (language === 'HINGLISH' ? 'परीक्षा शुरू करें' : 'Start Assessment')
            : (language === 'HINGLISH' ? 'अगला' : 'Next Material')
          }
          <span className="group-hover/next:translate-x-1 transition-transform">→</span>
        </button>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-[#0d1b2a] flex flex-col"
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-[100] w-12 h-12 bg-black/50 hover:bg-red-500/80 text-white rounded-2xl flex items-center justify-center transition-all shadow-2xl active:scale-90 border border-white/10"
              aria-label="Close full view"
            >
              <span className="text-2xl leading-none">✕</span>
            </button>
            {renderViewerContent('w-full h-full')}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
