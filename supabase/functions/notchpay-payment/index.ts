import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  phone_number: string;
  payment_method: 'momo' | 'orange';
  user_id: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOTCHPAY_PUBLIC_KEY = Deno.env.get('NOTCHPAY_PUBLIC_KEY');
    const NOTCHPAY_PRIVATE_KEY = Deno.env.get('NOTCHPAY_PRIVATE_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NOTCHPAY_PUBLIC_KEY || !NOTCHPAY_PRIVATE_KEY) {
      console.error('Missing Notchpay API keys');
      return new Response(
        JSON.stringify({ error: 'Configuration Notchpay manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: PaymentRequest = await req.json();
    const { amount, phone_number, payment_method, user_id, description } = body;

    console.log('Payment request received:', { amount, phone_number, payment_method, user_id });

    // Validate input
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Le montant minimum est de 100 F' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone_number || phone_number.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Numéro de téléphone invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Cameroon
    let formattedPhone = phone_number.replace(/\s/g, '').replace(/^\+/, '');
    if (!formattedPhone.startsWith('237')) {
      formattedPhone = '237' + formattedPhone;
    }

    // Create pending transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        amount,
        type: 'recharge',
        status: 'pending',
        payment_method: payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money',
        description: description || `Recharge via ${payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money'}`
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction created:', transaction.id);

    // Determine channel based on payment method
    const channel = payment_method === 'momo' ? 'cm.mtn' : 'cm.orange';

    // Build Notchpay payment request - Sandbox API
    const notchpayPayload = {
      amount: amount,
      currency: 'XAF',
      phone: formattedPhone,
      channel: channel,
      reference: transaction.id,
      description: description || `Recharge JinBao - ${transaction.id}`,
      callback: `https://xzilbjhrqbpedekuwghu.supabase.co/functions/v1/notchpay-webhook`
    };

    console.log('Notchpay payload:', JSON.stringify(notchpayPayload));

    // Call Notchpay API - Sandbox endpoint
    const notchpayResponse = await fetch('https://api.notchpay.co/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': NOTCHPAY_PUBLIC_KEY,
        'X-Grant': 'public'
      },
      body: JSON.stringify(notchpayPayload)
    });

    const notchpayData = await notchpayResponse.json();
    console.log('Notchpay response:', JSON.stringify(notchpayData));

    if (!notchpayResponse.ok || notchpayData.code !== 201) {
      console.error('Notchpay API error:', notchpayData);
      
      // Update transaction as failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          error: notchpayData.message || 'Erreur lors de l\'initialisation du paiement',
          details: notchpayData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Paiement initié avec succès',
        transaction_id: transaction.id,
        notchpay_reference: notchpayData.transaction?.reference
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
