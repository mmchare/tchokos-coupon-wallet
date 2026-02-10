import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Gavel, ShieldCheck, Eye } from 'lucide-react';
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

  const displayRating = Number(rating.toFixed(1));

  // Format interest count for display
  const formatInterest = (count: number): string | null => {
    if (count < 3) return null;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return `${count}`;
  };

  const interestLabel = formatInterest(interestCount);

  return (
    <div 
      className="masonry-card group cursor-pointer animate-fade-in mb-3 bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-transparent hover:border-primary"
      onClick={handleClick}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-muted aspect-square">
        <OptimizedImage
          src={image || '/placeholder.svg'}
          alt={name}
          className="w-full h-full group-hover:scale-110 transition-transform duration-500"
          priority={priority}
          placeholder="blur"
        />
        
        {/* Verified Badge */}
        {isVerified && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
            <ShieldCheck className="h-3 w-3" />
            <span>Vérifié</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2">
          {name}
        </h3>
        
        {/* Rating, Auction & Interest Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-vibrant-yellow text-vibrant-yellow" />
            <span className="text-xs font-medium text-vibrant-yellow">{displayRating}</span>
          </div>
          
          {isAuction && (
            <div className="flex items-center gap-1 text-primary">
              <Gavel className="h-3 w-3" />
              <span className="text-xs font-medium">Enchère</span>
            </div>
          )}

          {/* Social proof */}
          {interestLabel && (
            <div className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Eye className="h-3 w-3" />
              <span className="text-[10px]">{interestLabel} intéressés</span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
          
          <span className="text-base font-bold text-foreground">
            {price.toLocaleString()} F
          </span>
        </div>
      </div>
    </div>
  );
});

MasonryProductCard.displayName = 'MasonryProductCard';

export default MasonryProductCard;
