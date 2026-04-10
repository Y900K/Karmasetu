'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export default function CTASection() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden py-10 sm:py-12 lg:py-16">
      {/* Background accents */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-accent-cyan/[0.03] to-bg-primary" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-accent-cyan/[0.05] blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-secondary p-6 sm:p-10 lg:p-14">
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent-cyan/10 to-transparent rounded-bl-full" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent-purple/10 to-transparent rounded-tr-full" />

            <div className="relative z-10">
              <span className="text-4xl mb-4 block">🛡️</span>
              <h2 className="mb-4 text-2xl font-bold sm:text-4xl lg:text-5xl">
                {t('cta.title_prefix')}{' '}
                <span className="text-accent-cyan">{t('cta.title_highlight')}</span>
              </h2>
              <p className="mx-auto mb-7 max-w-2xl text-base leading-relaxed text-text-muted sm:mb-8 sm:text-lg">
                {t('cta.description')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="solid" size="lg" href="/login" prefetch={true}>
                  {t('cta.primary')}
                </Button>
                <Button variant="ghost" size="lg" href="#features">
                  {t('cta.secondary')}
                </Button>
              </div>
              <p className="mt-6 text-sm text-text-muted">
                {t('cta.trust')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
