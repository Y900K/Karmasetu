'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search, Globe, PanelLeft } from 'lucide-react';
import { useAdminIdentity } from '@/context/AdminIdentityContext';
import { useLanguage } from '@/context/LanguageContext';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface AdminTopbarProps { 
  onMenuClick: () => void; 
  onToggleCollapse: () => void;
  isCollapsed?: boolean;
}

export default function AdminTopbar({ onMenuClick, onToggleCollapse, isCollapsed }: AdminTopbarProps) {
  const { admin } = useAdminIdentity();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#020817]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 sm:px-8 justify-between md:justify-start gap-4">
      {/* Brand logo & Hamburger */}
      <div className="flex items-center gap-4">
        {/* Toggle button on Desktop, Off-canvas on Mobile */}
        <button 
          onClick={onMenuClick} 
          className="md:hidden text-slate-400 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-all" 
          aria-label={t('admin.topbar.open_menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button 
          onClick={onToggleCollapse} 
          className="hidden md:block text-slate-400 hover:text-cyan-400 cursor-pointer p-1.5 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20 active:scale-95" 
          aria-label={t('admin.topbar.toggle_sidebar')}
          title={isCollapsed ? t('admin.topbar.expand_sidebar_shortcut') : t('admin.topbar.collapse_sidebar_shortcut')}
        >
          <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
        
        <Link href="/admin/dashboard" className="flex items-center gap-2 group md:hidden">
          <div className="relative">
            <Image src="/logo.png" alt="KarmaSetu Logo" width={32} height={32} priority className="h-8 w-8 object-contain transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="text-base sm:text-lg font-black tracking-tighter text-white group-hover:text-cyan-400 transition-colors">KARMASETU</span>
        </Link>
      </div>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-md ml-8">
        <div className="flex items-center w-full bg-[#0f172a]/80 border border-white/10 focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all rounded-xl px-4 py-2 text-sm shadow-inner group/search">
          <Search className="h-4 w-4 text-slate-500 mr-3 flex-shrink-0 group-focus-within/search:text-cyan-400 transition-colors" />
          <input 
            type="text" 
            placeholder={t('admin.topbar.search_placeholder') || 'Search telemetry, trainees, compliance records...'} 
            className="bg-transparent outline-none text-white placeholder-slate-600 w-full font-medium" 
          />
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-3 ml-auto">
        <button
          onClick={() => setLanguage(language === 'EN' ? 'HINGLISH' : 'EN')}
          title={language === 'EN' ? t('admin.topbar.switch_to_hinglish') : t('admin.topbar.switch_to_english')}
          aria-label={language === 'EN' ? t('admin.topbar.switch_to_hinglish') : t('admin.topbar.switch_to_english')}
          className="text-slate-400 hover:text-white transition-colors flex flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 cursor-pointer"
        >
          <Globe className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wider">{language === 'EN' ? 'EN' : 'हि'}</span>
        </button>
        
        <NotificationCenter role="admin" />

        <Link href="/admin/profile" className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-900 ring-2 ring-cyan-500/30 hover:ring-cyan-400 transition-all shadow-md shadow-cyan-900/40">
          {admin.avatar}
        </Link>
      </div>
    </header>
  );
}
