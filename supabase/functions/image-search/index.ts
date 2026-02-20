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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Use Gemini to analyze the image and extract search keywords
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Analyze this product image. Return ONLY a JSON object with: {\"keywords\": \"short search terms for finding this product\", \"description\": \"one sentence description in French of what the product is\"}. No markdown, no code blocks, just the JSON."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
            ],
          }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini error:", errText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    let keywords = "";
    let description = "";
    try {
      const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      keywords = parsed.keywords || "";
      description = parsed.description || "";
    } catch {
      keywords = rawText.slice(0, 100);
      description = "Produit identifié par image";
    }

    // Search products using extracted keywords
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const searchTerms = keywords.toLowerCase().split(/[\s,]+/).filter((t: string) => t.length > 2);
    
    let query = supabase.from("products").select("id, name, description, price, original_price, category, images, is_auction");
    
    if (searchTerms.length > 0) {
      const orConditions = searchTerms
        .map((term: string) => `name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
        .join(",");
      query = query.or(orConditions);
    }

    const { data: products, error } = await query.limit(20);

    if (error) {
      console.error("Search error:", error);
      throw new Error("Database search failed");
    }

    return new Response(
      JSON.stringify({
        products: products || [],
        interpretation: description,
        keywords,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image search error:", error);
    return new Response(
      JSON.stringify({ error: error.message, products: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
