import React, { useState } from 'react';
import { Course } from '@/data/coursePlayerDummyData';
import CourseRatingModal from './CourseRatingModal';
import { Trophy, GraduationCap, RotateCcw, ArrowLeft, CheckCircle2, AlertCircle, Search } from 'lucide-react';

type ConfettiPiece = {
  id: number;
  leftClass: string;
  sizeClass: string;
  colorClass: string;
  shapeClass: string;
  animClass: string;
};

// Simulated Confetti Component
const Confetti = () => {
  const [pieces] = useState<ConfettiPiece[]>(() => {
    const leftClasses = ['left-[4%]', 'left-[12%]', 'left-[20%]', 'left-[28%]', 'left-[36%]', 'left-[44%]', 'left-[52%]', 'left-[60%]', 'left-[68%]', 'left-[76%]', 'left-[84%]', 'left-[92%]'];
    const sizeClasses = ['w-1 h-1', 'w-1.5 h-1.5', 'w-2 h-2'];
    const colorClasses = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-white'];
    const shapeClasses = ['rounded-full', 'rounded-sm'];
    const animClasses = ['confetti-fall-a', 'confetti-fall-b', 'confetti-fall-c'];

    return Array.from({ length: 48 }).map((_, i) => ({
      id: i,
      leftClass: leftClasses[i % leftClasses.length],
      sizeClass: sizeClasses[i % sizeClasses.length],
      colorClass: colorClasses[i % colorClasses.length],
      shapeClass: shapeClasses[i % shapeClasses.length],
      animClass: animClasses[i % animClasses.length],
    }));
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div 
          key={p.id}
          className={`absolute -top-4 ${p.leftClass} ${p.sizeClass} ${p.colorClass} ${p.shapeClass} ${p.animClass}`}
        />
      ))}
      <style jsx>{`
        .confetti-fall-a { animation: confetti-fall-a 4.5s linear forwards; }
        .confetti-fall-b { animation: confetti-fall-b 5.2s linear forwards; }
        .confetti-fall-c { animation: confetti-fall-c 4.9s linear forwards; }
        @keyframes confetti-fall-a { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes confetti-fall-b { 0% { transform: translateY(0) rotate(90deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) rotate(810deg); opacity: 0; } }
        @keyframes confetti-fall-c { 0% { transform: translateY(0) rotate(180deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) rotate(900deg); opacity: 0; } }
      `}</style>
    </div>
  );
};

interface QuizResultsProps {
  course: Course;
  score: number;
  passed: boolean;
  certNo?: string | null;
  isFirstAttempt?: boolean;
  userAnswers?: Record<number, number>;
  onRetake: () => void;
  onBackToCourse: () => void;
  onSubmitFeedback?: (rating: number, comment: string) => Promise<void>;
}

export default function QuizResults({ course, score, passed, certNo, isFirstAttempt, onRetake, onBackToCourse, onSubmitFeedback }: QuizResultsProps) {
  const percent = Math.round((score / course.quiz.questions.length) * 100);
  const [showRating, setShowRating] = useState(Boolean(isFirstAttempt));

  return (
    <div className="fixed inset-0 top-[52px] z-[60] bg-[#0a1520] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <CourseRatingModal
        isOpen={showRating}
        onSubmit={async (rating, comment) => {
          if (onSubmitFeedback) {
            await onSubmitFeedback(rating, comment);
          }
          setShowRating(false);
        }}
        onSkip={() => setShowRating(false)}
      />
      {passed && <Confetti />}
      <div className="w-full max-w-lg bg-[#0d1b2a] border border-[#1e2d3d] rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
        
        {/* Background glow */}
        <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <div className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />

        <div className="relative z-10 w-40 h-40 mx-auto mb-8 animate-count-up">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e2d3d" strokeWidth="4" />
            <circle cx="18" cy="18" r="15.915" fill="none" stroke={passed ? '#10b981' : '#ef4444'} strokeWidth="4" strokeDasharray={`${percent} ${100 - percent}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-[10%] rounded-full bg-[#0d1b2a] flex flex-col items-center justify-center shadow-inner">
            <span className={`text-[42px] font-black leading-none ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {percent}%
            </span>
          </div>
        </div>

        <h2 className="text-[28px] font-black text-white mb-2 tracking-tight">
          {passed ? '🎉 Congratulations!' : 'Study Up!'}
        </h2>
        
        <p className="text-slate-400 text-[16px] mb-6">
          You answered <strong className="text-white">{score} out of {course.quiz.questions.length}</strong> questions correctly.
        </p>

        <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border mb-8 font-black uppercase tracking-widest text-[10px] ${
          passed 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {passed ? 'Passed the Assessment' : 'Failed the Assessment'}
          <span className="mx-2 w-px h-3 bg-white/10" />
          <span className="opacity-70 font-bold">
            Target: {course.passingScore}%
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {passed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <button 
                onClick={() => {
                  if (certNo) {
                    window.location.href = `/trainee/certificates?certNo=${encodeURIComponent(certNo)}`;
                  } else {
                    window.location.href = '/trainee/certificates';
                  }
                }} 
                className="px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-cyan-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                View Certificate
              </button>
              <button 
                onClick={() => window.location.href = '/trainee/training'} 
                className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                Finish & Dashboard
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button onClick={onRetake} className="flex-1 px-6 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-amber-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </button>
              <button onClick={onBackToCourse} className="flex-1 px-6 py-4 border border-slate-700 text-slate-300 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all hover:bg-white/5 hover:text-white flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Review Content
              </button>
            </div>
          )}
          {passed && (
            <button onClick={onBackToCourse} className="w-full px-6 py-3 text-slate-500 hover:text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] transition-colors flex items-center justify-center gap-2">
              <Search className="w-3.5 h-3.5" />
              Review Course Knowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
