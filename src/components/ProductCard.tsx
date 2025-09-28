import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Plus } from 'lucide-react';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  onAddToCoupon: (productId: string) => void;
}

const ProductCard = ({ 
  id, 
  image, 
  name, 
  price, 
  originalPrice, 
  category, 
  rating,
  onAddToCoupon 
}: ProductCardProps) => {
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className="product-card group animate-fade-in">
      {/* Image */}
      <div className="relative overflow-hidden rounded-lg mb-3 bg-gray-100">
        <img 
          src={image} 
          alt={name}
          className="w-full h-32 sm:h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discount > 0 && (
          <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-accent text-white text-xs">
            -{discount}%
          </Badge>
        )}
        <Badge variant="secondary" className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 text-white text-xs">
          {category}
        </Badge>
      </div>

      {/* Product Info */}
      <div className="space-y-2 sm:space-y-3 px-1">
        <div>
          <h3 className="font-semibold text-white text-sm sm:text-base truncate leading-tight">{name}</h3>
          <div className="flex items-center space-x-1 mt-1">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-xs sm:text-sm text-gray-400">{rating}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
          <span className="text-sm sm:text-xl font-bold text-white">
            {price.toLocaleString()} F
          </span>
          {originalPrice && (
            <span className="text-xs sm:text-sm text-gray-500 line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
        </div>

        {/* Add to Coupon Button */}
        <Button 
          onClick={() => onAddToCoupon(id)}
          className="coupon-button w-full text-xs sm:text-sm py-2 sm:py-3"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Ajouter au </span>Coupon
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;