import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PriceAlert {
  id: string;
  product_id: string;
  target_price: number | null;
  initial_price: number;
  is_active: boolean;
  created_at: string;
  notified_at: string | null;
}

export function usePriceAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching price alerts:', error);
    } else {
      setAlerts(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const hasAlert = useCallback((productId: string) => {
    return alerts.some(a => a.product_id === productId && a.is_active);
  }, [alerts]);

  const toggleAlert = useCallback(async (productId: string, currentPrice: number, targetPrice?: number) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour activer les alertes de prix",
        variant: "destructive"
      });
      return;
    }

    const existingAlert = alerts.find(a => a.product_id === productId);

    if (existingAlert) {
      // Toggle off - delete the alert
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', existingAlert.id);

      if (error) {
        console.error('Error deleting price alert:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'alerte",
          variant: "destructive"
        });
      } else {
        setAlerts(prev => prev.filter(a => a.id !== existingAlert.id));
        toast({
          title: "Alerte désactivée",
          description: "Vous ne recevrez plus d'alertes pour ce produit"
        });
      }
    } else {
      // Create new alert
      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          product_id: productId,
          initial_price: currentPrice,
          target_price: targetPrice || null,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating price alert:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer l'alerte",
          variant: "destructive"
        });
      } else if (data) {
        setAlerts(prev => [...prev, data]);
        toast({
          title: "Alerte activée !",
          description: "Vous serez notifié si le prix baisse"
        });
      }
    }
  }, [user, alerts, toast]);

  return {
    alerts,
    isLoading,
    hasAlert,
    toggleAlert,
    refetch: fetchAlerts
  };
}
