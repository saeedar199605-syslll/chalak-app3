/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { 
  KasraAttendanceRecord, 
  MISProductionRecord, 
  Employee, 
  Evaluation, 
  Criterion, 
  JobProfile,
  DynamicColumnMapping,
  DynamicExcelRowRecord
} from '../types';

export function calculateKasraScore(
  delayMinutes: number,
  absenceDays: number,
  disciplineInfractions: number
): number {
  if (disciplineInfractions >= 2 || absenceDays >= 3) return 1;
  if (absenceDays > 0 || delayMinutes > 180 || disciplineInfractions === 1) return 2;
  if (delayMinutes > 45) return 3;
  if (delayMinutes > 15) return 4;
  return 5;
}

export function calculateMISScore(
  efficiencyRate: number,
  scrapRate: number,
  qualityScore: number
): number {
  if (efficiencyRate < 80 || scrapRate > 5.0 || qualityScore < 85) return 1;
  if (efficiencyRate < 92 || scrapRate > 3.2 || qualityScore < 90) return 2;
  if (efficiencyRate < 99 || scrapRate > 2.0 || qualityScore < 95) return 3;
  if (efficiencyRate < 105 || scrapRate > 1.2 || qualityScore < 98) return 4;
  return 5;
}

export function downloadKasraExcelTemplate(employees: Employee[], period: string = 'دوره بهار ۱۴۰۳') {
  const headers = [
    'کد پرسنلی (Staff Code)',
    'نام و نام خانوادگی',
    'دوره ارزیابی (Period)',
    'ساعت کار موظف',
    'دقایق تاخیر ورود',
    'روزهای غیبت غیرمجاز',
    'روزهای مرخصی',
    'ساعات اضافه کار',
    'تعداد تذکرات انضباطی',
    'توضیحات تکمیلی کسری'
  ];

  const sampleRows = employees.slice(0, 15).map((emp, idx) => [
    emp.code,
    emp.name,
    period,
    960,
    idx === 0 ? 10 : idx === 1 ? 45 : 0,
    0,
    idx % 2 === 0 ? 3 : 2,
    idx === 0 ? 45 : 30,
    0,
    'حضور منظم'
  ]);

  if (sampleRows.length === 0) {
    sampleRows.push([
      'EMP-1001',
      'علی حسینی',
      period,
      960,
      15,
      0,
      3,
      40,
      0,
      'نمونه رکورد حضور و غیاب'
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'تردد_کسری');
  XLSX.writeFile(wb, `قالب_ورود_داده_کسری_${period.replace(/\s+/g, '_')}.xlsx`);
}

export function downloadMISExcelTemplate(employees: Employee[], period: string = 'دوره بهار ۱۴۰۳') {
  const headers = [
    'کد پرسنلی (Staff Code)',
    'نام و نام خانوادگی',
    'دوره ارزیابی (Period)',
    'تیراژ تولید واقعی',
    'تیراژ هدف برنامه‌ریزی‌شده',
    'درصد راندمان تولید',
    'درصد ضایعات خط',
    'ساعت توقف ناخواسته',
    'نمره کیفی QC (درصد)',
    'توضیحات داده‌های MIS'
  ];

  const sampleRows = employees.slice(0, 15).map((emp, idx) => [
    emp.code,
    emp.name,
    period,
    12500 + idx * 300,
    12000,
    idx === 0 ? 104.2 : idx === 1 ? 98.5 : 101.0,
    idx === 0 ? 1.1 : idx === 1 ? 2.4 : 1.5,
    idx === 0 ? 3.5 : 5.0,
    idx === 0 ? 99.2 : 96.5,
    'عملکرد روتین شیفت ۱'
  ]);

  if (sampleRows.length === 0) {
    sampleRows.push([
      'EMP-1001',
      'علی حسینی',
      period,
      12500,
      12000,
      104.2,
      1.1,
      3.5,
      99.0,
      'نمونه داده‌های خط تولید MIS'
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'تولید_MIS');
  XLSX.writeFile(wb, `قالب_داده‌های_تولید_MIS_اصفهان_چالاک_${period.replace(/\s+/g, '_')}.xlsx`);
}

export function downloadDynamicCriteriaExcelTemplate({
  employees,
  criteria,
  profiles,
  selectedCriteriaIds,
  selectedProfileId,
  selectedUnit,
  period = 'دوره بهار ۱۴۰۳',
  includeDocColumns = true,
  existingEvaluations = []
}: {
  employees: Employee[];
  criteria: Criterion[];
  profiles: JobProfile[];
  selectedCriteriaIds: string[];
  selectedProfileId?: string;
  selectedUnit?: string;
  period?: string;
  includeDocColumns?: boolean;
  existingEvaluations?: Evaluation[];
}) {
  let filteredEmployees = [...employees];
  if (selectedProfileId && selectedProfileId !== 'all') {
    filteredEmployees = filteredEmployees.filter(e => e.profileId === selectedProfileId);
  }
  if (selectedUnit && selectedUnit !== 'all') {
    filteredEmployees = filteredEmployees.filter(e => e.unit === selectedUnit);
  }

  const activeCriteria = criteria.filter(c => selectedCriteriaIds.includes(c.id));

  const headers = [
    'کد پرسنلی (Staff Code)',
    'نام و نام خانوادگی',
    'عنوان شغل',
    'واحد سازمانی',
    'دوره ارزیابی (Period)'
  ];

  activeCriteria.forEach(crit => {
    headers.push(`[${crit.code}] ${crit.name} (نمره ۱ تا ۵)`);
    if (includeDocColumns) {
      headers.push(`شواهد و مستندات [${crit.code}]`);
    }
  });

  headers.push('یادداشت و گفتگوی مربیگری');

  const rows: any[][] = [];
  filteredEmployees.forEach(emp => {
    const prof = profiles.find(p => p.id === emp.profileId);
    const existingEval = existingEvaluations.find(ev => ev.empId === emp.id && ev.period === period);
    
    const row: any[] = [
      emp.code,
      emp.name,
      prof?.title || 'عمومی',
      emp.unit || 'خط تولید',
      period
    ];

    activeCriteria.forEach(crit => {
      const existingScore = existingEval?.scores?.find(s => s.cid === crit.id);
      row.push(existingScore?.value || 3);
      if (includeDocColumns) {
        row.push(existingScore?.doc || '');
      }
    });

    row.push(existingEval?.note || '');
    rows.push(row);
  });

  if (rows.length === 0) {
    const defaultRow: any[] = [
      'EMP-1001',
      'علی حسینی',
      'اپراتور ارشد',
      'خط تولید ۱',
      period
    ];
    activeCriteria.forEach(() => {
      defaultRow.push(4);
      if (includeDocColumns) defaultRow.push('رعایت کامل دستورالعمل');
    });
    defaultRow.push('عملکرد نمونه');
    rows.push(defaultRow);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 }
  ];

  activeCriteria.forEach(() => {
    ws['!cols']?.push({ wch: 30 });
    if (includeDocColumns) {
      ws['!cols']?.push({ wch: 32 });
    }
  });
  ws['!cols']?.push({ wch: 35 });

  const guideHeaders = ['کد شاخص', 'عنوان شاخص', 'دسته شایستگی', 'تعریف عملیاتی (راهنما)', 'منبع داده'];
  const guideRows = activeCriteria.map(c => [
    c.code,
    c.name,
    c.cat === 'K' ? 'عملکرد کمی KPI' : c.cat === 'Q' ? 'شایستگی کیفی' : c.cat === 'B' ? 'شایستگی رفتاری' : c.cat === 'S' ? 'ایمنی و HSE' : 'رهبری و تیمی',
    c.def,
    c.source || 'سرپرست مستقیم'
  ]);
  const wsGuide = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
  wsGuide['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 60 }, { wch: 25 }];

  XLSX.utils.book_append_sheet(wb, ws, 'ارزیابی_عملکرد_چالاک');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'راهنمای_شاخص‌ها');

  const fileName = `شیت_ارزیابی_سفارشی_${period.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function parseUniversalExcelFile(
  file: File,
  existingEmployees: Employee[],
  criteria: Criterion[]
): Promise<{
  sheets: string[];
  activeSheet: string;
  headers: string[];
  rawRows: any[][];
  suggestedMappings: DynamicColumnMapping[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheets = workbook.SheetNames;
        const activeSheet = sheets[0] || 'Sheet1';
        const worksheet = workbook.Sheets[activeSheet];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 1) {
          return resolve({
            sheets,
            activeSheet,
            headers: [],
            rawRows: [],
            suggestedMappings: []
          });
        }

        const headers: string[] = (rawJson[0] || []).map((h: any) => String(h || '').trim());
        const rawRows = rawJson.slice(1);

        const suggestedMappings: DynamicColumnMapping[] = headers.map((col) => {
          const colLower = col.toLowerCase();

          if (['کد پرسنلی', 'code', 'staff', 'شماره پرسنلی', 'پرسنلی', 'کد', 'employee_id'].some(k => colLower.includes(k))) {
            return { excelColumn: col, targetType: 'staffCode' };
          }

          if (['نام و نام خانوادگی', 'name', 'نام پرسنل', 'کارمند', 'نام'].some(k => colLower.includes(k)) && !colLower.includes('شغل')) {
            return { excelColumn: col, targetType: 'staffName' };
          }

          if (['دوره ارزیابی', 'period', 'دوره', 'فصل', 'نیمسال'].some(k => colLower.includes(k))) {
            return { excelColumn: col, targetType: 'period' };
          }

          for (const crit of criteria) {
            if (
              colLower.includes(crit.code.toLowerCase()) ||
              colLower.includes(crit.name.toLowerCase()) ||
              colLower.includes(`[${crit.code.toLowerCase()}]`)
            ) {
              return {
                excelColumn: col,
                targetType: 'criterion',
                targetCriterionId: crit.id
              };
            }
          }

          if (colLower.includes('تاخیر') || colLower.includes('دقیقه تاخیر') || colLower.includes('delay')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'delayMinutes' };
          }
          if (colLower.includes('غیبت') || colLower.includes('absence')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'absenceDays' };
          }
          if (colLower.includes('انضباطی') || colLower.includes('تذکر') || colLower.includes('infraction')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'disciplineInfractions' };
          }
          if (colLower.includes('ساعت کار') || colLower.includes('موظف') || colLower.includes('workhours')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'totalWorkHours' };
          }
          if (colLower.includes('اضافه کار') || colLower.includes('overtime')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'overtimeHours' };
          }
          if (colLower.includes('مرخصی') || colLower.includes('leave')) {
            return { excelColumn: col, targetType: 'attendance_metric', targetMetricKey: 'leaveDays' };
          }

          if (colLower.includes('راندمان') || colLower.includes('بهره وری') || colLower.includes('efficiency')) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'efficiencyRate' };
          }
          if (colLower.includes('ضایعات') || colLower.includes('scrap')) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'scrapRate' };
          }
          if (colLower.includes('تولید واقعی') || (colLower.includes('تولید') && !colLower.includes('هدف') && !colLower.includes('برنامه'))) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'producedUnits' };
          }
          if (colLower.includes('برنامه تولید') || colLower.includes('هدف') || colLower.includes('target')) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'targetUnits' };
          }
          if (colLower.includes('نمره کیفی') || colLower.includes('qc') || colLower.includes('کیفیت')) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'qualityScore' };
          }
          if (colLower.includes('توقف') || colLower.includes('downtime')) {
            return { excelColumn: col, targetType: 'mis_metric', targetMetricKey: 'downtimeHours' };
          }

          if (colLower.includes('یادداشت') || colLower.includes('توضیح') || colLower.includes('note') || colLower.includes('مربیگری')) {
            return { excelColumn: col, targetType: 'note' };
          }

          return { excelColumn: col, targetType: 'ignore' };
        });

        resolve({
          sheets,
          activeSheet,
          headers,
          rawRows,
          suggestedMappings
        });
      } catch (err: any) {
        reject(new Error('خطا در خواندن فایل اکسل: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('خطا در بارگذاری فایل اکسل'));
    reader.readAsArrayBuffer(file);
  });
}

export function recalculateDynamicRows({
  rawRows,
  headers,
  mappings,
  employees,
  criteria,
  profiles
}: {
  rawRows: any[][];
  headers: string[];
  mappings: DynamicColumnMapping[];
  employees: Employee[];
  criteria: Criterion[];
  profiles: JobProfile[];
}): {
  records: DynamicExcelRowRecord[];
  matchedEmployeesCount: number;
  totalValidRecords: number;
  warnings: string[];
} {
  const records: DynamicExcelRowRecord[] = [];
  const warnings: string[] = [];
  let matchedEmployeesCount = 0;

  const colIndexMap = headers.map((col) => {
    return mappings.find(m => m.excelColumn === col) || { excelColumn: col, targetType: 'ignore' as const };
  });

  rawRows.forEach((row, rIdx) => {
    if (!row || row.length === 0) return;

    let empCode = '';
    let empName = '';
    let period = 'دوره بهار ۱۴۰۳';
    const scores: Record<string, number> = {};
    const docs: Record<string, string> = {};
    const metrics: DynamicExcelRowRecord['metrics'] = {};
    let overallNote = '';

    colIndexMap.forEach((rule, colIdx) => {
      const cellVal = row[colIdx];
      if (cellVal === undefined || cellVal === null) return;
      const strVal = String(cellVal).trim();

      switch (rule.targetType) {
        case 'staffCode':
          empCode = strVal.toUpperCase();
          break;
        case 'staffName':
          empName = strVal;
          break;
        case 'period':
          period = strVal || period;
          break;
        case 'criterion':
          if (rule.targetCriterionId) {
            let numVal = Number(strVal);
            if (isNaN(numVal)) {
              if (strVal.length > 0) docs[rule.targetCriterionId] = strVal;
            } else {
              if (numVal < 1) numVal = 1;
              if (numVal > 5) numVal = 5;
              scores[rule.targetCriterionId] = numVal;
            }
          }
          break;
        case 'attendance_metric':
          if (rule.targetMetricKey) {
            metrics[rule.targetMetricKey] = Number(strVal) || 0;
          }
          break;
        case 'mis_metric':
          if (rule.targetMetricKey) {
            let num = Number(strVal) || 0;
            if ((rule.targetMetricKey === 'efficiencyRate' || rule.targetMetricKey === 'qualityScore') && num > 0 && num < 2) {
              num = num * 100;
            }
            metrics[rule.targetMetricKey] = num;
          }
          break;
        case 'note':
          overallNote = strVal;
          break;
      }
    });

    if (!empCode && !empName) return;

    const matchedEmp = employees.find(
      e => (empCode && e.code.toUpperCase() === empCode) ||
           (empCode && e.username.toLowerCase() === empCode.toLowerCase()) ||
           (empName && e.name.includes(empName))
    );

    if (matchedEmp) {
      matchedEmployeesCount++;
    } else {
      warnings.push(`ردیف ${rIdx + 2}: کارمندی با مشخصات ${empCode || ''} ${empName || ''} در سیستم پیدا نشد.`);
    }

    if (metrics.delayMinutes !== undefined || metrics.absenceDays !== undefined || metrics.disciplineInfractions !== undefined) {
      const calculatedAttScore = calculateKasraScore(
        metrics.delayMinutes || 0,
        metrics.absenceDays || 0,
        metrics.disciplineInfractions || 0
      );
      const attCriterion = criteria.find(c => c.cat === 'B' || c.cat === 'S' || c.name.includes('نظم') || c.name.includes('تردد'));
      if (attCriterion && scores[attCriterion.id] === undefined) {
        scores[attCriterion.id] = calculatedAttScore;
        docs[attCriterion.id] = `حضور و غیاب: ${metrics.delayMinutes || 0} دقیقه تاخیر، ${metrics.absenceDays || 0} روز غیبت، ${metrics.disciplineInfractions || 0} تذکر انضباطی`;
      }
    }

    if (metrics.efficiencyRate !== undefined || metrics.scrapRate !== undefined || metrics.qualityScore !== undefined) {
      const calculatedKpiScore = calculateMISScore(
        metrics.efficiencyRate || 100,
        metrics.scrapRate || 1.5,
        metrics.qualityScore || 98
      );
      const kpiCriterion = criteria.find(c => c.cat === 'K' || c.cat === 'Q' || c.name.includes('تولید') || c.name.includes('راندمان') || c.name.includes('OEE'));
      if (kpiCriterion && scores[kpiCriterion.id] === undefined) {
        scores[kpiCriterion.id] = calculatedKpiScore;
        docs[kpiCriterion.id] = `سیستم MIS: راندمان ${metrics.efficiencyRate || 100}٪، ضایعات ${metrics.scrapRate || 1.5}٪، کیفیت ${metrics.qualityScore || 98}٪`;
      }
    }

    const empProfile = matchedEmp ? profiles.find(p => p.id === matchedEmp.profileId) : undefined;

    records.push({
      id: `dyn-rec-${rIdx}-${Date.now()}`,
      empCode: matchedEmp ? matchedEmp.code : empCode,
      empName: matchedEmp ? matchedEmp.name : empName,
      period,
      jobTitle: empProfile?.title || 'عمومی',
      unit: matchedEmp?.unit || 'خط تولید',
      scores,
      docs,
      metrics,
      overallNote,
      isValid: !!matchedEmp,
      validationError: matchedEmp ? undefined : 'کارمند در پایگاه داده پرسنلی یافت نشد.'
    });
  });

  return {
    records,
    matchedEmployeesCount,
    totalValidRecords: records.filter(r => r.isValid).length,
    warnings
  };
}

export async function parseKasraExcelFile(
  file: File,
  existingEmployees: Employee[]
): Promise<{ records: KasraAttendanceRecord[]; errors: string[]; matchedCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          return resolve({ records: [], errors: ['شیت کسری فاقد ردیف‌های داده است.'], matchedCount: 0 });
        }

        const headers: string[] = (rows[0] || []).map((h: any) => String(h || '').trim());
        const dataRows = rows.slice(1);

        const findCol = (keywords: string[]) =>
          headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

        const codeIdx = findCol(['کد پرسنلی', 'code', 'staff', 'شماره پرسنلی', 'پرسنلی']);
        const nameIdx = findCol(['نام و نام خانوادگی', 'name', 'نام پرسنل', 'کارمند']);
        const periodIdx = findCol(['دوره ارزیابی', 'period', 'دوره', 'فصل']);
        const hoursIdx = findCol(['ساعت کار موظف', 'کارکرد', 'ساعت', 'hours']);
        const delayIdx = findCol(['دقایق تاخیر', 'تاخیر', 'delay', 'دقیقه تاخیر']);
        const absenceIdx = findCol(['غیبت غیرمجاز', 'absence', 'غیبت']);
        const leaveIdx = findCol(['مرخصی', 'leave']);
        const overtimeIdx = findCol(['اضافه کار', 'اضافه‌کار', 'overtime']);
        const infractionIdx = findCol(['تذکرات انضباطی', 'تذکر', 'infraction', 'انضباطی']);
        const noteIdx = findCol(['توضیحات تکمیلی', 'توضیحات', 'note', 'یادداشت']);

        const records: KasraAttendanceRecord[] = [];
        const errors: string[] = [];
        let matchedCount = 0;

        dataRows.forEach((row, rIdx) => {
          if (!row || row.length === 0 || !row[codeIdx !== -1 ? codeIdx : 0]) return;

          const rawCode = String(row[codeIdx !== -1 ? codeIdx : 0] || '').trim();
          const cleanCode = rawCode.toUpperCase();
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const period = periodIdx !== -1 ? String(row[periodIdx] || 'دوره بهار ۱۴۰۳').trim() : 'دوره بهار ۱۴۰۳';
          const totalWorkHours = Number(row[hoursIdx]) || 960;
          const delayMinutes = Number(row[delayIdx]) || 0;
          const absenceDays = Number(row[absenceIdx]) || 0;
          const leaveDays = Number(row[leaveIdx]) || 0;
          const overtimeHours = Number(row[overtimeIdx]) || 0;
          const disciplineInfractions = Number(row[infractionIdx]) || 0;
          const notes = noteIdx !== -1 ? String(row[noteIdx] || '') : '';

          const matchedEmp = existingEmployees.find(
            emp => emp.code.toUpperCase() === cleanCode || 
                   emp.username.toLowerCase() === rawCode.toLowerCase() ||
                   (rawName && emp.name.includes(rawName))
          );

          if (matchedEmp) {
            matchedCount++;
          } else {
            errors.push(`ردیف ${rIdx + 2}: کارمند با کد ${rawCode} در بانک اطلاعاتی یافت نشد.`);
          }

          const calculatedScore = calculateKasraScore(delayMinutes, absenceDays, disciplineInfractions);

          records.push({
            id: 'kasra-' + Date.now() + '-' + rIdx,
            empCode: matchedEmp ? matchedEmp.code : cleanCode,
            empName: matchedEmp ? matchedEmp.name : rawName,
            period,
            totalWorkHours,
            delayMinutes,
            absenceDays,
            leaveDays,
            overtimeHours,
            disciplineInfractions,
            calculatedScore,
            notes,
            importedAt: new Date().toLocaleDateString('fa-IR')
          });
        });

        resolve({ records, errors, matchedCount });
      } catch (err: any) {
        reject(new Error('خطا در پردازش فایل اکسل کسری: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseMISExcelFile(
  file: File,
  existingEmployees: Employee[]
): Promise<{ records: MISProductionRecord[]; errors: string[]; matchedCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length < 2) {
          return resolve({ records: [], errors: ['شیت MIS فاقد داده معتبر است.'], matchedCount: 0 });
        }

        const headers: string[] = (rows[0] || []).map((h: any) => String(h || '').trim());
        const dataRows = rows.slice(1);

        const findCol = (keywords: string[]) =>
          headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

        const codeIdx = findCol(['کد پرسنلی', 'code', 'staff', 'شماره پرسنلی', 'پرسنلی']);
        const nameIdx = findCol(['نام و نام خانوادگی', 'name', 'نام پرسنل', 'کارمند']);
        const periodIdx = findCol(['دوره ارزیابی', 'period', 'دوره', 'فصل']);
        const producedIdx = findCol(['تیراژ تولید واقعی', 'تولید واقعی', 'produced', 'تولید', 'تیراژ']);
        const targetIdx = findCol(['تیراژ هدف برنامه‌ریزی‌شده', 'هدف', 'target', 'برنامه', 'تارگت']);
        const efficiencyIdx = findCol(['درصد راندمان تولید', 'راندمان', 'efficiency', 'بهره وری', 'درصد راندمان']);
        const scrapIdx = findCol(['درصد ضایعات خط', 'ضایعات', 'scrap', 'درصد ضایعات', 'افت کیفی']);
        const downtimeIdx = findCol(['ساعت توقف ناخواسته', 'توقف', 'downtime', 'ساعت توقف']);
        const qualityIdx = findCol(['نمره کیفی qc', 'نمره کیفی', 'qc', 'quality', 'کیفیت']);
        const noteIdx = findCol(['توضیحات داده‌های mis', 'توضیحات', 'note', 'یادداشت']);

        const records: MISProductionRecord[] = [];
        const errors: string[] = [];
        let matchedCount = 0;

        dataRows.forEach((row, rIdx) => {
          if (!row || row.length === 0 || !row[codeIdx !== -1 ? codeIdx : 0]) return;

          const rawCode = String(row[codeIdx !== -1 ? codeIdx : 0] || '').trim();
          const cleanCode = rawCode.toUpperCase();
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const period = periodIdx !== -1 ? String(row[periodIdx] || 'دوره بهار ۱۴۰۳').trim() : 'دوره بهار ۱۴۰۳';
          
          const producedUnits = Number(row[producedIdx]) || 12000;
          const targetUnits = Number(row[targetIdx]) || 12000;
          let efficiencyRate = Number(row[efficiencyIdx]) || 100;
          if (efficiencyRate < 2 && efficiencyRate > 0) {
            efficiencyRate = efficiencyRate * 100;
          }
          let scrapRate = Number(row[scrapIdx]) || 1.5;
          if (scrapRate < 0.2 && scrapRate > 0) {
            scrapRate = scrapRate * 100;
          }
          const downtimeHours = Number(row[downtimeIdx]) || 0;
          let qualityScore = Number(row[qualityIdx]) || 98;
          if (qualityScore < 2 && qualityScore > 0) {
            qualityScore = qualityScore * 100;
          }
          const notes = noteIdx !== -1 ? String(row[noteIdx] || '') : '';

          const matchedEmp = existingEmployees.find(
            emp => emp.code.toUpperCase() === cleanCode || 
                   emp.username.toLowerCase() === rawCode.toLowerCase() ||
                   (rawName && emp.name.includes(rawName))
          );

          if (matchedEmp) {
            matchedCount++;
          } else {
            errors.push(`ردیف ${rIdx + 2}: پرسنل با کد ${rawCode} در پایگاه داده یافت نشد.`);
          }

          const calculatedKpiScore = calculateMISScore(efficiencyRate, scrapRate, qualityScore);

          records.push({
            id: 'mis-' + Date.now() + '-' + rIdx,
            empCode: matchedEmp ? matchedEmp.code : cleanCode,
            empName: matchedEmp ? matchedEmp.name : rawName,
            period,
            producedUnits,
            targetUnits,
            efficiencyRate,
            scrapRate,
            downtimeHours,
            qualityScore,
            calculatedKpiScore,
            notes,
            importedAt: new Date().toLocaleDateString('fa-IR')
          });
        });

        resolve({ records, errors, matchedCount });
      } catch (err: any) {
        reject(new Error('خطا در پردازش فایل اکسل MIS: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('خطا در بارگذاری فایل'));
    reader.readAsArrayBuffer(file);
  });
}
