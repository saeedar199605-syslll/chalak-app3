/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { Employee, Criterion, JobProfile, ProfileItem, Evaluation } from '../types';

export type ValidationResult<T> = 
  | { success: true; data: T; errors?: never }
  | { success: false; errors: string[]; data?: never };

export type AdminPasswordValidationResult = 
  | { success: true; newPassword: string; error?: never }
  | { success: false; error: string; newPassword?: never };

export function sanitizeInputString(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'string' ? val : String(val);
  str = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '')
    .replace(/\0/g, '')
    .trim();
  return str;
}

export const EmployeeInputSchema = z.object({
  name: z.string().min(2, 'نام و نام خانوادگی باید حداقل ۲ حرف باشد.').max(100, 'نام بیش از حد طولانی است.'),
  code: z.string().min(2, 'کد پرسنلی الزامی است.').max(30, 'کد پرسنلی حداکثر ۳۰ کاراکتر است.'),
  unit: z.string().min(2, 'نام واحد الزامی است.').max(100),
  profileId: z.string().min(1, 'پروفایل شغلی الزامی است.'),
  role: z.enum(['admin', 'supervisor', 'employee'] as const, {
    message: 'نقش کاربری نامعتبر است.'
  }),
  username: z.string()
    .min(1, 'نام کاربری الزامی است.')
    .max(50, 'نام کاربری حداکثر ۵۰ کاراکتر است.')
    .regex(/^[a-z0-9_.-]+$/, 'نام کاربری فقط می‌تواند شامل حروف کوچک انگلیسی، اعداد، نقطه و خط تیره باشد.'),
  supervisorId: z.string().max(50).optional(),
  peerReviewerId: z.string().max(50).optional(),
  calibrationLeadId: z.string().max(50).optional(),
  approverId: z.string().max(50).optional(),
  hrPartnerId: z.string().max(50).optional()
});

export function sanitizeEmployeeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const codeSanitized = sanitizeInputString(data.code).toUpperCase();
  let usernameRaw = sanitizeInputString(data.username).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (!usernameRaw) {
    const codeClean = codeSanitized.toLowerCase().replace(/[^a-z0-9]/g, '');
    usernameRaw = `user_${codeClean || Math.random().toString(36).substring(2, 7)}`;
  }
  return {
    ...data,
    name: sanitizeInputString(data.name),
    code: codeSanitized,
    unit: sanitizeInputString(data.unit),
    profileId: sanitizeInputString(data.profileId),
    username: usernameRaw,
    supervisorId: data.supervisorId ? sanitizeInputString(data.supervisorId) : undefined,
    peerReviewerId: data.peerReviewerId ? sanitizeInputString(data.peerReviewerId) : undefined,
    calibrationLeadId: data.calibrationLeadId ? sanitizeInputString(data.calibrationLeadId) : undefined,
    approverId: data.approverId ? sanitizeInputString(data.approverId) : undefined,
    hrPartnerId: data.hrPartnerId ? sanitizeInputString(data.hrPartnerId) : undefined
  };
}

export function validateEmployeeInput(data: unknown): ValidationResult<Omit<Employee, 'id'>> {
  const sanitized = sanitizeEmployeeData(data);
  const result = EmployeeInputSchema.safeParse(sanitized);
  if (result.success) {
    return { success: true, data: result.data as Omit<Employee, 'id'> };
  }
  const errorMessages = result.error.issues ? result.error.issues.map(i => i.message) : ['خطای اعتبارسنجی مشخصات پرسنل.'];
  return {
    success: false,
    errors: errorMessages
  };
}

export const CriterionInputSchema = z.object({
  code: z.string().min(2, 'کد شاخص باید حداقل ۲ کاراکتر باشد.').max(40, 'کد شاخص حداکثر ۴۰ کاراکتر است.'),
  cat: z.enum(['K', 'Q', 'B', 'S', 'L'] as const, {
    message: 'دسته شایستگی نامعتبر است.'
  }),
  name: z.string().min(2, 'عنوان شاخص باید حداقل ۲ حرف باشد.').max(150, 'عنوان شاخص حداکثر ۱۵۰ کاراکتر است.'),
  def: z.string().min(3, 'تعریف عملیاتی شاخص الزامی است.').max(1000, 'تعریف شاخص حداکثر ۱۰۰۰ کاراکتر است.'),
  source: z.string().max(200).optional(),
  method: z.string().max(200).optional(),
  dir: z.enum(['more', 'less'] as const).optional(),
  scoringSource: z.enum(['supervisor', 'mis', 'kasra', 'system', 'multi_source'] as const).optional(),
  misMetricKey: z.enum(['efficiency', 'scrap_rate', 'quality_score', 'output_qty', 'downtime', 'attendance_delay', 'attendance_absence', 'discipline', 'custom'] as const).optional(),
  customMetricField: z.string().max(100).optional(),
  autoPopulate: z.boolean().optional(),
  misTargetValue: z.number().optional(),
  calculationType: z.enum(['ratio', 'inverse_ratio', 'defect_rate', 'custom_formula', 'direct_score'] as const).optional(),
  formulaExpression: z.string().max(500).optional(),
  variables: z.array(z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().optional(),
    defaultValue: z.number().optional()
  })).optional(),
  unit: z.string().max(50).optional(),
  targetValue: z.number().optional(),
  scoreThresholds: z.object({
    score5: z.number(),
    score4: z.number(),
    score3: z.number(),
    score2: z.number()
  }).optional()
});

export function sanitizeCriterionData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    code: sanitizeInputString(data.code).toUpperCase(),
    name: sanitizeInputString(data.name),
    def: sanitizeInputString(data.def),
    source: data.source ? sanitizeInputString(data.source) : undefined,
    method: data.method ? sanitizeInputString(data.method) : undefined,
    dir: data.dir || undefined,
    scoringSource: data.scoringSource || 'supervisor',
    misMetricKey: data.misMetricKey || undefined,
    customMetricField: data.customMetricField ? sanitizeInputString(data.customMetricField) : undefined,
    autoPopulate: data.autoPopulate !== undefined ? Boolean(data.autoPopulate) : true,
    misTargetValue: typeof data.misTargetValue === 'number' ? data.misTargetValue : (data.misTargetValue ? Number(data.misTargetValue) : undefined),
    calculationType: data.calculationType || undefined,
    formulaExpression: data.formulaExpression ? sanitizeInputString(data.formulaExpression) : undefined,
    unit: data.unit ? sanitizeInputString(data.unit) : undefined,
    targetValue: typeof data.targetValue === 'number' ? data.targetValue : (data.targetValue ? Number(data.targetValue) : undefined),
    variables: Array.isArray(data.variables) ? data.variables.map((v: any) => ({
      key: sanitizeInputString(v.key),
      label: sanitizeInputString(v.label),
      unit: v.unit ? sanitizeInputString(v.unit) : undefined,
      defaultValue: typeof v.defaultValue === 'number' ? v.defaultValue : undefined
    })) : undefined,
    scoreThresholds: data.scoreThresholds ? {
      score5: Number(data.scoreThresholds.score5) || 105,
      score4: Number(data.scoreThresholds.score4) || 95,
      score3: Number(data.scoreThresholds.score3) || 85,
      score2: Number(data.scoreThresholds.score2) || 70,
    } : undefined
  };
}

export function validateCriterionInput(data: unknown): ValidationResult<Omit<Criterion, 'id'>> {
  const sanitized = sanitizeCriterionData(data);
  const result = CriterionInputSchema.safeParse(sanitized);
  if (result.success) {
    return { success: true, data: result.data as Omit<Criterion, 'id'> };
  }
  const errorMessages = result.error.issues ? result.error.issues.map(i => i.message) : ['خطای اعتبارسنجی شاخص.'];
  return {
    success: false,
    errors: errorMessages
  };
}

export const ProfileItemSchema = z.object({
  cid: z.string().min(1, 'شناسه شاخص الزامی است.'),
  weight: z.number().min(5, 'حداقل وزن شاخص ۵ درصد است.').max(50, 'حداکثر وزن شاخص ۵۰ درصد است.')
});

export const JobProfileInputSchema = z.object({
  title: z.string().min(2, 'عنوان شغل الزامی است.').max(150),
  code: z.string().min(1, 'کد شغل الزامی است.').max(30),
  family: z.string().min(1, 'خانواده شغلی الزامی است.').max(50),
  locked: z.boolean().default(false),
  items: z.array(ProfileItemSchema).min(1, 'حداقل یک شاخص برای پروفایل الزامی است.')
});

export function sanitizeJobProfileData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    title: sanitizeInputString(data.title),
    code: sanitizeInputString(data.code).toUpperCase(),
    family: sanitizeInputString(data.family),
    locked: Boolean(data.locked),
    items: Array.isArray(data.items) ? data.items.map((it: any) => ({
      cid: sanitizeInputString(it?.cid),
      weight: typeof it?.weight === 'number' ? it.weight : Number(it?.weight) || 0
    })) : []
  };
}

export function validateJobProfileInput(data: unknown): ValidationResult<Omit<JobProfile, 'id'>> {
  const sanitized = sanitizeJobProfileData(data);
  const result = JobProfileInputSchema.safeParse(sanitized);
  if (result.success) {
    return { success: true, data: result.data as Omit<JobProfile, 'id'> };
  }
  const errorMessages = result.error.issues ? result.error.issues.map(i => i.message) : ['خطای اعتبارسنجی پروفایل شغلی.'];
  return {
    success: false,
    errors: errorMessages
  };
}

export const ScoreItemSchema = z.object({
  cid: z.string().min(1),
  weight: z.number().min(0).max(100),
  value: z.number().min(0).max(5),
  self: z.number().min(0).max(5),
  peer: z.number().min(0).max(5).optional(),
  doc: z.string().max(1000).optional()
});

export const EvaluationInputSchema = z.object({
  empId: z.string().min(1, 'شناسه کارمند الزامی است.'),
  profileId: z.string().min(1, 'پروفایل شغلی الزامی است.'),
  period: z.string().min(2, 'دوره ارزیابی الزامی است.').max(50),
  status: z.enum(['draft', 'calibrated', 'locked'] as const),
  scores: z.array(ScoreItemSchema),
  created: z.number().optional()
});

export function sanitizeEvaluationData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    empId: sanitizeInputString(data.empId),
    profileId: sanitizeInputString(data.profileId),
    period: sanitizeInputString(data.period),
    status: data.status,
    scores: Array.isArray(data.scores) ? data.scores.map((sc: any) => ({
      cid: sanitizeInputString(sc?.cid),
      weight: typeof sc?.weight === 'number' ? sc.weight : Number(sc?.weight) || 0,
      value: typeof sc?.value === 'number' ? sc.value : Number(sc?.value) || 0,
      self: typeof sc?.self === 'number' ? sc.self : Number(sc?.self) || 0,
      peer: typeof sc?.peer === 'number' ? sc.peer : undefined,
      doc: sc?.doc ? sanitizeInputString(sc.doc) : undefined
    })) : []
  };
}

export function validateEvaluationInput(data: unknown): ValidationResult<Partial<Evaluation>> {
  const sanitized = sanitizeEvaluationData(data);
  const result = EvaluationInputSchema.safeParse(sanitized);
  if (result.success) {
    return { success: true, data: result.data as Partial<Evaluation> };
  }
  const errorMessages = result.error.issues ? result.error.issues.map(i => i.message) : ['خطای اعتبارسنجی ارزیابی.'];
  return {
    success: false,
    errors: errorMessages
  };
}

export const AdminPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'کلمه عبور فعلی الزامی است.'),
  newPassword: z.string()
    .min(5, 'کلمه عبور جدید باید حداقل ۵ کاراکتر باشد.')
    .max(100, 'کلمه عبور بیش از حد طولانی است.')
    .refine(val => !val.includes(' '), 'کلمه عبور نباید فاصله داشته باشد.'),
  confirmPassword: z.string().min(1, 'تکرار کلمه عبور جدید الزامی است.')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'کلمه عبور جدید و تکرار آن یکسان نیستند.',
  path: ['confirmPassword']
});

export function validateAdminPasswordChange(data: unknown): AdminPasswordValidationResult {
  const result = AdminPasswordSchema.safeParse(data);
  if (result.success) {
    return { success: true, newPassword: result.data.newPassword };
  }
  const msg = result.error.issues?.[0]?.message || 'خطا در اعتبارسنجی کلمه عبور.';
  return { success: false, error: msg };
}

export function clearLegacyAdminSessions(): void {
  localStorage.removeItem('pe_current_user');
  localStorage.removeItem('pe_admin_logged_in');
  localStorage.removeItem('pe_auth_token');
  localStorage.removeItem('pe_legacy_admin');
  localStorage.removeItem('pe_admin_session');
  sessionStorage.removeItem('pe_admin_session');
  sessionStorage.removeItem('pe_session_user');
  sessionStorage.removeItem('pe_admin_session_logged_at');
}
