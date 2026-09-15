/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  RefreshCw, 
  Layers, 
  Database, 
  Users, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  Info, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  SlidersHorizontal, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  Eye, 
  Settings2, 
  Save, 
  RotateCcw,
  Gauge
} from 'lucide-react';
import { 
  Employee, 
  Evaluation, 
  Criterion, 
  JobProfile, 
  KasraAttendanceRecord, 
  MISProductionRecord, 
  DynamicColumnMapping, 
  DynamicExcelRowRecord 
} from '../types';
import ProductionCycleTimeCalculator from './ProductionCycleTimeCalculator';
import { 
  downloadKasraExcelTemplate, 
  downloadMISExcelTemplate, 
  downloadDynamicCriteriaExcelTemplate,
  parseKasraExcelFile, 
  parseMISExcelFile, 
  parseUniversalExcelFile,
  recalculateDynamicRows,
  calculateKasraScore,
  calculateMISScore
} from '../utils/excelImportExport';
import { db, CURRENT_ACTIVE_PERIOD } from '../utils/db';

interface ExcelIntegrationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  profiles: JobProfile[];
  criteria: Criterion[];
  evaluations: Evaluation[];
  onUpdateEvaluations: (evals: Evaluation[]) => void;
  onAddEvaluation: (empId: string, period: string) => void;
  currentUser?: Employee | null;
}

export default function ExcelIntegrationCenter({
  isOpen,
  onClose,
  employees,
  profiles,
  criteria,
  evaluations,
  onUpdateEvaluations,
  onAddEvaluation,
  currentUser
}: ExcelIntegrationCenterProps) {
  const [activeTab, setActiveTab] = useState<'dynamic' | 'kasra' | 'mis' | 'production_calc' | 'builder'>('dynamic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin' || currentUser?.name?.includes('مدیر');
  const [isManualEditEnabled, setIsManualEditEnabled] = useState(false);

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [columnMappings, setColumnMappings] = useState<DynamicColumnMapping[]>([]);
  const [dynamicRecords, setDynamicRecords] = useState<DynamicExcelRowRecord[]>([]);
  const [dynamicWarnings, setDynamicWarnings] = useState<string[]>([]);
  const [dynamicMatchedCount, setDynamicMatchedCount] = useState<number>(0);
  const [showMappingConfig, setShowMappingConfig] = useState(false);

  const [validationSummary, setValidationSummary] = useState<{
    source: string;
    totalProcessed: number;
    newEvaluations: number;
    updatedEvaluations: number;
    slotsPopulated: number;
    warnings: string[];
  } | null>(null);
  const [showValidationWarnings, setShowValidationWarnings] = useState(false);

  const [kasraRecords, setKasraRecords] = useState<KasraAttendanceRecord[]>([]);
  const [misRecords, setMisRecords] = useState<MISProductionRecord[]>([]);

  const [builderPeriod, setBuilderPeriod] = useState('دوره بهار ۱۴۰۳');
  const [builderProfileId, setBuilderProfileId] = useState('all');
  const [builderUnit, setBuilderUnit] = useState('all');
  const [builderIncludeDocs, setBuilderIncludeDocs] = useState(true);
  const [builderSelectedCriteria, setBuilderSelectedCriteria] = useState<string[]>(() => criteria.map(c => c.id));
  const [builderCategoryFilter, setBuilderCategoryFilter] = useState<'ALL' | 'K' | 'Q' | 'B' | 'S' | 'L'>('ALL');

  const dynamicFileInputRef = useRef<HTMLInputElement>(null);
  const kasraFileInputRef = useRef<HTMLInputElement>(null);
  const misFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (builderSelectedCriteria.length === 0 && criteria.length > 0) {
      setBuilderSelectedCriteria(criteria.map(c => c.id));
    }
  }, [criteria]);

  const handleDynamicFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');
    setDynamicWarnings([]);

    try {
      const result = await parseUniversalExcelFile(file, employees, criteria);
      setRawHeaders(result.headers);
      setRawRows(result.rawRows);
      setColumnMappings(result.suggestedMappings);

      const calculated = recalculateDynamicRows({
        rawRows: result.rawRows,
        headers: result.headers,
        mappings: result.suggestedMappings,
        employees,
        criteria,
        profiles
      });

      setDynamicRecords(calculated.records);
      setDynamicMatchedCount(calculated.matchedEmployeesCount);
      setDynamicWarnings(calculated.warnings);
      setSuccessMessage(`فایل با موفقیت تحلیل شد: ${calculated.records.length} ردیف داده شناسایی گردید (${calculated.matchedEmployeesCount} کارمند تطبیق داده شدند).`);
      setShowMappingConfig(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در بارگذاری فایل اکسل');
    } finally {
      setIsProcessing(false);
      if (dynamicFileInputRef.current) dynamicFileInputRef.current.value = '';
    }
  };

  const handleApplyDynamicRecords = () => {
    if (dynamicRecords.length === 0) {
      alert('داده‌ای برای اعمال وجود ندارد.');
      return;
    }

    let updatedEvaluations = [...evaluations];
    let updatedEvalsCount = 0;
    let newEvalsCount = 0;
    let slotsPopulated = 0;
    const warnings: string[] = [];

    dynamicRecords.forEach((rec, idx) => {
      const rowNum = idx + 1;
      const emp = employees.find(
        e => (rec.empCode && e.code.toUpperCase() === rec.empCode.toUpperCase()) ||
             (rec.empCode && e.username.toLowerCase() === rec.empCode.toLowerCase()) ||
             (rec.empName && e.name.trim() === rec.empName.trim()) ||
             (rec.empName && e.name.includes(rec.empName.trim()))
      );

      if (!emp) {
        warnings.push(`ردیف ${rowNum}: کارمند ${rec.empCode || ''} ${rec.empName || ''} در پایگاه داده یافت نشد.`);
        return;
      }

      let prof = profiles.find(p => p.id === emp.profileId);
      if (!prof) {
        prof = profiles[0];
      }

      if (!prof || !prof.items || prof.items.length === 0) {
        warnings.push(`ردیف ${rowNum} (${emp.name}): پروفایل شغلی فاقد شاخص است.`);
        return;
      }

      const evalPeriod = rec.period || CURRENT_ACTIVE_PERIOD;
      let targetIndex = updatedEvaluations.findIndex(
        ev => ev.empId === emp.id && ev.period === evalPeriod
      );

      if (targetIndex === -1) {
        const initialScores = prof.items.map(item => {
          const critItem = criteria.find(c => c.id === item.cid || c.code === item.cid);
          
          let importedScore = rec.scores[item.cid];
          if (importedScore === undefined && critItem) {
            importedScore = rec.scores[critItem.id] ?? rec.scores[critItem.code];
          }
          let importedDoc = rec.docs[item.cid];
          if (!importedDoc && critItem) {
            importedDoc = rec.docs[critItem.id] || rec.docs[critItem.code] || '';
          }

          let scoreVal = 0;
          if (importedScore !== undefined) {
            const num = Number(importedScore);
            if (!isNaN(num)) {
              scoreVal = Math.max(0, Math.min(5, Math.round(num * 10) / 10));
              slotsPopulated++;
            }
          }

          return {
            cid: item.cid,
            weight: item.weight,
            value: scoreVal,
            self: 0,
            doc: importedDoc || ''
          };
        });

        const newEval: Evaluation = {
          id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          empId: emp.id,
          profileId: prof.id,
          period: evalPeriod,
          status: 'draft',
          stage: 'self_review',
          currentAssigneeId: emp.id,
          currentAssigneeRole: 'employee',
          currentAssigneeName: emp.name,
          scores: initialScores,
          note: rec.overallNote || '',
          created: Date.now()
        };
        updatedEvaluations.push(newEval);
        newEvalsCount++;
      } else {
        const currentEval = updatedEvaluations[targetIndex];
        const existingScoreMap = new Map(currentEval.scores.map(s => [s.cid, s]));

        const validatedScores = prof.items.map(item => {
          const critItem = criteria.find(c => c.id === item.cid || c.code === item.cid);
          const existingScore = existingScoreMap.get(item.cid);
          
          let importedScore = rec.scores[item.cid];
          if (importedScore === undefined && critItem) {
            importedScore = rec.scores[critItem.id] ?? rec.scores[critItem.code];
          }
          let importedDoc = rec.docs[item.cid];
          if (!importedDoc && critItem) {
            importedDoc = rec.docs[critItem.id] || rec.docs[critItem.code] || '';
          }

          if (importedScore !== undefined) {
            const num = Number(importedScore);
            if (!isNaN(num)) {
              const scoreVal = Math.max(0, Math.min(5, Math.round(num * 10) / 10));
              slotsPopulated++;
              return {
                cid: item.cid,
                weight: item.weight,
                value: scoreVal,
                self: existingScore ? existingScore.self : 0,
                doc: importedDoc || existingScore?.doc || ''
              };
            }
          }

          return existingScore ? { ...existingScore, weight: item.weight } : {
            cid: item.cid,
            weight: item.weight,
            value: 0,
            self: 0,
            doc: ''
          };
        });

        updatedEvaluations[targetIndex] = {
          ...currentEval,
          profileId: prof.id,
          scores: validatedScores,
          note: rec.overallNote 
            ? (currentEval.note ? `${currentEval.note}\n${rec.overallNote}` : rec.overallNote)
            : currentEval.note
        };
        updatedEvalsCount++;
      }
    });

    db.saveEvaluations(updatedEvaluations);
    onUpdateEvaluations(updatedEvaluations);

    const totalProcessed = newEvalsCount + updatedEvalsCount;
    setValidationSummary({
      source: 'شیت یکپارچه پویا',
      totalProcessed,
      newEvaluations: newEvalsCount,
      updatedEvaluations: updatedEvalsCount,
      slotsPopulated,
      warnings
    });
    setSuccessMessage(`نمرات با موفقیت ذخیره شدند (${newEvalsCount} ارزیابی جدید، ${updatedEvalsCount} ارزیابی بروزرسانی شد).`);
  };

  const filteredDynamicRecords = useMemo(() => {
    if (!searchTerm.trim()) return dynamicRecords;
    const term = searchTerm.trim().toLowerCase();
    return dynamicRecords.filter(r =>
      r.empCode.toLowerCase().includes(term) ||
      (r.empName && r.empName.toLowerCase().includes(term)) ||
      (r.jobTitle && r.jobTitle.toLowerCase().includes(term)) ||
      (r.unit && r.unit.toLowerCase().includes(term))
    );
  }, [dynamicRecords, searchTerm]);

  const dynamicCriterionColumns = useMemo(() => {
    const critIds = new Set<string>();
    columnMappings.forEach(m => {
      if (m.targetType === 'criterion' && m.targetCriterionId) {
        critIds.add(m.targetCriterionId);
      }
    });
    return criteria.filter(c => critIds.has(c.id));
  }, [columnMappings, criteria]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-100">مرکز یکپارچه‌سازی و همگام‌سازی اکسل (Excel Sync Engine)</h1>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  Dynamic Real-Time Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ورود دسته‌جمعی نمرات از اکسل، شیت‌های تولید کارخانه و سیستم حضور و غیاب کسری
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dynamic')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'dynamic'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>شیت پویا (انطباق خودکار)</span>
            </button>
            <button
              onClick={() => setActiveTab('production_calc')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'production_calc'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>محاسبه‌گر تولید و زمان چرخه</span>
            </button>
          </div>
          {activeTab === 'dynamic' && dynamicRecords.length > 0 && (
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={handleApplyDynamicRecords}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs px-4 py-1.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>اعمال در ارزیابی‌ها ({dynamicRecords.length} رکورد)</span>
              </button>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dynamic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/60 border border-slate-800 rounded-3xl p-5 items-center">
                <div className="md:col-span-7 space-y-1.5">
                  <h3 className="text-xs font-black text-teal-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>بارگذاری فایل اکسل ارزیابی</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    فایل اکسل خود را بارگذاری کنید. سیستم به صورت خودکار ستون‌های مربوط به کد پرسنلی و شاخص‌ها را شناسایی و تطبیق می‌دهد.
                  </p>
                </div>
                <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2.5">
                  <input
                    type="file"
                    ref={dynamicFileInputRef}
                    onChange={handleDynamicFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <button
                    onClick={() => dynamicFileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isProcessing ? 'در حال خواندن...' : 'انتخاب فایل اکسل'}</span>
                  </button>
                </div>
              </div>

              {dynamicRecords.length > 0 ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4">
                  <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      نمایش <span className="font-bold text-teal-400">{filteredDynamicRecords.length}</span> از {dynamicRecords.length} رکورد آماده ثبت
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyDynamicRecords}
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs py-2 px-4 rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>اعمال و ذخیره‌سازی نمرات در سیستم</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-slate-900/90 text-slate-300 sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-3 font-bold text-center w-12">#</th>
                          <th className="p-3 font-bold">کد پرسنلی</th>
                          <th className="p-3 font-bold">نام و نام خانوادگی</th>
                          <th className="p-3 font-bold">واحد</th>
                          <th className="p-3 font-bold text-center">دوره</th>
                          {dynamicCriterionColumns.map(crit => (
                            <th key={crit.id} className="p-3 font-bold text-center border-r border-slate-800/60 min-w-[130px]">
                              <div className="text-[10px] text-teal-400 font-mono">[{crit.code}]</div>
                              <div className="truncate max-w-[140px]" title={crit.name}>{crit.name}</div>
                            </th>
                          ))}
                          <th className="p-3 font-bold min-w-[200px]">یادداشت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-300">
                        {filteredDynamicRecords.map((rec, rIdx) => (
                          <tr key={rec.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{rIdx + 1}</td>
                            <td className="p-3 font-mono font-bold text-slate-100">{rec.empCode}</td>
                            <td className="p-3 font-bold text-slate-200">{rec.empName || <span className="text-rose-400">نامشخص</span>}</td>
                            <td className="p-3 text-slate-400">{rec.unit}</td>
                            <td className="p-3 text-center text-slate-400 font-mono">{rec.period}</td>
                            {dynamicCriterionColumns.map(crit => {
                              const currentScore = rec.scores[crit.id] || 0;
                              return (
                                <td key={crit.id} className="p-3 text-center border-r border-slate-800/40">
                                  <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                    currentScore >= 4 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    currentScore === 3 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                    currentScore > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                                  }`}>
                                    {currentScore > 0 ? `${currentScore} از ۵` : '-'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="p-3 text-slate-400 truncate max-w-[200px]">{rec.overallNote || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-3xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-slate-200">فایل اکسل خود را جهت شروع انتخاب کنید</h4>
                </div>
              )}
            </div>
          )}

          {activeTab === 'production_calc' && (
            <ProductionCycleTimeCalculator
              employees={employees}
              criteria={criteria}
              profiles={profiles}
              evaluations={evaluations}
              onUpdateEvaluations={onUpdateEvaluations}
              currentUser={currentUser}
              onClose={onClose}
            />
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2 rounded-xl border border-slate-700 cursor-pointer transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
