'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Search, Bell, AlertTriangle, Globe, PanelLeft } from 'lucide-react';
import { useAdminIdentity } from '@/context/AdminIdentityContext';
import { useLanguage } from '@/context/LanguageContext';

interface AdminTopbarProps { 
  onMenuClick: () => void; 
  onToggleCollapse: () => void;
  isCollapsed?: boolean;
}

export default function AdminTopbar({ onMenuClick, onToggleCollapse, isCollapsed }: AdminTopbarProps) {
  const { admin } = useAdminIdentity();
  const { language, setLanguage, t } = useLanguage();
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
            <Image src="/logo.png" alt="KarmaSetu Logo" width={32} height={32} className="h-8 w-8 object-contain transition-transform group-hover:scale-110" />
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
            placeholder={t('admin.topbar.search_placeholder')} 
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
        <div className="relative" ref={notifRef}>
          <button 
            title={t('admin.topbar.open_notifications')}
            aria-label={t('admin.topbar.open_notifications')}
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer relative flex items-center justify-center"
          >
            <Bell className="h-[22px] w-[22px]" strokeWidth={2} />
            {hasUnread && (
              <span className="absolute top-1 right-1 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-[#020817]">1</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-10 right-0 w-80 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden animate-[slideIn_0.2s_ease]">
              <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{t('admin.topbar.notifications')}</span>
                {hasUnread && (
                  <button title={t('admin.topbar.mark_all_read')} aria-label={t('admin.topbar.mark_all_read')} onClick={() => setHasUnread(false)} className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer">{t('admin.topbar.mark_all_read')}</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-500" /></div>
                    <div>
                      <div className="text-sm text-white font-medium mb-1">{t('admin.topbar.compliance_alert_title')}</div>
                      <div className="text-xs text-slate-400">{t('admin.topbar.compliance_alert_body')}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{t('admin.topbar.one_hour_ago')}</div>
                    </div>
                  </div>
                </div>
              </div>
              <button title={t('admin.topbar.close_notifications_panel')} aria-label={t('admin.topbar.close_notifications_panel')} onClick={() => setShowNotifications(false)} className="w-full py-2.5 bg-[#020817] text-xs text-slate-400 hover:text-white cursor-pointer border-t border-[#1e293b]">
                {t('admin.topbar.view_all_alerts')}
              </button>
            </div>
          )}
        </div>
        <Link href="/admin/profile" className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-slate-900 ring-2 ring-cyan-500/30 hover:ring-cyan-400 transition-all shadow-md shadow-cyan-900/40">
          {admin.avatar}
        </Link>
      </div>
    </header>
  );
}
