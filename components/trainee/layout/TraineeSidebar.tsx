'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  BookOpen,
  Brain,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Trophy,
  User,
  X,
  Bot,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTraineeIdentity } from '@/context/TraineeIdentityContext';
import { useChatbot } from '@/context/ChatbotContext';
import { preload } from 'swr';
import { jsonFetcher } from '@/lib/hooks/useAPI';

const prefetchSWRData = (href: string) => {
  if (href === '/trainee/dashboard' || href === '/trainee/training') preload('/api/trainee/training/overview', jsonFetcher);
  if (href === '/trainee/certificates') preload('/api/trainee/certificates', jsonFetcher);
  if (href === '/trainee/leaderboard') preload('/api/trainee/leaderboard', jsonFetcher);
  if (href === '/trainee/feedback') preload('/api/trainee/feedback', jsonFetcher);
  if (href === '/trainee/profile') preload('/api/trainee/profile', jsonFetcher);
};

const navSections = [
  {
    label: 'Learn',
    items: [
      { key: 'nav.dashboard', href: '/trainee/dashboard', icon: LayoutDashboard },
      { key: 'nav.training', href: '/trainee/training', icon: GraduationCap },
      { key: 'nav.practice_quiz', href: '/trainee/practice-quiz', icon: Brain },
    ],
  },
  {
    label: 'Compete',
    items: [
      { key: 'nav.certificates', href: '/trainee/certificates', icon: BadgeCheck },
      { key: 'nav.leaderboard', href: '/trainee/leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'Account',
    items: [
      { key: 'nav.feedback', href: '/trainee/feedback', icon: MessageSquare },
      { key: 'nav.profile', href: '/trainee/profile', icon: User },
    ],
  },
];

interface TraineeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

export default function TraineeSidebar({ isOpen, onClose, isCollapsed }: TraineeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { identity } = useTraineeIdentity();
  const { isBuddyVisible, setIsBuddyVisible } = useChatbot();

  const isActive = (href: string) =>
    pathname === href ||
    (href === '/trainee/training' && (pathname.startsWith('/trainee/training') || pathname.startsWith('/trainee/course/'))) ||
    (href !== '/trainee/dashboard' && href !== '/trainee/training' && pathname.startsWith(href));

  React.useEffect(() => {
    navSections.forEach((section) => {
      section.items.forEach((item) => {
        router.prefetch(item.href);
      });
    });
  }, [router]);

  const sidebar = (
    <div className={`flex h-full flex-col bg-gradient-to-b from-[#0a1628] via-[#0d1b2a] to-[#0a1120] border-r border-white/5 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}>
      
      {/* Branding Header */}
      <div className={`px-5 py-4 border-b border-white/5 flex items-center justify-between transition-all duration-300`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative h-9 w-9 rounded-xl overflow-hidden ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-900/40 shrink-0">
            <Image src="/logo.png" alt="KarmaSetu Logo" width={36} height={36} className="h-full w-full object-contain" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <div className="text-sm font-black tracking-widest text-white leading-none">
              KARMASETU
            </div>
            <div className="text-[8.5px] tracking-wider text-cyan-400/70 mt-0.5 leading-tight">
              INDUSTRIAL TRAINING ✦ AI
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className={`px-4 mb-2 text-[10px] text-cyan-500/70 uppercase tracking-widest font-black overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    scroll={false}
                    onClick={onClose}
                    onMouseEnter={() => prefetchSWRData(item.href)}
                    className={`flex items-center gap-3.5 px-4 py-3 text-sm font-medium rounded-r-2xl mb-1 transition-all overflow-hidden relative group/nav ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-4 border-cyan-400 text-cyan-300'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border-l-4 border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? t(item.key) : ''}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-transform ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'group-hover/nav:scale-110 group-hover/nav:text-cyan-400'}`} />
                  <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>{t(item.key)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      {/* Buddy AI Toggle */}
      <div className={`px-4 pt-4 pb-6 flex justify-center`}>
        <button
          onClick={() => setIsBuddyVisible(!isBuddyVisible)}
          title={isCollapsed ? t('admin.sidebar.buddy_assistant') : ''}
          className={`group flex items-center rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 border relative overflow-hidden ${
            isBuddyVisible
              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
              : 'bg-[#1e293b]/50 border-white/10 text-slate-400 hover:text-white hover:bg-[#1e293b] hover:border-white/20'
          } ${isCollapsed ? 'justify-center p-3' : 'justify-between w-full'}`}
        >
          {/* Dynamic Background Glow */}
          {isBuddyVisible && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-transparent opacity-50 pointer-events-none" />
          )}
          
          <div className="flex items-center gap-3 relative z-10">
            <Bot className={`h-5 w-5 shrink-0 transition-transform duration-500 ${isBuddyVisible ? 'scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'group-hover:scale-110 group-hover:text-cyan-400'}`} />
            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              {t('admin.sidebar.buddy_assistant')}
            </span>
          </div>
          
          <div className={`h-5 w-10 shrink-0 rounded-full p-1 transition-all duration-300 relative z-10 ${isCollapsed ? 'hidden' : 'block'} ${isBuddyVisible ? 'bg-cyan-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' : 'bg-slate-700/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'}`}>
            <div className={`h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-300 ${isBuddyVisible ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      <div className={`p-4 flex ${isCollapsed ? 'justify-center' : ''}`}>
        <Link href="/trainee/profile" onClick={onClose} className="w-full">
          <div className={`flex items-center gap-3 group relative cursor-pointer px-2 py-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {/* Status indicator */}
            <div className="absolute bottom-2 left-6 h-2.5 w-2.5 bg-emerald-500 border-2 border-[#0a1628] rounded-full z-10 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
            
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center text-sm font-bold text-white shrink-0 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all">
              {identity.initials}
            </div>
            
            <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                {identity.name?.split(' ')[0] || 'Trainee'} {identity.name?.split(' ')[1] || ''}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">TRAINEE</span>
                <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><BookOpen className="h-3 w-3" />Active</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen md:flex">{sidebar}</div>

      {/* Mobile overlay with animation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
            onClick={onClose}
          />
          <div className="relative h-full animate-[slideInLeft_0.2s_ease]">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
