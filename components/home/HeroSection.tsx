'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/context/LanguageContext';
import { Shield, Flame, FlaskConical, Settings, Bot, Award, Sparkles, GraduationCap, ClipboardCheck, Users } from 'lucide-react';

const wordAnimation: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="animate-float relative w-full max-w-md"
    >
      <div className="rounded-2xl bg-bg-secondary border border-border p-4 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 opacity-60">
            <Shield className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-black tracking-[0.2em] text-white">
              KARMASETU COMMAND
            </span>
          </div>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500/50" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500/50" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
          </div>
        </div>

        {/* Stat cards 2x2 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { val: '94%', label: 'COMPLIANCE', color: 'text-accent-cyan' },
            { val: '15+', label: 'COURSES', color: 'text-text-primary' },
            { val: '96', label: 'AI SCORE', color: 'text-warning' },
            { val: '124', label: 'TRAINEES', color: 'text-success' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
              className="rounded-xl bg-bg-card p-3 text-center"
            >
              <div className={`text-xl font-bold ${stat.color}`}>{stat.val}</div>
              <div className="text-[9px] font-medium tracking-wider text-text-muted mt-0.5">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active courses */}
        <div className="mb-3">
          <div className="text-[9px] font-black tracking-[0.1em] text-slate-500 mb-2 uppercase">
            ACTIVE TRAINING UNITS
          </div>
          {[
            { icon: <Flame className="h-3 w-3 text-orange-400" />, name: 'Fire Safety Protocol', pct: 78, color: 'bg-cyan-500' },
            { icon: <FlaskConical className="h-3 w-3 text-purple-400" />, name: 'Chemical Handling SOP', pct: 52, color: 'bg-amber-500' },
            { icon: <Settings className="h-3 w-3 text-slate-400" />, name: 'Machine Operations', pct: 91, color: 'bg-emerald-500' },
          ].map((course, i) => (
            <div key={course.name} className="flex items-center gap-2 mb-2">
              <div className="p-1 rounded bg-white/5 border border-white/5">
                {course.icon}
              </div>
              <span className="text-[10px] text-slate-400 flex-1 truncate font-medium">{course.name}</span>
              <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${course.pct}%` }}
                  transition={{ delay: 0.8 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${course.color}`}
                />
              </div>
              <span className="text-[9px] text-slate-500 w-6 text-right font-bold">{course.pct}%</span>
            </div>
          ))}
        </div>

        {/* AI Assistant bubble */}
        <div className="rounded-xl bg-[#020817] p-3 mb-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Bot className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Buddy AI Assistant</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="self-end rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 max-w-[85%]">
              <p className="text-[9px] text-cyan-200 leading-tight">What PPE is required for chemical storage?</p>
            </div>
            <div className="self-start rounded-lg bg-white/5 border border-white/5 px-2.5 py-1.5 max-w-[85%]">
              <p className="text-[9px] text-slate-400 leading-tight">Acid-resistant gloves, goggles, face shield & safety boots are mandatory.</p>
            </div>
          </div>
        </div>

        {/* Certificate badge */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 px-3 py-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest">CERTIFIED PREVIEW</div>
            <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Assessment Score: 96%</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  const { t } = useLanguage();
  const line1Words = [t('hero.word1'), t('hero.word2')];
  const line2Words = [t('hero.word3'), t('hero.word4')];
  const stats = [
    { icon: <GraduationCap className="h-4 w-4" />, label: t('hero.stats.courses') },
    { icon: <ClipboardCheck className="h-4 w-4" />, label: t('hero.stats.quizzes') },
    { icon: <Bot className="h-4 w-4" />, label: t('hero.stats.assistant') },
    { icon: <Users className="h-4 w-4" />, label: t('hero.stats.trainees') },
  ];

  return (
    <section id="hero" className="relative flex min-h-[calc(62vh-4rem)] items-start overflow-hidden pt-4 md:min-h-[calc(74vh-5rem)] md:pt-6">
      {/* Background */}
      <div className="absolute inset-0 bg-bg-primary" />
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.06),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 grid-pattern opacity-50 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left column */}
          <div className="w-full">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="cyan">
                <Sparkles className="h-3 w-3 animate-pulse-glow mr-1" /> {t('hero.badge')}
              </Badge>
            </motion.div>

            {/* Headline */}
            <div className="mb-5 mt-5 sm:mb-6 sm:mt-6">
              <h1 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                <span className="flex flex-wrap gap-x-4">
                  {line1Words.map((word, i) => (
                    <motion.span
                      key={word}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={wordAnimation}
                      className="text-text-primary"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
                <span className="flex flex-wrap gap-x-4">
                  {line2Words.map((word, i) => (
                    <motion.span
                      key={word}
                      custom={i + line1Words.length}
                      initial="hidden"
                      animate="visible"
                      variants={wordAnimation}
                      className="text-accent-cyan"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </h1>
            </div>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-5 max-w-xl text-base leading-relaxed text-text-muted sm:mb-6 sm:text-lg"
            >
              {t('hero.description')}
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-7 flex flex-wrap gap-x-3 gap-y-2 text-sm text-text-muted sm:mb-8"
            >
              {stats.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  <span className="flex items-center gap-1.5">
                    <span>{stat.icon}</span>
                    <span>{stat.label}</span>
                  </span>
                  {i < stats.length - 1 && (
                    <span className="hidden sm:inline text-border">·</span>
                  )}
                </React.Fragment>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mb-7 mt-3 flex flex-col gap-4 sm:mb-8 sm:mt-4 sm:flex-row sm:gap-6"
            >
              <Button variant="solid" size="lg" href="/register" prefetch={true}>
                {t('hero.start_training')}
              </Button>
              <Button variant="ghost" size="lg" href="/login" prefetch={true}>
                {t('hero.sign_in')}
              </Button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-xs text-text-muted"
            >
              {t('hero.trust')}
            </motion.p>
          </div>

          {/* Right column — Dashboard mockup */}
          <div className="hidden md:flex w-full justify-center items-center">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
