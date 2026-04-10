'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, ShieldAlert, CheckCircle2, ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/trainee/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-pattern opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="KarmaSetu" width={48} height={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Secure Account Recovery</h1>
          <p className="text-amber-400 font-bold uppercase tracking-[0.2em] text-[10px]">Security Protocol Required</p>
        </div>

        <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden border-t-amber-500/30">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Password Secured</h2>
              <p className="text-slate-400 text-sm mb-6">Your permanent password has been updated. Redirecting to your dashboard...</p>
              <div className="flex justify-center">
                <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: '100%' }} 
                    transition={{ duration: 2 }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-8">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-1">Temporary Access Detected</h3>
                  <p className="text-xs text-amber-200/70 leading-relaxed">
                    You have logged in using a temporary code. For your security, you must establish a new permanent password before proceeding.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-3 ml-1">
                    New Permanent Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-white outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 leading-relaxed px-1">
                    {PASSWORD_POLICY_MESSAGE}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-3 ml-1">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <span className="h-5 w-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="uppercase tracking-widest font-black">Secure Account Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-8 cursor-help group">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-bold group-hover:text-amber-500/50 transition-colors leading-relaxed">
            Encrypted End-to-End Session<br/>
            Security Protocol 2.4.1
          </p>
        </div>
      </motion.div>
    </div>
  );
}
