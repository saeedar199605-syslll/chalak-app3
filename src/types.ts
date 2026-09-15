/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryKey = 'K' | 'Q' | 'B' | 'S' | 'L';

export interface KpiVariableDefinition {
  key: string;            // e.g. "actual", "target", "scrap", "cycle_time"
  label: string;          // e.g. "تولید واقعی", "هدف تولید"
  unit?: string;          // e.g. "عدد", "درصد", "ثانیه"
  defaultValue?: number;
}

export type KpiCalculationType = 
  | 'ratio'           // (actual / target) * 100
  | 'inverse_ratio'   // (standard / actual) * 100
  | 'defect_rate'     // 100 - (scrap / total) * 100
  | 'custom_formula'  // e.g. "(actual / target) * 90 + (quality * 0.1)"
  | 'direct_score';   // نمره‌دهی مستقیم دستی

export interface KpiScoreThresholds {
  score5: number; // e.g. >= 105
  score4: number; // e.g. >= 95
  score3: number; // e.g. >= 85
  score2: number; // e.g. >= 70
}

export type CriterionScoringSource = 
  | 'supervisor' // ارزیابی کیفی سرپرست مستقیم
  | 'mis'        // سیستم اطلاعات تولید MIS/MES
  | 'kasra'      // سیستم حضور و غیاب کسری
  | 'system'     // سیستم محاسبه خودکار فرمول KPI
  | 'multi_source'; // ترکیبی چند منبعی (MIS + سرپرست)

export interface MultiSourceItemConfig {
  source: 'supervisor' | 'mis' | 'kasra' | 'system';
  weightPercent: number; // e.g. 50 (for 50%)
  misMetricKey?: MisMetricKey;
  label?: string; // e.g. "ثبت داده تولید MIS", "نمره مهارتی سرپرست"
}

export interface MultiSourceConfig {
  items: MultiSourceItemConfig[];
  aggregationMode?: 'weighted_average' | 'sum' | 'min' | 'max';
}

export type MisMetricKey = 
  | 'efficiency'         // راندمان تولید
  | 'scrap_rate'         // نرخ ضایعات
  | 'quality_score'      // نمره کیفی (QC)
  | 'output_qty'         // تیراژ تولید واقعی
  | 'downtime'           // زمان توقفات
  | 'attendance_delay'   // دقایق تاخیر ورود
  | 'attendance_absence' // روزهای غیبت
  | 'discipline'         // گزارش انضباطی
  | 'custom';            // فیلد سفارشی

export interface Criterion {
  id: string;
  code: string;
  cat: CategoryKey;
  name: string;
  def: string;
  source?: string;
  method?: string;
  dir?: 'more' | 'less'; // 'more' = higher is better, 'less' = lower is better
  scoringSource?: CriterionScoringSource; // منبع نمره‌دهی
  misMetricKey?: MisMetricKey;            // کلید متریک مربوطه
  customMetricField?: string;             // نام فیلد در شیت سفارشی
  autoPopulate?: boolean;                 // آیا نمره به طور خودکار ثبت شود؟
  misTargetValue?: number;                // تارگت مبنا
  multiSourceConfig?: MultiSourceConfig;  // تنظیمات چندمنبعی
  calculationType?: KpiCalculationType;
  formulaExpression?: string;
  variables?: KpiVariableDefinition[];
  unit?: string;
  targetValue?: number;
  scoreThresholds?: KpiScoreThresholds;
  department?: string; // دپارتمان تخصصی (تولید، کنترل کیفیت، HSE)
}

export interface ProfileItem {
  cid: string; // Criterion ID
  weight: number; // 5 to 25
}

export interface JobProfile {
  id: string;
  title: string;
  code: string; // e.g., B1, B3
  family: string; // e.g., B (Blue-collar), W (White-collar)
  locked: boolean;
  items: ProfileItem[];
}

export type UserRole = 'admin' | 'supervisor' | 'employee';

export interface Employee {
  id: string;
  name: string;
  code: string; // Staff ID, e.g. EMP-1001
  profileId: string;
  unit: string; // Department / Unit
  role: UserRole;
  username: string;
  supervisorId?: string; // Direct supervisor (Stage 2)
  peerReviewerId?: string; // Peer / Functional reviewer (360 feedback)
  calibrationLeadId?: string; // Calibration committee lead (Stage 3)
  approverId?: string; // Final HR Approver (Stage 4)
  hrPartnerId?: string; // HR Business Partner for feedback meeting (Stage 5)
}

export type WorkflowStageKey = 
  | 'self_review'        // خودارزیابی پرسنل
  | 'supervisor_review'  // ارزیابی سرپرست مستقیم
  | 'peer_review'        // بازخورد ۳۶۰ درجه همتراز
  | 'calibration_review' // بررسی کمیته کالیبراسیون
  | 'hr_approval'        // تایید نهایی مدیریت منابع انسانی
  | 'feedback_meeting'   // جلسه بازخورد و تنظیم IDP
  | 'completed'          // خاتمه‌یافته و قفل‌شده
  | 'rejected'           // عودت داده شده برای بازنگری
  | 'appealed';          // ثبت اعتراض و تجدیدنظر

export interface WorkflowTransitionLog {
  id: string;
  fromStage: WorkflowStageKey;
  toStage: WorkflowStageKey;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'submit_self' | 'submit_supervisor' | 'submit_peer' | 'approve_calibration' | 'approve_hr' | 'reject_to_supervisor' | 'reject_to_employee' | 'complete_feedback' | 'submit_appeal' | 'resolve_appeal' | 'admin_override' | 'reassign_assignee' | 'advance';
  comment?: string;
  targetAssigneeName?: string;
  timestamp: string;
}

export interface EvaluationRouteRule {
  id: string;
  title: string;
  unit?: string; // Specific unit or 'all'
  profileId?: string; // Specific profile or 'all'
  requiresSelfReview: boolean;
  requiresSupervisorReview: boolean;
  requiresPeerReview?: boolean;
  requiresCalibration: boolean;
  requiresHrApproval: boolean;
  autoAdvanceOnPass: boolean;
  maxSlaDaysPerStage?: number; // Days allowed before SLA breach
  defaultSupervisorId?: string;
  defaultApproverId?: string;
}

export interface IDPItem {
  id: string;
  competencyArea: string; // e.g. "شایستگی فنی و ایمنی"
  actionType: 'training_course' | 'on_the_job' | 'mentorship' | 'job_shadowing' | 'project_assignment';
  title: string;
  description: string;
  targetDate: string; // e.g. "۱۴۰۴/۰۹/۳۰"
  mentorName?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  completionNotes?: string;
}

export interface GrievanceAppeal {
  id: string;
  evalId: string;
  empId: string;
  period: string;
  appealedCriteriaIds: string[];
  reason: string;
  evidenceNotes?: string;
  status: 'submitted' | 'under_review' | 'accepted_modified' | 'rejected_upheld';
  submittedAt: string;
  reviewedAt?: string;
  reviewerName?: string;
  committeeDecision?: string;
  adjustedScoreDelta?: number;
}

export interface ScoreSourceBreakdown {
  misScore?: number;
  misMetricValue?: number | string;
  kasraScore?: number;
  kasraMetricValue?: number | string;
  supervisorScore?: number;
  systemScore?: number;
  updatedAt?: string;
}

export interface ScoreItem {
  cid: string;
  weight: number;
  value: number; // 1 to 5, or 0 if unrated (Supervisor)
  self: number;  // 1 to 5, or 0 if unrated (Employee)
  peer?: number; // 1 to 5, or 0 if unrated (Peer/360)
  doc?: string;  // Supporting document / justification
  sourceType?: 'supervisor' | 'mis' | 'kasra' | 'system' | 'multi_source' | 'auto';
  autoPopulated?: boolean;
  rawMetricValue?: number | string;
  rawMetricLabel?: string;
  overrideNote?: string;
  overrideBy?: string;
  sourceBreakdown?: ScoreSourceBreakdown;
}

export interface UserCustomPermission {
  userId: string;
  canEditCriteria: boolean;
  canEditProfiles: boolean;
  canEditEmployees: boolean;
  canStartEvaluations: boolean;
  canLockScores: boolean;
  canDefineTargets: boolean;
  canViewReports: boolean;
  canRestoreBackup: boolean;
}

export interface KasraAttendanceRecord {
  id: string;
  empCode: string;
  empName?: string;
  period: string;
  totalWorkHours: number;
  delayMinutes: number;
  absenceDays: number;
  leaveDays: number;
  overtimeHours: number;
  disciplineInfractions: number;
  calculatedScore: number; // 1 to 5
  notes?: string;
  importedAt: string;
}

export interface MISProductionRecord {
  id: string;
  empCode: string;
  empName?: string;
  period: string;
  producedUnits: number;
  targetUnits: number;
  efficiencyRate: number; // e.g. 102.5%
  scrapRate: number; // e.g. 1.2%
  downtimeHours: number;
  qualityScore: number; // e.g. 98%
  calculatedKpiScore: number; // 1 to 5
  notes?: string;
  importedAt: string;
}

export interface DynamicColumnMapping {
  excelColumn: string; // Header title from Excel
  targetType: 'staffCode' | 'staffName' | 'period' | 'criterion' | 'attendance_metric' | 'mis_metric' | 'note' | 'ignore';
  targetCriterionId?: string; // e.g. 'c1', 'C-BEH-01'
  targetMetricKey?: 'totalWorkHours' | 'delayMinutes' | 'absenceDays' | 'leaveDays' | 'overtimeHours' | 'disciplineInfractions' | 'producedUnits' | 'targetUnits' | 'efficiencyRate' | 'scrapRate' | 'downtimeHours' | 'qualityScore';
}

export interface DynamicExcelRowRecord {
  id: string;
  empCode: string;
  empName?: string;
  period: string;
  jobTitle?: string;
  unit?: string;
  scores: Record<string, number>; // criterionId -> score 1 to 5
  docs: Record<string, string>; // criterionId -> explanation/evidence
  metrics: {
    delayMinutes?: number;
    absenceDays?: number;
    disciplineInfractions?: number;
    efficiencyRate?: number;
    scrapRate?: number;
    qualityScore?: number;
  };
  overallNote?: string;
  isModifiedManually?: boolean;
  isValid: boolean;
  validationError?: string;
}

export interface BiasWarning {
  type: 'halo_horns' | 'recency' | 'leniency_strictness' | 'inappropriate_tone' | 'lack_of_evidence' | 'generic';
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  highlightSnippet?: string;
}

export interface BiasAnalysisResult {
  integrityScore: number; // 0 to 100
  hasWarnings: boolean;
  biasesDetected: BiasWarning[];
  suggestedRevision: string;
  coachingAdvice: string;
  analyzedAt: string;
}

export interface Evaluation {
  id: string;
  empId: string;
  profileId: string;
  period: string; // e.g., "دوره بهار ۱۴۰۳"
  status: 'draft' | 'calibrated' | 'locked';
  stage?: WorkflowStageKey; // Current workflow stage
  currentAssigneeId?: string; // Who currently has the task
  currentAssigneeName?: string;
  currentAssigneeRole?: UserRole;
  history?: WorkflowTransitionLog[]; // Audit trail of stage movements
  rejectionReason?: string;
  scores: ScoreItem[];
  overallScore?: number; // Optional overall score cache
  potentialScore?: number; // 1 to 5 for 9-Box Grid
  nineBoxPlacement?: {
    performance: 'low' | 'medium' | 'high';
    potential: 'low' | 'medium' | 'high';
    boxTitle: string;
    boxCategory: 'star' | 'high_performer' | 'core_player' | 'inconsistent' | 'talent_risk';
  };
  idpItems?: IDPItem[]; // Individual Development Plan
  appeal?: GrievanceAppeal; // Grievance / Appeal
  note?: string; // Performance conversation summary
  biasAnalysis?: BiasAnalysisResult;
  aiFeedback?: {
    strengths: string[];
    developmentAreas: string[];
    actionItems: string[];
    summary: string;
  };
  aiLoading?: boolean;
  created: number;
}

export const CATEGORIES: Record<CategoryKey, string> = {
  K: 'عملکرد کمی (KPI)',
  Q: 'شایستگی کیفی',
  B: 'شایستگی رفتاری',
  S: 'ایمنی و محیط زیست (HSE)',
  L: 'رهبری و کار تیمی'
};

export const PERFORMANCE_SCALE: Record<number, string> = {
  5: 'فراتر از انتظار (عالی)',
  4: 'در حد انتظار (خوب)',
  3: 'متوسط (نیازمند بهبود جزیی)',
  2: 'زیر حد انتظار (ضعیف)',
  1: 'غیرقابل قبول (بحرانی)'
};

export const NEED_DOCUMENT_SCORES = [1, 2, 5];
export const MIN_WEIGHT = 5;
export const MAX_WEIGHT = 25;
export const MAX_CRITERIA_COUNT = 12;
export const MANDATORY_SAFETY_CODE = 'S-01';
export const SCALE_FACTOR = 20; // 1-5 scale to 100 scale

export const CYCLE_STEPS = [
  { step: 1, title: 'هدف‌گذاری و تبیین شاخص‌ها', desc: 'توافق بر سر اهداف و اوزان' },
  { step: 2, title: 'خودارزیابی پرسنل', desc: 'تکمیل فرم توسط کارمند' },
  { step: 3, title: 'ارزیابی سرپرست مستقیم', desc: 'ثبت نمرات با شواهد عینی' },
  { step: 4, title: 'جلسه کالیبراسیون سازمانی', desc: 'متعادل‌سازی نمرات واحدها' },
  { step: 5, title: 'جلسه بازخورد مربیگری', desc: 'گفتگوی توسعه فردی' },
  { step: 6, title: 'برنامه توسعه فردی و پاداش', desc: 'تدوین برنامه IDP' }
];

export function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'E';
}

export const WORKFLOW_STAGES: Record<WorkflowStageKey, {
  label: string;
  stepNumber: number;
  description: string;
  badgeColor: string;
  actorRole: UserRole | 'committee' | 'any';
  responsibleLabel: string;
}> = {
  self_review: {
    label: 'خودارزیابی پرسنل',
    stepNumber: 1,
    description: 'پرسنل نمرات و مستندات خود را ثبت و ارسال می‌کند',
    badgeColor: 'blue',
    actorRole: 'employee',
    responsibleLabel: 'همکار / پرسنل'
  },
  supervisor_review: {
    label: 'ارزیابی سرپرست مستقیم',
    stepNumber: 2,
    description: 'سرپرست مستقیم نمرات و یادداشت مربیگری را درج می‌کند',
    badgeColor: 'amber',
    actorRole: 'supervisor',
    responsibleLabel: 'سرپرست مستقیم'
  },
  peer_review: {
    label: 'بازخورد ۳۶۰ درجه همتراز',
    stepNumber: 3,
    description: 'همکاران هم‌رده و واحدهای مرتبط بازخورد خود را ثبت می‌کنند',
    badgeColor: 'cyan',
    actorRole: 'any',
    responsibleLabel: 'همتراز / ارزیاب ۳۶۰'
  },
  calibration_review: {
    label: 'جلسه کالیبراسیون و انطباق',
    stepNumber: 4,
    description: 'کمیته ارزیابی جهت ایجاد عدالت و رفع سوگیری نمرات را بررسی می‌کند',
    badgeColor: 'purple',
    actorRole: 'admin',
    responsibleLabel: 'کمیته کالیبراسیون'
  },
  hr_approval: {
    label: 'تایید نهایی مدیریت منابع انسانی',
    stepNumber: 5,
    description: 'مدیر منابع انسانی نتایج نهایی و رتبه‌بندی را تایید می‌کند',
    badgeColor: 'indigo',
    actorRole: 'admin',
    responsibleLabel: 'مدیریت منابع انسانی'
  },
  feedback_meeting: {
    label: 'جلسه بازخورد و تنظیم IDP',
    stepNumber: 6,
    description: 'سرپرست و همکار جلسه بازخورد و برنامه‌ریزی توسعه فردی را برگزار می‌کنند',
    badgeColor: 'teal',
    actorRole: 'supervisor',
    responsibleLabel: 'سرپرست و همکار'
  },
  completed: {
    label: 'خاتمه‌یافته و قفل‌شده',
    stepNumber: 7,
    description: 'چرخه کامل شده و نمرات قطعی گردیده‌اند',
    badgeColor: 'emerald',
    actorRole: 'any',
    responsibleLabel: 'بایگانی قطعی'
  },
  rejected: {
    label: 'عودت جهت اصلاح و بازنگری',
    stepNumber: 0,
    description: 'ارزیابی به دلیل نقص شواهد یا مغایرت نمرات بازگردانده شده است',
    badgeColor: 'rose',
    actorRole: 'any',
    responsibleLabel: 'نیازمند بازنگری'
  },
  appealed: {
    label: 'ثبت اعتراض و تجدیدنظر',
    stepNumber: 8,
    description: 'همکار درخواست بازبینی مجدد نتایج را در کمیته ثبت کرده است',
    badgeColor: 'orange',
    actorRole: 'admin',
    responsibleLabel: 'کمیته رسیدگی به شکایات'
  }
};

export const NINE_BOX_MATRIX = {
  high_high: { title: 'ستارگان آینده (Future Star)', category: 'star' as const, color: 'emerald', desc: 'عملکرد عالی و پتانسیل رشد بسیار بالا' },
  high_med: { title: 'محرک رشد (Growth Driver)', category: 'high_performer' as const, color: 'teal', desc: 'عملکرد برجسته با پتانسیل پیشرفت خوب' },
  high_low: { title: 'متخصص مجرب (Expert / Core Specialist)', category: 'high_performer' as const, color: 'blue', desc: 'عملکرد فنی عالی در جایگاه کنونی' },
  med_high: { title: 'استعداد در حال رشد (Emerging Talent)', category: 'high_performer' as const, color: 'cyan', desc: 'عملکرد قابل‌قبول با پتانسیل ارتقای بالا' },
  med_med: { title: 'ستون عملکرد کارگاه (Core Performer)', category: 'core_player' as const, color: 'indigo', desc: 'نیروی اتکاپذیر و متعهد' },
  med_low: { title: 'همکار موثر (Effective Contributor)', category: 'core_player' as const, color: 'amber', desc: 'انجام وظایف محوله در حد استاندارد' },
  low_high: { title: 'پتانسیل نهفته (Enigma)', category: 'inconsistent' as const, color: 'purple', desc: 'استعداد بالا اما نیازمند جهت‌دهی عملکردی' },
  low_med: { title: 'نیازمند هدایت (Dilemma)', category: 'inconsistent' as const, color: 'orange', desc: 'عملکرد نوسانی و نیازمند آموزش' },
  low_low: { title: 'ریسک عملکردی (Underperformer)', category: 'talent_risk' as const, color: 'rose', desc: 'نیازمند برنامه فوری بهبود عملکرد (PIP)' }
};

export const DEFAULT_ROUTE_RULES: EvaluationRouteRule[] = [
  {
    id: 'route-default-workshop',
    title: 'مسیر استاندارد ارزیابی کارگاهی',
    unit: 'all',
    profileId: 'all',
    requiresSelfReview: true,
    requiresSupervisorReview: true,
    requiresCalibration: true,
    requiresHrApproval: true,
    autoAdvanceOnPass: false
  },
  {
    id: 'route-fast-track',
    title: 'مسیر سریع سرپرستی',
    unit: 'all',
    requiresSelfReview: false,
    requiresSupervisorReview: true,
    requiresCalibration: false,
    requiresHrApproval: true,
    autoAdvanceOnPass: true
  }
];

export const GRADE_DETAILS = {
  A: { label: 'فراتر از انتظار', color: 'emerald', description: 'عملکرد استثنایی و الگوی سایر همکاران.' },
  B: { label: 'در حد انتظار کامل', color: 'blue', description: 'تحقق دقیق اهداف و شایستگی‌های شغلی.' },
  C: { label: 'متوسط و قابل قبول', color: 'amber', description: 'نیازمند تمرکز بر بهبود برخی شاخص‌ها.' },
  D: { label: 'نیازمند بهبود فوری', color: 'orange', description: 'نیازمند تدوین برنامه توسعه فردی دقیق.' },
  E: { label: 'غیرقابل قبول', color: 'red', description: 'نیازمند مداخله جدی و برنامه بهبود PIP.' },
};

// ==========================================
// LATTICE-STYLE TALENT & PERFORMANCE TYPES
// ==========================================

export type OKRConfidence = 'on_track' | 'at_risk' | 'behind' | 'completed';
export type OKRLevel = 'company' | 'department' | 'individual';

export interface OKRKeyResult {
  id: string;
  title: string;
  metricType: 'percentage' | 'number' | 'currency' | 'boolean';
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  confidence: OKRConfidence;
  ownerName: string;
  lastUpdated: string;
}

export interface OKRGoal {
  id: string;
  title: string;
  description: string;
  level: OKRLevel;
  department: string;
  ownerId: string;
  ownerName: string;
  period: string; // e.g. "شش ماهه دوم ۱۴۰۴"
  category: 'strategic' | 'quality' | 'productivity' | 'safety' | 'innovation' | 'people';
  progress: number; // 0 to 100
  confidence: OKRConfidence;
  keyResults: OKRKeyResult[];
  alignmentParentId?: string; // Cascaded parent OKR
  createdDate: string;
  dueDate: string;
}

export interface TalkingPoint {
  id: string;
  text: string;
  isCompleted: boolean;
  addedBy: 'supervisor' | 'employee';
}

export interface OneOnOneActionItem {
  id: string;
  title: string;
  assigneeName: string;
  dueDate: string;
  isDone: boolean;
}

export interface OneOnOneMeeting {
  id: string;
  empId: string;
  empName: string;
  supervisorId: string;
  supervisorName: string;
  scheduledDate: string; // e.g. "۱۴۰۴/۰۷/۱۵"
  period: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  talkingPoints: TalkingPoint[];
  actionItems: OneOnOneActionItem[];
  sharedNotes?: string;
  privateSupervisorNotes?: string;
  moodRating?: number; // 1 to 5
  meetingMinutes?: string;
}

export interface PraiseKudos {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  receiverName: string;
  companyValue: 'کیفیت برتر' | 'نظم و انضباط' | 'ایمنی و HSE' | 'همدلی تیمی' | 'سرعت و بهره‌وری';
  badgeIcon: string;
  message: string;
  reactions: {
    claps: number;
    hearts: number;
    rockets: number;
    stars: number;
  };
  userReactions?: string[]; // current user reacted emojis
  createdAt: string;
}

export interface Feedback360Request {
  id: string;
  targetEmpId: string;
  targetEmpName: string;
  reviewerEmpId: string;
  reviewerEmpName: string;
  relationship: 'peer' | 'subordinate' | 'cross_functional' | 'manager';
  status: 'pending' | 'submitted';
  period: string;
  strengths?: string;
  growthAreas?: string;
  ratings?: Record<string, number>; // competencyId -> 1..5
  submittedAt?: string;
}

export interface PulseSurveyMetric {
  id: string;
  title: string;
  category: 'engagement' | 'manager_support' | 'workload' | 'recognition' | 'psychological_safety';
  score: number; // 0 to 100
  trend: 'up' | 'down' | 'stable';
  changeValue: string; // e.g. "+4.2%"
  responseRate: number; // e.g. 92%
}

// ==========================================
// KICKIDLER-STYLE PRODUCTIVITY & ACTIVITY TYPES
// ==========================================

export type KickidlerLiveStatus = 'productive' | 'neutral' | 'unproductive' | 'idle' | 'offline';

export interface TimeCategoryBreakdown {
  productiveMinutes: number;   // زمان کار با نرم‌افزارهای مفید
  neutralMinutes: number;      // وبگردی مجاز / اداری خنثی
  unproductiveMinutes: number; // شبکه‌های اجتماعی / اتلاف وقت
  idleMinutes: number;         // زمان قفل یا بدون ورودی
  totalWorkMinutes: number;    // کل زمان شیفت کاری
}

export interface WorkdayActivityRecord {
  id: string;
  empId: string;
  empName: string;
  empCode: string;
  unit: string;
  date: string; // e.g. "۱۴۰۴/۰۷/۱۰"
  timeBreakdown: TimeCategoryBreakdown;
  productivityIndex: number; // 0 to 100% (Kickidler Efficiency Rate)
  keystrokesCount: number;
  mouseClicksCount: number;
  activeAppTitle: string;
  activeAppCategory: 'cad_cam' | 'mes_erp' | 'office_docs' | 'browsing' | 'idle';
  burnoutRiskScore: number; // 0 to 100%
  burnoutCategory: 'optimal' | 'high_workload' | 'burnout_risk' | 'underloaded';
  violationsCount: number;
}

export interface LiveEmployeeActivity {
  empId: string;
  empName: string;
  empCode: string;
  unit: string;
  status: KickidlerLiveStatus;
  currentApp: string;
  currentAppCategory: string;
  shiftStartTime: string;
  activeDurationMinutes: number;
  todayProductivityRate: number; // %
  todayIdleMinutes: number;
  intensityRate: 'high' | 'medium' | 'low'; // شدت ورودی کیبورد و ماوس
  lastActiveTimestamp: string;
  avatarColor?: string;
}

export interface KickidlerViolation {
  id: string;
  empId: string;
  empName: string;
  empCode: string;
  unit: string;
  timestamp: string;
  type: 'unproductive_site' | 'prolonged_idle' | 'late_arrival' | 'early_departure' | 'unauthorized_program';
  title: string;
  description: string;
  durationMinutes?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'acknowledged' | 'addressed';
}
