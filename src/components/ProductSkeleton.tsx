/**
 * Skeleton loader for product cards during loading
 */

import { Skeleton } from '@/components/ui/skeleton';

const ProductSkeleton = () => {
  return (
    <div className="masonry-card mb-3 bg-card rounded-xl shadow-md overflow-hidden border border-border/50 animate-pulse">
      {/* Image Skeleton */}
      <Skeleton className="w-full aspect-square" />
      
      {/* Content Skeleton */}
      <div className="p-2 space-y-2">
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
        </div>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
};

export const ProductSkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </>
  );
};

export default ProductSkeleton;
