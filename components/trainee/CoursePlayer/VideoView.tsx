'use client';

import React, { useRef } from 'react';
import { parseMediaURL } from '@/utils/youtubeParser';
import { Lesson } from '@/data/coursePlayerDummyData';

type FullscreenDocumentLike = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElementLike = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

interface VideoViewProps {
  lesson: Lesson;
  onMarkComplete: (lessonId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  language: 'HINGLISH' | 'EN';
  totalLessons: number;
  currentLessonIndex: number;
  hasDocs: boolean;
}

export default function VideoView({
  lesson,
  onMarkComplete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  language,
  totalLessons,
  currentLessonIndex,
  hasDocs,
}: VideoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedUrl = parseMediaURL(lesson.youtubeURL);

  const toggleFullscreen = () => {
    const el = containerRef.current as FullscreenElementLike | null;
    const fsDoc = document as FullscreenDocumentLike;
    if (!document.fullscreenElement && !fsDoc.webkitFullscreenElement) {
      if (el?.requestFullscreen) {
        void el.requestFullscreen().catch((err: unknown) => console.error(err));
      } else if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (fsDoc.webkitExitFullscreen) fsDoc.webkitExitFullscreen();
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group shadow-2xl shadow-black/50"
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`${lesson.title} video`}
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1b2a] border border-white/5 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 grid-pattern" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 blur-[100px] rounded-full" />
            
            <div className="relative z-10 flex flex-col items-center text-center px-8">
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 relative">
                 <div className="absolute inset-x-0 inset-y-0 rounded-full border border-cyan-500/40 animate-[ping_3s_linear_infinite]" />
                 <span className="text-5xl animate-bounce">🤖</span>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Video Content Pending</h3>
              <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed mb-8">
                The industrial training visual for <span className="text-cyan-400 font-bold">“{lesson.title}”</span> is currently being finalized in the secure cloud registry.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {lesson.youtubeURL && (
                  <a
                    href={lesson.youtubeURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-cyan-500 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 group/link"
                  >
                    <span>External Source Port</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                )}
                <div className="px-6 py-3 border border-white/10 rounded-xl bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                   Registry ID: {lesson.id.slice(-8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Fullscreen Overlay Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 sm:bottom-4 sm:top-auto bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm p-2 px-3 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1"
          aria-label="Full Screen"
        >
          ⛶ <span className="text-xs sm:hidden">Full Screen</span>
        </button>
      </div>

      <div className="mt-6 md:mt-8 px-2 sm:px-0">
        <h2 className="text-2xl font-bold text-white mb-2">{lesson.title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mb-8">
          {lesson.description}
        </p>

        {/* Video Controls / Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#1e2d3d] pt-6 pb-12">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl border border-[#334155] text-slate-300 font-medium hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-2"
          >
            <span>←</span> {language === 'HINGLISH' ? 'पिछला' : 'Previous'}
          </button>

          <button
            onClick={() => onMarkComplete(lesson.id)}
            className={`w-full sm:w-auto min-h-[48px] px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
              lesson.completed
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default shadow-none'
                : 'bg-[#00c8ff] text-[#0d1b2a] hover:bg-[#33d4ff] hover:scale-105 shadow-[#00c8ff]/20'
            }`}
          >
            {lesson.completed ? (
              <>
                <span>✅</span> {language === 'HINGLISH' ? 'पूरा हुआ' : 'Completed'}
              </>
            ) : (
              <>
                <span className="text-lg leading-none mt-[-2px]">✓</span> {language === 'HINGLISH' ? 'पूरा करें' : 'Mark Complete'}
              </>
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext || !lesson.completed}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl text-[#00c8ff] border border-[#00c8ff]/30 font-bold hover:bg-[#00c8ff]/10 disabled:opacity-30 disabled:border-[#334155] disabled:text-slate-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group/next"
            title={!lesson.completed ? (language === 'HINGLISH' ? 'पहले इस लेसन को पूरा करें' : 'Mark this lesson complete first') : ''}
          >
            <div className="flex flex-col items-end sm:items-center">
              <div className="flex items-center gap-2">
                <span>
                  {currentLessonIndex < totalLessons - 1 
                    ? (language === 'HINGLISH' ? 'अगला लेसन' : 'Next Lesson')
                    : hasDocs 
                      ? (language === 'HINGLISH' ? 'अगला: पढ़ाई का सामान' : 'Next: Reading Material')
                      : (language === 'HINGLISH' ? 'अगला: परीक्षा' : 'Next: Assessment')
                  }
                </span>
                <span className="group-hover/next:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
