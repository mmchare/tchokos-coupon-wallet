import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { limit = 5 } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all products without translations
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, name, description")
      .is("name_en", null)
      .order("created_at", { ascending: false });

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, translated: 0, message: "All products already translated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let translated = 0;
    const errors: string[] = [];

    // Process in batches of 3 to avoid rate limits
    for (let i = 0; i < products.length; i += 3) {
      const batch = products.slice(i, i + 3);
      
      const results = await Promise.allSettled(
        batch.map(async (product) => {
          const prompt = `Translate the following product information from French to English and Mandarin Chinese. Return ONLY a valid JSON object with these exact keys: name_en, name_zh, description_en, description_zh.

Product name (French): ${product.name}
Product description (French): ${product.description || "N/A"}

Rules:
- If description is "N/A", set description_en and description_zh to null
- Keep brand names, model numbers, technical specs, and emojis unchanged
- For Chinese, use Simplified Chinese characters
- Return ONLY the JSON object, no markdown, no explanation`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a precise translator for an e-commerce platform. Always return valid JSON only." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`AI error ${aiResponse.status} for product ${product.id}`);
          }

          const aiData = await aiResponse.json();
          const rawContent = aiData.choices?.[0]?.message?.content || "";

          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error(`No JSON for product ${product.id}`);
          const translations = JSON.parse(jsonMatch[0]);

          const { error: updateError } = await supabase
            .from("products")
            .update({
              name_en: translations.name_en || null,
              name_zh: translations.name_zh || null,
              description_en: translations.description_en || null,
              description_zh: translations.description_zh || null,
            })
            .eq("id", product.id);

          if (updateError) throw new Error(`Update failed for ${product.id}: ${updateError.message}`);
          return product.id;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") translated++;
        else errors.push(r.reason?.message || "Unknown error");
      }

      // Small delay between batches to respect rate limits
      if (i + 3 < products.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: products.length, 
      translated, 
      errors: errors.length > 0 ? errors : undefined 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("batch-translate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
