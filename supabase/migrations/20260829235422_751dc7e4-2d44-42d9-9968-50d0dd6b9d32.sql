ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS quote_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS quote_delay_days INTEGER,
  ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can update their own pending orders" ON public.custom_orders;
CREATE POLICY "Users can respond to their own custom orders"
ON public.custom_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('pending','quoted'))
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_admins_new_custom_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message_type, message_body)
  SELECT au.user_id, 'COMMANDE_SUR_MESURE',
         '📋 Nouvelle demande sur mesure : ' || NEW.product_name
  FROM public.admin_users au
  WHERE au.user_id IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_custom_order ON public.custom_orders;
CREATE TRIGGER trg_notify_admins_new_custom_order
AFTER INSERT ON public.custom_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_custom_order();

CREATE OR REPLACE FUNCTION public.notify_custom_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, message_type, message_body)
    VALUES (
      NEW.user_id,
      'COMMANDE_SUR_MESURE',
      CASE NEW.status
        WHEN 'quoted' THEN '💰 Devis reçu pour "' || NEW.product_name || '" : ' || COALESCE(NEW.quote_amount::text, '?') || ' FCFA'
        WHEN 'accepted' THEN '✅ Votre demande "' || NEW.product_name || '" est acceptée, sourcing en cours.'
        WHEN 'rejected' THEN '❌ Votre demande "' || NEW.product_name || '" a été refusée.'
        WHEN 'completed' THEN '🎉 Votre commande sur mesure "' || NEW.product_name || '" est finalisée.'
        ELSE 'Mise à jour de votre demande "' || NEW.product_name || '"'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_custom_order_update ON public.custom_orders;
CREATE TRIGGER trg_notify_custom_order_update
AFTER UPDATE ON public.custom_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_custom_order_update();

CREATE INDEX IF NOT EXISTS idx_custom_orders_user ON public.custom_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON public.custom_orders(status, created_at DESC);