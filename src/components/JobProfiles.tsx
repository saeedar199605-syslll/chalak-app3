/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { validateJobProfileInput } from '../utils/validation';
import { 
  Briefcase, 
  Plus, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  Scale,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Layers,
  Sparkles,
  PlusCircle
} from 'lucide-react';
import { 
  JobProfile, 
  Criterion, 
  ProfileItem, 
  Employee,
  MIN_WEIGHT, 
  MAX_WEIGHT, 
  MAX_CRITERIA_COUNT, 
  MANDATORY_SAFETY_CODE,
  CATEGORIES,
  CategoryKey
} from '../types';
import UniversalDataExchange, { DataExchangeConfig } from './UniversalDataExchange';

interface JobProfilesProps {
  profiles: JobProfile[];
  criteria: Criterion[];
  onAddProfile: (prof: Omit<JobProfile, 'id'>) => void;
  onUpdateProfile: (id: string, prof: Omit<JobProfile, 'id'>) => void;
  onDeleteProfile: (id: string) => void;
  onBulkDeleteProfiles?: (ids: string[]) => void;
  onToggleLockProfile: (id: string) => void;
  onAddCriterion?: (crit: Omit<Criterion, 'id'>) => boolean;
  theme?: 'dark' | 'light';
  currentUser?: Employee | null;
}

export default function JobProfiles({
  profiles,
  criteria,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onBulkDeleteProfiles,
  onToggleLockProfile,
  onAddCriterion,
  theme = 'dark',
  currentUser
}: JobProfilesProps) {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin' || currentUser?.code === 'ADMIN-001';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<JobProfile | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const handleToggleSelectProfile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedProfileIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProfileIds(next);
  };

  const handleToggleSelectAllProfiles = () => {
    if (selectedProfileIds.size === profiles.length) {
      setSelectedProfileIds(new Set());
    } else {
      setSelectedProfileIds(new Set(profiles.map(p => p.id)));
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedProfileIds.size === 0) return;
    if (onBulkDeleteProfiles) {
      onBulkDeleteProfiles(Array.from(selectedProfileIds));
    } else {
      selectedProfileIds.forEach(id => onDeleteProfile(id));
    }
    setSelectedProfileIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  const [isQuickCritOpen, setIsQuickCritOpen] = useState(false);
  const [quickCritName, setQuickCritName] = useState('');
  const [quickCritCode, setQuickCritCode] = useState('');
  const [quickCritCat, setQuickCritCat] = useState<CategoryKey>('K');
  const [quickCritDef, setQuickCritDef] = useState('');
  const [quickCritError, setQuickCritError] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formFamily, setFormFamily] = useState('');
  const [selectedItems, setSelectedItems] = useState<ProfileItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const profilesExchangeConfig: DataExchangeConfig<JobProfile> = {
    entityName: 'پروفایل‌های شغلی و اوزان',
    entityKey: 'job_profiles',
    items: profiles,
    csvHeaders: [
      { key: 'title', label: 'عنوان شغل' },
      { key: 'code', label: 'کد شغل' },
      { key: 'family', label: 'خانواده شغلی' },
      { key: 'itemsCount', label: 'تعداد شاخص‌ها', accessor: (p) => p.items.length },
      { 
        key: 'itemsSummary', 
        label: 'شاخص‌ها و اوزان',
        accessor: (p) => p.items.map(i => {
          const c = criteria.find(cr => cr.id === i.cid);
          return `${c?.code || i.cid}(${i.weight}%)`;
        }).join(' | ')
      },
      { key: 'locked', label: 'وضعیت قفل', accessor: (p) => p.locked ? 'قفل‌شده' : 'آزاد' }
    ],
    templateSampleRows: [
      { 'عنوان شغل': 'اپراتور تراش CNC', 'کد شغل': 'OP-CNC-01', 'خانواده شغلی': 'مشاغل تولیدی', 'تعداد شاخص‌ها': '5', 'شاخص‌ها و اوزان': 'K-PRD-01(25%) | B-HSE-01(20%) | K-QC-01(20%) | B-TEAM-01(20%) | B-5S-01(15%)', 'وضعیت قفل': 'قفل‌شده' }
    ],
    onImport: (importedItems, mode) => {
      let count = 0;
      const errors: string[] = [];

      importedItems.forEach((item: any, index: number) => {
        const rowNum = index + 1;
        const title = (item.title || item['عنوان شغل'] || 'شغل جدید').trim();
        const code = (item.code || item['کد شغل'] || `P-${Math.floor(Math.random() * 1000)}`).trim().toUpperCase();
        const family = (item.family || item['خانواده شغلی'] || 'مشاغل کارگاهی').trim();
        
        let items: ProfileItem[] = [];
        if (Array.isArray(item.items)) {
          items = item.items;
        } else {
          const summaryStr = (item.itemsSummary || item['شاخص‌ها و اوزان'] || '').toString();
          if (summaryStr) {
            const segments = summaryStr.split(/[|,;]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
            segments.forEach((seg: string) => {
              const match = seg.match(/^([A-Za-z0-9\-_]+)\s*\(?\s*(\d+)\s*%?\)?/);
              if (match) {
                const critCode = match[1].trim();
                const weight = parseInt(match[2], 10);
                const matchedCrit = criteria.find(c => c.code.toLowerCase() === critCode.toLowerCase() || c.id === critCode);
                if (matchedCrit) {
                  items.push({ cid: matchedCrit.id, weight });
                }
              }
            });
          }
          if (items.length === 0) {
            const safetyCrit = criteria.find(c => c.code === MANDATORY_SAFETY_CODE) || criteria[0];
            if (safetyCrit) {
              items = [{ cid: safetyCrit.id, weight: 100 }];
            }
          }
        }

        const candidate = {
          title,
          code,
          family,
          items,
          locked: false
        };

        const validation = validateJobProfileInput(candidate);
        if (!validation.success) {
          errors.push(`ردیف ${rowNum} (${title} - ${code}): ${validation.errors.join(' | ')}`);
          return;
        }

        const validProfile = validation.data;
        const existing = profiles.find(p => p.code.toLowerCase() === validProfile.code.toLowerCase());

        if (existing) {
          if (mode === 'replace' || mode === 'merge') {
            onUpdateProfile(existing.id, validProfile);
            count++;
          }
        } else {
          onAddProfile(validProfile);
          count++;
        }
      });

      return {
        count,
        message: `با موفقیت ${count} پروفایل شغلی ثبت/بروزرسانی شد.`,
        errors
      };
    }
  };

  const validateProfileItems = (items: ProfileItem[]): { ok: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`مجموع اوزان باید دقیقاً ۱۰۰٪ باشد (در حال حاضر: ${totalWeight}٪).`);
    }

    let hasSafety = false;
    items.forEach((item) => {
      const crit = criteria.find(c => c.id === item.cid);
      if (crit && crit.code === MANDATORY_SAFETY_CODE) {
        hasSafety = true;
      }
      if (item.weight < MIN_WEIGHT || item.weight > MAX_WEIGHT) {
        errors.push(`وزن شاخص ${crit?.code || item.cid} باید بین ${MIN_WEIGHT}٪ تا ${MAX_WEIGHT}٪ باشد (مقدار فعلی: ${item.weight}٪).`);
      }
    });

    if (!hasSafety) {
      errors.push(`شاخص ایمنی اجباری ${MANDATORY_SAFETY_CODE} در این پروفایل گنجانده نشده است.`);
    }

    if (items.length > MAX_CRITERIA_COUNT) {
      warnings.push(`تعداد شاخص‌ها (${items.length}) بیش از حد پیشنهادی (${MAX_CRITERIA_COUNT}) است.`);
    }

    const uniqueCategories = new Set(
      items.map(item => criteria.find(c => c.id === item.cid)?.cat).filter(Boolean)
    );
    if (uniqueCategories.size < 2) {
      errors.push('پروفایل باید حداقل شامل ۲ بعد متمایز شایستگی باشد.');
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    };
  };

  const openForm = (prof?: JobProfile) => {
    if (prof) {
      if (prof.locked) {
        alert('این پروفایل قفل شده است و قابل ویرایش نیست.');
        return;
      }
      setEditingId(prof.id);
      setFormTitle(prof.title);
      setFormCode(prof.code);
      setFormFamily(prof.family);
      setSelectedItems([...prof.items]);
    } else {
      setEditingId(null);
      setFormTitle('');
      setFormCode('');
      setFormFamily('');
      
      const safetyCrit = criteria.find(c => c.code === MANDATORY_SAFETY_CODE);
      if (safetyCrit) {
        setSelectedItems([{ cid: safetyCrit.id, weight: 15 }]);
      } else {
        setSelectedItems([]);
      }
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleToggleCriterion = (cid: string) => {
    const exists = selectedItems.find(i => i.cid === cid);
    if (exists) {
      const crit = criteria.find(c => c.id === cid);
      if (crit && crit.code === MANDATORY_SAFETY_CODE) {
        alert('شاخص ایمنی اجباری قابل حذف نیست.');
        return;
      }
      setSelectedItems(selectedItems.filter(i => i.cid !== cid));
    } else {
      setSelectedItems([...selectedItems, { cid, weight: 10 }]);
    }
  };

  const handleWeightChange = (cid: string, weight: number) => {
    setSelectedItems(
      selectedItems.map(i => i.cid === cid ? { ...i, weight } : i)
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validationItems = validateProfileItems(selectedItems);
    if (!validationItems.ok) {
      setErrorMsg(validationItems.errors[0]);
      return;
    }

    const rawData = {
      title: formTitle,
      code: formCode,
      family: formFamily || 'مشاغل تولیدی',
      items: selectedItems,
      locked: false
    };

    const validation = validateJobProfileInput(rawData);
    if (!validation.success) {
      setErrorMsg(validation.errors.join(' | '));
      return;
    }

    const payload = validation.data;
    if (editingId) {
      onUpdateProfile(editingId, payload);
    } else {
      onAddProfile(payload);
    }
    setIsModalOpen(false);
  };

  const totalCurrentWeight = selectedItems.reduce((sum, item) => sum + item.weight, 0);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">پروفایل‌های شغلی و ماتریس اوزان</h1>
          <p className="text-sm text-slate-400 mt-1">
            تعریف شناسنامه ارزیابی هر رده شغلی، تعیین اوزان اختصاصی و اعمال الزام شاخص ایمنی
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsExchangeModalOpen(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>انتقال داده (اکسل/JSON)</span>
          </button>
          <button
            onClick={() => openForm()}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف پروفایل جدید</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex gap-2.5">
          <Scale className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-200">مجموع اوزان ۱۰۰٪</p>
            <p className="text-slate-400 mt-0.5">مجموع وزن شاخص‌های هر شغل باید دقیقاً ۱۰۰٪ باشد.</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-200">دامنه وزن مجاز (۵٪ تا ۲۵٪)</p>
            <p className="text-slate-400 mt-0.5">وزن هر شاخص نباید کمتر از ۵٪ یا بیشتر از ۲۵٪ باشد.</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-200">الزام شاخص ایمنی (S-01)</p>
            <p className="text-slate-400 mt-0.5">شاخص ایمنی و HSE باید در تمامی مشاغل لحاظ شود.</p>
          </div>
        </div>
      </div>

      {selectedProfileIds.size > 0 && (
        <div className="bg-teal-950/40 border border-teal-500/30 p-3.5 rounded-2xl flex items-center justify-between animate-in fade-in flex-wrap gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-teal-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{selectedProfileIds.size} پروفایل انتخاب شده است</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف دسته‌جمعی ({selectedProfileIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfileIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {profiles.map((p) => {
          const validation = validateProfileItems(p.items);
          const totalWeight = p.items.reduce((sum, item) => sum + item.weight, 0);

          return (
            <div 
              key={p.id} 
              className={`bg-slate-800/30 border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all ${
                selectedProfileIds.has(p.id) ? 'border-teal-500/60 ring-1 ring-teal-500/30' : p.locked ? 'border-slate-800' : 'border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProfileIds.has(p.id)}
                      onChange={(e) => handleToggleSelectProfile(p.id, e as any)}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer w-4 h-4 mt-1"
                      title="انتخاب پروفایل"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-100">{p.title}</h3>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">خانواده: {p.family} | {p.items.length} شاخص تعریف‌شده</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => onToggleLockProfile(p.id)}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        p.locked 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title={p.locked ? 'پروفایل قفل است.' : 'پروفایل آزاد است.'}
                    >
                      {p.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span className="text-[10px] font-bold">{p.locked ? 'قفل' : 'آزاد'}</span>
                    </button>

                    <button
                      onClick={() => openForm(p)}
                      disabled={!isAdmin && p.locked}
                      className={`p-2 rounded-xl border text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all ${
                        !isAdmin && p.locked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={isAdmin && p.locked ? "ویرایش (ادمین)" : "ویرایش"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setProfileToDelete(p)}
                      disabled={!isAdmin && p.locked}
                      className={`p-2 rounded-xl border transition-all ${
                        !isAdmin && p.locked ? 'opacity-30 cursor-not-allowed text-slate-600' : 'text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer'
                      }`}
                      title={isAdmin && p.locked ? "حذف (ادمین)" : "حذف"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <hr className="border-slate-800/80" />

                <div className="space-y-2">
                  {p.items.map((item) => {
                    const crit = criteria.find(c => c.id === item.cid);
                    if (!crit) return null;
                    return (
                      <div key={item.cid} className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-xl border border-slate-800/40 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                            crit.cat === 'K' ? 'bg-blue-500/10 text-blue-400' :
                            crit.cat === 'Q' ? 'bg-amber-500/10 text-amber-300' :
                            crit.cat === 'B' ? 'bg-purple-500/10 text-purple-300' :
                            crit.cat === 'S' ? 'bg-red-500/10 text-red-400' :
                            'bg-emerald-500/10 text-emerald-300'
                          }`}>
                            {crit.code}
                          </span>
                          <span className="text-slate-300 font-medium">{crit.name}</span>
                        </div>
                        <span className="font-bold text-slate-100">{item.weight} ٪</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">مجموع وزن شاخص‌ها:</span>
                  <span className={totalWeight === 100 ? 'text-emerald-400' : 'text-orange-400'}>
                    {totalWeight} ٪
                  </span>
                </div>

                {validation.ok ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 px-3 py-2 rounded-xl text-[11px] flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>پروفایل معتبر بوده و شاخص الزامی HSE در آن لحاظ شده است.</span>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/10 text-red-400 px-3 py-2 rounded-xl text-[11px] flex flex-col gap-1">
                    {validation.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold text-slate-200">
                {editingId ? 'ویرایش پروفایل شغلی' : 'تعریف پروفایل شغلی جدید'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex gap-2 items-center shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">عنوان شغل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اپراتور ارشد خط تولید"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">کد شغل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: B1"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">خانواده شغلی</label>
                  <input
                    type="text"
                    placeholder="مثال: مشاغل تولیدی"
                    value={formFamily}
                    onChange={(e) => setFormFamily(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs flex-wrap gap-2">
                  <label className="font-bold text-slate-300">انتخاب و وزن‌دهی شاخص‌ها (بین ۵٪ تا ۲۵٪)</label>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                    totalCurrentWeight === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    مجموع اوزان: {totalCurrentWeight} ٪
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
                  {criteria.map((c) => {
                    const matchedItem = selectedItems.find(i => i.cid === c.id);
                    const isSelected = !!matchedItem;
                    const isMandatorySafety = c.code === MANDATORY_SAFETY_CODE;

                    return (
                      <div 
                        key={c.id} 
                        className={`p-3 flex justify-between items-center transition-colors ${
                          isSelected ? 'bg-slate-800/10' : ''
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-slate-200 select-none flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isMandatorySafety}
                            onChange={() => handleToggleCriterion(c.id)}
                            className="rounded text-teal-500 focus:ring-teal-500 bg-slate-900 border-slate-700 w-4 h-4"
                          />
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            c.cat === 'K' ? 'bg-blue-500/10 text-blue-400' :
                            c.cat === 'Q' ? 'bg-amber-500/10 text-amber-300' :
                            c.cat === 'B' ? 'bg-purple-500/10 text-purple-300' :
                            c.cat === 'S' ? 'bg-red-500/10 text-red-400' :
                            'bg-emerald-500/10 text-emerald-300'
                          }`}>
                            {c.code}
                          </span>
                          <span className="truncate">{c.name}</span>
                          {isMandatorySafety && (
                            <span className="text-[9px] text-red-400 bg-red-500/10 px-1 py-0.5 rounded font-bold shrink-0">
                              الزام قطعی HSE
                            </span>
                          )}
                        </label>

                        {isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-500 font-medium">وزن:</span>
                            <input
                              type="number"
                              min="5"
                              max="25"
                              required
                              value={matchedItem.weight}
                              onChange={(e) => handleWeightChange(c.id, parseInt(e.target.value) || 0)}
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-center text-slate-200 font-bold font-mono focus:outline-none focus:border-teal-500"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
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
                  ذخیره پروفایل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in my-auto">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">حذف پروفایل شغلی</h3>
                <p className="text-[11px] text-slate-400">کد: {profileToDelete.code}</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>عنوان:</span>
                <span className="font-bold text-slate-100">{profileToDelete.title}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>خانواده:</span>
                <span className="text-teal-400">{profileToDelete.family}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProfile(profileToDelete.id);
                  setProfileToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تایید حذف</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <UniversalDataExchange
        config={profilesExchangeConfig}
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
