import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  newStep: number;
  newStatus: string;
  stepLabel: string;
}

const STEP_MESSAGES: Record<number, { subject: string; title: string; message: string; emoji: string }> = {
  1: {
    subject: "✅ Votre commande est confirmée !",
    title: "Commande Confirmée",
    message: "Votre commande a été confirmée et sera bientôt préparée pour l'expédition.",
    emoji: "✅"
  },
  2: {
    subject: "📦 Votre commande est en préparation",
    title: "Préparation en Cours",
    message: "Votre commande est actuellement en cours de préparation dans notre entrepôt en Chine.",
    emoji: "📦"
  },
  3: {
    subject: "✈️ Votre commande est en route !",
    title: "Expédition Internationale",
    message: "Votre commande a quitté la Chine et est en route vers le Bénin. Livraison estimée sous 7-14 jours.",
    emoji: "✈️"
  },
  4: {
    subject: "🚚 Votre commande arrive bientôt !",
    title: "Livraison Locale",
    message: "Votre commande est arrivée au Bénin et sera bientôt livrée à votre adresse.",
    emoji: "🚚"
  },
  5: {
    subject: "🎉 Votre commande a été livrée !",
    title: "Commande Livrée",
    message: "Votre commande a été livrée avec succès ! Merci pour votre confiance.",
    emoji: "🎉"
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, newStep, newStatus, stepLabel }: OrderNotificationRequest = await req.json();
    console.log(`Processing notification for order ${orderId}, step ${newStep}`);

    // Get step message configuration
    const stepConfig = STEP_MESSAGES[newStep];
    if (!stepConfig) {
      console.log(`No email configured for step ${newStep}`);
      return new Response(
        JSON.stringify({ success: true, message: "No email for this step" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client to fetch order and user details
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, profiles:user_id(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(order.user_id);
    
    if (authError || !authUser?.user?.email) {
      console.error("Error fetching user email:", authError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = authUser.user.email;
    const userName = order.profiles?.full_name || "Cher client";
    const productName = order.product_name || "Votre produit";

    console.log(`Sending email to ${userEmail} for order ${orderId}`);

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${stepConfig.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">金宝 JinBao</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Votre passerelle vers les produits chinois</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 48px;">${stepConfig.emoji}</span>
        <h2 style="color: #111827; margin: 20px 0 10px 0; font-size: 24px;">${stepConfig.title}</h2>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Bonjour <strong>${userName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
        ${stepConfig.message}
      </p>
      
      <!-- Order Details Box -->
      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 16px;">Détails de la commande</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Produit:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right; font-weight: 600;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Montant:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right; font-weight: 600;">${order.total_amount.toLocaleString()} FCFA</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Statut:</td>
            <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right; font-weight: 600;">${stepLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Livraison:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${order.city}</td>
          </tr>
        </table>
      </div>
      
      <!-- Progress Steps -->
      <div style="margin-bottom: 30px;">
        <h4 style="color: #111827; margin: 0 0 15px 0; font-size: 14px; text-align: center;">Suivi de votre commande</h4>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${[1, 2, 3, 4, 5].map(step => `
            <div style="text-align: center; flex: 1;">
              <div style="width: 30px; height: 30px; border-radius: 50%; background-color: ${step <= newStep ? '#dc2626' : '#e5e7eb'}; color: ${step <= newStep ? '#ffffff' : '#9ca3af'}; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;">${step}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="https://jinbao-shopping.lovable.app/orders" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Voir ma commande
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
        Besoin d'aide ? Contactez-nous via WhatsApp
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © 2025 JinBao. Tous droits réservés.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "JinBao <onboarding@resend.dev>",
      to: [userEmail],
      subject: stepConfig.subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
