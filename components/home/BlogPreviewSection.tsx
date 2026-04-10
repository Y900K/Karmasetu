'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import BlogCard from '@/components/blog/BlogCard';
import { blogPosts } from '@/data/blogPosts';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export default function BlogPreviewSection() {
  const latestPosts = blogPosts.slice(0, 3);
  const { t } = useLanguage();

  return (
    <section className="relative bg-bg-secondary/50 py-10 sm:py-12 lg:py-16">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center lg:mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
                <Badge variant="blue" className="mb-4">{t('blog.badge')}</Badge>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl font-bold"
            >
              {t('blog.title_prefix')} <span className="text-accent-blue">{t('blog.title_highlight')}</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="outline" size="sm" href="/blog">
              {t('blog.view_all')}
            </Button>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {latestPosts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <BlogCard post={post} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
