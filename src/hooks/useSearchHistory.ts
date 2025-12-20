import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchHistoryItem {
  id: string;
  query: string;
  created_at: string;
}

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch search history
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching search history:', error);
    } else {
      setHistory(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Add search to history (avoid duplicates)
  const addSearch = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.length < 2) return;

    const trimmedQuery = query.trim().toLowerCase();
    
    // Check if already exists
    const existingIndex = history.findIndex(h => h.query.toLowerCase() === trimmedQuery);
    if (existingIndex !== -1) {
      // Delete old entry first
      await supabase
        .from('search_history')
        .delete()
        .eq('id', history[existingIndex].id);
    }

    // Insert new entry
    const { error } = await supabase
      .from('search_history')
      .insert({ user_id: user.id, query: query.trim() });

    if (error) {
      console.error('Error adding search:', error);
      return;
    }

    await fetchHistory();
  }, [user, history, fetchHistory]);

  // Delete a specific search
  const deleteSearch = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting search:', error);
      return;
    }

    setHistory(prev => prev.filter(h => h.id !== id));
  }, [user]);

  // Clear all search history
  const clearHistory = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing search history:', error);
      return;
    }

    setHistory([]);
  }, [user]);

  return {
    history,
    isLoading,
    addSearch,
    deleteSearch,
    clearHistory,
    refetch: fetchHistory
  };
};
