'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const DASHBOARD_PREFIXES = ['/dashboard', '/admin', '/trainee', '/profile'];
const STANDALONE_PAGES = ['/'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isStandalone = STANDALONE_PAGES.includes(pathname);

  if (isDashboard || isStandalone) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
