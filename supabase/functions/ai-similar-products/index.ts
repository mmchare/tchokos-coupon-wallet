import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');

    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { product_id, user_id } = await req.json();

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'product_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating AI similar products for:', product_id);

    // Fetch current product details
    const { data: currentProduct, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !currentProduct) {
      console.error('Error fetching current product:', productError);
      throw new Error('Product not found');
    }

    // Fetch all other products
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, price, description, images')
      .neq('id', product_id)
      .gt('stock_available', 0)
      .limit(30);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Failed to fetch products');
    }

    // Fetch user activity if user_id is provided
    let userContext = '';
    if (user_id) {
      const { data: userActivity } = await supabase
        .from('user_activity')
        .select('product_id, activity_type')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (userActivity && userActivity.length > 0) {
        const viewedIds = userActivity.filter(a => a.activity_type === 'VIEW').map(a => a.product_id);
        const { data: viewedProducts } = await supabase
          .from('products')
          .select('name, category')
          .in('id', viewedIds);

        if (viewedProducts && viewedProducts.length > 0) {
          userContext = `
L'utilisateur a récemment consulté:
${viewedProducts.slice(0, 5).map(p => `- ${p.name} (${p.category})`).join('\n')}
`;
        }
      }
    }

    // Build product catalog for AI
    const productCatalog = allProducts?.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Autres',
      price: p.price,
      description: p.description?.substring(0, 100) || ''
    })) || [];

    // Build the AI prompt
    const prompt = `Tu es un expert en recommandation de produits pour JinBao Smart Market.

Ton rôle est de suggérer des produits SIMILAIRES et COMPLÉMENTAIRES à un produit donné.

RÈGLES:
1. Recommande 6 produits maximum
2. Priorise les produits de la même catégorie ou complémentaires
3. Prends en compte le prix (produits dans une gamme similaire ±50%)
4. Si l'utilisateur a un historique, personnalise les suggestions
5. Pour chaque recommandation, donne une raison courte
6. Retourne UNIQUEMENT un JSON valide

FORMAT DE RÉPONSE (JSON strict):
{
  "similar_products": [
    {
      "product_id": "uuid",
      "reason": "Raison courte en français",
      "relevance_score": 0.95
    }
  ]
}

PRODUIT ACTUEL:
- Nom: ${currentProduct.name}
- Catégorie: ${currentProduct.category || 'Non catégorisé'}
- Prix: ${currentProduct.price} F
- Description: ${currentProduct.description?.substring(0, 200) || 'Pas de description'}
${userContext}
CATALOGUE DISPONIBLE:
${JSON.stringify(productCatalog)}

Suggère des produits similaires ou complémentaires pertinents.`;

    console.log('Calling Mistral AI for similar products...');

    // Call Mistral API
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
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Mistral API error:', aiResponse.status, errorText);
      
      // Fallback: return products from same category
      const sameCategoryProducts = productCatalog
        .filter(p => p.category === currentProduct.category)
        .slice(0, 6);
      
      return new Response(
        JSON.stringify({
          success: true,
          similar_products: sameCategoryProducts.map(p => ({
            product_id: p.id,
            reason: 'Même catégorie',
            relevance_score: 0.7
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('Mistral response received:', aiContent.substring(0, 200));

    // Parse AI response
    let recommendations;
    try {
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      recommendations = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback: return products from same category
      const sameCategoryProducts = productCatalog
        .filter(p => p.category === currentProduct.category)
        .slice(0, 6);
      
      recommendations = {
        similar_products: sameCategoryProducts.map(p => ({
          product_id: p.id,
          reason: 'Même catégorie',
          relevance_score: 0.7
        }))
      };
    }

    // Validate recommendations
    const validProductIds = new Set(productCatalog.map(p => p.id));
    const validRecommendations = recommendations.similar_products?.filter(
      (r: any) => validProductIds.has(r.product_id)
    ) || [];

    console.log(`Returning ${validRecommendations.length} AI similar products`);

    return new Response(
      JSON.stringify({
        success: true,
        similar_products: validRecommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI similar products error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        similar_products: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
