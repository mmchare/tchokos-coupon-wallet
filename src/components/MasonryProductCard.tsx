import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Gavel } from 'lucide-react';
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
  priority = false,
}: MasonryProductCardProps) => {
  const navigate = useNavigate();
  const { trackClick } = useActivityTracking();

  const handleClick = () => {
    trackClick(id);
    navigate(`/product/${id}`);
  };

  // Round rating to 1 decimal place
  const displayRating = Number(rating.toFixed(1));

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
      </div>

      {/* Product Info - Clean, sober styling */}
      <div className="p-3 space-y-2">
        {/* Product Name - Always foreground color */}
        <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2">
          {name}
        </h3>
        
        {/* Rating & Auction Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-vibrant-yellow text-vibrant-yellow" />
            <span className="text-xs font-medium text-vibrant-yellow">{displayRating}</span>
          </div>
          
          {/* Auction Indicator */}
          {isAuction && (
            <div className="flex items-center gap-1 text-primary">
              <Gavel className="h-3 w-3" />
              <span className="text-xs font-medium">Enchère</span>
            </div>
          )}
        </div>

        {/* Price Section - Sober styling */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {/* Original Price - Strikethrough (if exists) */}
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
          
          {/* Current Price - Foreground color, clean */}
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
