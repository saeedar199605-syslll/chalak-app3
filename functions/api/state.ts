import { AuthSession, CloudflareEnv, hashPassword, jsonResponse, normalizeUsername } from '../../cloudflare/auth';

interface Context {
  request: Request;
  env: CloudflareEnv;
  data: { session?: AuthSession };
}

type State = Record<string, unknown>;
type EmployeeRecord = { id: string; username?: string; supervisorId?: string };
type EvaluationRecord = { id: string; empId: string };

const NEVER_SYNC = new Set([
  'pe_admin_password',
  'pe_admin_password_updated_at',
  'pe_user_passwords',
  'pe_auth_token',
  'pe_current_user',
]);

function sanitizeState(input: unknown): State {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output: State = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('pe_') && !key.includes('session') && !NEVER_SYNC.has(key)) output[key] = value;
  }
  return output;
}

function scopedState(state: State, session: AuthSession): State {
  if (session.role === 'admin') return state;
  const employees = Array.isArray(state.pe_employees) ? state.pe_employees as EmployeeRecord[] : [];
  const allowedEmployeeIds = new Set(
    employees
      .filter(employee => session.role === 'supervisor' ? employee.supervisorId === session.id || employee.id === session.id : employee.id === session.id)
      .map(employee => employee.id)
  );
  const result = { ...state };
  if (Array.isArray(state.pe_evaluations)) {
    result.pe_evaluations = (state.pe_evaluations as EvaluationRecord[]).filter(item => allowedEmployeeIds.has(item.empId));
  }
  if (session.role === 'employee') {
    result.pe_employees = employees.filter(employee => employee.id === session.id);
    delete result.pe_reward_config;
    delete result.pe_reward_batch_history;
    delete result.pe_system_logs;
    delete result.pe_audit_logs;
  }
  return result;
}

async function migrateCredentials(payload: State, env: CloudflareEnv, session: AuthSession): Promise<void> {
  if (session.role !== 'admin') return;
  const passwords = payload.pe_user_passwords;
  if (passwords && typeof passwords === 'object' && !Array.isArray(passwords)) {
    await Promise.all(Object.entries(passwords as Record<string, unknown>).map(async ([username, password]) => {
      const normalized = normalizeUsername(username);
      if (normalized && typeof password === 'string' && password.length >= 6 && password.length <= 256) {
        await env.CHALAK_DB.put(`credential:${normalized}`, await hashPassword(password));
      }
    }));
  }
}

function mergeAuthorizedState(current: State, incoming: State, session: AuthSession): State {
  if (session.role === 'admin') return sanitizeState(incoming);
  const next = { ...current };
  const employees = Array.isArray(current.pe_employees) ? current.pe_employees as EmployeeRecord[] : [];
  const allowedEmployeeIds = new Set(
    employees
      .filter(employee => session.role === 'supervisor' ? employee.supervisorId === session.id || employee.id === session.id : employee.id === session.id)
      .map(employee => employee.id)
  );
  if (Array.isArray(incoming.pe_evaluations)) {
    const currentEvaluations = Array.isArray(current.pe_evaluations) ? current.pe_evaluations as EvaluationRecord[] : [];
    const authorizedIncoming = (incoming.pe_evaluations as EvaluationRecord[]).filter(item => item?.id && allowedEmployeeIds.has(item.empId));
    const byId = new Map(currentEvaluations.map(item => [item.id, item]));
    authorizedIncoming.forEach(item => byId.set(item.id, item));
    next.pe_evaluations = Array.from(byId.values());
  }
  for (const key of ['pe_lattice_okrs', 'pe_lattice_one_on_ones', 'pe_lattice_kudos', 'pe_tickets']) {
    if (key in incoming) next[key] = incoming[key];
  }
  return sanitizeState(next);
}

export async function onRequestGet({ env, data }: Context): Promise<Response> {
  if (!data.session) return jsonResponse({ error: 'Authentication required.' }, 401);
  const raw = await env.CHALAK_DB.get('app_state');
  let state: State = {};
  try { state = raw ? sanitizeState(JSON.parse(raw)) : {}; } catch { state = {}; }
  return jsonResponse(scopedState(state, data.session));
}

export async function onRequestPost({ request, env, data }: Context): Promise<Response> {
  if (!data.session) return jsonResponse({ error: 'Authentication required.' }, 401);
  if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }
  const text = await request.text();
  if (text.length > 5_000_000) return jsonResponse({ error: 'Payload is too large.' }, 413);
  let incoming: State;
  try { incoming = JSON.parse(text) as State; }
  catch { return jsonResponse({ error: 'Invalid JSON payload.' }, 400); }

  await migrateCredentials(incoming, env, data.session);
  const rawCurrent = await env.CHALAK_DB.get('app_state');
  let current: State = {};
  try { current = rawCurrent ? sanitizeState(JSON.parse(rawCurrent)) : {}; } catch { current = {}; }
  const next = mergeAuthorizedState(current, incoming, data.session);
  await env.CHALAK_DB.put('app_state', JSON.stringify(next));
  return jsonResponse({ success: true });
}

export function onRequest(): Response {
  return jsonResponse({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
}
