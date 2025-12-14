/**
 * Image optimization utilities using Supabase Storage transforms
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Get optimized thumbnail URL for product images
 * Uses Supabase Storage image transforms for server-side compression
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: ImageTransformOptions = {}
): string => {
  const { width = 400, height, quality = 75, resize = 'cover' } = options;
  
  // Only transform Supabase storage URLs
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return originalUrl;
  }

  // Check if already transformed
  if (originalUrl.includes('/render/image')) {
    return originalUrl;
  }

  try {
    // Convert storage URL to render URL for transforms
    // Format: /storage/v1/object/public/bucket/path -> /storage/v1/render/image/public/bucket/path
    const transformedUrl = originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );

    // Build query params for transforms
    const params = new URLSearchParams();
    params.set('width', width.toString());
    if (height) params.set('height', height.toString());
    params.set('quality', quality.toString());
    params.set('resize', resize);

    return `${transformedUrl}?${params.toString()}`;
  } catch {
    return originalUrl;
  }
};

/**
 * Presets for common image sizes
 */
export const imagePresets = {
  thumbnail: { width: 200, quality: 60 },
  card: { width: 400, quality: 75 },
  detail: { width: 800, quality: 85 },
  full: { width: 1200, quality: 90 },
};

/**
 * Get thumbnail URL (smallest size for listings)
 */
export const getThumbnailUrl = (url: string) => 
  getOptimizedImageUrl(url, imagePresets.thumbnail);

/**
 * Get card-sized image URL (for product cards)
 */
export const getCardImageUrl = (url: string) => 
  getOptimizedImageUrl(url, imagePresets.card);

/**
 * Get detail-sized image URL (for product detail pages)
 */
export const getDetailImageUrl = (url: string) => 
  getOptimizedImageUrl(url, imagePresets.detail);
