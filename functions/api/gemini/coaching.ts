
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
  const { employeeName, jobTitle, period, scores, note } = requestBody;

  try {
    const prompt = `شما یک مشاور ارشد توسعه فردی (IDP) در هلدینگ صنعتی هستید.
اطلاعات ارزیابی همکار:
- نام همکار: ${employeeName || 'همکار'}
- شغل: ${jobTitle || 'پرسنل'}
- دوره: ${period || 'دوره جاری'}
- نمرات شاخص‌ها:
${(scores || []).map((s: any) => `- [${s.code || ''}] ${s.name || ''}: نمره ${s.value || 3} (خودارزیابی: ${s.self || 3})`).join('\n')}
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

    const parsed = await callGemini(
      env.GEMINI_API_KEY,
      prompt,
      'You are an executive HR coach. Return structured JSON in fluent Persian.'
    );
    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({
        feedback: {
          strengths: ['انضباط عملیاتی و تعهد به وظایف محوله', 'توجه به استانداردهای کیفیت و ضوابط ایمنی'],
          developmentAreas: ['بهینه‌سازی زمان چرخه‌های کاری', 'مشارکت در جلسات تحلیل ریشه‌ای عیوب'],
          actionItems: ['تنظیم برنامه مربیگری با سرپرست مستقیم', 'گذراندن دوره بازآموزی فرآیندهای فنی', 'ارائه گزارش هفتگی وضعیت شاخص‌ها'],
          summary: `بررسی نتایج همکار گرامی ${employeeName || ''} بیانگر پایبندی به اهداف کلیدی کارگاه است. اجرای اقدامات توسعه‌ای پیشنهادی به تحقق بهره‌وری پایدار کمک شایانی خواهد نمود.`
        },
        isFallback: true
      }),
      { status: 200, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers });
