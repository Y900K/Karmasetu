'use client';

import React from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

export interface CertificateData {
  certNo: string;
  trainee: string;
  course: string;
  issueDate: string;
  expiry: string;
  score: number;
  status: string;
  issuedBy?: string;
  issuedByTitle?: string;
}

interface PremiumCertificateProps {
  cert: CertificateData;
  verificationUrl?: string;
}

export default function PremiumCertificate({ cert, verificationUrl }: PremiumCertificateProps) {
  const [origin, setOrigin] = React.useState('https://karmasetu.com');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const url = verificationUrl || `${origin}/verify/${cert.certNo}`;
  const issuedBy = cert.issuedBy || "Manish Bhardwaj";
  const issuedByTitle = cert.issuedByTitle || "HR — KARMASETU";

  return (
    <div className="bg-[#f8fafc] p-4 md:p-8 rounded-2xl shadow-2xl overflow-hidden mx-auto max-w-4xl">
      {/* Inner Certificate Container with Strict Layout */}
      <div className="bg-white border-[12px] border-slate-100 p-8 md:p-12 relative flex flex-col min-h-[520px] shadow-sm ring-1 ring-slate-200">
        
        {/* Massive Watermark */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none opacity-[0.03]">
          <div className="text-[120px] font-black -rotate-15 uppercase tracking-tighter text-slate-900 border-y-8 border-slate-900">
            KARMASETU
          </div>
        </div>
        
        {/* Premium Corners (Fixed position) */}
        {[
          { pos: 'top-6 left-6', bdr: 'border-t-4 border-l-4' },
          { pos: 'top-6 right-6', bdr: 'border-t-4 border-r-4' },
          { pos: 'bottom-6 left-6', bdr: 'border-b-4 border-l-4' },
          { pos: 'bottom-6 right-6', bdr: 'border-b-4 border-r-4' }
        ].map(({ pos, bdr }) => (
          <div key={pos} className={`absolute ${pos} w-16 h-16 ${bdr} border-amber-600/30`} />
        ))}
        
        {/* CONTENT STARTS HERE */}
        <div className="relative z-10 flex flex-col flex-1 h-full">
          
          {/* 1. BRANDING HEADER (Centered & Balanced) */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center gap-6 mb-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-cyan-100 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                {/* Actual Logo placement */}
                <div className="h-20 w-20 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg border border-slate-700 p-2">
                   <img src="/logo.png" alt="KarmaSetu Logo" width={64} height={64} className="h-full w-full object-contain" />
                </div>
              </div>
              <div className="text-left">
                <div className="text-3xl font-black tracking-[0.25em] text-slate-900 leading-none">KARMASETU</div>
                <div className="text-[12px] tracking-[0.4em] text-slate-500 font-bold mt-3 uppercase leading-none border-t-2 border-slate-100 pt-2">AI Integrated Industrial Training Portal</div>
              </div>
            </div>
          </div>

          {/* 2. CORE CERTIFICATE TEXT (Scaled for zero cutting) */}
          <div className="flex-1 flex flex-col justify-center text-center space-y-6">
            <div>
              <h2 className="text-5xl font-serif text-slate-900 tracking-tight leading-none mb-3">Certificate of Completion</h2>
              <p className="text-slate-400 font-bold tracking-[0.3em] text-[10px] uppercase">Official Documentation of Competence</p>
            </div>

            <div className="py-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-3">Awarded To</p>
              <h1 className="text-5xl font-black text-cyan-800 uppercase tracking-tight font-serif decoration-amber-300 underline underline-offset-[16px] decoration-[3px] py-1">
                {cert.trainee}
              </h1>
            </div>
            
            <div className="max-w-2xl mx-auto py-2">
              <p className="text-sm text-slate-500 font-medium mb-4">has demonstrated exceptional proficiency by successfully completing all specialized modules for</p>
              <div className="text-2xl font-bold text-slate-900 bg-slate-50/80 border-y-2 border-slate-100 py-4 px-12 leading-tight inline-block shadow-sm">
                {cert.course}
              </div>
            </div>
          </div>

          {/* 3. LOGISTICAL FOOTER (No cutting guaranteed) */}
          <div className="mt-auto grid grid-cols-3 items-end gap-10 pt-10 border-t-2 border-slate-50">
            {/* Left: Metadata */}
            <div className="space-y-4">
              <div className="group">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-2">Issue Date</p>
                <p className="text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{cert.issueDate}</p>
              </div>
              <div className="group">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-2">Authenticated ID</p>
                <p className="text-sm font-mono font-bold text-cyan-700 bg-cyan-50/50 px-2 py-1 rounded inline-block">{cert.certNo}</p>
              </div>
            </div>

            {/* Center: Interactive Verification */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-2xl shadow-xl border border-slate-100 transition-transform hover:scale-105 duration-300 ring-4 ring-slate-50">
                <QRCodeSVG 
                  value={url} 
                  size={96} 
                  level="H" 
                  includeMargin={false}
                  fgColor="#0f172a"
                />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3 whitespace-nowrap">Scan for Live Authenticity</p>
            </div>

            {/* Right: Signature */}
            <div className="flex flex-col items-stretch text-right min-w-[200px]">
              <div className="h-12 flex items-end justify-end mb-1 pr-4">
                <div className="text-[9px] font-black text-emerald-600/50 uppercase border-2 border-emerald-500/20 px-4 py-1.5 rounded-full -rotate-12 bg-emerald-50/10">
                  Blockchain Verified
                </div>
              </div>
              <div className="h-0.5 w-full bg-slate-900 mb-2 shadow-sm rounded-full" />
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-2">Authorized Authority</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{issuedBy}</p>
              <p className="text-[10px] text-slate-500 font-bold italic">{issuedByTitle}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Stamp Element */}
        <div className="absolute top-12 right-12 w-32 h-32 opacity-[0.15] pointer-events-none select-none">
          <div className="w-full h-full rounded-full border-4 border-double border-amber-600 flex flex-col items-center justify-center -rotate-12 bg-amber-50 shadow-inner">
             <div className="text-[12px] font-black text-amber-700 text-center leading-tight">ISO-9001<br/>INDUSTRIAL<br/>STANDARD</div>
          </div>
        </div>
      </div>
    </div>
  );
}
