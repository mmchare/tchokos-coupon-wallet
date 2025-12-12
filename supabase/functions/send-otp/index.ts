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
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove spaces, ensure proper format without +)
    let formattedPhone = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
    
    // Remove + prefix for Termii (requires international format without +)
    if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Add 237 prefix if not present (Cameroon)
    if (!formattedPhone.startsWith("237")) {
      formattedPhone = "237" + formattedPhone;
    }

    console.log("Sending OTP via Termii to:", formattedPhone);

    // Get Termii credentials
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "JinBao";

    if (!termiiApiKey) {
      console.error("Termii API key not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuration SMS manquante"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete any existing OTP codes for this phone
    await supabase
      .from("otp_codes")
      .delete()
      .eq("phone", "+" + formattedPhone);

    // Send OTP via Termii Token API
    const termiiPayload = {
      api_key: termiiApiKey,
      message_type: "NUMERIC",
      to: formattedPhone,
      from: termiiSenderId,
      channel: "generic",
      pin_attempts: 3,
      pin_time_to_live: 5,
      pin_length: 6,
      pin_placeholder: "< 1234 >",
      message_text: "Votre code de verification JinBao est < 1234 >. Valide 5 minutes.",
      pin_type: "NUMERIC"
    };

    console.log("Termii request payload:", JSON.stringify({ ...termiiPayload, api_key: "[HIDDEN]" }));

    const termiiResponse = await fetch("https://v3.api.termii.com/api/sms/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(termiiPayload),
    });

    const termiiResult = await termiiResponse.json();
    console.log("Termii response:", JSON.stringify(termiiResult));

    if (!termiiResponse.ok || termiiResult.status !== "success") {
      console.error("Termii SMS sending failed:", termiiResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: termiiResult.message || "Échec de l'envoi SMS"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store pin_id in database for verification
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: "+" + formattedPhone,
      code: termiiResult.pinId, // Store Termii's pin_id as code for verification
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP pin_id:", insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Code envoyé par SMS",
        pinId: termiiResult.pinId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
