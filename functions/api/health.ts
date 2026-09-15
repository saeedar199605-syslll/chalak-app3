interface Env {
  CHALAK_DB?: any;
  KV?: any;
  DB?: any;
  GEMINI_API_KEY?: string;
  [key: string]: any;
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const KV = env.CHALAK_DB || env.KV || env.DB || env.CHALAK_PERFORMANCE_KV || env.DATABASE;
  return new Response(
    JSON.stringify({
      status: 'ok',
      runtime: 'cloudflare-pages',
      hasKV: !!KV,
      hasGeminiKey: !!env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    }
  );
};
