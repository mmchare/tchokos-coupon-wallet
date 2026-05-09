
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS current_step_started_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.orders SET current_step_started_at = COALESCE(updated_at, created_at) WHERE current_step_started_at = created_at;

CREATE OR REPLACE FUNCTION public.update_step_started_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logistics_step IS DISTINCT FROM OLD.logistics_step THEN
    NEW.current_step_started_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_step_started_at_trigger ON public.orders;
CREATE TRIGGER update_step_started_at_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_step_started_at();
