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

    const { amount, phone_number, payment_method, user_id, description }: PaymentRequest = await req.json();

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

    // Format phone number for Cameroon (add 237 prefix if needed)
    let formattedPhone = phone_number.replace(/\s/g, '').replace('+', '');
    if (!formattedPhone.startsWith('237')) {
      formattedPhone = '237' + formattedPhone;
    }

    // Determine the endpoint based on payment method for Cameroon
    // MTN Cameroon: numbers starting with 67, 65, 68
    // Orange Cameroon: numbers starting with 69, 65
    const phoneWithoutPrefix = formattedPhone.replace(/^237/, '');
    const isMTN = phoneWithoutPrefix.startsWith('67') || phoneWithoutPrefix.startsWith('68') || 
                  (phoneWithoutPrefix.startsWith('65') && payment_method === 'momo');
    
    // Use the correct endpoint for Cameroon operators
    const endpoint = isMTN 
      ? 'https://api.feexpay.me/api/transactions/public/requesttopay/mtn_cm'
      : 'https://api.feexpay.me/api/transactions/public/requesttopay/orange_cm';

    console.log('Using Feexpay endpoint:', endpoint, 'for phone:', formattedPhone);

    // Create pending transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        type: 'recharge',
        amount,
        description: description || `Recharge via ${payment_method === 'momo' ? 'MTN MoMo' : 'Orange Money'}`,
        payment_method: isMTN ? 'MTN MoMo' : 'Orange Money',
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

    // Build Feexpay payload according to their API documentation
    const feexpayPayload = {
      shop: FEEXPAY_SHOP_ID,
      amount: amount,
      phoneNumber: parseInt(formattedPhone),
      firstName: 'JinBao',
      lastName: 'Client',
      description: description || 'Recharge portefeuille JinBao',
      callback_info: JSON.stringify({
        transaction_id: transaction.id,
        user_id: user_id
      })
    };

    console.log('Calling Feexpay API with:', { ...feexpayPayload, shop: '***' });

    const feexpayResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEEXPAY_API_KEY}`
      },
      body: JSON.stringify(feexpayPayload)
    });

    // Log raw response for debugging
    const responseText = await feexpayResponse.text();
    console.log('Feexpay raw response:', responseText);

    let feexpayData;
    try {
      feexpayData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Feexpay response:', responseText);
      // Update transaction status to failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur de communication avec Feexpay',
          details: responseText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Feexpay parsed response:', feexpayData);

    // Check for error responses
    if (!feexpayResponse.ok || feexpayData.error || feexpayData.statusCode >= 400) {
      // Update transaction status to failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          error: feexpayData.message || feexpayData.error || 'Erreur lors de l\'initiation du paiement',
          details: feexpayData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success - return the reference for status polling
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Paiement initié avec succès. Veuillez confirmer sur votre téléphone.',
        transaction_id: transaction.id,
        reference: feexpayData.reference || feexpayData.transref,
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