/**
 * OptimizedImage - High-performance image component
 * Features: Native lazy loading, blur placeholder with shimmer, smooth HD transition
 */

import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'shimmer' | 'empty';
  blurDataUrl?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

// Generate a simple blur placeholder using a tiny canvas
const generateBlurPlaceholder = (color: string = '#e5e7eb'): string => {
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="1"/>
      </filter>
      <rect width="100%" height="100%" fill="${color}" filter="url(#b)"/>
    </svg>`
  )}`;
};

const OptimizedImage = memo(({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  blurDataUrl,
  aspectRatio = 'auto'
}: OptimizedImageProps) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);
  const [blurSrc] = useState(() => blurDataUrl || generateBlurPlaceholder());

  // Intersection Observer for lazy loading with preload margin
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '300px', // Preload 300px before visible
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setLoadState('loaded');
  };

  const handleError = () => {
    setLoadState('error');
  };

  const optimizedSrc = loadState === 'error' ? '/placeholder.svg' : (src || '/placeholder.svg');

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: ''
  }[aspectRatio];

  return (
    <div 
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        className
      )}
      style={{ width, height }}
    >
      {/* Blur/Shimmer Placeholder */}
      {placeholder !== 'empty' && loadState === 'loading' && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Base blur layer */}
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: `url(${blurSrc})`,
              filter: 'blur(20px)',
            }}
          />
          
          {/* Shimmer overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 2s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Actual HD Image */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // @ts-ignore - fetchpriority is a valid HTML attribute
          fetchpriority={priority ? 'high' : 'low'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover',
            'transition-all duration-500 ease-out',
            loadState === 'loaded' 
              ? 'opacity-100 scale-100 blur-0' 
              : 'opacity-0 scale-105 blur-sm'
          )}
        />
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <svg 
            className="w-8 h-8 text-muted-foreground/50" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
