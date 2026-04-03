
-- Create trigger function to auto-set is_verified_client based on order history
CREATE OR REPLACE FUNCTION public.set_review_verified_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Override whatever the client sent; only set true if a confirmed order exists
  NEW.is_verified_client := EXISTS (
    SELECT 1 FROM public.orders
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
      AND status IN ('confirmed', 'delivered', 'completed')
  );
  RETURN NEW;
END;
$$;

-- Create trigger on reviews table
CREATE TRIGGER set_review_verified_client_trigger
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_review_verified_client();
