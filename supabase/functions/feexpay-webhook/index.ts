import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  status: string;
  reference: string;
  trans_key: string;
  amount: number;
  callback_info: string;
  phone_number?: string;
  mode?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', payload);

    // Parse callback_info to get transaction details
    let callbackInfo;
    try {
      callbackInfo = JSON.parse(payload.callback_info);
    } catch (e) {
      console.error('Error parsing callback_info:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid callback_info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transaction_id, user_id } = callbackInfo;

    if (!transaction_id || !user_id) {
      console.error('Missing transaction_id or user_id in callback_info');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status
    const isSuccessful = payload.status === 'success' || payload.status === 'SUCCESS' || payload.status === 'SUCCESSFUL';
    const isFailed = payload.status === 'failed' || payload.status === 'FAILED' || payload.status === 'error';

    console.log('Payment status:', { isSuccessful, isFailed, rawStatus: payload.status });

    if (isSuccessful) {
      // Get the transaction to verify it exists and is pending
      const { data: existingTx, error: fetchError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('id', transaction_id)
        .single();

      if (fetchError || !existingTx) {
        console.error('Transaction not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent double processing
      if (existingTx.status === 'completed') {
        console.log('Transaction already completed, skipping');
        return new Response(
          JSON.stringify({ message: 'Transaction already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update transaction status to completed
      const { error: updateTxError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('id', transaction_id);

      if (updateTxError) {
        console.error('Error updating transaction:', updateTxError);
        return new Response(
          JSON.stringify({ error: 'Error updating transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user_id)
        .single();

      if (profileError || !profile) {
        console.error('Profile not found:', profileError);
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update wallet balance
      const newBalance = (profile.wallet_balance || 0) + payload.amount;
      const { error: updateBalanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user_id);

      if (updateBalanceError) {
        console.error('Error updating balance:', updateBalanceError);
        return new Response(
          JSON.stringify({ error: 'Error updating balance' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment completed successfully:', { transaction_id, user_id, amount: payload.amount, newBalance });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment processed successfully',
          new_balance: newBalance
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (isFailed) {
      // Update transaction status to failed
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction_id);

      if (updateError) {
        console.error('Error updating transaction to failed:', updateError);
      }

      console.log('Payment failed:', { transaction_id, status: payload.status });

      return new Response(
        JSON.stringify({ success: false, message: 'Payment failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status - log it
    console.log('Unknown payment status:', payload.status);
    return new Response(
      JSON.stringify({ message: 'Status received', status: payload.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
