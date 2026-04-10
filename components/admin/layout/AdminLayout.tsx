'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { ToastProvider } from '@/components/admin/shared/Toast';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

import { AdminIdentityProvider } from '@/context/AdminIdentityContext';
import { GlobalStatsProvider } from '@/context/GlobalStatsContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mainContentRef = React.useRef<HTMLElement | null>(null);
  // Global keyboard shortcut for sidebar toggle
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // The Edge Middleware ensures we have a session cookie before this component even mounts.
  // We run a background check to confirm the user is specifically an 'admin' and not a 'trainee',
  // and redirect if they spoofed their way here.
  React.useEffect(() => {
    let mounted = true;
    const verifyAdminSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          if (mounted) router.replace('/login');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        if (payload?.user?.role !== 'admin') {
          if (mounted) router.replace('/login');
        }
      } catch {
        // Network errors don't necessarily mean auth failed, we fail gracefully
      }
    };

    verifyAdminSession();
    return () => { mounted = false; };
  }, [router]);

  const prevPathRef = React.useRef(pathname);

  React.useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    const prevSection = prevPath.split('/').slice(0, 3).join('/');
    const newSection = pathname.split('/').slice(0, 3).join('/');
    if (prevSection !== newSection && mainContentRef.current) {
      requestAnimationFrame(() => {
        mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  }, [pathname]);
  
  return (
    <AdminIdentityProvider>
      <ToastProvider>
        <GlobalStatsProvider scope="admin">
          <div className="flex h-screen overflow-hidden bg-[#020817] text-white">
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={isSidebarCollapsed} />
            <div className="relative flex min-w-0 flex-1 flex-col transition-all duration-300">
              <AdminTopbar onMenuClick={() => setSidebarOpen(true)} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isCollapsed={isSidebarCollapsed} />
              <main ref={mainContentRef} className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-8 sm:pb-32">{children}</main>
              <ChatbotWidget />
            </div>
          </div>
        </GlobalStatsProvider>
      </ToastProvider>
    </AdminIdentityProvider>
  );
}
