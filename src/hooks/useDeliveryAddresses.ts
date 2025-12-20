import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryAddress {
  id: string;
  label: string;
  city: string;
  address: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

interface NewAddress {
  label: string;
  city: string;
  address: string;
  phone: string;
  is_default?: boolean;
}

export const useDeliveryAddresses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
    } else {
      setAddresses(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Get default address
  const getDefaultAddress = useCallback(() => {
    return addresses.find(a => a.is_default) || addresses[0] || null;
  }, [addresses]);

  // Add new address
  const addAddress = useCallback(async (newAddress: NewAddress) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder des adresses",
        variant: "destructive"
      });
      return null;
    }

    // If this is the first address or marked as default, make it default
    const isFirstAddress = addresses.length === 0;
    const shouldBeDefault = isFirstAddress || newAddress.is_default;

    // If setting as default, unset other defaults
    if (shouldBeDefault) {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('delivery_addresses')
      .insert({
        user_id: user.id,
        label: newAddress.label,
        city: newAddress.city,
        address: newAddress.address,
        phone: newAddress.phone,
        is_default: shouldBeDefault
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding address:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'adresse",
        variant: "destructive"
      });
      return null;
    }

    await fetchAddresses();
    toast({
      title: "Adresse ajoutée",
      description: `"${newAddress.label}" a été sauvegardée`
    });
    return data;
  }, [user, addresses.length, fetchAddresses, toast]);

  // Update address
  const updateAddress = useCallback(async (id: string, updates: Partial<NewAddress>) => {
    if (!user) return false;

    // If setting as default, unset other defaults
    if (updates.is_default) {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { error } = await supabase
      .from('delivery_addresses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating address:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'adresse",
        variant: "destructive"
      });
      return false;
    }

    await fetchAddresses();
    toast({
      title: "Adresse mise à jour"
    });
    return true;
  }, [user, fetchAddresses, toast]);

  // Delete address
  const deleteAddress = useCallback(async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('delivery_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'adresse",
        variant: "destructive"
      });
      return false;
    }

    await fetchAddresses();
    toast({
      title: "Adresse supprimée"
    });
    return true;
  }, [user, fetchAddresses, toast]);

  // Set as default
  const setDefault = useCallback(async (id: string) => {
    return updateAddress(id, { is_default: true });
  }, [updateAddress]);

  return {
    addresses,
    isLoading,
    getDefaultAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    refetch: fetchAddresses
  };
};
