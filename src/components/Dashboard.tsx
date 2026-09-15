/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Clock, 
  Activity,
  Award,
  CalendarDays,
  ChevronLeft,
  BookOpen,
  Sparkles,
  ArrowLeft,
  Target,
  Plus,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Criterion, JobProfile, Employee, Evaluation, CYCLE_STEPS, getGrade, GRADE_DETAILS } from '../types';
import SmartGrowthAnalytics from './SmartGrowthAnalytics';
import RadarChartD3, { CompetencyDimensionData } from './RadarChartD3';
import SupervisorNotificationBell from './SupervisorNotificationBell';
import CalendarWidget from './CalendarWidget';
import { db } from '../utils/db';

interface DashboardProps {
  criteria: Criterion[];
  profiles: JobProfile[];
  employees: Employee[];
  evaluations: Evaluation[];
  onNavigate: (tab: string) => void;
  onSelectEvaluation?: (id: string) => void;
  currentUser: Employee;
  hasCertifiedBadge: boolean;
  theme?: 'dark' | 'light';
}

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const topCardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 22
    }
  }
};

export default function Dashboard({ 
  criteria, 
  profiles, 
  employees, 
  evaluations, 
  onNavigate,
  onSelectEvaluation,
  currentUser,
  hasCertifiedBadge,
  theme = 'light'
}: DashboardProps) {
  const [selectedCycleStep, setSelectedCycleStep] = useState<number>(4);

  interface WorkshopTarget {
    id: string;
    empId: string;
    title: string;
    targetValue: string;
    deadline: string;
    coachingNote: string;
    status: 'pending' | 'achieved';
  }

  const [targets, setTargets] = useState<WorkshopTarget[]>(() => {
    const saved = localStorage.getItem('pe_workshop_targets');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'tgt-1',
        empId: 'emp-2',
        title: 'کاهش عدم‌انطباق ابعادی قطعه QC',
        targetValue: 'زیر ۰.۵ درصد ضایعات',
        deadline: '۱۴۰۴/۰۸/۳۰',
        coachingNote: 'استفاده مداوم از شابلون و گیج‌های کالیبره قبل از تراشکاری نهایی',
        status: 'pending'
      },
      {
        id: 'tgt-2',
        empId: 'emp-3',
        title: 'تسریع زمان تعویض قالب (SMED)',
        targetValue: 'رسیدن به زیر ۳۵ دقیقه',
        deadline: '۱۴۰۴/۰۸/۱۵',
        coachingNote: 'چیدمان پیش‌دستانه ابزارها قبل از اتمام بچ فعلی',
        status: 'achieved'
      }
    ];
  });

  React.useEffect(() => {
    db.saveWorkshopTargets(targets);
  }, [targets]);

  React.useEffect(() => {
    const unsub = db.subscribe((key, data) => {
      if (key === 'pe_workshop_targets' && Array.isArray(data)) {
        setTargets(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    });
    return unsub;
  }, []);

  const [newTargetEmpId, setNewTargetEmpId] = useState<string>('');
  const [newTargetTitle, setNewTargetTitle] = useState<string>('');
  const [newTargetValue, setNewTargetValue] = useState<string>('');
  const [newTargetDeadline, setNewTargetDeadline] = useState<string>('');
  const [newTargetCoachingNote, setNewTargetCoachingNote] = useState<string>('');

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetEmpId || !newTargetTitle || !newTargetValue || !newTargetDeadline) return;
    const newTgt: WorkshopTarget = {
      id: `tgt-${Math.random().toString(36).substring(2, 9)}`,
      empId: newTargetEmpId,
      title: newTargetTitle,
      targetValue: newTargetValue,
      deadline: newTargetDeadline,
      coachingNote: newTargetCoachingNote,
      status: 'pending'
    };
    setTargets([...targets, newTgt]);
    setNewTargetEmpId('');
    setNewTargetTitle('');
    setNewTargetValue('');
    setNewTargetDeadline('');
    setNewTargetCoachingNote('');
  };

  const handleToggleTargetStatus = (id: string) => {
    setTargets(targets.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'achieved' : 'pending' } : t));
  };

  const handleDeleteTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const isOnboarded = localStorage.getItem(`pe_onboarded_${currentUser.id}`) === 'true';

  const totalCriteria = criteria.length;
  const totalProfiles = profiles.length;
  const totalEmployees = employees.length;

  const calculateScore = (ev: Evaluation) => {
    const scoredItems = (ev.scores || []).filter(s => (s.value || 0) > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + (curr.weight || 1), 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + ((curr.value || 0) * (curr.weight || 1)), 0);
    const avg = weightedSum / totalWeight;
    const score100 = avg > 5 ? Math.min(100, avg) : Math.min(100, avg * 20);
    return Math.round(score100 * 10) / 10;
  };

  const scoredEvals = evaluations.filter(e => calculateScore(e) > 0);
  const finalEvals = evaluations.filter(e => e.status === 'locked' || e.status === 'calibrated');
  const statsEvals = finalEvals.length > 0 ? finalEvals : scoredEvals;

  const avgPerformance = statsEvals.length 
    ? Math.round(statsEvals.reduce((sum, e) => sum + calculateScore(e), 0) / statsEvals.length * 10) / 10
    : 0;

  const [radarEmpId, setRadarEmpId] = useState<string>('all');

  const getCompetencyRadarData = (): CompetencyDimensionData[] => {
    const relevantEvals = radarEmpId === 'all' 
      ? evaluations 
      : evaluations.filter(e => e.empId === radarEmpId);

    const dims: {
      key: 'K' | 'Q' | 'B' | 'S' | 'L';
      label: string;
      shortLabel: string;
      count: number;
      sum: number;
      selfSum: number;
      selfCount: number;
      target: number;
    }[] = [
      { key: 'K', label: 'عملکرد کمی', shortLabel: 'K - کمی', count: 0, sum: 0, selfSum: 0, selfCount: 0, target: 4.2 },
      { key: 'Q', label: 'شایستگی کیفی', shortLabel: 'Q - کیفی', count: 0, sum: 0, selfSum: 0, selfCount: 0, target: 4.5 },
      { key: 'B', label: 'شایستگی رفتاری', shortLabel: 'B - رفتاری', count: 0, sum: 0, selfSum: 0, selfCount: 0, target: 4.0 },
      { key: 'S', label: 'ایمنی و HSE', shortLabel: 'S - ایمنی', count: 0, sum: 0, selfSum: 0, selfCount: 0, target: 4.8 },
      { key: 'L', label: 'رهبری و تیمی', shortLabel: 'L - تیمی', count: 0, sum: 0, selfSum: 0, selfCount: 0, target: 4.1 },
    ];

    relevantEvals.forEach(ev => {
      (ev.scores || []).forEach(s => {
        const crit = criteria.find(c => c.id === s.cid || c.code === s.cid);
        if (crit) {
          const cat = crit.cat || 'K';
          const dim = dims.find(d => d.key === cat) || dims[0];
          const rawVal = s.value || 0;
          const val5 = rawVal > 5 ? Math.min(5, rawVal / 20) : rawVal;
          if (val5 > 0) {
            dim.sum += val5;
            dim.count += 1;
          }
          if (s.self && s.self > 0) {
            const rawSelf = s.self;
            const selfVal5 = rawSelf > 5 ? Math.min(5, rawSelf / 20) : rawSelf;
            dim.selfSum += selfVal5;
            dim.selfCount += 1;
          }
        }
      });
    });

    return dims.map(d => ({
      key: d.key,
      label: d.label,
      shortLabel: d.shortLabel,
      actual: d.count > 0 ? Math.round((d.sum / d.count) * 10) / 10 : (radarEmpId === 'all' ? 3.8 : 3.5),
      target: d.target,
      self: d.selfCount > 0 ? Math.round((d.selfSum / d.selfCount) * 10) / 10 : undefined,
      description: d.label
    }));
  };

  const distribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  statsEvals.forEach(ev => {
    const score = calculateScore(ev);
    if (score > 0) {
      const grade = getGrade(score);
      distribution[grade]++;
    }
  });

  const maxDist = Math.max(1, ...Object.values(distribution));

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">داشبورد جامع مدیریت عملکرد</h1>
          <p className="text-sm text-slate-400 mt-1">سامانه ارزیابی عملکرد و مربیگری هوشمند - شرکت اصفهان چالاک</p>
        </div>
        <div className="flex items-center gap-3">
          <SupervisorNotificationBell
            evaluations={evaluations}
            employees={employees}
            currentUser={currentUser}
            onNavigate={onNavigate}
            theme={theme}
          />
          <div className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span>دوره فعال: دوره بهار ۱۴۰۳</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          </div>
        </div>
      </div>

      {(!isOnboarded || (!hasCertifiedBadge && currentUser.role !== 'employee')) && (
        <div className="bg-gradient-to-r from-teal-500/15 via-indigo-500/5 to-transparent border border-teal-500/25 rounded-2xl p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400 animate-bounce" />
              <h3 className="text-sm font-black text-slate-100">
                {currentUser.role !== 'employee' 
                  ? 'مرور راهنمای ارزیابی و اخذ نشان ارزیاب رسمی'
                  : 'آشناسازی با فرآیند خودارزیابی و اهداف کارگاهی'
                }
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentUser.role !== 'employee'
                ? 'با شرکت در آزمون کوتاه شایستگی، نشان ارزیاب رسمی کارخانه را دریافت کنید و از قوانین ضد سوگیری مطلع شوید.'
                : 'راهنمای گام‌به‌گام نحوه ثبت خودارزیابی، تعامل با سرپرست و تنظیم برنامه توسعه فردی را مطالعه فرمایید.'
              }
            </p>
          </div>
          <button
            onClick={() => onNavigate('onboarding')}
            className="shrink-0 bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold px-4.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-500/20 hover:scale-[1.02] cursor-pointer relative z-10 self-start md:self-auto"
          >
            <BookOpen className="w-4 h-4" />
            <span>ورود به دوره آشناسازی</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Cards Grid */}
      <motion.div 
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div 
          variants={topCardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400">بانک شاخص‌های مصوب</p>
              <p className="text-3xl font-black text-slate-100 mt-2">{totalCriteria}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">شاخص‌های کمی (KPI)، کیفی و ایمنی</p>
        </motion.div>

        <motion.div 
          variants={topCardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400">پروفایل‌های شغلی</p>
              <p className="text-3xl font-black text-slate-100 mt-2">{totalProfiles}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">ماتریس اوزان مشاغل کارگاهی</p>
        </motion.div>

        <motion.div 
          variants={topCardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400">پرسنل تحت پوشش</p>
              <p className="text-3xl font-black text-slate-100 mt-2">{totalEmployees}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">خطوط تولید و تضمین کیفیت</p>
        </motion.div>

        <motion.div 
          variants={topCardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400">میانگین عملکرد کل</p>
              <p className="text-3xl font-black text-slate-100 mt-2">
                {avgPerformance > 0 ? `${avgPerformance} ٪` : 'در انتظار ثبت'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">بر مبنای ارزیابی‌های نهایی دوره</p>
        </motion.div>
      </motion.div>

      <SmartGrowthAnalytics 
        evaluations={evaluations}
        employees={employees}
        profiles={profiles}
        criteria={criteria}
        onSelectEvaluation={onSelectEvaluation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-200">توازن شایستگی‌ها (D3)</h3>
              </div>
              
              <select
                value={radarEmpId}
                onChange={(e) => setRadarEmpId(e.target.value)}
                className="text-[11px] font-bold bg-slate-900 border border-slate-700 text-teal-300 px-2.5 py-1 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="all">میانگین کارخانه (کل)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>پرسنل: {emp.name} ({emp.unit})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center py-2">
              <RadarChartD3 
                data={getCompetencyRadarData()}
                width={320}
                height={290}
                theme="dark"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* 6-step cycle overview */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-200">چرخه جامع مدیریت عملکرد (۶ گام اجرایی)</h3>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {CYCLE_STEPS.map((step) => {
                const isSelected = selectedCycleStep === step.step;
                return (
                  <button
                    key={step.step}
                    onClick={() => setSelectedCycleStep(step.step)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-b from-teal-500/10 to-indigo-500/5 border-teal-500/60 text-teal-300' 
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] mb-2 ${
                      isSelected ? 'bg-teal-400 text-slate-900' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {step.step}
                    </span>
                    <span className="text-[10px] font-bold leading-tight line-clamp-2">{step.title}</span>
                  </button>
                );
              })}
            </div>

            {selectedCycleStep && (
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 text-xs leading-relaxed text-slate-300">
                <div className="flex items-center gap-2 mb-2 text-teal-300 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>گام {selectedCycleStep}: {CYCLE_STEPS[selectedCycleStep-1].title}</span>
                </div>
                <p className="text-slate-400 mb-3">{CYCLE_STEPS[selectedCycleStep-1].desc}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(currentUser.role === 'supervisor' || currentUser.role === 'admin') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-6"
        >
          <CalendarWidget
            currentUser={currentUser}
            evaluations={evaluations}
            onNavigate={onNavigate}
            theme={theme}
          />
        </motion.div>
      )}
    </div>
  );
}
