/**
 * Hook for fetching personalized product recommendations
 * Implements rule-based recommendation engine
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  image: string;
  isAuction?: boolean;
}

interface PersonalizedProducts {
  personalizedProducts: Product[];
  trendingProducts: Product[];
  isLoading: boolean;
  hasPersonalization: boolean;
}

export const usePersonalizedProducts = (): PersonalizedProducts => {
  const { user } = useAuth();
  const [personalizedProducts, setPersonalizedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPersonalization, setHasPersonalization] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      try {
        // Fetch all products first
        const { data: allProducts, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setIsLoading(false);
          return;
        }

        const transformProduct = (product: any): Product => ({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          category: product.category || 'Autres',
          rating: 4.5 + Math.random() * 0.5,
          image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
          isAuction: product.is_auction || false
        });

        const allTransformed = allProducts?.map(transformProduct) || [];

        // If user is logged in, try to get personalized recommendations
        if (user?.id) {
          // Get user activity from last 7 days
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: userActivity, error: activityError } = await supabase
            .from('user_activity')
            .select('product_id, activity_type')
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo.toISOString());

          if (!activityError && userActivity && userActivity.length > 0) {
            setHasPersonalization(true);

            // Count activity per product (weighted: PURCHASE > ADD_TO_CART > VIEW/CLICK)
            const productScores: Record<string, number> = {};
            const purchasedCategories: Set<string> = new Set();

            userActivity.forEach(activity => {
              const weight = 
                activity.activity_type === 'PURCHASE' ? 10 :
                activity.activity_type === 'ADD_TO_CART' ? 5 :
                activity.activity_type === 'VIEW' ? 2 : 1;
              
              productScores[activity.product_id] = (productScores[activity.product_id] || 0) + weight;
            });

            // Get categories of purchased products for cross-sell
            const purchasedProductIds = userActivity
              .filter(a => a.activity_type === 'PURCHASE')
              .map(a => a.product_id);

            allTransformed.forEach(product => {
              if (purchasedProductIds.includes(product.id)) {
                purchasedCategories.add(product.category);
              }
            });

            // Priority 1: Products user interacted with most
            const interactedProductIds = Object.keys(productScores);
            
            // Priority 2: Same category as purchased products (cross-sell)
            const crossSellProducts = allTransformed.filter(
              p => purchasedCategories.has(p.category) && !interactedProductIds.includes(p.id)
            );

            // Combine personalized products
            const interactedProducts = allTransformed
              .filter(p => interactedProductIds.includes(p.id))
              .sort((a, b) => (productScores[b.id] || 0) - (productScores[a.id] || 0));

            const personalized = [
              ...interactedProducts.slice(0, 6),
              ...crossSellProducts.slice(0, 4)
            ].slice(0, 10);

            // Priority 3: Trending products (most viewed/purchased globally)
            // For now, just show products not in personalized list
            const personalizedIds = new Set(personalized.map(p => p.id));
            const trending = allTransformed.filter(p => !personalizedIds.has(p.id));

            setPersonalizedProducts(personalized);
            setTrendingProducts(trending);
          } else {
            // No activity data yet - show all as trending
            setPersonalizedProducts([]);
            setTrendingProducts(allTransformed);
          }
        } else {
          // Not logged in - show all products as trending
          setPersonalizedProducts([]);
          setTrendingProducts(allTransformed);
        }
      } catch (error) {
        console.error('Error in personalization:', error);
      }

      setIsLoading(false);
    };

    fetchProducts();
  }, [user?.id]);

  return {
    personalizedProducts,
    trendingProducts,
    isLoading,
    hasPersonalization
  };
};
