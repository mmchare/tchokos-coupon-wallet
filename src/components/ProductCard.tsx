import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Gavel } from "lucide-react";

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  isAuction?: boolean;
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
  isAuction = false,
  onAddToCoupon,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className="product-card group animate-fade-in">
      {/* Image */}
      <div
        className="relative overflow-hidden rounded-lg mb-3 bg-muted cursor-pointer"
        onClick={() => navigate(`/product/${id}`)}
      >
        <img
          src={image}
          alt={name}
          className="w-full h-32 sm:h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discount > 0 && (
          <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-accent text-accent-foreground text-xs">
            -{discount}%
          </Badge>
        )}
        <Badge
          variant="secondary"
          className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 text-white text-xs"
        >
          {category}
        </Badge>

        {/* Auction Badge */}
        {isAuction && (
          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 right-1 sm:right-2">
            <div className="bg-jinbao-red/95 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center justify-center gap-1 animate-pulse">
              <Gavel className="h-3 w-3" />
              <span className="font-medium">Enchère en cours</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2 sm:space-y-3 px-1">
        <div
          className="cursor-pointer"
          onClick={() => navigate(`/product/${id}`)}
        >
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate leading-tight hover:text-accent transition-colors">
            {name}
          </h3>
          <div className="flex items-center space-x-1 mt-1">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {Number(rating).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
          {isAuction ? (
            <span className="text-sm sm:text-xl font-bold text-jinbao-red">
              {price.toLocaleString()} F
            </span>
          ) : (
            <span className="text-sm sm:text-xl font-bold text-foreground">
              {price.toLocaleString()} F
            </span>
          )}
          {originalPrice && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              {originalPrice.toLocaleString()} F
            </span>
          )}
        </div>

        {/* Action Button - Different for auction vs regular products */}
        {isAuction ? (
          <Button
            onClick={() => navigate(`/product/${id}`)}
            className="bg-jinbao-red hover:bg-jinbao-red/90 text-white w-full text-xs sm:text-sm py-2 sm:py-3"
          >
            <Gavel className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Voir l'</span>Enchère
          </Button>
        ) : (
          <Button
            onClick={() => onAddToCoupon(id)}
            className="coupon-button w-full text-xs sm:text-sm py-2 sm:py-3"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Ajouter au </span>Coupon
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
