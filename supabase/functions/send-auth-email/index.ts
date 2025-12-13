import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  token: string;
  type: "magic_link" | "signup" | "recovery";
  redirectTo?: string;
}

const getEmailContent = (type: string, confirmLink: string, userName?: string) => {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;

  const logoSection = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 36px; font-weight: bold; color: #E2231A; margin: 0;">JinBao</h1>
      <p style="font-size: 12px; color: #666; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Smart Market</p>
    </div>
  `;

  const footerSection = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} JinBao Smart Market - Premium Tech • Confiance • Efficacité
      </p>
      <p style="color: #999; font-size: 11px; margin-top: 10px;">
        Si vous n'avez pas demandé cet email, vous pouvez l'ignorer en toute sécurité.
      </p>
    </div>
  `;

  const buttonStyle = `
    display: inline-block;
    background-color: #E2231A;
    color: white;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    font-size: 16px;
  `;

  if (type === "magic_link" || type === "signup") {
    const greeting = userName ? `Bonjour ${userName},` : "Bonjour,";
    const title = type === "signup" ? "Bienvenue sur JinBao ! 🎉" : "Connexion à JinBao";
    const subtitle = type === "signup" 
      ? "Merci de rejoindre notre communauté de passionnés de tech !"
      : "Cliquez sur le bouton ci-dessous pour vous connecter à votre compte.";

    return {
      subject: type === "signup" ? "Bienvenue sur JinBao Smart Market ! 🎉" : "Votre lien de connexion JinBao",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            ${logoSection}
            
            <h2 style="color: #333; font-size: 22px; margin-bottom: 10px; text-align: center;">${title}</h2>
            <p style="color: #666; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
              ${greeting}<br>${subtitle}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}" style="${buttonStyle}">
                ${type === "signup" ? "Activer mon compte" : "Me connecter"}
              </a>
            </div>
            
            <p style="color: #999; font-size: 13px; text-align: center; margin-top: 20px;">
              Ce lien est valide pendant 24 heures.
            </p>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; margin-top: 25px;">
              <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${confirmLink}" style="color: #E2231A; word-break: break-all; font-size: 11px;">${confirmLink}</a>
              </p>
            </div>
            
            ${footerSection}
          </div>
        </body>
        </html>
      `,
    };
  }

  // Password recovery
  return {
    subject: "Réinitialisation de votre mot de passe JinBao",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="${baseStyles} background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          ${logoSection}
          
          <h2 style="color: #333; font-size: 22px; margin-bottom: 10px; text-align: center;">Réinitialisation du mot de passe</h2>
          <p style="color: #666; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
            Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmLink}" style="${buttonStyle}">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          ${footerSection}
        </div>
      </body>
      </html>
    `,
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, type, redirectTo }: AuthEmailRequest = await req.json();

    console.log(`Sending ${type} email to ${email}`);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Build the confirmation link pointing to your production site
    const siteUrl = redirectTo || "https://pinbaoo.vercel.app";
    const confirmLink = `${siteUrl}/auth?token=${token}&type=${type}`;

    const { subject, html } = getEmailContent(type, confirmLink);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "JinBao Smart Market <noreply@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending auth email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
