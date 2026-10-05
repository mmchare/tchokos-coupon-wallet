import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, saspayFetch, unwrap, mapStatus } from "../_shared/saspay.ts";

// Polling fallback: verifies a pending recharge directly with SasPay.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Non authentifié' }, 401);

    const { transaction_id } = await req.json();
    if (!transaction_id) return json({ error: 'transaction_id requis' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tx } = await admin
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!tx) return json({ error: 'Transaction introuvable' }, 404);
    if (tx.status !== 'pending') return json({ success: true, status: tx.status });
    if (!tx.provider_reference) return json({ success: true, status: 'pending' });

    const res = await saspayFetch(`/payments/${tx.provider_reference}/verify/`, { method: 'GET' });
    if (!res.ok) {
      console.error('SasPay verify error', res.status, JSON.stringify(res.body));
      return json({ success: true, status: 'pending' });
    }

    const data = unwrap(res.body);
    const status = mapStatus(data.status);
    if (status === 'pending') return json({ success: true, status: 'pending' });

    if (status === 'failed') {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('id', tx.id).eq('status', 'pending');
      return json({ success: true, status: 'failed' });
    }

    // Completed — atomic, idempotent credit
    const { error: cErr } = await admin.rpc('complete_wallet_recharge', { p_tx_id: tx.id, p_provider_ref: null });
    if (cErr) { console.error('Credit error', cErr); return json({ success: true, status: 'pending' }); }

    return json({ success: true, status: 'completed' });
  } catch (error) {
    console.error('SasPay verify failure:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
