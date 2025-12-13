import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

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
    <div className="bg-card rounded-2xl shadow-sm border border-border p-4">
      <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
        <span>Suggestions</span>
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {similarProducts.map((product) => {
          const discount = product.originalPrice 
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
            : 0;

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="bg-muted/30 rounded-xl overflow-hidden cursor-pointer group transition-all hover:shadow-md"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Discount Badge */}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-1">
                <h4 className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </h4>
                
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-vibrant-yellow text-vibrant-yellow" />
                  <span className="text-[10px] text-muted-foreground">{product.rating}</span>
                </div>
                
                {/* Price */}
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-vibrant-red">
                    {product.price.toLocaleString()} F
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimilarProducts;
