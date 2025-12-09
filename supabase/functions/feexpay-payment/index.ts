import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  callback_url?: string;
}

interface FeexpayResponse {
  status: string;
  reference: string;
  message?: string;
  redirect_url?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FEEXPAY_API_KEY = Deno.env.get('FEEXPAY_API_KEY');
    const FEEXPAY_SHOP_ID = Deno.env.get('FEEXPAY_SHOP_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FEEXPAY_API_KEY || !FEEXPAY_SHOP_ID) {
      console.error('Missing Feexpay credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { amount, phone_number, payment_method, user_id, description, callback_url }: PaymentRequest = await req.json();

    console.log('Payment request received:', { amount, phone_number, payment_method, user_id });

    // Validate input
    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: 'Montant minimum: 100 F' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone_number || phone_number.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Numéro de téléphone invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transaction key
    const trans_key = `JINBAO_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Determine Feexpay mode based on payment method
    const mode = payment_method === 'momo' ? 'MOMO' : 'FLOOZ';

    // Create pending transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        type: 'recharge',
        amount,
        description: description || `Recharge via ${payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money'}`,
        payment_method: payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money',
        status: 'pending'
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

    // Call Feexpay API
    const feexpayPayload = {
      shop_id: FEEXPAY_SHOP_ID,
      token: FEEXPAY_API_KEY,
      amount: amount,
      phone_number: phone_number.replace(/\s/g, '').replace('+', ''),
      mode: mode,
      trans_key: trans_key,
      callback_info: JSON.stringify({
        transaction_id: transaction.id,
        user_id: user_id
      }),
      callback_url: callback_url || `${SUPABASE_URL}/functions/v1/feexpay-webhook`
    };

    console.log('Calling Feexpay API with:', { ...feexpayPayload, token: '***' });

    const feexpayResponse = await fetch('https://api.feexpay.me/api/transactions/mobile-money', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEEXPAY_API_KEY}`
      },
      body: JSON.stringify(feexpayPayload)
    });

    const feexpayData = await feexpayResponse.json();
    console.log('Feexpay response:', feexpayData);

    if (!feexpayResponse.ok || feexpayData.status === 'error') {
      // Update transaction status to failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          error: feexpayData.message || 'Erreur lors de l\'initiation du paiement',
          details: feexpayData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Paiement initié avec succès',
        transaction_id: transaction.id,
        reference: trans_key,
        feexpay_data: feexpayData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
