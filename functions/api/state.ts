interface Env {
  CHALAK_DB?: any;
  KV?: any;
  DB?: any;
  CHALAK_PERFORMANCE_KV?: any;
  DATABASE?: any;
  [key: string]: any;
}

function sanitizePayload(raw: any): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = val;
  }
  return clean;
}

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma'
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const KV = env.CHALAK_DB || env.KV || env.DB || env.CHALAK_PERFORMANCE_KV || env.DATABASE;
  const url = new URL(request.url);
  const isVersionOnly = url.searchParams.get('version_only') === 'true';

  if (!KV) {
    return new Response(
      JSON.stringify(isVersionOnly ? { version: 0, updatedAt: new Date().toISOString(), fallback: true } : {}),
      { status: 200, headers }
    );
  }

  if (isVersionOnly) {
    const versionStr = await KV.get('app_state_version');
    const version = versionStr ? Number(versionStr) : 0;
    const updatedAtStr = await KV.get('app_state_updated_at');
    return new Response(
      JSON.stringify({ version, updatedAt: updatedAtStr || new Date().toISOString() }),
      { status: 200, headers }
    );
  }

  const [data, versionStr, updatedAtStr] = await Promise.all([
    KV.get('app_state'),
    KV.get('app_state_version'),
    KV.get('app_state_updated_at')
  ]);

  if (!data) {
    return new Response('{}', { status: 200, headers });
  }

  return new Response(data, {
    status: 200,
    headers: {
      ...headers,
      'X-App-Version': versionStr || '1',
      'X-App-Updated-At': updatedAtStr || new Date().toISOString()
    }
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const KV = env.CHALAK_DB || env.KV || env.DB || env.CHALAK_PERFORMANCE_KV || env.DATABASE;
  const rawText = await request.text();
  const now = Date.now();
  const nowIso = new Date().toISOString();

  if (!KV) {
    return new Response(
      JSON.stringify({ success: true, version: now, fallback: 'client_storage', warning: 'KV_BINDING_MISSING', updatedAt: nowIso }),
      { status: 200, headers }
    );
  }

  try {
    const parsed = JSON.parse(rawText);
    const sanitized = sanitizePayload(parsed);

    // Anti-wipe protection: Never let an uninitialized browser wipe out existing evaluations!
    const existingData = await KV.get('app_state');
    if (existingData) {
      try {
        const existingState = JSON.parse(existingData);
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

        if (Array.isArray(existingState['pe_employees']) && existingState['pe_employees'].length > 0) {
          const incomingEmps = Array.isArray(sanitized['pe_employees']) ? sanitized['pe_employees'] : [];
          if (incomingEmps.length === 0) {
            sanitized['pe_employees'] = existingState['pe_employees'];
          }
        }
      } catch (e) {
        console.warn('Merge state warning:', e);
      }
    }

    const payloadString = JSON.stringify(sanitized);

    await Promise.all([
      KV.put('app_state', payloadString),
      KV.put('app_state_version', String(now)),
      KV.put('app_state_updated_at', nowIso)
    ]);

    return new Response(
      JSON.stringify({ success: true, version: now, updatedAt: nowIso }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
      { status: 400, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers });
};
