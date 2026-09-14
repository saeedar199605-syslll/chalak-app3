import {
  AuthSession,
  CloudflareEnv,
  getCookie,
  hashPassword,
  jsonResponse,
  normalizeUsername,
  SESSION_COOKIE,
  sessionCookie,
  verifyPassword,
} from '../../../cloudflare/auth';

interface Context {
  request: Request;
  env: CloudflareEnv;
  data: { session?: AuthSession };
}

type EmployeeRecord = { id: string; username?: string };

export async function onRequestPost({ request, env, data }: Context): Promise<Response> {
  if (data.session?.role !== 'admin') return jsonResponse({ error: 'Admin access required.' }, 403);
  let body: { action?: unknown; username?: unknown; password?: unknown; currentPassword?: unknown };
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'درخواست نامعتبر است.' }, 400); }

  if (body.action === 'reset_all') {
    const raw = await env.CHALAK_DB.get('app_state');
    const state = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const employees = Array.isArray(state.pe_employees) ? state.pe_employees as EmployeeRecord[] : [];
    await Promise.all(employees.map(employee => normalizeUsername(employee.username)).filter(username => username && username !== 'admin').map(username => env.CHALAK_DB.delete(`credential:${username}`)));
    return jsonResponse({ success: true });
  }

  const username = normalizeUsername(body.username);
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  const minimumLength = username === 'admin' ? 12 : 8;
  if (!username || password.length < minimumLength || password.length > 256) {
    return jsonResponse({ error: `کلمه عبور باید بین ${minimumLength} تا ۲۵۶ نویسه باشد.` }, 400);
  }

  if (username === 'admin') {
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const stored = await env.CHALAK_DB.get('credential:admin');
    const currentValid = stored ? await verifyPassword(currentPassword, stored) : currentPassword === env.ADMIN_PASSWORD;
    if (!currentValid) return jsonResponse({ error: 'کلمه عبور فعلی مدیریت نادرست است.' }, 401);
  }

  await env.CHALAK_DB.put(`credential:${username}`, await hashPassword(password));
  if (username === 'admin') {
    const token = getCookie(request, SESSION_COOKIE);
    if (token) await env.CHALAK_DB.delete(`session:${token}`);
    return jsonResponse({ success: true }, 200, { 'Set-Cookie': sessionCookie('', 0, new URL(request.url).protocol === 'https:') });
  }
  return jsonResponse({ success: true });
}

export async function onRequestDelete({ request, env, data }: Context): Promise<Response> {
  if (data.session?.role !== 'admin') return jsonResponse({ error: 'Admin access required.' }, 403);
  let body: { username?: unknown };
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'درخواست نامعتبر است.' }, 400); }
  const username = normalizeUsername(body.username);
  if (!username || username === 'admin') return jsonResponse({ error: 'حساب مورد نظر قابل بازنشانی نیست.' }, 400);
  await env.CHALAK_DB.delete(`credential:${username}`);
  return jsonResponse({ success: true });
}
