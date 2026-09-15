
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

    const parsed = await callGemini(
      env.GEMINI_API_KEY,
      prompt,
      'You are an HR Bias & Ethics auditor. Return structured JSON in fluent Persian.'
    );
    return new Response(JSON.stringify(parsed), { status: 200, headers });
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
      { status: 200, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { status: 204, headers });
