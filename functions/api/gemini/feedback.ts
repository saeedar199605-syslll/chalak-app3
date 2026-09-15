
interface Env {
  GEMINI_API_KEY?: string;
  [key: string]: any;
}

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

async function callGemini(apiKey: string | undefined, prompt: string, systemInstruction: string) {
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
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestBody = await request.json().catch(() => ({})) as any;
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

    const parsed = await callGemini(
      env.GEMINI_API_KEY,
      prompt,
      'You are an elite corporate HR feedback specialist and executive coach. Return structured JSON in fluent Persian.'
    );
    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (err) {
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
        strengths: ['تعهد حرفه‌ای به مسئولیت‌های محوله', 'رعایت استانداردهای ایمنی کارگاهی'],
        actionPlan: ['مشارکت در دوره‌های مهارتی ارتقای سرعت و کیفیت', 'ثبت پیشنهادات بهبود فرآیند در کارگاه'],
        isFallback: true
      }),
      { status: 200, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers });
