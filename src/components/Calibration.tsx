/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Scale, 
  Users, 
  Award, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal,
  FileCheck2
} from 'lucide-react';
import { Evaluation, Employee, JobProfile, getGrade, GRADE_DETAILS } from '../types';

interface CalibrationProps {
  evaluations: Evaluation[];
  employees: Employee[];
  profiles: JobProfile[];
  onUpdateEvaluation: (id: string, ev: Evaluation) => void;
  onSelectEvaluation: (id: string) => void;
}

export default function Calibration({
  evaluations,
  employees,
  profiles,
  onUpdateEvaluation,
  onSelectEvaluation
}: CalibrationProps) {
  const scoredEvals = evaluations.filter(ev => {
    return ev.scores.some(s => s.value > 0);
  });

  const readyForCalibration = evaluations.filter(ev => {
    return ev.status === 'draft' && ev.scores.every(s => s.value > 0);
  });

  const calibratedCount = evaluations.filter(ev => ev.status === 'calibrated').length;
  const lockedCount = evaluations.filter(ev => ev.status === 'locked').length;

  const calculateScore = (ev: Evaluation) => {
    const scoredItems = ev.scores.filter(s => s.value > 0);
    if (!scoredItems.length) return 0;
    const totalWeight = scoredItems.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = scoredItems.reduce((acc, curr) => acc + (curr.value * curr.weight), 0);
    const avg5 = weightedSum / totalWeight;
    return Math.round(avg5 * 20 * 10) / 10;
  };

  const dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  scoredEvals.forEach(ev => {
    const score = calculateScore(ev);
    dist[getGrade(score)]++;
  });

  const totalScored = scoredEvals.length || 1;
  const aPercentage = Math.round((dist.A / totalScored) * 100);
  const isInflated = aPercentage > 25;

  const handleApproveCalibration = (ev: Evaluation) => {
    onUpdateEvaluation(ev.id, { ...ev, status: 'calibrated' });
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">کالیبراسیون و متعادل‌سازی نمرات</h1>
        <p className="text-sm text-slate-400 mt-1">
          پایش توزیع نرمال نمرات کارگاهی، رفع خطای ارفاق سرپرستان و ایجاد عدالت پرداختی
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">در انتظار کالیبراسیون</p>
            <p className="text-xl font-bold text-slate-200 mt-0.5">{readyForCalibration.length} فرم</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">کالیبره‌شده (تایید میانی)</p>
            <p className="text-xl font-bold text-slate-200 mt-0.5">{calibratedCount} فرم</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">قفل قطعی و نهایی</p>
            <p className="text-xl font-bold text-slate-200 mt-0.5">{lockedCount} فرم</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-200">منحنی توزیع نرمال نمرات (توزیع اجباری)</h3>
          {isInflated ? (
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>هشدار تورم نمره (بیش از ۲۵٪ در رتبه A)</span>
            </span>
          ) : (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>توزیع نمرات در محدوده متوازن استاندارد</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {(Object.keys(dist) as Array<keyof typeof dist>).map((grade) => {
            const count = dist[grade];
            const pct = Math.round((count / totalScored) * 100);
            const conf = GRADE_DETAILS[grade];
            const target = grade === 'A' ? 15 : grade === 'B' ? 25 : grade === 'C' ? 45 : grade === 'D' ? 10 : 5;

            return (
              <div key={grade} className="bg-slate-950/30 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`w-7 h-7 rounded-lg font-bold text-slate-900 bg-${conf.color}-400 flex items-center justify-center text-xs`}>
                    {grade}
                  </span>
                  <span className="text-slate-400 text-[11px]">{conf.label.split(' ')[0]}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">تعداد واقعی:</span>
                    <span className="text-slate-200 font-bold">{pct} ٪</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-${conf.color}-500/80`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[9px] text-slate-500 text-left" dir="ltr">
                    Target: ~{target}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">فرم‌های آماده بررسی در جلسه کمیته کالیبراسیون</h3>
        {readyForCalibration.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold">
                  <th className="pb-3 text-right">کارمند</th>
                  <th className="pb-3 text-right">واحد سازمانی</th>
                  <th className="pb-3 text-right">عنوان شغل</th>
                  <th className="pb-3 text-center">نمره اولیه</th>
                  <th className="pb-3 text-center">رتبه کیفی</th>
                  <th className="pb-3 text-left">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {readyForCalibration.map((ev) => {
                  const emp = employees.find(e => e.id === ev.empId);
                  const prof = profiles.find(p => p.id === ev.profileId);
                  const score = calculateScore(ev);
                  const gr = getGrade(score);
                  const grConf = GRADE_DETAILS[gr];

                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{emp?.name || 'نامشخص'}</td>
                      <td className="py-3 text-slate-400">{emp?.unit || 'نامشخص'}</td>
                      <td className="py-3 text-slate-400">{prof?.title || 'عمومی'}</td>
                      <td className="py-3 text-center font-bold text-slate-200">{score} ٪</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-${grConf.color}-500/10 text-${grConf.color}-300`}>
                          {gr} - {grConf.label}
                        </span>
                      </td>
                      <td className="py-3 text-left">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => onSelectEvaluation(ev.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            مشاهده و ویرایش
                          </button>
                          <button
                            onClick={() => handleApproveCalibration(ev)}
                            className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-slate-900 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>تایید کالیبراسیون</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold">تمام ارزیابی‌های ثبت‌شده کالیبره یا قفل شده‌اند.</p>
            <p className="text-[11px] mt-1">موردی در صف انتظار بررسی کمیته وجود ندارد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
