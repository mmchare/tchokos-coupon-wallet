import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRANSLATION_PROMPT = (name: string, description: string | null) =>
  `Translate the following product information from French to English and Mandarin Chinese. Return ONLY a valid JSON object with these exact keys: name_en, name_zh, description_en, description_zh.

Product name (French): ${name}
Product description (French): ${description || "N/A"}

Rules:
- If description is "N/A", set description_en and description_zh to null
- Keep brand names, model numbers, technical specs, and emojis unchanged
- For Chinese, use Simplified Chinese characters
- Return ONLY the JSON object, no markdown, no explanation`;

async function callLovableAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  if (!response.ok) {
    const status = response.status;
    if (status === 429 || status === 402) {
      throw new Error(`LOVABLE_RATE_LIMIT:${status}`);
    }
    throw new Error(`Lovable AI error: ${status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callMistralAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: "You are a precise translator for an e-commerce platform. Always return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseTranslation(rawContent: string) {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { limit = 10 } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY") || "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, name, description")
      .is("name_en", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, translated: 0, message: "All products already translated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let translated = 0;
    const errors: string[] = [];
    let useMistral = false;

    for (const product of products) {
      try {
        const prompt = TRANSLATION_PROMPT(product.name, product.description);
        let rawContent: string;

        if (!useMistral) {
          try {
            rawContent = await callLovableAI(prompt, lovableApiKey);
          } catch (e: any) {
            if (e.message?.startsWith("LOVABLE_RATE_LIMIT") && mistralApiKey) {
              console.log("Lovable AI rate limited, switching to Mistral");
              useMistral = true;
              rawContent = await callMistralAI(prompt, mistralApiKey);
            } else {
              throw e;
            }
          }
        } else {
          rawContent = await callMistralAI(prompt, mistralApiKey);
        }

        const translations = parseTranslation(rawContent);

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
        translated++;
        console.log(`Translated ${translated}/${products.length}: ${product.name} (via ${useMistral ? 'Mistral' : 'Lovable AI'})`);
      } catch (e: any) {
        errors.push(`${product.id}: ${e.message}`);
        console.error(`Failed to translate ${product.id}:`, e.message);
      }

      // Delay between requests
      if (translated < products.length) {
        await new Promise(resolve => setTimeout(resolve, useMistral ? 2000 : 4000));
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      total: products.length, 
      translated, 
      provider: useMistral ? "mistral" : "lovable",
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
