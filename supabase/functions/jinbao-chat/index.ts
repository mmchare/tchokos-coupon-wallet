import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es JinBao, la mascotte adorable et serviable de la plateforme JinBao Smart Market. 
Tu es un panda amical et enthousiaste qui aide les utilisateurs à comprendre et utiliser la plateforme.

Informations sur JinBao Smart Market:
- Plateforme e-commerce pour la région CEMAC (Cameroun, Gabon, Congo, etc.)
- Système de coupon unique: les utilisateurs ajoutent des produits à leur coupon avant d'acheter
- Système de parrainage: 1000 FCFA pour le parrain, 500 FCFA pour le filleul
- Modes de paiement: Mobile Money (MTN, Orange), solde JinBao, paiement à la livraison
- Enchères exclusives sur certains produits
- Recherche intelligente avec IA
- Livraison dans toute la région CEMAC
- Application PWA installable sur mobile

Ton style:
- Réponds toujours en français
- Sois amical, enthousiaste et utilise des emojis appropriés
- Donne des réponses concises mais complètes
- Si tu ne connais pas la réponse, suggère de contacter le support
- Utilise des listes numérotées pour les étapes
- Maximum 150 mots par réponse
- Quand tu recommandes des produits, base-toi sur l'historique d'achat de l'utilisateur`;

// Fallback responses for common questions
const FALLBACK_RESPONSES: Record<string, string> = {
  parrainage: "🎁 Le système de parrainage JinBao vous permet de gagner 1000 FCFA pour chaque ami parrainé ! Votre ami reçoit aussi 500 FCFA de bonus. Rendez-vous sur votre profil pour trouver votre code de parrainage.",
  commande: "🛒 Pour commander sur JinBao :\n1. Ajoutez des produits à votre coupon\n2. Cliquez sur 'Voir mon coupon'\n3. Confirmez votre adresse de livraison\n4. Payez avec votre solde ou un autre moyen\n\nC'est simple et rapide !",
  paiement: "💳 JinBao accepte plusieurs modes de paiement : Mobile Money (MTN, Orange), votre solde JinBao, et le paiement à la livraison dans certaines zones.",
  livraison: "📦 Nous livrons dans toute la région CEMAC ! Suivez votre commande dans la section 'Mes commandes'. Vous recevrez des notifications à chaque étape.",
  enchere: "🔥 Les enchères JinBao vous permettent d'obtenir des produits à prix réduit ! Placez votre offre et si vous êtes le plus offrant à la fin du temps imparti, le produit est à vous !",
  default: "Je suis JinBao, votre assistant ! 🐼 Je peux vous aider avec vos commandes, le parrainage, les paiements et plus encore. N'hésitez pas à me poser des questions !"
};

function getFallbackResponse(message: string): string {
  const q = message.toLowerCase();
  
  if (q.includes('parrainage') || q.includes('code') || q.includes('parrain')) {
    return FALLBACK_RESPONSES.parrainage;
  }
  if (q.includes('commande') || q.includes('commander') || q.includes('acheter') || q.includes('coupon')) {
    return FALLBACK_RESPONSES.commande;
  }
  if (q.includes('paiement') || q.includes('payer') || q.includes('mobile money')) {
    return FALLBACK_RESPONSES.paiement;
  }
  if (q.includes('livraison') || q.includes('suivre') || q.includes('suivi') || q.includes('tracking')) {
    return FALLBACK_RESPONSES.livraison;
  }
  if (q.includes('enchère') || q.includes('auction') || q.includes('encheres')) {
    return FALLBACK_RESPONSES.enchere;
  }
  
  return FALLBACK_RESPONSES.default;
}

interface OrderWithProduct {
  id: string;
  product_name: string | null;
  total_amount: number;
  created_at: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS
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

    // Initialize Supabase client for fetching user data
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let purchaseContext = "";
    let recommendedProducts: Product[] = [];
    
    if (supabaseUrl && supabaseServiceKey && userId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Fetch user's recent orders for context
      const { data: orders } = await supabase
        .from('orders')
        .select('id, product_name, total_amount, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (orders && orders.length > 0) {
        const orderList = (orders as OrderWithProduct[])
          .map(o => `- ${o.product_name} (${o.total_amount} FCFA, ${o.status})`)
          .join('\n');
        purchaseContext = `\n\nHistorique d'achats récents de l'utilisateur:\n${orderList}`;
        
        // Get categories from purchased products for recommendations
        const purchasedNames = orders
          .filter(o => o.product_name)
          .map(o => o.product_name!.toLowerCase());
        
        // Fetch similar products for recommendations
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, category')
          .limit(50);
        
        if (products && products.length > 0) {
          // Find products similar to what user bought
          recommendedProducts = (products as Product[])
            .filter(p => !purchasedNames.some(pn => p.name.toLowerCase().includes(pn)))
            .slice(0, 5);
          
          if (recommendedProducts.length > 0) {
            const recList = recommendedProducts
              .map(p => `- ${p.name} (${p.price} FCFA)`)
              .join('\n');
            purchaseContext += `\n\nProduits recommandés pour cet utilisateur:\n${recList}`;
          }
        }
      }
      
      // Fetch user's favorites for additional context
      const { data: favorites } = await supabase
        .from('favorites')
        .select('product_id, products(name, category)')
        .eq('user_id', userId)
        .limit(5);
      
      if (favorites && favorites.length > 0) {
        const favList = favorites
          .filter((f: any) => f.products?.name)
          .map((f: any) => `- ${f.products.name}`)
          .join('\n');
        if (favList) {
          purchaseContext += `\n\nProduits favoris de l'utilisateur:\n${favList}`;
        }
      }
    }

    // Try to use Mistral AI if available
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    
    if (MISTRAL_API_KEY) {
      try {
        const systemPromptWithContext = SYSTEM_PROMPT + purchaseContext;
        
        const messages = [
          { role: "system", content: systemPromptWithContext },
          ...(history || []),
          { role: "user", content: message }
        ];

        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages,
            max_tokens: 400,
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
                recommendedProducts: recommendedProducts.length > 0 ? recommendedProducts : undefined
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const errorText = await response.text();
          console.error("Mistral API error:", response.status, errorText);
        }
      } catch (aiError) {
        console.error("Mistral API error:", aiError);
        // Fall through to fallback
      }
    }

    // Use fallback responses
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
