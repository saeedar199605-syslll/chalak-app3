/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CriteriaBank from './components/CriteriaBank';
import JobProfiles from './components/JobProfiles';
import Employees from './components/Employees';
import Evaluations from './components/Evaluations';
import Calibration from './components/Calibration';
import Reports from './components/Reports';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import MyEvaluation from './components/MyEvaluation';
import ManagementCenter from './components/ManagementCenter';
import WorkflowManager from './components/WorkflowManager';
import SupervisorNotificationBell from './components/SupervisorNotificationBell';
import LatticePerformanceHub from './components/LatticePerformanceHub';
import KickidlerProductivityHub from './components/KickidlerProductivityHub';
import ComprehensiveManualModal from './components/ComprehensiveManualModal';
import { 
  Home, 
  BookOpen, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  Users, 
  Monitor,
  Eye,
  LogOut,
  Menu,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  Lock,
  LockKeyhole,
  Scale,
  ClipboardCheck,
  FileSpreadsheet,
  Save,
  HelpCircle,
  Bell,
  BellOff,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Criterion, JobProfile, Employee, Evaluation } from './types';
import { browserNotifications } from './utils/browserNotifications';
import { db, SyncStatus } from './utils/db';
import { 
  validateEmployeeInput, 
  validateCriterionInput, 
  validateJobProfileInput,
  clearLegacyAdminSessions 
} from './utils/validation';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [activeTourStep, setActiveTourStep] = useState<number | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [cloudSyncToast, setCloudSyncToast] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Cloudflare live sync status state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => db.getSyncStatus());

  useEffect(() => {
    let isMounted = true;
    db.initializeCloudSync().then(() => {
      if (isMounted) {
        setCriteria(db.getCriteria());
        setProfiles(db.getProfiles());
        setEmployees(db.getEmployees());
        setEvaluations(db.getEvaluations());
        setArchivedEvaluations(db.getArchivedEvaluations());
        setIsHydrated(true);
      }
    }).catch(() => {
      if (isMounted) setIsHydrated(true);
    });

    const unsub = db.subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Listen for remote updates from other users
  useEffect(() => {
    const handleCloudDataSynced = (e: any) => {
      setCloudSyncToast('تغییرات جدید از سایر کاربران دریافت و همگام شد.');
      setTimeout(() => setCloudSyncToast(null), 4000);
    };
    window.addEventListener('pe_cloud_data_synced', handleCloudDataSynced);
    return () => window.removeEventListener('pe_cloud_data_synced', handleCloudDataSynced);
  }, []);

  const sanitizeUser = (user: Employee | null): Employee | null => {
    if (!user) return null;
    return user;
  };

  // Session-isolated user state (per browser/device)
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const sessionSaved = sessionStorage.getItem('pe_session_user');
    if (sessionSaved) {
      try {
        const parsed = JSON.parse(sessionSaved);
        const user = sanitizeUser(parsed);
        if (user && user.role === 'admin') {
          const sessionLoggedAt = sessionStorage.getItem('pe_admin_session_logged_at');
          const passUpdatedAt = localStorage.getItem('pe_admin_password_updated_at');
          if (sessionLoggedAt && passUpdatedAt) {
            if (new Date(passUpdatedAt).getTime() > new Date(sessionLoggedAt).getTime()) {
              clearLegacyAdminSessions();
              return null;
            }
          }
        }
        return user;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return browserNotifications.getPermissionStatus();
  });

  const [hasCertifiedBadge, setHasCertifiedBadge] = useState<boolean>(() => {
    return localStorage.getItem('pe_certified_badge') === 'true';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('pe_theme');
    if (!saved) {
      localStorage.setItem('pe_theme', 'light');
      return 'light';
    }
    return (saved as 'dark' | 'light') || 'light';
  });

  const [criteria, setCriteria] = useState<Criterion[]>(() => db.getCriteria());
  const [profiles, setProfiles] = useState<JobProfile[]>(() => db.getProfiles());
  const [employees, setEmployees] = useState<Employee[]>(() => db.getEmployees());
  const [evaluations, setEvaluations] = useState<Evaluation[]>(() => db.getEvaluations());
  const [archivedEvaluations, setArchivedEvaluations] = useState<Evaluation[]>(() => db.getArchivedEvaluations());

  const notifyDataSaved = useCallback(() => {
    setSaveIndicator(true);
    const t = setTimeout(() => setSaveIndicator(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // Multi-tab and multi-device real-time synchronization listener
  useEffect(() => {
    const unsubscribe = db.subscribe((key, data) => {
      if (key === 'pe_criteria') setCriteria(data || db.getCriteria());
      else if (key === 'pe_profiles') setProfiles(data || db.getProfiles());
      else if (key === 'pe_employees') setEmployees(data || db.getEmployees());
      else if (key === 'pe_evaluations') setEvaluations(data || db.getEvaluations());
      else if (key === 'pe_archived_evaluations') setArchivedEvaluations(data || db.getArchivedEvaluations());
      notifyDataSaved();
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pe_criteria') setCriteria(db.getCriteria());
      else if (e.key === 'pe_profiles') setProfiles(db.getProfiles());
      else if (e.key === 'pe_employees') setEmployees(db.getEmployees());
      else if (e.key === 'pe_evaluations') setEvaluations(db.getEvaluations());
      else if (e.key === 'pe_archived_evaluations') setArchivedEvaluations(db.getArchivedEvaluations());
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, [notifyDataSaved]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const handleLogin = async (emp: Employee) => {
    const sanitized = sanitizeUser(emp);
    if (!sanitized) return;
    sessionStorage.setItem('pe_session_user', JSON.stringify(sanitized));
    if (sanitized.role === 'admin') {
      sessionStorage.setItem('pe_admin_session_logged_at', new Date().toISOString());
    }
    setCurrentUser(sanitized);

    // Force fresh state pull from cloud on login to ensure cross-browser consistency
    try {
      await db.pullStateFromCloud();
      setCriteria(db.getCriteria());
      setProfiles(db.getProfiles());
      setEmployees(db.getEmployees());
      setEvaluations(db.getEvaluations());
      setArchivedEvaluations(db.getArchivedEvaluations());
    } catch (e) {
      console.warn('Post-login cloud refresh notice:', e);
    }
    
    if (sanitized.role === 'employee') {
      setCurrentTab('my-evaluation');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    clearLegacyAdminSessions();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  const handleForceAdminReauth = useCallback(() => {
    clearLegacyAdminSessions();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  }, []);

  const handleSwitchUser = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      handleLogin(emp);
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pe_theme', next);
      return next;
    });
  };

  const handleAddCriterion = (crit: Omit<Criterion, 'id'>): boolean => {
    const valResult = validateCriterionInput(crit);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return false;
    }
    const validated = valResult.data;
    const exists = criteria.some(c => c.code.trim().toUpperCase() === validated.code.trim().toUpperCase());
    if (exists) return false;
    db.addCriterion(validated);
    setCriteria(db.getCriteria());
    notifyDataSaved();
    return true;
  };

  const handleUpdateCriterion = (id: string, crit: Omit<Criterion, 'id'>): boolean => {
    const valResult = validateCriterionInput(crit);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return false;
    }
    const validated = valResult.data;
    const isDuplicate = criteria.some(c => c.code.trim().toUpperCase() === validated.code.trim().toUpperCase() && c.id !== id);
    if (isDuplicate) return false;
    db.updateCriterion(id, validated);
    setCriteria(db.getCriteria());
    notifyDataSaved();
    return true;
  };

  const handleDeleteCriterion = (id: string) => {
    const res = db.deleteCriterion(id);
    if (res.success) {
      setCriteria(db.getCriteria());
      setProfiles(db.getProfiles());
      setEvaluations(db.getEvaluations());
      notifyDataSaved();
    }
  };

  const handleAddProfile = (prof: Omit<JobProfile, 'id'>) => {
    const valResult = validateJobProfileInput(prof);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return;
    }
    db.addProfile(valResult.data);
    setProfiles(db.getProfiles());
    notifyDataSaved();
  };

  const handleUpdateProfile = (id: string, prof: Omit<JobProfile, 'id'>) => {
    const valResult = validateJobProfileInput(prof);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return;
    }
    db.updateProfile(id, valResult.data);
    setProfiles(db.getProfiles());
    notifyDataSaved();
  };

  const handleDeleteProfile = (id: string) => {
    const res = db.deleteProfile(id, true);
    if (!res.success) {
      alert(res.error || 'خطا در حذف پروفایل شغلی.');
      return;
    }
    setProfiles(db.getProfiles());
    setEmployees(db.getEmployees());
    notifyDataSaved();
  };

  const handleToggleLockProfile = (id: string) => {
    const prof = profiles.find(p => p.id === id);
    if (prof) {
      db.updateProfile(id, { ...prof, locked: !prof.locked });
      setProfiles(db.getProfiles());
      notifyDataSaved();
    }
  };

  const handleAddEmployee = (emp: Omit<Employee, 'id'>) => {
    const valResult = validateEmployeeInput(emp);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return;
    }
    const { employee: newEmp, evaluation } = db.addEmployee(valResult.data);
    setEmployees(db.getEmployees());
    if (evaluation) {
      setEvaluations(db.getEvaluations());
    }
    notifyDataSaved();
  };

  const handleUpdateEmployee = (id: string, emp: Omit<Employee, 'id'>) => {
    const valResult = validateEmployeeInput(emp);
    if (!valResult.success) {
      alert(valResult.errors.join('\n'));
      return;
    }
    db.updateEmployee(id, valResult.data);
    setEmployees(db.getEmployees());
    notifyDataSaved();
  };

  const handleDeleteEmployee = (id: string) => {
    const success = db.deleteEmployee(id);
    if (success) {
      setEmployees(db.getEmployees());
      setEvaluations(db.getEvaluations());
      notifyDataSaved();
    }
  };

  const handleAddEvaluation = (empId: string, period: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const prof = profiles.find(p => p.id === emp.profileId) || profiles[0];
    if (!prof) return;
    const initialScores = (prof.items || []).map(item => ({ cid: item.cid, weight: item.weight, value: 0, self: 0, doc: '' }));
    const newEval: Evaluation = {
      id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      empId,
      profileId: prof.id,
      period,
      status: 'draft',
      scores: initialScores,
      created: Date.now()
    };
    const updated = [...evaluations, newEval];
    db.saveEvaluations(updated);
    setEvaluations(updated);
    setActiveEvalId(newEval.id);
    setCurrentTab('evaluations');
    notifyDataSaved();
  };

  const handleUpdateEvaluation = (id: string, updatedEv: Evaluation) => {
    setEvaluations(prev => {
      const exists = prev.some(e => e.id === id);
      const next = exists ? prev.map(e => e.id === id ? updatedEv : e) : [...prev, updatedEv];
      db.saveEvaluations(next);
      return next;
    });
    notifyDataSaved();
  };

  const handleDeleteEvaluation = (id: string) => {
    const updated = evaluations.filter(e => e.id !== id);
    db.saveEvaluations(updated);
    setEvaluations(updated);
    if (activeEvalId === id) setActiveEvalId(null);
    notifyDataSaved();
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'داشبورد جامع مدیریت عملکرد';
      case 'workflow': return 'مدیریت فرآیند و گردش‌کار';
      case 'criteria': return 'بانک شاخص‌های عملکرد (KPI)';
      case 'profiles': return 'پروفایل‌های شغلی و اوزان';
      case 'employees': return 'مدیریت پرسنل و دسترسی‌ها';
      case 'evaluations': return 'ثبت و پایش ارزیابی‌ها';
      case 'calibration': return 'کالیبراسیون و انطباق نمرات';
      case 'reports': return 'گزارشات و ماتریس ۹ خانه';
      case 'lattice-hub': return 'هاب اهداف و نتایج کلیدی (Lattice)';
      case 'kickidler-hub': return 'پایش بهره‌وری و زمان مفید (Kickidler)';
      case 'onboarding': return 'مرکز آشناسازی و آموزش';
      case 'my-evaluation': return 'کارتابل ارزیابی من';
      case 'settings': return 'مرکز مدیریت و امنیت';
      default: return 'سامانه مدیریت عملکرد';
    }
  };

  if (!currentUser) {
    return <Login employees={employees} onLogin={handleLogin} theme={theme} />;
  }

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden font-sans text-right transition-colors duration-300 relative ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`} dir="rtl">
      
      {/* Mobile Header */}
      <header className={`md:hidden flex items-center justify-between px-4 py-3 border-b z-30 shrink-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl bg-slate-800/20 text-teal-400 hover:bg-slate-800/40 transition-colors cursor-pointer" aria-label="منو">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-black tracking-tight">{getTabTitle(currentTab)}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Cloudflare Live Sync Pulse */}
          <button
            type="button"
            onClick={() => db.forceSyncNow()}
            className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border ${
              syncStatus.isSyncing 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : syncStatus.isConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title="وضعیت همگام‌سازی ابری با کلادفلر (برای بروزرسانی کلیک کنید)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
          </button>

          <button 
            type="button" 
            onClick={() => setIsManualModalOpen(true)} 
            className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors cursor-pointer"
            title="کتابچه راهنما"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <SupervisorNotificationBell
            evaluations={evaluations}
            employees={employees}
            currentUser={currentUser}
            onNavigate={setCurrentTab}
            theme={theme}
          />
          <button type="button" onClick={handleToggleTheme} className="p-1.5 rounded-xl bg-slate-800/20 text-slate-400 hover:text-slate-200 cursor-pointer">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Cloudflare Remote Changes Toast Alert */}
      {cloudSyncToast && (
        <div className="fixed top-16 left-6 z-50 p-3.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4 border border-teal-400">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{cloudSyncToast}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onChangeTab={(tab) => { setCurrentTab(tab); if (tab !== 'evaluations') setActiveEvalId(null); }}
        currentUser={currentUser} 
        onLogout={handleLogout} 
        theme={theme} 
        onToggleTheme={handleToggleTheme}
        hasCertifiedBadge={hasCertifiedBadge} 
        employees={employees} 
        onSwitchUser={handleSwitchUser}
        onStartTour={() => setCurrentTab('onboarding')}
        onOpenManual={() => setIsManualModalOpen(true)}
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Stage */}
      <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950/60' : 'bg-slate-100/40'}`}>
        {/* Desktop Header */}
        <div className={`hidden md:flex items-center justify-between px-6 py-2.5 border-b sticky top-0 z-20 backdrop-blur-md ${
          theme === 'dark' ? 'bg-slate-950/85 border-slate-800/80' : 'bg-white/85 border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-tight">{getTabTitle(currentTab)}</span>
            <span className="text-[11px] text-slate-500 font-medium">| شرکت اصفهان چالاک</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Cloudflare Status Indicator */}
            <div 
              onClick={() => db.forceSyncNow()}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                syncStatus.isSyncing 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : syncStatus.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
              title="برای همگام‌سازی فوری با کلادفلر کلیک کنید"
            >
              <span className={`w-2 h-2 rounded-full ${syncStatus.isSyncing ? 'bg-amber-400 animate-spin' : syncStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px]">
                {syncStatus.isSyncing ? 'در حال همگام‌سازی...' : syncStatus.isConnected ? 'همگام با کلادفلر' : 'آفلاین (محلی)'}
              </span>
              <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            </div>

            {saveIndicator && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full animate-fade-in border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> ذخیره شد
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 text-xs font-bold transition-all cursor-pointer"
              title="کتابچه راهنما"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>کتابچه راهنما</span>
            </button>

            <SupervisorNotificationBell
              evaluations={evaluations}
              employees={employees}
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              theme={theme}
            />

            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-1.5 rounded-xl bg-slate-800/20 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentTab === 'dashboard' && (
              <Dashboard 
                criteria={criteria} 
                profiles={profiles} 
                employees={employees} 
                evaluations={evaluations} 
                onNavigate={setCurrentTab} 
                onSelectEvaluation={(id) => { setActiveEvalId(id); setCurrentTab('evaluations'); }} 
                currentUser={currentUser} 
                hasCertifiedBadge={hasCertifiedBadge} 
                theme={theme} 
              />
            )}
            {currentTab === 'workflow' && (
              <WorkflowManager 
                currentUser={currentUser} 
                evaluations={evaluations} 
                employees={employees} 
                profiles={profiles} 
                criteria={criteria} 
                onUpdateEvaluation={handleUpdateEvaluation} 
                onBulkUpdateEvaluations={(evs) => { setEvaluations(evs); db.saveEvaluations(evs); }}
                onSelectEvaluation={(id) => { setActiveEvalId(id); setCurrentTab('evaluations'); }}
                onDeleteEvaluation={handleDeleteEvaluation}
                theme={theme} 
              />
            )}
            {currentTab === 'criteria' && (
              <CriteriaBank 
                criteria={criteria} 
                onAddCriterion={handleAddCriterion} 
                onUpdateCriterion={handleUpdateCriterion} 
                onDeleteCriterion={handleDeleteCriterion} 
                employees={employees} 
                profiles={profiles} 
                evaluations={evaluations} 
                onUpdateEvaluations={setEvaluations} 
                theme={theme} 
              />
            )}
            {currentTab === 'profiles' && (
              <JobProfiles 
                profiles={profiles} 
                criteria={criteria} 
                onAddProfile={handleAddProfile} 
                onUpdateProfile={handleUpdateProfile} 
                onDeleteProfile={handleDeleteProfile} 
                onToggleLockProfile={handleToggleLockProfile} 
                onAddCriterion={handleAddCriterion} 
                theme={theme} 
                currentUser={currentUser} 
              />
            )}
            {currentTab === 'employees' && (
              <Employees 
                employees={employees} 
                profiles={profiles} 
                onAddEmployee={handleAddEmployee} 
                onUpdateEmployee={handleUpdateEmployee} 
                onDeleteEmployee={handleDeleteEmployee} 
                onStartEvaluation={(empId) => handleAddEvaluation(empId, 'دوره بهار ۱۴۰۳')} 
                theme={theme} 
              />
            )}
            {currentTab === 'evaluations' && (
              <Evaluations 
                evaluations={evaluations} 
                employees={employees} 
                profiles={profiles} 
                criteria={criteria} 
                onAddEvaluation={handleAddEvaluation} 
                onUpdateEvaluation={handleUpdateEvaluation} 
                onDeleteEvaluation={handleDeleteEvaluation} 
                activeEvalId={activeEvalId} 
                onSetActiveEval={setActiveEvalId} 
                currentUser={currentUser} 
              />
            )}
            {currentTab === 'calibration' && (
              <Calibration 
                evaluations={evaluations} 
                employees={employees} 
                profiles={profiles} 
                onUpdateEvaluation={handleUpdateEvaluation} 
                onSelectEvaluation={(id) => { setActiveEvalId(id); setCurrentTab('evaluations'); }} 
              />
            )}
            {currentTab === 'reports' && (
              <Reports 
                evaluations={evaluations} 
                employees={employees} 
                profiles={profiles} 
                criteria={criteria} 
                onDeleteEvaluation={handleDeleteEvaluation} 
                onSelectEvaluation={(id) => { setActiveEvalId(id); setCurrentTab('evaluations'); }} 
                onNavigate={setCurrentTab} 
                currentUser={currentUser} 
              />
            )}
            {currentTab === 'lattice-hub' && (
              <LatticePerformanceHub 
                currentUser={currentUser} 
                employees={employees} 
                theme={theme} 
                onNavigate={setCurrentTab} 
              />
            )}
            {currentTab === 'kickidler-hub' && (
              <KickidlerProductivityHub 
                currentUser={currentUser} 
                employees={employees} 
                theme={theme} 
                onNavigate={setCurrentTab} 
              />
            )}
            {currentTab === 'onboarding' && (
              <Onboarding 
                currentUser={currentUser} 
                onComplete={() => setCurrentTab(currentUser.role === 'employee' ? 'my-evaluation' : 'dashboard')} 
                hasCertifiedBadge={hasCertifiedBadge} 
                onGrantBadge={() => setHasCertifiedBadge(true)} 
                theme={theme} 
              />
            )}
            {currentTab === 'my-evaluation' && (
              <MyEvaluation 
                currentUser={currentUser} 
                evaluations={evaluations} 
                profiles={profiles} 
                criteria={criteria} 
                onUpdateEvaluation={handleUpdateEvaluation} 
                onAddEvaluation={handleAddEvaluation} 
                theme={theme} 
              />
            )}
            {currentTab === 'settings' && (
              currentUser.role === 'admin' ? (
                <ManagementCenter 
                  employees={employees} 
                  profiles={profiles} 
                  criteria={criteria} 
                  evaluations={evaluations} 
                  archivedEvaluations={archivedEvaluations} 
                  onSetEmployees={setEmployees} 
                  onSetProfiles={setProfiles} 
                  onSetCriteria={setCriteria} 
                  onSetEvaluations={setEvaluations} 
                  onSetArchivedEvaluations={setArchivedEvaluations} 
                  currentUser={currentUser} 
                  theme={theme} 
                  onForceReauth={handleForceAdminReauth} 
                />
              ) : (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    {/* FIXED BUG: Lock icon is safely imported and available */}
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-rose-300">دسترسی محدود است</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    این بخش اختصاص به مدیر ارشد منابع انسانی دارد.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      <ComprehensiveManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        theme={theme}
        currentUser={currentUser}
        employees={employees}
      />
    </div>
  );
}
