'use client';

import React, { useEffect, useRef, useState } from 'react';
import TraineeLayout from '@/components/trainee/layout/TraineeLayout';
import Modal from '@/components/admin/shared/Modal';
import StatusBadge from '@/components/admin/shared/StatusBadge';
import { useToast } from '@/components/admin/shared/Toast';
import { useLanguage } from '@/context/LanguageContext';
import PremiumCertificate from '@/components/shared/PremiumCertificate';
import { downloadPremiumCertificate } from '@/lib/utils/downloadPremiumPdf';

type TraineeCertificate = {
  id: string;
  certNo: string;
  trainee: string;
  course: string;
  icon: string;
  theme: string;
  score: number;
  issueDate: string;
  expiry: string;
  status: 'Valid' | 'Expired' | 'Revoked';
};

function CertificatesContent() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [certificates, setCertificates] = useState<TraineeCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<TraineeCertificate | null>(null);
  const [origin, setOrigin] = useState('https://karmasetu.com');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // ─── Mobile detection ───
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

  // ─── PDF: direct client-side high-res generation skipping system print dialog ───
  const downloadPdfDirect = async (cert: TraineeCertificate) => {
    setIsDownloading(cert.certNo);
    await downloadPremiumCertificate(cert);
    setIsDownloading(null);
  };

  // ─── Share: native OS share sheet first, dropdown fallback ───
  const handleShare = async (cert: TraineeCertificate) => {
    const verifyUrl = `${origin}/verify/${cert.certNo}`;
    const shareText = `🎓 I completed "${cert.course}" on KarmaSetu! Verify my certificate: ${verifyUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Certificate – ${cert.course}`, text: shareText, url: verifyUrl });
        return; // native sheet handled it
      } catch {
        // user dismissed — do nothing
        return;
      }
    }
    // Fallback: open the custom dropdown
    setShareOpen(shareOpen === cert.certNo ? null : cert.certNo);
  };

  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCertificates = async () => {
      try {
        setIsLoading(true);
        setLoadError('');
        const response = await fetch('/api/trainee/certificates');
        const data = await response.json().catch(() => ({}));

        if (!isMounted) {
          return;
        }

        if (response.ok && data.ok && Array.isArray(data.certificates)) {
          setCertificates(data.certificates as TraineeCertificate[]);
        } else {
          throw new Error(data.message || 'Failed to load certificates.');
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Failed to load certificates.';
          setLoadError(message);
          setCertificates([]);
          showToast(message, 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCertificates();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const earnedCerts = certificates.filter((cert) => {
    const matchesSearch = cert.course.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cert.certNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (certificates.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetCertNo = params.get('certNo');
      if (targetCertNo) {
        const found = certificates.find(c => c.certNo === targetCertNo);
        if (found) {
          setSelectedCert(found);
          // Clear query param to avoid re-opening on manual refresh after closing
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [certificates]);

  return (
    <>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('certs.page_title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('certs.page_subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder={t('certs.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-[#334155] text-white rounded-xl px-4 py-2 text-sm focus:border-cyan-500/50 outline-none pr-10"
            />
            <span className="absolute right-3 top-2.5 text-slate-500">🔍</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('certs.filter_status')}
            title={t('certs.filter_status')}
            className="bg-[#1e293b] border border-[#334155] text-white rounded-xl px-4 py-2 text-sm focus:border-cyan-500/50 outline-none min-w-[140px]"
          >
            <option value="All Status">{t('certs.filter_all')}</option>
            <option value="Valid">{t('certs.filter_valid')}</option>
            <option value="Expired">{t('certs.filter_expired')}</option>
            <option value="Revoked">{t('certs.filter_revoked')}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f172a] border border-[#334155] rounded-3xl p-16 text-center shadow-inner">
          <p className="text-sm text-slate-400">{t('certs.loading')}</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-[#0f172a] border border-dashed border-[#334155] rounded-3xl p-16 text-center shadow-inner">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-5xl grayscale opacity-30">🎓</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{t('certs.empty_title')}</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 leading-relaxed">
            {loadError || t('certs.empty_desc')}
          </p>
          <a href="/trainee/training" className="px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-2xl cursor-pointer transition-all shadow-xl shadow-cyan-500/10">{t('certs.browse')}</a>
        </div>
      ) : earnedCerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {earnedCerts.map((cert) => (
            <div key={cert.id} className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all group shadow-xl">
              <div className={`h-2 shadow-inner bg-gradient-to-r ${cert.theme}`} />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${cert.theme} flex items-center justify-center text-3xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                    {cert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{cert.course}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">{cert.certNo}</div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={cert.status} />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${cert.status === 'Revoked' ? 'text-red-400 bg-red-500/10 border-red-500/20' : cert.status === 'Expired' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>SCORE: {cert.score}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Issued: {cert.issueDate}</span>
                  <span>Expires: {cert.expiry}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap lg:flex-nowrap items-center gap-2">
                  {/* View */}
                  <button onClick={() => setSelectedCert(cert)} className="flex-[2] py-3 lg:py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs md:text-sm rounded-xl lg:rounded-lg cursor-pointer transition-all shadow-lg active:scale-95">
                    👁 {t('certs.action_view')}
                  </button>
                  {/* PDF */}
                  <button
                    onClick={() => downloadPdfDirect(cert)}
                    disabled={isDownloading === cert.certNo}
                    className="flex-[2] py-3 lg:py-2.5 border border-slate-700 disabled:opacity-50 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl lg:rounded-lg text-xs md:text-sm cursor-pointer transition-colors shadow-sm active:scale-95 font-bold"
                    title={t('certs.action_pdf')}
                  >
                    {isDownloading === cert.certNo ? '⏳ GENERATING...' : `⬇ ${t('certs.action_pdf')}`}
                  </button>
                  {/* Share icon with dropdown */}
                  <div ref={shareOpen === cert.certNo ? shareRef : undefined} className="relative flex-1 lg:flex-none flex justify-end lg:border-l lg:border-slate-800 lg:pl-2">
                    <button
                      onClick={() => handleShare(cert)}
                      className="h-11 w-full lg:h-[38px] lg:w-[38px] flex items-center justify-center border border-slate-700 lg:border-transparent bg-[#1e293b] lg:bg-transparent text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 rounded-xl lg:rounded-lg text-base cursor-pointer transition-colors shadow-sm lg:shadow-none"
                      title={t('certs.action_share')}
                    >
                      🔗 {isMobile() ? t('certs.action_share') : ''}
                    </button>
                    {shareOpen === cert.certNo && (
                      <div className="absolute bottom-full right-0 mb-2 w-44 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">{t('certs.action_share')}</div>
                        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${origin}/verify/${cert.certNo}`)}`} target="_blank"
                          className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:bg-[#1e293b] hover:text-[#0a66c2] transition-colors">
                          <span className="text-base">🔵</span> {t('certs.share_linkedin')}
                        </a>
                        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🎓 I completed the ${cert.course} training on KarmaSetu! Verify my certificate: ${origin}/verify/${cert.certNo}`)}`} target="_blank"
                          className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:bg-[#1e293b] hover:text-[#25D366] transition-colors">
                          <span className="text-base">📱</span> {t('certs.share_whatsapp')}
                        </a>
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎓 Completed ${cert.course} on KarmaSetu! Verify: ${origin}/verify/${cert.certNo}`)}`} target="_blank"
                          className="flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:bg-[#1e293b] hover:text-white transition-colors">
                          <span className="text-base">🐦</span> {t('certs.share_x')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Upsell for in-progress courses */}
          <div className="bg-[#0f172a]/40 border border-dashed border-[#1e293b] rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-60">
            <div className="text-3xl mb-2 opacity-50">🔒</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('certs.next_unlock')}</div>
            <div className="text-sm text-slate-400 mt-1 italic">&quot;{t('certs.next_unlock_desc')}&quot;</div>
            <a href="/trainee/training" className="mt-4 text-[11px] text-cyan-500 hover:underline font-bold">{t('certs.browse')} →</a>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-dashed border-[#334155] rounded-3xl p-16 text-center shadow-inner">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-5xl grayscale opacity-30">🎓</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Certifications Yet</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 leading-relaxed">
            {loadError || 'You have not completed any training assessments yet. Complete a course to earn your first industrial safety certificate.'}
          </p>
          <a href="/trainee/training" className="px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-2xl cursor-pointer transition-all shadow-xl shadow-cyan-500/10">Browse Courses</a>
        </div>
      )}

      {/* Preview Modal */}
      {selectedCert && (
        <Modal isOpen={true} onClose={() => setSelectedCert(null)} title="OFFICIAL CERTIFICATION RECORD" maxWidth="max-w-4xl">
          <div className="scale-[0.8] sm:scale-100 origin-center -my-10 sm:my-0">
            <PremiumCertificate cert={selectedCert} />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
            <button onClick={() => setSelectedCert(null)} className="px-6 py-3 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">Close Record</button>
            <button
              onClick={() => selectedCert && downloadPdfDirect(selectedCert)}
              disabled={isDownloading === selectedCert?.certNo}
              className="px-10 py-3 bg-[#0d1b2a] hover:bg-[#1a2d42] disabled:opacity-75 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer"
            >
              <span className="text-lg">{isDownloading === selectedCert?.certNo ? '⏳' : '⬇'}</span> 
              {isDownloading === selectedCert?.certNo ? 'GENERATING...' : 'DOWNLOAD HIGH-RES PDF'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function TraineeCertificatesPage() {
  return <TraineeLayout><CertificatesContent /></TraineeLayout>;
}
