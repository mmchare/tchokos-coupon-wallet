import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  product_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
    } else {
      setFavorites(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Check if a product is in favorites
  const isFavorite = useCallback((productId: string) => {
    return favorites.some(f => f.product_id === productId);
  }, [favorites]);

  // Add to favorites
  const addFavorite = useCallback(async (productId: string) => {
    if (!user) {
      // Store current path for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterAuth', currentPath);
      
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour ajouter des favoris"
      });
      navigate('/auth');
      return false;
    }

    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, product_id: productId });

    if (error) {
      if (error.code === '23505') {
        // Already exists
        return true;
      }
      console.error('Error adding favorite:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter aux favoris",
        variant: "destructive"
      });
      return false;
    }

    await fetchFavorites();
    toast({
      title: "Ajouté aux favoris ❤️"
    });
    return true;
  }, [user, fetchFavorites, toast]);

  // Remove from favorites
  const removeFavorite = useCallback(async (productId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer des favoris",
        variant: "destructive"
      });
      return false;
    }

    await fetchFavorites();
    toast({
      title: "Retiré des favoris",
      description: "Le produit a été retiré de vos favoris"
    });
    return true;
  }, [user, fetchFavorites, toast]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string) => {
    if (isFavorite(productId)) {
      return removeFavorite(productId);
    } else {
      return addFavorite(productId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    isLoading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refetch: fetchFavorites
  };
};
