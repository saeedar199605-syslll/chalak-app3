/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  RotateCcw, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  HardDrive, 
  Zap, 
  Eye, 
  FileSpreadsheet, 
  FileJson, 
  Layers, 
  Calendar, 
  User, 
  Award, 
  ChevronLeft, 
  X, 
  ShieldCheck, 
  ArrowUpDown, 
  History, 
  Info 
} from 'lucide-react';
import { Evaluation, Employee, JobProfile, Criterion } from '../types';
import { 
  calculateArchiveStats, 
  archivePeriod, 
  archiveEvaluationById, 
  restoreArchivedPeriod, 
  restoreArchivedEvaluationById, 
  autoArchiveOldCycles, 
  exportArchivedEvaluationsToCSV, 
  detectPeriodsSummary, 
  getAutoArchiveSettings, 
  saveAutoArchiveSettings, 
  AutoArchiveSettings 
} from '../utils/archiveManager';

interface PerformanceArchiveVaultProps {
  activeEvaluations: Evaluation[];
  archivedEvaluations: Evaluation[];
  onSetEvaluations: (evals: Evaluation[]) => void;
  onSetArchivedEvaluations: (archived: Evaluation[]) => void;
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
  currentUser?: Employee | null;
  theme?: 'dark' | 'light';
  onAddLog?: (action: string, details: string, type: 'info' | 'warning' | 'success' | 'danger') => void;
}

export default function PerformanceArchiveVault({
  activeEvaluations,
  archivedEvaluations,
  onSetEvaluations,
  onSetArchivedEvaluations,
  employees,
  profiles,
  criteria,
  currentUser,
  theme = 'dark',
  onAddLog
}: PerformanceArchiveVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [inspectedEvaluation, setInspectedEvaluation] = useState<Evaluation | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const stats = useMemo(() => {
    return calculateArchiveStats(activeEvaluations, archivedEvaluations);
  }, [activeEvaluations, archivedEvaluations]);

  const activePeriodsSummary = useMemo(() => {
    return detectPeriodsSummary(activeEvaluations);
  }, [activeEvaluations]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.unit) set.add(e.unit); });
    return Array.from(set);
  }, [employees]);

  const archivedPeriodsList = useMemo(() => {
    const set = new Set<string>();
    archivedEvaluations.forEach(e => { if (e.period) set.add(e.period); });
    return Array.from(set);
  }, [archivedEvaluations]);

  const filteredArchivedRecords = useMemo(() => {
    return archivedEvaluations.filter(ev => {
      const emp = employees.find(e => e.id === ev.empId);
      const prof = profiles.find(p => p.id === ev.profileId);
      if (selectedPeriodFilter !== 'all' && ev.period !== selectedPeriodFilter) return false;
      if (selectedUnitFilter !== 'all' && emp?.unit !== selectedUnitFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesName = emp?.name?.toLowerCase().includes(term);
        const matchesCode = emp?.code?.toLowerCase().includes(term);
        const matchesTitle = prof?.title?.toLowerCase().includes(term);
        const matchesPeriod = ev.period?.toLowerCase().includes(term);
        const matchesUnit = emp?.unit?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesTitle && !matchesPeriod && !matchesUnit) return false;
      }
      return true;
    });
  }, [archivedEvaluations, employees, profiles, selectedPeriodFilter, selectedUnitFilter, searchTerm]);

  const handleAutoArchive = () => {
    const result = autoArchiveOldCycles(activeEvaluations, archivedEvaluations, 'دوره بهار ۱۴۰۳');
    if (result.movedCount === 0) {
      setFeedback({
        type: 'warning',
        message: 'موردی برای بایگانی خودکار یافت نشد.',
        details: 'تنها ارزیابی‌های قفل‌شده یا دوره‌های سپری‌شده به انبار سرد منتقل می‌شوند.'
      });
      return;
    }
    onSetEvaluations(result.nextActive);
    onSetArchivedEvaluations(result.nextArchived);
    const msg = `با موفقیت ${result.movedCount} ارزیابی از دوره‌های گذشته به انبار بایگانی منتقل شد.`;
    setFeedback({ type: 'success', message: msg });
    if (onAddLog) onAddLog('بایگانی خودکار', msg, 'success');
  };

  const handleArchiveSpecificPeriod = (periodName: string) => {
    if (!periodName) return;
    if (!window.confirm(`آیا از انتقال تمام پرونده‌های دوره ${periodName} به انبار بایگانی اطمینان دارید؟`)) return;
    const result = archivePeriod(periodName, activeEvaluations, archivedEvaluations);
    onSetEvaluations(result.nextActive);
    onSetArchivedEvaluations(result.nextArchived);
    const msg = `پرونده‌های دوره ${periodName} با موفقیت بایگانی شدند (${result.movedCount} فرم).`;
    setFeedback({ type: 'success', message: msg });
    if (onAddLog) onAddLog('بایگانی دوره', msg, 'info');
  };

  const handleRestoreSpecificPeriod = (periodName: string) => {
    if (!periodName) return;
    if (!window.confirm(`آیا مایلید تمام پرونده‌های دوره ${periodName} به لیست ارزیابی‌های فعال بازگردند؟`)) return;
    const result = restoreArchivedPeriod(periodName, activeEvaluations, archivedEvaluations);
    onSetEvaluations(result.nextActive);
    onSetArchivedEvaluations(result.nextArchived);
    const msg = `دوره ${periodName} به سامانه فعال بازگردانی شد (${result.restoredCount} فرم).`;
    setFeedback({ type: 'success', message: msg });
    if (onAddLog) onAddLog('بازیابی دوره از بایگانی', msg, 'info');
  };

  const handleRestoreEvaluation = (evalId: string) => {
    const target = archivedEvaluations.find(e => e.id === evalId);
    const emp = employees.find(e => e.id === target?.empId);
    const result = restoreArchivedEvaluationById(evalId, activeEvaluations, archivedEvaluations);
    onSetEvaluations(result.nextActive);
    onSetArchivedEvaluations(result.nextArchived);
    if (inspectedEvaluation?.id === evalId) {
      setInspectedEvaluation(null);
    }
    const msg = `ارزیابی همکار ${emp?.name || evalId} بازگردانده شد.`;
    setFeedback({ type: 'success', message: msg });
    if (onAddLog) onAddLog('بازیابی فرم', msg, 'info');
  };

  const handleExportCSV = () => {
    exportArchivedEvaluationsToCSV(filteredArchivedRecords, employees, profiles);
    if (onAddLog) onAddLog('خروجی بایگانی', `خروجی CSV از ${filteredArchivedRecords.length} فرم بایگانی‌شده`, 'info');
  };

  return (
    <div className="space-y-6 text-slate-100 text-right" dir="rtl">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <History className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-100">
                  انبار سرد و بایگانی سوابق دوره‌های گذشته (Performance History Vault)
                </h2>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
                  Isolated Cold Storage
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                جداسازی ارزیابی‌های گذشته جهت سبک‌سازی حافظه سیستم و امکان بازیابی آسان
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoArchive}
              className="bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-400 hover:to-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>بایگانی خودکار دوره‌های قبل</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={archivedEvaluations.length === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">ارزیابی‌های فعال در چرخه جاری:</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-teal-400 font-mono">
                {stats.activeCount}
              </span>
              <span className="text-[10px] text-slate-500">فرم</span>
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">پرونده‌های بایگانی‌شده:</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-indigo-400 font-mono">
                {stats.archivedCount}
              </span>
              <span className="text-[10px] text-slate-500">{stats.archivedPeriods.length} دوره</span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 animate-in fade-in flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          feedback.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
          'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
            {feedback.details && (
              <p className="text-[11px] text-slate-300 pr-6">{feedback.details}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Period-level controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300">انتقال دوره‌های فعال به بایگانی:</span>
            <div className="space-y-2">
              {activePeriodsSummary.map(item => (
                <div key={item.period} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{item.period}</span>
                    <span className="text-[10px] text-slate-400 mr-2 font-mono">
                      ({item.count} فرم {item.isCurrent ? '- دوره جاری' : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleArchiveSpecificPeriod(item.period)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>بایگانی</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300">بازگردانی دوره‌ها از بایگانی:</span>
            <div className="space-y-2">
              {archivedPeriodsList.map(periodName => {
                const countInPeriod = archivedEvaluations.filter(e => e.period === periodName).length;
                return (
                  <div key={periodName} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{periodName}</span>
                      <span className="text-[10px] text-slate-400 mr-2 font-mono">({countInPeriod} فرم)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreSpecificPeriod(periodName)}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>بازگردانی</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

