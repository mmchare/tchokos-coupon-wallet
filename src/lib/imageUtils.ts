/**
 * Image optimization utilities
 * Falls back to original URL if transforms are not available
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Get optimized image URL - returns original if transforms not available
 * Supabase Storage transforms may require Pro plan
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: ImageTransformOptions = {}
): string => {
  // Always return original URL - transforms require Supabase Pro
  // This ensures images always display correctly
  return originalUrl || '/placeholder.svg';
};

/**
 * Presets for common image sizes (for future use)
 */
export const imagePresets = {
  thumbnail: { width: 200, quality: 60 },
  card: { width: 400, quality: 75 },
  detail: { width: 800, quality: 85 },
  full: { width: 1200, quality: 90 },
};

/**
 * Get card-sized image URL (for product cards)
 */
export const getCardImageUrl = (url: string) => url || '/placeholder.svg';

/**
 * Get detail-sized image URL (for product detail pages)
 */
export const getDetailImageUrl = (url: string) => url || '/placeholder.svg';
