-- Add photos column to reviews table
ALTER TABLE public.reviews ADD COLUMN photos text[] DEFAULT '{}';

-- Create price_alerts table for price drop notifications
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price NUMERIC,
  initial_price NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_alerts
CREATE POLICY "Users can view their own price alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create price alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_product_id ON public.price_alerts(product_id);
CREATE INDEX idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = true;

-- Function to check price drops and create notifications
CREATE OR REPLACE FUNCTION public.check_price_drop_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If price decreased, notify subscribed users
  IF NEW.price < OLD.price THEN
    INSERT INTO public.notifications (user_id, message_type, message_body)
    SELECT 
      pa.user_id,
      'ALERTE_PRIX',
      'Le prix de "' || NEW.name || '" a baissé de ' || OLD.price || ' FCFA à ' || NEW.price || ' FCFA!'
    FROM public.price_alerts pa
    WHERE pa.product_id = NEW.id
      AND pa.is_active = true
      AND (pa.target_price IS NULL OR NEW.price <= pa.target_price);
    
    -- Update notified_at for alerts that were triggered
    UPDATE public.price_alerts
    SET notified_at = now()
    WHERE product_id = NEW.id
      AND is_active = true
      AND (target_price IS NULL OR NEW.price <= target_price);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check price drops on product update
CREATE TRIGGER trigger_check_price_drop
  AFTER UPDATE OF price ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_price_drop_alerts();