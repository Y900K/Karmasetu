'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, HardHat, ChevronRight, UserCircle, Briefcase, Mail, Lock } from 'lucide-react';
import { DEPT_OPTIONS } from '@/data/mockAdminData';

type RegisterStep = 'identity' | 'profile';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('identity');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtherDept, setIsOtherDept] = useState(false);
  const departmentOptions = DEPT_OPTIONS.filter((department) => department !== 'All Departments');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    employeeId: '',
    department: '',
    role: 'trainee',
    company: '',
    phone: '',
  });

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const password = formData.password;
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[!@#$%^&*.,<>/?;:'"\[\]{}|`~_+\-=]/.test(password)) {
      setError('Password must contain at least one special character.');
      return;
    }

    setStep('profile');
  };

  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    'Initializing Secure Channel...',
    'Building Industrial Profile...',
    'Verifying Facility Access...',
    'Syncing Certification Data...',
    'Finalizing Setup...'
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for stability

    let intervalId: NodeJS.Timeout | undefined;

    try {
      setError('');
      setDepartmentError('');
      setIsLoading(true);
      setLoadingStep(0);

      // Start a cycle of loading messages
      intervalId = setInterval(() => {
        setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 1500);

      if (!formData.department.trim()) {
        setDepartmentError('Please select your primary department to continue.');
        setIsLoading(false);
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        company: formData.company,
        phone: formData.phone,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (intervalId) clearInterval(intervalId);
      setLoadingStep(loadingMessages.length - 1);

      localStorage.setItem('traineeName', data.user?.fullName || formData.fullName || 'New User');
      
      // Artificial delay for UX feel (premium "building" feel)
      await new Promise(resolve => setTimeout(resolve, 800));
      router.push('/trainee/dashboard');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('The connection timed out. Please check your internet and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-16 pt-24 md:pt-28 px-4 relative overflow-hidden bg-[#020817]">
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
        {/* Left Side: Branding */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1 max-w-[500px]">
          <div className="inline-flex flex-col items-center lg:items-start gap-4 mb-4 lg:mb-8">
            <Link href="/" className="flex items-center gap-3 md:gap-4 lg:gap-6 group">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <Image src="/logo.png" alt="KarmaSetu Logo" width={80} height={80} className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-1 uppercase drop-shadow-md flex items-center justify-center lg:justify-start gap-3">
                  <span className="whitespace-nowrap">KARMA<span className="text-cyan-400">SETU</span></span>
                </h1>
                <p className="text-[8px] sm:text-[10px] md:text-[12px] lg:text-[14px] tracking-[0.15em] sm:tracking-[0.25em] md:tracking-[0.4em] text-cyan-400 font-bold uppercase mt-1">
                  Welcome to KarmaSetu
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden lg:block w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl transition-[background] duration-300 hover:bg-white/[0.05] mt-2 lg:mt-4">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-transparent blur-2xl md:blur-3xl rounded-full" />
            <div className="relative z-10 flex items-center justify-between mb-3">
              <h3 className="text-white text-base font-bold tracking-tight">Enterprise Access</h3>
              <HardHat className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-slate-300 text-sm leading-relaxed relative z-10">
              Join the KarmaSetu industrial training ecosystem. Gain unified access to specialized learning tracts, safety certifications, and role-based tracking.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <UserCircle className="w-3 h-3 text-cyan-400" />
                </div>
                Real-time safety certifications
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                </div>
                Compliance verification tracking
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Main Auth Container */}
        <div className="w-full max-w-[440px] bg-[#090e17]/95 backdrop-blur-2xl border border-[#1e293b] rounded-[28px] p-7 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden z-20 shrink-0 before:absolute before:inset-0 before:rounded-[28px] before:border before:border-cyan-500/10 before:pointer-events-none before:-m-px">
          {/* Edge glow */}
          <div className="absolute top-0 w-full h-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          <AnimatePresence mode="wait">
            {step === 'identity' && (
              <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Visual Step Indicator */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex-1 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800" />
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800" />
                </div>

                <div className="mb-4 pt-2">
                  <h2 className="text-2xl font-bold text-white mb-1.5 uppercase tracking-tight">Create Account</h2>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest\">
                    Phase 01: Identification
                  </p>
                </div>
                
                {error && (
                  <div className="mb-5 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs animate-in slide-in-from-top-2">
                    <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleIdentitySubmit}>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Full Name</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                        <UserCircle className="w-[18px] h-[18px]" />
                      </div>
                      <input 
                        type="text" required
                        autoComplete="name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Company Email</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                        <Mail className="w-[18px] h-[18px]" />
                      </div>
                      <input 
                        type="email" required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="name@company.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Phone Number (Optional)</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </div>
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Create Password</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                        <Lock className="w-[18px] h-[18px]" />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Minimum 8 characters"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-12 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 mt-2 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_4px_30px_rgba(6,182,212,0.4)] text-slate-900"
                  >
                    <div className="absolute inset-0 transition-opacity bg-gradient-to-r from-cyan-400 to-cyan-500 group-hover:opacity-90" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-[13px] uppercase tracking-[0.15em] font-black">Continue to Profile</span>
                      <ChevronRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/5">
                  <div className="text-center pt-1">
                    <p className="text-[11px] text-slate-400 mb-3">Already have an account?</p>
                    <Link href="/login" className="inline-flex items-center justify-center w-full max-w-[200px] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer bg-white/5 px-6 py-3 rounded-xl hover:bg-white/10 border border-white/5">
                       Sign In Instead
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Visual Step Indicator */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex-1 h-1.5 rounded-full bg-cyan-500" />
                  <div className="flex-1 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800" />
                </div>

                <div className="mb-5 pt-2">
                  <button onClick={() => setStep('identity')} className="text-cyan-500/60 hover:text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2 transition-colors group">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to step 1
                  </button>
                  <h2 className="text-2xl font-bold text-white mb-1.5 uppercase tracking-tight">Industrial Profile</h2>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest\">
                    Phase 02: Job Classification
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs animate-in slide-in-from-top-2">
                    <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleRegister}>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Primary Department</label>
                    <div className="relative group">
                      <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${departmentError ? 'text-red-400' : 'text-slate-500 group-focus-within:text-cyan-400'}`}>
                        <Briefcase className="w-[18px] h-[18px]" />
                      </div>
                      <select 
                        required={!isOtherDept}
                        aria-label="Select Primary Department"
                        title="Select Primary Department"
                        value={isOtherDept ? 'Other' : formData.department}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            setIsOtherDept(true);
                            setFormData({...formData, department: ''});
                          } else {
                            setIsOtherDept(false);
                            setFormData({...formData, department: val});
                          }
                          if (departmentError) setDepartmentError('');
                        }}
                        className={`w-full bg-white/5 border rounded-xl py-3 flex pl-14 pr-10 text-sm text-white outline-none appearance-none cursor-pointer focus:bg-white/[0.07] transition-all shadow-inner ${departmentError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                      >
                        <option value="" className="bg-[#0f172a] text-slate-500">-- Select Department --</option>
                        {departmentOptions.map((department) => (
                          <option key={department} value={department} className="bg-[#0f172a]">{department}</option>
                        ))}
                        <option value="Other" className="bg-[#0f172a]">Other (Please Specify)</option>
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-[18px] h-[18px] rotate-90" />
                    </div>
                    {isOtherDept && (
                      <div className="mt-3 relative group animate-in fade-in slide-in-from-top-2">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                          <Briefcase className="w-[18px] h-[18px]" />
                        </div>
                        <input
                          type="text"
                          required={isOtherDept}
                          value={formData.department}
                          onChange={(e) => {
                            setFormData({...formData, department: e.target.value});
                            if (departmentError) setDepartmentError('');
                          }}
                          placeholder="Enter your department name"
                          className={`w-full bg-white/5 border rounded-xl py-3 flex pl-14 pr-4 text-sm text-white outline-none focus:bg-white/[0.07] transition-all shadow-inner ${departmentError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}`}
                        />
                      </div>
                    )}
                    {departmentError && <p className="mt-1.5 text-xs text-red-400 font-semibold pl-2">{departmentError}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Designated Role</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                        <HardHat className="w-[18px] h-[18px]" />
                      </div>
                      <select 
                        required
                        aria-label="Select Designated Role"
                        title="Select Designated Role"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-10 text-sm text-white outline-none appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all shadow-inner"
                      >
                        <option value="trainee" className="bg-[#0f172a]">Worker / New Trainee</option>
                        <option value="operator" className="bg-[#0f172a]">Certified Plant Operator</option>
                        <option value="contractor" className="bg-[#0f172a]">External Contractor</option>
                        <option value="hse" className="bg-[#0f172a]">Field Safety Officer</option>
                        <option value="manager" className="bg-[#0f172a]">Shift Manager</option>
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-[18px] h-[18px] rotate-90" />
                    </div>
                  </div>

                  <div>
                     <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-1.5 ml-2">Company / Facility Name</label>
                     <div className="relative group">
                       <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                         <ShieldCheck className="w-[18px] h-[18px]" />
                       </div>
                       <input 
                         type="text" required
                         value={formData.company}
                         onChange={(e) => setFormData({...formData, company: e.target.value})}
                         placeholder="e.g. Mathura Refinery Unit 4"
                         className="w-full bg-white/5 border border-white/10 rounded-xl py-3 flex pl-14 pr-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all shadow-inner"
                       />
                     </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 mt-2 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_4px_30px_rgba(6,182,212,0.4)] text-slate-900"
                    >
                      <div className="absolute inset-0 transition-opacity bg-gradient-to-r from-cyan-400 to-cyan-500 group-hover:opacity-90" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                      <div className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                           <div className="flex flex-col items-center">
                             <div className="flex items-center gap-3 mb-1">
                               <span className="h-4 w-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                               <span className="text-[14px] uppercase tracking-widest font-black">{loadingMessages[loadingStep]}</span>
                             </div>
                             <div className="w-48 h-1 bg-slate-900/10 rounded-full overflow-hidden">
                               <motion.div 
                                 className="h-full bg-slate-900"
                                 initial={{ width: 0 }}
                                 animate={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                               />
                             </div>
                           </div>
                        ) : (
                           <>
                             <span className="text-[13px] uppercase tracking-[0.15em] font-black">Complete Setup</span>
                             <ChevronRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
                           </>
                        )}
                      </div>
                    </button>
                    <p className="text-center text-[9px] text-slate-500 font-bold uppercase mt-6 tracking-widest">Secured by KarmaSetu Enterprise Protocol</p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Robot Mascot Overlay (Faded) */}
      <Image src="/yk_mascot.png" alt="Mascot" width={256} height={256} className="fixed bottom-[-50px] left-[-30px] w-64 h-64 grayscale opacity-[0.03] pointer-events-none -rotate-12" />
    </div>
  );
}



