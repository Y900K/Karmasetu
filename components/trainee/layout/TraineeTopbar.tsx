'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Globe, Menu, Search } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTraineeIdentity } from '@/context/TraineeIdentityContext';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface TraineeTopbarProps {
  onMenuClick: () => void;
  onToggleCollapse: () => void;
}

export default function TraineeTopbar({ onMenuClick, onToggleCollapse }: TraineeTopbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { identity } = useTraineeIdentity();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/trainee/training?q=${encodeURIComponent(searchQuery.trim())}`);
    }
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
          <Image src="/logo.png" alt="KarmaSetu Logo" width={32} height={32} priority className="h-8 w-8 object-contain" />
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
            placeholder={t('nav.search_placeholder') || (language === 'HINGLISH' ? 'Courses, SOPs, skills search करें...' : 'Search courses, SOPs...')} 
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
        
        <NotificationCenter role="trainee" />

        <Link href="/trainee/profile" className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-900 border border-cyan-400/20">
          {identity.initials}
        </Link>
      </div>
    </header>
  );
}
