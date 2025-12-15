/**
 * AI-powered search hook for intelligent product search
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category?: string;
  images?: string[];
  is_auction?: boolean;
}

interface AISearchResult {
  products: SearchProduct[];
  interpretation?: string;
  ai_used: boolean;
}

export const useAISearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchProduct[] | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');

  const search = useCallback(async (query: string): Promise<SearchProduct[]> => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      setInterpretation('');
      return [];
    }

    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke<AISearchResult>('ai-search', {
        body: { query }
      });

      if (error) {
        console.error('AI search error:', error);
        setSearchResults([]);
        return [];
      }

      const products = data?.products || [];
      setSearchResults(products);
      setInterpretation(data?.interpretation || '');
      
      return products;
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setInterpretation('');
  }, []);

  return {
    search,
    clearSearch,
    isSearching,
    searchResults,
    interpretation,
    hasResults: searchResults !== null
  };
};
