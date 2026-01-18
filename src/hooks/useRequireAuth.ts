import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Hook to require authentication for specific actions
 * Returns a function that checks auth and redirects if needed
 * 
 * Usage:
 * const requireAuth = useRequireAuth();
 * const handleAction = () => {
 *   if (!requireAuth()) return;
 *   // ... do authenticated action
 * };
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const requireAuth = useCallback((message?: string) => {
    if (!user) {
      // Store the current path to redirect back after login
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterAuth', currentPath);
      
      toast({
        title: "Connexion requise",
        description: message || "Connectez-vous pour continuer",
        variant: "default"
      });
      
      navigate('/auth');
      return false;
    }
    return true;
  }, [user, navigate, toast]);

  return requireAuth;
}
