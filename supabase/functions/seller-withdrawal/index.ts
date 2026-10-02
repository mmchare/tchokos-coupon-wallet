import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SASPAY_SECRET_KEY = Deno.env.get('SASPAY_SECRET_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { amount, phone_number, payment_method } = await req.json();

    if (!amount || amount < 1000) {
      return new Response(JSON.stringify({ error: 'Le montant minimum est 1000 FCFA' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!phone_number || phone_number.length < 8) {
      return new Response(JSON.stringify({ error: 'Numéro invalide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!['momo', 'orange'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Méthode invalide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get seller profile
    const { data: seller } = await admin
      .from('seller_profiles')
      .select('id, is_suspended, verification_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!seller || seller.verification_status !== 'verified') {
      return new Response(JSON.stringify({ error: 'Vendeur non vérifié' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (seller.is_suspended) {
      return new Response(JSON.stringify({ error: 'Compte vendeur suspendu' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Atomic debit
    const { data: debited, error: debitErr } = await admin.rpc('debit_seller_wallet', { p_seller_id: seller.id, p_amount: amount });
    if (debitErr || !debited) {
      return new Response(JSON.stringify({ error: 'Solde insuffisant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create withdrawal record
    const { data: withdrawal, error: wErr } = await admin
      .from('seller_withdrawals')
      .insert({
        seller_id: seller.id,
        user_id: user.id,
        amount,
        phone_number,
        payment_method,
        provider: 'saspay',
        status: 'processing',
      })
      .select()
      .single();

    if (wErr) {
      // Refund
      await admin.rpc('refund_seller_wallet', { p_seller_id: seller.id, p_amount: amount });
      return new Response(JSON.stringify({ error: wErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SasPay payout (disbursement). If it fails, we keep the withdrawal in
    // 'processing' so an admin can reconcile it manually.
    if (SASPAY_SECRET_KEY) {
      try {
        let formattedPhone = phone_number.replace(/\s/g, '').replace(/^\+/, '');
        if (!formattedPhone.startsWith('237')) formattedPhone = '237' + formattedPhone;

        const payoutRes = await fetch('https://api.saspay.me/api/v1/payouts/initialize/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${SASPAY_SECRET_KEY}`,
            'Idempotency-Key': `payout-${withdrawal.id}`,
          },
          body: JSON.stringify({
            amount: Number(amount).toFixed(2),
            currency: 'XAF',
            country: 'CM',
            method: payment_method === 'momo' ? 'mtn_cm' : 'orange_cm',
            description: `Retrait JinBao - ${withdrawal.id}`,
            customer: { phone: '+' + formattedPhone },
            recipient: { msisdn: formattedPhone.replace(/^237/, '') },
            metadata: { withdrawal_id: withdrawal.id, seller_id: seller.id },
          }),
        });
        const payoutData = await payoutRes.json();
        if (payoutRes.ok) {
          const d = payoutData?.data ?? payoutData;
          await admin.from('seller_withdrawals').update({
            provider_reference: d?.payout_id || d?.id || d?.reference || null,
          }).eq('id', withdrawal.id);
        } else {
          console.error('SasPay payout error', payoutData);
          // Keep status processing — admin will reconcile
        }
      } catch (e) {
        console.error('SasPay payout call failed', e);
      }
    }

    // Notify user
    await admin.from('notifications').insert({
      user_id: user.id,
      message_type: 'RETRAIT',
      message_body: `Retrait de ${amount} FCFA en cours de traitement.`,
    });

    return new Response(JSON.stringify({ success: true, withdrawal_id: withdrawal.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Withdrawal error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
