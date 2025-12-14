/**
 * Smart Products Hook - Invisible AI-Powered Product Ordering
 * Seamlessly blends AI recommendations with catalog for personalized experience
 * Users should feel "JinBao understands me" without knowing AI is involved
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

interface SmartProductsResult {
  products: Product[];
  isLoading: boolean;
  refresh: () => void;
}

// Cache for products (stale-while-revalidate pattern)
const productCache = {
  data: null as Product[] | null,
  timestamp: 0,
  maxAge: 5 * 60 * 1000, // 5 minutes
};

export const useSmartProducts = (): SmartProductsResult => {
  const { user } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>(productCache.data || []);
  const [aiScores, setAiScores] = useState<Map<string, number>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(!productCache.data);
  const [refreshKey, setRefreshKey] = useState(0);
  const isFetchingRef = useRef(false);

  // Fetch only required fields for home page (optimized query)
  const fetchProducts = useCallback(async (forceRefresh = false) => {
    // Use cache if available and fresh
    const now = Date.now();
    if (!forceRefresh && productCache.data && (now - productCache.timestamp) < productCache.maxAge) {
      setAllProducts(productCache.data);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, original_price, category, images, is_auction')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const products: Product[] = data.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        category: p.category || 'Autres',
        rating: 4.5 + Math.random() * 0.5,
        image: p.images && p.images.length > 0 ? p.images[0] : '/placeholder.svg',
        isAuction: p.is_auction || false,
      }));
      
      // Update cache
      productCache.data = products;
      productCache.timestamp = Date.now();
      
      setAllProducts(products);
    }
    isFetchingRef.current = false;
  }, []);

  // Fetch user activity scores (rule-based personalization)
  const fetchActivityScores = useCallback(async () => {
    if (!user?.id) {
      setActivityScores(new Map());
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('user_activity')
      .select('product_id, activity_type')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (data) {
      const scores = new Map<string, number>();
      
      // Weight activities: PURCHASE > ADD_TO_CART > CLICK > VIEW
      const weights = {
        'PURCHASE': 10,
        'ADD_TO_CART': 5,
        'CLICK': 3,
        'VIEW': 1
      };

      data.forEach(activity => {
        const currentScore = scores.get(activity.product_id) || 0;
        const weight = weights[activity.activity_type as keyof typeof weights] || 1;
        scores.set(activity.product_id, currentScore + weight);
      });

      setActivityScores(scores);
    }
  }, [user?.id]);

  // Fetch AI recommendations (invisible to user)
  const fetchAIRecommendations = useCallback(async () => {
    if (!user?.id) {
      setAiScores(new Map());
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { user_id: user.id }
      });

      if (!error && data?.recommendations) {
        const scores = new Map<string, number>();
        data.recommendations.forEach((rec: { product_id: string; score: number }, index: number) => {
          // Higher score for earlier recommendations (AI prioritizes these)
          scores.set(rec.product_id, (rec.score || 0.5) * 100 + (data.recommendations.length - index));
        });
        setAiScores(scores);
      }
    } catch (err) {
      // Silent fail - AI is invisible, should not affect UX
      console.log('AI recommendations unavailable, using activity-based ordering');
    }
  }, [user?.id]);

  // Load all data with stale-while-revalidate pattern
  useEffect(() => {
    const loadData = async () => {
      // Show cached data immediately (no loading state if cache exists)
      if (productCache.data && !refreshKey) {
        setAllProducts(productCache.data);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      
      // Fetch fresh products
      await fetchProducts(refreshKey > 0);
      
      // Then fetch personalization data in parallel (non-blocking)
      if (user?.id) {
        Promise.all([
          fetchActivityScores(),
          fetchAIRecommendations()
        ]).then(() => {
          // Silent update - no loading state change
        });
      }
      
      setIsLoading(false);
    };

    loadData();
  }, [user?.id, refreshKey, fetchProducts, fetchActivityScores, fetchAIRecommendations]);

  // Smart product ordering algorithm
  const smartProducts = useMemo(() => {
    if (allProducts.length === 0) return [];

    // If no user, return products with slight randomization for freshness
    if (!user?.id) {
      return [...allProducts].sort(() => Math.random() - 0.5);
    }

    // Calculate combined score for each product
    const scoredProducts = allProducts.map(product => {
      const aiScore = aiScores.get(product.id) || 0;
      const activityScore = activityScores.get(product.id) || 0;
      
      // Combined score: AI weight (60%) + Activity weight (40%)
      // Add small random factor for variety
      const combinedScore = (aiScore * 0.6) + (activityScore * 0.4) + (Math.random() * 5);
      
      return { product, score: combinedScore };
    });

    // Sort by combined score (highest first)
    scoredProducts.sort((a, b) => b.score - a.score);

    // Inject discovery products: every 5th position, add a random low-score product
    // This prevents filter bubbles and keeps content fresh
    const result: Product[] = [];
    const highScoreProducts = scoredProducts.filter(p => p.score > 5);
    const lowScoreProducts = scoredProducts.filter(p => p.score <= 5);
    
    let highIdx = 0;
    let lowIdx = 0;

    for (let i = 0; i < scoredProducts.length; i++) {
      if (i > 0 && i % 5 === 0 && lowIdx < lowScoreProducts.length) {
        // Discovery slot
        result.push(lowScoreProducts[lowIdx].product);
        lowIdx++;
      } else if (highIdx < highScoreProducts.length) {
        result.push(highScoreProducts[highIdx].product);
        highIdx++;
      } else if (lowIdx < lowScoreProducts.length) {
        result.push(lowScoreProducts[lowIdx].product);
        lowIdx++;
      }
    }

    // Add remaining products
    while (highIdx < highScoreProducts.length) {
      result.push(highScoreProducts[highIdx].product);
      highIdx++;
    }
    while (lowIdx < lowScoreProducts.length) {
      result.push(lowScoreProducts[lowIdx].product);
      lowIdx++;
    }

    return result;
  }, [allProducts, aiScores, activityScores, user?.id]);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    products: smartProducts,
    isLoading,
    refresh
  };
};
