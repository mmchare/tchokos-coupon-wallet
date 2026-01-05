import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price conversion: Yuan * 85 + 2000 FCFA
const convertYuanToFCFA = (yuanPrice: number): number => {
  return Math.round(yuanPrice * 85 + 2000);
};

// Download image and upload to Supabase Storage
const uploadImageToStorage = async (
  supabase: any,
  imageUrl: string,
  index: number
): Promise<string | null> => {
  try {
    console.log(`Downloading image ${index + 1}: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `imports/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(fileName, uint8Array, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('product-media')
      .getPublicUrl(fileName);

    console.log(`Uploaded image ${index + 1}: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error uploading image ${index}:`, error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing URL:', url);

    // Check for duplicate URL in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, name')
      .eq('source_link', url)
      .single();

    if (existingProduct) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Ce produit existe déjà: "${existingProduct.name}"`,
          duplicate: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape with Apify
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    if (!apifyKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'APIFY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Apify scraping...');

    // Use Apify's web scraper actor for Xianyu
    const apifyResponse = await fetch(
      'https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=' + apifyKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          pageFunction: `async function pageFunction(context) {
            const { page, request } = context;
            await page.waitForTimeout(3000);
            
            // Extract product data from Xianyu/Taobao/1688
            const title = await page.evaluate(() => {
              const selectors = [
                'h1', '.title', '[class*="title"]', '[class*="Title"]',
                '.product-title', '.item-title', '.goods-title'
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim()) return el.textContent.trim();
              }
              return document.title || '';
            });
            
            const description = await page.evaluate(() => {
              const selectors = [
                '.description', '[class*="desc"]', '[class*="Desc"]',
                '.detail', '[class*="detail"]', '.content'
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim()) return el.textContent.trim();
              }
              return '';
            });
            
            const priceText = await page.evaluate(() => {
              const selectors = [
                '.price', '[class*="price"]', '[class*="Price"]',
                '.money', '[class*="amount"]'
              ];
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) {
                  const match = el.textContent.match(/[\\d.,]+/);
                  if (match) return match[0];
                }
              }
              return '0';
            });
            
            const images = await page.evaluate(() => {
              const imgs = [];
              const imgElements = document.querySelectorAll('img[src*="alicdn"], img[src*="taobao"], img[src*="1688"], img[src*="xianyu"], .gallery img, .slider img, [class*="image"] img, [class*="gallery"] img');
              imgElements.forEach(img => {
                let src = img.src || img.dataset.src || img.getAttribute('data-lazy-src');
                if (src && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon')) {
                  if (src.startsWith('//')) src = 'https:' + src;
                  if (!imgs.includes(src) && imgs.length < 10) imgs.push(src);
                }
              });
              return imgs;
            });
            
            return {
              url: request.url,
              title,
              description,
              priceText,
              images
            };
          }`,
          proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
          maxRequestsPerCrawl: 1,
        }),
      }
    );

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('Apify error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erreur de récupération : veuillez vérifier le lien ou remplir manuellement' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapedData = await apifyResponse.json();
    console.log('Scraped data:', JSON.stringify(scrapedData, null, 2));

    if (!scrapedData || scrapedData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucune donnée extraite. Veuillez remplir manuellement.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const item = scrapedData[0];
    const rawTitle = item.title || '';
    const rawDescription = item.description || '';
    const rawPriceText = item.priceText || '0';
    const rawImages = item.images || [];

    // Parse price (Yuan)
    const priceYuan = parseFloat(rawPriceText.replace(/[^\d.]/g, '')) || 0;
    const priceFCFA = convertYuanToFCFA(priceYuan);

    console.log(`Price conversion: ${priceYuan} Yuan -> ${priceFCFA} FCFA`);

    // Step 2: Translate and rewrite with Mistral AI
    const mistralKey = Deno.env.get('MISTRAL_API_KEY');
    if (!mistralKey) {
      // Return raw data without AI processing
      console.log('No Mistral API key, returning raw data');
      
      // Upload images to Supabase Storage
      const uploadedImages: string[] = [];
      for (let i = 0; i < Math.min(rawImages.length, 5); i++) {
        const uploadedUrl = await uploadImageToStorage(supabase, rawImages[i], i);
        if (uploadedUrl) uploadedImages.push(uploadedUrl);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            name: rawTitle,
            description: rawDescription,
            price: priceFCFA,
            original_price: Math.round(priceFCFA * 1.2),
            images: uploadedImages,
            source_link: url,
            category: '',
          },
          ai_processed: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing with Mistral AI...');

    const mistralPrompt = `Tu es un expert en e-commerce africain. Analyse ce produit chinois et crée une fiche produit professionnelle en français pour le marché africain/camerounais.

DONNÉES BRUTES:
- Titre: ${rawTitle}
- Description: ${rawDescription}
- Prix original: ${priceYuan} Yuan (${priceFCFA} FCFA après conversion)

INSTRUCTIONS:
1. Traduis le titre du chinois vers le français de manière claire et commerciale
2. Réécris la description pour qu'elle soit:
   - Professionnelle et rassurante
   - Structurée avec des points clés
   - Adaptée au marché africain
   - Avec un ton tech/moderne
3. Suggère une catégorie parmi: Électronique, Mode & Vêtements, Maison & Jardin, Beauté & Santé, Sport & Loisirs, Jouets & Enfants, Accessoires, Sacs & Bagages, Montres & Bijoux, Auto & Moto

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "title": "Titre traduit et optimisé",
  "description": "Description reformulée professionnelle avec points clés",
  "category": "Catégorie suggérée"
}`;

    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'user', content: mistralPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    let processedTitle = rawTitle;
    let processedDescription = rawDescription;
    let suggestedCategory = '';

    if (mistralResponse.ok) {
      const mistralData = await mistralResponse.json();
      const aiContent = mistralData.choices?.[0]?.message?.content || '';
      
      console.log('Mistral response:', aiContent);

      try {
        // Extract JSON from response
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          processedTitle = parsed.title || rawTitle;
          processedDescription = parsed.description || rawDescription;
          suggestedCategory = parsed.category || '';
        }
      } catch (parseError) {
        console.error('Error parsing Mistral response:', parseError);
      }
    } else {
      console.error('Mistral API error:', await mistralResponse.text());
    }

    // Step 3: Upload images to Supabase Storage
    console.log('Uploading images to Supabase Storage...');
    const uploadedImages: string[] = [];
    
    for (let i = 0; i < Math.min(rawImages.length, 5); i++) {
      const uploadedUrl = await uploadImageToStorage(supabase, rawImages[i], i);
      if (uploadedUrl) {
        uploadedImages.push(uploadedUrl);
      }
    }

    console.log(`Uploaded ${uploadedImages.length} images`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: processedTitle,
          description: processedDescription,
          price: priceFCFA,
          original_price: Math.round(priceFCFA * 1.2),
          images: uploadedImages,
          source_link: url,
          category: suggestedCategory,
        },
        ai_processed: true,
        raw: {
          title: rawTitle,
          description: rawDescription,
          priceYuan,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Magic import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
