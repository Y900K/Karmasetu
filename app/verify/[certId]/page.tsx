'use client';

import React, { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, GraduationCap, Award } from 'lucide-react';

type VerifiedCertificate = {
  certNo: string;
  trainee: string;
  course: string;
  score: number;
  status: string;
  issueDate: string;
  expiry?: string;
};

export default function VerificationPage({ params }: { params: Promise<{ certId: string }> }) {
  const resolvedParams = use(params);
  const certId = resolvedParams.certId;

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCertificate = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/certificates/verify/${encodeURIComponent(certId)}`, {
          method: 'GET',
        });

        const data = await response.json().catch(() => ({}));
        if (!isMounted) {
          return;
        }

        if (response.ok && data.ok && data.certificate) {
          setCert(data.certificate);
          setIsValid(Boolean(data.valid));
        } else {
          setCert(null);
          setIsValid(false);
        }
      } catch {
        if (isMounted) {
          setCert(null);
          setIsValid(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCertificate();

    return () => {
      isMounted = false;
    };
  }, [certId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Verifying Certificate</h2>
          <p className="text-slate-500 mt-2 text-sm">Please wait while we validate the record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mb-4 shadow-lg shadow-slate-200 border border-slate-100 overflow-hidden">
            <Image src="/logo.png" alt="KarmaSetu Logo" width={64} height={64} className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Certificate Verification</h1>
          <p className="text-slate-500 mt-2 font-medium italic">AI Integrated Industrial Training Record</p>
        </div>

        {isValid && cert ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden transform transition-all hover:scale-[1.01]">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle2 size={20} />
              Official Verified Record
            </div>
            
            <div className="p-8 md:p-12 text-center">
              <div className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Recipient</div>
              <div className="text-3xl font-black text-slate-900 mb-8">{cert.trainee}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                      <GraduationCap size={14} /> Course Name
                    </div>
                    <div className="text-lg font-bold text-slate-800">{cert.course}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                      <Award size={14} /> Assessment Result
                    </div>
                    <div className="text-lg font-bold text-emerald-600">{cert.score}% (Passed)</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Certificate Number</div>
                    <div className="text-lg font-mono font-bold text-cyan-600">{cert.certNo}</div>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Issue Date</div>
                      <div className="text-lg font-bold text-slate-800">{cert.issueDate}</div>
                    </div>
                    {cert.expiry && cert.expiry !== 'NA' && (
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Valid Until</div>
                        <div className="text-lg font-bold text-slate-800">{cert.expiry}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center">
                <div className="text-xs text-slate-400 mb-1">Authenticating Authority</div>
                <div className="text-sm font-bold text-slate-900">KARMASETU INDUSTRIAL TRAINING BOARD</div>
                <div className="text-[10px] text-emerald-600 uppercase tracking-widest mt-1 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Blockchain Verified Identity</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Invalid Certificate ID</h2>
            <p className="text-slate-500 mt-2 mb-6">The certificate ID <strong>{certId}</strong> could not be verified in our records.</p>
            <Link href="/" className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              Back to KarmaSetu
            </Link>
          </div>
        )}

        <div className="text-center mt-12 text-slate-400 text-sm">
          Powered by <span className="font-bold text-slate-600 tracking-tighter">KARMASETU</span> Secure Verification System
        </div>
      </div>
    </div>
  );
}
