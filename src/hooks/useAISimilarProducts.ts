import { useState, useEffect, useCallback } from 'react';
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

interface UseAISimilarProductsResult {
  products: SimilarProduct[];
  isLoading: boolean;
  error: string | null;
}

export const useAISimilarProducts = (productId: string): UseAISimilarProductsResult => {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarProducts = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get current product's category
      const { data: currentProduct } = await supabase
        .from('products')
        .select('category')
        .eq('id', productId)
        .single();

      let query = supabase
        .from('products')
        .select('id, name, price, original_price, images, is_auction')
        .neq('id', productId)
        .limit(6);

      if (currentProduct?.category) {
        query = query.eq('category', currentProduct.category);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        setError('Erreur lors du chargement');
        return;
      }

      if (data) {
        const similarProducts: SimilarProduct[] = data.map(product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
          rating: 4.5 + Math.random() * 0.5,
          isAuction: product.is_auction || false
        }));
        setProducts(similarProducts);
      }
    } catch (err) {
      console.error('Error fetching similar products:', err);
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchSimilarProducts();
  }, [fetchSimilarProducts]);

  return { products, isLoading, error };
};
