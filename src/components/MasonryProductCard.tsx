import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, Eye, ShieldCheck, RotateCcw } from 'lucide-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import OptimizedImage from '@/components/OptimizedImage';

interface MasonryProductCardProps {
  id: string;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  isAuction?: boolean;
  isVerified?: boolean;
  interestCount?: number;
  priority?: boolean;
}

const MasonryProductCard = memo(({ 
  id, 
  image, 
  name, 
  price, 
  originalPrice, 
  rating,
  isAuction = false,
  isVerified = false,
  interestCount = 0,
  priority = false,
}: MasonryProductCardProps) => {
  const navigate = useNavigate();
  const { trackClick } = useActivityTracking();

  const handleClick = () => {
    trackClick(id);
    navigate(`/product/${id}`);
  };

  // Format interest count for display
  const formatInterest = (count: number): string | null => {
    if (count < 1) return null;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return `${count}`;
  };

  const interestLabel = formatInterest(interestCount);

  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div 
      className="masonry-card group cursor-pointer animate-fade-in mb-3 bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-border/50 hover:border-primary/40"
      onClick={handleClick}
    >
      {/* Image Container - Clean, no overlays */}
      <div className="relative overflow-hidden bg-muted aspect-square">
        <OptimizedImage
          src={image || '/placeholder.svg'}
          alt={name}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          priority={priority}
          placeholder="blur"
        />
        {/* Discount badge on image - subtle */}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </div>
        )}
        {/* Auction indicator on image */}
        {isAuction && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Gavel className="h-3 w-3" />
            <span>Enchère</span>
          </div>
        )}
      </div>

      {/* Product Info - Xianyu style */}
      <div className="p-2.5 space-y-1.5">
        {/* Verified badge inline + Product name */}
        <div className="flex items-start gap-1">
          {isVerified && (
            <span className="inline-flex items-center gap-0.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-[1px] rounded shrink-0 mt-[3px]">
              <ShieldCheck className="h-2.5 w-2.5" />
              Vérifié
            </span>
          )}
          <h3 className="font-medium text-foreground text-[13px] leading-tight line-clamp-2">
            {name}
          </h3>
        </div>

        {/* Price row + social proof */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[17px] font-extrabold text-foreground tracking-tight">
            {price.toLocaleString()}<span className="text-[11px] ml-0.5">F</span>
          </span>
          {originalPrice && (
            <span className="text-[11px] text-muted-foreground line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
          {interestLabel && (
            <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {interestLabel} veulent
            </span>
          )}
        </div>

        {/* Trust indicator - like Xianyu's 七天无理由退货 */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
            <RotateCcw className="h-2.5 w-2.5" />
            Retour 7j
          </span>
          {isVerified && (
            <span className="text-blue-500 font-medium">
              Qualité garantie
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MasonryProductCard.displayName = 'MasonryProductCard';

export default MasonryProductCard;
