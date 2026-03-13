/**
 * Smart Products Hook - Optimized AI-Powered Product Ordering
 * Seamlessly blends AI recommendations with catalog for personalized experience
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  isVerified?: boolean;
  interestCount?: number;
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
  const { i18n } = useTranslation();
  const [allProducts, setAllProducts] = useState<Product[]>(productCache.data || []);
  const [aiScores, setAiScores] = useState<Map<string, number>>(new Map());
  const [activityScores, setActivityScores] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(!productCache.data);
  const [refreshKey, setRefreshKey] = useState(0);
  const isFetchingRef = useRef(false);

  // Fetch products (optimized: single query, no secondary activity count query)
  const fetchProducts = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && productCache.data && (now - productCache.timestamp) < productCache.maxAge) {
      setAllProducts(productCache.data);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, name_en, name_zh, price, original_price, category, images, is_auction, auction_end_date, is_verified')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const currentTime = new Date();
      
      const products: Product[] = data
        .filter(p => {
          if (!p.is_auction) return true;
          if (!p.auction_end_date) return true;
          return new Date(p.auction_end_date) > currentTime;
        })
        .map(p => {
          // Pick translated name based on current language
          const lang = i18n.language;
          let displayName = p.name; // default: French
          if (lang === 'en' && (p as any).name_en) displayName = (p as any).name_en;
          if (lang === 'zh' && (p as any).name_zh) displayName = (p as any).name_zh;

          return {
            id: p.id,
            name: displayName,
            price: Number(p.price),
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            category: p.category || 'Autres',
            rating: 4.5 + Math.random() * 0.5,
            image: p.images && p.images.length > 0 ? p.images[0] : '/placeholder.svg',
            isAuction: p.is_auction || false,
            isVerified: p.is_verified || false,
            interestCount: 0,
          };
        });

      productCache.data = products;
      productCache.timestamp = Date.now();
      setAllProducts(products);
    }
    isFetchingRef.current = false;
  }, [i18n.language]);

  // Fetch user activity scores - OPTIMIZED: only user's own data, limited
  const fetchActivityScores = useCallback(async () => {
    if (!user?.id) {
      setActivityScores(new Map());
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('user_activity')
      .select('product_id, activity_type, duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(200);

    if (data) {
      const scores = new Map<string, number>();
      const weights = { 'PURCHASE': 10, 'ADD_TO_CART': 5, 'CLICK': 3, 'VIEW': 1 };

      data.forEach(activity => {
        const currentScore = scores.get(activity.product_id) || 0;
        const weight = weights[activity.activity_type as keyof typeof weights] || 1;
        
        let timeBonus = 0;
        if (activity.duration_seconds && activity.activity_type === 'VIEW') {
          if (activity.duration_seconds >= 60) timeBonus = 8;
          else if (activity.duration_seconds >= 30) timeBonus = 5;
          else if (activity.duration_seconds >= 10) timeBonus = 2;
        }
        
        scores.set(activity.product_id, currentScore + weight + timeBonus);
      });

      setActivityScores(scores);
    }
  }, [user?.id]);

  // Fetch AI recommendations (non-blocking, silent fail)
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
          scores.set(rec.product_id, (rec.score || 0.5) * 100 + (data.recommendations.length - index));
        });
        setAiScores(scores);
      }
    } catch {
      // Silent fail - AI is invisible
    }
  }, [user?.id]);

  // Load data - products first (fast), then personalization in background
  useEffect(() => {
    const loadData = async () => {
      if (productCache.data && !refreshKey) {
        setAllProducts(productCache.data);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      
      // Force refresh when language changes
      await fetchProducts(refreshKey > 0 || true);
      setIsLoading(false);
      
      // Personalization in background - non-blocking
      if (user?.id) {
        Promise.allSettled([fetchActivityScores(), fetchAIRecommendations()]);
      }
    };

    // Invalidate cache when language changes
    productCache.timestamp = 0;
    loadData();
  }, [user?.id, refreshKey, i18n.language, fetchProducts, fetchActivityScores, fetchAIRecommendations]);

  // Smart product ordering algorithm
  const smartProducts = useMemo(() => {
    if (allProducts.length === 0) return [];

    if (!user?.id) {
      return [...allProducts].sort(() => Math.random() - 0.5);
    }

    const scoredProducts = allProducts.map(product => {
      const aiScore = aiScores.get(product.id) || 0;
      const activityScore = activityScores.get(product.id) || 0;
      const combinedScore = (aiScore * 0.6) + (activityScore * 0.4) + (Math.random() * 5);
      return { product, score: combinedScore };
    });

    scoredProducts.sort((a, b) => b.score - a.score);

    // Discovery injection every 5th position
    const result: Product[] = [];
    const highScore = scoredProducts.filter(p => p.score > 5);
    const lowScore = scoredProducts.filter(p => p.score <= 5);
    let hi = 0, lo = 0;

    for (let i = 0; i < scoredProducts.length; i++) {
      if (i > 0 && i % 5 === 0 && lo < lowScore.length) {
        result.push(lowScore[lo++].product);
      } else if (hi < highScore.length) {
        result.push(highScore[hi++].product);
      } else if (lo < lowScore.length) {
        result.push(lowScore[lo++].product);
      }
    }

    while (hi < highScore.length) result.push(highScore[hi++].product);
    while (lo < lowScore.length) result.push(lowScore[lo++].product);

    return result;
  }, [allProducts, aiScores, activityScores, user?.id]);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return { products: smartProducts, isLoading, refresh };
};
