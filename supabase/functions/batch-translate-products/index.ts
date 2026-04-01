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

type Provider = "lovable" | "mistral";

interface ProviderState {
  current: Provider;
  lovableBlockedUntil: number;
  mistralBlockedUntil: number;
  consecutiveFails: Record<Provider, number>;
}

const state: ProviderState = {
  current: "lovable",
  lovableBlockedUntil: 0,
  mistralBlockedUntil: 0,
  consecutiveFails: { lovable: 0, mistral: 0 },
};

function getAvailableProvider(): Provider | null {
  const now = Date.now();
  const lovableOk = now >= state.lovableBlockedUntil;
  const mistralOk = now >= state.mistralBlockedUntil;

  if (lovableOk && mistralOk) return state.current;
  if (lovableOk) return "lovable";
  if (mistralOk) return "mistral";
  return null; // both blocked
}

function markRateLimited(provider: Provider) {
  state.consecutiveFails[provider]++;
  // Exponential backoff: 15s, 30s, 60s, 120s max
  const backoff = Math.min(15000 * Math.pow(2, state.consecutiveFails[provider] - 1), 120000);
  const until = Date.now() + backoff;

  if (provider === "lovable") {
    state.lovableBlockedUntil = until;
  } else {
    state.mistralBlockedUntil = until;
  }

  // Switch to the other provider
  state.current = provider === "lovable" ? "mistral" : "lovable";
  console.log(`${provider} rate-limited, switching to ${state.current} (backoff: ${backoff / 1000}s)`);
}

function markSuccess(provider: Provider) {
  state.consecutiveFails[provider] = 0;
}

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
    if (response.status === 429 || response.status === 402) {
      throw { rateLimited: true, status: response.status };
    }
    throw new Error(`Lovable AI error: ${response.status}`);
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
    if (response.status === 429) {
      throw { rateLimited: true, status: response.status };
    }
    throw new Error(`Mistral AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function translate(prompt: string, lovableKey: string, mistralKey: string): Promise<{ content: string; provider: Provider }> {
  // Try up to 2 providers
  for (let attempt = 0; attempt < 2; attempt++) {
    const provider = getAvailableProvider();
    if (!provider) {
      // Both blocked — wait for the shortest cooldown
      const waitMs = Math.min(state.lovableBlockedUntil, state.mistralBlockedUntil) - Date.now();
      if (waitMs > 0) {
        console.log(`Both providers blocked, waiting ${Math.ceil(waitMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs + 500));
      }
      // Retry with the one that unblocks first
      const retryProvider = getAvailableProvider();
      if (!retryProvider) throw new Error("All AI providers rate-limited");
      return translate(prompt, lovableKey, mistralKey);
    }

    try {
      const content = provider === "lovable"
        ? await callLovableAI(prompt, lovableKey)
        : await callMistralAI(prompt, mistralKey);
      markSuccess(provider);
      return { content, provider };
    } catch (e: any) {
      if (e?.rateLimited) {
        markRateLimited(provider);
        continue; // try other provider
      }
      throw e; // non-rate-limit error, propagate
    }
  }

  throw new Error("All AI providers exhausted");
}

function parseTranslation(rawContent: string) {
  // Clean control characters that can break JSON.parse
  const cleaned = rawContent.replace(/[\x00-\x1F\x7F]/g, (ch) => {
    if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
    return '';
  });
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { limit = 5 } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY") || "";

    if (!lovableApiKey && !mistralApiKey) {
      throw new Error("No AI provider API key configured");
    }

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
    const providersUsed = new Set<string>();

    for (const product of products) {
      try {
        const prompt = TRANSLATION_PROMPT(product.name, product.description);
        const { content, provider } = await translate(prompt, lovableApiKey, mistralApiKey);
        providersUsed.add(provider);

        const translations = parseTranslation(content);

        const { error: updateError } = await supabase
          .from("products")
          .update({
            name_en: translations.name_en || null,
            name_zh: translations.name_zh || null,
            description_en: translations.description_en || null,
            description_zh: translations.description_zh || null,
          })
          .eq("id", product.id);

        if (updateError) throw new Error(`Update failed: ${updateError.message}`);
        translated++;
        console.log(`✓ ${translated}/${products.length} "${product.name}" via ${provider}`);
      } catch (e: any) {
        const msg = e?.message || "Unknown error";
        errors.push(`${product.id}: ${msg}`);
        console.error(`✗ "${product.name}": ${msg}`);
      }

      // Delay between requests (shorter since we handle rate limits smartly)
      if (translated < products.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: products.length,
      translated,
      providers: [...providersUsed],
      errors: errors.length > 0 ? errors : undefined,
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
