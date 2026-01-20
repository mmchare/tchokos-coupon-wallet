import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  icon: string;
  bg_color: string;
  icon_color: string;
}

// Available icons for categories (Lucide icon names)
export const AVAILABLE_ICONS = [
  { name: 'Package', label: 'Général' },
  { name: 'Smartphone', label: 'Téléphone' },
  { name: 'Laptop', label: 'Ordinateur' },
  { name: 'Tablet', label: 'Tablette' },
  { name: 'Tv', label: 'TV' },
  { name: 'Headphones', label: 'Audio' },
  { name: 'Camera', label: 'Photo' },
  { name: 'Gamepad2', label: 'Gaming' },
  { name: 'Watch', label: 'Montre' },
  { name: 'Gem', label: 'Bijoux' },
  { name: 'Shirt', label: 'Vêtements' },
  { name: 'Briefcase', label: 'Sac' },
  { name: 'Home', label: 'Maison' },
  { name: 'Sparkles', label: 'Beauté' },
  { name: 'Dumbbell', label: 'Sport' },
  { name: 'Baby', label: 'Enfants' },
  { name: 'Car', label: 'Auto' },
  { name: 'Bike', label: 'Vélo' },
  { name: 'Wrench', label: 'Outils' },
  { name: 'Book', label: 'Livres' },
  { name: 'Music', label: 'Musique' },
  { name: 'Utensils', label: 'Cuisine' },
  { name: 'Flower2', label: 'Jardin' },
  { name: 'Dog', label: 'Animaux' },
  { name: 'Plane', label: 'Voyage' },
  { name: 'Gift', label: 'Cadeaux' },
  { name: 'Gavel', label: 'Enchères' },
];

// Available color schemes for categories
export const AVAILABLE_COLORS = [
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', icon: 'text-pink-600 dark:text-pink-400' },
  { name: 'rose', bg: 'bg-rose-100 dark:bg-rose-900/30', icon: 'text-rose-600 dark:text-rose-400' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', icon: 'text-red-600 dark:text-red-400' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: 'text-orange-600 dark:text-orange-400' },
  { name: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: 'text-yellow-600 dark:text-yellow-400' },
  { name: 'lime', bg: 'bg-lime-100 dark:bg-lime-900/30', icon: 'text-lime-600 dark:text-lime-400' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
  { name: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/30', icon: 'text-teal-600 dark:text-teal-400' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: 'text-cyan-600 dark:text-cyan-400' },
  { name: 'sky', bg: 'bg-sky-100 dark:bg-sky-900/30', icon: 'text-sky-600 dark:text-sky-400' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400' },
  { name: 'indigo', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-600 dark:text-indigo-400' },
  { name: 'violet', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-600 dark:text-violet-400' },
  { name: 'fuchsia', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', icon: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { name: 'slate', bg: 'bg-slate-100 dark:bg-slate-900/30', icon: 'text-slate-600 dark:text-slate-400' },
];

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};
