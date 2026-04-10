'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { X, Bot, LayoutDashboard, Users, GraduationCap, Award, ShieldCheck, MessageSquare, Megaphone, LineChart, UserCircle } from 'lucide-react';
import { useAdminIdentity } from '@/context/AdminIdentityContext';
import { useChatbot } from '@/context/ChatbotContext';
import { useLanguage } from '@/context/LanguageContext';
import { preload } from 'swr';
import { jsonFetcher } from '@/lib/hooks/useAPI';

const prefetchSWRData = (href: string) => {
  if (href === '/admin/users') preload('/api/admin/users', jsonFetcher);
  if (href === '/admin/courses') preload('/api/admin/courses', jsonFetcher);
  if (href === '/admin/certificates') preload('/api/admin/certificates', jsonFetcher);
  if (href === '/admin/reports') preload('/api/admin/reports/enrollment-audit?limit=500', jsonFetcher);
  if (href === '/admin/feedback') preload('/api/admin/feedback', jsonFetcher);
  if (href === '/admin/announcements') preload('/api/admin/announcements', jsonFetcher);
};

const navItems = [
  { labelKey: 'admin.sidebar.group.main', items: [
    { nameKey: 'admin.sidebar.overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { nameKey: 'admin.sidebar.users', href: '/admin/users', icon: Users },
    { nameKey: 'admin.sidebar.courses', href: '/admin/courses', icon: GraduationCap },
    { nameKey: 'admin.sidebar.certificates', href: '/admin/certificates', icon: Award },
    { nameKey: 'admin.sidebar.compliance', href: '/admin/compliance', icon: ShieldCheck },
    { nameKey: 'admin.sidebar.feedback', href: '/admin/feedback', icon: MessageSquare },
    { nameKey: 'admin.sidebar.announcements', href: '/admin/announcements', icon: Megaphone },
    { nameKey: 'admin.sidebar.reports', href: '/admin/reports', icon: LineChart },
    { nameKey: 'admin.sidebar.profile', href: '/admin/profile', icon: UserCircle },
  ]},
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

export default function AdminSidebar({ isOpen, onClose, isCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { admin } = useAdminIdentity();
  const { isBuddyVisible, setIsBuddyVisible } = useChatbot();
  const { t } = useLanguage();

  React.useEffect(() => {
    navItems.forEach((group) => {
      group.items.forEach((item) => {
        router.prefetch(item.href);
      });
    });
  }, [router]);

  const sidebar = (
    <div className={`flex flex-col h-full bg-[#0f172a] border-r border-[#1e293b] transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[80px]' : 'w-[250px]'}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e293b] flex items-center justify-between">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <Image src="/logo.png" alt="KarmaSetu Logo" width={36} height={36} className="h-9 w-9 object-contain shrink-0" />
          <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <div className="font-black text-white text-sm tracking-wide">KARMASETU</div>
            <div className="text-[9px] text-cyan-400 tracking-wider leading-none">AI INTEGRATED INDUSTRIAL<br/>TRAINING PORTAL</div>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white cursor-pointer" aria-label={t('admin.sidebar.close_menu')}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((group) => (
          <div key={group.labelKey}>
            <div className={`px-3 mb-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>{t(group.labelKey)}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  scroll={false}
                  onClick={onClose}
                  onMouseEnter={() => prefetchSWRData(item.href)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm rounded-r-lg mb-0.5 transition-all duration-300 group overflow-hidden ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-l-[3px] border-cyan-500 text-cyan-400 shadow-[inset_20px_0_40px_-20px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-[3px] border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? t(item.nameKey) : ''}
                >
                  <Icon className={`w-[20px] h-[20px] shrink-0 transition-all duration-300 ${active ? 'opacity-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'opacity-60 group-hover:opacity-100 group-hover:text-cyan-400'}`} strokeWidth={active ? 2.5 : 2} />
                  <span className={`whitespace-nowrap font-medium transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>{t(item.nameKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Buddy AI Toggle */}
      <div className={`px-3 pb-3 flex justify-center`}>
        <button
          onClick={() => setIsBuddyVisible(!isBuddyVisible)}
          title={isCollapsed ? t('admin.sidebar.buddy_assistant') : ''}
          className={`flex items-center rounded-xl transition-all duration-200 border ${
            isBuddyVisible
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-900/20'
              : 'bg-[#1e293b] border-[#334155]/30 text-slate-500 hover:text-slate-300'
          } ${isCollapsed ? 'justify-center p-2' : 'justify-between px-4 py-2 w-full'}`}
        >
          <div className="flex items-center gap-2">
            <Bot className={`h-4 w-4 shrink-0 transition-all duration-300 ${isBuddyVisible ? 'scale-110 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]' : ''}`} />
            <span className={`whitespace-nowrap text-xs font-bold transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>{t('admin.sidebar.buddy_assistant')}</span>
          </div>
          <div className={`h-4 w-8 rounded-full p-0.5 shrink-0 transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'} ${isBuddyVisible ? 'bg-cyan-500 shadow-inner' : 'bg-slate-700'}`}>
            <div className={`h-3 w-3 rounded-full bg-white transition-all duration-300 ${isBuddyVisible ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {/* Admin Card */}
      <div className={`border-t border-[#1e293b] p-4 flex ${isCollapsed ? 'justify-center' : ''}`}>
        <Link href="/admin/profile" onClick={onClose} className="w-full">
          <div className={`flex items-center gap-3 group relative cursor-pointer px-2 py-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {/* Status indicator */}
            <div className="absolute bottom-2 left-6 h-2.5 w-2.5 bg-cyan-500 border-2 border-[#0a1628] rounded-full z-10 shadow-[0_0_5px_rgba(6,182,212,0.5)]"></div>
            
            <div className="h-9 w-9 rounded-full bg-cyan-500 flex items-center justify-center text-sm font-bold text-slate-900 shrink-0">{admin.avatar}</div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">{admin.name}</div>
              <div className="text-xs text-slate-400 truncate">{admin.title}</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">{sidebar}</div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}
    </>
  );
}
