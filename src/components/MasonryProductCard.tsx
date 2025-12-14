import { useNavigate } from 'react-router-dom';
import { Star, Gavel } from 'lucide-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface MasonryProductCardProps {
  id: string;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  isAuction?: boolean;
}

const MasonryProductCard = ({ 
  id, 
  image, 
  name, 
  price, 
  originalPrice, 
  rating,
  isAuction = false,
}: MasonryProductCardProps) => {
  const navigate = useNavigate();
  const { trackClick } = useActivityTracking();
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const handleClick = () => {
    trackClick(id);
    navigate(`/product/${id}`);
  };

  return (
    <div 
      className="masonry-card group cursor-pointer animate-fade-in mb-3 bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-border/50"
      onClick={handleClick}
    >
      {/* Image Container - Optimized loading */}
      <div className="relative overflow-hidden bg-muted aspect-square">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Product Info */}
      <div className="p-2 space-y-1">
        {/* Product Name - Compact */}
        <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2 group-hover:text-vibrant-red transition-colors">
          {name}
        </h3>
        
        {/* Rating Stars & Auction Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-vibrant-yellow text-vibrant-yellow" />
            <span className="text-xs font-medium text-vibrant-yellow">{rating}</span>
          </div>
          
          {/* Auction Indicator - Bleu Tech */}
          {isAuction && (
            <div className="flex items-center gap-1 text-primary">
              <Gavel className="h-3 w-3" />
              <span className="text-xs font-medium">Enchère</span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {/* Current Price - Rouge Vif, Gras, Grand */}
          <span className="text-lg font-bold text-vibrant-red">
            {price.toLocaleString()} F
          </span>
          
          {/* Original Price - Gris Barré */}
          {originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasonryProductCard;