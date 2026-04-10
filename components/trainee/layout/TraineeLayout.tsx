'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TraineeSidebar from './TraineeSidebar';
import TraineeTopbar from './TraineeTopbar';
import { ToastProvider } from '@/components/admin/shared/Toast';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { TraineeIdentityProvider } from '@/context/TraineeIdentityContext';
import { GlobalStatsProvider } from '@/context/GlobalStatsContext';
import { isLearnerRole } from '@/lib/auth/learnerRoles';

export default function TraineeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mainContentRef = React.useRef<HTMLElement | null>(null);
  const prevPathRef = React.useRef(pathname);
  // Edge Middleware in proxy.ts handles preliminary session existence.
  // We perform a background check to confirm the user has a valid trainee/manager role.
  React.useEffect(() => {
    let mounted = true;
    const verifyTraineeSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          if (mounted) router.replace('/login?role=trainee');
          return;
        }
        const payload = await response.json().catch(() => ({}));
        const role = payload?.user?.role;
        if (!isLearnerRole(role)) {
          if (role === 'admin') {
            if (mounted) router.replace('/admin/dashboard');
          } else {
            if (mounted) router.replace('/login?role=trainee');
          }
        }
      } catch {
        // Network errors don't necessarily mean auth failed, we fail gracefully
      }
    };

    verifyTraineeSession();
    return () => { mounted = false; };
  }, [router]);

  React.useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    // Only scroll to top when switching between top-level sections, not sub-routes
    const prevSection = prevPath.split('/').slice(0, 3).join('/');
    const newSection = pathname.split('/').slice(0, 3).join('/');
    if (prevSection !== newSection && mainContentRef.current) {
      requestAnimationFrame(() => {
        mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }
  }, [pathname]);
  
  return (
    <ToastProvider>
      <TraineeIdentityProvider>
        <GlobalStatsProvider scope="trainee">
          <div className="flex h-screen overflow-hidden bg-[#020817] text-white">
            <TraineeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={isSidebarCollapsed} />
            <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
              <TraineeTopbar 
                onMenuClick={() => setSidebarOpen(true)} 
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              />
              <main ref={mainContentRef} className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-8 sm:pb-32">{children}</main>
            </div>
            <ChatbotWidget />
          </div>
        </GlobalStatsProvider>
      </TraineeIdentityProvider>
    </ToastProvider>
  );
}
