import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, user_id } = await req.json();

    console.log(`Cancel order request: order_id=${order_id}, user_id=${user_id}`);

    if (!order_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'ID de commande et ID utilisateur requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Commande non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is already cancelled
    if (order.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Cette commande est déjà annulée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is within 2 hours of creation
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

    console.log(`Order created at: ${orderDate}, Hours since: ${hoursDiff}`);

    if (hoursDiff > 2) {
      return new Response(
        JSON.stringify({ error: 'Le délai d\'annulation de 2 heures est dépassé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order hasn't been shipped yet (logistics_step < 3)
    if (order.logistics_step >= 3) {
      return new Response(
        JSON.stringify({ error: 'Impossible d\'annuler une commande déjà expédiée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status to cancelled
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order_id);

    if (updateOrderError) {
      console.error('Error updating order:', updateOrderError);
      throw updateOrderError;
    }

    // Refund the amount to user's wallet
    const { error: walletError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: supabase.rpc('', {}) // We'll use raw SQL instead
      })
      .eq('id', user_id);

    // Get current wallet balance and add refund
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    const newBalance = (profile.wallet_balance || 0) + order.total_amount;

    const { error: updateWalletError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id);

    if (updateWalletError) {
      console.error('Error updating wallet:', updateWalletError);
      throw updateWalletError;
    }

    // Create refund transaction record
    const { error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user_id,
        amount: order.total_amount,
        type: 'credit',
        description: `Remboursement commande #${order_id.slice(0, 8).toUpperCase()}`,
        status: 'completed'
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      throw transactionError;
    }

    // Create notification for the user
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        message_type: 'ANNULATION_COMMANDE',
        message_body: `Votre commande #${order_id.slice(0, 8).toUpperCase()} a été annulée. ${order.total_amount.toLocaleString()} FCFA ont été remboursés sur votre portefeuille.`,
        order_id: order_id
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
      // Non-blocking error
    }

    console.log(`Order ${order_id} cancelled successfully. Refunded ${order.total_amount} FCFA`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Commande annulée avec succès',
        refunded_amount: order.total_amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cancelling order:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'annulation de la commande' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
