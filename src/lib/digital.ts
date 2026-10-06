import { supabase } from '@/integrations/supabase/client';

// Loose client for tables added after types generation
export const db = supabase as any;

export interface DigitalProduct {
  id: string;
  platform: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  keywords: string[];
  duration_months: number;
  profile_type: 'partagé' | 'complet';
  price_fcfa: number;
  is_active: boolean;
}

export const formatFcfa = (n: number) => `${Math.round(Number(n)).toLocaleString('fr-FR')} FCFA`;
export const durationLabel = (m: number) => (m === 1 ? '1 mois' : m === 12 ? '1 an' : `${m} mois`);
export const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
