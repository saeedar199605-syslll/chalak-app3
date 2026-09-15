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

  // Common introduction step
  const welcomeStep = {
    id: 1,
    title: 'خوش‌آمدگویی و معرفی دوره اصفهان چالاک',
    icon: GraduationCap,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
          <p className="text-sm font-black text-teal-400">به چرخه توسعه و ارزیابی شایستگی‌های شرکت اصفهان چالاک خوش‌آمدید!</p>
          <p className="text-slate-300 dark:text-slate-300 text-[11px] mt-1.5 leading-relaxed">
            <strong className="text-teal-400">شرکت اصفهان چالاک</strong> ارزیابی عملکرد را بستری برای رشد، یادگیری، کشف استعدادها و توانمندسازی تک‌تک اعضای خانواده چالاک می‌داند.
          </p>
        </div>

        <div className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl space-y-3">
          <h4 className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>اصول بنیادین مدل ارزیابی شایستگی اصفهان چالاک:</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">۱. گفتگو و مربی‌گری مستمر</span>
              <p className="text-slate-400">تمرکز بر رفع موانع فنی و انگیزشی کارگاه به جای قضاوت یک‌طرفه و جریمه.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">۲. عدالت داده‌محور و شفافیت</span>
              <p className="text-slate-400">استخراج داده‌های کمی از لاگ‌های خط، نرم‌افزار MES و سیستم کنترل کیفیت QC.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">۳. برنامه رشد فردی (IDP)</span>
              <p className="text-slate-400">پیشنهاد هوشمند دوره‌های تخصصی و مهارتی متناسب با نیاز هر شخص.</p>
            </div>
            <div className="p-3 bg-slate-950/40 dark:bg-slate-950/40 bg-white rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200">
              <span className="font-bold text-teal-400 block mb-1">۴. کنترل تورم و خطای هاله‌ای</span>
              <p className="text-slate-400">الزام ثبت مستندات برای نمرات بسیار بالا یا بسیار پایین و بازبینی کالیبراسیون.</p>
            </div>
          </div>
        </div>
      </div>
    )
  };

  // Dimensions of Competency Step
  const dimensionsStep = {
    id: 2,
    title: 'ابعاد پنج‌گانه شایستگی و فرمول سنجش',
    icon: TrendingUp,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <p className="text-slate-300">در شرکت اصفهان چالاک، عملکرد و شایستگی‌ها بر پایه ۵ محور استاندارد سنجیده می‌شوند:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <h4 className="font-bold text-blue-400 flex items-center justify-between">
              <span>۱. نتایج کمی و بهره‌وری (KPI / K)</span>
              <span className="text-[10px] font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded">کد: K</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              تحقق تیراژ استاندارد تولید، نرخ توقفات خط MES، و راندمان زمانی OEE ایستگاه کاری.
            </p>
          </div>
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <h4 className="font-bold text-amber-400 flex items-center justify-between">
              <span>۲. کیفیت و انطباق محصول (Q)</span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded">کد: Q</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              رعایت کامل دستورالعمل‌های استاندارد کارگاهی SOP، عدم تولید ضایعات و پاس کردن بازرسی‌های QC.
            </p>
          </div>
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <h4 className="font-bold text-purple-400 flex items-center justify-between">
              <span>۳. رفتارهای حرفه‌ای و انضباط (B)</span>
              <span className="text-[10px] font-mono font-bold bg-purple-500/20 px-2 py-0.5 rounded">کد: B</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              وقت‌شناسی و حضور، مسئولیت‌پذیری نسبت به ابزارآلات و همکاری موثر در تیم‌های عملیاتی.
            </p>
          </div>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <h4 className="font-bold text-rose-400 flex items-center justify-between">
              <span>۴. ایمنی، بهداشت و آراستگی (HSE / S)</span>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 px-2 py-0.5 rounded">اجباری (کد: S)</span>
            </h4>
            <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
              استفاده الزامی از تجهیزات حفاظت فردی PPE، گزارش شبه‌حوادث و اجرای موازین نظام 5S.
            </p>
          </div>
        </div>
        <div className="p-3.5 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
          <h4 className="font-bold text-teal-400 flex items-center justify-between">
            <span>۵. رهبری، مربیگری و انتقال تجربه (L)</span>
            <span className="text-[10px] font-mono font-bold bg-teal-500/20 px-2 py-0.5 rounded">ویژه سرپرستان و منتورها</span>
          </h4>
          <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1.5 leading-relaxed">
            آموزش اپراتورهای تازه‌وارد، تسهیل حل تعارضات کارگاهی و هدایت فنی خط در هنگام بروز چالش‌های پیچیده تولید.
          </p>
        </div>
      </div>
    )
  };

  // Role-Specific Tutorial Steps
  let roleSteps = [];

  if (role === 'employee') {
    roleSteps = [
      welcomeStep,
      dimensionsStep,
      {
        id: 3,
        title: 'راهنمای کاربری همکار: ثبت خودارزیابی و مشاهده کارنامه',
        icon: UserRoleIcon('employee'),
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
              <h4 className="font-bold text-teal-400 text-sm">مراحل تکمیل خودارزیابی (صفر تا صد):</h4>
              <p className="text-slate-300 mt-1 text-[11px]">شما به عنوان همکار گرامی دارای دسترسی کامل به فرم خودارزیابی و برنامه رشد فردی خود هستید.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">۱</div>
                <div>
                  <strong className="text-slate-200 dark:text-slate-200 text-slate-800 block">ورود به تب «کارنامه و خودارزیابی من»:</strong>
                  <p className="text-slate-400 mt-0.5 text-[11px]">از منوی کناری روی گزینه «کارنامه و خودارزیابی من» کلیک کنید تا شاخص‌های شغلی خود را ببینید.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">۲</div>
                <div>
                  <strong className="text-slate-200 dark:text-slate-200 text-slate-800 block">امتیازدهی به عملکرد خود (۱ تا ۵):</strong>
                  <p className="text-slate-400 mt-0.5 text-[11px]">با کلیک بر روی دکمه‌های عددی ۱ تا ۵، ارزیابی خود از مهارت و دستاوردتان در هر شاخص را ثبت کنید. (۱: غیرقابل قبول، ۳: مطابق استاندارد، ۵: فوق‌العاده).</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">۳</div>
                <div>
                  <strong className="text-slate-200 dark:text-slate-200 text-slate-800 block">ارسال نهایی به سرپرست مستقیم:</strong>
                  <p className="text-slate-400 mt-0.5 text-[11px]">پس از اتمام، روی دکمه سبز «ارسال نهایی به سرپرست» کلیک کنید تا پرونده به گام بعدی ارزیابی برود.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">۴</div>
                <div>
                  <strong className="text-slate-200 dark:text-slate-200 text-slate-800 block">دریافت IDP و اهداف توسعه فردی:</strong>
                  <p className="text-slate-400 mt-0.5 text-[11px]">پس از تایید سرپرست و کمیته، کارنامه نهایی شما همراه با پیشنهادهای آموزشی هوشمند در همین صفحه نمایش داده می‌شود.</p>
                </div>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 4,
        title: 'رهگیری گردش کار و ثبت اعتراض سازمانی',
        icon: GitFork,
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <h4 className="font-bold text-indigo-400 text-sm">شفافیت کامل در وضعیت پرونده (Workflow):</h4>
              <p className="text-slate-300 mt-1 text-[11px]">در بالای صفحه خودارزیابی و تب «گردش کار و تاییدات»، وضعیت جاری پرونده شما در هر یک از مراحل شش‌گانه قابل مشاهده است.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>مراحل گردش کار:</span>
                </span>
                <p className="text-slate-400 text-[11px]">۱. خودارزیابی → ۲. ارزیابی سرپرست → ۳. کالیبراسیون → ۴. تایید مدیر ارشد HR → ۵. جلسه بازخورد → ۶. بسته شدن نهایی</p>
              </div>

              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>حق ثبت اعتراض رسمی (Appeals):</span>
                </span>
                <p className="text-slate-400 text-[11px]">در صورت مغایرت نمرات با شواهد واقعی کارگاهی، می‌توانید در تب گردش کار درخواست تجدیدنظر با ذکر دلایل ثبت نمایید تا کمیته مستقل بررسی کند.</p>
              </div>
            </div>
          </div>
        )
      }
    ];
  } else if (role === 'supervisor') {
    roleSteps = [
      welcomeStep,
      dimensionsStep,
      {
        id: 3,
        title: 'قانون طلایی ضدسوگیری و ثبت مستندات الزامی',
        icon: ShieldAlert,
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl">
              <h4 className="font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>کنترل سوگیری و تورم نمره‌ای (Anti-Bias Protocols)</span>
              </h4>
              <p className="text-[11px] mt-1.5 leading-relaxed">
                ارزیابی سرپرست مستقیم مبنای پاداش و ارتقای پرسنل است. جهت تضمین حداکثر عدالت، سیستم دارای دو فیلتر هوشمند است:
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl">
                <strong className="text-teal-400 block mb-1">۱. الزام مستندسازی برای نمرات ۱، ۲ و ۵:</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  اگر به همکاری نمره <span className="text-red-400 font-bold">۱ (غیرقابل قبول)</span>، <span className="text-amber-400 font-bold">۲ (نیازمند بهبود)</span> یا نمره عالی <span className="text-emerald-400 font-bold">۵ (فراتر از انتظار)</span> داده شود، سیستم الزام می‌کند حداقل چند کلمه توضیح مستند (مثلاً شماره لاگ MES، سابقه نقص کیفی، یا تقدیرنامه) درج فرمایید.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl">
                <strong className="text-teal-400 block mb-1">۲. مربیگری و تحلیل مغایرت خودارزیابی با سرپرست:</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  در فرم ارزیابی، نمره خود پرسنل در کنار نمره سرپرست نشان داده می‌شود. مغایرت‌های بیش از ۲ نمره باید در جلسه بازخورد حضوری به بحث گذاشته شده و راهکار بهبود مشخص شود.
                </p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 4,
        title: 'نحوه ارزیابی پرسنل و کارتابل وظایف سرپرست',
        icon: Briefcase,
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
              <h4 className="font-bold text-teal-400 text-sm">گردش کار ارزیابی توسط سرپرست خط:</h4>
              <p className="text-slate-300 mt-1 text-[11px]">با طی کردن ۴ گام ساده، کلیه افراد زیرمجموعه خود را ارزیابی و بازخورد هوشمند صادر کنید.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">گام ۱: کارتابل وظایف من</span>
                <p className="text-slate-400 text-[11px]">در تب «گردش کار» لیست تمام پرونده‌هایی که منتظر ارزیابی سرپرست هستند را ببینید.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">گام ۲: نمره‌دهی شاخص‌ها</span>
                <p className="text-slate-400 text-[11px]">در تب «ارزیابی‌ها»، برای هر شاخص نمره از ۱ تا ۵ ثبت و مستندات را بارگذاری یا تایپ کنید.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">گام ۳: دریافت بازخورد هوشمند AI</span>
                <p className="text-slate-400 text-[11px]">روی دکمه «تحلیل مربیگری هوشمند» کلیک کنید تا نقاط قوت، فرصت‌های بهبود و راهکار رشد تولید شود.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">گام ۴: تایید و ارسال به کالیبراسیون</span>
                <p className="text-slate-400 text-[11px]">با تایید فرم، پرونده به کمیته کالیبراسیون و مدیر منابع انسانی ارسال می‌گردد.</p>
              </div>
            </div>
          </div>
        )
      }
    ];
  } else {
    // Admin / HR role
    roleSteps = [
      welcomeStep,
      dimensionsStep,
      {
        id: 3,
        title: 'راهنمای مدیریت ارشد: ساختار شاخص‌ها و نمایه‌های شغلی',
        icon: Briefcase,
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
              <h4 className="font-bold text-teal-400 text-sm">مدیریت ساختار شایستگی سازمانی (Setup):</h4>
              <p className="text-slate-300 mt-1 text-[11px]">به عنوان مدیر سیستم، شما تسلط کامل بر بانک شاخص‌ها، اوزان پروفایل‌های شغلی و ساختار سازمانی دارید.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl">
                <strong className="text-teal-400 block mb-1">۱. بانک مرکزی شاخص‌ها (Criteria Bank):</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  تعریف شاخص‌های استاندارد بر اساس ۵ بعد با فرمول‌های سنجش، منابع استخراج داده و تعریف دقیق سطوح ۱ تا ۵.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl">
                <strong className="text-teal-400 block mb-1">۲. پروفایل‌های شغلی (Job Profiles & Weights):</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  تخصیص شاخص‌ها به مشاغل با رعایت قانون طلایی: <span className="text-emerald-400 font-bold">مجموع اوزان دقیقاً ۱۰۰٪</span> و <span className="text-rose-400 font-bold">حضور اجباری شاخص ایمنی و HSE</span> در تمامی مشاغل.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/60 dark:bg-slate-900/60 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl">
                <strong className="text-teal-400 block mb-1">۳. ساختار درختی سازمانی و سرپرستان:</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  در بخش «مدیریت پرسنل»، می‌توانید سرپرست مستقیم، ارزیاب همتا و تاییدکننده نهایی هر کارمند را متناسب با چارت کارخانه تنظیم کنید.
                </p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 4,
        title: 'کالیبراسیون نمرات، ماتریس ۹-Box و تنظیمات امنیتی',
        icon: Scale,
        content: (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <h4 className="font-bold text-indigo-400 text-sm">ابزارهای تحلیلی و مدیریتی ویژه منابع انسانی:</h4>
              <p className="text-slate-300 mt-1 text-[11px]">امکان پایش توزیع نرمال نمرات کارخانه، کشف استعدادهای کلیدی و حفظ امنیت داده‌ها.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">کالیبراسیون و توزیع زنگوله‌ای</span>
                <p className="text-slate-400 text-[11px]">کنترل سهم رتبه‌های عالی A (حداکثر ۲۰٪) و تعدیل خطای هاله‌ای بین سرپرستان مختلف.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">ماتریس استعداد ۹-Box Grid</span>
                <p className="text-slate-400 text-[11px]">تحلیل تقاطعی عملکرد و پتانسیل پرسنل برای برنامه‌ریزی جانشین‌پروری و پاداش شایستگی.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">اکسل و یکپارچه‌سازی</span>
                <p className="text-slate-400 text-[11px]">خروجی کامل اکسل با فرمت رسمی و امکان ایمپورت سریع داده‌های پرسنلی کارخانه‌ای.</p>
              </div>
              <div className="p-3 bg-slate-900/50 dark:bg-slate-900/50 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">مرکز امنیت و پشتیبان‌گیری</span>
                <p className="text-slate-400 text-[11px]">مدیریت پسوردهای پرسنل، لاگ‌های سیستمی و بکاپ‌گیری ابری خودکار بدون قطعی.</p>
              </div>
            </div>
          </div>
        )
      }
    ];
  }

  // Quiz step for everyone to earn verified badge
  const quizStep = {
    id: roleSteps.length + 1,
    title: 'آزمون تایید صلاحیت و اخذ نشان ارزیابی',
    icon: Award,
    content: (
      <div className="space-y-4 text-xs leading-relaxed">
        <p className="text-slate-300 leading-relaxed">
          جهت تایید تسلط بر سامانه و آیین‌نامه ارزیابی عملکرد <span className="text-teal-400 font-bold">اصفهان چالاک</span>، لطفاً به سوالات آزمون زیر پاسخ دهید تا نشان افتخار <span className="text-purple-400 font-bold">ارزیاب ذیصلاح</span> روی نمایه شما ثبت گردد.
        </p>

        <div className="p-4 bg-slate-900/80 dark:bg-slate-900/80 bg-slate-50 border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl space-y-4">
          {quizSubmitted && quizScore === 2 ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>
              <h4 className="font-black text-purple-400 text-sm">تبریک! آزمون با موفقیت گذرانده شد</h4>
              <p className="text-slate-300 text-xs">گواهینامه «ارزیاب معتمد اصفهان چالاک» صادر و بر روی نمایه شما فعال گردید.</p>
              <div className="inline-block bg-purple-500/20 text-purple-300 font-bold px-3 py-1.5 rounded-xl text-xs border border-purple-500/30">
                🎖️ ارزیاب ذیصلاح اصفهان چالاک
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Q1 */}
              <div className="space-y-2">
                <p className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">۱. در سامانه اصفهان چالاک، برای کدام نمرات ثبت شواهد و مستندات توجیهی الزامی است؟</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 1, text: 'الف) فقط نمره ۵ (عالی)' },
                    { id: 2, text: 'ب) نمرات ۱ (غیرقابل قبول)، ۲ (نیازمند بهبود) و ۵ (فراتر از انتظار)' },
                    { id: 3, text: 'ج) تمامی نمرات از ۱ تا ۵ بدون استثنا' }
                  ].map(ans => (
                    <button
                      key={ans.id}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, 1: ans.id })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                        selectedAnswers[1] === ans.id 
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-bold' 
                          : 'bg-slate-950/60 dark:bg-slate-950/60 bg-white border-slate-800 dark:border-slate-800 border-slate-200 hover:bg-slate-800 text-slate-300 dark:text-slate-300 text-slate-700'
                      }`}
                    >
                      {ans.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div className="space-y-2">
                <p className="font-bold text-slate-200 dark:text-slate-200 text-slate-800">۲. هدف اصلی از فرآیند ارزیابی عملکرد و مربیگری هوشمند چیست؟</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 1, text: 'الف) مچ‌گیری فنی از اپراتورها و ثبت جریمه‌های انضباطی' },
                    { id: 2, text: 'ب) تولید خودکار نمرات بدون دخالت نظر سرپرست' },
                    { id: 3, text: 'ج) شناسایی نقاط قوت و ضعف برای ارائه برنامه اقدام عملی و رشددهنده توسعه فردی (IDP)' }
                  ].map(ans => (
                    <button
                      key={ans.id}
                      type="button"
                      onClick={() => setSelectedAnswers({ ...selectedAnswers, 2: ans.id })}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer text-xs ${
                        selectedAnswers[2] === ans.id 
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 font-bold' 
                          : 'bg-slate-950/60 dark:bg-slate-950/60 bg-white border-slate-800 dark:border-slate-800 border-slate-200 hover:bg-slate-800 text-slate-300 dark:text-slate-300 text-slate-700'
                      }`}
                    >
                      {ans.text}
                    </button>
                  ))}
                </div>
              </div>

              {quizSubmitted && quizScore !== 2 && (
                <p className="text-red-400 font-bold text-xs bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">پاسخ‌ها صحیح نیستند. لطفاً گزینه‌های صحیح را انتخاب کنید!</p>
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
                ثبت پاسخ و ارزیابی آزمون
              </button>
            </div>
          )}
        </div>
      </div>
    )
  };

  const allSteps = [...roleSteps, quizStep];
  const currentStepData = allSteps.find(s => s.id === activeStep) || allSteps[0];
  const StepIcon = currentStepData.icon;

  const roleLabelMap: Record<UserRole, string> = {
    employee: 'همکار / اپراتور کارگاه',
    supervisor: 'سرپرست خط و ارزیاب',
    admin: 'مدیر ارشد منابع انسانی'
  };

  return (
    <div className="space-y-6 text-right w-full overflow-hidden" dir="rtl">
      {/* Header Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex justify-between items-center flex-wrap gap-4 ${
        theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-100 dark:text-slate-100 text-slate-800 tracking-tight">آموزش بدو ورود و توانمندسازی پرسنل</h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                نقش شما: {roleLabelMap[role]}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">توجیه آیین‌نامه ارزیابی عملکرد و مربیگری سرمایه‌های انسانی اصفهان چالاک</p>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20 shrink-0"
        >
          <span>ورود به سامانه کاربری</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Main Row layout with steps navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Steps Selector */}
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
                    : 'bg-slate-900/20 dark:bg-slate-900/20 bg-white border-slate-800/60 dark:border-slate-800/60 border-slate-200 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  IsActive ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <StepIconRef className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-slate-500 block font-mono">بخش {st.id} از {allSteps.length}</span>
                  <span className="text-xs truncate block font-bold">{st.title}</span>
                </div>
              </button>
            );
          })}

          {/* Corrected Phone Extension Card */}
          <div className="p-4 bg-slate-900/40 dark:bg-slate-900/40 bg-slate-50 border border-dashed border-slate-800 dark:border-slate-800 border-slate-300 rounded-2xl text-center space-y-2 mt-4 text-xs">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
              <PhoneCall className="w-4 h-4" />
            </div>
            <p className="font-black text-slate-200 dark:text-slate-200 text-slate-800">نیاز به راهنمایی بیشتر دارید؟</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              می‌توانید با <strong className="text-teal-400 font-bold font-mono">داخلی ۶۶۱۲</strong> (<span className="font-bold text-slate-300">منابع انسانی اصفهان چالاک</span>) تماس حاصل فرمایید.
            </p>
          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div className={`lg:col-span-3 border p-5 sm:p-6 rounded-3xl space-y-5 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60 dark:border-slate-800/60 border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-100 dark:text-slate-100 text-slate-800 truncate">{currentStepData.title}</h3>
              <p className="text-[10px] text-slate-400">گام آموزشی {currentStepData.id} از {allSteps.length}</p>
            </div>
          </div>

          <div className="min-h-[260px]">
            {currentStepData.content}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800/60 dark:border-slate-800/60 border-slate-200">
            <span className="text-xs text-slate-400 text-center sm:text-right">
              {hasCertifiedBadge ? (
                <span className="text-purple-400 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <Award className="w-4 h-4" />
                  <span>گواهی‌نامه ارزیاب ذیصلاح اصفهان چالاک برای شما فعال است</span>
                </span>
              ) : (
                <span>با اتمام مراحل آموزش و پاسخ به آزمون، نشان ارزیاب را فعال کنید.</span>
              )}
            </span>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              {activeStep > 1 && (
                <button
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  مرحله قبلی
                </button>
              )}
              {activeStep < allSteps.length ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-teal-500/20"
                >
                  <span>مرحله بعدی</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تکمیل آموزش و شروع به کار</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function UserRoleIcon(role: UserRole) {
  return function RoleIconComponent(props: any) {
    if (role === 'employee') return <Users {...props} />;
    if (role === 'supervisor') return <ClipboardCheckIcon {...props} />;
    return <LockKeyhole {...props} />;
  };
}

function ClipboardCheckIcon(props: any) {
  return <Briefcase {...props} />;
}
