'use client';

import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/admin/shared/PageHeader';
import KPICard from '@/components/admin/shared/KPICard';
import StatusBadge from '@/components/admin/shared/StatusBadge';
import Modal from '@/components/admin/shared/Modal';
import { useToast } from '@/components/admin/shared/Toast';
import PremiumCertificate from '@/components/shared/PremiumCertificate';
import { downloadPremiumCertificate } from '@/lib/utils/downloadPremiumPdf';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

import { useAPI } from '@/lib/hooks/useAPI';
import TableSkeleton from '@/components/admin/shared/TableSkeleton';
import { useLanguage } from '@/context/LanguageContext';

type CertificateRow = {
  certNo: string;
  trainee: string;
  course: string;
  issueDate: string;
  expiry: string;
  score: number;
  status: 'Valid' | 'Expired' | 'Revoked';
};

type CertSortKey = 'certNo' | 'trainee' | 'course' | 'issueDate' | 'expiry' | 'score' | 'status';
type CertSortDirection = 'asc' | 'desc';

function parseLooseDate(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function CertificatesPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { data: certData, error: certError, isLoading, mutate } = useAPI<{ certificates: CertificateRow[] }>('/api/admin/certificates');
  const certificates = useMemo(() => certData?.certificates || [], [certData]);
  const [activeFilter, setActiveFilter] = useState('');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [scoreBand, setScoreBand] = useState('');
  const [sortKey, setSortKey] = useState<CertSortKey>('issueDate');
  const [sortDirection, setSortDirection] = useState<CertSortDirection>('desc');
  const [previewCert, setPreviewCert] = useState<CertificateRow | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const downloadPdfDirect = async (cert: CertificateRow) => {
    setIsDownloading(cert.certNo);
    await downloadPremiumCertificate(cert);
    setIsDownloading(null);
  };

  const filterTabs = useMemo(
    () => [
      { label: t('admin.certificates.filter.all'), filter: '', count: certificates.length },
      { label: t('admin.certificates.filter.valid'), filter: 'Valid', count: certificates.filter((c) => c.status === 'Valid').length },
      { label: t('admin.certificates.filter.expired'), filter: 'Expired', count: certificates.filter((c) => c.status === 'Expired').length },
      { label: t('admin.certificates.filter.revoked'), filter: 'Revoked', count: certificates.filter((c) => c.status === 'Revoked').length },
    ],
    [certificates, t]
  );

  const courseOptions = useMemo(
    () => Array.from(new Set(certificates.map((cert) => cert.course))).sort((a, b) => a.localeCompare(b)),
    [certificates]
  );

  const filtered = useMemo(() => {
    let list = certificates;

    if (activeFilter) {
      list = list.filter((c) => c.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        c.certNo.toLowerCase().includes(q) ||
        c.trainee.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q)
      );
    }

    if (courseFilter) {
      list = list.filter((c) => c.course === courseFilter);
    }

    if (scoreBand) {
      list = list.filter((c) => {
        if (scoreBand === 'high') return c.score >= 80;
        if (scoreBand === 'medium') return c.score >= 60 && c.score < 80;
        if (scoreBand === 'low') return c.score < 60;
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const order = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'score') {
        return (a.score - b.score) * order;
      }

      if (sortKey === 'issueDate') {
        return (parseLooseDate(a.issueDate) - parseLooseDate(b.issueDate)) * order;
      }

      if (sortKey === 'expiry') {
        return (parseLooseDate(a.expiry) - parseLooseDate(b.expiry)) * order;
      }

      return a[sortKey].localeCompare(b[sortKey]) * order;
    });
  }, [certificates, activeFilter, search, courseFilter, scoreBand, sortKey, sortDirection]);

  const hasAdvancedControls = search || courseFilter || scoreBand || sortKey !== 'issueDate' || sortDirection !== 'desc';

  const revokeCertificate = async (certNo: string) => {
    try {
      const response = await fetch(`/api/admin/certificates/${encodeURIComponent(certNo)}/revoke`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to revoke certificate');
      }

      // Optimistic update
      if (certData) {
        mutate({
          certificates: certificates.map((cert) => 
            cert.certNo === certNo ? { ...cert, status: 'Revoked' as const } : cert
          )
        }, false);
      }
      
      showToast('Certificate revoked', 'error');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to revoke certificate', 'error');
    }
  };

  return (
    <>
      <PageHeader title={t('admin.certificates.title')} sub={`${filterTabs[1].count} ${t('admin.certificates.issued_suffix')}`}
          action={<button onClick={() => showToast(t('admin.certificates.exporting'))} className="px-4 py-2.5 border border-[#334155] text-slate-400 hover:text-white rounded-xl text-sm cursor-pointer transition-colors">⬇ {t('admin.certificates.export_csv')}</button>} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard label={t('admin.certificates.kpi.valid')} value={filterTabs[1].count} icon="🏅" themeColor="emerald" valueColor="text-emerald-400" />
        <KPICard label={t('admin.certificates.kpi.expired')} value={filterTabs[2].count} icon="⏰" themeColor="amber" valueColor="text-amber-400" />
        <KPICard label={t('admin.certificates.kpi.revoked')} value={filterTabs[3].count} icon="🚫" themeColor="red" valueColor="text-red-400" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map((tab) => (
          <button key={tab.label} onClick={() => setActiveFilter(tab.filter)}
            className={`px-4 py-2 text-sm rounded-full border cursor-pointer transition-colors ${activeFilter === tab.filter ? 'bg-cyan-500 text-slate-900 border-cyan-500 font-semibold' : 'border-[#334155] text-slate-400 hover:text-white'}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-[#334155] bg-[#0f172a]/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            {t('admin.certificates.filters_sorting')}
          </div>
          {hasAdvancedControls && (
            <button
              onClick={() => {
                setSearch('');
                setCourseFilter('');
                setScoreBand('');
                setSortKey('issueDate');
                setSortDirection('desc');
              }}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              {t('admin.certificates.reset')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.certificates.search_placeholder')}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            title="Filter by course"
            aria-label="Filter by course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Courses</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <select
            title="Filter by score"
            aria-label="Filter by score"
            value={scoreBand}
            onChange={(e) => setScoreBand(e.target.value)}
            className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Scores</option>
            <option value="high">High (80+)</option>
            <option value="medium">Medium (60-79)</option>
            <option value="low">Low (&lt;60)</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              title="Sort certificates by"
              aria-label="Sort certificates by"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as CertSortKey)}
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              <option value="issueDate">Issue Date</option>
              <option value="expiry">Expiry Date</option>
              <option value="score">Score</option>
              <option value="trainee">Trainee</option>
              <option value="course">Course</option>
              <option value="status">Status</option>
              <option value="certNo">Cert #</option>
            </select>

            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title="Toggle sort direction"
              aria-label="Toggle sort direction"
              className="w-full bg-[#020817] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpDown className="h-4 w-4 text-cyan-400" />
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-white/5">
              {['Cert #','Trainee','Course','Issue Date','Expiry','Score','Status','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={8} cols={8} />
              ) : certError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-500 text-sm">Failed to load certificates.</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">No certificates found.</td>
                </tr>
              ) : null}
              {!isLoading && !certError && filtered.map((cert) => {
                const scoreColor = cert.score >= 80 ? 'text-emerald-400' : cert.score >= 60 ? 'text-amber-400' : 'text-red-400';
                return (
                  <tr key={cert.certNo} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-xs font-mono text-cyan-400">{cert.certNo}</td>
                    <td className="px-4 py-4 text-sm text-white">{cert.trainee}</td>
                    <td className="px-4 py-4 text-sm text-white">{cert.course}</td>
                    <td className="px-4 py-4 text-xs text-slate-400">{cert.issueDate}</td>
                    <td className="px-4 py-4 text-xs text-slate-400">{cert.expiry}</td>
                    <td className={`px-4 py-4 text-sm font-semibold ${scoreColor}`}>{cert.score}%</td>
                    <td className="px-4 py-4"><StatusBadge status={cert.status} /></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewCert(cert)} className="h-7 w-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 text-xs cursor-pointer">👁</button>
                        <button onClick={() => downloadPdfDirect(cert)} disabled={isDownloading === cert.certNo} className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-50 text-cyan-400 hover:bg-cyan-500/10 text-xs cursor-pointer">
                          {isDownloading === cert.certNo ? '⏳' : '⬇'}
                        </button>
                        <button onClick={() => revokeCertificate(cert.certNo)} className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 text-xs cursor-pointer">🚫</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {previewCert && <CertificatePreviewModal cert={previewCert} onClose={() => setPreviewCert(null)} isDownloading={isDownloading} downloadPdfDirect={downloadPdfDirect} />}
    </>
  );
}
function CertificatePreviewModal({ cert, onClose, isDownloading, downloadPdfDirect }: { cert: CertificateRow; onClose: () => void; isDownloading: string | null; downloadPdfDirect: (c: CertificateRow) => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="CERTIFICATE PREVIEW" maxWidth="max-w-4xl">
      <div className="scale-[0.8] sm:scale-100 origin-center -my-10 sm:my-0">
        <PremiumCertificate cert={cert} />
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onClose} className="px-6 py-2.5 border border-[#334155] text-slate-400 rounded-xl text-sm cursor-pointer hover:text-white">Close</button>
        <button onClick={() => downloadPdfDirect(cert)} disabled={isDownloading === cert.certNo} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer">
           {isDownloading === cert.certNo ? '⏳ GENERATING...' : '⬇ Download PDF'}
        </button>
      </div>
    </Modal>
  );
}
