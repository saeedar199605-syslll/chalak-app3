/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Comprehensive Seed Data for Lattice & Kickidler Modules
 * Tailored for Isfahan Chalak Enterprise Environment
 */

import { 
  OKRGoal, 
  OneOnOneMeeting, 
  PraiseKudos, 
  PulseSurveyMetric, 
  WorkdayActivityRecord, 
  LiveEmployeeActivity, 
  KickidlerViolation 
} from '../types';

export const INITIAL_OKRS: OKRGoal[] = [
  {
    id: 'okr-comp-1',
    title: 'ارتقای شاخص اثربخشی OEE کارخانه به بالای ۸۵٪ و کاهش ضایعات',
    description: 'هدف‌گذاری کلان سازمان در شش‌ماهه دوم جهت افزایش بهره‌وری ماشین‌آلات و کاهش دوباره‌کاری‌ها.',
    level: 'company',
    department: 'کل کارخانه',
    ownerId: 'emp-admin',
    ownerName: 'مدیریت سرمایه انسانی و ارشد کارخانه',
    period: 'شش ماهه دوم ۱۴۰۴',
    category: 'strategic',
    progress: 78,
    confidence: 'on_track',
    createdDate: '۱۴۰۴/۰۷/۰۱',
    dueDate: '۱۴۰۴/۱۲/۲۹',
    keyResults: [
      {
        id: 'kr-1-1',
        title: 'ارتقای میانگین اثربخشی کلی تجهیزات (OEE) خطوط اصلی از ۷۲٪ به ۸۵٪',
        metricType: 'percentage',
        startValue: 72,
        currentValue: 82.5,
        targetValue: 85,
        unit: 'درصد',
        confidence: 'on_track',
        ownerName: 'علی حسینی (سرپرست تولید)',
        lastUpdated: '۲ روز پیش'
      },
      {
        id: 'kr-1-2',
        title: 'کاهش ضایعات تولیدی قطعات حساس از ۳.۴٪ به زیر ۱.۲٪',
        metricType: 'percentage',
        startValue: 3.4,
        currentValue: 1.6,
        targetValue: 1.2,
        unit: 'درصد',
        confidence: 'on_track',
        ownerName: 'فاطمه اکبری (کنترل کیفیت)',
        lastUpdated: 'دیروز'
      },
      {
        id: 'kr-1-3',
        title: 'تحقق صفر حادثه منجر به از کار افتادگی (Zero LTI) در تمام خطوط',
        metricType: 'number',
        startValue: 2,
        currentValue: 0,
        targetValue: 0,
        unit: 'حادثه',
        confidence: 'completed',
        ownerName: 'واحد HSE و ایمنی',
        lastUpdated: 'امروز'
      }
    ]
  },
  {
    id: 'okr-dept-1',
    title: 'استانداردسازی زمان ستاپ و تعویض قالب خط CNC',
    description: 'کاهش زمان تعویض قالب‌ها با پیاده‌سازی متدولوژی SMED.',
    level: 'department',
    department: 'قالب‌بندی و ستاپ',
    ownerId: 'emp-1',
    ownerName: 'علی حسینی',
    period: 'شش ماهه دوم ۱۴۰۴',
    category: 'productivity',
    progress: 64,
    confidence: 'at_risk',
    alignmentParentId: 'okr-comp-1',
    createdDate: '۱۴۰۴/۰۷/۰۱',
    dueDate: '۱۴۰۴/۱۱/۳۰',
    keyResults: [
      {
        id: 'kr-2-1',
        title: 'کاهش متوسط زمان تعویض قالب از ۵۵ دقیقه به ۳۰ دقیقه',
        metricType: 'number',
        startValue: 55,
        currentValue: 38,
        targetValue: 30,
        unit: 'دقیقه',
        confidence: 'at_risk',
        ownerName: 'حسن مرادی',
        lastUpdated: '۳ روز پیش'
      },
      {
        id: 'kr-2-2',
        title: 'آموزش و ممیزی چک‌لیست‌های پنج‌مرحله‌ای ستاپ برای تمامی اپراتورها',
        metricType: 'percentage',
        startValue: 0,
        currentValue: 85,
        targetValue: 100,
        unit: 'درصد پرسنل',
        confidence: 'on_track',
        ownerName: 'علی حسینی',
        lastUpdated: 'هفته گذشته'
      }
    ]
  },
  {
    id: 'okr-ind-1',
    title: 'پیاده‌سازی پایلوت کنترل آماری فرآیند (SPC) در بازرسی قطعه',
    description: 'ثبت الکترونیکی داده‌های نمونه‌گیری آزمایشگاهی به‌جای دفاتر دستی.',
    level: 'individual',
    department: 'کنترل کیفیت',
    ownerId: 'emp-2',
    ownerName: 'مریم رضایی',
    period: 'شش ماهه دوم ۱۴۰۴',
    category: 'quality',
    progress: 91,
    confidence: 'on_track',
    alignmentParentId: 'okr-comp-1',
    createdDate: '۱۴۰۴/۰۷/۰۱',
    dueDate: '۱۴۰۴/۱۰/۳۰',
    keyResults: [
      {
        id: 'kr-3-1',
        title: 'ثبت روزانه داده‌های ایستگاه تست CMM در داشبورد دیجیتال',
        metricType: 'percentage',
        startValue: 60,
        currentValue: 95,
        targetValue: 100,
        unit: 'درصد انطباق',
        confidence: 'completed',
        ownerName: 'مریم رضایی',
        lastUpdated: 'امروز'
      },
      {
        id: 'kr-3-2',
        title: 'کاهش زمان صدور گزارش عدم‌انطباق (NCR) به کمتر از ۲ ساعت',
        metricType: 'percentage',
        startValue: 40,
        currentValue: 88,
        targetValue: 95,
        unit: 'درصد انطباق',
        confidence: 'on_track',
        ownerName: 'مریم رضایی',
        lastUpdated: 'دیروز'
      }
    ]
  }
];

export const INITIAL_ONE_ON_ONES: OneOnOneMeeting[] = [
  {
    id: '1on1-1',
    empId: 'emp-3',
    empName: 'حسن مرادی',
    supervisorId: 'emp-1',
    supervisorName: 'علی حسینی',
    scheduledDate: '۱۴۰۴/۰۷/۱۵',
    period: 'دوره بهار ۱۴۰۳',
    status: 'scheduled',
    moodRating: 4,
    talkingPoints: [
      { id: 'tp-1', text: 'بررسی چالش‌های ستاپ قالب‌های سنگین در شیفت عصر', isCompleted: true, addedBy: 'employee' },
      { id: 'tp-2', text: 'پیگیری روند اجرای برنامه توسعه فردی و آموزش SMED', isCompleted: true, addedBy: 'supervisor' },
      { id: 'tp-3', text: 'نیاز به هماهنگی با ابزارتیزکنی برای گیج‌های سوراخ‌کاری CNC', isCompleted: false, addedBy: 'supervisor' },
      { id: 'tp-4', text: 'درخواست حضور در دوره آموزشی هیدرولیک و پنوماتیک صنعتی', isCompleted: false, addedBy: 'employee' }
    ],
    actionItems: [
      { id: 'ai-1', title: 'هماهنگی با انبار قالب جهت جانمایی ابزارهای پرمصرف', assigneeName: 'حسن مرادی', dueDate: '۱۴۰۴/۰۷/۲۵', isDone: false },
      { id: 'ai-2', title: 'ارائه فرم درخواست دوره هیدرولیک به منابع انسانی', assigneeName: 'علی حسینی', dueDate: '۱۴۰۴/۰۷/۱۸', isDone: true }
    ],
    sharedNotes: 'جلسه بسیار مثبت بود. حسن تسلط خوبی بر فرآیندهای مکانیکی پیدا کرده و انگیزه بالایی برای یادگیری تخصصی دارد.',
    privateSupervisorNotes: 'پتانسیل بالا برای سرپرستی شیفت قالب‌بندی در سال آینده. نیاز به تقویت مهارت ارتباطی با اپراتورهای جوان‌تر دارد.'
  },
  {
    id: '1on1-2',
    empId: 'emp-2',
    empName: 'مریم رضایی',
    supervisorId: 'emp-4',
    supervisorName: 'فاطمه اکبری',
    scheduledDate: '۱۴۰۴/۰۷/۱۲',
    period: 'دوره بهار ۱۴۰۳',
    status: 'completed',
    moodRating: 5,
    talkingPoints: [
      { id: 'tp-21', text: 'نحوه مدیریت نمونه‌گیری خط ۲ در زمان پیک تولید QC', isCompleted: true, addedBy: 'supervisor' },
      { id: 'tp-22', text: 'بررسی دقت اندازه‌گیری کولیس‌های دیجیتال آزمایشگاه', isCompleted: true, addedBy: 'employee' }
    ],
    actionItems: [
      { id: 'ai-21', title: 'تنظیم برنامه کالیبراسیون هفتگی ابزارهای اندازه‌گیری', assigneeName: 'مریم رضایی', dueDate: '۱۴۰۴/۰۷/۲۰', isDone: true }
    ],
    sharedNotes: 'پیشرفت عالی در بازرسی قطعات. دقت و تعهد مریم به کیفیت، الگوی همکاران بخش است.',
    privateSupervisorNotes: 'شایسته تشویق ویژه و اعطای پاداش دستاورد کیفی در پایان فصل.'
  }
];

export const INITIAL_KUDOS: PraiseKudos[] = [
  {
    id: 'kudos-1',
    senderId: 'emp-1',
    senderName: 'علی حسینی',
    senderRole: 'سرپرست خط تولید ۱',
    receiverId: 'emp-3',
    receiverName: 'حسن مرادی',
    companyValue: 'سرعت و بهره‌وری',
    badgeIcon: '⚡',
    message: 'خسته نباشی حسن جان! رکورد فوق‌العاده‌ای در تعویض قالب شیفت دیشب زدی و خط بدون حتی یک دقیقه معطلی راه افتاد.',
    reactions: { claps: 12, hearts: 8, rockets: 15, stars: 9 },
    userReactions: ['rockets', 'claps'],
    createdAt: '۲ ساعت پیش'
  },
  {
    id: 'kudos-2',
    senderId: 'emp-4',
    senderName: 'فاطمه اکبری',
    senderRole: 'سرپرست کنترل کیفیت',
    receiverId: 'emp-2',
    receiverName: 'مریم رضایی',
    companyValue: 'کیفیت برتر',
    badgeIcon: '🎯',
    message: 'دقت کم‌نظیرت در کشف انحراف ابعادی قطعات ورودی مانع از توقف کل بچ مونتاژ شد. دمت گرم!',
    reactions: { claps: 18, hearts: 14, rockets: 6, stars: 11 },
    userReactions: ['hearts'],
    createdAt: 'دیروز'
  },
  {
    id: 'kudos-3',
    senderId: 'emp-3',
    senderName: 'حسن مرادی',
    senderRole: 'تکنسین ستاپ',
    receiverId: 'emp-5',
    receiverName: 'رضا ابراهیمی',
    companyValue: 'همدلی تیمی',
    badgeIcon: '🤝',
    message: 'ممنون از همکاری عالیت آقا رضا در بالابردن فیکسچرهای سنگین. کار تیمی واقعی یعنی این.',
    reactions: { claps: 9, hearts: 6, rockets: 4, stars: 7 },
    createdAt: '۳ روز پیش'
  },
  {
    id: 'kudos-4',
    senderId: 'emp-admin',
    senderName: 'مدیریت سرمایه انسانی',
    senderRole: 'اداره منابع انسانی',
    receiverId: 'emp-1',
    receiverName: 'علی حسینی',
    companyValue: 'ایمنی و HSE',
    badgeIcon: '🛡️',
    message: 'تقدیر از رعایت بی‌نقص استانداردهای ایمنی و ثبت صفر حادثه در خط ۱ طی فصل گذشته.',
    reactions: { claps: 24, hearts: 19, rockets: 11, stars: 16 },
    userReactions: ['stars', 'claps'],
    createdAt: 'هفته گذشته'
  }
];

export const INITIAL_PULSE_METRICS: PulseSurveyMetric[] = [
  {
    id: 'pm-1',
    title: 'رضایت کلی کارکنان از شغل (eSat)',
    category: 'engagement',
    score: 86.4,
    trend: 'up',
    changeValue: '+4.2%',
    responseRate: 94
  },
  {
    id: 'pm-2',
    title: 'کیفیت بازخورد و حمایت سرپرستان',
    category: 'manager_support',
    score: 89.1,
    trend: 'up',
    changeValue: '+6.5%',
    responseRate: 91
  },
  {
    id: 'pm-3',
    title: 'تناسب حجم کار و استراحت (Work-Life Balance)',
    category: 'workload',
    score: 75.8,
    trend: 'stable',
    changeValue: '+0.8%',
    responseRate: 88
  },
  {
    id: 'pm-4',
    title: 'امنیت روانی و شفافیت در محیط کار',
    category: 'psychological_safety',
    score: 82.0,
    trend: 'up',
    changeValue: '+3.1%',
    responseRate: 89
  }
];

// ==========================================
// KICKIDLER REAL-TIME MONITORING SEED DATA
// ==========================================

export const INITIAL_KICKIDLER_RECORDS: WorkdayActivityRecord[] = [
  {
    id: 'kd-rec-1',
    empId: 'emp-1',
    empName: 'علی حسینی',
    empCode: 'EMP-1001',
    unit: 'خط تولید ۱',
    date: '۱۴۰۴/۰۷/۱۰',
    timeBreakdown: {
      productiveMinutes: 405, // 6h 45m
      neutralMinutes: 42,     // 42m
      unproductiveMinutes: 13,// 13m
      idleMinutes: 20,        // 20m
      totalWorkMinutes: 480   // 8h
    },
    productivityIndex: 88.5,
    keystrokesCount: 14280,
    mouseClicksCount: 3840,
    activeAppTitle: 'نرم‌افزار مدیریت تولید اصفهان چالاک (MES)',
    activeAppCategory: 'mes_erp',
    burnoutRiskScore: 32,
    burnoutCategory: 'optimal',
    violationsCount: 0
  },
  {
    id: 'kd-rec-2',
    empId: 'emp-2',
    empName: 'مریم رضایی',
    empCode: 'EMP-1002',
    unit: 'کنترل کیفیت',
    date: '۱۴۰۴/۰۷/۱۰',
    timeBreakdown: {
      productiveMinutes: 420, // 7h 00m
      neutralMinutes: 35,
      unproductiveMinutes: 10,
      idleMinutes: 15,
      totalWorkMinutes: 480
    },
    productivityIndex: 91.2,
    keystrokesCount: 16900,
    mouseClicksCount: 4200,
    activeAppTitle: 'نرم‌افزار دستگاه اندازه‌گیری CMM - نرم‌افزار Mitutoyo',
    activeAppCategory: 'cad_cam',
    burnoutRiskScore: 28,
    burnoutCategory: 'optimal',
    violationsCount: 0
  },
  {
    id: 'kd-rec-3',
    empId: 'emp-3',
    empName: 'حسن مرادی',
    empCode: 'EMP-1003',
    unit: 'قالب‌بندی و تنظیم',
    date: '۱۴۰۴/۰۷/۱۰',
    timeBreakdown: {
      productiveMinutes: 370, // 6h 10m
      neutralMinutes: 50,
      unproductiveMinutes: 28,
      idleMinutes: 32,
      totalWorkMinutes: 480
    },
    productivityIndex: 82.0,
    keystrokesCount: 11400,
    mouseClicksCount: 2950,
    activeAppTitle: 'کنترل پنل دستگاه تراش CNC - کنترلر Sinumerik 840D',
    activeAppCategory: 'cad_cam',
    burnoutRiskScore: 68,
    burnoutCategory: 'high_workload',
    violationsCount: 1
  },
  {
    id: 'kd-rec-4',
    empId: 'emp-4',
    empName: 'فاطمه اکبری',
    empCode: 'EMP-1004',
    unit: 'کنترل کیفیت',
    date: '۱۴۰۴/۰۷/۱۰',
    timeBreakdown: {
      productiveMinutes: 395,
      neutralMinutes: 55,
      unproductiveMinutes: 12,
      idleMinutes: 18,
      totalWorkMinutes: 480
    },
    productivityIndex: 86.8,
    keystrokesCount: 18450,
    mouseClicksCount: 5120,
    activeAppTitle: 'سامانه یکپارچه ممیزی کیفی و مستندسازی ISO',
    activeAppCategory: 'mes_erp',
    burnoutRiskScore: 35,
    burnoutCategory: 'optimal',
    violationsCount: 0
  },
  {
    id: 'kd-rec-5',
    empId: 'emp-5',
    empName: 'رضا ابراهیمی',
    empCode: 'EMP-1005',
    unit: 'خط تولید ۲',
    date: '۱۴۰۴/۰۷/۱۰',
    timeBreakdown: {
      productiveMinutes: 325, // 5h 25m
      neutralMinutes: 60,
      unproductiveMinutes: 45,
      idleMinutes: 50,
      totalWorkMinutes: 480
    },
    productivityIndex: 72.4,
    keystrokesCount: 8900,
    mouseClicksCount: 2100,
    activeAppTitle: 'مرورگر کروم - وب‌سایت‌های متفرقه',
    activeAppCategory: 'browsing',
    burnoutRiskScore: 45,
    burnoutCategory: 'underloaded',
    violationsCount: 2
  }
];

export const INITIAL_LIVE_ACTIVITIES: LiveEmployeeActivity[] = [
  {
    empId: 'emp-1',
    empName: 'علی حسینی',
    empCode: 'EMP-1001',
    unit: 'خط تولید ۱',
    status: 'productive',
    currentApp: 'سامانه اطلاعات تولید MES (ثبت رکورد شیفت ۱)',
    currentAppCategory: 'نرم‌افزار تولیدی (ERP/MES)',
    shiftStartTime: '۰۷:۰۰',
    activeDurationMinutes: 145,
    todayProductivityRate: 88.5,
    todayIdleMinutes: 20,
    intensityRate: 'high',
    lastActiveTimestamp: 'همین الان',
    avatarColor: 'bg-emerald-600'
  },
  {
    empId: 'emp-2',
    empName: 'مریم رضایی',
    empCode: 'EMP-1002',
    unit: 'کنترل کیفیت',
    status: 'productive',
    currentApp: 'نرم‌افزار بازرسی CMM Mitutoyo - گزارش تلرانس ابعادی',
    currentAppCategory: 'نرم‌افزار فنی و مهندسی',
    shiftStartTime: '۰۷:۳۰',
    activeDurationMinutes: 110,
    todayProductivityRate: 91.2,
    todayIdleMinutes: 15,
    intensityRate: 'high',
    lastActiveTimestamp: 'همین الان',
    avatarColor: 'bg-blue-600'
  },
  {
    empId: 'emp-3',
    empName: 'حسن مرادی',
    empCode: 'EMP-1003',
    unit: 'قالب‌بندی و تنظیم',
    status: 'neutral',
    currentApp: 'مشاهده نقشه‌های ستاپ قالب در اتوکد',
    currentAppCategory: 'طراحی مهندسی',
    shiftStartTime: '۰۸:۰۰',
    activeDurationMinutes: 40,
    todayProductivityRate: 82.0,
    todayIdleMinutes: 32,
    intensityRate: 'medium',
    lastActiveTimestamp: '۲ دقیقه پیش',
    avatarColor: 'bg-indigo-600'
  },
  {
    empId: 'emp-4',
    empName: 'فاطمه اکبری',
    empCode: 'EMP-1004',
    unit: 'کنترل کیفیت',
    status: 'productive',
    currentApp: 'بررسی شاخص‌های کیفیت در شیت اکسل پایش ماهانه',
    currentAppCategory: 'مستندسازی کیفیت',
    shiftStartTime: '۰۷:۱۵',
    activeDurationMinutes: 180,
    todayProductivityRate: 86.8,
    todayIdleMinutes: 18,
    intensityRate: 'high',
    lastActiveTimestamp: 'همین الان',
    avatarColor: 'bg-purple-600'
  },
  {
    empId: 'emp-5',
    empName: 'رضا ابراهیمی',
    empCode: 'EMP-1005',
    unit: 'خط تولید ۲',
    status: 'idle',
    currentApp: 'بدون فعالیت ورودی (ایستگاه قفل شده)',
    currentAppCategory: 'زمان تلف‌شده (Idle Time)',
    shiftStartTime: '۰۷:۰۰',
    activeDurationMinutes: 0,
    todayProductivityRate: 72.4,
    todayIdleMinutes: 50,
    intensityRate: 'low',
    lastActiveTimestamp: '۲۵ دقیقه پیش',
    avatarColor: 'bg-amber-600'
  }
];

export const INITIAL_VIOLATIONS: KickidlerViolation[] = [
  {
    id: 'viol-1',
    empId: 'emp-5',
    empName: 'رضا ابراهیمی',
    empCode: 'EMP-1005',
    unit: 'خط تولید ۲',
    timestamp: '۱۰:۱۵ صبح',
    type: 'late_arrival',
    title: 'تاخیر ورود به شیفت',
    description: 'ورود با ۳۵ دقیقه تاخیر در شیفت صبح بدون هماهنگی قبلی با سرپرست مستقیم.',
    durationMinutes: 35,
    severity: 'medium',
    status: 'acknowledged'
  },
  {
    id: 'viol-2',
    empId: 'emp-5',
    empName: 'رضا ابراهیمی',
    empCode: 'EMP-1005',
    unit: 'خط تولید ۲',
    timestamp: '۱۱:۴۰ صبح',
    type: 'prolonged_idle',
    title: 'توقف ممتد و عدم حضور در ایستگاه (Idle)',
    description: 'عدم دریافت هیچ‌گونه ورودی کیبورد یا حرکت ماوس به مدت ۳۸ دقیقه در ایستگاه ثبت رکورد خط ۲.',
    durationMinutes: 38,
    severity: 'high',
    status: 'new'
  },
  {
    id: 'viol-3',
    empId: 'emp-3',
    empName: 'حسن مرادی',
    empCode: 'EMP-1003',
    unit: 'قالب‌بندی و تنظیم',
    timestamp: '۰۹:۰۵ صبح',
    type: 'unproductive_site',
    title: 'بازدید از وب‌سایت غیرمرتبط در زمان ستاپ',
    description: 'مشاهده ویدیوهای متفرقه به مدت ۲۲ دقیقه در حین زمان آماده‌سازی خط.',
    durationMinutes: 22,
    severity: 'medium',
    status: 'addressed'
  }
];
