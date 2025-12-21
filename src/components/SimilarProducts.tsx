import Masonry from 'react-masonry-css';
import { useTranslation } from 'react-i18next';
import MasonryProductCard from './MasonryProductCard';
import { useAISimilarProducts } from '@/hooks/useAISimilarProducts';
import { Sparkles } from 'lucide-react';

interface SimilarProductsProps {
  currentProductId: string;
  category?: string;
}

const SimilarProducts = ({ currentProductId }: SimilarProductsProps) => {
  const { t } = useTranslation();
  const { products, isLoading } = useAISimilarProducts(currentProductId);

  if (isLoading || products.length === 0) return null;

  const breakpointColumnsObj = {
    default: 2,
    640: 2,
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4 px-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">
          {t('product.similarProducts')}
        </h3>
      </div>
      <div className="px-4">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-3 w-auto"
          columnClassName="pl-3 bg-clip-padding"
        >
          {products.map((product) => (
            <MasonryProductCard
              key={product.id}
              id={product.id}
              image={product.image}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              rating={product.rating}
              isAuction={product.isAuction}
            />
          ))}
        </Masonry>
      </div>
    </div>
  );
};

export default SimilarProducts;
