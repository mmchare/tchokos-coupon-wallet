import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderRequest {
  user_id: string;
  product_id?: string;
  items: OrderItem[];
  total_amount: number;
  city: string;
  delivery_address: string;
  whatsapp_number: string;
  promo_code_id?: string | null;
  promo_discount?: number;
  shipping_mode?: 'sea' | 'air';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - use IP + user_id for order creation
    const clientIp = getClientIdentifier(req);
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const orderData: OrderRequest = await req.json();
    console.log('Order request received:', orderData);

    const { user_id, product_id, items, total_amount, city, delivery_address, whatsapp_number, promo_code_id, promo_discount, shipping_mode } = orderData;
    const finalShippingMode: 'sea' | 'air' = shipping_mode === 'air' ? 'air' : 'sea';

    // Rate limiting by user_id + IP
    const rateLimitKey = `create-order:${user_id || clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.ORDER_CREATE);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for order creation: ${rateLimitKey}`);
      return rateLimitResponse(rateLimit.resetIn, corsHeaders);
    }

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

    // CRITICAL: Validate stock availability for all items BEFORE processing
    const stockValidationErrors: string[] = [];
    const productStocks: Map<string, { stock_available: number; name: string }> = new Map();

    // Helper function to validate UUID format
    const isValidUUID = (str: string | null | undefined): boolean => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Check stock for each item
    for (const item of items) {
      if (!isValidUUID(item.id)) {
        stockValidationErrors.push(`ID invalide pour ${item.name}`);
        continue;
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, stock_available')
        .eq('id', item.id)
        .single();

      if (productError || !product) {
        stockValidationErrors.push(`Produit non trouvé: ${item.name}`);
        continue;
      }

      productStocks.set(item.id, { 
        stock_available: product.stock_available, 
        name: product.name 
      });

      if (product.stock_available < item.quantity) {
        stockValidationErrors.push(
          `Stock insuffisant pour "${product.name}". Disponible: ${product.stock_available}, Demandé: ${item.quantity}`
        );
      }
    }

    // If any stock validation errors, reject the order
    if (stockValidationErrors.length > 0) {
      console.error('Stock validation errors:', stockValidationErrors);
      return new Response(
        JSON.stringify({ 
          error: 'Stock insuffisant',
          details: stockValidationErrors,
          items_with_issues: stockValidationErrors
        }),
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

    // Only use product_id if it's a valid UUID
    const validProductId = isValidUUID(product_id) ? product_id : 
                           isValidUUID(items[0]?.id) ? items[0].id : null;

    // Get product name and image from items
    const productName = items.length === 1 ? items[0].name : items.map(i => i.name).join(', ');
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id,
        product_id: validProductId,
        product_name: productName,
        total_amount,
        city,
        delivery_address,
        whatsapp_number,
        status: 'confirmed',
        logistics_step: 1,
        shipping_mode: finalShippingMode,
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

    // Consume promo code if provided (revalidates server-side)
    if (promo_code_id && promo_discount && promo_discount > 0) {
      const { error: promoError } = await supabase.rpc('consume_promo_code', {
        p_promo_code_id: promo_code_id,
        p_user_id: user_id,
        p_order_id: order.id,
        p_discount_amount: promo_discount,
      });
      if (promoError) {
        console.error('Promo consume error (non-blocking):', promoError);
      } else {
        console.log(`Promo code consumed: ${promo_code_id} -${promo_discount} F`);
      }
    }

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

    // CRITICAL: Decrement stock for each product after successful payment
    for (const item of items) {
      if (!isValidUUID(item.id)) continue;
      
      const productStock = productStocks.get(item.id);
      if (productStock) {
        const newStock = productStock.stock_available - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_available: Math.max(0, newStock) })
          .eq('id', item.id);

        if (stockError) {
          console.error(`Error updating stock for product ${item.id}:`, stockError);
          // Non-critical, continue - order is already created
        } else {
          console.log(`Stock updated for ${item.name}: ${productStock.stock_available} -> ${newStock}`);
        }
      }
    }

    // Track PURCHASE activity for recommendation engine
    for (const item of items) {
      if (!isValidUUID(item.id)) continue;
      
      const { error: activityError } = await supabase
        .from('user_activity')
        .insert({
          user_id,
          product_id: item.id,
          activity_type: 'PURCHASE'
        });

      if (activityError) {
        console.error(`Error tracking purchase activity for ${item.id}:`, activityError);
        // Non-critical, continue
      }
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

    // REFERRAL BONUS: Check if this is the user's FIRST order and give bonus to referrer
    const { data: userOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user_id);

    // If this is the first order (only 1 order exists - the one we just created)
    if (userOrders && userOrders.length === 1) {
      console.log('First order detected for user:', user_id);
      
      // Check if user was referred by someone
      const { data: referralData } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_id', user_id)
        .maybeSingle();

      if (referralData && referralData.referrer_id) {
        console.log('User was referred by:', referralData.referrer_id);
        
        // Get referrer's current balance
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', referralData.referrer_id)
          .single();

        if (referrerProfile) {
          // Add 5000 FCFA bonus to referrer
          const newReferrerBalance = (referrerProfile.wallet_balance || 0) + 5000;
          const { error: referrerUpdateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newReferrerBalance })
            .eq('id', referralData.referrer_id);

          if (referrerUpdateError) {
            console.error('Error updating referrer balance:', referrerUpdateError);
          } else {
            console.log(`Referrer bonus: 5000 FCFA added to ${referralData.referrer_id}. New balance: ${newReferrerBalance}`);
            
            // Create transaction record for referrer bonus
            await supabase.from('wallet_transactions').insert({
              user_id: referralData.referrer_id,
              type: 'referral_bonus',
              amount: 5000,
              description: `Bonus parrainage: premier achat de votre filleul`,
              status: 'completed'
            });

            // Create notification for referrer
            await supabase.from('notifications').insert({
              user_id: referralData.referrer_id,
              message_type: 'BONUS_PARRAINAGE',
              message_body: `Félicitations! Votre filleul a effectué son premier achat. Vous avez reçu 5000 FCFA de bonus!`
            });
          }
        }
      }
    }

    // Create notification for ALL admin users about new order
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('user_id');

    if (adminUsers && adminUsers.length > 0) {
      const adminNotifications = adminUsers
        .filter(admin => admin.user_id)
        .map(admin => ({
          user_id: admin.user_id!,
          message_type: 'ADMIN_NOUVELLE_COMMANDE',
          message_body: `🛒 Nouvelle commande #${order.id.slice(0, 8).toUpperCase()}! Montant: ${total_amount.toLocaleString()} FCFA. Produit: ${productName}. Ville: ${city}`,
          order_id: order.id
        }));

      if (adminNotifications.length > 0) {
        const { error: adminNotifError } = await supabase
          .from('notifications')
          .insert(adminNotifications);

        if (adminNotifError) {
          console.error('Error creating admin notifications:', adminNotifError);
        } else {
          console.log(`Admin notifications sent to ${adminNotifications.length} admins`);
        }
      }
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