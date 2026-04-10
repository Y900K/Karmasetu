'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function LandingMascotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-6 right-2 sm:right-6 lg:right-10 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-2 mr-6 sm:mr-8 max-w-[240px] rounded-2xl rounded-br-sm border border-cyan-500/40 bg-[#020817]/95 p-4 shadow-[0_15px_40px_rgba(6,182,212,0.25)] backdrop-blur-md pointer-events-auto relative isolate"
          >
            <div className="absolute -bottom-[7px] right-4 h-3.5 w-3.5 -z-10 rotate-45 border-b border-r border-cyan-500/40 bg-[#020817]" />

            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-cyan-400">{t('landing.mascot.label')}</span>
            </div>

            <p className="mb-4 text-xs font-medium leading-relaxed text-slate-300">
              {t('landing.mascot.body')}
            </p>

            <Link
              href="/login"
              className="block w-full rounded-lg bg-cyan-500 py-2.5 text-center text-[11px] font-bold tracking-wide text-[#0f172a] transition-colors hover:bg-cyan-400"
            >
              {t('landing.mascot.cta')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative h-36 w-36 cursor-pointer pointer-events-auto focus:outline-none md:h-44 md:w-44"
        aria-label="Toggle Buddy AI greeting"
      >
        <div className="absolute inset-0 drop-shadow-[0_15px_30px_rgba(6,182,212,0.45)] transition-all duration-300 group-hover:drop-shadow-[0_20px_40px_rgba(6,182,212,0.65)]">
          <Image
            src="/yk_mascot.png"
            alt="Buddy AI Mascot"
            fill
            priority
            sizes="(max-width: 768px) 144px, 176px"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </motion.button>
    </div>
  );
}
