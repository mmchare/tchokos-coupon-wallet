import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(prompt: string, provider: "lovable" | "mistral", apiKey: string): Promise<string> {
  const url = provider === "lovable"
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://api.mistral.ai/v1/chat/completions";

  const model = provider === "lovable" ? "google/gemini-2.5-flash" : "mistral-small-latest";

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a precise translator for an e-commerce platform. Always return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429 || response.status === 402) {
      throw { rateLimited: true, provider, status: response.status };
    }
    throw new Error(`${provider} AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function translateWithFallback(prompt: string, lovableKey: string, mistralKey: string) {
  const providers: Array<{ name: "lovable" | "mistral"; key: string }> = [];
  if (lovableKey) providers.push({ name: "lovable", key: lovableKey });
  if (mistralKey) providers.push({ name: "mistral", key: mistralKey });

  for (const p of providers) {
    try {
      const content = await callAI(prompt, p.name, p.key);
      return { content, provider: p.name };
    } catch (e: any) {
      if (e?.rateLimited) {
        console.log(`${p.name} rate-limited (${e.status}), trying next...`);
        continue;
      }
      throw e;
    }
  }
  throw new Error("All AI providers rate-limited");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productId } = await req.json();
    if (!productId) throw new Error("productId is required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const mistralKey = Deno.env.get("MISTRAL_API_KEY") || "";

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("id, name, description, category")
      .eq("id", productId)
      .single();

    if (fetchError || !product) throw new Error("Product not found");

    const prompt = `Translate the following product information from French to English and Mandarin Chinese. Return ONLY a valid JSON object with these exact keys: name_en, name_zh, description_en, description_zh. Keep translations natural and suitable for e-commerce.

Product name (French): ${product.name}
Product description (French): ${product.description || "N/A"}

Rules:
- If description is "N/A", set description_en and description_zh to null
- Keep brand names, model numbers, and technical specs unchanged
- For Chinese, use Simplified Chinese characters
- Return ONLY the JSON object, no markdown, no explanation`;

    const { content, provider } = await translateWithFallback(prompt, lovableKey, mistralKey);

    const cleaned = content.replace(/[\x00-\x1F\x7F]/g, (ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
      return '';
    });
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const translations = JSON.parse(jsonMatch[0]);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name_en: translations.name_en || null,
        name_zh: translations.name_zh || null,
        description_en: translations.description_en || null,
        description_zh: translations.description_zh || null,
      })
      .eq("id", productId);

    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, translations, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-product error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
