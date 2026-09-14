// functions/api/state.ts
// این تابع وظیفه ذخیره و بازیابی اطلاعات ارزیابی عملکرد و کاربران را در Cloudflare KV بر عهده دارد

interface Env {
  CHALAK_KV: KVNamespace; // مطمئن شوید این بایندینگ در فایل wrangler.toml تنظیم شده باشد
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // در نسخه واقعی، شناسه کاربر باید از طریق توکن Auth (مثلا JWT) استخراج شود
    // فعلا برای تست فرض می‌کنیم از هدر یا کوکی دریافت می‌شود
    const userId = context.request.headers.get("x-user-id") || "default-user";
    
    const data = await context.env.CHALAK_KV.get(`user_state_${userId}`);

    if (!data) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(data, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error loading state" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const userId = context.request.headers.get("x-user-id") || "default-user";
    const body = await context.request.text();

    // ذخیره کل استیت یا داده‌های کاربر در دیتابیس ابری
    await context.env.CHALAK_KV.put(`user_state_${userId}`, body);

    return new Response(JSON.stringify({ success: true, message: "State synced successfully" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error saving state" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};
