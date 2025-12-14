/**
 * Hook for tracking user activity for recommendation engine
 * Sends non-blocking requests to record user behavior
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'VIEW' | 'CLICK' | 'ADD_TO_CART' | 'PURCHASE';

export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackActivity = useCallback(async (productId: string, activityType: ActivityType) => {
    // Only track if user is logged in
    if (!user?.id) return;

    try {
      // Non-blocking insert - fire and forget
      supabase
        .from('user_activity')
        .insert({
          user_id: user.id,
          product_id: productId,
          activity_type: activityType
        })
        .then(({ error }) => {
          if (error) {
            console.error('Activity tracking error:', error);
          }
        });
    } catch (error) {
      // Silent fail - tracking should never block UX
      console.error('Activity tracking failed:', error);
    }
  }, [user?.id]);

  const trackClick = useCallback((productId: string) => {
    trackActivity(productId, 'CLICK');
  }, [trackActivity]);

  const trackView = useCallback((productId: string) => {
    trackActivity(productId, 'VIEW');
  }, [trackActivity]);

  const trackAddToCart = useCallback((productId: string) => {
    trackActivity(productId, 'ADD_TO_CART');
  }, [trackActivity]);

  const trackPurchase = useCallback((productId: string) => {
    trackActivity(productId, 'PURCHASE');
  }, [trackActivity]);

  return {
    trackActivity,
    trackClick,
    trackView,
    trackAddToCart,
    trackPurchase
  };
};
