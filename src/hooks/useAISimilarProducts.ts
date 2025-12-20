import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  isAuction?: boolean;
  aiReason?: string;
}

interface UseAISimilarProductsResult {
  products: SimilarProduct[];
  isLoading: boolean;
  error: string | null;
}

export const useAISimilarProducts = (productId: string): UseAISimilarProductsResult => {
  const { user } = useAuth();
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarProducts = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the AI similar products edge function
      const { data, error: fnError } = await supabase.functions.invoke('ai-similar-products', {
        body: { product_id: productId, user_id: user?.id }
      });

      if (fnError) {
        console.error('AI similar products error:', fnError);
        // Fallback to regular query
        await fetchFallbackProducts();
        return;
      }

      if (!data?.similar_products || data.similar_products.length === 0) {
        await fetchFallbackProducts();
        return;
      }

      // Fetch full product details for similar products
      const productIds = data.similar_products.map((r: any) => r.product_id);
      
      const { data: productDetails, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching product details:', productsError);
        await fetchFallbackProducts();
        return;
      }

      // Create a map for AI reasons
      const reasonMap = new Map(
        data.similar_products.map((r: any) => [r.product_id, r.reason])
      );

      // Transform products maintaining AI order
      const similarProducts: SimilarProduct[] = [];
      for (const rec of data.similar_products) {
        const product = productDetails?.find(p => p.id === rec.product_id);
        if (product) {
          similarProducts.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            originalPrice: product.original_price ? Number(product.original_price) : undefined,
            image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
            rating: 4.5 + Math.random() * 0.5,
            isAuction: product.is_auction || false,
            aiReason: reasonMap.get(product.id) as string
          });
        }
      }

      setProducts(similarProducts);
    } catch (err) {
      console.error('Error in useAISimilarProducts:', err);
      await fetchFallbackProducts();
    } finally {
      setIsLoading(false);
    }
  }, [productId, user?.id]);

  const fetchFallbackProducts = async () => {
    try {
      // Get current product's category
      const { data: currentProduct } = await supabase
        .from('products')
        .select('category')
        .eq('id', productId)
        .single();

      let query = supabase
        .from('products')
        .select('*')
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
        const fallbackProducts: SimilarProduct[] = data.map(product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
          rating: 4.5 + Math.random() * 0.5,
          isAuction: product.is_auction || false
        }));
        setProducts(fallbackProducts);
      }
    } catch (err) {
      console.error('Fallback fetch error:', err);
      setError('Erreur lors du chargement');
    }
  };

  useEffect(() => {
    fetchSimilarProducts();
  }, [fetchSimilarProducts]);

  return { products, isLoading, error };
};
