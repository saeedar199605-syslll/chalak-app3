/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  Lightbulb, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  Target,
  ArrowUpRight,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Evaluation, Employee, JobProfile, Criterion, getGrade } from '../types';

interface NineBoxAIAnalysisProps {
  evaluations: Evaluation[];
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
}

export interface NineBoxResult {
  executiveSummary: string;
  talentHealthScore: number;
  boxRecommendations: {
    boxId: string;
    boxTitle: string;
    headcount: number;
    strategicGuidance: string;
    individualCoachingTips: string[];
    recommendedActions: string[];
  }[];
  successionAndRetention: string[];
  riskInterventions: string[];
  isFallback?: boolean;
}

export const NineBoxAIAnalysis: React.FC<NineBoxAIAnalysisProps> = ({
  evaluations,
  employees,
  profiles,
  criteria
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NineBoxResult | null>(null);
  const [activeBoxTab, setActiveBoxTab] = useState<string>('star');

  const ratedEvals = evaluations.filter(e => e.scores.some(s => s.value > 0));

  const BOX_CONFIGS = [
    { 
      id: 'enigma', 
      row: 0, 
      col: 0, 
      title: 'پتانسیل بالا اما عملکرد نیازمند ارتقا', 
      subtitle: 'Enigma / High Potential', 
      perfLabel: 'عملکرد پایین (< ۶۵)', 
      potLabel: 'پتانسیل بالا (>= ۸۲)', 
      color: 'amber', 
      bg: 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      strategy: 'انتقال به نقش متناسب‌تر با علایق، منتورینگ فشرده و بررسی موانع انگیزش یا تجهیزات.'
    },
    { 
      id: 'high_potential', 
      row: 0, 
      col: 1, 
      title: 'ستاره در حال رشد', 
      subtitle: 'Growth Star', 
      perfLabel: 'عملکرد متوسط (۶۵-۸۲)', 
      potLabel: 'پتانسیل بالا (>= ۸۲)', 
      color: 'teal', 
      bg: 'bg-teal-950/20 border-teal-500/40 hover:border-teal-400',
      badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      strategy: 'توسعه مهارت‌های تخصصی، واگذاری مسئولیت‌های حل مسئله و چرخش شغلی هدفمند.'
    },
    { 
      id: 'star', 
      row: 0, 
      col: 2, 
      title: 'ستارگان آینده کارخانه', 
      subtitle: 'Super Star', 
      perfLabel: 'عملکرد عالی (>= ۸۳)', 
      potLabel: 'پتانسیل بالا (>= ۸۲)', 
      color: 'emerald', 
      bg: 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      strategy: 'قرارگیری در برنامه جانشین‌پروری سرپرستی، پاداش‌های ویژه و حضور در پروژه‌های تحول‌گرای کارخانه.'
    },
    { 
      id: 'dilemma', 
      row: 1, 
      col: 0, 
      title: 'عملکرد نوسانی / نیازمند هدایت', 
      subtitle: 'Dilemma / Inconsistent', 
      perfLabel: 'عملکرد پایین (< ۶۵)', 
      potLabel: 'پتانسیل متوسط (۶۵-۸۲)', 
      color: 'rose', 
      bg: 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      strategy: 'طراحی برنامه مشخص بهبود عملکرد (PIP)، جلسات مربیگری هفتگی و پیگیری دقیق شواهد رفتاری.'
    },
    { 
      id: 'core', 
      row: 1, 
      col: 1, 
      title: 'ستون‌های عملکرد کارگاه', 
      subtitle: 'Core Player', 
      perfLabel: 'عملکرد متوسط (۶۵-۸۲)', 
      potLabel: 'پتانسیل متوسط (۶۵-۸۲)', 
      color: 'blue', 
      bg: 'bg-blue-950/20 border-blue-500/40 hover:border-blue-400',
      badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      strategy: 'قدردانی مداوم، حفظ ثبات و انگیزش، آموزش‌های مهارتی مستمر جهت افزایش عمق فنی.'
    },
    { 
      id: 'high_performer', 
      row: 1, 
      col: 2, 
      title: 'عملکرد درخشان و قابل اتکا', 
      subtitle: 'High Performer', 
      perfLabel: 'عملکرد عالی (>= ۸۳)', 
      potLabel: 'پتانسیل متوسط (۶۵-۸۲)', 
      color: 'cyan', 
      bg: 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      strategy: 'اعطای نقش منتور و راهنمای نیروهای تازه‌وارد، پاداش بهره‌وری و تثبیت در جایگاه کلیدی.'
    },
    { 
      id: 'underperformer', 
      row: 2, 
      col: 0, 
      title: 'ریسک عملکردی و نیازمند مداخله', 
      subtitle: 'Underperformer / Risk', 
      perfLabel: 'عملکرد پایین (< ۶۵)', 
      potLabel: 'پتانسیل پایین (< ۶۵)', 
      color: 'red', 
      bg: 'bg-red-950/30 border-red-500/50 hover:border-red-400',
      badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
      strategy: 'اجرای فوری برنامه بهبود عملکرد با ضرب‌الاجل ۴۵ روزه یا تعیین تکلیف سازمانی.'
    },
    { 
      id: 'effective_worker', 
      row: 2, 
      col: 1, 
      title: 'همکار موثر و استاندارد', 
      subtitle: 'Effective Worker', 
      perfLabel: 'عملکرد متوسط (۶۵-۸۲)', 
      potLabel: 'پتانسیل پایین (< ۶۵)', 
      color: 'slate', 
      bg: 'bg-slate-900 border-slate-700/60 hover:border-slate-500',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      strategy: 'ایجاد تنوع در وظایف روتین، بهبود شرایط ارگونومی و بررسی عوامل ارتقای انگیزه فردی.'
    },
    { 
      id: 'trusted_expert', 
      row: 2, 
      col: 2, 
      title: 'استادکار و متخصص فنی کارگاه', 
      subtitle: 'Trusted Master', 
      perfLabel: 'عملکرد عالی (>= ۸۳)', 
      potLabel: 'پتانسیل پایین (< ۶۵)', 
      color: 'indigo', 
      bg: 'bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      strategy: 'بهره‌گیری در نقش مرجع فنی حل مسئله در خط و مشارکت در آموزش دستورالعمل‌های استاندارد.'
    },
  ];

  const getEmployeeBoxData = () => {
    const boxMap: Record<string, { emp: Employee; eval: Evaluation; score: number; potentialScore: number; jobTitle: string }[]> = {};
    BOX_CONFIGS.forEach(b => {
      boxMap[b.id] = [];
    });

    ratedEvals.forEach(ev => {
      const emp = employees.find(e => e.id === ev.empId);
      if (!emp) return;
      const prof = profiles.find(p => p.id === emp.profileId);

      const validScores = ev.scores.filter(s => s.value > 0);
      const avgScore = validScores.length > 0
        ? (validScores.reduce((sum, s) => sum + s.value, 0) / validScores.length) * 20
        : 60;

      const potentialScores = ev.scores.filter(s => {
        const c = criteria.find(cr => cr.id === s.cid);
        return c && (c.cat === 'B' || c.cat === 'L' || (c.code || '').startsWith('B') || (c.code || '').startsWith('L'));
      });
      const potentialAvg = potentialScores.length > 0
        ? (potentialScores.reduce((sum, s) => sum + s.value, 0) / potentialScores.length) * 20
        : (avgScore * 0.95);

      let perfBucket: 'low' | 'med' | 'high' = 'med';
      if (avgScore >= 83) perfBucket = 'high';
      else if (avgScore < 65) perfBucket = 'low';

      let potBucket: 'low' | 'med' | 'high' = 'med';
      if (potentialAvg >= 82) potBucket = 'high';
      else if (potentialAvg < 65) potBucket = 'low';

      let assignedBox = 'core';
      if (potBucket === 'high' && perfBucket === 'high') assignedBox = 'star';
      else if (potBucket === 'high' && perfBucket === 'med') assignedBox = 'high_potential';
      else if (potBucket === 'high' && perfBucket === 'low') assignedBox = 'enigma';
      else if (potBucket === 'med' && perfBucket === 'high') assignedBox = 'high_performer';
      else if (potBucket === 'med' && perfBucket === 'med') assignedBox = 'core';
      else if (potBucket === 'med' && perfBucket === 'low') assignedBox = 'dilemma';
      else if (potBucket === 'low' && perfBucket === 'high') assignedBox = 'trusted_expert';
      else if (potBucket === 'low' && perfBucket === 'med') assignedBox = 'effective_worker';
      else if (potBucket === 'low' && perfBucket === 'low') assignedBox = 'underperformer';

      boxMap[assignedBox].push({
        emp,
        eval: ev,
        score: Math.round(avgScore),
        potentialScore: Math.round(potentialAvg),
        jobTitle: prof?.title || 'عمومی'
      });
    });

    return boxMap;
  };

  const boxMapping = getEmployeeBoxData();

  const handleRunAIAnalysis = async () => {
    setLoading(true);
    try {
      const summaryPayload = BOX_CONFIGS.map(b => ({
        boxId: b.id,
        boxTitle: b.title,
        performanceLevel: b.perfLabel,
        potentialLevel: b.potLabel,
        headcount: boxMapping[b.id].length,
        employees: boxMapping[b.id].map(item => ({
          name: item.emp.name,
          unit: item.emp.unit,
          jobTitle: item.jobTitle,
          performanceScore: item.score,
          potentialScore: item.potentialScore
        }))
      }));

      const res = await fetch('/api/gemini/nine-box-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxesSummary: summaryPayload,
          totalHeadcount: ratedEvals.length,
          period: 'دوره بهار ۱۴۰۳'
        })
      });
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('9-Box AI analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100">ماتریس ۹ خانه استعداد (9-Box Grid)</h2>
              <p className="text-xs text-indigo-300 mt-0.5">تحلیل هوشمند ماتریس دوبعدی عملکرد و پتانسیل</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunAIAnalysis}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-slate-100 font-black py-3 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-teal-200" />
              <span>در حال تحلیل...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>تحلیل استراتژیک هوش مصنوعی</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-800/30 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BOX_CONFIGS.map(box => {
            const empsInBox = boxMapping[box.id] || [];
            const isSelected = activeBoxTab === box.id;
            return (
              <div
                key={box.id}
                onClick={() => setActiveBoxTab(box.id)}
                className={`min-h-[160px] p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  box.bg
                } ${isSelected ? 'ring-2 ring-teal-400 shadow-xl scale-[1.01]' : 'hover:border-slate-600'}`}
              >
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{box.title}</h4>
                    <span className="text-[9px] font-mono text-slate-400 block">{box.subtitle}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border shrink-0 ${box.badgeBg}`}>
                    {empsInBox.length} نفر
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {empsInBox.length > 0 ? (
                    empsInBox.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-[11px] text-slate-200 flex items-center justify-between gap-1.5"
                      >
                        <span className="font-medium truncate">{item.emp.name}</span>
                        <span className="font-mono text-[10px] text-teal-300 font-bold">{item.score} ٪</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-500 italic py-3 text-center">
                      پرسنلی در این سطح قرار ندارد
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {analysisResult && (
        <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">تحلیل راهبردی هوش مصنوعی ماتریس ۹ خانه</h3>
                <p className="text-[11px] text-slate-400">توصیه‌های توسعه‌ای، جانشین‌پروری و مدیریت استعدادها</p>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-700 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <span className="text-slate-400">شاخص سلامت استعداد:</span>
              <span className="font-mono font-black text-teal-400 text-sm">{analysisResult.talentHealthScore} از ۱۰۰</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed space-y-1.5">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>خلاصه مدیریتی:</span>
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {analysisResult.executiveSummary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysisResult.boxRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    {rec.boxTitle}
                  </h5>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {rec.headcount} نفر
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-teal-400">هدایت راهبردی: </strong>
                  {rec.strategicGuidance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NineBoxAIAnalysis;
