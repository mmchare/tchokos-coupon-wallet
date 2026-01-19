import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserActivity {
  product_id: string;
  activity_type: string;
  product_name?: string;
  category?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

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
    const { user_id } = await req.json();

    // Rate limiting by user_id or IP
    const clientId = user_id || getClientIdentifier(req);
    const rateLimit = checkRateLimit(`ai-recommendations:${clientId}`, RATE_LIMITS.AI_RECOMMENDATIONS);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for AI recommendations: ${clientId}`);
      return rateLimitResponse(rateLimit.resetIn, corsHeaders);
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating AI recommendations for user:', user_id);

    // Fetch user activity from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: userActivity, error: activityError } = await supabase
      .from('user_activity')
      .select('product_id, activity_type')
      .eq('user_id', user_id)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      console.error('Error fetching user activity:', activityError);
    }

    // Fetch all available products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, price, description')
      .gt('stock_available', 0)
      .limit(50);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Failed to fetch products');
    }

    // Enrich activity with product details
    const activityProductIds = userActivity?.map(a => a.product_id) || [];
    const { data: activityProducts } = await supabase
      .from('products')
      .select('id, name, category')
      .in('id', activityProductIds);

    const productMap = new Map(activityProducts?.map(p => [p.id, p]) || []);
    
    const enrichedActivity: UserActivity[] = userActivity?.map(a => ({
      ...a,
      product_name: productMap.get(a.product_id)?.name,
      category: productMap.get(a.product_id)?.category
    })) || [];

    // Build activity summary for AI
    const activitySummary = {
      viewed: enrichedActivity.filter(a => a.activity_type === 'VIEW').map(a => ({ name: a.product_name, category: a.category })),
      clicked: enrichedActivity.filter(a => a.activity_type === 'CLICK').map(a => ({ name: a.product_name, category: a.category })),
      addedToCart: enrichedActivity.filter(a => a.activity_type === 'ADD_TO_CART').map(a => ({ name: a.product_name, category: a.category })),
      purchased: enrichedActivity.filter(a => a.activity_type === 'PURCHASE').map(a => ({ name: a.product_name, category: a.category }))
    };

    // Build product catalog for AI
    const productCatalog = products?.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price
    })) || [];

    // Build the AI prompt
    const prompt = `Tu es un expert en recommandation de produits pour JinBao Smart Market, une plateforme e-commerce de gadgets tech premium.

Ton rôle est d'analyser le comportement d'un utilisateur et de recommander les produits les plus pertinents du catalogue.

RÈGLES:
1. Recommande 6-10 produits maximum
2. Priorise les produits similaires à ceux achetés ou ajoutés au panier
3. Suggère des produits complémentaires (cross-sell)
4. Inclus quelques produits tendance pour la découverte
5. Pour chaque recommandation, explique brièvement pourquoi (en français)
6. Retourne UNIQUEMENT un JSON valide, pas de texte avant ou après

FORMAT DE RÉPONSE (JSON strict):
{
  "recommendations": [
    {
      "product_id": "uuid",
      "reason": "Raison courte en français",
      "score": 0.95,
      "type": "similar|crosssell|trending"
    }
  ],
  "personalization_message": "Message personnalisé court pour l'utilisateur"
}

Voici le comportement de l'utilisateur:

ACTIVITÉ RÉCENTE:
- Produits consultés: ${JSON.stringify(activitySummary.viewed.slice(0, 10))}
- Produits cliqués: ${JSON.stringify(activitySummary.clicked.slice(0, 10))}
- Ajoutés au panier: ${JSON.stringify(activitySummary.addedToCart.slice(0, 5))}
- Achetés: ${JSON.stringify(activitySummary.purchased.slice(0, 5))}

CATALOGUE DISPONIBLE:
${JSON.stringify(productCatalog)}

Génère des recommandations personnalisées basées sur ce comportement.`;

    console.log('Calling Mistral AI for recommendations...');

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
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Mistral API error:', aiResponse.status, errorText);
      
      // Fallback: return top products from catalog
      const fallbackRecommendations = productCatalog.slice(0, 6).map(p => ({
        product_id: p.id,
        reason: 'Produit populaire',
        score: 0.8,
        type: 'trending'
      }));
      
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: fallbackRecommendations,
          personalization_message: 'Découvrez nos meilleures offres',
          has_activity: enrichedActivity.length > 0
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
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      recommendations = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiContent);
      
      // Fallback: return top products from catalog
      recommendations = {
        recommendations: productCatalog.slice(0, 6).map(p => ({
          product_id: p.id,
          reason: 'Produit populaire',
          score: 0.8,
          type: 'trending'
        })),
        personalization_message: 'Découvrez nos meilleures offres'
      };
    }

    // Validate and filter recommendations to only include valid product IDs
    const validProductIds = new Set(productCatalog.map(p => p.id));
    const validRecommendations = recommendations.recommendations?.filter(
      (r: any) => validProductIds.has(r.product_id)
    ) || [];

    console.log(`Returning ${validRecommendations.length} AI recommendations`);

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: validRecommendations,
        personalization_message: recommendations.personalization_message || 'Sélection personnalisée pour vous',
        has_activity: enrichedActivity.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI recommendations error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: [],
        personalization_message: 'Découvrez notre catalogue'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
