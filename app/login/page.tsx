'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, HardHat, Info, ChevronRight } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'trainee' | 'admin'>('trainee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const parseApiResponse = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  };

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'admin' || role === 'trainee') {
      setActiveTab(role);
    }
  }, [searchParams]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      setError(`Account temporarily locked. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email and password to proceed.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g., name@company.com).');
      return;
    }

    try {
      setIsLoading(true);
      const controller = new AbortController();
      // Increased timeout to 30s to allow for serverless cold-starts & DB connection parsing
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          identifier: email,
          password,
          role: activeTab,
        }),
      }).finally(() => {
        clearTimeout(timeout);
      });

      const data = await parseApiResponse(res);
      // Success! Clear possible previous local state related to logout or errors
      localStorage.removeItem('loginError');
      setFailedAttempts(0);
      setLockoutUntil(null);
      
      if (data.auth?.forcePasswordChange) {
        router.push('/change-password');
        return;
      }

      const resolvedRole = data?.user?.role === 'admin' ? 'admin' : 'trainee';
      router.push(resolvedRole === 'admin' ? '/admin/dashboard' : '/trainee/dashboard');
    } catch (err) {
      if (err instanceof Error && err.message.includes('Too many failed')) {
        // Backend actively locked the user (the 30 min lock UI update)
        setLockoutUntil(Date.now() + 30 * 60 * 1000);
        setError(err.message);
      } else {
        const currentFailures = failedAttempts + 1;
        setFailedAttempts(currentFailures);
        
        if (currentFailures >= 3) {
          setLockoutUntil(Date.now() + 30 * 60 * 1000); // UI reflects 30 minutes lockout
          setError(`Account temporarily locked due to 3 failed attempts. Please try again in 30 minutes.`);
        } else if (err instanceof Error && err.name === 'AbortError') {
          setError('Login request timed out. The server might be waking up or your connection is slow. Please try again.');
        } else {
          setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials and try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-12 md:py-20 px-4 relative overflow-hidden bg-[#020817]">
      {/* Heavy Subdued Background Watermark Logo Centered perfectly */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden mix-blend-screen">
        <div className="relative w-[150vw] sm:w-[120vw] lg:w-[60vw] max-w-[800px] aspect-square opacity-[0.02] lg:opacity-[0.04] blur-[1px] lg:blur-[2px] transition-all duration-500">
          <Image src="/logo.png" alt="Background Logo Watermark" fill priority className="object-contain" />
        </div>
      </div>

      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-pattern opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16"
      >
        
        {/* Left Side: Branding & Toggles */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1 max-w-[500px]">
          <div className="inline-flex flex-col items-center lg:items-start gap-4 mb-4 lg:mb-8">
            <Link href="/" className="flex items-center gap-4 lg:gap-6 group">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <Image src="/logo.png" alt="KarmaSetu Logo" width={80} height={80} className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-1 uppercase drop-shadow-md flex items-center justify-center lg:justify-start gap-3">
                  <span className="whitespace-nowrap">KARMA<span className="text-cyan-400">SETU</span></span>
                </h1>
                <p className="text-[8px] sm:text-[10px] md:text-[12px] lg:text-[14px] tracking-[0.15em] sm:tracking-[0.25em] md:tracking-[0.4em] text-cyan-400 font-bold uppercase mt-1">
                  KARMASETU <span className="font-medium tracking-[0.2em] capitalize">में आपका स्वागत है</span>
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden lg:block w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-7 backdrop-blur-xl relative overflow-hidden shadow-2xl transition-[background] duration-300 hover:bg-white/[0.05] mt-2 lg:mt-4">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl rounded-full" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <h3 className="text-white text-[15px] font-black tracking-tight">Secure Access</h3>
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed relative z-10 font-medium">
              Sign in to your KarmaSetu account to continue your learning journey or manage your facility&apos;s training operations.
            </p>
          </div>

          {/* Portals Toggle (Mobile shows above card, Desktop sits neatly here) */}
          <div className="flex justify-center bg-[#0f172a] p-1.5 rounded-2xl mt-8 lg:mt-10 border border-white/5 shadow-lg shadow-black/50 relative z-20 overflow-hidden self-center lg:self-center">
            {(['trainee', 'admin'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); }}
                className={`flex items-center justify-center gap-2.5 px-8 md:px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.14em] transition-all relative ${
                  activeTab === tab 
                    ? 'text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {activeTab === tab && (
                   <div className={`absolute inset-0 rounded-xl bg-cyan-400 -z-10`} />
                )}
                {tab === 'trainee' ? <HardHat className="w-4 h-4 z-10" /> : <ShieldCheck className="w-4 h-4 z-10" />}
                <span className="z-10">{tab === 'trainee' ? 'Trainee' : 'Supervisor'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Main Auth Container */}
        <div className="w-full max-w-[440px] bg-[#090e17]/95 backdrop-blur-2xl border border-[#1e293b] rounded-[28px] p-7 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden z-20 shrink-0 before:absolute before:inset-0 before:rounded-[28px] before:border before:border-cyan-500/10 before:pointer-events-none before:-m-px">
          {/* Edge glow */}
          <div className={`absolute top-0 w-full h-px inset-x-0 ${activeTab === 'admin' ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-500 to-transparent'} opacity-50`} />
          
          <motion.div key={activeTab} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-6 pt-2">
              <h2 className="text-2xl font-bold text-white mb-2">{activeTab === 'trainee' ? 'Trainee Login' : 'Supervisor Login'}</h2>
              <p className="text-slate-400 text-sm">
                Enter your credentials to securely access your {activeTab === 'trainee' ? 'learning dashboard' : 'management console'}.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs shadow-inner shadow-red-500/10 animate-in fade-in slide-in-from-top-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-[10px] text-purple-200 font-black tracking-widest uppercase mb-6">
                  <ShieldCheck className="w-5 h-5 text-purple-400" /> Authorized Personnel Only
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-500 mb-3 ml-2">
                  {t('login.email')}
                </label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeTab === 'admin' ? 'admin@karmasetu.com' : 'user@karmasetu.com'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 flex pl-16 pr-4 text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] font-black text-slate-500 mb-3 ml-2">
                  {t('login.password')}
                </label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 flex pl-16 pr-14 text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-end px-2 gap-4">
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors whitespace-nowrap leading-none"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                className={`w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group ${
                  activeTab === 'admin'
                    ? 'bg-purple-500 shadow-[0_4px_30px_rgba(168,85,247,0.4)] text-white'
                    : 'bg-cyan-500 shadow-[0_4px_30px_rgba(6,182,212,0.4)] text-slate-900'
                }`}
              >
                <div className={`absolute inset-0 transition-opacity ${activeTab === 'admin' ? 'bg-gradient-to-r from-purple-600 to-purple-400 group-hover:opacity-90' : 'bg-gradient-to-r from-cyan-400 to-cyan-500 group-hover:opacity-90'}`} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <span className="h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span className="text-[13px] uppercase tracking-widest font-black">Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[13px] uppercase tracking-[0.15em] font-black">आगे बढ़ें</span>
                      <ChevronRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </motion.div>
          
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <div className="text-center pt-2">
              <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors cursor-pointer bg-white/5 px-6 py-3 rounded-full hover:bg-white/10">
                 ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Robot Mascot Overlay (Faded) */}
      <Image src="/yk_mascot.png" alt="Mascot" width={256} height={256} className="fixed bottom-[-50px] left-[-30px] w-64 h-64 grayscale opacity-[0.03] pointer-events-none -rotate-12" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}


