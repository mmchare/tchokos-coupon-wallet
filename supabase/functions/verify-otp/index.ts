import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone et code requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove spaces, ensure proper format without +)
    let formattedPhone = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
    
    // Remove + prefix for consistency
    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Add 237 prefix if not present (Cameroon)
    if (!formattedPhone.startsWith("237")) {
      formattedPhone = "237" + formattedPhone;
    }

    console.log("Verifying OTP via Termii for:", formattedPhone, "Code:", code);

    // Get Termii API key
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");

    if (!termiiApiKey) {
      console.error("Termii API key not configured");
      return new Response(
        JSON.stringify({ error: "Configuration SMS manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the stored pin_id for this phone number
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", "+" + formattedPhone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP record:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erreur de vérification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpRecord) {
      console.log("No valid OTP record found");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Code expiré ou invalide" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP via Termii API
    const verifyPayload = {
      api_key: termiiApiKey,
      pin_id: otpRecord.code, // pin_id was stored in code field
      pin: code
    };

    console.log("Termii verify payload:", JSON.stringify({ ...verifyPayload, api_key: "[HIDDEN]" }));

    const termiiResponse = await fetch("https://v3.api.termii.com/api/sms/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verifyPayload),
    });

    const termiiResult = await termiiResponse.json();
    console.log("Termii verify response:", JSON.stringify(termiiResult));

    // Check if verification was successful
    if (termiiResult.verified === true || termiiResult.verified === "True") {
      // Mark OTP as verified
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Delete all OTP codes for this phone after successful verification
      await supabase
        .from("otp_codes")
        .delete()
        .eq("phone", "+" + formattedPhone);

      console.log("OTP verified successfully for:", formattedPhone);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Code vérifié avec succès",
          phone: "+" + formattedPhone
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log("OTP verification failed:", termiiResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Code incorrect ou expiré" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
