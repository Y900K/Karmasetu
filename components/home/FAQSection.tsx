'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import AccordionItem from '@/components/ui/AccordionItem';
import { faqData } from '@/data/faqData';
import { useLanguage } from '@/context/LanguageContext';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t } = useLanguage();

  return (
    <section id="faq" className="relative py-10 sm:py-12 lg:py-16">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 text-center sm:mb-8 lg:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="amber" className="mb-4">{t('faq.badge')}</Badge>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
          >
            {t('faq.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-3 max-w-2xl text-base text-slate-400 sm:mt-4 sm:text-lg"
          >
            {t('faq.subtitle')}
          </motion.p>
        </div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {faqData.map((faq, i) => (
            <AccordionItem
              key={i}
              question={t(`faq.q${i + 1}`)}
              answer={t(`faq.a${i + 1}`)}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
