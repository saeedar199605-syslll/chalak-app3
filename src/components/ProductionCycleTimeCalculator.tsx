/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  AlertTriangle, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Plus, 
  Sparkles, 
  Info, 
  Layers, 
  Award, 
  ChevronDown, 
  RotateCcw, 
  Check, 
  TrendingUp, 
  Percent, 
  Timer, 
  Factory 
} from 'lucide-react';
import { Employee, Evaluation, Criterion, JobProfile } from '../types';
import { 
  calculateProductionMetrics, 
  applyProductionMetricsToEvaluation, 
  ProductionInputParams, 
  ProductionCalculationResult 
} from '../utils/productionCalculations';

interface ProductionCycleTimeCalculatorProps {
  employees: Employee[];
  criteria: Criterion[];
  profiles: JobProfile[];
  evaluations: Evaluation[];
  onUpdateEvaluations: (evals: Evaluation[]) => void;
  currentUser?: Employee | null;
  onClose?: () => void;
}

export default function ProductionCycleTimeCalculator({
  employees,
  criteria,
  profiles,
  evaluations,
  onUpdateEvaluations,
  currentUser,
  onClose
}: ProductionCycleTimeCalculatorProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [period, setPeriod] = useState<string>('دوره بهار ۱۴۰۳');
  const [producedUnits, setProducedUnits] = useState<number>(12500);
  const [targetUnits, setTargetUnits] = useState<number>(12000);
  const [actualCycleTimeSec, setActualCycleTimeSec] = useState<number>(42);
  const [standardCycleTimeSec, setStandardCycleTimeSec] = useState<number>(45);
  const [scrapUnits, setScrapUnits] = useState<number>(95);
  const [workingHours, setWorkingHours] = useState<number>(160);
  const [downtimeHours, setDowntimeHours] = useState<number>(4.5);
  const [operatorNotes, setOperatorNotes] = useState<string>('');

  const [submitFeedback, setSubmitFeedback] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const [batchText, setBatchText] = useState<string>('');
  const [batchFeedback, setBatchFeedback] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  const calculationResult: ProductionCalculationResult = useMemo(() => {
    return calculateProductionMetrics({
      empCode: selectedEmp?.code || '',
      empName: selectedEmp?.name,
      period,
      producedUnits,
      targetUnits,
      actualCycleTimeSec,
      standardCycleTimeSec,
      scrapUnits,
      workingHours,
      downtimeHours,
      notes: operatorNotes
    });
  }, [
    selectedEmp,
    period,
    producedUnits,
    targetUnits,
    actualCycleTimeSec,
    standardCycleTimeSec,
    scrapUnits,
    workingHours,
    downtimeHours,
    operatorNotes
  ]);

  const handleApplySingleEvaluation = () => {
    if (!selectedEmp) {
      setSubmitFeedback({ success: false, message: 'کارمندی انتخاب نشده است.' });
      return;
    }

    const empProfile = profiles.find(p => p.id === selectedEmp.profileId) || profiles[0];
    const profileId = empProfile ? empProfile.id : 'prof-default';

    let targetEval = evaluations.find(ev => ev.empId === selectedEmp.id && ev.period === period);
    const isNew = !targetEval;

    if (!targetEval) {
      const initialScores = empProfile ? empProfile.items.map(item => ({
        cid: item.cid,
        weight: item.weight,
        value: 0,
        self: 0,
        doc: ''
      })) : criteria.slice(0, 5).map(c => ({
        cid: c.id,
        weight: 20,
        value: 0,
        self: 0,
        doc: ''
      }));

      targetEval = {
        id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        empId: selectedEmp.id,
        profileId,
        period,
        status: 'draft',
        scores: initialScores,
        created: Date.now()
      };
    }

    const updatedEval = applyProductionMetricsToEvaluation(
      targetEval,
      criteria,
      calculationResult,
      {
        empCode: selectedEmp.code,
        empName: selectedEmp.name,
        period,
        producedUnits,
        targetUnits,
        actualCycleTimeSec,
        standardCycleTimeSec,
        scrapUnits,
        workingHours,
        downtimeHours,
        notes: operatorNotes
      }
    );

    let nextEvaluations: Evaluation[];
    if (isNew) {
      nextEvaluations = [updatedEval, ...evaluations];
    } else {
      nextEvaluations = evaluations.map(ev => ev.id === updatedEval.id ? updatedEval : ev);
    }

    onUpdateEvaluations(nextEvaluations);
    setSubmitFeedback({
      success: true,
      message: `شاخص‌های تولیدی برای ${selectedEmp.name} در ${period} با موفقیت ثبت و محاسبه شدند.`,
      details: `راندمان: ${calculationResult.efficiencyRate}٪ | نمره زمان چرخه: ${calculationResult.cycleTimeScore}/5 | نمره ضایعات: ${calculationResult.scrapScore}/5 | نمره کل: ${calculationResult.overallKpiScore} از ۵`
    });

    setTimeout(() => {
      setSubmitFeedback(null);
    }, 6000);
  };

  const handleProcessBatchCSV = () => {
    if (!batchText.trim()) {
      setBatchFeedback({ success: false, message: 'لطفاً داده‌های متنی را وارد کنید.' });
      return;
    }

    const lines = batchText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let processedCount = 0;
    let nextEvals = [...evaluations];

    lines.forEach((line, idx) => {
      if (idx === 0 && (line.includes('کد') || line.includes('Code') || line.includes('نام') || line.includes('پرسنل'))) {
        return;
      }

      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) return;

      const codeOrName = parts[0];
      const rowPeriod = parts[1] || period;
      const prod = Number(parts[2]) || 0;
      const target = Number(parts[3]) || (prod > 0 ? prod : 10000);
      const actualCycle = Number(parts[4]) || 40;
      const stdCycle = Number(parts[5]) || 45;
      const scrap = Number(parts[6]) || 0;
      const workHrs = Number(parts[7]) || 160;
      const downHrs = Number(parts[8]) || 0;

      const emp = employees.find(e => 
        e.code.toLowerCase() === codeOrName.toLowerCase() ||
        e.name.toLowerCase() === codeOrName.toLowerCase() ||
        e.id === codeOrName
      );
      if (!emp) return;

      const calc = calculateProductionMetrics({
        empCode: emp.code,
        empName: emp.name,
        period: rowPeriod,
        producedUnits: prod,
        targetUnits: target,
        actualCycleTimeSec: actualCycle,
        standardCycleTimeSec: stdCycle,
        scrapUnits: scrap,
        workingHours: workHrs,
        downtimeHours: downHrs
      });

      const empProfile = profiles.find(p => p.id === emp.profileId) || profiles[0];
      const profileId = empProfile ? empProfile.id : 'prof-default';

      let targetEval = nextEvals.find(ev => ev.empId === emp.id && ev.period === rowPeriod);
      const isNew = !targetEval;

      if (!targetEval) {
        const initialScores = empProfile ? empProfile.items.map(item => ({
          cid: item.cid,
          weight: item.weight,
          value: 0,
          self: 0,
          doc: ''
        })) : [];

        targetEval = {
          id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          empId: emp.id,
          profileId,
          period: rowPeriod,
          status: 'draft',
          scores: initialScores,
          created: Date.now()
        };
      }

      const updated = applyProductionMetricsToEvaluation(
        targetEval,
        criteria,
        calc,
        {
          empCode: emp.code,
          empName: emp.name,
          period: rowPeriod,
          producedUnits: prod,
          targetUnits: target,
          actualCycleTimeSec: actualCycle,
          standardCycleTimeSec: stdCycle,
          scrapUnits: scrap,
          workingHours: workHrs,
          downtimeHours: downHrs
        }
      );

      if (isNew) {
        nextEvals.push(updated);
      } else {
        nextEvals = nextEvals.map(e => e.id === updated.id ? updated : e);
      }
      processedCount++;
    });

    onUpdateEvaluations(nextEvals);
    setBatchFeedback({
      success: true,
      message: `تعداد ${processedCount} رکورد با موفقیت پردازش و اعمال گردید.`,
      count: processedCount
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <Gauge className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100">
                موتور هوشمند محاسبه شاخص‌های تولید و زمان چرخه (Cycle Time)
              </h2>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                Auto-Calc Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              محاسبه خودکار راندمان، زمان تعویض قالب (SMED)، نرخ ضایعات و OEE و ثبت مستقیم در فرم ارزیابی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'single'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ثبت انفرادی
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'batch'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ورود دسته‌جمعی
          </button>
        </div>
      </div>

      {submitFeedback && (
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 animate-in fade-in ${
          submitFeedback.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{submitFeedback.message}</span>
          </div>
          {submitFeedback.details && (
            <p className="text-slate-300 text-[11px] font-mono pr-6">{submitFeedback.details}</p>
          )}
        </div>
      )}

      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">انتخاب کارمند:</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border bg-slate-900 border-slate-700 text-slate-100 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) - {emp.unit || 'خط تولید'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">دوره ارزیابی:</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="مثال: دوره بهار ۱۴۰۳"
                  className="w-full text-xs p-2.5 rounded-xl border bg-slate-900 border-slate-700 text-slate-100 font-bold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  تیراژ تولید قطعه
                </span>
                <span className="text-teal-400 font-mono text-[11px]">
                  راندمان: {calculationResult.efficiencyRate}٪
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">تولید واقعی (عدد):</label>
                  <input
                    type="number"
                    min="0"
                    value={producedUnits}
                    onChange={(e) => setProducedUnits(Number(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-emerald-400 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">هدف تولید (عدد):</label>
                  <input
                    type="number"
                    min="1"
                    value={targetUnits}
                    onChange={(e) => setTargetUnits(Number(e.target.value) || 1)}
                    className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-indigo-400" />
                  زمان چرخه تولید (Cycle Time)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">زمان واقعی (ثانیه):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={actualCycleTimeSec}
                    onChange={(e) => setActualCycleTimeSec(Number(e.target.value) || 1)}
                    className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-indigo-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">استاندارد چرخه (ثانیه):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={standardCycleTimeSec}
                    onChange={(e) => setStandardCycleTimeSec(Number(e.target.value) || 1)}
                    className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-slate-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">تعداد ضایعات:</label>
                <input
                  type="number"
                  min="0"
                  value={scrapUnits}
                  onChange={(e) => setScrapUnits(Number(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-rose-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">ساعت کارکرد:</label>
                <input
                  type="number"
                  min="1"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(Number(e.target.value) || 160)}
                  className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">توقف خط (ساعت):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={downtimeHours}
                  onChange={(e) => setDowntimeHours(Number(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-xl border bg-slate-950 border-slate-700 text-amber-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplySingleEvaluation}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>محاسبه و تزریق خودکار نمرات به فرم ارزیابی</span>
            </button>
          </div>

          <div className="lg:col-span-6 bg-slate-950/60 border border-teal-500/30 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  تحلیل زنده شاخص‌های محاسبه‌شده
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold">
                  {calculationResult.badgeLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">راندمان تولید:</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {calculationResult.efficiencyRate} ٪
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      نمره {calculationResult.productionScore} از ۵
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">بهبود زمان چرخه:</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {calculationResult.cycleTimeImprovementRate} ٪
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      نمره {calculationResult.cycleTimeScore} از ۵
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">نرخ ضایعات (PPM):</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-rose-400 font-mono">
                      {calculationResult.scrapRate} ٪
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      نمره {calculationResult.scrapScore} از ۵
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">اثربخشی کلی تجهیزات (OEE):</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-teal-400 font-mono">
                      {calculationResult.oeeRate} ٪
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      نمره {calculationResult.oeeScore} از ۵
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-200 block">
                    نمره ترکیبی کل شاخص‌های فنی
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {calculationResult.overallKpiScore} / ۵
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
