'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { GraduationCap, Users, Bot, Clock } from 'lucide-react';

export default function StatsRow() {
  const { t } = useLanguage();
  const stats = [
    { value: '25+', label: t('stats.training_courses'), icon: <GraduationCap className="h-6 w-6 text-cyan-400" /> },
    { value: '1.2k+', label: t('stats.certified_trainees'), icon: <Users className="h-6 w-6 text-blue-400" /> },
    { value: '94%', label: t('stats.avg_ai_quiz_score'), icon: <Bot className="h-6 w-6 text-amber-400" /> },
    { value: 'LIVE', label: t('stats.ai_assistant'), icon: <Clock className="h-6 w-6 text-emerald-400" /> },
  ];
  return (
    <section className="relative border-y border-white/5 bg-[#020817] py-8 sm:py-10 lg:py-12">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8 lg:gap-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, type: 'spring', stiffness: 100 }}
              className="text-center group"
            >
              <div className="mb-4 flex flex-col items-center">
                <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl group-hover:bg-white/[0.05] transition-all group-hover:border-white/10 group-hover:-translate-y-1">
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tighter">
                {stat.value}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
