
-- 1. Create order_status_history table
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_step INTEGER,
  new_step INTEGER,
  previous_status TEXT,
  new_status TEXT,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their own orders"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all history"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can insert history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Index for fast lookups
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- 2. Create order_tracking_shares table for shareable links
CREATE TABLE public.order_tracking_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tracking_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read by token (used in the public tracking page)
CREATE POLICY "Anyone can view tracking shares"
ON public.order_tracking_shares
FOR SELECT
USING (true);

-- Users can create shares for their own orders
CREATE POLICY "Users can create tracking shares"
ON public.order_tracking_shares
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tracking_shares.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.order_tracking_shares
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tracking_shares.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE INDEX idx_order_tracking_shares_token ON public.order_tracking_shares(share_token);

-- 3. Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.logistics_step IS DISTINCT FROM NEW.logistics_step 
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (
      order_id, previous_step, new_step, previous_status, new_status
    ) VALUES (
      NEW.id, OLD.logistics_step, NEW.logistics_step, OLD.status, NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_status_change_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

-- 4. Also log initial order creation
CREATE OR REPLACE FUNCTION public.log_order_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_status_history (
    order_id, new_step, new_status, notes
  ) VALUES (
    NEW.id, NEW.logistics_step, NEW.status, 'Commande créée'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_creation_trigger
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_creation();

-- 5. Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
