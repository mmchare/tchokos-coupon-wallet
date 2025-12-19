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

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 30000; // 30 seconds
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry fetch with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Notchpay API attempt ${attempt + 1}/${maxRetries}`);
      
      // Increase timeout with each retry
      const timeout = INITIAL_TIMEOUT + (attempt * 10000);
      const response = await fetchWithTimeout(url, options, timeout);
      
      // If we get a response (even error), return it
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Check if it's an abort error (timeout)
      if (lastError.name === 'AbortError') {
        console.log(`Request timed out on attempt ${attempt + 1}`);
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOTCHPAY_PUBLIC_KEY = Deno.env.get('NOTCHPAY_PUBLIC_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NOTCHPAY_PUBLIC_KEY) {
      console.error('Missing Notchpay API key');
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
      formattedPhone = '+237' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
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

    // Build Notchpay payment request
    const notchpayPayload = {
      amount: amount,
      currency: 'XAF',
      customer: {
        phone: formattedPhone
      },
      reference: transaction.id,
      description: description || `Recharge JinBao - ${transaction.id}`,
      callback: `${SUPABASE_URL}/functions/v1/notchpay-webhook`
    };

    console.log('Notchpay payload:', JSON.stringify(notchpayPayload));

    try {
      // Call Notchpay API with retry logic
      const notchpayResponse = await fetchWithRetry('https://api.notchpay.co/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': NOTCHPAY_PUBLIC_KEY
        },
        body: JSON.stringify(notchpayPayload)
      });

      const notchpayData = await notchpayResponse.json();
      console.log('Notchpay response:', JSON.stringify(notchpayData));

      if (!notchpayResponse.ok) {
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
          notchpay_reference: notchpayData.transaction?.reference,
          authorization_url: notchpayData.authorization_url,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      console.error('Notchpay API connection error after retries:', apiError);
      
      // Update transaction as failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          error: 'Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques instants.',
          retry: true
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
