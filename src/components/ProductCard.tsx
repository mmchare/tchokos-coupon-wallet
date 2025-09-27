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
      <div className="relative overflow-hidden rounded-lg mb-4 bg-gray-100">
        <img 
          src={image} 
          alt={name}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-accent text-white">
            -{discount}%
          </Badge>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2 bg-black/80 text-white">
          {category}
        </Badge>
      </div>

      {/* Product Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-white truncate">{name}</h3>
          <div className="flex items-center space-x-1 mt-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-400">{rating}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-white">
            {price.toLocaleString()} FCFA
          </span>
          {originalPrice && (
            <span className="text-sm text-gray-500 line-through">
              {originalPrice.toLocaleString()} FCFA
            </span>
          )}
        </div>

        {/* Add to Coupon Button */}
        <Button 
          onClick={() => onAddToCoupon(id)}
          className="coupon-button w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter au Coupon
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;