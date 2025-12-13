import { useNavigate } from 'react-router-dom';
import { Star, Gavel } from 'lucide-react';

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
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div 
      className="masonry-card group cursor-pointer animate-fade-in mb-3"
      onClick={() => navigate(`/product/${id}`)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <img 
          src={image} 
          alt={name}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Discount Badge - Rouge Vif */}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-vibrant-red text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
            -{discount}%
          </div>
        )}
        
        {/* Auction Badge */}
        {isAuction && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-vibrant-red/95 backdrop-blur-sm text-white text-xs px-2 py-1.5 rounded-md flex items-center justify-center gap-1 animate-pulse">
              <Gavel className="h-3 w-3" />
              <span className="font-medium">Enchère</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2 space-y-1">
        {/* Product Name - Compact */}
        <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2 group-hover:text-vibrant-red transition-colors">
          {name}
        </h3>
        
        {/* Rating Stars - Jaune/Orange Vif */}
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-vibrant-yellow text-vibrant-yellow" />
          <span className="text-xs font-medium text-vibrant-yellow">{rating}</span>
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