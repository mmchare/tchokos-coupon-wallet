/**
 * Hook for fetching AI-powered personalized product recommendations
 * Uses Lovable AI for contextual suggestions based on user behavior
 */

import { useState, useEffect, useCallback } from 'react';
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

interface AIRecommendation {
  product_id: string;
  reason: string;
  score: number;
  type: 'similar' | 'crosssell' | 'trending';
}

interface AIRecommendationsResult {
  aiRecommendedProducts: (Product & { aiReason?: string; aiType?: string })[];
  personalizationMessage: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAIRecommendations = (): AIRecommendationsResult => {
  const { user } = useAuth();
  const [aiRecommendedProducts, setAiRecommendedProducts] = useState<(Product & { aiReason?: string; aiType?: string })[]>([]);
  const [personalizationMessage, setPersonalizationMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIRecommendations = useCallback(async () => {
    if (!user?.id) {
      setAiRecommendedProducts([]);
      setPersonalizationMessage('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the AI recommendations edge function
      const { data, error: fnError } = await supabase.functions.invoke('ai-recommendations', {
        body: { user_id: user.id }
      });

      if (fnError) {
        console.error('AI recommendations error:', fnError);
        setError(fnError.message);
        return;
      }

      if (!data?.recommendations || data.recommendations.length === 0) {
        setAiRecommendedProducts([]);
        setPersonalizationMessage(data?.personalization_message || '');
        return;
      }

      // Fetch full product details for recommended products
      const productIds = data.recommendations.map((r: AIRecommendation) => r.product_id);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching recommended products:', productsError);
        setError('Erreur lors du chargement des produits');
        return;
      }

      // Create a map for quick lookup of AI data
      const aiDataMap = new Map(
        data.recommendations.map((r: AIRecommendation) => [r.product_id, r])
      );

      // Transform and order products based on AI scores
      const recommendedProducts: (Product & { aiReason?: string; aiType?: string })[] = [];
      
      for (const rec of data.recommendations) {
        const product = products?.find(p => p.id === rec.product_id);
        if (product) {
          recommendedProducts.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            originalPrice: product.original_price ? Number(product.original_price) : undefined,
            category: product.category || 'Autres',
            rating: 4.5 + Math.random() * 0.5,
            image: product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg',
            isAuction: product.is_auction || false,
            aiReason: rec.reason,
            aiType: rec.type
          });
        }
      }

      setAiRecommendedProducts(recommendedProducts);
      setPersonalizationMessage(data.personalization_message || 'Recommandations personnalisées');

    } catch (err) {
      console.error('AI recommendations fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAIRecommendations();
  }, [fetchAIRecommendations]);

  return {
    aiRecommendedProducts,
    personalizationMessage,
    isLoading,
    error,
    refetch: fetchAIRecommendations
  };
};
