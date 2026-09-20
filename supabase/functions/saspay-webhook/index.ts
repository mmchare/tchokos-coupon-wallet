import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/saspay.ts";

const TOLERANCE_SECONDS = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const WEBHOOK_SECRET = Deno.env.get('SASPAY_WEBHOOK_SECRET');

    const rawBody = await req.text();
    const signature = req.headers.get('X-Webhook-Signature') ?? '';
    const timestamp = req.headers.get('X-Webhook-Timestamp') ?? '';
    const event = req.headers.get('X-Webhook-Event') ?? '';

    if (!WEBHOOK_SECRET) {
      console.error('SASPAY_WEBHOOK_SECRET not configured');
      return json({ error: 'Webhook non configuré' }, 500);
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
      console.warn('Webhook rejected: stale or invalid timestamp', timestamp);
      return json({ error: 'Horodatage invalide' }, 401);
    }

    const expected = await hmacSha256Hex(WEBHOOK_SECRET, `${ts}.${rawBody}`);
    if (!timingSafeEqual(expected, signature.replace(/^sha256=/, ''))) {
      console.warn('Webhook rejected: bad signature');
      return json({ error: 'Signature invalide' }, 401);
    }

    const payload = JSON.parse(rawBody || '{}');
    const data = payload?.data ?? payload;
    const eventType: string = payload?.event ?? event;

    console.log('SasPay webhook:', eventType, JSON.stringify(data));

    const paymentId = data?.payment_id ?? data?.id ?? data?.reference ?? null;
    const merchantRef = data?.merchant_reference ?? data?.reference ?? data?.metadata?.transaction_id ?? null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // --- Payouts (seller withdrawals) ---
    if (eventType.startsWith('payout') || data?.type === 'payout') {
      const status = eventType.endsWith('success')
        ? 'completed'
        : (eventType.endsWith('failed') || eventType.endsWith('cancelled')) ? 'failed' : null;
      if (status && merchantRef) {
        const { data: w } = await admin
          .from('seller_withdrawals')
          .select('id, seller_id, amount, status')
          .eq('id', merchantRef)
          .maybeSingle();
        if (w && w.status !== 'completed' && w.status !== 'failed') {
          await admin.from('seller_withdrawals')
            .update({ status, processed_at: new Date().toISOString(), failure_reason: status === 'failed' ? (data?.message ?? 'Échec du transfert') : null })
            .eq('id', w.id);
          if (status === 'failed') {
            await admin.rpc('refund_seller_wallet', { p_seller_id: w.seller_id, p_amount: w.amount });
          }
        }
      }
      return json({ received: true });
    }

    // --- Payments (wallet recharges) ---
    let tx = null;
    if (paymentId) {
      const { data: byRef } = await admin
        .from('wallet_transactions')
        .select('*')
        .eq('provider_reference', paymentId)
        .maybeSingle();
      tx = byRef;
    }
    if (!tx && merchantRef) {
      const { data: byId } = await admin
        .from('wallet_transactions')
        .select('*')
        .eq('id', merchantRef)
        .maybeSingle();
      tx = byId;
    }

    if (!tx) {
      console.warn('Webhook: transaction not found', { paymentId, merchantRef });
      return json({ received: true, matched: false });
    }

    if (tx.status !== 'pending') {
      return json({ received: true, message: 'Déjà traité' });
    }

    if (eventType === 'transaction.success') {
      const { data: updated } = await admin
        .from('wallet_transactions')
        .update({ status: 'completed', provider_reference: paymentId ?? tx.provider_reference })
        .eq('id', tx.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (updated) {
        const { data: profile } = await admin
          .from('profiles')
          .select('wallet_balance')
          .eq('id', tx.user_id)
          .single();
        const newBalance = Number(profile?.wallet_balance || 0) + Number(tx.amount);
        await admin.from('profiles').update({ wallet_balance: newBalance }).eq('id', tx.user_id);
        console.log('Wallet credited', { tx: tx.id, newBalance });
      }
      return json({ received: true, status: 'completed' });
    }

    if (eventType === 'transaction.failed' || eventType === 'transaction.cancelled') {
      await admin.from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id)
        .eq('status', 'pending');
      return json({ received: true, status: 'failed' });
    }

    return json({ received: true, status: 'pending' });
  } catch (error) {
    console.error('SasPay webhook error:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
