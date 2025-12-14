-- Créer la table user_activity pour le tracking comportemental
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('VIEW', 'CLICK', 'ADD_TO_CART', 'PURCHASE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes de recommandation performantes
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_product_id ON public.user_activity(product_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);

-- Activer RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent insérer leurs propres activités
CREATE POLICY "Users can insert their own activity"
ON public.user_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent voir leurs propres activités
CREATE POLICY "Users can view their own activity"
ON public.user_activity
FOR SELECT
USING (auth.uid() = user_id);

-- Politique: Les admins peuvent voir toutes les activités
CREATE POLICY "Admins can view all activity"
ON public.user_activity
FOR SELECT
USING (is_admin());

-- Activer realtime pour les analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;