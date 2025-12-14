import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import MasonryProductCard from './MasonryProductCard';
import { supabase } from '@/integrations/supabase/client';

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  isAuction?: boolean;
}

interface SimilarProductsProps {
  currentProductId: string;
  category?: string;
}

const SimilarProducts = ({ currentProductId, category }: SimilarProductsProps) => {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      setIsLoading(true);

      let query = supabase
        .from('products')
        .select('*')
        .neq('id', currentProductId)
        .limit(6);

      // If category is provided, prioritize same category
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching similar products:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const transformedProducts: SimilarProduct[] = data.map(product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
          rating: 4.5 + Math.random() * 0.5,
          isAuction: product.is_auction || false
        }));

        setProducts(transformedProducts);
      }

      setIsLoading(false);
    };

    fetchSimilarProducts();
  }, [currentProductId, category]);

  if (isLoading || products.length === 0) return null;

  const breakpointColumnsObj = {
    default: 2,
    640: 2,
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold text-foreground mb-4 px-4">
        Produits similaires
      </h3>
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
