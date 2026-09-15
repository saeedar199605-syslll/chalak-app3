/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ClipboardCheck, 
  Plus, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Trash2,
  Brain,
  Award,
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  Search,
  Zap,
  ShieldAlert,
  Edit2,
  ThumbsUp,
  MessageSquareQuote,
  Check,
  Table as TableIcon,
  FileSpreadsheet,
  Calculator,
  GitFork
} from 'lucide-react';
import ExcelIntegrationCenter from './ExcelIntegrationCenter';
import AIFeedbackAssistant from './AIFeedbackAssistant';
import { calculateKpiScore, calculateMultiSourceCompositeScore } from '../utils/formulaEngine';
import { 
  Evaluation, 
  Employee, 
  JobProfile, 
  Criterion, 
  BiasAnalysisResult,
  BiasWarning,
  PERFORMANCE_SCALE, 
  NEED_DOCUMENT_SCORES, 
  SCALE_FACTOR, 
  getGrade, 
  GRADE_DETAILS,
  CYCLE_STEPS
} from '../types';
import { VirtualizedTable } from './VirtualizedTable';

const generateLocalCoachingFeedback = (
  employeeName: string,
  jobTitle: string,
  period: string,
  scores: any[],
  note: string,
  criteria: Criterion[]
): {
  strengths: string[];
  developmentAreas: string[];
  actionItems: string[];
  summary: string;
} => {
  const strengthsScores = scores.filter(s => s.value >= 4);
  const improvementsScores = scores.filter(s => s.value > 0 && s.value <= 3);

  const strengthsList: string[] = [];
  strengthsScores.forEach(s => {
    const crit = criteria.find(c => c.id === s.cid);
    if (crit) {
      strengthsList.push(`تسلط و تعهد بالا در شاخص ${crit.name} (نمره ارزیابی: ${s.value}): عملکرد بالاتر از حد انتظار و قابل تقدیر.`);
    }
  });
  if (strengthsList.length === 0) {
    strengthsList.push('پایبندی منظم به شیفت‌های کاری و رعایت ضوابط کارگاهی.');
  }

  const improvementsList: string[] = [];
  improvementsScores.forEach(s => {
    const crit = criteria.find(c => c.id === s.cid);
    if (crit) {
      improvementsList.push(`نیاز به تمرکز و ارتقا در شاخص ${crit.name} (نمره فعلی: ${s.value}): توصیه به بازبینی مجدد SOP و کاهش انحرافات.`);
    }
  });
  if (improvementsList.length === 0) {
    improvementsList.push('تلاش برای افزایش بازدهی و مشارکت در جلسات هم‌اندیشی کیفیت.');
  }

  const actionItemsList = [
    'تنظیم جلسه بازخورد دوطرفه با سرپرست مستقیم ظرف ۲ هفته آینده',
    'مرور دستورالعمل‌های کنترل کیفیت و استانداردهای ۵S کارگاه',
    'ثبت پیشنهادهای بهبود در سامانه ثبت رکوردهای MES'
  ];

  const summary = `عملکرد همکار ارجمند ${employeeName} در جایگاه شغلی ${jobTitle} در ${period} مورد بررسی دقیق قرار گرفت. ${note ? `بر اساس بازخورد ثبت‌شده سرپرست: "${note}"` : ''}`;

  return {
    strengths: strengthsList,
    developmentAreas: improvementsList,
    actionItems: actionItemsList,
    summary
  };
};

interface EvaluationsProps {
  evaluations: Evaluation[];
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
  onAddEvaluation: (empId: string, period: string) => void;
  onUpdateEvaluation: (id: string, ev: Evaluation) => void;
  onBulkUpdateEvaluations?: (evals: Evaluation[]) => void;
  onDeleteEvaluation: (id: string) => void;
  onBulkDeleteEvaluations?: (ids: string[]) => void;
  activeEvalId: string | null;
  onSetActiveEval: (id: string | null) => void;
  currentUser?: Employee | null;
}

export default function Evaluations({
  evaluations,
  employees,
  profiles,
  criteria,
  onAddEvaluation,
  onUpdateEvaluation,
  onBulkUpdateEvaluations,
  onDeleteEvaluation,
  onBulkDeleteEvaluations,
  activeEvalId,
  onSetActiveEval,
  currentUser
}: EvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newPeriod, setNewPeriod] = useState('دوره بهار ۱۴۰۳');
  const [selectedEvalIds, setSelectedEvalIds] = useState<Set<string>>(new Set());

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin' || currentUser?.code === 'ADMIN-001';

  const handleToggleSelectAll = () => {
    if (selectedEvalIds.size === filteredEvaluations.length) {
      setSelectedEvalIds(new Set());
    } else {
      setSelectedEvalIds(new Set(filteredEvaluations.map(e => e.id)));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedEvalIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEvalIds(next);
  };

  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const handleConfirmBulkDelete = () => {
    if (selectedEvalIds.size === 0) return;
    if (onBulkDeleteEvaluations) {
      onBulkDeleteEvaluations(Array.from(selectedEvalIds));
    } else {
      selectedEvalIds.forEach(id => onDeleteEvaluation(id));
    }
    setSelectedEvalIds(new Set());
    setIsBulkDeleteConfirmOpen(false);
  };

  const [isBiasModalOpen, setIsBiasModalOpen] = useState(false);
  const [biasLoading, setBiasLoading] = useState(false);
  const [biasResult, setBiasResult] = useState<BiasAnalysisResult | null>(null);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [quickCalcState, setQuickCalcState] = useState<{ scoreIndex: number; criterion: Criterion } | null>(null);
  const [quickCalcInputs, setQuickCalcInputs] = useState<Record<string, number>>({});

  const activeEval = evaluations.find(e => e.id === activeEvalId);
  const activeEmployee = employees.find(emp => emp?.id === activeEval?.empId);
  const activeProfile = profiles.find(p => p?.id === activeEval?.profileId);

  const handleOpenQuickCalc = (scoreIndex: number, criterion: Criterion) => {
    const initial: Record<string, number> = {};
    if (criterion.variables && criterion.variables.length > 0) {
      criterion.variables.forEach(v => {
        initial[v.key] = v.defaultValue ?? 100;
      });
    } else {
      initial['actual'] = 95;
      initial['target'] = criterion.targetValue || 100;
      initial['standard'] = 60;
      initial['scrap'] = 2;
      initial['total'] = 100;
    }
    setQuickCalcInputs(initial);
    setQuickCalcState({ scoreIndex, criterion });
  };

  const handleApplyQuickCalc = () => {
    if (!quickCalcState || !activeEval) return;
    const { scoreIndex, criterion } = quickCalcState;
    const result = calculateKpiScore(criterion, quickCalcInputs);
    
    const updatedScores = [...activeEval.scores];
    updatedScores[scoreIndex] = {
      ...updatedScores[scoreIndex],
      value: result.score,
      doc: `${updatedScores[scoreIndex].doc ? updatedScores[scoreIndex].doc + ' | ' : ''}${result.summaryText}`
    };
    onUpdateEvaluation(activeEval.id, { ...activeEval, scores: updatedScores });
    setQuickCalcState(null);
  };

  const handleOpenNewModal = () => {
    if (employees.length === 0) {
      alert('ابتدا باید در بخش پرسنل، کارمندان را تعریف کنید.');
      return;
    }
    setNewEmpId(employees[0].id);
    setNewPeriod('دوره بهار ۱۴۰۳');
    setIsNewModalOpen(true);
  };

  const handleCreateEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpId || !newPeriod) return;
    const emp = employees.find(x => x.id === newEmpId);
    if (!emp || !emp.profileId) {
      alert('این کارمند فاقد پروفایل شغلی است. ابتدا پروفایل او را مشخص کنید.');
      return;
    }
    const exists = evaluations.some(ev => ev.empId === newEmpId && ev.period === newPeriod);
    if (exists) {
      alert('برای این کارمند در این دوره ارزیابی از قبل فرم ثبت شده است.');
      return;
    }
    onAddEvaluation(newEmpId, newPeriod);
    setIsNewModalOpen(false);
  };

  const handleScoreChange = (scoreIndex: number, val: number) => {
    if (!activeEval || activeEval.status === 'locked') return;
    const updatedScores = [...activeEval.scores];
    const currentScoreItem = { ...updatedScores[scoreIndex] };
    const crit = criteria.find(c => c.id === currentScoreItem.cid);

    if (crit?.scoringSource === 'multi_source') {
      const currentBreakdown = currentScoreItem.sourceBreakdown || {};
      const updatedBreakdown = {
        ...currentBreakdown,
        supervisorScore: val
      };
      const comp = calculateMultiSourceCompositeScore(crit, updatedBreakdown);
      currentScoreItem.sourceBreakdown = updatedBreakdown;
      currentScoreItem.value = comp.score;
      if (!currentScoreItem.doc || currentScoreItem.doc.startsWith('ثبت خودکار') || currentScoreItem.doc.startsWith('سیستم MIS') || currentScoreItem.doc.startsWith('تردد کسری')) {
        currentScoreItem.doc = comp.docText;
      }
    } else {
      currentScoreItem.value = val;
    }
    updatedScores[scoreIndex] = currentScoreItem;
    onUpdateEvaluation(activeEval.id, { ...activeEval, scores: updatedScores });
  };

  const handleSelfScoreChange = (scoreIndex: number, val: number) => {
    if (!activeEval || activeEval.status === 'locked') return;
    const updatedScores = [...activeEval.scores];
    updatedScores[scoreIndex] = { ...updatedScores[scoreIndex], self: val };
    onUpdateEvaluation(activeEval.id, { ...activeEval, scores: updatedScores });
  };

  const handleDocChange = (scoreIndex: number, docVal: string) => {
    if (!activeEval || activeEval.status === 'locked') return;
    const updatedScores = [...activeEval.scores];
    updatedScores[scoreIndex] = { ...updatedScores[scoreIndex], doc: docVal };
    onUpdateEvaluation(activeEval.id, { ...activeEval, scores: updatedScores });
  };

  const handleNoteChange = (noteVal: string) => {
    if (!activeEval || activeEval.status === 'locked') return;
    onUpdateEvaluation(activeEval.id, { ...activeEval, note: noteVal });
  };

  const runBiasAudit = async (autoLockOnPass: boolean = false) => {
    if (!activeEval) return;
    setBiasLoading(true);

    const formattedScores = activeEval.scores.map(s => {
      const crit = criteria.find(c => c.id === s.cid);
      return {
        code: crit?.code || '',
        name: crit?.name || '',
        category: crit ? crit.cat : '',
        value: s.value,
        self: s.self,
        doc: s.doc || ''
      };
    });

    try {
      const response = await fetch('/api/gemini/bias-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: activeEmployee?.name || 'همکار',
          jobTitle: activeProfile?.title || 'پرسنل',
          period: activeEval.period,
          note: activeEval.note || '',
          scores: formattedScores
        })
      });

      if (!response.ok) {
        throw new Error('خطا در پاسخ سرویس');
      }

      const resData = await response.json();
      const auditResult: BiasAnalysisResult = {
        integrityScore: resData.integrityScore ?? 85,
        hasWarnings: resData.hasWarnings ?? false,
        biasesDetected: resData.biasesDetected ?? [],
        suggestedRevision: resData.suggestedRevision || '',
        coachingAdvice: resData.coachingAdvice || '',
        analyzedAt: new Date().toLocaleDateString('fa-IR')
      };

      setBiasResult(auditResult);
      onUpdateEvaluation(activeEval.id, { ...activeEval, biasAnalysis: auditResult });

      if (autoLockOnPass && !auditResult.hasWarnings && auditResult.integrityScore >= 90) {
        if (confirm(`امتیاز سلامت بازخورد ${auditResult.integrityScore}٪ بدون سوگیری شناسایی شد. آیا فرم قفل شود؟`)) {
          onUpdateEvaluation(activeEval.id, { ...activeEval, status: 'locked', biasAnalysis: auditResult });
        }
      } else {
        setIsBiasModalOpen(true);
      }
    } catch (err) {
      console.warn('Fallback local bias analysis...', err);
      const fallbackResult: BiasAnalysisResult = {
        integrityScore: 88,
        hasWarnings: activeEval.scores.every(s => s.value === 5),
        biasesDetected: activeEval.scores.every(s => s.value === 5) ? [{
          type: 'halo_horns',
          title: 'اثر هاله‌ای (Halo Effect)',
          severity: 'medium',
          description: 'کلیه نمرات در حداکثر سقف (۵ از ۵) ثبت شده‌اند که احتمال سوگیری ارفاق را نشان می‌دهد.',
          highlightSnippet: 'تمام نمرات ۵'
        }] : [],
        suggestedRevision: activeEval.note || 'عملکرد همکار رضایت‌بخش بوده و توصیه‌های مربیگری در دستور کار قرار دارد.',
        coachingAdvice: 'در فرم‌های نهایی ارزیابی، ذکر شواهد عینی برای نمرات حداکثری الزامی است.',
        analyzedAt: new Date().toLocaleDateString('fa-IR')
      };
      setBiasResult(fallbackResult);
      setIsBiasModalOpen(true);
    } finally {
      setBiasLoading(false);
    }
  };

  const handleApplySuggestedRevision = () => {
    if (!activeEval || !biasResult?.suggestedRevision) return;
    onUpdateEvaluation(activeEval.id, { ...activeEval, note: biasResult.suggestedRevision });
    alert('متن پیشنهادی هوش مصنوعی با موفقیت جایگزین شد.');
    setIsBiasModalOpen(false);
  };

  const handleGenerateAIFeedback = async () => {
    if (!activeEval) return;
    onUpdateEvaluation(activeEval.id, { ...activeEval, aiLoading: true });

    try {
      const formattedScores = activeEval.scores.map(s => {
        const crit = criteria.find(c => c.id === s.cid);
        return {
          code: crit?.code || '',
          name: crit?.name || '',
          category: crit ? crit.cat : '',
          weight: s.weight,
          value: s.value,
          self: s.self,
          doc: s.doc || ''
        };
      });

      const response = await fetch('/api/gemini/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: activeEmployee?.name || '',
          jobTitle: activeProfile?.title || '',
          period: activeEval.period,
          scores: formattedScores,
          note: activeEval.note || ''
        })
      });

      if (!response.ok) {
        throw new Error('خطا در پاسخ هوش مصنوعی.');
      }

      const data = await response.json();
      onUpdateEvaluation(activeEval.id, { 
        ...activeEval, 
        aiFeedback: data.feedback,
        aiLoading: false 
      });
    } catch (err) {
      console.warn('Backend API connection failed. Generating clean local coaching feedback...', err);
      const fallbackFeedback = generateLocalCoachingFeedback(
        activeEmployee?.name || 'همکار',
        activeProfile?.title || 'پرسنل فنی',
        activeEval.period,
        activeEval.scores,
        activeEval.note || '',
        criteria
      );
      
      onUpdateEvaluation(activeEval.id, { 
        ...activeEval, 
        aiFeedback: fallbackFeedback,
        aiLoading: false 
      });
    }
  };

  const calculateScore = (ev: Evaluation) => {
    const scoredItems = ev.scores.filter(s => s.value > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + (curr.value * curr.weight), 0);
    const avg5 = weightedSum / totalWeight;
    return Math.round(avg5 * SCALE_FACTOR * 10) / 10;
  };

  const finalScore = activeEval ? calculateScore(activeEval) : 0;
  const grade = finalScore > 0 ? getGrade(finalScore) : null;
  const gradeConfig = grade ? GRADE_DETAILS[grade] : null;

  const isFormComplete = activeEval?.scores.every(s => s.value > 0);
  const isDocSatisfied = activeEval?.scores.every(s => {
    if (NEED_DOCUMENT_SCORES.includes(s.value)) {
      return s.doc && s.doc.trim().length > 5;
    }
    return true;
  });

  const handleFinalizeAndLock = () => {
    if (!activeEval) return;
    if (!isFormComplete) {
      alert('تمام شاخص‌ها باید نمره‌دهی شده باشند.');
      return;
    }
    if (!isDocSatisfied) {
      alert('برای نمرات بحرانی (۱ و ۲) یا استثنایی (۵)، ثبت شواهد و مستندات الزامی است.');
      return;
    }
    runBiasAudit(true);
  };

  const filteredEvaluations = evaluations.filter(ev => {
    const emp = employees.find(e => e.id === ev.empId);
    const prof = profiles.find(p => p.id === ev.profileId);
    const q = searchTerm.toLowerCase();
    return (
      (emp?.name || '').toLowerCase().includes(q) ||
      (emp?.code || '').toLowerCase().includes(q) ||
      (emp?.unit || '').toLowerCase().includes(q) ||
      (prof?.title || '').toLowerCase().includes(q) ||
      (ev.period || '').toLowerCase().includes(q) ||
      (ev.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {!activeEvalId ? (
        <>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">فرم‌های ارزیابی عملکرد</h1>
              <p className="text-sm text-slate-400 mt-1">
                ثبت، پایش و قفل نتایج دوره‌ای بر اساس شواهد عینی، داده‌های سامانه MIS و تحلیل هوشمند
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 border border-slate-700 hover:border-teal-500/40 transition-all cursor-pointer shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>همگام‌سازی با اکسل (کسری / MIS)</span>
              </button>
              <button
                onClick={handleOpenNewModal}
                className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ایجاد ارزیابی جدید</span>
              </button>
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-4 rounded-2xl text-xs leading-relaxed">
            <h3 className="font-bold flex items-center gap-2 text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>قوانین استخراج شواهد و کاهش سوگیری (Anti-Bias Rules)</span>
            </h3>
            <p className="text-slate-300 mt-1.5">
              جهت رعایت اصول عدالت، برای نمرات <span className="text-red-400 font-bold">۱ (غیرقابل قبول)</span>، <span className="text-orange-400 font-bold">۲ (ضعیف)</span> و <span className="text-emerald-400 font-bold">۵ (عالی)</span>، درج شواهد مستند و عینی کارگاهی الزامی است.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در ارزیابی‌ها (نام، کد پرسنلی، واحد)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-750 font-mono">
                تعداد ارزیابی‌ها: {filteredEvaluations.length}
              </span>
            </div>
          </div>

          {selectedEvalIds.size > 0 && (
            <div className="bg-teal-950/40 border border-teal-500/30 p-3 rounded-2xl flex items-center justify-between animate-in fade-in flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-teal-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>{selectedEvalIds.size} ارزیابی انتخاب شده است</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف دسته‌جمعی ({selectedEvalIds.size} ارزیابی)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvalIds(new Set())}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          {filteredEvaluations.length > 0 ? (
            <VirtualizedTable<Evaluation>
              items={filteredEvaluations}
              rowHeight={64}
              containerHeight={520}
              keyExtractor={(ev) => ev.id}
              columns={[
                { 
                  header: (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={filteredEvaluations.length > 0 && selectedEvalIds.size === filteredEvaluations.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                        title="انتخاب همه"
                      />
                    </div>
                  ), 
                  className: 'w-12 text-center' 
                },
                { header: 'کارمند و پرسنلی', className: 'w-1/4 text-right' },
                { header: 'عنوان شغل و واحد', className: 'w-1/4 text-right' },
                { header: 'دوره ارزیابی', className: 'w-1/6 text-center' },
                { header: 'نمره کل (از ۱۰۰)', className: 'w-1/12 text-center' },
                { header: 'رتبه کیفی', className: 'w-1/8 text-center' },
                { header: 'وضعیت چرخه', className: 'w-1/8 text-center' },
                { header: 'عملیات', className: 'w-1/8 text-left' },
              ]}
              renderRow={(ev) => {
                const emp = employees.find(e => e.id === ev.empId);
                const prof = profiles.find(p => p.id === ev.profileId);
                const scoreVal = calculateScore(ev);
                const evGrade = scoreVal > 0 ? getGrade(scoreVal) : null;
                const gradeDetails = evGrade ? GRADE_DETAILS[evGrade] : null;

                return (
                  <div
                    key={ev.id}
                    className="flex items-center text-xs w-full py-1 text-slate-200"
                  >
                    <div className="w-12 text-center flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedEvalIds.has(ev.id)}
                        onChange={(e) => handleToggleSelect(ev.id, e)}
                        className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                    </div>
                    <div className="w-1/4 font-semibold text-slate-200 truncate">
                      {emp?.name || 'نامشخص'}
                      <span className="text-[10px] text-slate-500 font-mono block">{emp?.code}</span>
                    </div>
                    <div className="w-1/4 truncate">
                      <div className="font-medium text-slate-300 truncate">{prof?.title || 'عمومی'}</div>
                      <div className="text-[10px] text-slate-500 truncate">واحد: {emp?.unit || 'نامشخص'}</div>
                    </div>
                    <div className="w-1/6 text-center text-slate-400 font-mono text-[11px]">{ev.period}</div>
                    <div className="w-1/12 text-center font-bold text-slate-100 text-sm">
                      {scoreVal > 0 ? `${scoreVal} ٪` : '-'}
                    </div>
                    <div className="w-1/8 text-center">
                      {evGrade && gradeDetails ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-${gradeDetails.color}-500/10 text-${gradeDetails.color}-300 border border-${gradeDetails.color}-500/10`}>
                          {evGrade} - {gradeDetails.label}
                        </span>
                      ) : (
                        <span className="text-slate-500">ثبت‌نشده</span>
                      )}
                    </div>
                    <div className="w-1/8 text-center">
                      {ev.status === 'locked' ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                          قفل‌شده قطعی
                        </span>
                      ) : ev.status === 'calibrated' ? (
                        <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">
                          کالیبره‌شده
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                          پیش‌نویس
                        </span>
                      )}
                    </div>
                    <div className="w-1/8 text-left">
                      <div className="flex gap-1.5 justify-end items-center">
                        <button
                          onClick={() => onSetActiveEval(ev.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          {ev.status === 'locked' ? 'مشاهده فرم' : 'تکمیل ارزیابی'}
                        </button>
                        {(isAdmin || ev.status !== 'locked') && (
                          <button
                            onClick={() => setEvalToDelete(ev)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title={ev.status === 'locked' ? 'حذف ارزیابی (دسترسی ادمین)' : 'حذف ارزیابی'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="py-16 text-center text-slate-500 bg-slate-850/5 rounded-2xl border border-dashed border-slate-800">
              <ClipboardCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-base font-bold">هیچ ارزیابی با این مشخصات یافت نشد.</p>
              <p className="text-xs mt-1">با زدن دکمه «ایجاد ارزیابی جدید» فرآیند را آغاز کنید.</p>
            </div>
          )}
        </>
      ) : (
        /* 2. ACTIVE EVALUATION INTERACTIVE FORM */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-800/20 border border-slate-800/60 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 text-sm">
                {activeEmployee?.name[0]}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-100">{activeEmployee?.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeProfile?.title} | دوره: {activeEval.period}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEvalToDelete(activeEval)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
                  title="حذف این ارزیابی"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف فرم</span>
                </button>
              )}
              <button
                onClick={() => onSetActiveEval(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                بازگشت به لیست
              </button>
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between text-[11px] mb-2 font-bold text-slate-400">
              <span>گام جاری فرآیند:</span>
              <span className="text-teal-400">
                {activeEval.status === 'locked' ? 'خاتمه‌یافته و تصویب قطعی' : activeEval.status === 'calibrated' ? 'کالیبراسیون و انطباق سازمانی' : 'ارزیابی و بازخورد سرپرست'}
              </span>
            </div>
            
            <div className="grid grid-cols-6 gap-1 text-[10px] text-center font-medium">
              {CYCLE_STEPS.map((step) => {
                const isDone = activeEval.status === 'locked' || 
                              (activeEval.status === 'calibrated' && step.step <= 5) || 
                              (activeEval.status === 'draft' && step.step <= 4);
                return (
                  <div 
                    key={step.step}
                    className={`py-2 px-1 rounded-md border ${
                      isDone 
                        ? 'bg-teal-500/10 border-teal-500/20 text-teal-400 font-bold' 
                        : 'bg-slate-900/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div>{step.step}</div>
                    <div className="truncate text-[8px] md:text-[10px] mt-0.5">{step.title.split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">ثبت نمرات بر اساس مقیاس ۵ درجه‌ای رفتارنگار</h3>

            <div className="space-y-4">
              {activeEval.scores.map((score, idx) => {
                const crit = criteria.find(c => c.id === score.cid);
                if (!crit) return null;

                const isSpecial = NEED_DOCUMENT_SCORES.includes(score.value);
                const hasDoc = score.doc && score.doc.trim().length > 5;
                const docRequiredButEmpty = isSpecial && !hasDoc;

                return (
                  <div key={score.cid} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3.5 hover:border-slate-700/50 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 mt-0.5 ${
                          crit.cat === 'K' ? 'bg-blue-500/10 text-blue-300' :
                          crit.cat === 'Q' ? 'bg-amber-500/10 text-amber-300' :
                          crit.cat === 'B' ? 'bg-purple-500/10 text-purple-300' :
                          crit.cat === 'S' ? 'bg-red-500/10 text-red-300' :
                          'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {crit.code}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                            <span>{crit.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded">وزن: {score.weight} ٪</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-3xl">{crit.def}</p>
                          {crit.source && (
                            <p className="text-[9px] text-slate-500 mt-0.5 font-mono">منبع داده: {crit.source} | روش: {crit.method}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <label className="block text-[10px] text-slate-400 mb-1">خودارزیابی کارمند</label>
                        <select
                          disabled={activeEval.status === 'locked'}
                          value={score.self}
                          onChange={(e) => handleSelfScoreChange(idx, parseInt(e.target.value) || 0)}
                          className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-slate-200 focus:outline-none focus:border-teal-500"
                        >
                          <option value="0">ثبت نشده</option>
                          {[1, 2, 3, 4, 5].map(v => (
                            <option key={v} value={v}>{v} - {PERFORMANCE_SCALE[v]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <hr className="border-slate-800/40" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] text-slate-400 font-semibold">نمره ارزیابی سرپرست (۱ تا ۵):</label>
                          <button
                            type="button"
                            disabled={activeEval.status === 'locked'}
                            onClick={() => handleOpenQuickCalc(idx, crit)}
                            className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 bg-teal-500/10 hover:bg-teal-500/20 px-2 py-0.5 rounded-lg border border-teal-500/20 cursor-pointer transition-all"
                            title="محاسبه خودکار با فرمول"
                          >
                            <Calculator className="w-3 h-3 text-teal-400" />
                            <span>ماشین حساب شاخص</span>
                          </button>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isSelected = score.value === val;
                            let btnStyle = 'bg-slate-800 text-slate-400 border-slate-750 hover:bg-slate-750 hover:text-slate-200';
                            
                            if (isSelected) {
                              if (val === 1) btnStyle = 'bg-red-500 text-slate-950 border-red-400 font-bold';
                              else if (val === 2) btnStyle = 'bg-orange-500 text-slate-950 border-orange-400 font-bold';
                              else if (val === 3) btnStyle = 'bg-amber-400 text-slate-950 border-amber-300 font-bold';
                              else if (val === 4) btnStyle = 'bg-blue-400 text-slate-950 border-blue-300 font-bold';
                              else btnStyle = 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold';
                            }

                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={activeEval.status === 'locked'}
                                onClick={() => handleScoreChange(idx, val)}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs border text-center transition-all ${btnStyle} ${
                                  activeEval.status === 'locked' ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                title={PERFORMANCE_SCALE[val]}
                              >
                                <span className="block font-black text-xs">{val}</span>
                                <span className="text-[7px] leading-none block truncate mt-0.5">{PERFORMANCE_SCALE[val]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] text-slate-400 font-semibold">شواهد رفتاری و مستندات عینی:</label>
                          {docRequiredButEmpty && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded animate-pulse">
                              ثبت مستندات الزامی است
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          disabled={activeEval.status === 'locked'}
                          placeholder={isSpecial ? "شماره فرم، لاگ MES یا شواهد عینی (الزامی)..." : "شواهد یا توضیحات اختیاری..."}
                          value={score.doc || ''}
                          onChange={(e) => handleDocChange(idx, e.target.value)}
                          className={`w-full bg-slate-950 border rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none focus:border-teal-500 ${
                            docRequiredButEmpty ? 'border-red-500/40 focus:border-red-500' : 'border-slate-800'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">یادداشت جلسه مربیگری و گفتگوی عملکردی سرپرست</label>
              <textarea
                disabled={activeEval.status === 'locked'}
                placeholder="خلاصه گفتگوی مربیگری، توافقات توسعه فردی و نقاط قوت و قابل بهبود پرسنل را اینجا بنویسید..."
                value={activeEval.note || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
              />
              
              {activeEval.status !== 'locked' && (
                <div className="pt-2">
                  <AIFeedbackAssistant
                    supervisorComment={activeEval.note || ''}
                    employeeName={activeEmployee?.name || 'همکار'}
                    jobTitle={activeProfile?.title || 'پرسنل'}
                    competencyScores={{
                      K: activeEval.scores.find(s => criteria.find(c => c.id === s.cid)?.cat === 'K')?.value || 3.5,
                      Q: activeEval.scores.find(s => criteria.find(c => c.id === s.cid)?.cat === 'Q')?.value || 4.0,
                      B: activeEval.scores.find(s => criteria.find(c => c.id === s.cid)?.cat === 'B')?.value || 3.8,
                      S: activeEval.scores.find(s => criteria.find(c => c.id === s.cid)?.cat === 'S')?.value || 4.5,
                      L: activeEval.scores.find(s => criteria.find(c => c.id === s.cid)?.cat === 'L')?.value || 3.5
                    }}
                    onApplyFeedback={(refinedText) => {
                      handleNoteChange(refinedText);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-4">
              {grade && gradeConfig ? (
                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">نمره نهایی (از ۱۰۰):</span>
                    <span className="text-sm font-black text-slate-200 mt-0.5 block">{finalScore} ٪</span>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <span className="text-slate-500 text-[10px] block">رتبه کیفی:</span>
                    <span className={`text-xs font-bold text-${gradeConfig.color}-400 mt-0.5 block`}>{grade} - {gradeConfig.label}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500">نمره نهایی پس از ثبت امتیازات محاسبه می‌شود.</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(isAdmin || activeEval.status !== 'locked') && (
                <button
                  type="button"
                  onClick={() => setEvalToDelete(activeEval)}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="حذف فرم ارزیابی"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>حذف فرم</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSetActiveEval(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>

              {activeEval.status !== 'locked' ? (
                <button
                  type="button"
                  onClick={handleFinalizeAndLock}
                  className={`px-4 py-2 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isFormComplete && isDocSatisfied 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950' 
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-850'
                  }`}
                  disabled={!isFormComplete || !isDocSatisfied}
                >
                  <Lock className="w-4 h-4" />
                  <span>بررسی سوگیری و قفل نهایی فرم</span>
                </button>
              ) : (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>فرم قفل‌شده قطعی است</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NEW EVALUATION */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200">شروع ارزیابی جدید پرسنل</h2>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEvaluation} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">انتخاب کارمند</label>
                <select
                  required
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {employees.map(emp => {
                    const prof = profiles.find(p => p.id === emp.profileId);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.code} ({prof?.title || 'فاقد شغل'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">دوره ارزیابی</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: دوره بهار ۱۴۰۳"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                >
                  شروع فرآیند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Evaluation Confirmation Modal with BUG FIX */}
      {evalToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">حذف قطعی فرم ارزیابی</h3>
                <p className="text-[11px] text-slate-400">
                  {evalToDelete.status === 'locked' ? 'هشدار: این فرم قبلاً قفل شده است (حذف ادمین)' : 'حذف پیش‌نویس ارزیابی'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>کارمند ارزیابی‌شونده:</span>
                <span className="font-bold text-slate-100">
                  {employees.find(e => e.id === evalToDelete.empId)?.name || 'پرسنل'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>دوره ارزیابی:</span>
                <span className="text-teal-400 font-mono">{evalToDelete.period}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>نمره کل:</span>
                {/* FIXED BUG: calculateScore(evalToDelete) instead of evalToDelete.overallScore */}
                <span className="font-bold font-mono">{(calculateScore(evalToDelete)).toFixed(1)} / ۱۰۰</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>وضعیت:</span>
                <span className="font-bold">{evalToDelete.status === 'locked' ? 'قفل‌شده قطعی' : 'پیش‌نویس'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                آیا از حذف کامل این رکورد ارزیابی اطمینان دارید؟ تمام نمرات و بازخوردهای ثبت‌شده حذف خواهند شد.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setEvalToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEvaluation(evalToDelete.id);
                  if (activeEvalId === evalToDelete.id) {
                    onSetActiveEval(null);
                  }
                  setEvalToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تایید و حذف</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Excel Integration Modal */}
      <ExcelIntegrationCenter
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        employees={employees}
        profiles={profiles}
        criteria={criteria}
        evaluations={evaluations}
        currentUser={currentUser}
        onUpdateEvaluations={(updatedEvals) => {
          if (onBulkUpdateEvaluations) {
            onBulkUpdateEvaluations(updatedEvals);
          } else {
            updatedEvals.forEach(ev => {
              onUpdateEvaluation(ev.id, ev);
            });
          }
        }}
        onAddEvaluation={onAddEvaluation}
      />
    </div>
  );
}
