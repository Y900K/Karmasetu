'use client';

import React from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import KPICard from '@/components/admin/shared/KPICard';
import { useGlobalStats } from '@/context/GlobalStatsContext';
import DeptComplianceSection from '@/components/admin/overview/DeptComplianceSection';
import RecentActivityFeed from '@/components/admin/overview/RecentActivityFeed';
import CourseCompletionChart from '@/components/admin/overview/CourseCompletionChart';
import TraineeStatusDonut from '@/components/admin/overview/TraineeStatusDonut';
import PerformanceInsights from '@/components/admin/overview/PerformanceInsights';
import AlertsSection from '@/components/admin/overview/AlertsSection';
import FeedbackSnapshot from '@/components/admin/overview/FeedbackSnapshot';
import { Users, CheckCircle2, GraduationCap, Award } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';

function DashboardContent() {
  const { adminStats, isLoading } = useGlobalStats();
  const { t } = useLanguage();

  return (
    <>
      <PageHeader
        title={t('admin.dashboard.title')}
        sub={t('admin.dashboard.subtitle')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label={t('admin.kpi.total_trainees')}
          value={isLoading ? '...' : adminStats?.totalTrainees ?? 0}
          icon={<Users className="h-6 w-6 text-cyan-400" />}
          themeColor="cyan" 
          valueColor="text-cyan-400"
          sub={`${adminStats?.overdueTrainees ?? 0} ${t('admin.kpi.overdue')}`}
          subColor="text-amber-400"
          delay={0}
        />
        <KPICard
          label={t('admin.kpi.compliance')}
          value={isLoading ? '...' : adminStats?.compliance ?? '0%'}
          icon={<CheckCircle2 className="h-6 w-6 text-amber-400" />}
          themeColor="amber"
          valueColor="text-amber-400"
          sub={parseInt(adminStats?.compliance ?? '0') < 80 ? t('admin.kpi.needs_attention') : t('admin.kpi.good_standing')}
          subColor="text-amber-400"
          delay={200}
        />
        <KPICard
          label={t('admin.kpi.active_courses')}
          value={isLoading ? '...' : adminStats?.activeCourses ?? 0}
          icon={<GraduationCap className="h-6 w-6 text-blue-400" />}
          themeColor="blue"
          valueColor="text-blue-400"
          sub={`${adminStats?.totalCourses ?? 0} ${t('admin.kpi.total_courses')}`}
          delay={400}
        />
        <KPICard
          label={t('admin.kpi.valid_certificates')}
          value={isLoading ? '...' : adminStats?.validCertificates ?? 0}        
          icon={<Award className="h-6 w-6 text-emerald-400" />}
          themeColor="emerald"
          valueColor="text-emerald-400"
          sub={t('admin.kpi.verified_registry')}
          subColor="text-emerald-400"
          delay={600}
        />
      </div>

      {/* Top Row: Main Chart & Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both ![animation-delay:400ms]">
        <div className="xl:col-span-2 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative h-full"><CourseCompletionChart /></div>
        </div>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative h-full"><TraineeStatusDonut /></div>
        </div>
      </div>

      {/* Bottom Row: Dept Compliance, Insights, Activity, and Alerts */}       
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both ![animation-delay:600ms]">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <DeptComplianceSection />
          <PerformanceInsights />
        </div>
        <div className="flex flex-col gap-6">
          <FeedbackSnapshot />
          <RecentActivityFeed />
          <AlertsSection />
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <DashboardContent />
  );
}