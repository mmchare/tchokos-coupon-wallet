import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { corsHeaders, json, saspayFetch, unwrap, networkFor, formatCmPhone, mapStatus } from "../_shared/saspay.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!Deno.env.get('SASPAY_SECRET_KEY')) {
      return json({ error: 'Configuration de paiement manquante' }, 500);
    }

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non authentifié' }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userErr || !user) return json({ error: 'Non authentifié' }, 401);

    const rateLimit = checkRateLimit(`payment:${user.id}`, RATE_LIMITS.PAYMENT);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn, corsHeaders);

    const body = await req.json();
    const amount = Number(body?.amount);
    const phone_number = String(body?.phone_number ?? '');
    const payment_method = String(body?.payment_method ?? '');
    const description = body?.description ? String(body.description) : undefined;

    if (!Number.isFinite(amount) || amount < 100) {
      return json({ error: 'Le montant minimum est de 100 F' }, 400);
    }
    if (phone_number.replace(/\D/g, '').length < 8) {
      return json({ error: 'Numéro de téléphone invalide' }, 400);
    }
    if (!['momo', 'orange'].includes(payment_method)) {
      return json({ error: 'Méthode de paiement invalide' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const formattedPhone = formatCmPhone(phone_number);
    const label = payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money';

    const { data: transaction, error: txError } = await admin
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount,
        type: 'recharge',
        status: 'pending',
        provider: 'saspay',
        payment_method: label,
        description: description || `Recharge via ${label}`,
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error('Error creating transaction:', txError);
      return json({ error: 'Erreur lors de la création de la transaction' }, 500);
    }

    const fullName = String(user.user_metadata?.full_name || 'Client JinBao').trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const origin = req.headers.get('origin') || 'https://jimbao.lovable.app';

    const payload = {
      amount: amount.toFixed(2),
      currency: 'XAF',
      country: 'CM',
      network: networkFor(payment_method),
      description: description || `Recharge JinBao - ${transaction.id}`,
      customer: {
        email: user.email || `${user.id}@jinbao.app`,
        first_name: firstName || 'Client',
        last_name: rest.join(' ') || 'JinBao',
        phone: formattedPhone,
      },
      return_url: `${origin}/recharge`,
      metadata: { transaction_id: transaction.id, user_id: user.id },
    };

    const res = await saspayFetch('/payments/softpay/', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: `payin-${transaction.id}`,
    });

    if (!res.ok || res.body?.success === false) {
      console.error('SasPay softpay error:', res.status, JSON.stringify(res.body));
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('id', transaction.id);
      const b = res.body as Record<string, any>;
      const msg = b?.message || b?.detail || b?.error?.message || b?.errors?.[0]?.message ||
        (typeof b?.error === 'string' ? b.error : null) ||
        (b?.error && typeof b.error === 'object' ? String(Object.values(b.error).flat()[0] ?? '') : null) ||
        'Le paiement n\'a pas pu être initié. Réessayez dans un instant.';
      return json({ error: msg, code: b?.code ?? null, details: b }, 400);
    }

    const data = unwrap(res.body);
    const paymentId = (data.payment_id ?? data.id ?? data.reference ?? null) as string | null;
    const checkoutUrl = (data.checkout_url ?? null) as string | null;

    if (paymentId) {
      await admin
        .from('wallet_transactions')
        .update({ provider_reference: paymentId })
        .eq('id', transaction.id);
    }

    return json({
      success: true,
      message: 'Paiement initié avec succès',
      transaction_id: transaction.id,
      payment_id: paymentId,
      checkout_url: checkoutUrl || null,
      status: mapStatus(data.status),
    });
  } catch (error) {
    console.error('SasPay payment error:', error);
    return json({ error: 'Erreur serveur', details: (error as Error).message }, 500);
  }
});
