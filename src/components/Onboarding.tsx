/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  CheckCircle2, 
  GraduationCap, 
  HelpCircle, 
  PlayCircle, 
  ShieldAlert, 
  Sparkles, 
  FileCheck2, 
  ArrowLeft, 
  Info,
  ChevronRight,
  TrendingUp,
  Brain,
  ThumbsUp,
  Users,
  Briefcase,
  GitFork,
  Scale,
  LockKeyhole,
  Check,
  Smartphone,
  PhoneCall
} from 'lucide-react';
import { Employee, UserRole } from '../types';

interface OnboardingProps {
  currentUser?: Employee | null;
  onComplete: () => void;
  hasCertifiedBadge: boolean;
  onGrantBadge: () => void;
  theme: 'light' | 'dark';
}

export default function Onboarding({ currentUser, onComplete, hasCertifiedBadge, onGrantBadge, theme }: OnboardingProps) {
  const role: UserRole = currentUser?.role || 'employee';
  const [activeStep, setActiveStep] = useState(1);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const welcomeStep = {
    id: 1,
    title: 'خوش‌آمدگویی و فلسفه مدیریت عملکرد',
    icon: GraduationCap,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
          <p className="text-sm font-black text-teal-400">به سامانه ارزیابی عملکرد اصفهان چالاک خوش آمدید!</p>
          <p className="text-slate-300 dark:text-slate-300 text-[11px] mt-1.5 leading-relaxed">
            این پلتفرم با هدف <strong className="text-teal-400">رشد، توانمندسازی، شفافیت و ایجاد عدالت در پاداش</strong> طراحی شده است.
          </p>
        </div>
        <div className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl space-y-3">
          <h4 className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>اصول بنیادین ارزیابی در کارخانه:</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">ارزیابی مبتنی بر شواهد عینی</span>
              <p className="text-slate-400">هیچ نمره‌ای بر اساس حدس یا سلیقه شخصی ثبت نمی‌شود.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">داده‌های خودکار خطوط</span>
              <p className="text-slate-400">شاخص‌های تولید مستقیم از سیستم MES و لاگ QC دریافت می‌شوند.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">برنامه توسعه فردی (IDP)</span>
              <p className="text-slate-400">هدف ارزیابی مچ‌گیری نیست، بلکه ترسیم مسیر پیشرفت پرسنل است.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">جلسه کالیبراسیون و انطباق</span>
              <p className="text-slate-400">نمرات جهت برقراری عدالت در کمیته کالیبره می‌شوند.</p>
            </div>
          </div>
        </div>
      </div>
    )
  };

  const dimensionsStep = {
    id: 2,
    title: 'ابعاد پنج‌گانه شایستگی‌های کارگاهی',
    icon: TrendingUp,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <p className="text-slate-300">در شرکت اصفهان چالاک، عملکرد در ۵ محور کلیدی سنجیده می‌شود:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <h4 className="font-bold text-blue-400 flex items-center justify-between">
              <span>عملکرد کمی (KPI / K)</span>
              <span className="text-[10px] font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded">کد: K</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              تیراژ، راندمان سیستم اطلاعات تولید MES، شاخص اثربخشی OEE و زمان ستاپ.
            </p>
          </div>
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <h4 className="font-bold text-amber-400 flex items-center justify-between">
              <span>شایستگی‌های کیفی (Q)</span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded">کد: Q</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              انطباق با استانداردهای SOP، حفظ سلامت ابزار دقیق و مستندسازی QC.
            </p>
          </div>
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <h4 className="font-bold text-purple-400 flex items-center justify-between">
              <span>شایستگی‌های رفتاری (B)</span>
              <span className="text-[10px] font-mono font-bold bg-purple-500/20 px-2 py-0.5 rounded">کد: B</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              نظم در تردد کسری، تعامل سازنده با هم‌شیفتی‌ها و مسئولیت‌پذیری.
            </p>
          </div>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <h4 className="font-bold text-rose-400 flex items-center justify-between">
              <span>ایمنی و بهداشت (HSE / S)</span>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 px-2 py-0.5 rounded">الزامی: S)</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              رعایت تجهیزات حفاظت فردی PPE، ممیزی ۵S و پیشگیری از شبه‌حوادث.
            </p>
          </div>
        </div>
      </div>
    )
  };

  const quizStep = {
    id: 3,
    title: 'آزمون کوتاه و دریافت نشان رسمی',
    icon: Award,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <p className="text-slate-300 leading-relaxed">
          با پاسخ به دو سوال زیر، نشان رسمی شایستگی سامانه را دریافت نمایید.
        </p>
        <div className="p-4 bg-slate-900/80 dark:bg-slate-900/80 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl space-y-4">
          {quizSubmitted && quizScore === 2 ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>
              <h4 className="font-black text-purple-400 text-sm">تبریک! شما نشان رسمی ارزیابی را دریافت نمودید.</h4>
              <p className="text-slate-300 text-xs">پاسخ‌های شما کاملاً منطبق بر استانداردهای منابع انسانی شرکت اصفهان چالاک بود.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">۱. ثبت شواهد و مستندات عینی در کدام نمرات الزامی است؟</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 1, text: 'فقط برای نمره ۳' },
                    { id: 2, text: 'نمرات بحرانی (۱ و ۲) و نمره استثنایی (۵)' },
                    { id: 3, text: 'هیچ نمره‌ای نیاز به مستندات ندارد' }
                  ].map(ans => (
                    <button
                      key={ans.id}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, 1: ans.id })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                        selectedAnswers[1] === ans.id 
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-bold'
                          : 'bg-slate-950/60 dark:bg-slate-950/60 bg-white border-slate-800 dark:border-slate-800 border-slate-200 text-slate-300'
                      }`}
                    >
                      {ans.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">۲. هدف غایی فرآیند ارزیابی عملکرد و مربیگری چیست؟</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 1, text: 'جریمه پرسنل کم‌کار' },
                    { id: 2, text: 'پر کردن فرم‌های بایگانی اداری' },
                    { id: 3, text: 'رشد، توانمندسازی و تدوین برنامه توسعه فردی (IDP)' }
                  ].map(ans => (
                    <button
                      key={ans.id}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, 2: ans.id })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                        selectedAnswers[2] === ans.id 
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-bold'
                          : 'bg-slate-950/60 dark:bg-slate-950/60 bg-white border-slate-800 dark:border-slate-800 border-slate-200 text-slate-300'
                      }`}
                    >
                      {ans.text}
                    </button>
                  ))}
                </div>
              </div>

              {quizSubmitted && quizScore !== 2 && (
                <p className="text-red-400 font-bold text-xs bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">پاسخ‌های داده‌شده نیاز به بازنگری دارند. لطفاً مجدداً گزینه‌ها را بررسی فرمایید.</p>
              )}

              <button
                type="button"
                onClick={() => {
                  const isCorrect1 = selectedAnswers[1] === 2;
                  const isCorrect2 = selectedAnswers[2] === 3;
                  const score = (isCorrect1 ? 1 : 0) + (isCorrect2 ? 1 : 0);
                  setQuizScore(score);
                  setQuizSubmitted(true);
                  if (score === 2) {
                    onGrantBadge();
                  }
                }}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-purple-500/20"
              >
                ثبت پاسخ‌ها و بررسی نتیجه
              </button>
            </div>
          )}
        </div>
      </div>
    )
  };

  const allSteps = [welcomeStep, dimensionsStep, quizStep];
  const currentStepData = allSteps.find(s => s.id === activeStep) || allSteps[0];
  const StepIcon = currentStepData.icon;

  return (
    <div className="space-y-6 text-right w-full overflow-hidden" dir="rtl">
      <div className={`p-4 sm:p-5 rounded-3xl border flex justify-between items-center flex-wrap gap-4 ${
        theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-100 dark:text-slate-100 text-slate-800 tracking-tight">مرکز آشناسازی و آموزش استانداردهای ارزیابی</h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">شرکت اصفهان چالاک - سامانه ارزیابی عملکرد</p>
          </div>
        </div>
        <button
          onClick={onComplete}
          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20 shrink-0"
        >
          <span>تکمیل و ورود به سامانه</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-2">
          {allSteps.map((st) => {
            const IsActive = st.id === activeStep;
            const StepIconRef = st.icon;
            
            return (
              <button
                key={st.id}
                onClick={() => setActiveStep(st.id)}
                className={`p-3.5 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                  IsActive
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-bold shadow-sm'
                    : 'bg-slate-900/20 dark:bg-slate-900/20 bg-white border-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  IsActive ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <StepIconRef className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-slate-500 block font-mono">گام {st.id} از {allSteps.length}</span>
                  <span className="text-xs truncate block font-bold">{st.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className={`lg:col-span-3 border p-5 sm:p-6 rounded-3xl space-y-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-100 dark:text-slate-100 text-slate-800 truncate">{currentStepData.title}</h3>
            </div>
          </div>

          <div className="min-h-[260px]">
            {currentStepData.content}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800/60">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                گام قبل
              </button>
            )}
            {activeStep < allSteps.length ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-teal-500/20 mr-auto"
              >
                <span>گام بعد</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/20 transition-all mr-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تکمیل و شروع</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
