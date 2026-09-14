import { jsonResponse } from '../../cloudflare/auth';

export function onRequestGet(): Response {
  return jsonResponse({ status: 'ok', runtime: 'cloudflare-pages', timestamp: new Date().toISOString() });
}
