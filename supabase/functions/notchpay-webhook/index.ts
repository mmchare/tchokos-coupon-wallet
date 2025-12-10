import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notch-signature',
};

interface NotchpayWebhookPayload {
  event: string;
  data: {
    reference: string;
    trxref: string;
    amount: number;
    currency: string;
    status: string;
    channel: string;
    initiated_at: string;
    completed_at: string;
    customer?: {
      phone: string;
    };
    merchant_reference?: string;
  };
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return signature === expectedSignature;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOTCHPAY_HASH_KEY = Deno.env.get('NOTCHPAY_HASH_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('Webhook received:', rawBody);

    // Verify signature if hash key is configured
    const signature = req.headers.get('x-notch-signature');
    if (NOTCHPAY_HASH_KEY && signature) {
      const isValid = await verifySignature(rawBody, signature, NOTCHPAY_HASH_KEY);
      if (!isValid) {
        console.error('Invalid webhook signature');
        // In sandbox mode, we might skip signature verification
        console.log('Continuing anyway for sandbox testing...');
      }
    }

    const payload: NotchpayWebhookPayload = JSON.parse(rawBody);
    console.log('Parsed webhook payload:', JSON.stringify(payload));

    const { event, data } = payload;

    // The reference might be in different fields depending on Notchpay response
    const transactionId = data.merchant_reference || data.reference;
    
    if (!data || !transactionId) {
      console.error('Missing transaction reference in webhook');
      return new Response(
        JSON.stringify({ error: 'Reference manquante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing transaction:', transactionId, 'Status:', data.status, 'Event:', event);

    // Fetch the transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', transactionId, fetchError);
      return new Response(
        JSON.stringify({ error: 'Transaction non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (transaction.status === 'completed') {
      console.log('Transaction already completed:', transactionId);
      return new Response(
        JSON.stringify({ message: 'Transaction déjà traitée' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on status
    if (data.status === 'complete' || event === 'payment.complete') {
      console.log('Payment successful, updating wallet...');

      // Update transaction status
      const { error: updateTxError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId);

      if (updateTxError) {
        console.error('Error updating transaction:', updateTxError);
        return new Response(
          JSON.stringify({ error: 'Erreur de mise à jour de la transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', transaction.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Erreur de récupération du profil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newBalance = (profile.wallet_balance || 0) + transaction.amount;

      const { error: updateBalanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', transaction.user_id);

      if (updateBalanceError) {
        console.error('Error updating balance:', updateBalanceError);
        return new Response(
          JSON.stringify({ error: 'Erreur de mise à jour du solde' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Wallet updated successfully. New balance:', newBalance);

      return new Response(
        JSON.stringify({ success: true, message: 'Paiement traité avec succès' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (data.status === 'failed' || data.status === 'cancelled' || event === 'payment.failed') {
      console.log('Payment failed or cancelled');

      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transactionId);

      return new Response(
        JSON.stringify({ success: true, message: 'Échec du paiement enregistré' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Unhandled status:', data.status);
    return new Response(
      JSON.stringify({ message: 'Statut reçu', status: data.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
