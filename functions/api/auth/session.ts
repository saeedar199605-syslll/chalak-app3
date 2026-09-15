import { AuthSession, jsonResponse } from '../../../cloudflare/auth';

interface Context { data: { session?: AuthSession } }

export function onRequestGet({ data }: Context): Response {
  return jsonResponse({ session: data.session || null });
}
