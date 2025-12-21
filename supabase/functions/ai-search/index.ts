import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ products: [], message: "Requête trop courte" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Search query:', query);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, description, price, original_price, category, images, is_auction')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw new Error('Erreur base de données');
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ products: [], message: "Aucun produit disponible" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for Mistral API key
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY not configured');
      // Fallback to simple text search
      const simpleResults = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
      );
      return new Response(
        JSON.stringify({ products: simpleResults.slice(0, 10), ai_used: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productList = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description?.substring(0, 100),
      price: p.price,
      category: p.category,
    }));

    const prompt = `Tu es un assistant de recherche pour JinBao Smart Market (marketplace de gadgets tech).

L'utilisateur cherche: "${query}"

Voici les produits disponibles:
${JSON.stringify(productList, null, 2)}

Analyse la requête de l'utilisateur (qui peut être en langage naturel comme "un téléphone pas cher" ou "accessoire pour ordinateur") et retourne les IDs des produits les plus pertinents.

Retourne UNIQUEMENT un JSON valide avec ce format:
{
  "matching_ids": ["id1", "id2", ...],
  "interpretation": "ce que l'utilisateur recherche en une phrase"
}

Maximum 10 produits. Si aucun produit ne correspond, retourne un tableau vide.`;

    // Call Mistral API
    console.log('Calling Mistral API...');
    const aiResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Mistral API error:', aiResponse.status, errorText);
      // Fallback to simple search
      const simpleResults = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      return new Response(
        JSON.stringify({ products: simpleResults.slice(0, 10), ai_used: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    console.log('Mistral search response:', content.substring(0, 200));

    // Parse AI response
    let matchingIds: string[] = [];
    let interpretation = '';
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        matchingIds = parsed.matching_ids || [];
        interpretation = parsed.interpretation || '';
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // Filter products by matching IDs (preserve order from AI)
    const matchedProducts = matchingIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);

    console.log(`AI search found ${matchedProducts.length} products for: "${query}"`);

    return new Response(
      JSON.stringify({ 
        products: matchedProducts,
        interpretation,
        ai_used: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, products: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
