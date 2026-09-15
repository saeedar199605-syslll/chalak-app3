/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Criterion, JobProfile, Employee, Evaluation } from './types';

export const SEED_CRITERIA: Criterion[] = [
  // شاخص‌های کمی (K)
  {
    id: 'crit-k1',
    code: 'K-01',
    cat: 'K',
    name: 'تحقق برنامه تولید و راندمان',
    def: 'درصد تحقق تولید برنامه‌ریزی شده در سیستم WMS/MES',
    source: 'سیستم اطلاعات تولید MES',
    method: 'درصد تحقق برنامه',
    dir: 'more',
    scoringSource: 'mis',
    misMetricKey: 'efficiency',
    autoPopulate: true
  },
  {
    id: 'crit-k2',
    code: 'K-04',
    cat: 'K',
    name: 'نرخ ضایعات و افت کیفی',
    def: 'درصد ضایعات تولیدی نسبت به کل قطعات تولیدی',
    source: 'فرم‌های تایید QC / انبار ضایعات',
    method: 'درصد قطعات نامنطبق',
    dir: 'less',
    scoringSource: 'mis',
    misMetricKey: 'scrap_rate',
    autoPopulate: true
  },
  {
    id: 'crit-k3',
    code: 'K-06',
    cat: 'K',
    name: 'اثربخشی کلی تجهیزات (OEE)',
    def: 'شاخص OEE ثبت شده دستگاه در شیفت کاری',
    source: 'ثبت خودکار سنسورها (MES)',
    method: 'محاسبه فرمول OEE',
    dir: 'more',
    scoringSource: 'mis',
    misMetricKey: 'efficiency',
    autoPopulate: true
  },
  {
    id: 'crit-k4',
    code: 'K-07',
    cat: 'K',
    name: 'کاهش توقفات ناخواسته خط',
    def: 'مجموع ساعات توقف ثبت‌شده در شیفت کاری',
    source: 'لاگ شیفت و نگهداری تعمیرات',
    method: 'ساعت توقف ثبت‌شده',
    dir: 'less',
    scoringSource: 'mis',
    misMetricKey: 'downtime',
    autoPopulate: true
  },
  {
    id: 'crit-k5',
    code: 'K-09',
    cat: 'K',
    name: 'دقت در کنترل ابعادی و بازرسی قطعه',
    def: 'درصد شناسایی عیوب در ایستگاه قبل از ارسال به مونتاژ',
    source: 'دفتر ثبت مغایرت (QC Log)',
    method: 'ارزیابی کیفی سرپرست و کنترل کیفیت',
    dir: 'more',
    scoringSource: 'supervisor',
    autoPopulate: false
  },
  {
    id: 'crit-k6',
    code: 'K-10',
    cat: 'K',
    name: 'سرعت و بهره‌وری عملیات تست نهایی',
    def: 'تعداد قطعات بازرسی‌شده در هر ساعت استاندارد کاری',
    source: 'سیستم ثبت خروجی بازرسی',
    method: 'تعداد قطعه بر ساعت',
    dir: 'more',
    scoringSource: 'supervisor',
    autoPopulate: false
  },
  {
    id: 'crit-k7',
    code: 'K-11',
    cat: 'K',
    name: 'زمان تنظیم و قالب‌بندی (Changeover)',
    def: 'مدت زمان تعویض قالب و ستاپ خط بر اساس استاندارد SMED',
    source: 'زمان‌سنجی مهندسی صنایع',
    method: 'دقیقه صرف‌شده برای ستاپ',
    dir: 'less',
    scoringSource: 'mis',
    misMetricKey: 'downtime',
    autoPopulate: true
  },

  // شایستگی‌های کیفی (Q)
  {
    id: 'crit-q1',
    code: 'Q-01',
    cat: 'Q',
    name: 'انطباق با استانداردهای SOP کارگاهی',
    def: 'میزان رعایت گام‌به‌گام دستورالعمل‌های استاندارد عملیاتی',
    source: 'چک‌لیست مشاهده رفتار BARS',
    method: 'ارزیابی رفتار کاری توسط سرپرست',
    scoringSource: 'supervisor',
    autoPopulate: false
  },
  {
    id: 'crit-q2',
    code: 'Q-03',
    cat: 'Q',
    name: 'دقت در تکمیل فرم‌های ردیابی قطعه',
    def: 'تکمیل دقیق کارت‌های فرآیند، بچ‌نامبر و رهگیری قطعات',
    source: 'ممیزی ادواری واحد تضمین کیفیت',
    method: 'چک‌لیست عدم‌انطباق مستندات',
    scoringSource: 'supervisor',
    autoPopulate: false
  },
  {
    id: 'crit-q3',
    code: 'Q-04',
    cat: 'Q',
    name: 'دقت در کالیبراسیون و نگهداری ابزار دقیق',
    def: 'حفظ سلامت و کالیبره بودن کولیس، میکرومتر و گیج‌ها',
    source: 'بررسی واحد کالیبراسیون و ابزار دقیق',
    method: 'امتیازدهی چک‌لیست ابزار',
    scoringSource: 'supervisor',
    autoPopulate: false
  },
  {
    id: 'crit-q4',
    code: 'Q-05',
    cat: 'Q',
    name: 'نظم و آراستگی صنعتی (5S)',
    def: 'رعایت اصول پنج‌گانه آراستگی در ایستگاه کاری',
    source: 'ممیزی هفتگی HSE & 5S',
    method: 'امتیاز چک‌لیست ۵S',
    scoringSource: 'supervisor',
    autoPopulate: false
  },

  // شایستگی‌های ایمنی (S) - الزامی
  {
    id: 'crit-s1',
    code: 'S-01',
    cat: 'S',
    name: 'رعایت الزامات ایمنی و HSE کارخانه',
    def: 'استفاده مداوم از PPE و رعایت پروتکل‌های ایمنی کارخانه',
    source: 'واحد بهداشت و ایمنی HSE',
    method: 'نرخ شبه‌حادثه (HSE Incident Rate)',
    scoringSource: 'supervisor',
    autoPopulate: false
  },

  // شایستگی‌های رفتاری (B)
  {
    id: 'crit-b1',
    code: 'B-01',
    cat: 'B',
    name: 'نظم در حضور و غیاب و ثبت تردد',
    def: 'نداشتن تاخیر غیرمجاز، غیبت یا خروج زودهنگام از خط',
    source: 'سیستم ثبت تردد کسری',
    method: 'گزارش ماهانه حضور و غیاب',
    scoringSource: 'kasra',
    misMetricKey: 'attendance_delay',
    autoPopulate: true
  },
  {
    id: 'crit-b2',
    code: 'B-03',
    cat: 'B',
    name: 'همکاری تیمی و انعطاف در تعویض شیفت',
    def: 'پذیرش شیفت‌های جبرانی و هماهنگی با سایر اپراتورها',
    source: 'ثبت سرپرست شیفت',
    method: 'نمره‌دهی سرپرست شیفت',
    scoringSource: 'supervisor',
    autoPopulate: false
  },

  // رهبری و کار تیمی (L)
  {
    id: 'crit-l1',
    code: 'L-01',
    cat: 'L',
    name: 'مربیگری و انتقال تجربه به نیروهای تازه وارد',
    def: 'آموزش پرسنل جدید در ایستگاه کاری و تسهیل آشناسازی',
    source: 'فرم ارزیابی سرپرست واحد',
    method: 'چک‌لیست مربیگری و رشد پرسنل',
    scoringSource: 'supervisor',
    autoPopulate: false
  }
];

export const SEED_PROFILES: JobProfile[] = [
  {
    id: 'prof-1',
    title: 'اپراتور ارشد خط تولید',
    code: 'B1',
    family: 'مشاغل کارگاهی (تولید)',
    locked: true,
    items: [
      { cid: 'crit-k3', weight: 20 }, // اثربخشی OEE
      { cid: 'crit-k4', weight: 15 }, // کاهش توقفات
      { cid: 'crit-k2', weight: 15 }, // نرخ ضایعات
      { cid: 'crit-q1', weight: 15 }, // انطباق با SOP
      { cid: 'crit-q4', weight: 10 }, // آراستگی ۵S
      { cid: 'crit-s1', weight: 15 }, // ایمنی (HSE) - الزامی
      { cid: 'crit-b1', weight: 10 }, // نظم حضور و غیاب
    ]
  },
  {
    id: 'prof-2',
    title: 'بازرس کنترل کیفیت (QC)',
    code: 'B3',
    family: 'مشاغل کارگاهی (کیفیت)',
    locked: true,
    items: [
      { cid: 'crit-k5', weight: 25 }, // دقت در بازرسی
      { cid: 'crit-k6', weight: 15 }, // سرعت در تست
      { cid: 'crit-q1', weight: 15 }, // انطباق با SOP
      { cid: 'crit-q2', weight: 15 }, // مستندسازی ردیابی
      { cid: 'crit-s1', weight: 15 }, // ایمنی محیط کار
      { cid: 'crit-b2', weight: 15 }, // کار تیمی
    ]
  },
  {
    id: 'prof-3',
    title: 'تکنسین تنظیم و قالب‌بندی (Setup)',
    code: 'B5',
    family: 'مشاغل فنی کارگاهی',
    locked: false,
    items: [
      { cid: 'crit-k7', weight: 25 }, // سرعت تعویض قالب
      { cid: 'crit-k4', weight: 15 }, // کاهش توقفات
      { cid: 'crit-k2', weight: 10 }, // ضایعات قطعه
      { cid: 'crit-q1', weight: 15 }, // انطباق با SOP
      { cid: 'crit-q3', weight: 10 }, // نگهداری ابزار
      { cid: 'crit-s1', weight: 15 }, // ایمنی کارگاهی
      { cid: 'crit-b2', weight: 10 }, // انعطاف در شیفت
    ]
  }
];

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-admin',
    name: 'مدیر ارشد منابع انسانی',
    code: 'ADMIN-001',
    profileId: 'prof-3',
    unit: 'مدیریت سرمایه انسانی',
    role: 'admin',
    username: 'admin'
  },
  {
    id: 'emp-1',
    name: 'علی حسینی',
    code: 'EMP-1001',
    profileId: 'prof-1', // اپراتور ارشد
    unit: 'خط تولید ۱',
    role: 'supervisor',
    username: 'ali',
    supervisorId: 'emp-admin',
    approverId: 'emp-admin'
  },
  {
    id: 'emp-2',
    name: 'مریم رضایی',
    code: 'EMP-1002',
    profileId: 'prof-2', // QC
    unit: 'کنترل کیفیت',
    role: 'employee',
    username: 'maryam',
    supervisorId: 'emp-4', // سرپرست فاطمه
    approverId: 'emp-admin'
  },
  {
    id: 'emp-3',
    name: 'حسن مرادی',
    code: 'EMP-1003',
    profileId: 'prof-3', // تکنسین Setup
    unit: 'قالب‌بندی و تنظیم',
    role: 'employee',
    username: 'hassan',
    supervisorId: 'emp-1', // سرپرست علی
    approverId: 'emp-admin'
  },
  {
    id: 'emp-4',
    name: 'فاطمه اکبری',
    code: 'EMP-1004',
    profileId: 'prof-2', // کنترل کیفیت
    unit: 'کنترل کیفیت',
    role: 'supervisor',
    username: 'fatemeh',
    supervisorId: 'emp-admin',
    approverId: 'emp-admin'
  },
  {
    id: 'emp-5',
    name: 'رضا ابراهیمی',
    code: 'EMP-1005',
    profileId: 'prof-1', // اپراتور ارشد
    unit: 'خط تولید ۲',
    role: 'employee',
    username: 'reza',
    supervisorId: 'emp-1', // سرپرست علی
    approverId: 'emp-admin'
  }
];

export const SEED_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-ali-p1',
    empId: 'emp-1',
    profileId: 'prof-1',
    period: 'شش ماهه دوم ۱۴۰۲',
    status: 'locked',
    scores: [
      { cid: 'crit-k3', weight: 20, value: 3, self: 3 },
      { cid: 'crit-k4', weight: 15, value: 3, self: 3 },
      { cid: 'crit-k2', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 3, self: 4 },
      { cid: 'crit-q4', weight: 10, value: 3, self: 3 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b1', weight: 10, value: 3, self: 3 }
    ],
    note: 'دوره پایه استقرار شاخص‌ها',
    created: 1708000000000
  },
  {
    id: 'eval-ali-p2',
    empId: 'emp-1',
    profileId: 'prof-1',
    period: 'شش ماهه اول ۱۴۰۳',
    status: 'locked',
    scores: [
      { cid: 'crit-k3', weight: 20, value: 4, self: 4 },
      { cid: 'crit-k4', weight: 15, value: 4, self: 4 },
      { cid: 'crit-k2', weight: 15, value: 3, self: 4 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q4', weight: 10, value: 4, self: 4 },
      { cid: 'crit-s1', weight: 15, value: 5, self: 5, doc: 'گزارش ایمنی دوره' },
      { cid: 'crit-b1', weight: 10, value: 4, self: 4 }
    ],
    note: 'بهبود محسوس در شاخص OEE و کار تیمی',
    created: 1713000000000
  },
  {
    id: 'eval-1',
    empId: 'emp-1',
    profileId: 'prof-1',
    period: 'دوره بهار ۱۴۰۳',
    status: 'locked',
    scores: [
      { cid: 'crit-k3', weight: 20, value: 5, self: 5, doc: 'داده‌های استخراج‌شده از MES' },
      { cid: 'crit-k4', weight: 15, value: 4, self: 4, doc: 'کاهش زمان توقفات' },
      { cid: 'crit-k2', weight: 15, value: 4, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q4', weight: 10, value: 5, self: 5, doc: 'چک‌لیست ۵S واحد بهداشت' },
      { cid: 'crit-s1', weight: 15, value: 5, self: 5, doc: 'تقدیرنامه ایمنی بدون حادثه' },
      { cid: 'crit-b1', weight: 10, value: 4, self: 4 }
    ],
    note: 'همکاری بسیار مؤثر در شیفت‌های شب و کاهش توقفات خط.',
    aiFeedback: {
      strengths: [
        'تسلط بالا بر استانداردهای ۵S کارگاهی',
        'تعهد کامل به رعایت پروتکل‌های ایمنی فردی (HSE)',
        'عملکرد عالی در تثبیت OEE ماشین‌آلات'
      ],
      developmentAreas: [
        'بهبود مستندسازی دلایل توقفات جزئی',
        'مشارکت بیشتر در انتقال تجربیات فنی به پرسنل جدید'
      ],
      actionItems: [
        'شرکت در دوره تخصصی نگهداری و تعمیرات پیشگیرانه (PM)',
        'تدوین راهنمای رفع عیوب متداول خط ۱ برای تیم شیفت',
        'ثبت بازخورد ماهانه در سامانه ردیابی'
      ],
      summary: 'عملکرد علی حسینی در دوره بهار ۱۴۰۳ با ثبات و شاخص‌های کیفی بالا همراه بوده است.'
    },
    created: 1718000000000
  },
  {
    id: 'eval-maryam-p1',
    empId: 'emp-2',
    profileId: 'prof-2',
    period: 'شش ماهه دوم ۱۴۰۲',
    status: 'locked',
    scores: [
      { cid: 'crit-k5', weight: 25, value: 2, self: 3, doc: 'گزارش بازرسی اولیه' },
      { cid: 'crit-k6', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q2', weight: 15, value: 2, self: 3, doc: 'نقص مستندسازی اولیه' },
      { cid: 'crit-s1', weight: 15, value: 3, self: 4 },
      { cid: 'crit-b2', weight: 15, value: 3, self: 3 }
    ],
    note: 'دوره آغاز فعالیت در واحد QC',
    created: 1708100000000
  },
  {
    id: 'eval-maryam-p2',
    empId: 'emp-2',
    profileId: 'prof-2',
    period: 'شش ماهه اول ۱۴۰۳',
    status: 'locked',
    scores: [
      { cid: 'crit-k5', weight: 25, value: 3, self: 3 },
      { cid: 'crit-k6', weight: 15, value: 3, self: 4 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q2', weight: 15, value: 3, self: 3 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b2', weight: 15, value: 3, self: 4 }
    ],
    note: 'تثبیت کیفیت بازرسی و یادگیری ابزارهای جدید',
    created: 1713100000000
  },
  {
    id: 'eval-2',
    empId: 'emp-2',
    profileId: 'prof-2',
    period: 'دوره بهار ۱۴۰۳',
    status: 'calibrated',
    scores: [
      { cid: 'crit-k5', weight: 25, value: 4, self: 4 },
      { cid: 'crit-k6', weight: 15, value: 4, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q2', weight: 15, value: 4, self: 4 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b2', weight: 15, value: 4, self: 4 }
    ],
    note: 'دقت بازرسی بسیار خوب، پیشنهاد حضور در دوره ابزار دقیق پیشرفته.',
    aiFeedback: {
      strengths: [
        'دقت بالا در ثبت داده‌های آزمایشگاهی',
        'سرعت انطباق با دستورالعمل‌های جدید کنترل کیفی',
        'انضباط در ثبت اسناد عدم انطباق قطعات'
      ],
      developmentAreas: [
        'افزایش سرعت در تحلیل داده‌های ابعاد بحرانی',
        'تقویت مهارت‌های حل مسئله سیستماتیک (RCA)'
      ],
      actionItems: [
        'گذراندن کارگاه ابزارهای هفتگانه کیفیت (7QC Tools)',
        'مشارکت فعال در جلسات ریشه‌یابی ضایعات خط مونتاژ'
      ],
      summary: 'مریم رضایی روند رو به رشدی را در ثبت عیوب و پایش کیفیت نشان داده است.'
    },
    created: 1718100000000
  },
  {
    id: 'eval-hassan-p1',
    empId: 'emp-3',
    profileId: 'prof-3',
    period: 'شش ماهه دوم ۱۴۰۲',
    status: 'locked',
    scores: [
      { cid: 'crit-k7', weight: 25, value: 2, self: 2, doc: 'زمان‌سنجی اولیه' },
      { cid: 'crit-k4', weight: 15, value: 2, self: 3, doc: 'توقف به دلیل طولانی بودن ستاپ' },
      { cid: 'crit-k2', weight: 10, value: 3, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q3', weight: 10, value: 2, self: 3, doc: 'ساییدگی ابزار' },
      { cid: 'crit-s1', weight: 15, value: 3, self: 3 },
      { cid: 'crit-b2', weight: 10, value: 3, self: 3 }
    ],
    note: 'نیاز به آموزش استانداردسازی زمان تعویض قالب (SMED)',
    created: 1708200000000
  },
  {
    id: 'eval-hassan-p2',
    empId: 'emp-3',
    profileId: 'prof-3',
    period: 'شش ماهه اول ۱۴۰۳',
    status: 'locked',
    scores: [
      { cid: 'crit-k7', weight: 25, value: 3, self: 3 },
      { cid: 'crit-k4', weight: 15, value: 3, self: 3 },
      { cid: 'crit-k2', weight: 10, value: 3, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q3', weight: 10, value: 3, self: 4 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b2', weight: 10, value: 4, self: 4 }
    ],
    note: 'کاهش ۲۰ درصدی زمان تعویض قالب و مشارکت مثبت در شیفت',
    created: 1713200000000
  },
  {
    id: 'emp-3-eval',
    empId: 'emp-3',
    profileId: 'prof-3',
    period: 'دوره بهار ۱۴۰۳',
    status: 'calibrated',
    scores: [
      { cid: 'crit-k7', weight: 25, value: 4, self: 4 },
      { cid: 'crit-k4', weight: 15, value: 4, self: 4 },
      { cid: 'crit-k2', weight: 10, value: 4, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q3', weight: 10, value: 4, self: 4 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b2', weight: 10, value: 4, self: 4 }
    ],
    note: 'پیشرفت چشمگیر در کاهش زمان ستاپ با تکنیک SMED.',
    aiFeedback: {
      strengths: [
        'تسریع در فرآیند آماده‌سازی قالب (تکنیک SMED)',
        'توجه ویژه به سلامت و نگهداری ابزارهای برشی',
        'همکاری فعال با تیم فنی و نگهداری خط'
      ],
      developmentAreas: [
        'استانداردسازی چک‌لیست تحویل دستگاه CNC',
        'مشارکت در جلسات تحلیل شکست ابزار'
      ],
      actionItems: [
        'مستندسازی مراحل تعویض سریع قالب در ۵ مرحله کلیدی',
        'برگزاری جلسه انتقال تجربه با اپراتورهای شیفت بعدی'
      ],
      summary: 'حسن مرادی یکی از نیروهای با انگیزه و رو به رشد در حوزه تنظیم و نگهداری تجهیزات کارگاهی است.'
    },
    created: 1718200000000
  },
  {
    id: 'eval-fatemeh-1',
    empId: 'emp-4',
    profileId: 'prof-2',
    period: 'دوره بهار ۱۴۰۳',
    status: 'locked',
    scores: [
      { cid: 'crit-k5', weight: 25, value: 5, self: 5, doc: 'ثبت بدون خطای گزارش ممیزی' },
      { cid: 'crit-k6', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q1', weight: 15, value: 5, self: 5, doc: 'تدوین دستورالعمل جدید بازرسی' },
      { cid: 'crit-q2', weight: 15, value: 5, self: 5, doc: 'نظم عالی در آرشیو QC' },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b2', weight: 15, value: 5, self: 5, doc: 'مدیریت بحران عدم‌انطباق عمده' }
    ],
    note: 'عملکرد سرپرستی نمونه و پیگیری مؤثر اصلاحی.',
    created: 1718300000000
  },
  {
    id: 'eval-reza-1',
    empId: 'emp-5',
    profileId: 'prof-1',
    period: 'دوره بهار ۱۴۰۳',
    status: 'draft',
    scores: [
      { cid: 'crit-k3', weight: 20, value: 3, self: 3 },
      { cid: 'crit-k4', weight: 15, value: 3, self: 4 },
      { cid: 'crit-k2', weight: 15, value: 3, self: 3 },
      { cid: 'crit-q1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-q4', weight: 10, value: 3, self: 3 },
      { cid: 'crit-s1', weight: 15, value: 4, self: 4 },
      { cid: 'crit-b1', weight: 10, value: 3, self: 4 }
    ],
    note: 'در انتظار تکمیل خودارزیابی و ثبت شواهد سرپرست.',
    created: 1718400000000
  }
];
