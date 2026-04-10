'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import { domainsData } from '@/data/domainsData';
import { useLanguage } from '@/context/LanguageContext';

/* ─── SVG overlay icons (faint outlines) ─── */
const svgOverlays: Record<string, React.ReactNode> = {
  'health-safety': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-24 h-24 text-white/[0.12]">
      <path d="M50 15C50 15 25 30 25 55C25 68 36 80 50 85C64 80 75 68 75 55C75 30 50 15 50 15Z" />
      <path d="M40 55L48 63L62 47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'machine-ops': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-24 h-24 text-white/[0.12]">
      <circle cx="50" cy="50" r="20" />
      <circle cx="50" cy="50" r="8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + 22 * Math.cos(rad);
        const y1 = 50 + 22 * Math.sin(rad);
        const x2 = 50 + 30 * Math.cos(rad);
        const y2 = 50 + 30 * Math.sin(rad);
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="5" strokeLinecap="round" />;
      })}
    </svg>
  ),
  'quality-compliance': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-24 h-24 text-white/[0.12]">
      <path d="M50 10L60 35H85L65 52L72 78L50 62L28 78L35 52L15 35H40L50 10Z" />
    </svg>
  ),
  'chemical-handling': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-24 h-24 text-white/[0.12]">
      <path d="M40 20H60V45L75 75C77 79 74 85 70 85H30C26 85 23 79 25 75L40 45V20Z" />
      <line x1="35" y1="20" x2="65" y2="20" />
      <path d="M35 65H65" strokeDasharray="4 3" />
    </svg>
  ),
  'electrical-safety': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" className="w-24 h-24 text-white/[0.12]">
      <polygon points="55,10 30,50 48,50 42,90 72,45 52,45" />
    </svg>
  ),
  'leadership-sops': (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-24 h-24 text-white/[0.12]">
      <circle cx="50" cy="50" r="35" />
      <circle cx="50" cy="50" r="25" />
      <circle cx="50" cy="50" r="12" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
    </svg>
  ),
};

export default function DomainsSection() {
  const { t } = useLanguage();
  return (
    <section id="domains" className="relative bg-[#0f172a] py-10 sm:py-12 lg:py-16">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-10 lg:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="purple" className="mb-4">{t('domains.badge')}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold max-w-2xl mx-auto"
          >
            <span className="text-cyan-400">{t('domains.title')}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-3 max-w-xl text-base text-slate-400 sm:mt-4 sm:text-lg"
          >
            {t('domains.description')}
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {domainsData.map((domain, i) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl p-6 sm:min-h-[220px] sm:p-8
                transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              style={{ background: domain.gradient }}
            >
              {/* SVG overlay */}
              <div className="absolute bottom-2 right-2 pointer-events-none">
                {svgOverlays[domain.id]}
              </div>

              {/* Icon */}
              <div className="text-5xl mb-4 relative z-10 drop-shadow-lg">
                {domain.icon}
              </div>

              {/* Domain name */}
              <h3 className="text-xl font-bold text-white relative z-10 mb-2">
                {t(`domain.${domain.id}`)}
              </h3>

              {/* Course count pill */}
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm relative z-10">
                {domain.courses} {domain.courses === 1 ? t('domains.course_single') : t('domains.course_plural')}
              </span>

              {/* Hover "Explore" text — slides up */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-white
                translate-y-[60px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                {t('domains.explore')}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
