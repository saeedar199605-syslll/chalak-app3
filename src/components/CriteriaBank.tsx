/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { validateCriterionInput } from '../utils/validation';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  Info, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Layers, 
  Sparkles, 
  Download,
  Calculator,
  Zap,
  Building2,
  Clock,
  UserCheck,
  Cpu,
  Database,
  GitFork,
  X
} from 'lucide-react';
import { Criterion, CategoryKey, CATEGORIES, Employee, JobProfile, Evaluation, CriterionScoringSource, MisMetricKey } from '../types';
import UniversalDataExchange, { DataExchangeConfig } from './UniversalDataExchange';
import KpiFormulaEngineModal from './KpiFormulaEngineModal';
import MultiSourceCriteriaImportModal, { MergeStrategy } from './MultiSourceCriteriaImportModal';
import { db } from '../utils/db';

interface CriteriaBankProps {
  criteria: Criterion[];
  onAddCriterion: (crit: Omit<Criterion, 'id'>) => boolean;
  onUpdateCriterion: (id: string, crit: Omit<Criterion, 'id'>) => boolean;
  onDeleteCriterion: (id: string) => void;
  onBulkDeleteCriteria?: (ids: string[]) => void;
  onBatchAddCriteria?: (
    newOrUpdatedList: Array<Omit<Criterion, 'id'> & { id?: string }>,
    mode?: MergeStrategy
  ) => void;
  employees?: Employee[];
  profiles?: JobProfile[];
  evaluations?: Evaluation[];
  onUpdateEvaluations?: (nextEvals: Evaluation[]) => void;
  theme?: 'dark' | 'light';
}

const PRESET_LIBRARIES = [
  {
    title: 'شاخص‌های کلیدی تولید (KPI)',
    category: 'K' as CategoryKey,
    description: 'راندمان، اثربخشی OEE، کاهش توقفات خط و نرخ استاندارد تولید',
    items: [
      { code: 'K-PRD-01', cat: 'K' as CategoryKey, name: 'راندمان شیفت کاری', def: 'تحقق اهداف تیراژ در سیستم اطلاعات تولید MES', source: 'سیستم اطلاعات تولید MES و خطوط', method: 'تولید واقعی / تولید استاندارد (درصد)', dir: 'more' as const },
      { code: 'K-PRD-02', cat: 'K' as CategoryKey, name: 'اثربخشی کلی تجهیزات (OEE)', def: 'محاسبه سه‌گانه دسترس‌پذیری، عملکرد و کیفیت', source: 'سنسورهای خط و لاگ PLC', method: 'فرمول استاندارد جهانی OEE', dir: 'more' as const },
      { code: 'K-PRD-03', cat: 'K' as CategoryKey, name: 'کاهش توقفات ناخواسته', def: 'زمان‌های وقفه اضطراری در شیفت کاری', source: 'دفتر وقایع نگهداری تعمیرات', method: 'مجموع دقایق توقف (کمتر بهتر)', dir: 'less' as const },
      { code: 'K-PRD-04', cat: 'K' as CategoryKey, name: 'زمان میانگین تعمیر (MTTR)', def: 'سرعت رفع خرابی و بازگشت به چرخه کار', source: 'لاگ تعمیرات فنی کارگاه', method: 'متوسط زمان رفع عیب (دقیقه)', dir: 'less' as const }
    ]
  },
  {
    title: 'شاخص‌های کنترل و تضمین کیفیت (QC / QA)',
    category: 'K' as CategoryKey,
    description: 'کاهش ضایعات، تلرانس ابعادی و نرخ پاس اولیه قطعه',
    items: [
      { code: 'K-QC-01', cat: 'K' as CategoryKey, name: 'نرخ پذیرش در اولین پاس (FTT)', def: 'درصد قطعات سالم بدون نیاز به دوباره‌کاری', source: 'چک‌لیست بازرسی ایستگاه نهایی', method: 'First Time Through %', dir: 'more' as const },
      { code: 'K-QC-02', cat: 'K' as CategoryKey, name: 'نرخ عیوب ارسالی به مشتری (PPM)', def: 'تعداد قطعه معیوب در یک میلیون قطعه تحویلی', source: 'گزارشات شکایات مشتری و CRM کارخانه', method: 'تعداد عیب در میلیون (کمتر بهتر)', dir: 'less' as const },
      { code: 'B-QC-01', cat: 'B' as CategoryKey, name: 'دقت در ثبت کارت‌های ردیابی قطعه', def: 'ثبت بدون نقص بچ‌نامبر و اسناد بازرسی', source: 'ممیزی ادواری تضمین کیفیت', method: 'امتیاز چک‌لیست مستندسازی' }
    ]
  },
  {
    title: 'شایستگی‌های ایمنی و آراستگی (HSE & 5S)',
    category: 'B' as CategoryKey,
    description: 'استفاده از PPE، گزارش شبه‌حادثه و نظام ۵S کارگاهی',
    items: [
      { code: 'B-HSE-01', cat: 'B' as CategoryKey, name: 'رعایت استاندارد تجهیزات حفاظت فردی', def: 'استفاده مداوم از کفش، کلاه، دستکش و عینک ایمنی', source: 'ممیزی سرزده واحد HSE', method: 'نرخ عدم‌انطباق ایمنی' },
      { code: 'B-5S-01', cat: 'B' as CategoryKey, name: 'نظم و آراستگی محیط کار (5S)', def: 'ساماندهی، پاکیزه‌سازی و استانداردسازی ابزار و ایستگاه', source: 'ارزیابی هفتگی کمیته ۵S', method: 'چک‌لیست پنج مرحله‌ای آراستگی' },
      { code: 'B-TEAM-01', cat: 'B' as CategoryKey, name: 'همکاری و تعامل مؤثر در شیفت', def: 'کمک به سایر اعضای خط در زمان گلوگاه‌های تولید', source: 'مشاهدات سرپرست مستقیم', method: 'مقیاس رفتارنگار BARS' }
    ]
  },
  {
    title: 'شاخص‌های تنظیم و قالب‌بندی (SMED)',
    category: 'K' as CategoryKey,
    description: 'سرعت تعویض قالب و ستاپ دستگاه‌های CNC',
    items: [
      { code: 'K-SET-01', cat: 'K' as CategoryKey, name: 'زمان تعویض قالب (Setup Time)', def: 'مدت زمان آماده‌سازی خط بر اساس اصول SMED', source: 'زمان‌سنجی تولید و مهندسی صنایع', method: 'دقیقه صرف شده برای ستاپ (کمتر بهتر)', dir: 'less' as const },
      { code: 'K-SET-02', cat: 'K' as CategoryKey, name: 'دقت در بستن و تراز قالب', def: 'صحت تنظیم بدون نیاز به فیلرگیری مکرر', source: 'چک‌لیست تایید قطعه اول توسط کنترل کیفیت', method: 'پاس شدن قطعه اول در تست نهایی', dir: 'more' as const }
    ]
  }
];

export default function CriteriaBank({ 
  criteria, 
  onAddCriterion, 
  onUpdateCriterion, 
  onDeleteCriterion,
  onBulkDeleteCriteria,
  onBatchAddCriteria,
  employees = [],
  profiles = [],
  evaluations = [],
  onUpdateEvaluations,
  theme = 'dark'
}: CriteriaBankProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryKey | 'ALL'>('ALL');
  const [selectedCritIds, setSelectedCritIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [criterionToDelete, setCriterionToDelete] = useState<Criterion | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isMultiSourceModalOpen, setIsMultiSourceModalOpen] = useState(false);
  const [multiSourceNotice, setMultiSourceNotice] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStatusMsg, setBulkStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleCommitMultiSource = (
    mergedCriteria: Array<Omit<Criterion, 'id'> & { id?: string }>,
    strategy: MergeStrategy,
    stats: { total: number; added: number; updated: number; departments: string[] }
  ) => {
    if (onBatchAddCriteria) {
      onBatchAddCriteria(mergedCriteria, strategy);
    } else {
      const mode = strategy === 'replace' ? 'replace' : strategy === 'skip_existing' ? 'skip_existing' : 'merge';
      db.saveCriteriaBatch(mergedCriteria, mode);
    }
    setMultiSourceNotice(
      `تعداد ${stats.total} شاخص از ${stats.departments.length} دپارتمان با موفقیت ثبت شد (${stats.added} شاخص جدید، ${stats.updated} بروزرسانی).`
    );
    setTimeout(() => setMultiSourceNotice(null), 8000);
  };

  const criteriaExchangeConfig: DataExchangeConfig<Criterion> = {
    entityName: 'بانک شاخص‌های عملکردی',
    entityKey: 'criteria',
    items: criteria,
    csvHeaders: [
      { key: 'code', label: 'کد شاخص' },
      { key: 'name', label: 'عنوان شاخص' },
      { key: 'cat', label: 'دسته شایستگی (K/B)', accessor: (c) => c.cat },
      { key: 'def', label: 'تعریف عملیاتی' },
      { key: 'source', label: 'منبع داده', accessor: (c) => c.source || '' },
      { key: 'method', label: 'روش سنجش', accessor: (c) => c.method || '' },
      { key: 'dir', label: 'جهت مطلوبیت (more/less)', accessor: (c) => c.dir || 'more' }
    ],
    templateSampleRows: [
      { 'کد شاخص': 'K-PRD-10', 'عنوان شاخص': 'تیراژ تولید ایستگاه مونتاژ', 'دسته شایستگی (K/B)': 'K', 'تعریف عملیاتی': 'تعداد قطعه مونتاژ شده استاندارد', 'منبع داده': 'سامانه اطلاعات تولید MES', 'روش سنجش': 'شمارش خروجی نهایی', 'جهت مطلوبیت (more/less)': 'more' },
      { 'کد شاخص': 'B-HSE-02', 'عنوان شاخص': 'حفظ پاکیزگی و نظافت فردی کارگاه', 'دسته شایستگی (K/B)': 'B', 'تعریف عملیاتی': 'شستشوی دست و محیط قبل از جابجایی قطعات', 'منبع داده': 'ممیزی ایمنی HSE', 'روش سنجش': 'چک‌لیست بهداشت فردی', 'جهت مطلوبیت (more/less)': 'more' }
    ],
    onImport: (importedItems, mode) => {
      let count = 0;
      const errors: string[] = [];

      importedItems.forEach((item: any, index: number) => {
        const rowNum = index + 1;
        const rawCode = (item.code || item['کد شاخص'] || `C-${Math.floor(Math.random() * 1000)}`).trim();
        const rawName = (item.name || item['عنوان شاخص'] || 'شاخص جدید').trim();
        const rawCat = ((item.cat || item['دسته شایستگی (K/B)'] || item['دسته'] || 'K').toString().toUpperCase().startsWith('B') ? 'B' : 'K') as CategoryKey;
        const rawDef = (item.def || item['تعریف عملیاتی'] || item['تعریف'] || `تعریف شاخص ${rawName}`).trim();
        const rawSource = (item.source || item['منبع داده'] || item['منبع'] || 'سرپرست واحد').trim();
        const rawMethod = (item.method || item['روش سنجش'] || item['روش'] || 'بررسی عملکردی').trim();
        const rawDir = ((item.dir || item['جهت مطلوبیت (more/less)'] || item['جهت'] || 'more') === 'less' ? 'less' : 'more') as 'more' | 'less';

        const candidate = {
          code: rawCode,
          name: rawName,
          cat: rawCat,
          def: rawDef,
          source: rawSource,
          method: rawMethod,
          dir: rawDir
        };

        const validation = validateCriterionInput(candidate);
        if (!validation.success) {
          errors.push(`ردیف ${rowNum} (${rawCode}): ${validation.errors.join(' | ')}`);
          return;
        }

        const validCrit = validation.data;
        const existing = criteria.find(c => c.code.toLowerCase() === validCrit.code.toLowerCase());

        if (existing) {
          if (mode === 'replace' || mode === 'merge') {
            const ok = onUpdateCriterion(existing.id, validCrit);
            if (ok) count++;
          }
        } else {
          const ok = onAddCriterion(validCrit);
          if (ok) count++;
        }
      });

      return {
        count,
        message: `با موفقیت ${count} شاخص در پایگاه داده ثبت/بروزرسانی شد.`,
        errors
      };
    }
  };

  const [formCode, setFormCode] = useState('');
  const [formCat, setFormCat] = useState<CategoryKey>('K');
  const [formName, setFormName] = useState('');
  const [formDef, setFormDef] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formMethod, setFormMethod] = useState('');
  const [formDir, setFormDir] = useState<'more' | 'less'>('more');
  const [formScoringSource, setFormScoringSource] = useState<CriterionScoringSource>('supervisor');
  const [formMisMetricKey, setFormMisMetricKey] = useState<MisMetricKey>('efficiency');
  const [formCustomMetricField, setFormCustomMetricField] = useState('');
  const [formAutoPopulate, setFormAutoPopulate] = useState(true);
  const [formMisTargetValue, setFormMisTargetValue] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const openForm = (crit?: Criterion) => {
    if (crit) {
      setEditingId(crit.id);
      setFormCode(crit.code);
      setFormCat(crit.cat);
      setFormName(crit.name);
      setFormDef(crit.def);
      setFormSource(crit.source || '');
      setFormMethod(crit.method || '');
      setFormDir(crit.dir || 'more');
      setFormScoringSource(crit.scoringSource || (crit.cat === 'K' ? 'mis' : crit.code.startsWith('B-01') ? 'kasra' : 'supervisor'));
      setFormMisMetricKey(crit.misMetricKey || (crit.code === 'K-04' ? 'scrap_rate' : 'efficiency'));
      setFormCustomMetricField(crit.customMetricField || '');
      setFormAutoPopulate(crit.autoPopulate !== undefined ? crit.autoPopulate : true);
      setFormMisTargetValue(crit.misTargetValue !== undefined ? String(crit.misTargetValue) : '');
    } else {
      setEditingId(null);
      setFormCode('');
      setFormCat('K');
      setFormName('');
      setFormDef('');
      setFormSource('');
      setFormMethod('');
      setFormDir('more');
      setFormScoringSource('supervisor');
      setFormMisMetricKey('efficiency');
      setFormCustomMetricField('');
      setFormAutoPopulate(true);
      setFormMisTargetValue('');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawData = {
      code: formCode,
      cat: formCat,
      name: formName,
      def: formDef,
      source: formSource || (formScoringSource === 'mis' ? 'سیستم اطلاعات تولید MIS/MES' : formScoringSource === 'kasra' ? 'حضور و غیاب کسری' : 'سرپرست مستقیم'),
      method: formMethod || undefined,
      dir: formCat === 'K' ? formDir : undefined,
      scoringSource: formScoringSource,
      misMetricKey: (formScoringSource === 'mis' || formScoringSource === 'kasra') ? formMisMetricKey : undefined,
      customMetricField: formCustomMetricField.trim() ? formCustomMetricField.trim() : undefined,
      autoPopulate: formAutoPopulate,
      misTargetValue: formMisTargetValue ? Number(formMisTargetValue) : undefined,
    };

    const validation = validateCriterionInput(rawData);
    if (!validation.success) {
      setErrorMsg(validation.errors.join(' | '));
      return;
    }

    const payload = validation.data;
    let success = false;
    if (editingId) {
      success = onUpdateCriterion(editingId, payload);
    } else {
      success = onAddCriterion(payload);
    }

    if (success) {
      setIsModalOpen(false);
    } else {
      setErrorMsg('کد شاخص تکراری است. لطفاً کد یکتا وارد کنید.');
    }
  };

  const handleLoadPreset = (presetItems: typeof PRESET_LIBRARIES[0]['items']) => {
    let addedCount = 0;
    presetItems.forEach(item => {
      const exists = criteria.some(c => c.code.toLowerCase() === item.code.toLowerCase());
      if (!exists) {
        const ok = onAddCriterion(item);
        if (ok) addedCount++;
      }
    });
    if (addedCount > 0) {
      setBulkStatusMsg({ text: `با موفقیت ${addedCount} شاخص به بانک اضافه شد.`, type: 'success' });
    } else {
      setBulkStatusMsg({ text: 'تمامی شاخص‌های این بسته از قبل در سیستم موجودند.', type: 'info' });
    }
  };

  const handleProcessBulkText = () => {
    if (!bulkText.trim()) {
      setBulkStatusMsg({ text: 'متن ورودی خالی است.', type: 'error' });
      return;
    }
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let addedCount = 0;
    lines.forEach(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 3) {
        const code = parts[0]?.trim();
        const cat = (parts[1]?.trim().toUpperCase() === 'B' ? 'B' : 'K') as CategoryKey;
        const name = parts[2]?.trim();
        const def = parts[3]?.trim() || `تعریف عملیاتی ${name}`;
        const source = parts[4]?.trim() || 'سرپرست کارگاه';
        const method = parts[5]?.trim() || 'بررسی ماهانه';
        const dir = (parts[6]?.trim() === 'less' ? 'less' : 'more') as 'more' | 'less';

        if (code && name) {
          const exists = criteria.some(c => c.code.toLowerCase() === code.toLowerCase());
          if (!exists) {
            const ok = onAddCriterion({
              code,
              cat,
              name,
              def,
              source,
              method,
              dir: cat === 'K' ? dir : undefined
            });
            if (ok) addedCount++;
          }
        }
      }
    });
    if (addedCount > 0) {
      setBulkStatusMsg({ text: `با موفقیت ${addedCount} شاخص از متن استخراج و اضافه شد.`, type: 'success' });
      setBulkText('');
    } else {
      setBulkStatusMsg({ text: 'فرمت داده‌ها صحیح نبود یا همه کدها تکراری هستند.', type: 'error' });
    }
  };

  const filteredCriteria = criteria.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.def.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || c.cat === selectedCat;
    
    const effectiveSource = c.scoringSource || (c.cat === 'K' ? 'mis' : c.code.startsWith('B-01') ? 'kasra' : 'supervisor');
    const matchesSource = selectedSource === 'ALL' || effectiveSource === selectedSource;

    return matchesSearch && matchesCat && matchesSource;
  });

  const handleToggleSelectAll = () => {
    if (selectedCritIds.size === filteredCriteria.length) {
      setSelectedCritIds(new Set());
    } else {
      setSelectedCritIds(new Set(filteredCriteria.map(c => c.id)));
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedCritIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCritIds(next);
  };

  const handleExecuteBulkDelete = () => {
    if (selectedCritIds.size === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedCritIds.size === 0) return;
    if (onBulkDeleteCriteria) {
      onBulkDeleteCriteria(Array.from(selectedCritIds));
    } else {
      selectedCritIds.forEach(id => onDeleteCriterion(id));
    }
    setSelectedCritIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">بانک شاخص‌های عملکرد و شایستگی‌ها</h1>
          <p className="text-sm text-slate-400 mt-1">
            مخزن متمرکز و استاندارد پارامترهای کمی، کیفی، رفتاری و ایمنی شرکت اصفهان چالاک
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsMultiSourceModalOpen(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-600/25 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>ادغام چندمنبعی (JSON/CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFormulaModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>فرمول‌نویسی خودکار KPI</span>
          </button>
          <button
            onClick={() => setIsExchangeModalOpen(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>انتقال داده (اکسل/JSON)</span>
          </button>
          <button
            onClick={() => {
              setBulkStatusMsg(null);
              setIsBulkModalOpen(true);
            }}
            className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>افزودن بسته‌ای شاخص</span>
          </button>
          <button
            onClick={() => openForm()}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف شاخص جدید</span>
          </button>
        </div>
      </div>

      {/* Multi-Source Import Notice Alert */}
      {multiSourceNotice && (
        <div className="bg-gradient-to-r from-cyan-950/60 to-emerald-950/40 border border-cyan-500/40 text-cyan-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{multiSourceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setMultiSourceNotice(null)}
            className="text-cyan-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Warning */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-2xl flex gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">راهنمای تخصیص شاخص‌ها:</p>
          <p className="text-slate-300 mt-1">
            هر شاخص باید دارای کد یکتا و تعریف عملیاتی شفاف باشد. برای شاخص‌های کمی (KPI)، سیستم‌های منبع داده (مانند MES/WMS/HSE) و فرمول ریاضی را مشخص نمایید.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در شاخص‌ها، کد، یا تعریف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setSelectedCat('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCat === 'ALL'
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            همه دسته‌ها ({criteria.length})
          </button>
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((cat) => {
            const count = criteria.filter(c => c.cat === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCat === cat
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                {CATEGORIES[cat]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto border-t md:border-t-0 md:border-r border-slate-800 pt-2 md:pt-0 md:pr-4">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">منبع داده:</span>
          <button
            onClick={() => setSelectedSource('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              selectedSource === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            همه
          </button>
          <button
            onClick={() => setSelectedSource('mis')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              selectedSource === 'mis'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-blue-400 hover:bg-blue-500/10 border border-blue-500/20'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>تولید MIS</span>
          </button>
          <button
            onClick={() => setSelectedSource('supervisor')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              selectedSource === 'supervisor'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>سرپرست</span>
          </button>
          <button
            onClick={() => setSelectedSource('kasra')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              selectedSource === 'kasra'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-950 text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>تردد (کسری)</span>
          </button>
          <button
            onClick={() => setSelectedSource('multi_source')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              selectedSource === 'multi_source'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-950 text-teal-400 hover:bg-teal-500/10 border border-teal-500/20'
            }`}
          >
            <GitFork className="w-3 h-3" />
            <span>چندمنبعی</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Actions Bar */}
      {selectedCritIds.size > 0 && (
        <div className="bg-teal-950/40 border border-teal-500/30 p-3.5 rounded-2xl flex items-center justify-between animate-in fade-in flex-wrap gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-teal-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{selectedCritIds.size} شاخص انتخاب شده است</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف دسته‌جمعی ({selectedCritIds.size} شاخص)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCritIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* Table List */}
      <div className="bg-slate-800/20 border border-slate-800/80 rounded-2xl overflow-hidden">
        {filteredCriteria.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="sticky top-16 z-20 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold shadow-sm">
                  <th className="p-4 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredCriteria.length > 0 && selectedCritIds.size === filteredCriteria.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                      title="انتخاب همه"
                    />
                  </th>
                  <th className="p-4 text-right w-20">کد</th>
                  <th className="p-4 text-right w-36">دسته‌بندی</th>
                  <th className="p-4 text-right">عنوان شاخص و تعریف</th>
                  <th className="p-4 text-center w-36">منبع ثبت نمره</th>
                  <th className="p-4 text-center w-36">منبع داده و روش سنجش</th>
                  <th className="p-4 text-left w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCriteria.map((c) => {
                  const effectiveSource = c.scoringSource || (c.cat === 'K' ? 'mis' : c.code.startsWith('B-01') ? 'kasra' : 'supervisor');
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCritIds.has(c.id)}
                          onChange={(e) => handleToggleSelect(c.id, e)}
                          className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-teal-400 text-sm">{c.code}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          c.cat === 'K' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/10' :
                          c.cat === 'Q' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/10' :
                          c.cat === 'B' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/10' :
                          c.cat === 'S' ? 'bg-red-500/10 text-red-300 border border-red-500/10' :
                          'bg-emerald-500/10 text-emerald-300 border border-emerald-500/10'
                        }`}>
                          {CATEGORIES[c.cat]}
                        </span>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-bold text-slate-200 flex items-center gap-2 flex-wrap">
                          <span>{c.name}</span>
                          {c.cat === 'K' && (
                            <span className={`text-[9px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                              c.dir === 'more' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {c.dir === 'more' ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>بیشتر مطلوب‌تر</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownLeft className="w-3 h-3" />
                                  <span>کمتر مطلوب‌تر</span>
                                </>
                              )}
                            </span>
                          )}
                          {c.formulaExpression && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Calculator className="w-3 h-3" />
                              <span>{c.formulaExpression}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] leading-relaxed max-w-xl">{c.def}</div>
                      </td>
                      <td className="p-4 text-center">
                        {effectiveSource === 'mis' ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>سیستم اطلاعات تولید MIS</span>
                            </span>
                          </div>
                        ) : effectiveSource === 'kasra' ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>تردد (کسری)</span>
                            </span>
                          </div>
                        ) : effectiveSource === 'multi_source' ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              <span>چندمنبعی ترکیبی</span>
                            </span>
                          </div>
                        ) : effectiveSource === 'system' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            <span>محاسبه خودکار فرمولی</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>ارزیابی کیفی سرپرست</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center text-slate-400 max-w-[150px] truncate" title={c.method || c.source}>
                        {c.source || c.method || 'ثبت سرپرست'}
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openForm(c)}
                            className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                            title="ویرایش شاخص"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCriterionToDelete(c)}
                            className="p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer text-slate-400 hover:text-red-400"
                            title="حذف شاخص"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-base font-bold">شاخصی با این مشخصات یافت نشد.</p>
            <p className="text-xs">می‌توانید شاخص جدید تعریف کنید یا بسته‌های پیش‌فرض را بارگذاری نمایید.</p>
          </div>
        )}
      </div>

      {/* MODAL DIALOGS */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200">
                {editingId ? 'ویرایش مشخصات شاخص' : 'تعریف شاخص جدید'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">کد شاخص (یکتا)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: K-02 یا Q-03"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">دسته‌بندی</label>
                  <select
                    value={formCat}
                    onChange={(e) => {
                      const val = e.target.value as CategoryKey;
                      setFormCat(val);
                      if (formCode.includes('-')) {
                        const parts = formCode.split('-');
                        setFormCode(`${val}-${parts[1]}`);
                      } else {
                        setFormCode(`${val}-`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {(Object.keys(CATEGORIES) as CategoryKey[]).map(cat => (
                      <option key={cat} value={cat}>{CATEGORIES[cat]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">عنوان کامل شاخص</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نرخ ضایعات قطعات حساس خط تولید"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">تعریف عملیاتی و نحوه اندازه‌گیری</label>
                <textarea
                  required
                  placeholder="توضیح دهید این شاخص دقیقا چیست و چگونه پایش می‌شود..."
                  value={formDef}
                  onChange={(e) => setFormDef(e.target.value)}
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">منبع استخراج داده</label>
                  <input
                    type="text"
                    placeholder="مثال: گزارش MES / دفتر QC"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">فرمول یا روش سنجش</label>
                  <input
                    type="text"
                    placeholder="مثال: درصد تحقق برنامه"
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Scoring Source Configuration */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-teal-300">منبع ثبت نمره (Scoring Source)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormScoringSource('mis');
                      if (!formSource) setFormSource('سیستم اطلاعات تولید MIS/MES');
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                      formScoringSource === 'mis'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-200 ring-2 ring-blue-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-100">سیستم اطلاعات تولید MIS (خودکار)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">دریافت نمره مستقیم از شیت تولید کارخانه</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormScoringSource('supervisor');
                      if (!formSource) setFormSource('سرپرست مستقیم');
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                      formScoringSource === 'supervisor'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-100">ارزیابی کیفی سرپرست (دستی)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">ثبت نمره بر اساس شواهد رفتاری</div>
                    </div>
                  </button>
                </div>
              </div>

              {formCat === 'K' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">جهت مطلوبیت شاخص کمی</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="kpiDir"
                        checked={formDir === 'more'}
                        onChange={() => setFormDir('more')}
                        className="text-teal-500"
                      />
                      <span>هر چه بیشتر، بهتر (مانند تیراژ و راندمان)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="kpiDir"
                        checked={formDir === 'less'}
                        onChange={() => setFormDir('less')}
                        className="text-teal-500"
                      />
                      <span>هر چه کمتر، بهتر (مانند ضایعات و زمان ستاپ)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ذخیره شاخص
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {criterionToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-right my-auto" dir="rtl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">حذف قطعی شاخص</h3>
                <p className="text-xs text-slate-400">کد شاخص: {criterionToDelete.code}</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              آیا از حذف شاخص <span className="font-bold text-white">«{criterionToDelete.name}»</span> اطمینان دارید؟
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">توجه مهم:</p>
              <p>این شاخص به صورت خودکار از کلیه پروفایل‌های شغلی و ارزیابی‌های وابسته پاکسازی خواهد شد.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCriterionToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCriterion(criterionToDelete.id);
                  setCriterionToDelete(null);
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 cursor-pointer"
              >
                تایید حذف
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Universal Data Exchange Modal */}
      <UniversalDataExchange
        config={criteriaExchangeConfig}
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        theme={theme}
      />

      {/* Formula Modal */}
      <KpiFormulaEngineModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        criteria={criteria}
        onAddCriterion={onAddCriterion}
        onUpdateCriterion={onUpdateCriterion}
        employees={employees || []}
        profiles={profiles || []}
        evaluations={evaluations || []}
        onUpdateEvaluations={onUpdateEvaluations || (() => {})}
        theme={theme}
      />

      {/* Multi-Source Criteria Bulk Import Modal */}
      <MultiSourceCriteriaImportModal
        isOpen={isMultiSourceModalOpen}
        onClose={() => setIsMultiSourceModalOpen(false)}
        existingCriteria={criteria}
        onCommitMerge={handleCommitMultiSource}
        theme={theme}
      />
    </div>
  );
}
