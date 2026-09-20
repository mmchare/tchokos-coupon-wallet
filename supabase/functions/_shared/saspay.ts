// Shared SasPay helpers (https://docs.saspay.me)
export const SASPAY_BASE = 'https://api.saspay.me/api/v1';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function saspayKey(): string {
  const key = Deno.env.get('SASPAY_SECRET_KEY');
  if (!key) throw new Error('SASPAY_SECRET_KEY manquant');
  return key;
}

export function networkFor(method: string): string {
  return method === 'orange' ? 'orange_cm' : 'mtn_cm';
}

/** Normalise a Cameroon phone number to +237XXXXXXXXX */
export function formatCmPhone(raw: string): string {
  let p = raw.replace(/\s/g, '').replace(/^\+/, '');
  if (!p.startsWith('237')) p = '237' + p;
  return '+' + p;
}

export async function saspayFetch(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${saspayKey()}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${SASPAY_BASE}${path}`, { ...init, headers });
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

/** SasPay wraps responses as { success, data, code, message } */
export function unwrap(body: Record<string, unknown>): Record<string, unknown> {
  const data = body?.data;
  return (data && typeof data === 'object' ? data : body) as Record<string, unknown>;
}

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Maps a SasPay transaction status to our internal wallet_transactions status */
export function mapStatus(raw: unknown): 'pending' | 'completed' | 'failed' {
  const s = String(raw ?? '').toLowerCase();
  if (['success', 'successful', 'completed', 'paid'].includes(s)) return 'completed';
  if (['failed', 'cancelled', 'canceled', 'expired', 'rejected'].includes(s)) return 'failed';
  return 'pending';
}
