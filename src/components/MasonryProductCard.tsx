import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Gavel, Heart } from 'lucide-react';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useFavorites } from '@/hooks/useFavorites';
import { getCardImageUrl } from '@/lib/imageUtils';

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
  const { isFavorite, toggleFavorite } = useFavorites();
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const [imageLoaded, setImageLoaded] = useState(false);
  const isProductFavorite = isFavorite(id);
  
  // Optimized image URL for thumbnails
  const optimizedImage = getCardImageUrl(image);

  const handleClick = () => {
    trackClick(id);
    navigate(`/product/${id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  return (
    <div 
      className="masonry-card group cursor-pointer animate-fade-in mb-3 bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-border/50"
      onClick={handleClick}
    >
      {/* Image Container - Optimized loading */}
      <div className="relative overflow-hidden bg-muted aspect-square">
        {/* Placeholder while loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img 
          src={optimizedImage} 
          alt={name}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
        >
          <Heart className={`h-4 w-4 ${isProductFavorite ? 'fill-vibrant-red text-vibrant-red' : 'text-foreground'}`} />
        </button>
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