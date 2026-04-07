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

// Clean JSON string from AI response
const cleanJsonString = (str: string): string => {
  let cleaned = str.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return '{}';
  cleaned = jsonMatch[0];
  cleaned = cleaned.replace(/:\s*"([^"]*)"/g, (_match, content) => {
    const cleanedContent = content
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F]/g, ' ');
    return `: "${cleanedContent}"`;
  });
  return cleaned;
};

// Detect which platform from URL
const detectPlatform = (url: string): string => {
  if (url.includes('goofish.com') || url.includes('xianyu') || url.includes('2.taobao.com')) return 'goofish';
  if (url.includes('1688.com')) return '1688';
  if (url.includes('taobao.com') || url.includes('tmall.com')) return 'taobao';
  if (url.includes('jd.com')) return 'jd';
  if (url.includes('pinduoduo') || url.includes('yangkeduo')) return 'pdd';
  return 'generic';
};

// Download image and upload to Supabase Storage
const uploadImageToStorage = async (
  supabase: any,
  imageUrl: string,
  index: number
): Promise<string | null> => {
  try {
    let cleanUrl = imageUrl.trim();
    if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
    
    // Remove size suffixes for Alibaba/Taobao images
    cleanUrl = cleanUrl.replace(/_\d+x\d+\.[a-z]+$/i, '.jpg');
    cleanUrl = cleanUrl.replace(/\.jpg_\d+x\d+\.jpg$/i, '.jpg');
    
    console.log(`Downloading image ${index + 1}: ${cleanUrl.substring(0, 100)}...`);
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.goofish.com/',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return cleanUrl;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `imports/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(fileName, uint8Array, { contentType, upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return cleanUrl;
    }

    const { data } = supabase.storage.from('product-media').getPublicUrl(fileName);
    console.log(`Uploaded image ${index + 1} successfully`);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error uploading image ${index}:`, error);
    return imageUrl;
  }
};

// Build platform-specific page function for Apify Web Scraper (Puppeteer)
const getPageFunction = (platform: string): string => {
  // Common extraction logic that works across platforms with JS rendering
  return `async function pageFunction(context) {
    const { page, request, log } = context;
    
    // Wait for page to fully render
    await page.waitForTimeout(3000);
    
    // Platform: ${platform}
    const result = await page.evaluate(() => {
      // Helper to get text content safely
      const getText = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent.trim()) return el.textContent.trim();
        }
        return '';
      };
      
      // Helper to get all matching images
      const getImages = () => {
        const imgs = new Set();
        // Get from img tags
        document.querySelectorAll('img').forEach(img => {
          const src = img.src || img.dataset.src || img.dataset.lazySrc || '';
          if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('data:')) {
            // Filter for product images (usually larger)
            const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
            if (w === 0 || w > 50) {
              imgs.add(src);
            }
          }
        });
        // Get from background images in product galleries
        document.querySelectorAll('[style*="background-image"]').forEach(el => {
          const match = el.style.backgroundImage.match(/url\\(["']?([^"')]+)["']?\\)/);
          if (match && match[1].startsWith('http')) {
            imgs.add(match[1]);
          }
        });
        // Get from video poster
        document.querySelectorAll('video[poster]').forEach(v => {
          if (v.poster) imgs.add(v.poster);
        });
        return Array.from(imgs).slice(0, 10);
      };
      
      // Title selectors - ordered by specificity
      const title = getText([
        // Goofish/Xianyu specific
        '[class*="ItemHeader"] h1',
        '[class*="item-title"]',
        '[class*="ItemTitle"]',
        '[class*="itemTitle"]',
        '[data-testid="item-title"]',
        // Taobao/Tmall
        '.tb-main-title',
        '#J_Title h3',
        '[class*="mainTitle"]',
        // 1688
        '.d-title',
        '.mod-detail-title h1',
        // JD
        '.sku-name',
        '.itemInfo-wrap .sku-name',
        // Generic
        'h1',
        '[class*="product-title"]',
        '[class*="productTitle"]',
        '[class*="goods-title"]',
        '[class*="goodsTitle"]',
        'title'
      ]);
      
      // Description selectors
      const description = getText([
        '[class*="ItemDescription"]',
        '[class*="item-desc"]',
        '[class*="desc-content"]',
        '.tb-detail-hd',
        '.mod-detail-desc',
        '[class*="product-desc"]',
        '[class*="detail-content"]',
        'meta[name="description"]'
      ]) || document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      // Price extraction - try multiple approaches
      let price = '0';
      const priceSelectors = [
        // Goofish
        '[class*="ItemPrice"] [class*="price"]',
        '[class*="itemPrice"]',
        '[class*="item-price"]',
        '[class*="Price--"]',
        // Taobao
        '.tb-rmb-num',
        '#J_StrPrice .tb-rmb-num',
        '.tm-price',
        // 1688
        '.d-content .d-price',
        '.price-original-sku',
        // JD
        '.p-price .price',
        // Generic
        '[class*="price"]',
        '[class*="Price"]'
      ];
      
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent || '';
          const match = text.match(/([\\d]+[.,]?[\\d]*)/);
          if (match && parseFloat(match[1]) > 0) {
            price = match[1].replace(',', '.');
            break;
          }
        }
      }
      
      // Also try extracting from page source / JSON data
      if (price === '0') {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          // Look for price in JSON data within script tags
          const priceMatch = content.match(/"price"\\s*:\\s*"?([\\d.]+)"?/) ||
                            content.match(/"soldPrice"\\s*:\\s*"?([\\d.]+)"?/) ||
                            content.match(/"originalPrice"\\s*:\\s*"?([\\d.]+)"?/);
          if (priceMatch && parseFloat(priceMatch[1]) > 0) {
            price = priceMatch[1];
            break;
          }
        }
      }
      
      return {
        title,
        description,
        priceText: price,
        images: getImages(),
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    log.info('Extracted data: ' + JSON.stringify({
      title: result.title?.substring(0, 50),
      priceText: result.priceText,
      imageCount: result.images?.length,
      pageTitle: result.pageTitle?.substring(0, 50)
    }));
    
    return result;
  }`;
};

// Scrape with Apify Web Scraper (Puppeteer-based, handles JS rendering)
const scrapeWithWebScraper = async (url: string, apifyKey: string, platform: string) => {
  console.log(`Starting Apify Web Scraper for ${platform}...`);
  
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${apifyKey}&timeout=60`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        pageFunction: getPageFunction(platform),
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        maxRequestsPerCrawl: 1,
        maxConcurrency: 1,
        navigationTimeoutSecs: 30,
        pageFunctionTimeoutSecs: 30,
        // Use Chrome for better JS rendering
        useChrome: true,
        ignoreSslErrors: true,
        // Additional browser settings
        preNavigationHooks: `[
          async ({ page }, goToOptions) => {
            // Set Chinese locale for better content loading
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            });
            goToOptions.waitUntil = 'networkidle2';
          }
        ]`,
      }),
    }
  );
  
  return response;
};

// Fallback: try Cheerio scraper (faster but no JS)
const scrapeWithCheerioScraper = async (url: string, apifyKey: string) => {
  console.log('Falling back to Cheerio scraper...');
  
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
                             $('[class*="detail"]').first().text().trim() ||
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
          
          const images = [];
          $('img').each((i, el) => {
            let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
            if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && src.startsWith('http')) {
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

// Validate scraped data quality
const isDataValid = (title: string, images: string[]): boolean => {
  // Reject if title is a generic site name
  const genericTitles = ['闲鱼', '淘宝', '1688', '京东', '拼多多', 'taobao', 'goofish'];
  const lowerTitle = title.toLowerCase();
  for (const generic of genericTitles) {
    if (lowerTitle === generic || lowerTitle.startsWith(generic + ' -') || lowerTitle.includes('闲不住')) {
      return false;
    }
  }
  return title.length > 5 && images.length > 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimit = checkRateLimit(`magic-import:${clientId}`, RATE_LIMITS.MAGIC_IMPORT);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn, corsHeaders);
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing URL:', url);
    const platform = detectPlatform(url);
    console.log('Detected platform:', platform);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate
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

    const apifyKey = Deno.env.get('APIFY_API_KEY');

    if (apifyKey) {
      // Try Web Scraper first (Puppeteer - handles JS rendering)
      try {
        const webScraperResponse = await scrapeWithWebScraper(url, apifyKey, platform);
        
        if (webScraperResponse.ok) {
          const scrapedData = await webScraperResponse.json();
          console.log('Web Scraper result:', JSON.stringify(scrapedData?.[0] ? {
            title: scrapedData[0].title?.substring(0, 80),
            price: scrapedData[0].priceText,
            images: scrapedData[0].images?.length
          } : 'empty'));

          if (scrapedData?.length > 0 && !scrapedData[0]['#error']) {
            const item = scrapedData[0];
            rawTitle = item.title || '';
            rawDescription = item.description || '';
            rawPriceText = item.priceText || '0';
            rawImages = item.images || [];
          }
        } else {
          const errText = await webScraperResponse.text();
          console.error('Web Scraper failed:', webScraperResponse.status, errText.substring(0, 200));
        }
      } catch (err) {
        console.error('Web Scraper error:', err);
      }

      // If Web Scraper failed or data is invalid, try Cheerio as fallback
      if (!isDataValid(rawTitle, rawImages)) {
        console.log('Web Scraper data insufficient, trying Cheerio fallback...');
        try {
          const cheerioResponse = await scrapeWithCheerioScraper(url, apifyKey);
          if (cheerioResponse.ok) {
            const cheerioData = await cheerioResponse.json();
            if (cheerioData?.length > 0 && !cheerioData[0]['#error']) {
              const item = cheerioData[0];
              // Only use cheerio data if it's better
              if (isDataValid(item.title || '', item.images || [])) {
                rawTitle = item.title || rawTitle;
                rawDescription = item.description || rawDescription;
                rawPriceText = item.priceText || rawPriceText;
                rawImages = item.images?.length > rawImages.length ? item.images : rawImages;
              }
            }
          }
        } catch (cheerioErr) {
          console.error('Cheerio fallback error:', cheerioErr);
        }
      }
    }

    console.log('Scraped data:', { 
      title: rawTitle.substring(0, 80), 
      price: rawPriceText, 
      imageCount: rawImages.length,
      valid: isDataValid(rawTitle, rawImages)
    });

    // If still no valid data
    if (!rawTitle && rawImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur de récupération : veuillez vérifier le lien ou remplir manuellement. Le site peut nécessiter une connexion.',
          needsManual: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse price
    const priceYuan = parseFloat(rawPriceText.replace(/[^\d.]/g, '')) || 0;
    const priceFCFA = convertYuanToFCFA(priceYuan);
    console.log(`Price: ${priceYuan} Yuan -> ${priceFCFA} FCFA`);

    // Process with Mistral AI
    const mistralKey = Deno.env.get('MISTRAL_API_KEY');
    let processedTitle = rawTitle;
    let processedDescription = rawDescription;
    let suggestedCategory = '';

    if (mistralKey && rawTitle) {
      console.log('Processing with Mistral AI...');
      const mistralPrompt = `Tu es un expert en e-commerce africain. Analyse ce produit chinois et crée une fiche produit en français pour le marché camerounais.

DONNÉES BRUTES:
- Titre: ${rawTitle}
- Description: ${rawDescription.substring(0, 500)}
- Prix: ${priceYuan} Yuan (${priceFCFA} FCFA)

INSTRUCTIONS:
1. Traduis le titre en français clair et commercial (max 80 caractères). Ne traduis PAS le titre comme le nom du site web.
2. Réécris la description en français professionnel (max 400 caractères)
3. Catégorie parmi: Électronique, Mode & Vêtements, Maison & Jardin, Beauté & Santé, Sport & Loisirs, Jouets & Enfants, Accessoires, Sacs & Bagages, Montres & Bijoux, Auto & Moto, Audio, Gaming, Photo, Ordinateurs, Iphones, Samsung, Xiaomi, Pixels

Réponds UNIQUEMENT en JSON valide:
{"title": "...", "description": "...", "category": "..."}`;

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
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (mistralResponse.ok) {
          const mistralData = await mistralResponse.json();
          const aiContent = mistralData.choices?.[0]?.message?.content || '';
          console.log('Mistral response:', aiContent.substring(0, 200));

          try {
            const parsed = JSON.parse(cleanJsonString(aiContent));
            processedTitle = parsed.title || rawTitle;
            processedDescription = parsed.description || rawDescription;
            suggestedCategory = parsed.category || '';
          } catch (parseError) {
            console.error('Mistral parse error:', parseError);
          }
        } else {
          console.error('Mistral API error:', mistralResponse.status);
        }
      } catch (mistralError) {
        console.error('Mistral failed:', mistralError);
      }
    }

    // Upload images to Storage
    console.log(`Uploading ${Math.min(rawImages.length, 8)} images...`);
    const uploadedImages: string[] = [];
    
    for (let i = 0; i < Math.min(rawImages.length, 8); i++) {
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
        raw: {
          title: rawTitle,
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
