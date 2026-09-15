/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  HelpCircle, 
  CheckCircle2, 
  Award, 
  TrendingUp, 
  Info, 
  Save, 
  ClipboardCopy,
  Send,
  GitFork,
  Check
} from 'lucide-react';
import { Employee, Evaluation, JobProfile, Criterion, getGrade, GRADE_DETAILS, WORKFLOW_STAGES, WorkflowTransitionLog, WorkflowStageKey } from '../types';

interface MyEvaluationProps {
  currentUser: Employee;
  evaluations: Evaluation[];
  profiles: JobProfile[];
  criteria: Criterion[];
  onUpdateEvaluation: (id: string, updatedEv: Evaluation) => void;
  onAddEvaluation: (empId: string, period: string) => void;
  theme: 'dark' | 'light';
}

export default function MyEvaluation({
  currentUser,
  evaluations,
  profiles,
  criteria,
  onUpdateEvaluation,
  onAddEvaluation,
  theme
}: MyEvaluationProps) {
  const [period] = useState('دوره بهار ۱۴۰۳');
  const [saveSuccess, setSaveSuccess] = useState(false);

  let userEval = evaluations.find(e => (e.empId === currentUser.id || (currentUser.code && e.empId === currentUser.code)) && e.period === period);
  const userProfile = profiles.find(p => p.id === currentUser.profileId);

  const handleSelfScoreChange = (criterionId: string, scoreValue: number) => {
    if (!userEval) {
      if (!userProfile) return;
      const initialScores = userProfile.items.map(item => ({
        cid: item.cid,
        weight: item.weight,
        value: 0,
        self: item.cid === criterionId ? scoreValue : 0,
        doc: ''
      }));
      const newEval: Evaluation = {
        id: `eval-${Math.random().toString(36).substring(2, 9)}`,
        empId: currentUser.id,
        profileId: currentUser.profileId,
        period,
        status: 'draft',
        scores: initialScores,
        created: Date.now()
      };
      
      onUpdateEvaluation(newEval.id, newEval);
      db.syncToCloudNow().catch(() => {});
      return;
    }

    const updatedScores = userEval.scores.map(s => {
      if (s.cid === criterionId) {
        return { ...s, self: scoreValue };
      }
      return s;
    });
    onUpdateEvaluation(userEval.id, { ...userEval, scores: updatedScores });
    db.syncToCloudNow().catch(() => {});
  };

  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const handleSubmitToSupervisor = () => {
    if (!userEval) return;
    
    const unrated = userProfile?.items.some(it => {
      const score = userEval?.scores.find(s => s.cid === it.cid);
      return !score || score.self === 0;
    });

    if (unrated) {
      if (!confirm('برخی شاخص‌ها هنوز توسط شما نمره‌دهی نشده‌اند. آیا با همین وضعیت ارسال شود؟')) {
        return;
      }
    }

    const newLog: WorkflowTransitionLog = {
      id: `trans-${Date.now()}`,
      fromStage: userEval.stage || 'self_review',
      toStage: 'supervisor_review',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'submit_self',
      comment: 'خودارزیابی توسط همکار تکمیل و برای سرپرست مستقیم ارسال گردید.',
      timestamp: new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'short',
        timeStyle: 'medium'
      }).format(new Date())
    };

    const updatedHistory = [newLog, ...(userEval.history || [])];

    onUpdateEvaluation(userEval.id, {
      ...userEval,
      stage: 'supervisor_review',
      history: updatedHistory
    });

    setSubmitFeedback('فرم خودارزیابی با موفقیت ثبت و به کارتابل سرپرست ارسال شد.');
    setTimeout(() => setSubmitFeedback(null), 5000);
  };

  const handleSaveSelfAssessment = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const calculateOverallScore = (ev: Evaluation) => {
    const scoredItems = ev.scores.filter(s => s.value > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + (curr.value * curr.weight), 0);
    const avg5 = weightedSum / totalWeight;
    return Math.round(avg5 * 20 * 10) / 10;
  };

  const calculateSelfScoreAvg = (ev: Evaluation) => {
    const scoredItems = ev.scores.filter(s => s.self > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + (curr.self * curr.weight), 0);
    const avg5 = weightedSum / totalWeight;
    return Math.round(avg5 * 20 * 10) / 10;
  };

  if (!userProfile) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-red-400 font-bold">پروفایل شغلی برای حساب کاربری شما تعریف نشده است.</p>
        <p className="text-xs text-slate-500">لطفاً با مدیریت منابع انسانی هماهنگ نمایید.</p>
      </div>
    );
  }

  const finalScore = userEval ? calculateOverallScore(userEval) : 0;
  const selfScoreAvg = userEval ? calculateSelfScoreAvg(userEval) : 0;
  const grade = getGrade(finalScore);
  const gradeDetail = GRADE_DETAILS[grade];
  const currentStage = userEval?.stage || 'self_review';
  const stageInfo = WORKFLOW_STAGES[currentStage] || WORKFLOW_STAGES.self_review;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Welcome Banner */}
      <div className={`p-5 rounded-3xl border flex justify-between items-center flex-wrap gap-4 ${
        theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">کارتابل خودارزیابی و پرونده عملکرد</h1>
            <p className="text-xs text-slate-400 mt-1">
              کارمند: <span className="text-teal-400 font-bold">{currentUser.name}</span> | سمت: <span className="font-bold">{userProfile.title}</span> | واحد: {currentUser.unit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/60 px-4 py-2 rounded-xl text-xs border border-slate-800 font-bold text-teal-400">
            دوره فعال: {period}
          </div>
        </div>
      </div>

      {/* Live Workflow Status Banner */}
      <div className={`p-5 rounded-3xl border ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <GitFork className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-bold text-slate-200">وضعیت فعلی پرونده:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {stageInfo.label}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            مسئول گام کنونی: <strong className="text-slate-200">{stageInfo.responsibleLabel}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
          {(['self_review', 'supervisor_review', 'calibration_review', 'hr_approval', 'feedback_meeting', 'completed'] as WorkflowStageKey[]).map((stKey) => {
            const st = WORKFLOW_STAGES[stKey];
            const isCurrent = currentStage === stKey;
            const isPassed = st.stepNumber < stageInfo.stepNumber;
            return (
              <div
                key={stKey}
                className={`p-2.5 rounded-2xl text-center border transition-all ${
                  isCurrent
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold shadow-md'
                    : isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] font-bold">{st.label}</div>
                <div className="text-[9px] mt-0.5 opacity-80">{isPassed ? 'تکمیل‌شده' : isCurrent ? 'در دست اقدام' : 'در انتظار'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200">ثبت خودارزیابی شایستگی‌ها و شاخص‌ها</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">امتیاز ۱ تا ۵ را متناسب با عملکرد خود در این دوره ثبت نمایید.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSelfAssessment}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره پیش‌نویس</span>
                </button>
                <button
                  onClick={handleSubmitToSupervisor}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال به سرپرست مستقیم</span>
                </button>
              </div>
            </div>

            {submitFeedback && (
              <div className="mb-4 bg-teal-500/10 border border-teal-500/30 text-teal-300 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{submitFeedback}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>پیش‌نویس خودارزیابی با موفقیت ذخیره شد.</span>
              </div>
            )}

            <div className="space-y-4">
              {userProfile.items.map((item) => {
                const crit = criteria.find(c => c.id === item.cid);
                if (!crit) return null;
                const currentSelfScore = userEval?.scores.find(s => s.cid === item.cid)?.self || 0;

                return (
                  <div 
                    key={item.cid}
                    className={`p-4 rounded-2xl border transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-400">
                            {crit.code}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200">{crit.name}</h4>
                          <span className="text-[10px] text-slate-500">(وزن در ارزیابی: {item.weight} ٪)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{crit.def}</p>
                      </div>

                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <span className="text-[9px] text-slate-400">نمره خودارزیابی</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelfScoreChange(item.cid, val)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all score-btn cursor-pointer ${
                                currentSelfScore === val
                                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/10 font-black'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className={`p-6 rounded-3xl border space-y-5 ${
            theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className="text-sm font-bold text-slate-200">نتیجه رسمی ارزیابی دوره</h3>
            
            {userEval && (userEval.status === 'locked' || userEval.status === 'calibrated') ? (
              <div className="space-y-4">
                <div className="text-center py-5 bg-teal-500/10 border border-teal-500/20 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] text-teal-400 block font-bold">نمره قطعی مصوب (از ۱۰۰)</span>
                  <div className="text-4xl font-black text-slate-100 mt-2 font-mono">{finalScore} ٪</div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${gradeDetail?.color}`}>
                      رتبه سازمانی: {grade} ({gradeDetail?.label})
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-2 text-slate-400">
                  <div className="flex justify-between">
                    <span>میانگین خودارزیابی:</span>
                    <span className="font-bold text-slate-200">{selfScoreAvg} ٪</span>
                  </div>
                  <div className="flex justify-between">
                    <span>وضعیت نهایی:</span>
                    <span className="text-emerald-400 font-bold">تصویب‌شده در کمیته</span>
                  </div>
                </div>

                {userEval.note && (
                  <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold">یادداشت مربیگری سرپرست:</span>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{userEval.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-200 text-xs">در جریان تکمیل فرآیند</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  پس از ثبت ارزیابی توسط سرپرست مستقیم و برگزاری جلسه کالیبراسیون، نتیجه نهایی در این بخش قفل و نمایش داده خواهد شد.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
