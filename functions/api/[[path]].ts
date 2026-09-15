/**
 * Cloudflare Pages Functions Unified Edge Handler for /api/*
 * Fully powers:
 * - Real-time state persistence across all users via Cloudflare KV (CHALAK_DB)
 * - Lightweight version polling for multi-device instant synchronization
 * - Gemini AI Endpoints (Feedback, Coaching IDP, Bias Auditing, 9-Box Analysis)
 * - Safe fallback responses when offline or without Gemini API key
 */

interface Env {
  CHALAK_DB?: any; // Cloudflare KV Namespace
  GEMINI_API_KEY?: string;
  [key: string]: any;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

// Prototype pollution sanitizer
function sanitizePayload(raw: any): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = val;
  }
  return clean;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = (params.path as string[] || []).join('/');

  // Standard CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const KV = env.CHALAK_DB || env.KV || env.DB || env.CHALAK_PERFORMANCE_KV || env.DATABASE;

  // 1. Health Probe
  if (path === 'health' || url.pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        runtime: 'cloudflare-pages',
        hasKV: !!KV,
        hasGeminiKey: !!env.GEMINI_API_KEY,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // 2. State Sync & Real-time Synchronization Endpoints
  if (path === 'state' || url.pathname === '/api/state') {
    // A. GET: retrieve state or version
    if (request.method === 'GET') {
      const isVersionOnly = url.searchParams.get('version_only') === 'true';

      if (!KV) {
        // Fallback if KV not bound yet
        return new Response(
          JSON.stringify(isVersionOnly ? { version: 0, updatedAt: new Date().toISOString(), fallback: true } : {}),
          { status: 200, headers: corsHeaders }
        );
      }

      if (isVersionOnly) {
        const versionStr = await KV.get('app_state_version');
        const version = versionStr ? Number(versionStr) : 0;
        const updatedAtStr = await KV.get('app_state_updated_at');
        return new Response(
          JSON.stringify({ version, updatedAt: updatedAtStr || new Date().toISOString() }),
          { status: 200, headers: corsHeaders }
        );
      }

      const [data, versionStr, updatedAtStr] = await Promise.all([
        KV.get('app_state'),
        KV.get('app_state_version'),
        KV.get('app_state_updated_at')
      ]);

      if (!data) {
        return new Response('{}', { status: 200, headers: corsHeaders });
      }

      // If data is stored, inject version headers
      const responseHeaders = {
        ...corsHeaders,
        'X-App-Version': versionStr || '1',
        'X-App-Updated-At': updatedAtStr || new Date().toISOString(),
      };

      return new Response(data, { status: 200, headers: responseHeaders });
    }

    // B. POST: persist state and broadcast new version with anti-wipe protection
    if (request.method === 'POST') {
      const rawText = await request.text();
      const now = Date.now();
      const nowIso = new Date().toISOString();

      if (!KV) {
        // Fallback notice if KV binding isn't linked yet
        return new Response(
          JSON.stringify({ success: true, version: now, fallback: 'client_storage', warning: 'KV_BINDING_MISSING', updatedAt: nowIso }),
          { status: 200, headers: corsHeaders }
        );
      }

      try {
        const parsed = JSON.parse(rawText);
        const sanitized = sanitizePayload(parsed);

        // Fetch existing state to prevent accidental wiping of evaluations by uninitialized clients
        const existingData = await KV.get('app_state');
        if (existingData) {
          try {
            const existingState = JSON.parse(existingData);
            // Protect evaluations: if existing state has evaluations and incoming payload has empty evaluations, merge!
            if (Array.isArray(existingState['pe_evaluations']) && existingState['pe_evaluations'].length > 0) {
              const incomingEvals = Array.isArray(sanitized['pe_evaluations']) ? sanitized['pe_evaluations'] : [];
              if (incomingEvals.length === 0) {
                sanitized['pe_evaluations'] = existingState['pe_evaluations'];
              } else {
                const evalMap = new Map();
                for (const ev of existingState['pe_evaluations']) {
                  const k = `${ev.empId || ev.id}_${ev.period || ''}`;
                  evalMap.set(k, ev);
                }
                for (const ev of incomingEvals) {
                  const k = `${ev.empId || ev.id}_${ev.period || ''}`;
                  evalMap.set(k, ev);
                }
                sanitized['pe_evaluations'] = Array.from(evalMap.values());
              }
            }

            // Protect employees: never wipe existing employees with empty list
            if (Array.isArray(existingState['pe_employees']) && existingState['pe_employees'].length > 0) {
              const incomingEmps = Array.isArray(sanitized['pe_employees']) ? sanitized['pe_employees'] : [];
              if (incomingEmps.length === 0) {
                sanitized['pe_employees'] = existingState['pe_employees'];
              }
            }
          } catch (mergeErr) {
            console.warn('State merge warning:', mergeErr);
          }
        }

        const payloadString = JSON.stringify(sanitized);

        await Promise.all([
          KV.put('app_state', payloadString),
          KV.put('app_state_version', String(now)),
          KV.put('app_state_updated_at', nowIso),
        ]);

        return new Response(
          JSON.stringify({ success: true, version: now, updatedAt: nowIso }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
          { status: 400, headers: corsHeaders }
        );
      }
    }
  }

  // 3. Gemini AI Endpoints
  if (path.startsWith('gemini/')) {
    const apiKey = env.GEMINI_API_KEY;

    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }

    // Helper for calling Gemini API
    const callGeminiAPI = async (prompt: string, systemInstruction: string) => {
      if (!apiKey) throw new Error('NO_API_KEY');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
      }

      const resData = await response.json() as any;
      const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');
      return JSON.parse(text.trim());
    };

    // A. Feedback Assistant
    if (path === 'gemini/feedback') {
      const { employeeName, jobTitle, supervisorComment, competencyScores, targetRole } = requestBody;

      try {
        const prompt = `شما یک مشاور ارشد ارزیابی عملکرد و مربیگری منابع انسانی در کارخانه صنعتی اصفهان چالاک هستید.
نظر سرپرست در مورد همکار:
- نام همکار: ${employeeName || 'همکار گرامی'}
- عنوان شغلی: ${jobTitle || 'پرسنل تولید/فنی'}
- هدف: ${targetRole || 'ارتقا و بهبود عملکرد'}
- متن اولیه سرپرست: "${supervisorComment || 'عملکرد عمومی خوب است.'}"
- نمرات شایستگی:
  * کمی (K): ${competencyScores?.K || '3.5'}
  * کیفی (Q): ${competencyScores?.Q || '4.0'}
  * رفتاری (B): ${competencyScores?.B || '3.8'}
  * ایمنی و HSE (S): ${competencyScores?.S || '4.5'}
  * رهبری و تیمی (L): ${competencyScores?.L || '3.2'}

خروجی دقیق در قالب JSON با ساختار زیر بازگردانید:
{
  "refinedComment": "متن رسمی، سازنده و مربی‌گرایانه بازنویسی‌شده",
  "competencyFeedback": {
    "quantitative": "نکته مربیگری عملکرد کمی (K)",
    "quality": "نکته شایستگی کیفی (Q)",
    "behavioral": "نکته شایستگی رفتاری (B)",
    "safetyHse": "نکته ایمنی و HSE (S)",
    "leadershipTeam": "نکته کار تیمی و رهبری (L)"
  },
  "strengths": ["نقطه قوت ۱", "نقطه قوت ۲"],
  "actionPlan": ["اقدام عملی ۱", "اقدام عملی ۲"]
}`;

        const parsed = await callGeminiAPI(
          prompt,
          'You are an elite corporate HR feedback specialist and executive coach. Return structured JSON in fluent Persian.'
        );
        return new Response(JSON.stringify(parsed), { status: 200, headers: corsHeaders });
      } catch (err: any) {
        // High quality fallback
        const comment = supervisorComment || 'عملکرد رضایت‌بخش و متعهدانه در طول دوره ارزیابی.';
        return new Response(
          JSON.stringify({
            refinedComment: `${comment} - همکار با رعایت دقیق اصول کاری و استانداردهای تعیین‌شده عملکرد مؤثری داشته است. پیشنهاد می‌شود با استمرار در خودارزیابی و مشارکت در حل مسائل کارگاهی، این روند ارتقا یابد.`,
            competencyFeedback: {
              quantitative: 'دقت در ثبت رکوردهای تولیدی و حفظ نرخ بهره‌وری پایدار.',
              quality: 'پایبندی به دستورالعمل‌های کنترل کیفیت و کاهش ضایعات.',
              behavioral: 'نظم در تردد و هماهنگی مثبت با سایر اعضای شیفت.',
              safetyHse: 'رعایت همیشگی تجهیزات حفاظت فردی (PPE) و حفظ ایمنی محیط کار.',
              leadershipTeam: 'روحیه همکاری مؤثر در پیشبرد اهداف واحد.'
            },
            strengths: [
              'تعهد حرفه‌ای به مسئولیت‌های محوله',
              'رعایت استانداردهای ایمنی کارگاهی'
            ],
            actionPlan: [
              'مشارکت در دوره‌های مهارتی ارتقای سرعت و کیفیت',
              'ثبت پیشنهادات بهبود فرآیند در کارگاه'
            ],
            isFallback: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // B. Coaching & IDP
    if (path === 'gemini/coaching') {
      const { employeeName, jobTitle, period, scores, note } = requestBody;

      try {
        const prompt = `شما یک مشاور ارشد توسعه فردی (IDP) در هلدینگ صنعتی هستید.
اطلاعات ارزیابی همکار:
- نام همکار: ${employeeName || 'همکار'}
- شغل: ${jobTitle || 'پرسنل'}
- دوره: ${period || 'دوره جاری'}
- نمرات شاخص‌ها:
${(scores || []).map((s: any) => `- [${s.code || ''}] ${s.name || ''}: نمره ${s.value || 3} (خودارزیابی: ${s.self || 3})`).join('
')}
- یادداشت گفتگو: "${note || ''}"

خروجی دقیق در قالب JSON با ساختار زیر:
{
  "feedback": {
    "strengths": ["نقطه قوت ۱", "نقطه قوت ۲"],
    "developmentAreas": ["محور توسعه ۱", "محور توسعه ۲"],
    "actionItems": ["اقدام عملی مشخص ۱", "اقدام عملی مشخص ۲", "اقدام عملی مشخص ۳"],
    "summary": "خلاصه بازخورد مربیگری"
  }
}`;

        const parsed = await callGeminiAPI(
          prompt,
          'You are an executive HR coach. Return structured JSON in fluent Persian.'
        );
        return new Response(JSON.stringify(parsed), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({
            feedback: {
              strengths: [
                'انضباط عملیاتی و تعهد به وظایف محوله',
                'توجه به استانداردهای کیفیت و ضوابط ایمنی'
              ],
              developmentAreas: [
                'بهینه‌سازی زمان چرخه‌های کاری',
                'مشارکت در جلسات تحلیل ریشه‌ای عیوب'
              ],
              actionItems: [
                'تنظیم برنامه مربیگری با سرپرست مستقیم',
                'گذراندن دوره بازآموزی فرآیندهای فنی',
                'ارائه گزارش هفتگی وضعیت شاخص‌ها'
              ],
              summary: `بررسی نتایج همکار گرامی ${employeeName || ''} بیانگر پایبندی به اهداف کلیدی کارگاه است. اجرای اقدامات توسعه‌ای پیشنهادی به تحقق بهره‌وری پایدار کمک شایانی خواهد نمود.`
            },
            isFallback: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // C. Bias & Tone Check
    if (path === 'gemini/bias-check') {
      const { employeeName, jobTitle, note, scores } = requestBody;

      try {
        const prompt = `شما بازرس اخلاق و عدالت ارزیابی عملکرد هستید. متن ارزیابی را از نظر سوگیری‌های شناختی (اثر هاله‌ای/شاخ، تعصب تجدید، لحن تند یا بدون شواهد) بررسی کنید.
نام: ${employeeName} | شغل: ${jobTitle}
متن ارزیاب: "${note || ''}"
نمرات: ${(scores || []).map((s: any) => `${s.name || s.code}: ${s.value}`).join(', ')}

خروجی JSON:
{
  "integrityScore": 88,
  "hasWarnings": false,
  "biasesDetected": [],
  "suggestedRevision": "متن اصلاح‌شده و منصفانه",
  "coachingAdvice": "توصیه به ارزیاب"
}`;

        const parsed = await callGeminiAPI(
          prompt,
          'You are an HR Bias & Ethics auditor. Return structured JSON in fluent Persian.'
        );
        return new Response(JSON.stringify(parsed), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({
            integrityScore: 90,
            hasWarnings: false,
            biasesDetected: [],
            suggestedRevision: note || 'ارزیابی بر پایه شواهد عملیاتی مستند و منصفانه انجام گرفته است.',
            coachingAdvice: 'پیشنهاد می‌شود در بازخوردهای آتی همواره شواهد کمی و مثال‌های رفتاری عینی قید گردد.',
            isFallback: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // D. 9-Box Matrix Deep Analysis
    if (path === 'gemini/nine-box-analysis') {
      const { boxesSummary, totalHeadcount, period } = requestBody;

      try {
        const prompt = `شما مدیر ارشد استعدادها در هلدینگ صنعتی هستید. ماتریس ۹ خانه استعداد زیر را تحلیل کنید:
تعداد کل ارزیابی‌شدگان: ${totalHeadcount || 0}
خلاصه خانه‌ها: ${JSON.stringify(boxesSummary || [])}

خروجی JSON:
{
  "executiveSummary": "تحلیل راهبردی کلان توزیع استعدادها",
  "talentHealthScore": 86,
  "boxRecommendations": [
    {
      "boxId": "star",
      "boxTitle": "ستارگان آینده",
      "headcount": 2,
      "strategicGuidance": "هدایت راهبردی",
      "individualCoachingTips": ["نکته ۱", "نکته ۲"],
      "recommendedActions": ["اقدام ۱"]
    }
  ],
  "successionAndRetention": ["برنامه جانشین‌پروری و نگهداشت ۱"],
  "riskInterventions": ["مداخله کاهش ریسک ۱"]
}`;

        const parsed = await callGeminiAPI(
          prompt,
          'You are a Talent Management Director. Return structured JSON in fluent Persian.'
        );
        return new Response(JSON.stringify(parsed), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({
            executiveSummary: "توزیع استعدادهای سازمانی بر مبنای عملکرد و پتانسیل رشد نشان‌دهنده تعادل مناسب میان نیروهای کلیدی و نیروهای در حال توسعه است. تمرکز بر جانشین‌پروری و مدیریت عملکرد افراد در معرض ریسک ضروری است.",
            talentHealthScore: 84,
            boxRecommendations: [
              {
                boxId: "star",
                boxTitle: "ستارگان آینده",
                headcount: 2,
                strategicGuidance: "نگهداشت و توانمندسازی از طریق پروژه‌های تحول‌گرا و ارتقای مسئولیت‌ها.",
                individualCoachingTips: ["مشارکت در جلسات تصمیم‌گیری راهبردی", "پذیرش نقش منتور برای سایر همکاران"],
                recommendedActions: ["تدوین بسته انگیزشی ویژه", "قراردادن در اولویت نخست ارتقا"]
              },
              {
                boxId: "high_potential",
                boxTitle: "ستاره رشد",
                headcount: 3,
                strategicGuidance: "تثبیت مهارتی و افزایش عمق تخصصی در ایستگاه‌های کاری.",
                individualCoachingTips: ["تعریف شاخص‌های کمی دقیق‌تر", "شرکت در کارگاه‌های مهارت‌های سرپرستی"],
                recommendedActions: ["طراحی مسیر شغلی افقی و عمودی"]
              },
              {
                boxId: "core",
                boxTitle: "ستون‌های عملکرد",
                headcount: 4,
                strategicGuidance: "قدردانی منظم و ایجاد انگیزه برای حفظ استانداردهای باکیفیت.",
                individualCoachingTips: ["ایجاد تنوع در وظایف روزمره", "مشارکت در فرآیند بهبود ۵S"],
                recommendedActions: ["حفظ تعادل حجم کاری و تقدیر ادواری"]
              },
              {
                boxId: "underperformer",
                boxTitle: "افراد نیازمند بهبود",
                headcount: 1,
                strategicGuidance: "اجرای برنامه مدون بهبود عملکرد (PIP) با جلسات هفتگی رصد پیشرفت.",
                individualCoachingTips: ["آموزش فردبه‌فرد دستورالعمل‌های کارگاهی", "بررسی موانع انگیزش و ابزار"],
                recommendedActions: ["برگزاری جلسه شفاف‌سازی انتظارات", "تعیین مهلت ۴۵ روزه بررسی مجدد"]
              }
            ],
            successionAndRetention: [
              "شناسایی ۳ نفر به عنوان ذخیره سرپرستی ایستگاه‌های بحرانی",
              "برگزاری کارگاه‌های انتقال دانش میان پرسنل ارشد و نیروهای جوان"
            ],
            riskInterventions: [
              "اجرای برنامه بهبود عملکرد (PIP) برای افراد با نمره زیر حد استاندارد",
              "بررسی دلایل ریشه‌ای افت بازدهی در شیفت‌های عصرگاهی"
            ],
            isFallback: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }
  }

  // 4. Fallback 404 for unknown API paths
  return new Response(
    JSON.stringify({ error: 'Endpoint not found', path }),
    { status: 404, headers: corsHeaders }
  );
};
