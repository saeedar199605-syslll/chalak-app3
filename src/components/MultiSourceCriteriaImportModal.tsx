/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  Search, 
  RefreshCw,
  Building2,
  Check,
  Info
} from 'lucide-react';
import { Criterion, CategoryKey, CriterionScoringSource } from '../types';

export interface MultiSourceInputFile {
  id: string;
  department: string;
  filename: string;
  format: 'json' | 'csv';
  rawContent: string;
  parsedCount: number;
  criteria: Array<Omit<Criterion, 'id'> & { department: string; sourceFile: string }>;
  error?: string;
}

export type MergeStrategy = 'merge' | 'prefix_dept' | 'skip_existing' | 'replace';

interface MultiSourceCriteriaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCriteria: Criterion[];
  onCommitMerge: (
    mergedCriteria: Array<Omit<Criterion, 'id'> & { id?: string }>,
    strategy: MergeStrategy,
    stats: { total: number; added: number; updated: number; departments: string[] }
  ) => void;
  theme?: 'dark' | 'light';
}

const DEPARTMENT_PRESETS = [
  'واحد تولید (Production)',
  'واحد کنترل کیفیت (QC/QA)',
  'واحد ایمنی و بهداشت (HSE & 5S)',
  'واحد نگهداری و تعمیرات (PM/TPM)',
  'واحد قالب‌بندی و ستاپ (Setup/Tooling)'
];

export default function MultiSourceCriteriaImportModal({
  isOpen,
  onClose,
  existingCriteria,
  onCommitMerge,
  theme = 'dark'
}: MultiSourceCriteriaImportModalProps) {
  const [sources, setSources] = useState<MultiSourceInputFile[]>([]);
  const [activeStep, setActiveStep] = useState<'sources' | 'preview'>('sources');
  const [selectedDeptInput, setSelectedDeptInput] = useState<string>(DEPARTMENT_PRESETS[0]);
  const [customDeptInput, setCustomDeptInput] = useState<string>('');
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('merge');

  const [previewFilterDept, setPreviewFilterDept] = useState<string>('ALL');
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [previewStatusFilter, setPreviewStatusFilter] = useState<'all' | 'new' | 'update'>('all');

  if (!isOpen) return null;

  const currentDeptName = customDeptInput.trim() || selectedDeptInput;

  const parseCSVContent = (content: string, dept: string, filename: string) => {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,;\t]/).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    const codeIdx = headers.findIndex(h => h.includes('کد') || h === 'code');
    const nameIdx = headers.findIndex(h => h.includes('عنوان') || h.includes('نام') || h === 'name');
    const catIdx = headers.findIndex(h => h.includes('دسته') || h.includes('گروه') || h === 'cat' || h === 'category');
    const defIdx = headers.findIndex(h => h.includes('تعریف') || h.includes('شرح') || h === 'def' || h === 'definition');
    const srcIdx = headers.findIndex(h => h.includes('منبع') || h === 'source');
    const methodIdx = headers.findIndex(h => h.includes('روش') || h.includes('فرمول') || h === 'method');
    const dirIdx = headers.findIndex(h => h.includes('جهت') || h === 'dir' || h === 'direction');
    const scoringSrcIdx = headers.findIndex(h => h.includes('منبع ثبت') || h.includes('نمره‌دهی') || h === 'scoringsource');

    const result: Array<Omit<Criterion, 'id'> & { department: string; sourceFile: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.replace(/^["']|["']$/g, '').trim());
      const rawCode = codeIdx >= 0 ? parts[codeIdx] : parts[0];
      const rawName = nameIdx >= 0 ? parts[nameIdx] : parts[1];
      if (!rawCode || !rawName) continue;

      let cat: CategoryKey = 'K';
      if (catIdx >= 0 && parts[catIdx]) {
        const c = parts[catIdx].toUpperCase();
        if (['K', 'Q', 'B', 'S', 'L'].includes(c)) {
          cat = c as CategoryKey;
        } else if (c.includes('رفتار') || c.includes('B')) cat = 'B';
        else if (c.includes('کیف') || c.includes('Q')) cat = 'Q';
        else if (c.includes('ایمن') || c.includes('S')) cat = 'S';
        else if (c.includes('رهبر') || c.includes('L')) cat = 'L';
      } else {
        if (rawCode.toUpperCase().startsWith('B-')) cat = 'B';
        else if (rawCode.toUpperCase().startsWith('Q-')) cat = 'Q';
        else if (rawCode.toUpperCase().startsWith('S-')) cat = 'S';
        else if (rawCode.toUpperCase().startsWith('L-')) cat = 'L';
      }

      let dir: 'more' | 'less' = 'more';
      if (dirIdx >= 0 && parts[dirIdx]) {
        const d = parts[dirIdx].toLowerCase();
        if (d.includes('کمتر') || d === 'less' || d === 'کاهش') dir = 'less';
      }

      let scoringSource: CriterionScoringSource = 'supervisor';
      if (scoringSrcIdx >= 0 && parts[scoringSrcIdx]) {
        const s = parts[scoringSrcIdx].toLowerCase();
        if (s.includes('mis') || s.includes('mes') || s.includes('تولید')) scoringSource = 'mis';
        else if (s.includes('کسری') || s.includes('تردد') || s.includes('kasra')) scoringSource = 'kasra';
        else if (s.includes('سیستم') || s.includes('فرمول')) scoringSource = 'system';
        else if (s.includes('ترکیبی') || s.includes('چندمنبع')) scoringSource = 'multi_source';
      }

      result.push({
        code: rawCode.toUpperCase(),
        name: rawName,
        cat,
        def: defIdx >= 0 && parts[defIdx] ? parts[defIdx] : `تعریف شاخص ${rawName} در واحد ${dept}`,
        source: srcIdx >= 0 && parts[srcIdx] ? parts[srcIdx] : dept,
        method: methodIdx >= 0 && parts[methodIdx] ? parts[methodIdx] : 'بررسی ادواری',
        dir,
        scoringSource,
        department: dept,
        sourceFile: filename
      });
    }
    return result;
  };

  const parseJSONContent = (content: string, dept: string, filename: string) => {
    const parsed = JSON.parse(content);
    let items: any[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.criteria)) items = parsed.criteria;
      else if (Array.isArray(parsed.items)) items = parsed.items;
      else if (Array.isArray(parsed.data)) items = parsed.data;
      else items = [parsed];
    }

    const result: Array<Omit<Criterion, 'id'> & { department: string; sourceFile: string }> = [];
    items.forEach((it, idx) => {
      const code = (it.code || it.codeCriterion || `CRIT-${idx + 1}`).toString().trim().toUpperCase();
      const name = (it.name || it.title || it.label || '').toString().trim();
      if (!code || !name) return;

      const cat: CategoryKey = (['K', 'Q', 'B', 'S', 'L'].includes((it.cat || '').toUpperCase())) 
        ? it.cat.toUpperCase() 
        : (code.startsWith('B-') ? 'B' : code.startsWith('Q-') ? 'Q' : code.startsWith('S-') ? 'S' : 'K');

      result.push({
        code,
        name,
        cat,
        def: it.def || it.description || `تعریف شاخص ${name} در واحد ${dept}`,
        source: it.source || it.dataOrigin || dept,
        method: it.method || it.calculationMethod || 'ارزیابی ماهانه',
        dir: it.dir === 'less' ? 'less' : 'more',
        scoringSource: it.scoringSource || 'supervisor',
        department: it.department || dept,
        unit: it.unit || it.metricUnit || '',
        targetValue: it.targetValue ? Number(it.targetValue) : undefined,
        sourceFile: filename
      });
    });
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawContent = event.target?.result as string;
        if (!rawContent) return;
        const isJson = file.name.endsWith('.json') || rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[');
        const format = isJson ? 'json' : 'csv';

        try {
          let criteriaList: Array<Omit<Criterion, 'id'> & { department: string; sourceFile: string }> = [];
          if (format === 'json') {
            criteriaList = parseJSONContent(rawContent, currentDeptName, file.name);
          } else {
            criteriaList = parseCSVContent(rawContent, currentDeptName, file.name);
          }

          const newSource: MultiSourceInputFile = {
            id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            department: currentDeptName,
            filename: file.name,
            format,
            rawContent,
            parsedCount: criteriaList.length,
            criteria: criteriaList
          };
          setSources(prev => [...prev, newSource]);
        } catch (err: any) {
          alert(`خطا در پردازش فایل ${file.name}: ${err.message || 'فرمت نامعتبر'}`);
        }
      };
      reader.readAsText(file, 'UTF-8');
    });
    e.target.value = '';
  };

  const handleRemoveSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const combinedRawCriteria = useMemo(() => {
    const list: Array<Omit<Criterion, 'id'> & { 
      originalCode: string; 
      department: string; 
      sourceFile: string;
      mergeKey: string;
      isDuplicateInBank: boolean;
      existingItemInBank?: Criterion;
    }> = [];

    const existingCodeMap = new Map<string, Criterion>();
    existingCriteria.forEach(c => {
      existingCodeMap.set(c.code.trim().toUpperCase(), c);
    });

    sources.forEach(src => {
      src.criteria.forEach((crit, idx) => {
        let finalCode = crit.code.trim().toUpperCase();

        if (mergeStrategy === 'prefix_dept') {
          const cleanDept = src.department.includes('QC') ? 'QC' :
                            src.department.includes('تولید') ? 'PRD' :
                            src.department.includes('HSE') ? 'HSE' :
                            src.department.includes('تعمیر') ? 'PM' :
                            src.department.substring(0, 3).toUpperCase();
          if (!finalCode.includes(cleanDept)) {
            finalCode = `${cleanDept}-${finalCode}`;
          }
        }

        const existingItem = existingCodeMap.get(finalCode);
        const isDuplicateInBank = Boolean(existingItem);

        list.push({
          ...crit,
          code: finalCode,
          originalCode: crit.code,
          department: crit.department || src.department,
          sourceFile: src.filename,
          mergeKey: `${finalCode}_${src.id}_${idx}`,
          isDuplicateInBank,
          existingItemInBank: existingItem
        });
      });
    });

    return list;
  }, [sources, existingCriteria, mergeStrategy]);

  const departmentsInSources = useMemo(() => {
    const depts = new Set<string>();
    sources.forEach(s => depts.add(s.department));
    return Array.from(depts);
  }, [sources]);

  const filteredPreviewList = useMemo(() => {
    return combinedRawCriteria.filter(item => {
      if (previewFilterDept !== 'ALL' && item.department !== previewFilterDept) return false;
      if (previewStatusFilter === 'new' && item.isDuplicateInBank) return false;
      if (previewStatusFilter === 'update' && !item.isDuplicateInBank) return false;
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase();
        const matches = 
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.def.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [combinedRawCriteria, previewFilterDept, previewStatusFilter, previewSearch]);

  const handleToggleSelectAll = () => {
    if (selectedItemKeys.size === filteredPreviewList.length && filteredPreviewList.length > 0) {
      setSelectedItemKeys(new Set());
    } else {
      setSelectedItemKeys(new Set(filteredPreviewList.map(it => it.mergeKey)));
    }
  };

  const handleToggleItemSelect = (key: string) => {
    const next = new Set(selectedItemKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedItemKeys(next);
  };

  const handleProceedToPreview = () => {
    if (sources.length === 0) {
      alert('ابتدا حداقل یک فایل شاخص بارگذاری فرمایید.');
      return;
    }
    const allKeys = new Set(combinedRawCriteria.map(it => it.mergeKey));
    setSelectedItemKeys(allKeys);
    setActiveStep('preview');
  };

  const handleExecuteCommit = () => {
    const itemsToCommit = combinedRawCriteria.filter(it => selectedItemKeys.has(it.mergeKey));
    if (itemsToCommit.length === 0) {
      alert('هیچ شاخصی برای ثبت نهایی انتخاب نشده است.');
      return;
    }

    const uniqueCodes = new Set<string>();
    const deduplicated: Array<Omit<Criterion, 'id'> & { id?: string; department: string }> = [];
    let newCount = 0;
    let updateCount = 0;

    itemsToCommit.forEach(it => {
      if (uniqueCodes.has(it.code)) return;
      uniqueCodes.add(it.code);

      if (it.isDuplicateInBank) {
        updateCount++;
      } else {
        newCount++;
      }

      deduplicated.push({
        code: it.code,
        name: it.name,
        cat: it.cat,
        def: it.def,
        source: it.source,
        method: it.method,
        dir: it.dir,
        scoringSource: it.scoringSource,
        unit: it.unit,
        targetValue: it.targetValue,
        department: it.department,
        id: it.existingItemInBank?.id
      });
    });

    onCommitMerge(deduplicated, mergeStrategy, {
      total: deduplicated.length,
      added: newCount,
      updated: updateCount,
      departments: departmentsInSources
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">ادغام و تجمیع چندمنبعی شاخص‌های دپارتمان‌ها</h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-extrabold">
                  Multi-Source Consolidation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                بارگذاری همزمان چندین فایل JSON و CSV از خطوط تولید، کنترل کیفیت، HSE و نگهداری
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveStep('sources')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeStep === 'sources'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                فایل‌های مبدا ({sources.length})
              </button>
              <button
                type="button"
                onClick={() => handleProceedToPreview()}
                disabled={sources.length === 0}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer disabled:opacity-40 ${
                  activeStep === 'preview'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                پیش‌نمایش ادغام ({combinedRawCriteria.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeStep === 'sources' ? (
            <div className="space-y-6">
              <div className="bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-cyan-200">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">راهنمای ادغام چندمنبعی:</p>
                  <p className="text-slate-300">
                    برای هر دپارتمان (تولید، کنترل کیفیت، HSE و...) یک یا چند فایل CSV یا JSON بارگذاری نمایید تا به صورت متمرکز در بانک شاخص‌ها ثبت گردند.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">دپارتمان مربوط به فایل:</label>
                    <select
                      value={selectedDeptInput}
                      onChange={(e) => setSelectedDeptInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {DEPARTMENT_PRESETS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center transition-all bg-slate-900/30 hover:bg-slate-900/60 relative cursor-pointer">
                    <input
                      type="file"
                      accept=".json,.csv,.txt"
                      multiple
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        کلیک یا کشیدن فایل‌های CSV / JSON برای افزودن
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">استراتژی حل تعارض کدها:</h4>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="strategy"
                        checked={mergeStrategy === 'merge'}
                        onChange={() => setMergeStrategy('merge')}
                        className="mt-0.5 text-cyan-500"
                      />
                      <div>
                        <div className="font-bold text-slate-200">بروزرسانی شاخص موجود (Merge)</div>
                        <div className="text-[10px] text-slate-400">اطلاعات شاخص با کد یکسان بازنویسی می‌شود.</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="strategy"
                        checked={mergeStrategy === 'prefix_dept'}
                        onChange={() => setMergeStrategy('prefix_dept')}
                        className="mt-0.5 text-cyan-500"
                      />
                      <div>
                        <div className="font-bold text-slate-200">پیشوند خودکار دپارتمان</div>
                        <div className="text-[10px] text-slate-400">پیشوند واحد مانند QC- یا PRD- اضافه می‌شود.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* LIST OF LOADED SOURCES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>فایل‌های بارگذاری‌شده ({sources.length} منبع):</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sources.map(src => (
                    <div
                      key={src.id}
                      className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3 relative"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
                            {src.format}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSource(src.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs font-bold text-slate-200 truncate">{src.filename}</div>
                        <div className="text-[11px] text-cyan-300 font-medium">دپارتمان: {src.department}</div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">شاخص‌های استخراج شده:</span>
                        <span className="font-mono font-bold text-emerald-400">{src.parsedCount} مورد</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredPreviewList.length > 0 && selectedItemKeys.size === filteredPreviewList.length}
                          onChange={handleToggleSelectAll}
                          className="rounded text-cyan-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 w-28">کد نهایی</th>
                      <th className="p-3">عنوان شاخص</th>
                      <th className="p-3 w-28">دسته</th>
                      <th className="p-3 w-44">دپارتمان مبدا</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPreviewList.map(item => {
                      const isSelected = selectedItemKeys.has(item.mergeKey);
                      return (
                        <tr
                          key={item.mergeKey}
                          onClick={() => handleToggleItemSelect(item.mergeKey)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-cyan-950/15' : ''
                          }`}
                        >
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItemSelect(item.mergeKey)}
                              className="rounded text-cyan-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-cyan-300">{item.code}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-200">{item.name}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{item.def}</div>
                          </td>
                          <td className="p-3 font-bold text-teal-400">{item.cat}</td>
                          <td className="p-3 text-slate-300">{item.department}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition"
          >
            انصراف
          </button>
          {activeStep === 'sources' ? (
            <button
              type="button"
              onClick={handleProceedToPreview}
              disabled={sources.length === 0}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition"
            >
              <span>مشاهده پیش‌نمایش و تطبیق شاخص‌ها</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExecuteCommit}
              disabled={selectedItemKeys.size === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer transition"
            >
              <Check className="w-4 h-4" />
              <span>تایید نهایی و ادغام در بانک شاخص‌ها ({selectedItemKeys.size} مورد)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
