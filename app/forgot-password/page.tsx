'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'request' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to request reset code.');
      }
      setMessage(
        typeof data.code === 'string'
          ? `${data.message} Dev code: ${data.code}`
          : data.message || 'If this email exists, a reset code has been generated.'
      );
      setStep('reset');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to request code.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }
      setMessage(data.message || 'Password reset successful.');
      setTimeout(() => router.push('/login'), 1200);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
        <h1 className="mb-2 text-xl font-bold">Forgot Password</h1>
        <p className="mb-6 text-sm text-slate-400">Request a reset code and set a new password.</p>

        {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>}
        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

        {step === 'request' ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#020817] px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="name@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
            >
              {isLoading ? 'Requesting...' : 'Request Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#020817] px-3 py-2 text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-slate-300">Reset Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#020817] px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="6-digit code"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-slate-300">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#020817] px-3 py-2 text-sm outline-none focus:border-cyan-500"
                placeholder="At least 8 chars, upper/lower/number/special"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-60"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-5 text-center text-xs text-slate-400">
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
