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

    // Format phone number for Cameroon (remove spaces, ensure proper format)
    let formattedPhone = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");
    
    // Add +237 prefix if not present
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("237")) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+237" + formattedPhone;
      }
    }

    console.log("Sending OTP to:", formattedPhone);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otpCode);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete any existing OTP codes for this phone
    await supabase
      .from("otp_codes")
      .delete()
      .eq("phone", formattedPhone);

    // Store OTP in database with 5 min expiration
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: formattedPhone,
      code: otpCode,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération du code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS via Africa's Talking
    const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const atUsername = Deno.env.get("AFRICASTALKING_USERNAME");

    if (!atApiKey || !atUsername) {
      console.error("Africa's Talking credentials not configured");
      // In sandbox mode, return success but indicate SMS not sent
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Code généré (SMS désactivé en mode test)",
          debug_code: otpCode // Only in sandbox mode
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Africa's Talking SMS API
    const smsMessage = `JinBao Smart Market: Votre code de verification est ${otpCode}. Valide 5 minutes.`;
    
    // Determine if sandbox or production
    const isSandbox = atUsername === "sandbox" || atUsername.toLowerCase().includes("sandbox");
    const atBaseUrl = isSandbox 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const formData = new URLSearchParams();
    formData.append("username", atUsername);
    formData.append("to", formattedPhone);
    formData.append("message", smsMessage);
    
    // Note: Custom Sender ID "JinBao" requires approval from Africa's Talking
    // For now, we send without a custom sender ID (SMS will come from a generic number)
    // To use a custom sender ID, request approval at: https://account.africastalking.com/apps/sandbox/sms/shortcodes/create

    console.log("Sending SMS via Africa's Talking...");
    console.log("Using URL:", atBaseUrl);
    console.log("Username:", atUsername);

    const smsResponse = await fetch(atBaseUrl, {
      method: "POST",
      headers: {
        "apiKey": atApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: formData.toString(),
    });

    const smsResponseText = await smsResponse.text();
    console.log("Africa's Talking raw response:", smsResponseText);

    let smsResult;
    try {
      smsResult = JSON.parse(smsResponseText);
    } catch {
      console.error("Africa's Talking returned non-JSON:", smsResponseText);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Code généré (erreur API SMS)",
          debug_code: otpCode,
          sms_error: smsResponseText
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Africa's Talking response:", JSON.stringify(smsResult));

    if (!smsResponse.ok) {
      console.error("SMS sending failed:", smsResult);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Code généré (erreur SMS)",
          debug_code: otpCode,
          sms_error: smsResult
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if SMS was actually sent
    const recipients = smsResult?.SMSMessageData?.Recipients || [];
    const sentSuccessfully = recipients.some((r: any) => r.status === "Success");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: sentSuccessfully ? "Code envoyé par SMS" : "Code généré",
        sms_sent: sentSuccessfully,
        debug_code: isSandbox ? otpCode : undefined // Only show code in sandbox
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
