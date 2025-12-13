import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signUp: (email: string, fullName: string, promoCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Check if user already exists by trying to get their profile
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', email) // This won't match, we need another approach
        .limit(1);
      
      // For now, always send magic link - Supabase handles new vs existing users
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false, // Don't auto-create, we handle that
        }
      });

      if (error) {
        // If error is "user not found", it's a new user
        if (error.message?.includes('Signups not allowed') || error.message?.includes('not allowed')) {
          return { error: null, isNewUser: true };
        }
        return { error };
      }

      return { error: null, isNewUser: false };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string, 
    fullName: string, 
    promoCode?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Sign up with magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
          data: {
            full_name: fullName,
            phone: '', // No phone required
          }
        }
      });

      if (error) return { error };

      // If there's a promo code, we'll handle the referral after the user confirms their email
      // Store it in localStorage for now
      if (promoCode) {
        localStorage.setItem('jinbao_pending_promo', promoCode);
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Handle pending promo code after user confirms email
  useEffect(() => {
    if (user && profile) {
      const pendingPromo = localStorage.getItem('jinbao_pending_promo');
      if (pendingPromo) {
        handlePromoCode(user.id, pendingPromo);
        localStorage.removeItem('jinbao_pending_promo');
      }
    }
  }, [user, profile]);

  const handlePromoCode = async (userId: string, promoCode: string) => {
    try {
      // Find the referrer by their code
      const { data: referralCodeData } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', promoCode.toUpperCase())
        .single();

      if (referralCodeData && referralCodeData.user_id !== userId) {
        // Check if referral already exists
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_id', userId)
          .maybeSingle();

        if (!existingReferral) {
          // Create referral relationship
          await supabase.from('referrals').insert({
            referrer_id: referralCodeData.user_id,
            referred_id: userId
          });

          // Add welcome bonus
          await supabase
            .from('profiles')
            .update({ wallet_balance: (profile?.wallet_balance || 0) + 1000 })
            .eq('id', userId);

          // Refresh profile to show new balance
          await refreshProfile();
        }
      }
    } catch (err) {
      console.error('Error handling promo code:', err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signInWithMagicLink,
      signUp,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};