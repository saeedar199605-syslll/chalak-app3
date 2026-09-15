/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Criterion, KpiCalculationType, KpiScoreThresholds } from '../types';

export interface EvaluationFormulaResult {
  computedValue: number;
  score: number;
  status: 'excellent' | 'good' | 'acceptable' | 'warning' | 'critical';
  statusLabel: string;
  summaryText: string;
  error?: string;
}

export const DEFAULT_KPI_THRESHOLDS: KpiScoreThresholds = {
  score5: 105,
  score4: 95,
  score3: 85,
  score2: 70
};

export const DEFAULT_INVERSE_THRESHOLDS: KpiScoreThresholds = {
  score5: 1.0,
  score4: 2.5,
  score3: 5.0,
  score2: 8.0
};

export function safeEvaluateMath(expression: string, variables: Record<string, number>): { result: number; error?: string } {
  try {
    if (!expression || !expression.trim()) {
      return { result: 0, error: 'فرمول خالی است.' };
    }
    let cleanExpr = expression.trim();
    const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const val = variables[key];
      const safeVal = (typeof val === 'number' && !isNaN(val) && isFinite(val)) ? val : 0;
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      cleanExpr = cleanExpr.replace(regex, `(${safeVal})`);
    }
    if (!/^[\d\s+\-*/().^%]+$/.test(cleanExpr)) {
      return { result: 0, error: 'فرمول شامل کاراکترهای نامعتبر است.' };
    }
    const sanitizedEval = new Function(`
      "use strict";
      try {
        const res = (${cleanExpr});
        if (typeof res !== 'number' || isNaN(res) || !isFinite(res)) {
          return 0;
        }
        return res;
      } catch (e) {
        return 0;
      }
    `);
    const evalResult = Number(sanitizedEval());
    return { result: evalResult };
  } catch (err: any) {
    return { result: 0, error: err?.message || 'خطا در محاسبه فرمول' };
  }
}

export function calculateKpiScore(
  criterion: Criterion,
  inputValues: Record<string, number | undefined>
): EvaluationFormulaResult {
  const calcType: KpiCalculationType = criterion.calculationType || 'ratio';
  const dir = criterion.dir || 'more';
  const thresholds = criterion.scoreThresholds || (dir === 'less' ? DEFAULT_INVERSE_THRESHOLDS : DEFAULT_KPI_THRESHOLDS);

  const sanitizedInputs: Record<string, number> = {};
  if (criterion.variables && criterion.variables.length > 0) {
    criterion.variables.forEach(v => {
      const raw = inputValues[v.key];
      const num = typeof raw === 'number' && !isNaN(raw) ? raw : (Number(raw) || v.defaultValue || 0);
      sanitizedInputs[v.key] = num;
    });
  } else {
    ['actual', 'target', 'standard', 'scrap', 'total', 'value'].forEach(k => {
      const raw = inputValues[k];
      sanitizedInputs[k] = typeof raw === 'number' && !isNaN(raw) ? raw : (Number(raw) || 0);
    });
  }

  let computedValue = 0;
  let formulaDesc = '';

  switch (calcType) {
    case 'ratio': {
      const actual = sanitizedInputs.actual ?? 0;
      const target = sanitizedInputs.target ?? (criterion.targetValue || 100);
      if (target <= 0) {
        computedValue = actual > 0 ? 100 : 0;
      } else {
        computedValue = (actual / target) * 100;
      }
      formulaDesc = `تحقق هدف: (${actual} از ${target}) = ${computedValue.toFixed(1)}%`;
      break;
    }
    case 'inverse_ratio': {
      const actual = sanitizedInputs.actual ?? 0;
      const standard = sanitizedInputs.standard ?? (criterion.targetValue || 60);
      if (actual <= 0) {
        computedValue = 100;
      } else {
        computedValue = (standard / actual) * 100;
      }
      formulaDesc = `کاهش زمان: (${standard}s / ${actual}s) = ${computedValue.toFixed(1)}%`;
      break;
    }
    case 'defect_rate': {
      const scrap = sanitizedInputs.scrap ?? 0;
      const total = sanitizedInputs.total ?? 100;
      const scrapRate = total > 0 ? (scrap / total) * 100 : 0;
      computedValue = Math.max(0, 100 - scrapRate);
      formulaDesc = `نرخ ضایعات: ${scrapRate.toFixed(2)}% (کیفیت: ${computedValue.toFixed(2)}%)`;
      break;
    }
    case 'custom_formula': {
      const expr = criterion.formulaExpression || '(actual / target) * 100';
      const evalRes = safeEvaluateMath(expr, sanitizedInputs);
      if (evalRes.error) {
        return {
          computedValue: 0,
          score: 1,
          status: 'critical',
          statusLabel: 'خطا در فرمول',
          summaryText: `خطا در محاسبه فرمول: ${evalRes.error}`,
          error: evalRes.error
        };
      }
      computedValue = evalRes.result;
      formulaDesc = `فرمول محاسباتی [${expr}] = ${computedValue.toFixed(2)}`;
      break;
    }
    case 'direct_score':
    default: {
      const direct = sanitizedInputs.value ?? 3;
      const bounded = Math.min(5, Math.max(1, Math.round(direct)));
      return {
        computedValue: bounded,
        score: bounded,
        status: bounded >= 4 ? 'excellent' : (bounded === 3 ? 'acceptable' : 'warning'),
        statusLabel: bounded >= 4 ? 'عالی' : (bounded === 3 ? 'متوسط' : 'نیازمند بهبود'),
        summaryText: `نمره مستقیم: ${bounded} از ۵`
      };
    }
  }

  computedValue = Math.round(computedValue * 100) / 100;

  let score = 3;
  let status: EvaluationFormulaResult['status'] = 'acceptable';
  let statusLabel = 'متوسط';

  if (dir === 'less') {
    if (computedValue <= thresholds.score5) {
      score = 5;
      status = 'excellent';
      statusLabel = 'عالی';
    } else if (computedValue <= thresholds.score4) {
      score = 4;
      status = 'good';
      statusLabel = 'خوب';
    } else if (computedValue <= thresholds.score3) {
      score = 3;
      status = 'acceptable';
      statusLabel = 'متوسط';
    } else if (computedValue <= thresholds.score2) {
      score = 2;
      status = 'warning';
      statusLabel = 'ضعیف';
    } else {
      score = 1;
      status = 'critical';
      statusLabel = 'بحرانی';
    }
  } else {
    if (computedValue >= thresholds.score5) {
      score = 5;
      status = 'excellent';
      statusLabel = 'عالی';
    } else if (computedValue >= thresholds.score4) {
      score = 4;
      status = 'good';
      statusLabel = 'خوب';
    } else if (computedValue >= thresholds.score3) {
      score = 3;
      status = 'acceptable';
      statusLabel = 'متوسط';
    } else if (computedValue >= thresholds.score2) {
      score = 2;
      status = 'warning';
      statusLabel = 'ضعیف';
    } else {
      score = 1;
      status = 'critical';
      statusLabel = 'بحرانی';
    }
  }

  return {
    computedValue,
    score,
    status,
    statusLabel,
    summaryText: `${formulaDesc} | نمره ارزیابی: ${score} از ۵ (${statusLabel})`
  };
}

export function calculateMultiSourceCompositeScore(
  criterion: Criterion,
  breakdown: {
    misScore?: number;
    kasraScore?: number;
    supervisorScore?: number;
    systemScore?: number;
  }
): { score: number; docText: string; effectivePercentage: number } {
  const config = criterion.multiSourceConfig;
  if (!config || !config.items || config.items.length === 0) {
    const available = [
      breakdown.misScore,
      breakdown.kasraScore,
      breakdown.supervisorScore,
      breakdown.systemScore
    ].filter((s): s is number => s !== undefined && s > 0);

    if (available.length === 0) return { score: 0, docText: '', effectivePercentage: 0 };
    const avg = available.reduce((a, b) => a + b, 0) / available.length;
    const rounded = Math.round(avg * 10) / 10;
    return {
      score: rounded,
      docText: `میانگین منابع: ${rounded}`,
      effectivePercentage: 100
    };
  }

  let totalWeightedScore = 0;
  let totalAppliedWeight = 0;
  const partsSummary: string[] = [];

  config.items.forEach(item => {
    let sourceScore: number | undefined = undefined;
    let sourceName = item.label || '';

    if (item.source === 'mis') {
      sourceScore = breakdown.misScore;
      if (!sourceName) sourceName = 'سیستم اطلاعات MIS';
    } else if (item.source === 'kasra') {
      sourceScore = breakdown.kasraScore;
      if (!sourceName) sourceName = 'تردد کسری';
    } else if (item.source === 'supervisor') {
      sourceScore = breakdown.supervisorScore;
      if (!sourceName) sourceName = 'نظر سرپرست';
    } else if (item.source === 'system') {
      sourceScore = breakdown.systemScore;
      if (!sourceName) sourceName = 'فرمول خودکار';
    }

    if (sourceScore !== undefined && sourceScore > 0) {
      totalWeightedScore += sourceScore * item.weightPercent;
      totalAppliedWeight += item.weightPercent;
      partsSummary.push(`${sourceName} (${item.weightPercent}٪): ${sourceScore}`);
    } else {
      partsSummary.push(`${sourceName} (${item.weightPercent}٪): ثبت‌نشده`);
    }
  });

  if (totalAppliedWeight === 0) {
    return { score: 0, docText: 'داده‌ای از منابع چندگانه یافت نشد', effectivePercentage: 0 };
  }

  const finalScore = Math.round((totalWeightedScore / totalAppliedWeight) * 10) / 10;
  return {
    score: Math.min(5, Math.max(1, finalScore)),
    docText: partsSummary.join(' | '),
    effectivePercentage: totalAppliedWeight
  };
}
