import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, condition, description } = await req.json();

    if (!productName || !condition) {
      return new Response(JSON.stringify({ error: "Nom du produit et état requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch similar products from DB for context
    const { data: similarProducts } = await supabase
      .from("products")
      .select("name, price, original_price, category")
      .ilike("name", `%${productName.split(" ")[0]}%`)
      .limit(10);

    // Also fetch by category keywords
    const keywords = productName.toLowerCase().split(" ");
    let categoryProducts: any[] = [];
    for (const kw of keywords) {
      if (kw.length < 3) continue;
      const { data } = await supabase
        .from("products")
        .select("name, price, original_price, category")
        .ilike("category", `%${kw}%`)
        .limit(5);
      if (data) categoryProducts.push(...data);
    }

    const allProducts = [...(similarProducts || []), ...categoryProducts];
    const uniqueProducts = allProducts.filter((p, i, arr) => 
      arr.findIndex(x => x.name === p.name) === i
    ).slice(0, 15);

    const productsContext = uniqueProducts.length > 0
      ? uniqueProducts.map(p => `- ${p.name}: ${p.price} FCFA${p.original_price ? ` (ancien: ${p.original_price} FCFA)` : ''}`).join("\n")
      : "Aucun produit similaire trouvé dans la base.";

    const conditionLabels: Record<string, string> = {
      new: "Neuf",
      likenew: "Comme neuf",
      good: "Bon état",
      used: "Usagé",
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en estimation de prix de produits d'occasion au Cameroun. Les prix sont en FCFA.
Tu dois répondre UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format: {"low": number, "mid": number, "high": number, "reasoning": "string"}
- low = prix minimum raisonnable
- mid = prix recommandé de vente
- high = prix maximum possible
- reasoning = courte explication de l'estimation (2-3 phrases max)`,
          },
          {
            role: "user",
            content: `Estime le prix de ce produit:
Nom: ${productName}
État: ${conditionLabels[condition] || condition}
Détails: ${description || "Aucun"}

Produits similaires sur notre plateforme JinBao:
${productsContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "price_estimate",
              description: "Return a price estimation with low, mid, high values in FCFA",
              parameters: {
                type: "object",
                properties: {
                  low: { type: "number", description: "Minimum reasonable price in FCFA" },
                  mid: { type: "number", description: "Recommended selling price in FCFA" },
                  high: { type: "number", description: "Maximum possible price in FCFA" },
                  reasoning: { type: "string", description: "Short explanation of the estimation" },
                },
                required: ["low", "mid", "high", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "price_estimate" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let estimate;
    if (toolCall?.function?.arguments) {
      estimate = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content
      const content = aiData.choices?.[0]?.message?.content || "";
      estimate = JSON.parse(content);
    }

    return new Response(JSON.stringify({
      low: Math.round(estimate.low),
      mid: Math.round(estimate.mid),
      high: Math.round(estimate.high),
      reasoning: estimate.reasoning,
      similarProducts: uniqueProducts.slice(0, 5),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Price estimate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
