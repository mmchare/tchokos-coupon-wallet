/**
 * Hook for tracking user activity for recommendation engine
 * Sends non-blocking requests to record user behavior
 * Includes time-spent tracking for deeper interest signals
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'VIEW' | 'CLICK' | 'ADD_TO_CART' | 'PURCHASE';

export const useActivityTracking = () => {
  const { user } = useAuth();
  const viewTimers = useRef<Map<string, { activityId: string | null; startTime: number }>>(new Map());

  const trackActivity = useCallback(async (productId: string, activityType: ActivityType) => {
    if (!user?.id) return;

    try {
      supabase
        .from('user_activity')
        .insert({
          user_id: user.id,
          product_id: productId,
          activity_type: activityType
        })
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Activity tracking error:', error);
            return;
          }
          // Store activity ID for duration update on VIEW
          if (activityType === 'VIEW' && data?.id) {
            viewTimers.current.set(productId, { activityId: data.id, startTime: Date.now() });
          }
        });
    } catch (error) {
      console.error('Activity tracking failed:', error);
    }
  }, [user?.id]);

  const trackClick = useCallback((productId: string) => {
    trackActivity(productId, 'CLICK');
  }, [trackActivity]);

  const trackView = useCallback((productId: string) => {
    trackActivity(productId, 'VIEW');
  }, [trackActivity]);

  /** Call when user leaves product page to record time spent */
  const endView = useCallback((productId: string) => {
    if (!user?.id) return;

    const timer = viewTimers.current.get(productId);
    if (!timer?.activityId) return;

    const durationSeconds = Math.round((Date.now() - timer.startTime) / 1000);
    viewTimers.current.delete(productId);

    // Only record meaningful durations (>2s, <30min)
    if (durationSeconds < 2 || durationSeconds > 1800) return;

    supabase
      .from('user_activity')
      .update({ duration_seconds: durationSeconds })
      .eq('id', timer.activityId)
      .then(({ error }) => {
        if (error) console.error('Duration tracking error:', error);
      });
  }, [user?.id]);

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
    endView,
    trackAddToCart,
    trackPurchase
  };
};
