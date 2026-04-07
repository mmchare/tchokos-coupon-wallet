import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const convertYuanToFCFA = (yuanPrice: number): number => Math.round(yuanPrice * 85 + 2000);

const cleanJsonString = (str: string): string => {
  let cleaned = str.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return '{}';
  cleaned = jsonMatch[0];
  cleaned = cleaned.replace(/:\s*"([^"]*)"/g, (_m, content) => {
    return `: "${content.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/[\x00-\x1F\x7F]/g, ' ')}"`;
  });
  return cleaned;
};

const detectPlatform = (url: string): string => {
  if (url.includes('goofish.com') || url.includes('xianyu') || url.includes('2.taobao.com')) return 'goofish';
  if (url.includes('1688.com')) return '1688';
  if (url.includes('taobao.com') || url.includes('tmall.com')) return 'taobao';
  if (url.includes('jd.com')) return 'jd';
  return 'generic';
};

// Extract item ID from Goofish/Xianyu URL
const extractGoofishItemId = (url: string): string | null => {
  const match = url.match(/[?&]id=(\d+)/);
  return match ? match[1] : null;
};

// Try to fetch Goofish product data via their internal API
const scrapeGoofishDirect = async (itemId: string): Promise<any> => {
  try {
    console.log(`Trying Goofish direct API for item ${itemId}...`);
    
    // Try the H5 API endpoint
    const apiUrl = `https://h5api.m.goofish.com/h5/mtop.taobao.idle.pc.detail/1.0/?itemId=${itemId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.goofish.com/',
      },
    });

    if (response.ok) {
      const text = await response.text();
      // Try to parse JSONP or JSON
      let data;
      const jsonpMatch = text.match(/mtopjsonp\d*\(([\s\S]+)\)/);
      if (jsonpMatch) {
        data = JSON.parse(jsonpMatch[1]);
      } else {
        try { data = JSON.parse(text); } catch { data = null; }
      }
      
      if (data?.data) {
        const detail = data.data;
        return {
          title: detail.title || detail.itemDO?.title || '',
          description: detail.desc || detail.itemDO?.desc || '',
          priceText: detail.price || detail.itemDO?.price || '0',
          images: detail.images || detail.itemDO?.images || [],
        };
      }
    }
    
    // Try mobile page as alternative (sometimes has visible data in JSON)
    console.log('Trying Goofish mobile page...');
    const mobileUrl = `https://m.goofish.com/item?id=${itemId}`;
    const mobileResp = await fetch(mobileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });
    
    if (mobileResp.ok) {
      const html = await mobileResp.text();
      
      // Extract JSON data embedded in the page
      const dataMatch = html.match(/__NEXT_DATA__.*?=\s*(\{[\s\S]*?\})\s*<\/script>/) ||
                        html.match(/window\.__data__\s*=\s*(\{[\s\S]*?\});/) ||
                        html.match(/window\.g_config\s*=\s*(\{[\s\S]*?\});/) ||
                        html.match(/"itemDO"\s*:\s*(\{[^}]+\})/);
      
      if (dataMatch) {
        try {
          const pageData = JSON.parse(dataMatch[1]);
          const item = pageData?.props?.pageProps?.itemDetail || 
                      pageData?.props?.pageProps?.item ||
                      pageData?.itemDetail ||
                      pageData;
          
          if (item?.title || item?.itemDO?.title) {
            return {
              title: item.title || item.itemDO?.title || '',
              description: item.desc || item.itemDO?.desc || '',
              priceText: item.price || item.soldPrice || item.itemDO?.price || '0',
              images: item.images || item.itemDO?.images || [],
            };
          }
        } catch { /* continue */ }
      }
      
      // Try extracting from script tags with specific patterns
      const titleMatch = html.match(/"title"\s*:\s*"([^"]+)"/) ||
                         html.match(/"itemTitle"\s*:\s*"([^"]+)"/);
      const priceMatch = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/) ||
                         html.match(/"soldPrice"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
      const imgMatches = [...html.matchAll(/"(?:images|picUrl|imageUrl)"\s*:\s*"([^"]+)"/g)];
      const imgArrayMatch = html.match(/"images"\s*:\s*\[([^\]]+)\]/);
      
      let images: string[] = [];
      if (imgArrayMatch) {
        images = imgArrayMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
      }
      if (images.length === 0 && imgMatches.length > 0) {
        images = imgMatches.map(m => m[1]).filter(u => u.startsWith('http'));
      }
      
      if (titleMatch) {
        return {
          title: titleMatch[1],
          description: '',
          priceText: priceMatch ? priceMatch[1] : '0',
          images,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Goofish direct scraping error:', error);
    return null;
  }
};

// Scrape with Apify Cheerio (fast, no JS rendering)
const scrapeWithApify = async (url: string, apifyKey: string) => {
  console.log('Starting Apify Cheerio scraper...');
  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token=${apifyKey}&timeout=30`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          pageFunction: `async function pageFunction(context) {
            const { $, request } = context;
            
            const title = $('h1').first().text().trim() || 
                         $('[class*="title"]').first().text().trim() || 
                         $('title').text().trim();
            
            const description = $('[class*="desc"]').first().text().trim() || 
                               $('meta[name="description"]').attr('content') || '';
            
            let priceText = '0';
            $('[class*="price"], [class*="Price"]').each((i, el) => {
              const text = $(el).text();
              const match = text.match(/[\\d.,]+/);
              if (match && parseFloat(match[0]) > 0) {
                priceText = match[0];
                return false;
              }
            });
            
            // Also check script tags for structured data
            const scripts = $('script').toArray();
            for (const s of scripts) {
              const content = $(s).html() || '';
              if (priceText === '0') {
                const pm = content.match(/"price"\\s*:\\s*"?(\\d+\\.?\\d*)"?/);
                if (pm) priceText = pm[1];
              }
            }
            
            const images = [];
            $('img').each((i, el) => {
              let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
              if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
                if (!images.includes(src) && images.length < 10) images.push(src);
              }
            });
            
            // Also get images from JSON-LD
            const jsonLd = $('script[type="application/ld+json"]').first().html();
            if (jsonLd) {
              try {
                const ld = JSON.parse(jsonLd);
                if (ld.image) {
                  const ldImages = Array.isArray(ld.image) ? ld.image : [ld.image];
                  ldImages.forEach(img => { if (!images.includes(img)) images.push(img); });
                }
                if (!title && ld.name) return { url: request.url, title: ld.name, description: ld.description || description, priceText: ld.offers?.price || priceText, images };
              } catch {}
            }
            
            return { url: request.url, title, description, priceText, images };
          }`,
          proxyConfiguration: { useApifyProxy: true },
          maxRequestsPerCrawl: 1,
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.length > 0 && !data[0]['#error']) return data[0];
    } else {
      console.error('Apify Cheerio failed:', response.status);
    }
  } catch (err) {
    console.error('Apify error:', err);
  }
  return null;
};

// Simple fetch fallback (no Apify needed)
const scrapeSimple = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract from JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        if (ld.name) {
          return {
            title: ld.name,
            description: ld.description || '',
            priceText: ld.offers?.price || '0',
            images: Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [],
          };
        }
      } catch { /* continue */ }
    }
    
    // Extract from embedded data
    const titleFromData = html.match(/"title"\s*:\s*"([^"]{5,})"/)
    const priceFromData = html.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/);
    const imgMatches = [...html.matchAll(/(?:src|data-src)=["']([^"']*(?:alicdn|taobao|tbcdn|1688)[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)];
    const images = [...new Set(imgMatches.map(m => m[1].startsWith('//') ? 'https:' + m[1] : m[1]))].slice(0, 10);
    
    return {
      title: titleFromData?.[1] || title,
      description: html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] || '',
      priceText: priceFromData?.[1] || '0',
      images,
    };
  } catch (error) {
    console.error('Simple scraping failed:', error);
    return null;
  }
};

// Upload image to Storage
const uploadImageToStorage = async (supabase: any, imageUrl: string, index: number): Promise<string | null> => {
  try {
    let cleanUrl = imageUrl.trim();
    if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
    cleanUrl = cleanUrl.replace(/_\d+x\d+\.[a-z]+$/i, '.jpg').replace(/\.jpg_\d+x\d+\.jpg$/i, '.jpg');
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': 'https://www.goofish.com/',
      },
    });

    if (!response.ok) return cleanUrl;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `imports/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;
    const uint8Array = new Uint8Array(await response.arrayBuffer());

    const { error } = await supabase.storage.from('product-media').upload(fileName, uint8Array, { contentType, upsert: false });
    if (error) { console.error('Upload error:', error); return cleanUrl; }

    return supabase.storage.from('product-media').getPublicUrl(fileName).data.publicUrl;
  } catch (error) {
    console.error(`Image upload error ${index}:`, error);
    return imageUrl;
  }
};

const isDataValid = (title: string, images: string[]): boolean => {
  const genericTitles = ['闲鱼', '淘宝', '1688', '京东', '拼多多'];
  for (const g of genericTitles) {
    if (title.includes(g) && title.length < 20) return false;
  }
  return title.length > 3 && (images.length > 0 || title.length > 10);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(`magic-import:${clientId}`, RATE_LIMITS.MAGIC_IMPORT);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetIn, corsHeaders);

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Processing:', url);
    const platform = detectPlatform(url);
    console.log('Platform:', platform);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Check duplicate
    const { data: existing } = await supabase.from('products').select('id, name').eq('source_link', url).single();
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: `Ce produit existe déjà: "${existing.name}"`, duplicate: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let rawTitle = '', rawDescription = '', rawPriceText = '0', rawImages: string[] = [];

    // === STRATEGY 1: Platform-specific direct scraping ===
    if (platform === 'goofish') {
      const itemId = extractGoofishItemId(url);
      if (itemId) {
        const directData = await scrapeGoofishDirect(itemId);
        if (directData && directData.title) {
          rawTitle = directData.title;
          rawDescription = directData.description || '';
          rawPriceText = directData.priceText || '0';
          rawImages = directData.images || [];
          console.log('Goofish direct data:', { title: rawTitle.substring(0, 50), price: rawPriceText, images: rawImages.length });
        }
      }
    }

    // === STRATEGY 2: Simple fetch (fast, no dependency) ===
    if (!isDataValid(rawTitle, rawImages)) {
      console.log('Trying simple fetch...');
      const simpleData = await scrapeSimple(url);
      if (simpleData && isDataValid(simpleData.title, simpleData.images)) {
        rawTitle = simpleData.title;
        rawDescription = simpleData.description || rawDescription;
        rawPriceText = simpleData.priceText || rawPriceText;
        rawImages = simpleData.images.length > rawImages.length ? simpleData.images : rawImages;
      }
    }

    // === STRATEGY 3: Apify Cheerio (if available, better extraction) ===
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    if (!isDataValid(rawTitle, rawImages) && apifyKey) {
      const apifyData = await scrapeWithApify(url, apifyKey);
      if (apifyData && isDataValid(apifyData.title || '', apifyData.images || [])) {
        rawTitle = apifyData.title || rawTitle;
        rawDescription = apifyData.description || rawDescription;
        rawPriceText = apifyData.priceText || rawPriceText;
        rawImages = (apifyData.images?.length || 0) > rawImages.length ? apifyData.images : rawImages;
      }
    }

    console.log('Final data:', { title: rawTitle.substring(0, 60), price: rawPriceText, images: rawImages.length });

    // If no valid data at all
    if (!rawTitle && rawImages.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: platform === 'goofish' 
          ? 'Impossible de récupérer ce produit Goofish. Ce site nécessite souvent une connexion. Veuillez copier les infos manuellement.'
          : 'Erreur de récupération : veuillez vérifier le lien ou remplir manuellement.',
        needsManual: true,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Price conversion
    const priceYuan = parseFloat(rawPriceText.replace(/[^\d.]/g, '')) || 0;
    const priceFCFA = convertYuanToFCFA(priceYuan);
    console.log(`Price: ${priceYuan}¥ -> ${priceFCFA} FCFA`);

    // Mistral AI processing
    const mistralKey = Deno.env.get('MISTRAL_API_KEY');
    let processedTitle = rawTitle, processedDescription = rawDescription, suggestedCategory = '';

    if (mistralKey && rawTitle) {
      console.log('Processing with Mistral...');
      try {
        const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: `Tu es un expert e-commerce africain. Traduis et adapte ce produit chinois pour le marché camerounais.

PRODUIT: ${rawTitle}
DESCRIPTION: ${rawDescription.substring(0, 300)}
PRIX: ${priceYuan}¥ (${priceFCFA} FCFA)

Réponds en JSON uniquement:
{"title": "titre en français (max 80 chars)", "description": "description en français (max 400 chars)", "category": "une de: Électronique, Mode & Vêtements, Maison & Jardin, Beauté & Santé, Sport & Loisirs, Jouets & Enfants, Accessoires, Sacs & Bagages, Montres & Bijoux, Auto & Moto, Audio, Gaming, Photo, Ordinateurs, Iphones, Samsung, Xiaomi"}` }],
            temperature: 0.3,
            max_tokens: 400,
          }),
        });

        if (resp.ok) {
          const d = await resp.json();
          const content = d.choices?.[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(cleanJsonString(content));
            processedTitle = parsed.title || rawTitle;
            processedDescription = parsed.description || rawDescription;
            suggestedCategory = parsed.category || '';
          } catch { console.error('Mistral parse error'); }
        }
      } catch (e) { console.error('Mistral error:', e); }
    }

    // Upload images
    const uploadedImages: string[] = [];
    for (let i = 0; i < Math.min(rawImages.length, 8); i++) {
      const uploaded = await uploadImageToStorage(supabase, rawImages[i], i);
      if (uploaded) uploadedImages.push(uploaded);
    }
    console.log(`Uploaded ${uploadedImages.length} images`);

    return new Response(JSON.stringify({
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
      platform,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Magic import error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
