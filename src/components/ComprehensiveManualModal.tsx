import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  FileDown, 
  Search, 
  BookOpen, 
  X, 
  CheckCircle2, 
  Award, 
  Users, 
  LayoutDashboard, 
  ClipboardCheck, 
  GitFork, 
  Target, 
  Monitor, 
  Calculator, 
  Briefcase, 
  Scale, 
  TrendingUp, 
  LockKeyhole, 
  HelpCircle,
  AlertTriangle,
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Lock,
  Unlock,
  Sliders,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Employee, UserRole } from '../types';
import { 
  ManualAccessPolicy, 
  getManualAccessPolicy, 
  saveManualAccessPolicy, 
  canUserViewManual, 
  canUserDownloadManual 
} from '../utils/manualAccessManager';

interface ComprehensiveManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
  currentUser?: Employee | null;
  employees?: Employee[];
}

export default function ComprehensiveManualModal({
  isOpen,
  onClose,
  theme = 'light',
  currentUser = null,
  employees = []
}: ComprehensiveManualModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState<string>('all');
  const [policy, setPolicy] = useState<ManualAccessPolicy>(getManualAccessPolicy);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handlePolicyUpdate = () => {
      setPolicy(getManualAccessPolicy());
    };
    window.addEventListener('manual_access_policy_updated', handlePolicyUpdate);
    return () => window.removeEventListener('manual_access_policy_updated', handlePolicyUpdate);
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';
  const canView = canUserViewManual(currentUser, policy);
  const canDownload = canUserDownloadManual(currentUser, policy);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!canDownload) return;
    window.print();
  };

  const handleDownloadMarkdown = () => {
    if (!canDownload) return;
    const markdownContent = `# کتابچه راهنمای جامع سامانه مدیریت عملکرد اصفهان چالاک
کاربر: ${currentUser?.name || 'پرسنل'} (${currentUser?.code || '-'})
تاریخ: ${new Date().toLocaleDateString('fa-IR')}

## بخش ۱: آشنایی با سامانه و چرخه ارزیابی
این سامانه با تکیه بر استانداردهای علمی منابع انسانی و مدل‌های BARS، Z-Score و اهداف OKR پیاده‌سازی شده است.
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'راهنمای_جامع_مدیریت_عملکرد_چالاک.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-100">دسترسی به کتابچه محدود است</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              مشاهده این سند برای سطح دسترسی شما مجاز اعلام نشده است.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 font-sans" dir="rtl">
      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-700/70 rounded-2xl p-3 sm:p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky top-2 z-40 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-100">کتابچه راهنمای جامع مدیریت عملکرد اصفهان چالاک</h2>
              {canDownload ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  نسخه چاپی و PDF
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  مشاهده آنلاین
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">راهنمای استفاده از تمام بخش‌های سامانه</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canDownload && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
                title="چاپ یا ذخیره به عنوان PDF"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="دانلود فایل متن"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">دانلود متنی</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        id="printable-manual-document"
        className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 md:p-14 shadow-2xl space-y-10 border border-slate-200"
      >
        <header className="border-b-4 border-teal-600 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-teal-700">شرکت اصفهان چالاک - هلدینگ گیتی پسند</span>
              <h1 className="text-2xl font-black text-slate-900 mt-1">
                دستورالعمل اجرایی و راهنمای کاربری سامانه مدیریت عملکرد
              </h1>
            </div>
            <div className="text-left text-xs text-slate-500">
              <p>کد سند: SOP-HR-1403</p>
              <p>نسخه: 4.1.0 Cloudflare</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
          <h3 className="text-base font-black text-slate-900 border-r-4 border-teal-600 pr-3">
            ۱. اهداف و ارکان مدیریت عملکرد
          </h3>
          <p>
            سامانه ارزیابی عملکرد و مربیگری هوشمند اصفهان چالاک با هدف استقرار نظام عدالت‌محور سنجش عملکرد، ارتقای بهره‌وری خطوط تولید، کاهش توقفات و ضایعات، و هدایت پرسنل از طریق جلسات مربیگری دوطرفه و برنامه‌های توسعه فردی (IDP) طراحی و مستقر شده است.
          </p>

          <h3 className="text-base font-black text-slate-900 border-r-4 border-teal-600 pr-3">
            ۲. همگام‌سازی ابری و دسترسی مستقل کاربران (Cloudflare Pages + KV)
          </h3>
          <p>
            سامانه بر بستر سرورهای ابری Cloudflare اجرا شده و پایگاه داده با سیستم ذخیره‌سازی KV پیوند یافته است. این ویژگی موجب می‌گردد کلیه کاربران (مدیران ارشد، سرپرستان کارگاه و پرسنل) از هر دستگاهی به صورت بی‌درنگ با آخرین داده‌های سازمان همگام شوند و تغییرات ثبت‌شده به صورت خودکار به اطلاع سایر کاربران برسد.
          </p>

          <h3 className="text-base font-black text-slate-900 border-r-4 border-teal-600 pr-3">
            ۳. گردش‌کار استاندارد (Workflow)
          </h3>
          <p>
            چرخه ارزیابی شامل مراحل زیر است:
            ۱) هدف‌گذاری و ابلاغ شاخص‌ها
            ۲) خودارزیابی توسط پرسنل
            ۳) ارزیابی کیفی و ثبت شواهد توسط سرپرست مستقیم
            ۴) جلسه کمیته کالیبراسیون و انطباق توزیع نرمال
            ۵) تایید نهایی مدیریت منابع انسانی
            ۶) برگزاری جلسه بازخورد مربیگری و ثبت برنامه توسعه فردی (IDP)
          </p>
        </section>
      </div>
    </div>
  );
}
