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
    const NOTCHPAY_PRIVATE_KEY = Deno.env.get('NOTCHPAY_PRIVATE_KEY');

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
        status: 'processing',
      })
      .select()
      .single();

    if (wErr) {
      // Refund
      await admin.rpc('refund_seller_wallet', { p_seller_id: seller.id, p_amount: amount });
      return new Response(JSON.stringify({ error: wErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Note: Notchpay payout (disbursement) endpoint requires merchant approval.
    // For now we record the request as 'processing' and admin can mark it completed
    // after manual MoMo transfer, OR you can integrate Notchpay Disbursements API later.
    if (NOTCHPAY_PRIVATE_KEY) {
      try {
        let formattedPhone = phone_number.replace(/\s/g, '').replace(/^\+/, '');
        if (!formattedPhone.startsWith('237')) formattedPhone = '237' + formattedPhone;

        const payoutRes = await fetch('https://api.notchpay.co/transfers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': NOTCHPAY_PRIVATE_KEY,
          },
          body: JSON.stringify({
            amount,
            currency: 'XAF',
            recipient: { phone: '+' + formattedPhone, channel: payment_method === 'momo' ? 'cm.mtn' : 'cm.orange' },
            description: `Retrait JinBao - ${withdrawal.id}`,
            reference: withdrawal.id,
          }),
        });
        const payoutData = await payoutRes.json();
        if (payoutRes.ok) {
          await admin.from('seller_withdrawals').update({
            notchpay_reference: payoutData?.transfer?.reference || payoutData?.reference || null,
          }).eq('id', withdrawal.id);
        } else {
          console.error('Notchpay payout error', payoutData);
          // Keep status processing — admin will reconcile
        }
      } catch (e) {
        console.error('Notchpay transfer call failed', e);
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
