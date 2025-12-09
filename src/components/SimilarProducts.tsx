import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Star, CheckCircle2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  isVerified?: boolean;
}

interface SimilarProductsProps {
  currentProductId: string;
  products: Product[];
}

const SimilarProducts = ({ currentProductId, products }: SimilarProductsProps) => {
  const navigate = useNavigate();
  
  // Filter out current product and get up to 4 similar products
  const similarProducts = products
    .filter(p => p.id !== currentProductId)
    .slice(0, 4);

  if (similarProducts.length === 0) return null;

  return (
    <Card className="bg-card border-border p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="text-pinbaoo-yellow">✨</span>
        Suggestions DINA
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {similarProducts.map((product) => {
          const discount = product.originalPrice 
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
            : 0;

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="product-card cursor-pointer group"
            >
              {/* Image */}
              <div className="relative aspect-square mb-2 overflow-hidden rounded-lg">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                
                {/* Discount Badge */}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded">
                    -{discount}%
                  </span>
                )}
                
                {/* Verified Badge */}
                {product.isVerified && (
                  <span className="absolute top-2 right-2 bg-pinbaoo-green/90 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </h4>
                
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">{product.rating}</span>
                </div>
                
                {/* Price */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-bold text-foreground">
                    {product.price.toLocaleString()} F
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {product.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SimilarProducts;
