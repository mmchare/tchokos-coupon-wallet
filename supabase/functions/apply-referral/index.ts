import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyReferralRequest {
  user_id: string;
  referral_code: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incorrecte' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, referral_code }: ApplyReferralRequest = await req.json();
    console.log('Apply referral request:', { user_id, referral_code });

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'Code de parrainage requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the referral code
    const normalizedCode = referral_code.toUpperCase().trim();
    console.log('Looking for referral code:', normalizedCode);

    // Find the referrer by their code
    const { data: referralCodeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id, code')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (codeError) {
      console.error('Error finding referral code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la recherche du code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!referralCodeData) {
      console.log('Referral code not found:', normalizedCode);
      return new Response(
        JSON.stringify({ error: 'Code de parrainage invalide', code: 'INVALID_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is trying to use their own code
    if (referralCodeData.user_id === user_id) {
      console.log('User trying to use own code');
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas utiliser votre propre code', code: 'OWN_CODE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if referral already exists for this user
    const { data: existingReferral, error: existingError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', user_id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing referral:', existingError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingReferral) {
      console.log('Referral already exists for user:', user_id);
      return new Response(
        JSON.stringify({ error: 'Vous avez déjà utilisé un code de parrainage', code: 'ALREADY_REFERRED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the referral relationship
    const { error: referralError } = await supabase.from('referrals').insert({
      referrer_id: referralCodeData.user_id,
      referred_id: user_id
    });

    if (referralError) {
      console.error('Error creating referral:', referralError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du parrainage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Referral created: referrer', referralCodeData.user_id, '-> referred', user_id);

    // Get current balance of the referred user (filleul)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !currentProfile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Bonus filleul: 2000 FCFA immédiatement à l'inscription
    const bonusAmount = 2000;
    const newBalance = (currentProfile.wallet_balance || 0) + bonusAmount;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating referred user balance:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'ajout du bonus' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bonus filleul: ${bonusAmount} FCFA added to user ${user_id}. New balance: ${newBalance}`);

    // Create transaction record for the referral bonus
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      user_id: user_id,
      type: 'referral_bonus',
      amount: bonusAmount,
      description: 'Bonus de bienvenue (code parrainage)',
      status: 'completed'
    });

    if (txError) {
      console.error('Error creating transaction record:', txError);
      // Non-critical, continue
    }

    // Create notification for the referred user
    await supabase.from('notifications').insert({
      user_id: user_id,
      message_type: 'BONUS_PARRAINAGE',
      message_body: `Félicitations! Vous avez reçu ${bonusAmount} FCFA de bonus de bienvenue grâce à votre parrain!`
    });

    // Get referrer's name for the response
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', referralCodeData.user_id)
      .single();

    console.log('Referral applied successfully:', {
      referred_user: user_id,
      referrer_id: referralCodeData.user_id,
      bonus_applied: bonusAmount,
      new_balance: newBalance
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Code parrainage appliqué avec succès!`,
        bonus_amount: bonusAmount,
        new_balance: newBalance,
        referrer_name: referrerProfile?.full_name || 'Votre parrain'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Apply referral error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
