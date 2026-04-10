'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Globe, Menu, Search } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTraineeIdentity } from '@/context/TraineeIdentityContext';

interface TraineeTopbarProps {
  onMenuClick: () => void;
  onToggleCollapse: () => void;
}

export default function TraineeTopbar({ onMenuClick, onToggleCollapse }: TraineeTopbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { identity } = useTraineeIdentity();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/trainee/training?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNotificationClick = () => {
    setHasUnread(false);
    // Navigate or show modal depending on actual notification type
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#020817] border-b border-[#1e293b] flex items-center px-4 sm:px-8 justify-between md:justify-start gap-4">
      <div className="flex items-center gap-4">
        {/* Toggle button on Desktop, Off-canvas on Mobile */}
        <button 
          onClick={onMenuClick} 
          className="md:hidden text-slate-400 hover:text-white cursor-pointer" 
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleCollapse} 
          className="hidden md:block text-slate-400 hover:text-white cursor-pointer" 
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <Link href="/trainee/dashboard" className="flex items-center gap-2 md:hidden">
          <Image src="/logo.png" alt="KarmaSetu Logo" width={32} height={32} className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
          <span className="text-base sm:text-lg font-black tracking-tighter text-white">KARMASETU</span>
        </Link>
      </div>

      <div className="hidden sm:flex flex-1 max-w-md ml-4">
        <label htmlFor="topbar-search" className="sr-only">Search</label>
        <div className="flex items-center bg-[#0f172a] border border-[#1e293b] rounded-full px-4 py-2 text-sm w-full">
          <Search className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
          <input 
            id="topbar-search"
            type="search" 
            placeholder={t('nav.search_placeholder') || 'Search courses, SOPs...'} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="bg-transparent outline-none text-white placeholder-slate-500 w-full" 
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={() => setLanguage(language === 'HINGLISH' ? 'EN' : 'HINGLISH')}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer transition-colors"
          title="Switch language"
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">{language === 'HINGLISH' ? 'Hinglish' : 'English'}</span>
        </button>
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors" 
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#020817]">1</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-10 right-0 w-80 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden animate-[slideIn_0.2s_ease]">
              <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {hasUnread && (
                  <button onClick={() => setHasUnread(false)} className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer">Mark all read</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                <button
                  type="button" 
                  onClick={handleNotificationClick}
                  className={`w-full text-left p-4 border-b border-white/5 cursor-pointer transition-colors ${hasUnread ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-white/5 opacity-70'}`}
                >
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">🎓</div>
                    <div>
                      <div className="text-sm text-white font-medium mb-1">New Course Assigned</div>
                      <div className="text-xs text-slate-400">You have been assigned &quot;Chemical Safety Handbook 2026&quot;.</div>
                      <div className="text-[10px] text-slate-500 mt-1">2 hours ago</div>
                    </div>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowNotifications(false)} className="w-full py-2.5 bg-[#020817] text-xs text-slate-400 hover:text-white cursor-pointer border-t border-[#1e293b]">
                View All Notifications
              </button>
            </div>
          )}
        </div>
        <Link href="/trainee/profile" className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-900 border border-cyan-400/20">
          {identity.initials}
        </Link>
      </div>
    </header>
  );
}
