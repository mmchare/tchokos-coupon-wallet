ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wants_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS highlights text;
UPDATE public.products p SET wants_count = (SELECT count(*) FROM public.favorites f WHERE f.product_id = p.id);
CREATE OR REPLACE FUNCTION public.sync_product_wants_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET wants_count = wants_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET wants_count = GREATEST(wants_count - 1, 0) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_product_wants_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_product_wants_count ON public.favorites;
CREATE TRIGGER trg_product_wants_count AFTER INSERT OR DELETE ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.sync_product_wants_count();