'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const navLinks = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.domains'), href: '#domains' },
    { label: t('nav.blog'), href: '/blog' },
    { label: t('nav.faq'), href: '#faq' },
  ];

  useEffect(() => {
    const heroEl = document.getElementById('hero');
    if (!heroEl) {
      const handleScroll = () => {
        setScrolled(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When hero is NOT intersecting (out of view), we are "scrolled"
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0.1 } // Trigger when 10% of hero is in view
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg-secondary/80 backdrop-blur-xl border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src="/logo.png" alt="KarmaSetu Logo" width={40} height={40} priority className="h-10 w-10 object-contain drop-shadow-sm transition-transform group-hover:scale-110" />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-wider text-text-primary">
                  KARMASETU
                </span>
                <span className="hidden text-[9px] font-medium tracking-widest text-accent-cyan uppercase sm:block">
                  {t('nav.logo_tagline')}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden flex-1 items-center justify-center gap-12 md:flex px-8">
              {navLinks.map((link) =>
                link.href.startsWith('#') ? (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    className="group relative text-sm font-medium text-text-muted transition-colors hover:text-accent-cyan cursor-pointer"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-cyan opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group relative text-sm font-medium text-text-muted transition-colors hover:text-accent-cyan"
                    prefetch={true}
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-cyan opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                )
              )}
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden items-center gap-8 md:flex ml-auto border-l border-border pl-8">
              <select
                aria-label="Language selection"
                title="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'EN' | 'HINGLISH')}
                className="bg-bg-secondary/50 border border-border rounded-lg px-2 py-1 text-xs text-text-muted focus:outline-none focus:border-accent-cyan cursor-pointer"
              >
                <option value="EN">English</option>
                <option value="HINGLISH">Hinglish</option>
              </select>
              {scrolled && (
                <Button variant="ghost" size="sm" href="/login" prefetch={true}>
                  {t('nav.signin')}
                </Button>
              )}
              <Button variant="solid" size="sm" href="/register" prefetch={true}>
                {t('nav.get_started')}
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-primary transition-colors hover:border-accent-cyan hover:text-accent-cyan md:hidden cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                {mobileOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 left-0 right-0 z-45 border-b border-border bg-bg-secondary/95 backdrop-blur-xl p-6 md:hidden"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) =>
                  link.href.startsWith('#') ? (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.href)}
                      className="text-left text-lg font-medium text-text-muted transition-colors hover:text-accent-cyan cursor-pointer"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-medium text-text-muted transition-colors hover:text-accent-cyan"
                    >
                      {link.label}
                    </Link>
                  )
                )}
                <hr className="border-border/50 my-2" />
                <select
                  aria-label="Language selection"
                  title="Language"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as 'EN' | 'HINGLISH');
                    setMobileOpen(false);
                  }}
                  className="w-full bg-bg-secondary/50 border border-border rounded-lg p-3 text-sm text-text-muted focus:outline-none focus:border-accent-cyan cursor-pointer"
                >
                  <option value="EN">English</option>
                  <option value="HINGLISH">Hinglish</option>
                </select>
                <Button variant="ghost" size="md" href="/login" fullWidth>
                  {t('nav.signin')}
                </Button>
                <Button variant="solid" size="md" href="/register" fullWidth>
                  {t('nav.get_started')}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
