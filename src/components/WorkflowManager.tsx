/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GitFork, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  RotateCcw, 
  CheckCheck, 
  FileText, 
  UserCheck, 
  ShieldCheck, 
  Scale, 
  Users, 
  Settings, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  History, 
  MessageSquare, 
  Sparkles, 
  Info, 
  LockKeyhole, 
  Check, 
  CornerDownLeft, 
  HelpCircle, 
  TrendingUp, 
  Award, 
  Compass, 
  Bell, 
  UserPlus, 
  X, 
  ExternalLink, 
  Layers, 
  Flame, 
  Zap, 
  BookOpen, 
  Target, 
  Grid3X3, 
  Sliders, 
  UserX, 
  Calendar, 
  CheckSquare, 
  Square, 
  Trash2 
} from 'lucide-react';
import { downloadWorkflowCalendarICS, DEFAULT_WORKFLOW_DEADLINES } from '../utils/calendarExport';
import { db } from '../utils/db';
import { 
  Employee, 
  Evaluation, 
  JobProfile, 
  Criterion, 
  WorkflowStageKey, 
  WorkflowTransitionLog, 
  EvaluationRouteRule, 
  IDPItem, 
  GrievanceAppeal, 
  WORKFLOW_STAGES, 
  DEFAULT_ROUTE_RULES, 
  NINE_BOX_MATRIX, 
  UserRole, 
  getGrade, 
  GRADE_DETAILS 
} from '../types';

interface WorkflowManagerProps {
  currentUser: Employee;
  evaluations: Evaluation[];
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
  onUpdateEvaluation: (id: string, updatedEv: Evaluation) => void;
  onBulkUpdateEvaluations?: (updatedEvaluations: Evaluation[]) => void;
  onUpdateEmployees?: (updatedEmployees: Employee[]) => void;
  onSelectEvaluation?: (id: string) => void;
  onDeleteEvaluation?: (id: string) => void;
  onBulkDeleteEvaluations?: (ids: string[]) => void;
  theme: 'dark' | 'light';
}

export default function WorkflowManager({
  currentUser,
  evaluations,
  employees,
  profiles,
  criteria,
  onUpdateEvaluation,
  onBulkUpdateEvaluations,
  onUpdateEmployees,
  onSelectEvaluation,
  onDeleteEvaluation,
  onBulkDeleteEvaluations,
  theme
}: WorkflowManagerProps) {
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'all_workflows' | 'nine_box' | 'idp_center' | 'appeals_center' | 'route_config' | 'history_audit'>('my_tasks');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('دوره بهار ۱۴۰۳');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [nineBoxCategoryFilter, setNineBoxCategoryFilter] = useState<string>('all');

  const [localEvaluations, setLocalEvaluations] = useState<Evaluation[]>(evaluations);
  useEffect(() => {
    setLocalEvaluations(evaluations);
  }, [evaluations]);

  const [selectedEvalIds, setSelectedEvalIds] = useState<string[]>([]);

  const [selectedEvalForVisualModal, setSelectedEvalForVisualModal] = useState<Evaluation | null>(null);
  const [selectedEvalForAction, setSelectedEvalForAction] = useState<Evaluation | null>(null);
  const [actionType, setActionType] = useState<'advance' | 'reject' | 'override' | 'reassign' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [overrideStage, setOverrideStage] = useState<WorkflowStageKey>('supervisor_review');

  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const displayToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 4500);
  };

  const calculateScore = (ev: Evaluation) => {
    const scoredItems = ev.scores.filter(s => s.value > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + (curr.value * curr.weight), 0);
    const avg5 = weightedSum / totalWeight;
    return Math.round(avg5 * 20 * 10) / 10;
  };

  const resolveCurrentAssignee = (ev: Evaluation, emp: Employee | undefined) => {
    if (!emp) return { id: 'unknown', name: 'نامشخص', role: 'admin' as UserRole };
    const stage = ev.stage || 'self_review';
    if (stage === 'self_review') return { id: emp.id, name: emp.name, role: emp.role };
    if (stage === 'supervisor_review') {
      const sup = employees.find(e => e.id === emp.supervisorId);
      return sup ? { id: sup.id, name: sup.name, role: sup.role } : { id: 'admin', name: 'مدیریت', role: 'admin' as UserRole };
    }
    if (stage === 'calibration_review') return { id: 'admin', name: 'کمیته کالیبراسیون', role: 'admin' as UserRole };
    if (stage === 'hr_approval') return { id: 'admin', name: 'مدیریت منابع انسانی', role: 'admin' as UserRole };
    if (stage === 'feedback_meeting') return { id: emp.id, name: `${emp.name} و سرپرست`, role: 'supervisor' as UserRole };
    return { id: 'done', name: 'بایگانی قطعی', role: 'admin' as UserRole };
  };

  const normalizedEvaluations = useMemo(() => {
    return localEvaluations.map(ev => {
      const emp = employees.find(e => e.id === ev.empId);
      let stage: WorkflowStageKey = ev.stage || 'self_review';
      if (!ev.stage) {
        if (ev.status === 'locked') stage = 'completed';
        else if (ev.status === 'calibrated') stage = 'hr_approval';
        else stage = 'self_review';
      }
      const assignee = resolveCurrentAssignee({ ...ev, stage }, emp);
      const score = calculateScore(ev);
      const potential = ev.potentialScore || 3.5;

      const perfLevel: 'low' | 'medium' | 'high' = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
      const potLevel: 'low' | 'medium' | 'high' = potential >= 4 ? 'high' : potential >= 2.5 ? 'medium' : 'low';
      const matrixKey = `${perfLevel}_${potLevel}` as keyof typeof NINE_BOX_MATRIX;
      const matrixDef = NINE_BOX_MATRIX[matrixKey] || NINE_BOX_MATRIX.med_med;

      return {
        ...ev,
        stage,
        currentAssigneeId: assignee.id,
        currentAssigneeName: assignee.name,
        currentAssigneeRole: assignee.role,
        potentialScore: potential,
        nineBoxPlacement: {
          performance: perfLevel,
          potential: potLevel,
          boxTitle: matrixDef.title,
          boxCategory: matrixDef.category
        }
      };
    });
  }, [localEvaluations, employees]);

  const myTaskEvaluations = useMemo(() => {
    return normalizedEvaluations.filter(ev => {
      if (ev.period !== selectedPeriod) return false;
      const emp = employees.find(e => e.id === ev.empId);
      if (!emp) return false;

      if (currentUser.role === 'admin') {
        if (stageFilter !== 'all' && ev.stage !== stageFilter) return false;
        return ev.stage === 'calibration_review' || ev.stage === 'hr_approval' || ev.stage === 'appealed' || ev.stage === 'rejected';
      }
      if (currentUser.role === 'supervisor') {
        const isMySub = emp.supervisorId === currentUser.id;
        if (isMySub && (ev.stage === 'supervisor_review' || ev.stage === 'feedback_meeting')) {
          if (stageFilter !== 'all' && ev.stage !== stageFilter) return false;
          return true;
        }
        return false;
      }
      if (currentUser.role === 'employee') {
        return ev.empId === currentUser.id && (ev.stage === 'self_review' || ev.stage === 'feedback_meeting');
      }
      return false;
    });
  }, [normalizedEvaluations, selectedPeriod, currentUser, employees, stageFilter]);

  const executeStageTransition = (
    evalItem: Evaluation,
    targetStage: WorkflowStageKey,
    act: WorkflowTransitionLog['action'],
    comment: string
  ) => {
    const newLog: WorkflowTransitionLog = {
      id: `trans-${Date.now()}`,
      fromStage: evalItem.stage || 'self_review',
      toStage: targetStage,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: act,
      comment: comment.trim() || undefined,
      timestamp: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date())
    };

    let newStatus = evalItem.status;
    if (targetStage === 'completed') newStatus = 'locked';
    else if (targetStage === 'hr_approval' || targetStage === 'calibration_review') newStatus = 'calibrated';
    else newStatus = 'draft';

    const emp = employees.find(e => e.id === evalItem.empId);
    const resolvedNextAssignee = resolveCurrentAssignee({ ...evalItem, stage: targetStage }, emp);

    const updatedEval: Evaluation = {
      ...evalItem,
      stage: targetStage,
      status: newStatus,
      currentAssigneeId: resolvedNextAssignee.id,
      currentAssigneeName: resolvedNextAssignee.name,
      currentAssigneeRole: resolvedNextAssignee.role,
      rejectionReason: targetStage === 'rejected' ? comment : undefined,
      history: [newLog, ...(evalItem.history || [])]
    };

    const nextLocal = localEvaluations.map(e => e.id === evalItem.id ? updatedEval : e);
    setLocalEvaluations(nextLocal);
    db.saveEvaluations(nextLocal);
    db.syncToCloudNow().catch(() => {});
    onUpdateEvaluation(evalItem.id, updatedEval);
    displayToast(`پرونده با موفقیت به مرحله ${WORKFLOW_STAGES[targetStage]?.label} انتقال یافت.`, 'success');
  };

  const getNextStandardStage = (currentStage: WorkflowStageKey): WorkflowStageKey => {
    switch (currentStage) {
      case 'self_review': return 'supervisor_review';
      case 'supervisor_review': return 'calibration_review';
      case 'peer_review': return 'calibration_review';
      case 'calibration_review': return 'hr_approval';
      case 'hr_approval': return 'feedback_meeting';
      case 'feedback_meeting': return 'completed';
      case 'rejected': return 'supervisor_review';
      default: return 'completed';
    }
  };

  const handleQuickAdvance = (ev: Evaluation) => {
    const nextStage = getNextStandardStage(ev.stage || 'self_review');
    executeStageTransition(ev, nextStage, 'advance', 'تایید و انتقال به مرحله بعدی');
  };

  return (
    <div className="space-y-6 text-right pb-20 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
            <GitFork className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">مدیریت هوشمند گردش‌کار ارزیابی (Workflow)</h1>
            <p className="text-xs text-slate-400 mt-1">
              هدایت خودکار فرآیند ۷ مرحله‌ای، کالیبراسیون سازمانی و برنامه توسعه فردی (IDP)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => db.forceSyncNow()}
            className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>همگام‌سازی ابری</span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{showToast.message}</span>
          </div>
          <button onClick={() => setShowToast(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-2 p-2 overflow-x-auto bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl">
        <button
          onClick={() => setActiveTab('my_tasks')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'my_tasks' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>کارتابل وظایف من</span>
          {myTaskEvaluations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-teal-400 font-mono text-[10px]">
              {myTaskEvaluations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all_workflows')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'all_workflows' ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>کل گردش‌کار سازمان</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {normalizedEvaluations.length}
          </span>
        </button>
      </div>

      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {myTaskEvaluations.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/40 border border-slate-800/60 rounded-3xl">
              <CheckCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-200">کلیه وظایف شما تکمیل شده است</h3>
              <p className="text-xs text-slate-400 mt-1">پرونده‌ای در انتظار اقدام شما در این دوره وجود ندارد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myTaskEvaluations.map(ev => {
                const emp = employees.find(e => e.id === ev.empId);
                const prof = profiles.find(p => p.id === ev.profileId);
                const stageInfo = WORKFLOW_STAGES[ev.stage];
                const score = calculateScore(ev);

                return (
                  <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          {stageInfo.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-teal-400">{score} ٪</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">{emp?.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{prof?.title} | واحد: {emp?.unit}</p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => handleQuickAdvance(ev)}
                        className="flex-1 py-2 px-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>تایید و ارسال به گام بعد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all_workflows' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/95 border-b border-slate-800">
                <tr className="text-slate-400 font-bold">
                  <th className="p-3.5">کارمند</th>
                  <th className="p-3.5">واحد</th>
                  <th className="p-3.5">شغل</th>
                  <th className="p-3.5">مرحله کنونی</th>
                  <th className="p-3.5">مسئول گام</th>
                  <th className="p-3.5 text-center">نمره</th>
                  <th className="p-3.5 text-center">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {normalizedEvaluations.map(ev => {
                  const emp = employees.find(e => e.id === ev.empId);
                  const prof = profiles.find(p => p.id === ev.profileId);
                  const stageInfo = WORKFLOW_STAGES[ev.stage];
                  const score = calculateScore(ev);

                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-bold text-slate-100">{emp?.name}</td>
                      <td className="p-3.5 text-slate-300">{emp?.unit}</td>
                      <td className="p-3.5 text-slate-400">{prof?.title}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">{ev.currentAssigneeName}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-teal-400">{score} ٪</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleQuickAdvance(ev)}
                          className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 border border-teal-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          پیشبرد
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
