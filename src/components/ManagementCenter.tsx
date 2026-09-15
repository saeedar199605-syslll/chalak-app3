/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  validateAdminPasswordChange, 
  sanitizeInputString, 
  clearLegacyAdminSessions,
  validateEmployeeInput,
  validateCriterionInput,
  validateJobProfileInput,
  validateEvaluationInput
} from '../utils/validation';
import { 
  Shield, 
  Key, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText, 
  FileJson, 
  RefreshCw, 
  Trash2, 
  Search, 
  Users, 
  HelpCircle,
  Copy,
  FolderLock,
  UserCheck,
  Sparkles,
  Sliders,
  Award,
  UserCog,
  Check,
  RotateCcw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Dices,
  LockKeyhole,
  CheckCheck,
  Filter,
  Activity,
  Clock,
  Layers,
  Database,
  FileCheck,
  ArrowUpDown,
  HardDrive,
  Server,
  Boxes,
  FileCode,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  History,
  Gauge,
  BookOpen,
  Printer
} from 'lucide-react';
import { Employee, JobProfile, Criterion, Evaluation, UserRole, UserCustomPermission, CategoryKey } from '../types';
import ExcelIntegrationCenter from './ExcelIntegrationCenter';
import PerformanceArchiveVault from './PerformanceArchiveVault';
import ProductionCycleTimeCalculator from './ProductionCycleTimeCalculator';
import { getArchivedEvaluations, saveArchivedEvaluations } from '../utils/archiveManager';
import { 
  ManualAccessPolicy, 
  getManualAccessPolicy, 
  saveManualAccessPolicy, 
  canUserViewManual, 
  canUserDownloadManual 
} from '../utils/manualAccessManager';
import { db } from '../utils/db';

export interface SystemLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

interface ManagementCenterProps {
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
  evaluations: Evaluation[];
  archivedEvaluations?: Evaluation[];
  onSetEmployees: (emps: Employee[]) => void;
  onSetProfiles: (profs: JobProfile[]) => void;
  onSetCriteria: (crits: Criterion[]) => void;
  onSetEvaluations: (evals: Evaluation[]) => void;
  onSetArchivedEvaluations?: (archived: Evaluation[]) => void;
  currentUser: Employee;
  theme: 'dark' | 'light';
  onForceReauth?: () => void;
}

export default function ManagementCenter({
  employees,
  profiles,
  criteria,
  evaluations,
  archivedEvaluations,
  onSetEmployees,
  onSetProfiles,
  onSetCriteria,
  onSetEvaluations,
  onSetArchivedEvaluations,
  currentUser,
  theme,
  onForceReauth
}: ManagementCenterProps) {
  const [activeSectionTab, setActiveSectionTab] = useState<'security' | 'rbac' | 'backup' | 'history' | 'logs' | 'all'>('security');
  const [internalArchivedEvaluations, setInternalArchivedEvaluations] = useState<Evaluation[]>(() => {
    return archivedEvaluations || getArchivedEvaluations();
  });
  const effectiveArchived = archivedEvaluations || internalArchivedEvaluations;

  const handleSetArchived = (nextArchived: Evaluation[]) => {
    setInternalArchivedEvaluations(nextArchived);
    if (onSetArchivedEvaluations) {
      onSetArchivedEvaluations(nextArchived);
    } else {
      saveArchivedEvaluations(nextArchived);
    }
  };

  const [isExcelIntegrationOpen, setIsExcelIntegrationOpen] = useState(false);

  // --- 1. USER PASSWORDS & LOCKOUT STATE ---
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('pe_user_passwords');
    if (saved) return JSON.parse(saved);
    return {};
  });

  const [lockedUsers, setLockedUsers] = useState<string[]>(() => {
    const saved = localStorage.getItem('pe_locked_users');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [userToDelete, setUserToDelete] = useState<Employee | null>(null);

  useEffect(() => {
    localStorage.setItem('pe_user_passwords', JSON.stringify(userPasswords));
    db.syncToCloudNow().catch(() => {});
  }, [userPasswords]);

  useEffect(() => {
    localStorage.setItem('pe_locked_users', JSON.stringify(lockedUsers));
    db.syncToCloudNow().catch(() => {});
  }, [lockedUsers]);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserRole>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'custom_pass' | 'default_pass' | 'locked'>('all');

  const [editingPasswordEmp, setEditingPasswordEmp] = useState<Employee | null>(null);
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [showCustomPassInput, setShowCustomPassInput] = useState(true);
  const [credentialsFeedback, setCredentialsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedEmpId, setCopiedEmpId] = useState<string | null>(null);

  // --- 2. ADMIN PASSWORD MANAGEMENT ---
  const [currentAdminPasswordInput, setCurrentAdminPasswordInput] = useState('');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [confirmAdminPasswordInput, setConfirmAdminPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- 3. STATE FOR RBAC PERMISSIONS ---
  interface RolePermissions {
    role: UserRole;
    canEditCriteria: boolean;
    canEditProfiles: boolean;
    canEditEmployees: boolean;
    canStartEvaluations: boolean;
    canLockScores: boolean;
    canViewSalaries: boolean;
    canDefineTargets: boolean;
    canRestoreBackup: boolean;
  }

  const [permissions, setPermissions] = useState<RolePermissions[]>(() => {
    const saved = localStorage.getItem('pe_role_permissions');
    if (saved) return JSON.parse(saved);
    return [
      {
        role: 'admin',
        canEditCriteria: true,
        canEditProfiles: true,
        canEditEmployees: true,
        canStartEvaluations: true,
        canLockScores: true,
        canViewSalaries: true,
        canDefineTargets: true,
        canRestoreBackup: true
      },
      {
        role: 'supervisor',
        canEditCriteria: false,
        canEditProfiles: false,
        canEditEmployees: true,
        canStartEvaluations: true,
        canLockScores: false,
        canViewSalaries: false,
        canDefineTargets: true,
        canRestoreBackup: false
      },
      {
        role: 'employee',
        canEditCriteria: false,
        canEditProfiles: false,
        canEditEmployees: false,
        canStartEvaluations: false,
        canLockScores: false,
        canViewSalaries: false,
        canDefineTargets: false,
        canRestoreBackup: false
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('pe_role_permissions', JSON.stringify(permissions));
    db.syncToCloudNow().catch(() => {});
  }, [permissions]);

  // --- AUDIT LOGS ---
  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('pe_system_logs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'log-1',
        timestamp: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date()),
        operator: 'سیستم هوشمند',
        action: 'راه‌اندازی سامانه ابری',
        details: 'سامانه ارزیابی عملکرد و مربیگری اصفهان چالاک آماده بهره‌برداری است.',
        type: 'success'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('pe_system_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (action: string, details: string, type: SystemLog['type'] = 'info') => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date()),
      operator: currentUser.name,
      action,
      details,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 199)]);
  };

  // --- USER CREDENTIAL HANDLERS ---
  const handleOpenEditPassword = (emp: Employee) => {
    setEditingPasswordEmp(emp);
    const existing = userPasswords[emp.username.toLowerCase()] || '';
    setCustomPasswordInput(existing);
  };

  const handleSaveCustomPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordEmp) return;
    const cleanPass = customPasswordInput.trim();
    if (!cleanPass) {
      handleResetUserPasswordToDefault(editingPasswordEmp.username);
      setEditingPasswordEmp(null);
      return;
    }
    if (cleanPass.length < 3) {
      setCredentialsFeedback({ type: 'error', message: 'کلمه عبور باید حداقل ۳ کاراکتر باشد.' });
      return;
    }

    const updated = {
      ...userPasswords,
      [editingPasswordEmp.username.toLowerCase()]: cleanPass
    };
    setUserPasswords(updated);
    addLog(
      'تغییر کلمه عبور کاربر',
      `کلمه عبور اختصاصی برای ${editingPasswordEmp.name} (${editingPasswordEmp.username}) تنظیم شد.`,
      'success'
    );
    setCredentialsFeedback({ type: 'success', message: `کلمه عبور کاربر ${editingPasswordEmp.name} با موفقیت ذخیره شد.` });
    setEditingPasswordEmp(null);
    setTimeout(() => setCredentialsFeedback(null), 4000);
  };

  const handleResetUserPasswordToDefault = (username: string) => {
    const updated = { ...userPasswords };
    delete updated[username.toLowerCase()];
    setUserPasswords(updated);
    addLog(
      'بازنشانی کلمه عبور کاربر',
      `کلمه عبور کاربر ${username} به مقدار اولیه (123456) بازگردانده شد.`,
      'warning'
    );
    setCredentialsFeedback({ 
      type: 'success', 
      message: `کلمه عبور کاربر ${username} به رمز پیش‌فرض بازنشانی گردید.` 
    });
    setTimeout(() => setCredentialsFeedback(null), 4000);
  };

  const handleToggleLockUser = (emp: Employee) => {
    const isLocked = lockedUsers.includes(emp.id) || lockedUsers.includes(emp.username.toLowerCase());
    let updated: string[];
    if (isLocked) {
      updated = lockedUsers.filter(id => id !== emp.id && id !== emp.username.toLowerCase());
      addLog('رفع مسدودی کاربر', `دسترسی کاربری ${emp.name} (${emp.code}) مجدداً فعال شد.`, 'success');
      setCredentialsFeedback({ type: 'success', message: `دسترسی حساب کاربری ${emp.name} فعال شد.` });
    } else {
      updated = [...lockedUsers, emp.id, emp.username.toLowerCase()];
      addLog('مسدودسازی کاربر', `دسترسی کاربری ${emp.name} (${emp.code}) توسط ادمین مسدود گردید.`, 'danger');
      setCredentialsFeedback({ type: 'error', message: `حساب کاربری ${emp.name} غیرفعال شد.` });
    }
    setLockedUsers(updated);
    setTimeout(() => setCredentialsFeedback(null), 4000);
  };

  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    const storedPass = localStorage.getItem('pe_admin_password') || 'admin';
    const isCurrentValid = currentAdminPasswordInput === storedPass;
    if (!isCurrentValid) {
      setPasswordFeedback({ type: 'error', message: 'کلمه عبور فعلی مدیریت نادرست است.' });
      return;
    }

    const validation = validateAdminPasswordChange({
      currentPassword: currentAdminPasswordInput,
      newPassword: newAdminPasswordInput,
      confirmPassword: confirmAdminPasswordInput
    });

    if (!validation.success) {
      setPasswordFeedback({ type: 'error', message: validation.error });
      return;
    }

    const cleanNewPass = validation.newPassword;
    const nowIso = new Date().toISOString();

    clearLegacyAdminSessions();
    localStorage.setItem('pe_admin_password', cleanNewPass);
    localStorage.setItem('pe_admin_password_updated_at', nowIso);
    
    setUserPasswords(prev => {
      const updated = { ...prev, admin: cleanNewPass };
      localStorage.setItem('pe_user_passwords', JSON.stringify(updated));
      return updated;
    });

    db.syncToCloudNow().catch(() => {});

    addLog('تغییر رمز عبور مدیر ارشد', 'کلمه عبور مدیریت با موفقیت بروزرسانی شد.', 'success');
    setPasswordFeedback({ 
      type: 'success', 
      message: 'رمز عبور با موفقیت تغییر کرد. در حال بازگشت...' 
    });

    setTimeout(() => {
      if (onForceReauth) {
        onForceReauth();
      } else {
        clearLegacyAdminSessions();
        window.location.reload();
      }
    }, 1600);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = userSearchTerm.toLowerCase();
      const matchSearch = emp.name.toLowerCase().includes(q) || 
                          emp.code.toLowerCase().includes(q) || 
                          emp.username.toLowerCase().includes(q) || 
                          emp.unit.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (userRoleFilter !== 'all' && emp.role !== userRoleFilter) return false;
      const hasCustom = !!userPasswords[emp.username.toLowerCase()];
      const isLocked = lockedUsers.includes(emp.id) || lockedUsers.includes(emp.username.toLowerCase());
      if (userStatusFilter === 'custom_pass' && !hasCustom) return false;
      if (userStatusFilter === 'default_pass' && hasCustom) return false;
      if (userStatusFilter === 'locked' && !isLocked) return false;
      return true;
    });
  }, [employees, userSearchTerm, userRoleFilter, userStatusFilter, userPasswords, lockedUsers]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-rose-500/20">
            <ShieldCheck className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              مرکز مدیریت ارشد و کنترل امنیت سازمانی
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              مدیریت حساب‌ها، کلمات عبور، سطوح دسترسی (RBAC) و نظارت بر لاگ‌های سیستم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => db.forceSyncNow()}
            className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>همگام‌سازی فوری با کلادفلر</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSectionTab('security')}
          className={`py-2.5 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSectionTab === 'security'
              ? 'bg-rose-500 text-slate-50 shadow-lg shadow-rose-500/20'
              : 'bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <LockKeyhole className="w-4 h-4" />
          <span>امنیت و رمزهای عبور</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSectionTab('history')}
          className={`py-2.5 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSectionTab === 'history'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>انبار سرد و سوابق گذشته</span>
        </button>
      </div>

      {activeSectionTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-800/40 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-200">تغییر رمز عبور مدیریت ارشد (Admin)</h2>
                  </div>
                </div>
              </div>

              {passwordFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  passwordFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">کلمه عبور فعلی:</label>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentAdminPasswordInput}
                    onChange={(e) => setCurrentAdminPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">کلمه عبور جدید:</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newAdminPasswordInput}
                    onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">تکرار کلمه عبور جدید:</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmAdminPasswordInput}
                    onChange={(e) => setConfirmAdminPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    تغییر و ذخیره کلمه عبور
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h2 className="text-base font-black text-slate-100">فهرست پرسنل و وضعیت دسترسی کاربری</h2>
            
            {credentialsFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                {credentialsFeedback.message}
              </div>
            )}

            {editingPasswordEmp && (
              <div className="bg-rose-500/5 border-2 border-rose-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-100">
                    تنظیم کلمه عبور اختصاصی برای: {editingPasswordEmp.name} ({editingPasswordEmp.username})
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingPasswordEmp(null)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    انصراف
                  </button>
                </div>
                <form onSubmit={handleSaveCustomPassword} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={customPasswordInput}
                    onChange={(e) => setCustomPasswordInput(e.target.value)}
                    placeholder="کلمه عبور جدید..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-100 font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-slate-50 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    ذخیره
                  </button>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 pr-3">کارمند</th>
                    <th className="pb-3 text-center">کد پرسنلی</th>
                    <th className="pb-3 text-center">نام کاربری</th>
                    <th className="pb-3 text-center">رمز عبور</th>
                    <th className="pb-3 text-center">وضعیت دسترسی</th>
                    <th className="pb-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredEmployees.map(emp => {
                    const customPass = userPasswords[emp.username.toLowerCase()];
                    const isLocked = lockedUsers.includes(emp.id) || lockedUsers.includes(emp.username.toLowerCase());
                    return (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pr-3 font-bold text-slate-100">{emp.name}</td>
                        <td className="py-3 text-center font-mono text-teal-400">{emp.code}</td>
                        <td className="py-3 text-center font-mono">{emp.username}</td>
                        <td className="py-3 text-center">
                          {customPass ? (
                            <span className="font-mono text-rose-300 font-bold">{customPass}</span>
                          ) : (
                            <span className="text-slate-500">123456 (پیش‌فرض)</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {isLocked ? (
                            <span className="text-rose-400 font-bold">مسدود</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">فعال</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPassword(emp)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title="تغییر رمز"
                            >
                              <Key className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLockUser(emp)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title={isLocked ? "فعال‌سازی" : "مسدودسازی"}
                            >
                              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSectionTab === 'history' && (
        <PerformanceArchiveVault
          activeEvaluations={evaluations}
          archivedEvaluations={effectiveArchived}
          onSetEvaluations={onSetEvaluations}
          onSetArchivedEvaluations={handleSetArchived}
          employees={employees}
          profiles={profiles}
          criteria={criteria}
          currentUser={currentUser}
          theme={theme}
          onAddLog={addLog}
        />
      )}
    </div>
  );
}
