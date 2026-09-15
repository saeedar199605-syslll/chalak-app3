/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calculator, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  HelpCircle,
  Play,
  RotateCcw,
  Sliders,
  Table,
  UserCheck,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  Criterion, 
  Employee, 
  Evaluation, 
  JobProfile, 
  KpiCalculationType, 
  KpiVariableDefinition,
  KpiScoreThresholds 
} from '../types';
import { 
  calculateKpiScore, 
  safeEvaluateMath, 
  DEFAULT_KPI_THRESHOLDS, 
  DEFAULT_INVERSE_THRESHOLDS 
} from '../utils/formulaEngine';

interface KpiFormulaEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: Criterion[];
  onAddCriterion: (crit: Omit<Criterion, 'id'>) => boolean;
  onUpdateCriterion: (id: string, crit: Omit<Criterion, 'id'>) => boolean;
  employees: Employee[];
  profiles: JobProfile[];
  evaluations: Evaluation[];
  onUpdateEvaluations: (nextEvals: Evaluation[]) => void;
  theme?: 'dark' | 'light';
}

export default function KpiFormulaEngineModal({
  isOpen,
  onClose,
  criteria,
  onAddCriterion,
  onUpdateCriterion,
  employees,
  profiles,
  evaluations,
  onUpdateEvaluations,
  theme = 'dark'
}: KpiFormulaEngineModalProps) {
  const [activeTab, setActiveTab] = useState<'define' | 'calculate' | 'batch'>('define');

  const [kpiCode, setKpiCode] = useState('KPI-PRD-01');
  const [kpiName, setKpiName] = useState('');
  const [kpiDef, setKpiDef] = useState('');
  const [kpiCat, setKpiCat] = useState<'K' | 'Q' | 'B' | 'S' | 'L'>('K');
  const [kpiDir, setKpiDir] = useState<'more' | 'less'>('more');
  const [calcType, setCalcType] = useState<KpiCalculationType>('ratio');
  const [customFormula, setCustomFormula] = useState('(actual / target) * 100');
  const [kpiUnit, setKpiUnit] = useState('درصد');
  const [targetVal, setTargetVal] = useState<number>(100);

  const [variables, setVariables] = useState<KpiVariableDefinition[]>([
    { key: 'actual', label: 'تولید واقعی', unit: 'عدد', defaultValue: 95 },
    { key: 'target', label: 'هدف تولید', unit: 'عدد', defaultValue: 100 }
  ]);

  const [thresholds, setThresholds] = useState<KpiScoreThresholds>({
    score5: 105,
    score4: 95,
    score3: 85,
    score2: 70
  });

  const [testValues, setTestValues] = useState<Record<string, number>>({
    actual: 98,
    target: 100
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedKpiId, setSelectedKpiId] = useState<string>(() => {
    const kpi = criteria.find(c => c.calculationType || c.code.startsWith('K'));
    return kpi?.id || criteria[0]?.id || '';
  });
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => employees[0]?.id || '');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('دوره بهار ۱۴۰۳');
  const [dataInputs, setDataInputs] = useState<Record<string, number>>({});

  const activeSelectedKpi = useMemo(() => {
    return criteria.find(c => c.id === selectedKpiId) || criteria[0];
  }, [criteria, selectedKpiId]);

  React.useEffect(() => {
    if (!activeSelectedKpi) return;
    const initial: Record<string, number> = {};
    if (activeSelectedKpi.variables && activeSelectedKpi.variables.length > 0) {
      activeSelectedKpi.variables.forEach(v => {
        initial[v.key] = v.defaultValue ?? 100;
      });
    } else {
      initial['actual'] = 95;
      initial['target'] = 100;
    }
    setDataInputs(initial);
  }, [activeSelectedKpi]);

  const singleCalculationResult = useMemo(() => {
    if (!activeSelectedKpi) return null;
    return calculateKpiScore(activeSelectedKpi, dataInputs);
  }, [activeSelectedKpi, dataInputs]);

  const sandboxKpiDummy: Criterion = useMemo(() => {
    return {
      id: 'dummy',
      code: kpiCode,
      name: kpiName || 'شاخص نمونه',
      cat: kpiCat,
      def: kpiDef,
      dir: kpiDir,
      calculationType: calcType,
      formulaExpression: customFormula,
      variables,
      unit: kpiUnit,
      targetValue: targetVal,
      scoreThresholds: thresholds
    };
  }, [kpiCode, kpiName, kpiCat, kpiDef, kpiDir, calcType, customFormula, variables, kpiUnit, targetVal, thresholds]);

  const sandboxResult = useMemo(() => {
    return calculateKpiScore(sandboxKpiDummy, testValues);
  }, [sandboxKpiDummy, testValues]);

  if (!isOpen) return null;

  const handleCalcTypeChange = (type: KpiCalculationType) => {
    setCalcType(type);
    if (type === 'ratio') {
      setCustomFormula('(actual / target) * 100');
      setKpiDir('more');
      setKpiUnit('درصد');
      setVariables([
        { key: 'actual', label: 'تولید واقعی', unit: 'عدد', defaultValue: 95 },
        { key: 'target', label: 'هدف تولید', unit: 'عدد', defaultValue: 100 }
      ]);
      setTestValues({ actual: 98, target: 100 });
      setThresholds(DEFAULT_KPI_THRESHOLDS);
    } else if (type === 'inverse_ratio') {
      setCustomFormula('(standard / actual) * 100');
      setKpiDir('more');
      setKpiUnit('درصد');
      setVariables([
        { key: 'actual', label: 'زمان واقعی چرخه', unit: 'ثانیه', defaultValue: 58 },
        { key: 'standard', label: 'زمان استاندارد', unit: 'ثانیه', defaultValue: 60 }
      ]);
      setTestValues({ actual: 58, standard: 60 });
      setThresholds(DEFAULT_KPI_THRESHOLDS);
    } else if (type === 'defect_rate') {
      setCustomFormula('100 - ((scrap / total) * 100)');
      setKpiDir('more');
      setKpiUnit('درصد کیفیت');
      setVariables([
        { key: 'scrap', label: 'تعداد قطعات ضایعاتی', unit: 'عدد', defaultValue: 3 },
        { key: 'total', label: 'کل قطعات بازرسی‌شده', unit: 'عدد', defaultValue: 100 }
      ]);
      setTestValues({ scrap: 2, total: 100 });
      setThresholds(DEFAULT_KPI_THRESHOLDS);
    } else if (type === 'custom_formula') {
      setCustomFormula('(actual / target) * 80 + (quality_score * 0.2)');
      setVariables([
        { key: 'actual', label: 'تولید واقعی', unit: 'عدد', defaultValue: 90 },
        { key: 'target', label: 'هدف تولید', unit: 'عدد', defaultValue: 100 },
        { key: 'quality_score', label: 'نمره کیفی بازرسی', unit: 'نمره', defaultValue: 98 }
      ]);
      setTestValues({ actual: 95, target: 100, quality_score: 98 });
    }
  };

  const handleAddVariable = () => {
    const nextKey = `var_${variables.length + 1}`;
    const newVar: KpiVariableDefinition = {
      key: nextKey,
      label: `متغیر ${variables.length + 1}`,
      unit: 'واحد',
      defaultValue: 10
    };
    setVariables([...variables, newVar]);
    setTestValues({ ...testValues, [nextKey]: 10 });
  };

  const handleRemoveVariable = (index: number) => {
    const toRemove = variables[index];
    setVariables(variables.filter((_, i) => i !== index));
    const nextTest = { ...testValues };
    delete nextTest[toRemove.key];
    setTestValues(nextTest);
  };

  const handleAppendToFormula = (token: string) => {
    setCustomFormula(prev => prev ? `${prev} ${token} ` : token);
  };

  const handleSaveKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiCode.trim() || !kpiName.trim()) {
      setFeedback({ type: 'error', message: 'کد و عنوان شاخص الزامی است.' });
      return;
    }

    const newCrit: Omit<Criterion, 'id'> = {
      code: kpiCode.trim().toUpperCase(),
      name: kpiName.trim(),
      cat: kpiCat,
      def: kpiDef.trim() || `تعریف شاخص ${kpiName}`,
      dir: kpiDir,
      calculationType: calcType,
      formulaExpression: customFormula.trim(),
      variables: variables,
      unit: kpiUnit,
      targetValue: targetVal,
      scoreThresholds: thresholds,
      source: 'محاسبه خودکار سیستم',
      method: `فرمول: ${customFormula}`
    };

    const success = onAddCriterion(newCrit);
    if (success) {
      setFeedback({ type: 'success', message: `شاخص ${kpiName} با موفقیت در بانک ثبت گردید.` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: 'کد شاخص تکراری است.' });
    }
  };

  const handleApplySingleScore = () => {
    if (!singleCalculationResult || !activeSelectedKpi) return;
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) {
      setFeedback({ type: 'error', message: 'کارمندی انتخاب نشده است.' });
      return;
    }

    let targetEval = evaluations.find(ev => ev.empId === selectedEmpId && ev.period === selectedPeriod);
    let nextEvaluations = [...evaluations];

    if (!targetEval) {
      const prof = profiles.find(p => p.id === emp.profileId) || profiles[0];
      const initialScores = (prof?.items || []).map(item => ({
        cid: item.cid,
        weight: item.weight,
        value: item.cid === activeSelectedKpi.id ? singleCalculationResult.score : 0,
        self: 0,
        doc: item.cid === activeSelectedKpi.id ? singleCalculationResult.summaryText : ''
      }));

      if (!initialScores.some(s => s.cid === activeSelectedKpi.id)) {
        initialScores.push({
          cid: activeSelectedKpi.id,
          weight: 15,
          value: singleCalculationResult.score,
          self: 0,
          doc: singleCalculationResult.summaryText
        });
      }

      const newEv: Evaluation = {
        id: `eval-${Math.random().toString(36).substring(2, 9)}`,
        empId: selectedEmpId,
        profileId: prof?.id || 'prof-1',
        period: selectedPeriod,
        status: 'draft',
        scores: initialScores,
        created: Date.now()
      };
      nextEvaluations.push(newEv);
    } else {
      const updatedScores = [...targetEval.scores];
      const scoreIndex = updatedScores.findIndex(s => s.cid === activeSelectedKpi.id);
      if (scoreIndex >= 0) {
        updatedScores[scoreIndex] = {
          ...updatedScores[scoreIndex],
          value: singleCalculationResult.score,
          doc: `${updatedScores[scoreIndex].doc ? updatedScores[scoreIndex].doc + ' | ' : ''}${singleCalculationResult.summaryText}`
        };
      } else {
        updatedScores.push({
          cid: activeSelectedKpi.id,
          weight: 15,
          value: singleCalculationResult.score,
          self: 0,
          doc: singleCalculationResult.summaryText
        });
      }

      nextEvaluations = nextEvaluations.map(ev => ev.id === targetEval!.id ? {
        ...ev,
        scores: updatedScores
      } : ev);
    }

    onUpdateEvaluations(nextEvaluations);
    setFeedback({
      type: 'success',
      message: `نمره ${singleCalculationResult.score} برای ${emp.name} ثبت شد.`
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className={`p-5 md:px-7 border-b flex items-center justify-between shrink-0 ${
          theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">موتور فرمول‌نویسی و محاسبه خودکار نمرات شاخص‌ها (KPI)</h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  v3.8 Dynamic Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعریف فرمول‌های پویا، جدول حدود آستانه و تبدیل خودکار داده‌های خام تولید به مقیاس ۱ تا ۵
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/40 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('define')}
            className={`py-3 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'define'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>تعریف شاخص با فرمول اختصاصی</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calculate')}
            className={`py-3 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'calculate'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>ورود داده و محاسبه نمره کارمند</span>
          </button>
        </div>

        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'define' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-5">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-4">
                  <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>اطلاعات عمومی شاخص</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">کد شاخص (یکتا)</label>
                      <input
                        type="text"
                        value={kpiCode}
                        onChange={(e) => setKpiCode(e.target.value)}
                        placeholder="مثال: KPI-PRD-01"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">دسته شایستگی</label>
                      <select
                        value={kpiCat}
                        onChange={(e) => setKpiCat(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="K">K - عملکرد کمی (KPI)</option>
                        <option value="Q">Q - شایستگی کیفی</option>
                        <option value="B">B - شایستگی رفتاری</option>
                        <option value="S">S - ایمنی و HSE</option>
                        <option value="L">L - رهبری و تیمی</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">عنوان کامل شاخص</label>
                    <input
                      type="text"
                      value={kpiName}
                      onChange={(e) => setKpiName(e.target.value)}
                      placeholder="مثال: راندمان تولید سلول رباتیک"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">تعریف و نحوه سنجش</label>
                    <textarea
                      rows={2}
                      value={kpiDef}
                      onChange={(e) => setKpiDef(e.target.value)}
                      placeholder="توضیح هدف و کاربرد این شاخص در خط..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      <span>فرمول ریاضی محاسبه</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400">جهت مطلوبیت:</span>
                      <button
                        type="button"
                        onClick={() => setKpiDir(kpiDir === 'more' ? 'less' : 'more')}
                        className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
                          kpiDir === 'more' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {kpiDir === 'more' ? 'بیشتر مطلوب‌تر' : 'کمتر مطلوب‌تر'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCalcTypeChange('ratio')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        calcType === 'ratio'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-black'
                          : 'border-slate-800 hover:bg-slate-800/40 text-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[11px] font-bold">راندمان ساده</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">(actual/target)*100</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcTypeChange('inverse_ratio')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        calcType === 'inverse_ratio'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-black'
                          : 'border-slate-800 hover:bg-slate-800/40 text-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[11px] font-bold">معکوس (زمان چرخه)</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">(standard/actual)*100</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcTypeChange('defect_rate')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        calcType === 'defect_rate'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-black'
                          : 'border-slate-800 hover:bg-slate-800/40 text-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[11px] font-bold">نرخ کیفیت / عیوب</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">100 - (scrap/total)*100</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcTypeChange('custom_formula')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        calcType === 'custom_formula'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-black'
                          : 'border-slate-800 hover:bg-slate-800/40 text-slate-400 text-xs'
                      }`}
                    >
                      <div className="text-[11px] font-bold">فرمول سفارشی</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">ترکیب دلخواه متغیرها</div>
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      عبارت فرمول (از نام متغیرها و عملگرهای ریاضی استفاده نمایید):
                    </label>
                    <input
                      type="text"
                      value={customFormula}
                      onChange={(e) => setCustomFormula(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 ml-2">درج سریع:</span>
                    {['+', '-', '*', '/', '(', ')', '%'].map(op => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => handleAppendToFormula(op)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-mono font-bold cursor-pointer"
                      >
                        {op}
                      </button>
                    ))}
                    {variables.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleAppendToFormula(v.key)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono font-bold cursor-pointer"
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">مدیریت متغیرهای ورودی این فرمول:</span>
                      <button
                        type="button"
                        onClick={handleAddVariable}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        افزودن متغیر جدید
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {variables.map((v, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                          <input
                            type="text"
                            value={v.key}
                            onChange={(e) => {
                              const updated = [...variables];
                              updated[idx].key = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                              setVariables(updated);
                            }}
                            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-emerald-300"
                            placeholder="نام کلید (key)"
                            dir="ltr"
                          />
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => {
                              const updated = [...variables];
                              updated[idx].label = e.target.value;
                              setVariables(updated);
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                            placeholder="عنوان نمایشی فارسی"
                          />
                          <input
                            type="text"
                            value={v.unit || ''}
                            onChange={(e) => {
                              const updated = [...variables];
                              updated[idx].unit = e.target.value;
                              setVariables(updated);
                            }}
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs"
                            placeholder="واحد"
                          />
                          {variables.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariable(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveKpi}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>ثبت و انتشار شاخص در بانک شاخص‌ها</span>
                </button>
              </div>

              <div className="lg:col-span-5 space-y-5">
                <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      <span>تست فرمول در محیط زنده (Sandbox Simulation)</span>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {variables.map(v => (
                      <div key={v.key} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">{v.key}</span>
                          <span className="text-xs text-slate-300 font-bold">{v.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={testValues[v.key] ?? v.defaultValue ?? 0}
                            onChange={(e) => setTestValues({ ...testValues, [v.key]: Number(e.target.value) })}
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-left font-mono font-bold focus:outline-none focus:border-emerald-500"
                            dir="ltr"
                          />
                          <span className="text-[10px] text-slate-500">{v.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">مقدار محاسبه‌شده:</span>
                      <span className="text-lg font-black font-mono text-teal-400">
                        {sandboxResult.computedValue} {kpiUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs font-bold text-slate-300">نمره نهایی متناظر (۱ تا ۵):</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black font-mono px-3 py-0.5 rounded-xl ${
                          sandboxResult.score >= 4
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : sandboxResult.score === 3
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}>
                          {sandboxResult.score}
                        </span>
                        <span className="text-xs font-bold text-slate-400">از ۵</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="font-bold text-slate-200">وضعیت: </span>
                      <span className={sandboxResult.score >= 4 ? 'text-emerald-400' : 'text-amber-400'}>
                        {sandboxResult.statusLabel}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">{sandboxResult.summaryText}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                  <h3 className="text-xs font-black text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <span>حدود آستانه نمره‌دهی (Thresholds)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-bold text-emerald-400">نمره ۵ (عالی)</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">حداقل:</span>
                        <input
                          type="number"
                          value={thresholds.score5}
                          onChange={(e) => setThresholds({ ...thresholds, score5: Number(e.target.value) })}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-bold text-teal-400">نمره ۴ (خوب)</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">حداقل:</span>
                        <input
                          type="number"
                          value={thresholds.score4}
                          onChange={(e) => setThresholds({ ...thresholds, score4: Number(e.target.value) })}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calculate' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-xs font-black text-emerald-300">محاسبه و ثبت بی‌درنگ نمره در پرونده ارزیابی</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      با وارد کردن اعداد واقعی تولید، نمره فرمول محاسبه شده و مستقیماً به ارزیابی همکار تزریق می‌شود.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">انتخاب شاخص:</label>
                  <select
                    value={selectedKpiId}
                    onChange={(e) => setSelectedKpiId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {criteria.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name} {c.formulaExpression ? '(فرمول‌دار)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">انتخاب کارمند:</label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.code}) - {e.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">دوره ارزیابی:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="دوره بهار ۱۴۰۳">دوره بهار ۱۴۰۳ (فعال)</option>
                    <option value="شش ماهه دوم ۱۴۰۴">شش ماهه دوم ۱۴۰۴</option>
                  </select>
                </div>
              </div>

              {activeSelectedKpi && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-7 p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-xs font-black text-slate-200">
                          ورودی‌های عددی شاخص: {activeSelectedKpi.name}
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-2 py-1 rounded font-mono text-slate-300">
                        {activeSelectedKpi.code}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(activeSelectedKpi.variables && activeSelectedKpi.variables.length > 0) ? (
                        activeSelectedKpi.variables.map(v => (
                          <div key={v.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <div className="text-xs font-bold text-slate-200">{v.label}</div>
                              <div className="text-[10px] font-mono text-slate-500">{v.key}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={dataInputs[v.key] ?? v.defaultValue ?? 0}
                                onChange={(e) => setDataInputs({ ...dataInputs, [v.key]: Number(e.target.value) })}
                                className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-left focus:outline-none focus:border-emerald-500"
                                dir="ltr"
                              />
                              <span className="text-xs text-slate-400 w-12">{v.unit}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <div className="text-xs font-bold text-slate-200">مقدار واقعی (Actual)</div>
                            </div>
                            <input
                              type="number"
                              value={dataInputs['actual'] ?? 95}
                              onChange={(e) => setDataInputs({ ...dataInputs, actual: Number(e.target.value) })}
                              className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-left"
                              dir="ltr"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <div>
                              <div className="text-xs font-bold text-slate-200">مقدار هدف (Target)</div>
                            </div>
                            <input
                              type="number"
                              value={dataInputs['target'] ?? 100}
                              onChange={(e) => setDataInputs({ ...dataInputs, target: Number(e.target.value) })}
                              className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-left"
                              dir="ltr"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-5 p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center space-y-2">
                        <div className="text-2xl font-black font-mono text-teal-400">
                          {singleCalculationResult?.computedValue ?? 0} {activeSelectedKpi.unit || '%'}
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-3">
                          <span className="text-xs font-bold text-slate-300">نمره کسب‌شده:</span>
                          <span className="text-3xl font-black font-mono text-emerald-400 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            {singleCalculationResult?.score ?? 3}
                          </span>
                          <span className="text-xs text-slate-400">از ۵</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-bold pt-1">
                          {singleCalculationResult?.statusLabel}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplySingleScore}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ثبت نمره محاسبه‌شده در ارزیابی پرسنل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${
          theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
