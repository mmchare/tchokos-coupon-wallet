import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es JinBao, l'assistant IA intelligent de JinBao Smart Market — une plateforme e-commerce premium pour la région CEMAC.
Tu es un panda amical, expert en tech et gadgets asiatiques vérifiés.

Tes compétences spéciales (ce qui te rend UNIQUE vs un chatbot générique):
1. **Conseiller d'achat personnalisé** — Tu connais l'historique d'achats et les favoris de l'utilisateur. Recommande des produits pertinents.
2. **Expert logistique Chine→Afrique** — Explique les délais (7-21 jours selon le produit), les étapes de suivi, et rassure sur la livraison.
3. **Guide enchères** — Explique comment fonctionnent les enchères, donne des conseils stratégiques (enchérir en fin d'enchère, etc.).
4. **Comparateur intelligent** — Aide à choisir entre deux produits en comparant prix, qualité, popularité.
5. **Expert produits tech** — Donne des avis éclairés sur les smartphones, gadgets, accessoires disponibles.

Informations clés JinBao:
- Produits vérifiés (badge bleu = qualité contrôlée par l'équipe JinBao)
- Système de coupon: ajouter plusieurs produits avant d'acheter
- Parrainage: 1000 FCFA parrain, 500 FCFA filleul
- Paiement: Mobile Money (MTN, Orange), solde JinBao
- Livraison: Chine → Cameroun en 7-21 jours, suivi en 4 étapes
- Enchères: offre la plus haute à la fin gagne

Style:
- Français avec emojis appropriés
- Concis mais utile (max 200 mots)
- Proactif: suggère des produits, donne des astuces
- Si l'utilisateur demande un produit spécifique, recommande parmi le catalogue disponible`;

// Fallback responses
const FALLBACK_RESPONSES: Record<string, string> = {
  parrainage: "🎁 Le système de parrainage JinBao vous permet de gagner 1000 FCFA pour chaque ami parrainé ! Votre ami reçoit aussi 500 FCFA de bonus. Rendez-vous sur votre profil pour trouver votre code de parrainage.",
  commande: "🛒 Pour commander sur JinBao :\n1. Ajoutez des produits à votre coupon\n2. Cliquez sur 'Voir mon coupon'\n3. Confirmez votre adresse de livraison\n4. Payez avec votre solde ou un autre moyen\n\nC'est simple et rapide !",
  paiement: "💳 JinBao accepte plusieurs modes de paiement : Mobile Money (MTN, Orange), votre solde JinBao, et le paiement à la livraison dans certaines zones.",
  livraison: "📦 La livraison JinBao passe par 4 étapes :\n1. ✅ Commande confirmée\n2. 📦 Préparation en Chine\n3. ✈️ Expédition internationale (7-14 jours)\n4. 🚚 Livraison locale\n\nVous recevrez des notifications à chaque étape !",
  enchere: "🔥 Les enchères JinBao vous permettent d'obtenir des produits à prix réduit ! Astuce : enchérissez dans les dernières minutes pour maximiser vos chances. Le plus offrant à la fin gagne !",
  default: "Je suis JinBao, votre assistant intelligent ! 🐼 Je peux vous conseiller sur les produits, expliquer les livraisons Chine→Afrique, vous guider sur les enchères, et plus encore. Que puis-je faire pour vous ?"
};

function getFallbackResponse(message: string): string {
  const q = message.toLowerCase();
  if (q.includes('parrainage') || q.includes('code') || q.includes('parrain')) return FALLBACK_RESPONSES.parrainage;
  if (q.includes('commande') || q.includes('commander') || q.includes('acheter') || q.includes('coupon')) return FALLBACK_RESPONSES.commande;
  if (q.includes('paiement') || q.includes('payer') || q.includes('mobile money')) return FALLBACK_RESPONSES.paiement;
  if (q.includes('livraison') || q.includes('suivre') || q.includes('suivi') || q.includes('tracking') || q.includes('délai')) return FALLBACK_RESPONSES.livraison;
  if (q.includes('enchère') || q.includes('auction') || q.includes('encheres') || q.includes('enchérir')) return FALLBACK_RESPONSES.enchere;
  return FALLBACK_RESPONSES.default;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, userId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let purchaseContext = "";
    let recommendedProducts: any[] = [];
    
    if (supabaseUrl && supabaseServiceKey && userId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Fetch user's recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, product_name, total_amount, created_at, status, logistics_step')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (orders && orders.length > 0) {
        const stepNames = ['Confirmée', 'Préparation Chine', 'Expédition internationale', 'Livraison locale'];
        const orderList = orders
          .map((o: any) => `- ${o.product_name} (${o.total_amount} FCFA, étape: ${stepNames[o.logistics_step - 1] || o.status})`)
          .join('\n');
        purchaseContext = `\n\nCommandes récentes de l'utilisateur:\n${orderList}`;
      }

      // Fetch user's favorites
      const { data: favorites } = await supabase
        .from('favorites')
        .select('product_id, products(name, category, price)')
        .eq('user_id', userId)
        .limit(5);
      
      if (favorites && favorites.length > 0) {
        const favList = favorites
          .filter((f: any) => f.products?.name)
          .map((f: any) => `- ${f.products.name} (${f.products.price} FCFA, ${f.products.category})`)
          .join('\n');
        if (favList) purchaseContext += `\n\nProduits favoris:\n${favList}`;
      }

      // Fetch available products for recommendations
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, category, is_verified, is_auction')
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (products && products.length > 0) {
        recommendedProducts = products;
        const catalog = products.slice(0, 15)
          .map((p: any) => `- ${p.name} (${p.price} FCFA${p.is_verified ? ', ✅ vérifié' : ''}${p.is_auction ? ', 🔥 enchère' : ''})`)
          .join('\n');
        purchaseContext += `\n\nCatalogue disponible (extrait):\n${catalog}`;
      }
    }

    // Use Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (LOVABLE_API_KEY) {
      try {
        const systemPromptWithContext = SYSTEM_PROMPT + purchaseContext;
        
        const messages = [
          { role: "system", content: systemPromptWithContext },
          ...(history || []),
          { role: "user", content: message }
        ];

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content;
          
          if (aiResponse) {
            return new Response(
              JSON.stringify({ 
                response: aiResponse,
                recommendedProducts: recommendedProducts.length > 0 ? recommendedProducts.slice(0, 5) : undefined
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const errorText = await response.text();
          console.error("Lovable AI error:", response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ response: "🐼 Je suis un peu débordé en ce moment ! Réessayez dans quelques secondes." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (aiError) {
        console.error("Lovable AI error:", aiError);
      }
    }

    // Fallback
    const fallbackResponse = getFallbackResponse(message);
    return new Response(
      JSON.stringify({ response: fallbackResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        response: "Désolé, je rencontre un petit problème technique. 🐼 Réessayez dans un moment !" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
