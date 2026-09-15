/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Key, 
  ArrowLeft, 
  Lock, 
  Users, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Employee, UserRole } from '../types';
import InteractiveEyes from './InteractiveEyes';
import { db } from '../utils/db';

interface LoginProps {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
  theme: 'light' | 'dark';
}

export default function Login({ employees, onLogin, theme }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'admin'>('users');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showUserPass, setShowUserPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize on mount to ensure passwords set by admin on another machine are fresh
  useEffect(() => {
    db.initializeCloudSync().catch(() => {});
  }, []);

  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem('pe_failed_attempts') || sessionStorage.getItem('pe_failed_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [lockoutCountdown, setLockoutCountdown] = useState(() => {
    const lockUntil = localStorage.getItem('pe_lockout_until') || sessionStorage.getItem('pe_lockout_until');
    if (lockUntil) {
      const remaining = Math.ceil((parseInt(lockUntil, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    let timer: any;
    if (lockoutCountdown > 0) {
      timer = setTimeout(() => {
        setLockoutCountdown(prev => {
          const next = prev - 1;
          if (next <= 0) {
            localStorage.removeItem('pe_lockout_until');
            sessionStorage.removeItem('pe_lockout_until');
            localStorage.removeItem('pe_failed_attempts');
            sessionStorage.removeItem('pe_failed_attempts');
            setFailedAttempts(0);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutCountdown]);

  const timingSafeEqual = (a: string, b: string): boolean => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    let mismatch = a.length === b.length ? 0 : 1;
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const charA = i < a.length ? a.charCodeAt(i) : 0;
      const charB = i < b.length ? b.charCodeAt(i) : 0;
      mismatch |= charA ^ charB;
    }
    return mismatch === 0;
  };

  const sanitizeAuthInput = (val: string): string => {
    return val
      .replace(/[<>'"`;()&$]/g, '')
      .trim();
  };

  const logSecurityEvent = (action: string, details: string, type: 'info' | 'warning' | 'success' | 'danger') => {
    try {
      const logs = JSON.parse(localStorage.getItem('pe_system_logs') || '[]');
      const newLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Intl.DateTimeFormat('fa-IR', {
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(new Date()),
        operator: 'سیستم امنیتی ورود',
        action,
        details,
        type,
      };
      localStorage.setItem('pe_system_logs', JSON.stringify([newLog, ...logs.slice(0, 199)]));
    } catch {}
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lockoutCountdown > 0) {
      setErrorMsg(`دسترسی به دلیل تلاش‌های ناموفق مکرر موقتاً مسدود است. لطفاً ${lockoutCountdown} ثانیه صبر کنید.`);
      return;
    }

    if (activeTab === 'users') {
      if (!username.trim()) {
        setErrorMsg('لطفاً نام کاربری یا کد پرسنلی خود را وارد کنید.');
        return;
      }
      if (!password.trim()) {
        setErrorMsg('لطفاً کلمه عبور را وارد کنید.');
        return;
      }

      const cleanUser = sanitizeAuthInput(username).toLowerCase();
      const cleanPass = password.trim();

      if (cleanUser === 'admin') {
        setErrorMsg('ورود مدیر ارشد صرفاً از زبانه «مدیر سیستم» امکان‌پذیر است.');
        return;
      }

      const matchedEmp = employees.find(
        emp => emp.username.toLowerCase() === cleanUser || emp.code.toLowerCase() === cleanUser
      );

      if (!matchedEmp) {
        triggerFailedAttempt('کاربری با این مشخصات یافت نشد.');
        return;
      }

      if (matchedEmp.role === 'admin') {
        setErrorMsg('ورود با نقش مدیر ارشد فقط از تب اختصاصی مجاز است.');
        return;
      }

      try {
        const lockedUsers: string[] = JSON.parse(localStorage.getItem('pe_locked_users') || '[]');
        if (lockedUsers.includes(matchedEmp.id) || lockedUsers.includes(matchedEmp.username.toLowerCase())) {
          setErrorMsg('حساب کاربری شما توسط مدیر ارشد غیرفعال شده است.');
          logSecurityEvent('تلاش برای ورود به حساب مسدود', `کاربر ${matchedEmp.name} (${matchedEmp.username}) مسدود است.`, 'warning');
          return;
        }
      } catch {}

      try {
        const customPasswords: Record<string, string> = JSON.parse(localStorage.getItem('pe_user_passwords') || '{}');
        const userStoredPass = customPasswords[matchedEmp.username.toLowerCase()] || '123456';
        
        const isValidPassword = 
          timingSafeEqual(cleanPass, userStoredPass) || 
          timingSafeEqual(cleanPass, matchedEmp.code) ||
          timingSafeEqual(cleanPass, '123456');

        if (!isValidPassword) {
          triggerFailedAttempt('کلمه عبور وارد شده نادرست است.');
          return;
        }
      } catch {}

      setFailedAttempts(0);
      localStorage.removeItem('pe_failed_attempts');
      sessionStorage.removeItem('pe_failed_attempts');
      localStorage.removeItem('pe_lockout_until');
      sessionStorage.removeItem('pe_lockout_until');

      logSecurityEvent('ورود موفق به سامانه', `کاربر ${matchedEmp.name} (${matchedEmp.role}) وارد شد.`, 'info');
      onLogin(matchedEmp);
    } else {
      if (!adminUsername.trim() || !adminPassword.trim()) {
        setErrorMsg('نام کاربری و کلمه عبور مدیر ارشد الزامی است.');
        return;
      }

      const cleanUser = sanitizeAuthInput(adminUsername).toLowerCase();
      const cleanPass = adminPassword.trim();
      const currentStoredAdminPassword = localStorage.getItem('pe_admin_password') || 'admin';
      
      const isAdminMatch = cleanUser === 'admin' && timingSafeEqual(cleanPass, currentStoredAdminPassword);
      if (isAdminMatch) {
        setFailedAttempts(0);
        localStorage.removeItem('pe_failed_attempts');
        sessionStorage.removeItem('pe_failed_attempts');
        localStorage.removeItem('pe_lockout_until');
        sessionStorage.removeItem('pe_lockout_until');
        sessionStorage.setItem('pe_admin_session_logged_at', new Date().toISOString());

        logSecurityEvent('ورود مدیر ارشد', 'مدیر ارشد با موفقیت احراز هویت شد.', 'success');

        const adminEmp: Employee = {
          id: 'emp-admin',
          name: 'مدیریت سرمایه انسانی',
          code: 'ADMIN-001',
          profileId: 'prof-3',
          unit: 'مدیریت ارشد کارخانه',
          role: 'admin',
          username: 'admin'
        };

        onLogin(adminEmp);
      } else {
        triggerFailedAttempt('نام کاربری یا کلمه عبور مدیریت نادرست است.');
      }
    }
  };

  const triggerFailedAttempt = (msg: string) => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    localStorage.setItem('pe_failed_attempts', nextAttempts.toString());
    sessionStorage.setItem('pe_failed_attempts', nextAttempts.toString());

    logSecurityEvent('ورود ناموفق', `تلاش نامعتبر (تلاش ${nextAttempts})`, 'warning');
    
    if (nextAttempts >= 8) {
      const lockSeconds = 300;
      setLockoutCountdown(lockSeconds);
      const lockUntil = (Date.now() + lockSeconds * 1000).toString();
      localStorage.setItem('pe_lockout_until', lockUntil);
      sessionStorage.setItem('pe_lockout_until', lockUntil);
      setErrorMsg(`به دلیل ۸ تلاش ناموفق، دسترسی به مدت ۵ دقیقه مسدود شد.`);
    } else if (nextAttempts >= 5) {
      const lockSeconds = 60;
      setLockoutCountdown(lockSeconds);
      const lockUntil = (Date.now() + lockSeconds * 1000).toString();
      localStorage.setItem('pe_lockout_until', lockUntil);
      sessionStorage.setItem('pe_lockout_until', lockUntil);
      setErrorMsg(`تعداد دفعات اشتباه بیش از حد مجاز بود. لطفاً ۱ دقیقه بعد تلاش کنید.`);
    } else if (nextAttempts >= 3) {
      const lockSeconds = 15;
      setLockoutCountdown(lockSeconds);
      const lockUntil = (Date.now() + lockSeconds * 1000).toString();
      localStorage.setItem('pe_lockout_until', lockUntil);
      sessionStorage.setItem('pe_lockout_until', lockUntil);
      setErrorMsg(`لطفاً ۱۵ ثانیه بعد تلاش کنید.`);
    } else {
      setErrorMsg(`${msg} (تلاش‌های ناموفق: ${nextAttempts} از ۵)`);
    }
  };

  const isPasswordVisible = (activeTab === 'users' && showUserPass) || (activeTab === 'admin' && showAdminPass);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 text-right relative ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`} dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.04),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        <div className="mb-4 transform hover:scale-105 transition-transform duration-200 cursor-default">
          <InteractiveEyes 
            isClosed={isPasswordVisible} 
            theme={theme} 
          />
        </div>

        <div className={`w-full rounded-3xl border shadow-2xl p-6 md:p-8 relative overflow-hidden transition-all backdrop-blur-xl ${
          theme === 'dark' ? 'bg-slate-900/95 border-slate-800 shadow-slate-950/60' : 'bg-white/95 border-slate-200 shadow-slate-200'
        }`}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-18 h-18 rounded-2xl bg-white border border-slate-200/80 dark:border-slate-800 shadow-xl flex items-center justify-center p-2.5 mb-3 transform hover:scale-105 transition-transform">
              <img 
                src="/logo.svg" 
                alt="لوگوی اصفهان چالاک" 
                className="w-full h-full object-contain" 
              />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">شرکت اصفهان چالاک</h1>
            <h2 className="text-sm md:text-base font-black text-red-600 dark:text-red-400 mt-1.5 tracking-wide drop-shadow-sm">
              سامانه جامع ارزیابی عملکرد و مربیگری
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
              پلتفرم یکپارچه ارزیابی شاخص‌های کمی، کیفی، رفتاری و ایمنی کارگاهی
            </p>
          </div>

          <div className={`grid grid-cols-2 p-1.5 rounded-2xl border mb-5 ${
            theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => { setActiveTab('users'); setErrorMsg(''); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-red-600 text-white shadow-md font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ورود پرسنل و سرپرستان</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>مدیریت ارشد (Admin)</span>
            </button>
          </div>

          {lockoutCountdown > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-2xl text-xs font-bold mb-4 flex items-center gap-2.5 animate-pulse">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>قفل امنیتی فعال است: {lockoutCountdown} ثانیه تا بازگشایی مجدد...</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {activeTab === 'users' ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">کد پرسنلی یا نام کاربری</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={lockoutCountdown > 0}
                      placeholder="کد پرسنلی (مثال: EMP-1001 یا ali)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full border rounded-xl py-3 pr-4 pl-10 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm'
                      }`}
                    />
                    <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">کلمه عبور</label>
                    <span className="text-[10px] text-slate-500 font-semibold">پیش‌فرض: 123456 یا کد پرسنلی</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showUserPass ? "text" : "password"}
                      required
                      disabled={lockoutCountdown > 0}
                      placeholder="کلمه عبور خود را وارد کنید"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full border rounded-xl py-3 pr-4 pl-10 text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPass(!showUserPass)}
                      className="text-slate-500 hover:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                    >
                      {showUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={lockoutCountdown > 0}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 cursor-pointer mt-3"
                >
                  <span>ورود به سامانه کارگاهی</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">نام کاربری مدیریت</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={lockoutCountdown > 0}
                      placeholder="admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className={`w-full border rounded-xl py-3 pr-4 pl-10 text-xs font-mono font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm'
                      }`}
                    />
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">رمز عبور مدیر ارشد</label>
                    <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      پیش‌فرض اولیه: admin
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPass ? "text" : "password"}
                      required
                      disabled={lockoutCountdown > 0}
                      placeholder="کلمه عبور مدیریت را وارد کنید"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className={`w-full border rounded-xl py-3 pr-4 pl-10 text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="text-slate-500 hover:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={lockoutCountdown > 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer mt-3"
                >
                  <span>ورود به کنسول مدیریت</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>مجهز به سیستم محافظت Brute-Force و همگام‌سازی ابری</span>
            </div>
            <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
              شرکت اصفهان چالاک - سامانه ارزیابی عملکرد کارکنان
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
