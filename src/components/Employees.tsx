/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { validateEmployeeInput } from '../utils/validation';
import { db, CURRENT_ACTIVE_PERIOD } from '../utils/db';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  ClipboardPlus, 
  Building2, 
  UserCheck, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Zap,
  Layers,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Employee, JobProfile, UserRole } from '../types';
import { VirtualizedTable } from './VirtualizedTable';
import UniversalDataExchange, { DataExchangeConfig } from './UniversalDataExchange';

interface EmployeesProps {
  employees: Employee[];
  profiles: JobProfile[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (id: string, emp: Omit<Employee, 'id'>) => void;
  onBulkUpdateEmployees?: (employees: Employee[]) => void;
  onDeleteEmployee: (id: string) => void;
  onBulkDeleteEmployees?: (ids: string[]) => void;
  onStartEvaluation: (empId: string) => void;
  theme?: 'dark' | 'light';
}

const PRESET_ROSTERS = [
  {
    title: 'تیم ماشین‌کاری CNC',
    unit: 'تراشکاری و CNC',
    description: 'اپراتورها و سرپرستان شیفت تراش CNC',
    members: [
      { code: 'EMP-1006', name: 'سعید محمدی', unit: 'تراشکاری و CNC', role: 'employee' as UserRole, username: 'saeed' },
      { code: 'EMP-1007', name: 'مجید رضوی', unit: 'تراشکاری و CNC', role: 'employee' as UserRole, username: 'majid' },
      { code: 'EMP-1008', name: 'کامران یزدانی', unit: 'تراشکاری و CNC', role: 'supervisor' as UserRole, username: 'kamran' }
    ]
  },
  {
    title: 'تیم مونتاژ نهایی',
    unit: 'مونتاژ و بسته‌بندی',
    description: 'پرسنل خطوط مونتاژ و بسته‌بندی نهایی',
    members: [
      { code: 'EMP-1009', name: 'زهرا کاظمی', unit: 'مونتاژ و بسته‌بندی', role: 'employee' as UserRole, username: 'zahra' },
      { code: 'EMP-1010', name: 'حسین جعفری', unit: 'مونتاژ و بسته‌بندی', role: 'employee' as UserRole, username: 'hossein' }
    ]
  },
  {
    title: 'آزمایشگاه و مترولوژی (QC)',
    unit: 'کنترل کیفیت',
    description: 'بازرسان تست ابعادی CMM و متالورژی',
    members: [
      { code: 'EMP-1011', name: 'الناز میرزایی', unit: 'کنترل کیفیت', role: 'employee' as UserRole, username: 'elnaz' },
      { code: 'EMP-1012', name: 'پیمان سلطانی', unit: 'کنترل کیفیت', role: 'supervisor' as UserRole, username: 'peyman' }
    ]
  }
];

export default function Employees({
  employees,
  profiles,
  onAddEmployee,
  onUpdateEmployee,
  onBulkUpdateEmployees,
  onDeleteEmployee,
  onBulkDeleteEmployees,
  onStartEvaluation,
  theme = 'light'
}: EmployeesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const isProtectedAdmin = (emp: Employee) => {
    return emp.username?.toLowerCase() === 'admin' && emp.code === 'ADMIN-001';
  };

  const handleToggleSelectAll = () => {
    const selectable = filteredEmployees.filter(e => !isProtectedAdmin(e));
    if (selectedEmpIds.size === selectable.length) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(selectable.map(e => e.id)));
    }
  };

  const handleToggleSelect = (emp: Employee, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    if (isProtectedAdmin(emp)) {
      return;
    }
    const next = new Set(selectedEmpIds);
    if (next.has(emp.id)) {
      next.delete(emp.id);
    } else {
      next.add(emp.id);
    }
    setSelectedEmpIds(next);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedEmpIds.size === 0) return;
    const count = selectedEmpIds.size;
    if (onBulkDeleteEmployees) {
      onBulkDeleteEmployees(Array.from(selectedEmpIds));
    } else {
      selectedEmpIds.forEach(id => onDeleteEmployee(id));
    }
    setSelectedEmpIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setDeleteToast(`تعداد ${count} پرسنل با موفقیت حذف شدند.`);
    setTimeout(() => setDeleteToast(null), 4000);
  };

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStatusMsg, setBulkStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formProfileId, setFormProfileId] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('employee');
  const [formUsername, setFormUsername] = useState('');
  const [formSupervisorId, setFormSupervisorId] = useState('');
  const [formPeerReviewerId, setFormPeerReviewerId] = useState('');
  const [formCalibrationLeadId, setFormCalibrationLeadId] = useState('');
  const [formApproverId, setFormApproverId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const employeesExchangeConfig: DataExchangeConfig<Employee> = {
    entityName: 'فهرست کارکنان و پرسنل',
    entityKey: 'employees',
    items: employees,
    csvHeaders: [
      { key: 'name', label: 'نام و نام خانوادگی' },
      { key: 'code', label: 'کد پرسنلی' },
      { key: 'unit', label: 'واحد سازمانی' },
      { 
        key: 'profile', 
        label: 'پروفایل شغلی',
        accessor: (emp) => profiles.find(p => p.id === emp.profileId)?.title || profiles.find(p => p.id === emp.profileId)?.code || emp.profileId
      },
      { 
        key: 'role', 
        label: 'نقش کاربری',
        accessor: (emp) => emp.role === 'admin' ? 'مدیر سیستم' : emp.role === 'supervisor' ? 'سرپرست' : 'کارمند'
      },
      { key: 'username', label: 'نام کاربری' },
      { 
        key: 'supervisor', 
        label: 'کد سرپرست مستقیم',
        accessor: (emp) => employees.find(s => s.id === emp.supervisorId)?.code || ''
      },
      { 
        key: 'peer', 
        label: 'کد ارزیاب همتراز',
        accessor: (emp) => employees.find(s => s.id === emp.peerReviewerId)?.code || ''
      },
      { 
        key: 'approver', 
        label: 'کد تاییدکننده نهایی HR',
        accessor: (emp) => employees.find(s => s.id === emp.approverId)?.code || ''
      }
    ],
    templateSampleRows: [
      {
        'نام و نام خانوادگی': 'علی حسینی',
        'کد پرسنلی': 'EMP-1001',
        'واحد سازمانی': 'خط تولید ۱',
        'پروفایل شغلی': 'اپراتور ارشد خط تولید',
        'نقش کاربری': 'سرپرست',
        'نام کاربری': 'ali_rezaei',
        'کد سرپرست مستقیم': 'EMP-1008',
        'کد ارزیاب همتراز': 'EMP-1002',
        'کد تاییدکننده نهایی HR': 'EMP-1008'
      },
      {
        'نام و نام خانوادگی': 'کامران یزدانی',
        'کد پرسنلی': 'EMP-1008',
        'واحد سازمانی': 'مدیریت کارگاه',
        'پروفایل شغلی': 'تکنسین تنظیم و قالب‌بندی (Setup)',
        'نقش کاربری': 'مدیر سیستم',
        'نام کاربری': 'kamran',
        'کد سرپرست مستقیم': '',
        'کد ارزیاب همتراز': '',
        'کد تاییدکننده نهایی HR': ''
      }
    ],
    onImport: (importedItems, mode) => {
      let createdCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];
      const defaultProfId = profiles[0]?.id || 'prof-1';

      let workingEmployees: Employee[] = mode === 'replace'
        ? employees.filter(e => e.role === 'admin' || e.username === 'admin' || e.code === 'ADMIN-001')
        : [...employees];

      const seenBatchCodes = new Set<string>();
      const seenBatchUsernames = new Set<string>();
      const newEmployeesForEval: Employee[] = [];

      importedItems.forEach((rawItem: any, index: number) => {
        const rowNum = index + 1;
        const name = (rawItem.name || rawItem['نام و نام خانوادگی'] || '').trim();
        const code = (rawItem.code || rawItem['کد پرسنلی'] || '').trim().toUpperCase();
        const unit = (rawItem.unit || rawItem['واحد سازمانی'] || 'کارگاه تولید').trim();

        if (!name && !code) {
          errors.push(`ردیف ${rowNum}: ردیف خالی است.`);
          return;
        }
        if (!code) {
          errors.push(`ردیف ${rowNum} (${name}): کد پرسنلی الزامی است.`);
          return;
        }
        if (seenBatchCodes.has(code)) {
          errors.push(`ردیف ${rowNum} (${name}): کد پرسنلی ${code} در همین فایل تکرار شده است.`);
          return;
        }
        seenBatchCodes.add(code);

        const rawProf = (rawItem.profile || rawItem.profileId || rawItem['پروفایل شغلی'] || '').trim();
        let profileId = defaultProfId;
        if (rawProf) {
          const matchedProfile = profiles.find(p => 
            p.id === rawProf ||
            p.code.toLowerCase() === rawProf.toLowerCase() ||
            p.title.toLowerCase() === rawProf.toLowerCase()
          );
          if (matchedProfile) {
            profileId = matchedProfile.id;
          } else {
            errors.push(`ردیف ${rowNum} (${name}): پروفایل با عنوان یا کد ${rawProf} یافت نشد.`);
          }
        }

        const rawRole = (rawItem.role || rawItem['نقش کاربری'] || 'employee').trim().toLowerCase();
        let role: UserRole = 'employee';
        if (rawRole.includes('admin') || rawRole.includes('مدیر')) {
          role = 'admin';
        } else if (rawRole.includes('supervisor') || rawRole.includes('سرپرست')) {
          role = 'supervisor';
        }

        let username = (rawItem.username || rawItem['نام کاربری'] || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        if (!username) {
          const cleanCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
          username = `user_${cleanCode || Math.random().toString(36).substring(2, 7)}`;
        }

        let finalUsername = username;
        let counter = 1;
        while (
          seenBatchUsernames.has(finalUsername) || 
          workingEmployees.some(e => e.username.toLowerCase() === finalUsername.toLowerCase() && e.code !== code)
        ) {
          finalUsername = `${username}_${counter}`;
          counter++;
        }
        seenBatchUsernames.add(finalUsername);

        const candidate = {
          name,
          code,
          unit,
          profileId,
          role,
          username: finalUsername
        };

        const validation = validateEmployeeInput(candidate);
        if (!validation.success) {
          errors.push(`ردیف ${rowNum} (${name || code}): ${validation.errors.join(' | ')}`);
          return;
        }

        const validEmp = validation.data;
        const existingIdx = workingEmployees.findIndex(
          e => e.code.toUpperCase() === validEmp.code.toUpperCase() ||
               e.username.toLowerCase() === validEmp.username.toLowerCase()
        );

        if (existingIdx !== -1) {
          const existing = workingEmployees[existingIdx];
          workingEmployees[existingIdx] = {
            ...validEmp,
            id: existing.id
          };
          updatedCount++;
        } else {
          const newEmp: Employee = {
            ...validEmp,
            id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          };
          workingEmployees.push(newEmp);
          newEmployeesForEval.push(newEmp);
          createdCount++;
        }
      });

      const totalSuccess = createdCount + updatedCount;
      if (totalSuccess > 0) {
        db.saveEmployees(workingEmployees);

        if (newEmployeesForEval.length > 0) {
          try {
            const currentEvals = db.getEvaluations();
            const newEvals = [...currentEvals];
            let evalsAdded = false;

            newEmployeesForEval.forEach(emp => {
              const hasEval = newEvals.some(ev => ev.empId === emp.id && ev.period === CURRENT_ACTIVE_PERIOD);
              if (!hasEval) {
                const targetProf = profiles.find(p => p.id === emp.profileId) || profiles[0];
                if (targetProf) {
                  const initialScores = (targetProf.items || []).map(item => ({
                    cid: item.cid,
                    weight: item.weight,
                    value: 0,
                    self: 0,
                    doc: ''
                  }));
                  newEvals.push({
                    id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    empId: emp.id,
                    profileId: targetProf.id,
                    period: CURRENT_ACTIVE_PERIOD,
                    status: 'draft',
                    stage: 'self_review',
                    currentAssigneeId: emp.id,
                    currentAssigneeRole: 'employee',
                    currentAssigneeName: emp.name,
                    scores: initialScores,
                    created: Date.now()
                  });
                  evalsAdded = true;
                }
              }
            });

            if (evalsAdded) {
              db.saveEvaluations(newEvals);
            }
          } catch (e) {
            console.warn('Auto evaluation creation error:', e);
          }
        }

        if (onBulkUpdateEmployees) {
          onBulkUpdateEmployees(workingEmployees);
        }
      }

      return {
        count: totalSuccess,
        message: `عملیات پایان یافت: ${totalSuccess} پرسنل پردازش شد (${createdCount} جدید، ${updatedCount} بروزرسانی).`,
        errors
      };
    }
  };

  const openForm = (emp?: Employee) => {
    if (emp) {
      setEditingId(emp.id);
      setFormName(emp.name);
      setFormCode(emp.code);
      setFormUnit(emp.unit);
      setFormProfileId(emp.profileId);
      setFormRole(emp.role || 'employee');
      setFormUsername(emp.username || '');
      setFormSupervisorId(emp.supervisorId || '');
      setFormPeerReviewerId(emp.peerReviewerId || '');
      setFormCalibrationLeadId(emp.calibrationLeadId || '');
      setFormApproverId(emp.approverId || '');
    } else {
      const highestNum = employees.reduce((max, e) => {
        const match = e.code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          return num > max ? num : max;
        }
        return max;
      }, 1000);
      const nextCode = `EMP-${highestNum + 1}`;
      const defaultUnit = employees[0]?.unit || 'خط تولید ۱';

      setEditingId(null);
      setFormName('');
      setFormCode(nextCode);
      setFormUnit(defaultUnit);
      setFormProfileId(profiles[0]?.id || '');
      setFormRole('employee');
      setFormUsername(`user_${highestNum + 1}`);
      setFormSupervisorId('');
      setFormPeerReviewerId('');
      setFormCalibrationLeadId('');
      setFormApproverId('');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const codeClean = formCode.trim().toUpperCase();
    let userClean = formUsername.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!userClean) {
      userClean = `user_${codeClean.toLowerCase().replace(/[^a-z0-9]/g, '') || Math.random().toString(36).substring(2, 7)}`;
    }

    const rawData = {
      name: formName.trim(),
      code: codeClean,
      unit: formUnit.trim(),
      profileId: formProfileId,
      role: formRole,
      username: userClean,
      supervisorId: formSupervisorId || undefined,
      peerReviewerId: formPeerReviewerId || undefined,
      calibrationLeadId: formCalibrationLeadId || undefined,
      approverId: formApproverId || undefined
    };

    const validation = validateEmployeeInput(rawData);
    if (!validation.success) {
      setErrorMsg(validation.errors.join(' | '));
      return;
    }

    const payload = validation.data;

    const isDuplicateUser = employees.some(
      emp => emp.username.toLowerCase() === payload.username.toLowerCase() && emp.id !== editingId
    );
    if (isDuplicateUser) {
      setErrorMsg('این نام کاربری قبلاً ثبت شده است.');
      return;
    }

    const isDuplicateCode = employees.some(
      emp => emp.code.toUpperCase() === payload.code.toUpperCase() && emp.id !== editingId
    );
    if (isDuplicateCode) {
      setErrorMsg('کد پرسنلی تکراری است.');
      return;
    }

    if (editingId) {
      onUpdateEmployee(editingId, payload);
    } else {
      onAddEmployee(payload);
    }
    setIsModalOpen(false);
  };

  const filteredEmployees = employees.filter(emp => {
    const profile = profiles.find(p => p.id === emp.profileId);
    return emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           emp.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (profile?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'supervisor': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'employee': return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'مدیر سیستم';
      case 'supervisor': return 'سرپرست';
      case 'employee': return 'کارمند';
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">مدیریت پرسنل و دسترسی‌ها</h1>
          <p className="text-sm text-slate-400 mt-1">
            تعریف هویت، حساب کاربری، سطوح دسترسی (RBAC) و انتصاب سرپرستان مستقیم
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExchangeModalOpen(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>انتقال داده (Import / Export)</span>
          </button>
          <button
            onClick={() => openForm()}
            className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت کارمند جدید</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-800/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام، کد پرسنلی، واحد یا نقش..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-xs text-slate-400 font-medium">
            تعداد پرسنل: <span className="text-teal-400 font-bold font-mono">{filteredEmployees.length} نفر</span>
          </div>
          <div className="flex items-center bg-slate-900/80 border border-slate-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای جدول بهینه‌شده"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول سریع</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="نمای کارت‌ها"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>کارت‌ها</span>
            </button>
          </div>
        </div>
      </div>

      {selectedEmpIds.size > 0 && (
        <div className="bg-teal-950/40 border border-teal-500/30 p-3.5 rounded-2xl flex items-center justify-between animate-in fade-in flex-wrap gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-teal-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{selectedEmpIds.size} کارمند انتخاب شده است</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف دسته‌جمعی ({selectedEmpIds.size} پرسنل)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEmpIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {viewMode === 'table' ? (
        <VirtualizedTable<Employee>
          items={filteredEmployees}
          rowHeight={68}
          containerHeight={580}
          keyExtractor={(emp) => emp.id}
          columns={[
            { 
              header: (
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={filteredEmployees.filter(e => !isProtectedAdmin(e)).length > 0 && selectedEmpIds.size === filteredEmployees.filter(e => !isProtectedAdmin(e)).length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                    title="انتخاب همه"
                  />
                </div>
              ), 
              className: 'w-10 text-center' 
            },
            { header: 'نام و نام خانوادگی', className: 'w-64' },
            { header: 'کد و نام کاربری', className: 'w-44' },
            { header: 'واحد سازمانی', className: 'w-44' },
            { header: 'پروفایل شغلی', className: 'flex-1' },
            { header: 'نقش', className: 'w-32' },
            { header: 'عملیات', className: 'w-48 text-left' },
          ]}
          renderRow={(emp) => {
            const profile = profiles.find(p => p.id === emp.profileId);
            const isProtected = isProtectedAdmin(emp);
            return (
              <div className="flex items-center w-full justify-between text-xs py-1">
                <div className="w-10 text-center flex items-center justify-center shrink-0">
                  {isProtected ? (
                    <span title="مدیر ارشد غیرقابل حذف">🔒</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.has(emp.id)}
                      onChange={(e) => handleToggleSelect(emp, e)}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                    />
                  )}
                </div>
                <div className="w-64 flex items-center gap-2.5 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-teal-400 shrink-0 shadow-inner">
                    {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-100 truncate">{emp.name}</h4>
                    <span className="text-[10px] text-slate-400 truncate block">{emp.unit}</span>
                  </div>
                </div>
                <div className="w-44 shrink-0 font-mono text-[11px] text-slate-300">
                  <div>{emp.code}</div>
                  <div className="text-[10px] text-teal-400 font-sans">user: {emp.username}</div>
                </div>
                <div className="w-44 shrink-0 text-slate-300 truncate font-medium">
                  {emp.unit}
                </div>
                <div className="flex-1 min-w-0 px-2">
                  <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-lg text-[11px] font-bold truncate inline-block max-w-full">
                    {profile ? `${profile.title} (${profile.code})` : 'فاقد پروفایل'}
                  </span>
                </div>
                <div className="w-32 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getRoleBadgeColor(emp.role)}`}>
                    {getRoleLabel(emp.role)}
                  </span>
                </div>
                <div className="w-48 shrink-0 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onStartEvaluation(emp.id)}
                    className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                    title="شروع ارزیابی"
                  >
                    <ClipboardPlus className="w-3.5 h-3.5" />
                    <span>ارزیابی</span>
                  </button>
                  <button
                    onClick={() => openForm(emp)}
                    className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {isProtected ? (
                    <div 
                      className="p-1.5 text-slate-500 bg-slate-800/40 rounded-lg cursor-not-allowed opacity-50 flex items-center justify-center"
                      title="حساب مدیر ریشه محافظت‌شده است"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(emp)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                      title="حذف پرسنل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const profile = profiles.find(p => p.id === emp.profileId);
            const isProtectedGridEmp = isProtectedAdmin(emp);
            return (
              <div 
                key={emp.id} 
                className="bg-slate-800/20 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-teal-400">
                        {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-100">{emp.name}</h3>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${getRoleBadgeColor(emp.role)}`}>
                            {getRoleLabel(emp.role)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.code} | user: <span className="text-teal-400">{emp.username}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openForm(emp)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!isProtectedGridEmp && (
                        <button
                          type="button"
                          onClick={() => setEmployeeToDelete(emp)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                          title="حذف پرسنل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-800/60" />

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>واحد:</span>
                      <span className="text-slate-200 font-semibold">{emp.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>پروفایل شغلی:</span>
                      <span className="text-teal-400 font-bold">
                        {profile ? `${profile.title} (${profile.code})` : 'فاقد پروفایل'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => onStartEvaluation(emp.id)}
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ClipboardPlus className="w-4 h-4 text-teal-400" />
                    <span>ورود به فرم ارزیابی</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-right" dir="rtl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200">
                {editingId ? 'ویرایش مشخصات پرسنل' : 'ثبت کارمند جدید'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">نام و نام خانوادگی</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علی حسینی"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">کد پرسنلی</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: EMP-1011"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">واحد سازمانی</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خط تولید ۱"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">پروفایل شغلی</label>
                  <select
                    value={formProfileId}
                    onChange={(e) => setFormProfileId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 text-right"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">نام کاربری ورود (سیستم)</label>
                  <input
                    type="text"
                    placeholder="مثال: amiri یا کد پرسنلی"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">نقش کاربری</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 text-right"
                  >
                    <option value="employee">کارمند (ارزیابی‌شونده)</option>
                    <option value="supervisor">سرپرست مستقیم کارگاه</option>
                    <option value="admin">مدیر سیستم / منابع انسانی</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ثبت مشخصات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {employeeToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100">حذف پرسنل</h3>
                <p className="text-[11px] text-slate-400">حذف کارمند از سیستم و پاکسازی ارزیابی‌ها</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>نام و نام خانوادگی:</span>
                <span className="font-bold text-slate-100">{employeeToDelete.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>کد پرسنلی:</span>
                <span className="font-mono text-teal-400">{employeeToDelete.code}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>واحد:</span>
                <span className="text-slate-300">{employeeToDelete.unit}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                با حذف این کارمند، کلیه ارزیابی‌های پیش‌نویس و سوابق متصل به وی نیز حذف خواهند شد.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  const empName = employeeToDelete.name;
                  onDeleteEmployee(employeeToDelete.id);
                  setEmployeeToDelete(null);
                  setDeleteToast(`پرسنل ${empName} با موفقیت حذف گردید.`);
                  setTimeout(() => setDeleteToast(null), 3500);
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

      <UniversalDataExchange<Employee>
        config={employeesExchangeConfig}
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
