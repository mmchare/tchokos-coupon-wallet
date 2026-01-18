import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Gavel } from "lucide-react";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import OptimizedImage from "@/components/OptimizedImage";

interface MasonryProductCardProps {
  id: string;
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  isAuction?: boolean;
  priority?: boolean; // For above-fold images
}

const MasonryProductCard = memo(
  ({
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

    return (
      <div
        className="masonry-card group cursor-pointer animate-fade-in mb-3 bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-border/50"
        onClick={handleClick}
      >
        {/* Image Container - Aggressive lazy loading with intersection observer */}
        <div className="relative overflow-hidden bg-muted aspect-square">
          <OptimizedImage
            src={image || "/placeholder.svg"}
            alt={name}
            className="w-full h-full group-hover:scale-110 transition-transform duration-500"
            priority={priority}
            placeholder="blur"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Title and Rating Row */}
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-brand-text text-base leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors flex-1">
              {name}
            </h3>
            <div className="flex items-center gap-1 shrink-0 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
              <Star className="h-3.5 w-3.5 fill-vibrant-yellow text-vibrant-yellow" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {Number(rating).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Price Section */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col">
              {originalPrice && (
                <span className="text-xs text-gray-400 line-through font-medium">
                  {originalPrice.toLocaleString()} F
                </span>
              )}
              <span className="text-lg font-bold text-brand-text">
                {price.toLocaleString()} F
              </span>
            </div>
            
            {/* Auction Indicator or Add Button */}
            {isAuction ? (
              <div className="flex items-center gap-1 text-brand-primary bg-brand-primary/10 px-2 py-1 rounded text-xs font-bold">
                <Gavel className="h-3 w-3" />
                <span>Enchère</span>
              </div>
            ) : (
              <button 
                className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm hover:translate-y-px"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add to cart logic would go here
                  handleClick(); // For now, go to details
                }}
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MasonryProductCard.displayName = "MasonryProductCard";

export default MasonryProductCard;
