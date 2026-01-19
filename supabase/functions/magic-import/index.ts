import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price conversion: Yuan * 85 + 2000 FCFA
const convertYuanToFCFA = (yuanPrice: number): number => {
  return Math.round(yuanPrice * 85 + 2000);
};

// Clean JSON string from Mistral response
const cleanJsonString = (str: string): string => {
  // Remove markdown code blocks
  let cleaned = str.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  
  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return '{}';
  
  cleaned = jsonMatch[0];
  
  // Replace problematic characters in string values
  // This handles newlines and special chars inside JSON strings
  cleaned = cleaned.replace(/:\s*"([^"]*)"/g, (match, content) => {
    const cleanedContent = content
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
    return `: "${cleanedContent}"`;
  });
  
  return cleaned;
};

// Download image and upload to Supabase Storage
const uploadImageToStorage = async (
  supabase: any,
  imageUrl: string,
  index: number
): Promise<string | null> => {
  try {
    // Clean image URL
    let cleanUrl = imageUrl.trim();
    if (cleanUrl.startsWith('//')) {
      cleanUrl = 'https:' + cleanUrl;
    }
    
    // Remove size suffixes for Alibaba/Taobao images to get full size
    cleanUrl = cleanUrl.replace(/_\d+x\d+\.[a-z]+$/i, '.jpg');
    cleanUrl = cleanUrl.replace(/\.jpg_\d+x\d+\.jpg$/i, '.jpg');
    
    console.log(`Downloading image ${index + 1}: ${cleanUrl}`);
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.taobao.com/',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return cleanUrl; // Return original URL as fallback
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
      return cleanUrl; // Return original URL as fallback
    }

    const { data } = supabase.storage
      .from('product-media')
      .getPublicUrl(fileName);

    console.log(`Uploaded image ${index + 1}: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error uploading image ${index}:`, error);
    return imageUrl; // Return original URL as fallback
  }
};

// Alternative scraping using Apify's Cheerio Scraper (more reliable)
const scrapeWithCheerioScraper = async (url: string, apifyKey: string) => {
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          
          // Generic selectors for Chinese e-commerce sites
          const title = $('h1').first().text().trim() || 
                       $('[class*="title"]').first().text().trim() || 
                       $('title').text().trim();
          
          const description = $('[class*="desc"]').first().text().trim() || 
                             $('[class*="detail"]').first().text().trim() || 
                             $('[class*="content"]').first().text().trim();
          
          // Price extraction
          let priceText = '0';
          $('[class*="price"], [class*="Price"]').each((i, el) => {
            const text = $(el).text();
            const match = text.match(/[\\d.,]+/);
            if (match && parseFloat(match[0]) > 0) {
              priceText = match[0];
              return false;
            }
          });
          
          // Image extraction
          const images = [];
          $('img').each((i, el) => {
            let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
            if (src && (src.includes('alicdn') || src.includes('taobao') || src.includes('1688') || src.includes('tbcdn'))) {
              if (src.startsWith('//')) src = 'https:' + src;
              if (!images.includes(src) && images.length < 10) {
                images.push(src);
              }
            }
          });
          
          return { url: request.url, title, description, priceText, images };
        }`,
        proxyConfiguration: { useApifyProxy: true },
        maxRequestsPerCrawl: 1,
      }),
    }
  );
  
  return response;
};

// Use Firecrawl-style simple scraping as fallback
const scrapeSimple = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extract data using regex patterns for Chinese e-commerce sites
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract images from alicdn/taobao URLs
    const imageMatches = html.matchAll(/(?:src|data-src)=["']([^"']*(?:alicdn|taobao|tbcdn)[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi);
    const images: string[] = [];
    for (const match of imageMatches) {
      let imgUrl = match[1];
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      if (!images.includes(imgUrl) && images.length < 10) {
        images.push(imgUrl);
      }
    }
    
    // Extract price
    const priceMatch = html.match(/["']?price["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)/i) ||
                       html.match(/¥\s*(\d+(?:\.\d+)?)/);
    const priceText = priceMatch ? priceMatch[1] : '0';
    
    // Extract description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1] : '';
    
    return { title, description, priceText, images };
  } catch (error) {
    console.error('Simple scraping failed:', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(`magic-import:${clientId}`, RATE_LIMITS.MAGIC_IMPORT);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for magic import: ${clientId}`);
      return rateLimitResponse(rateLimit.resetIn, corsHeaders);
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing URL:', url);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate URL
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

    let rawTitle = '';
    let rawDescription = '';
    let rawPriceText = '0';
    let rawImages: string[] = [];

    // Try Apify first
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    
    if (apifyKey) {
      console.log('Starting Apify scraping...');
      
      try {
        const apifyResponse = await scrapeWithCheerioScraper(url, apifyKey);
        
        if (apifyResponse.ok) {
          const scrapedData = await apifyResponse.json();
          console.log('Apify scraped data:', JSON.stringify(scrapedData, null, 2));
          
          if (scrapedData && scrapedData.length > 0 && !scrapedData[0]['#error']) {
            const item = scrapedData[0];
            rawTitle = item.title || '';
            rawDescription = item.description || '';
            rawPriceText = item.priceText || '0';
            rawImages = item.images || [];
          }
        }
      } catch (apifyError) {
        console.error('Apify scraping failed:', apifyError);
      }
    }

    // Fallback to simple scraping if Apify failed or returned no data
    if (!rawTitle && !rawImages.length) {
      console.log('Trying simple scraping fallback...');
      const simpleData = await scrapeSimple(url);
      
      if (simpleData) {
        rawTitle = simpleData.title || rawTitle;
        rawDescription = simpleData.description || rawDescription;
        rawPriceText = simpleData.priceText || rawPriceText;
        rawImages = simpleData.images.length > 0 ? simpleData.images : rawImages;
      }
    }

    console.log('Final scraped data:', { rawTitle, rawDescription, rawPriceText, imageCount: rawImages.length });

    // Parse price (Yuan)
    const priceYuan = parseFloat(rawPriceText.replace(/[^\d.]/g, '')) || 0;
    const priceFCFA = convertYuanToFCFA(priceYuan);

    console.log(`Price conversion: ${priceYuan} Yuan -> ${priceFCFA} FCFA`);

    // Process with Mistral AI
    const mistralKey = Deno.env.get('MISTRAL_API_KEY');
    let processedTitle = rawTitle;
    let processedDescription = rawDescription;
    let suggestedCategory = '';

    if (mistralKey && (rawTitle || rawDescription)) {
      console.log('Processing with Mistral AI...');

      const mistralPrompt = `Tu es un expert en e-commerce africain. Analyse ce produit chinois et crée une fiche produit professionnelle en français pour le marché africain/camerounais.

DONNÉES BRUTES:
- Titre: ${rawTitle}
- Description: ${rawDescription}
- Prix original: ${priceYuan} Yuan (${priceFCFA} FCFA après conversion)

INSTRUCTIONS:
1. Traduis le titre du chinois vers le français de manière claire et commerciale (max 100 caractères)
2. Réécris la description en français professionnel (max 500 caractères, sans emojis ni caractères spéciaux)
3. Suggère une catégorie parmi: Électronique, Mode, Maison, Beauté, Sport, Jouets, Accessoires, Sacs, Montres, Auto

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans caractères de contrôle, sans sauts de ligne dans les valeurs:
{"title": "titre traduit", "description": "description courte sans saut de ligne", "category": "catégorie"}`;

      try {
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mistralKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: mistralPrompt }],
            temperature: 0.3, // Lower temperature for more consistent JSON
            max_tokens: 500,
          }),
        });

        if (mistralResponse.ok) {
          const mistralData = await mistralResponse.json();
          const aiContent = mistralData.choices?.[0]?.message?.content || '';
          
          console.log('Mistral raw response:', aiContent);

          try {
            const cleanedJson = cleanJsonString(aiContent);
            console.log('Cleaned JSON:', cleanedJson);
            
            const parsed = JSON.parse(cleanedJson);
            processedTitle = parsed.title || rawTitle;
            processedDescription = parsed.description || rawDescription;
            suggestedCategory = parsed.category || '';
            
            console.log('Mistral parsed successfully');
          } catch (parseError) {
            console.error('Error parsing Mistral response:', parseError);
            // Keep raw values
          }
        } else {
          console.error('Mistral API error:', await mistralResponse.text());
        }
      } catch (mistralError) {
        console.error('Mistral processing failed:', mistralError);
      }
    }

    // Upload images to Supabase Storage
    console.log('Uploading images to Supabase Storage...');
    const uploadedImages: string[] = [];
    
    for (let i = 0; i < Math.min(rawImages.length, 5); i++) {
      const uploadedUrl = await uploadImageToStorage(supabase, rawImages[i], i);
      if (uploadedUrl) {
        uploadedImages.push(uploadedUrl);
      }
    }

    console.log(`Uploaded ${uploadedImages.length} images`);

    // If still no data, return error with helpful message
    if (!processedTitle && !processedDescription && uploadedImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Impossible de récupérer les données. Le site peut être protégé. Veuillez remplir manuellement.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: processedTitle || 'Nouveau produit importé',
          description: processedDescription || 'Description à compléter',
          price: priceFCFA,
          original_price: priceFCFA > 2000 ? Math.round(priceFCFA * 1.2) : priceFCFA + 3000,
          images: uploadedImages,
          source_link: url,
          category: suggestedCategory,
        },
        ai_processed: !!mistralKey,
        raw: {
          title: rawTitle,
          description: rawDescription,
          priceYuan,
          imageCount: rawImages.length,
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
