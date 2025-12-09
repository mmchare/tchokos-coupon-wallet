import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  user_id: string;
  product_id?: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  total_amount: number;
  city: string;
  delivery_address: string;
  whatsapp_number: string;
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

    const orderData: OrderRequest = await req.json();
    console.log('Order request received:', orderData);

    const { user_id, product_id, items, total_amount, city, delivery_address, whatsapp_number } = orderData;

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Panier vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!city || !delivery_address || !whatsapp_number) {
      return new Response(
        JSON.stringify({ error: 'Informations de livraison incomplètes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has enough balance
    if (profile.wallet_balance < total_amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Solde insuffisant',
          current_balance: profile.wallet_balance,
          required: total_amount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id,
        product_id: product_id || items[0]?.id || null,
        total_amount,
        city,
        delivery_address,
        whatsapp_number,
        status: 'confirmed',
        logistics_step: 1
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la commande' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', order.id);

    // Deduct from wallet balance
    const newBalance = profile.wallet_balance - total_amount;
    const { error: updateBalanceError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id);

    if (updateBalanceError) {
      console.error('Error updating balance:', updateBalanceError);
      // Rollback order if balance update fails
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du débit du solde' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create purchase transaction record
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        type: 'purchase',
        amount: -total_amount,
        description: `Achat: ${items.map(i => i.name).join(', ')}`,
        status: 'completed'
      });

    if (txError) {
      console.error('Error creating transaction record:', txError);
      // Non-critical, continue
    }

    console.log('Order completed successfully:', { order_id: order.id, new_balance: newBalance });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Commande créée avec succès',
        order_id: order.id,
        new_balance: newBalance
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
