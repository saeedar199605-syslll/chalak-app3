
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
      "strategicGuidance": "هدایت راهبردی"
    }
  ],
  "riskWarnings": []
}`;

    const parsed = await callGemini(
      env.GEMINI_API_KEY,
      prompt,
      'You are an executive talent strategist. Return structured JSON in fluent Persian.'
    );
    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({
        executiveSummary: 'توزیع کلی پرسنل در ماتریس ۹ خانه نشان‌دهنده تعادل مناسب میان شایستگی‌های رفتاری و عملکرد کمی است.',
        talentHealthScore: 85,
        boxRecommendations: [
          { boxId: 'star', boxTitle: 'ستارگان آینده', headcount: 2, strategicGuidance: 'انتصاب در پروژه‌های استراتژیک و مسیر جانشین‌پروری' },
          { boxId: 'core', boxTitle: 'سرمایه‌های کلیدی', headcount: 5, strategicGuidance: 'حفظ انگیزه و توانمندسازی مهارتی مستمر' }
        ],
        riskWarnings: ['نیاز به تدوین برنامه بهبود فردی (PIP) برای کارکنان گروه بحرانی'],
        isFallback: true
      }),
      { status: 200, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers });
