/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CalendarWorkflowEvent {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  allDay?: boolean;
}

function formatICSDate(dateStr: string, isAllDay: boolean = true): string {
  const clean = dateStr.replace(/-/g, '');
  if (isAllDay) {
    return clean;
  }
  return `${clean}T083000Z`;
}

export function generateICSContent(events: CalendarWorkflowEvent[]): string {
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chalak Performance Management//Workflow Deadlines//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:تقویم مواعد ارزیابی عملکرد اصفهان چالاک',
    'X-WR-TIMEZONE:Asia/Tehran',
    'X-WR-CALDESC:مواعد قانونی فرآیند ارزیابی عملکرد و مربیگری کارکنان'
  ];

  events.forEach(evt => {
    const startFormatted = formatICSDate(evt.startDate, evt.allDay !== false);
    const endFormatted = formatICSDate(evt.endDate, evt.allDay !== false);
    ics.push(
      'BEGIN:VEVENT',
      `UID:${evt.id}-${nowStr}@chalak-performance.local`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${startFormatted}`,
      `DTEND;VALUE=DATE:${endFormatted}`,
      `SUMMARY:${evt.title.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${evt.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`,
      evt.location ? `LOCATION:${evt.location.replace(/,/g, '\\,')}` : 'LOCATION:کارخانه اصفهان چالاک',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:یادآوری موعد ارزیابی عملکرد: ${evt.title}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

export function downloadWorkflowCalendarICS(events: CalendarWorkflowEvent[], filename = 'chalak_evaluation_deadlines.ics') {
  const content = generateICSContent(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const DEFAULT_WORKFLOW_DEADLINES: CalendarWorkflowEvent[] = [
  {
    id: 'step-1-goal-setting',
    title: 'گام ۱: هدف‌گذاری و ابلاغ شاخص‌های ارزیابی',
    description: 'ابلاغ اهداف تولید و شایستگی‌های رفتاری به کلیه خطوط و واحدها',
    startDate: '2026-08-25',
    endDate: '2026-08-28',
    location: 'سالن جلسات اصفهان چالاک'
  },
  {
    id: 'step-2-self-eval',
    title: 'گام ۲: پایان مهلت خودارزیابی پرسنل',
    description: 'تکمیل فرم‌های خودارزیابی توسط پرسنل در سامانه دیجیتال',
    startDate: '2026-09-01',
    endDate: '2026-09-06',
    location: 'سامانه ابری ارزیابی'
  },
  {
    id: 'step-3-supervisor-review',
    title: 'گام ۳: مهلت نهایی ارزیابی سرپرستان مستقیم',
    description: 'ثبت نمرات ارزیابی عملکرد توسط سرپرستان به همراه شواهد عینی',
    startDate: '2026-09-07',
    endDate: '2026-09-14',
    location: 'کارگاه‌های تولیدی و ستاد'
  },
  {
    id: 'step-4-coaching-meeting',
    title: 'گام ۴: جلسات بازخورد مربیگری و برنامه توسعه فردی',
    description: 'گفتگوی دوطرفه سرپرست و همکار و تنظیم برنامه توسعه فردی (IDP)',
    startDate: '2026-09-15',
    endDate: '2026-09-22',
    location: 'دفاتر سرپرستی کارگاه'
  },
  {
    id: 'step-5-calibration-committee',
    title: 'گام ۵: جلسه کمیته کالیبراسیون سازمانی',
    description: 'بررسی توزیع نرمال نمرات و حذف سوگیری‌ها توسط مدیران ارشد',
    startDate: '2026-09-23',
    endDate: '2026-09-26',
    location: 'سالن کنفرانس هلدینگ'
  },
  {
    id: 'step-6-final-announcement',
    title: 'گام ۶: تصویب نهایی نتایج و اتصال به پاداش عملکرد',
    description: 'قفل نتایج دوره و ارسال لیست پاداش بهره‌وری به واحد مالی',
    startDate: '2026-09-27',
    endDate: '2026-09-30',
    location: 'مدیریت سرمایه انسانی'
  }
];
