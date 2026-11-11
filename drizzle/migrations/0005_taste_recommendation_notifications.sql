ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.notify_matching_tastes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.category IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, message_type, message_body, product_id)
  SELECT t.user_id, 'RECOMMANDATION',
         'Ça pourrait te plaire : ' || left(NEW.name, 80), NEW.id
  FROM (
    SELECT ua.user_id, p.category,
           sum(CASE ua.activity_type WHEN 'PURCHASE' THEN 10 WHEN 'ADD_TO_CART' THEN 5 WHEN 'CLICK' THEN 3 ELSE 1 END
               + coalesce(least(ua.duration_seconds, 120), 0) / 15.0) AS score,
           row_number() OVER (PARTITION BY ua.user_id ORDER BY sum(CASE ua.activity_type WHEN 'PURCHASE' THEN 10 WHEN 'ADD_TO_CART' THEN 5 WHEN 'CLICK' THEN 3 ELSE 1 END + coalesce(least(ua.duration_seconds, 120), 0) / 15.0) DESC) AS rk
    FROM public.user_activity ua JOIN public.products p ON p.id = ua.product_id
    WHERE ua.created_at > now() - interval '14 days'
    GROUP BY ua.user_id, p.category
  ) t
  WHERE t.rk = 1 AND t.category = NEW.category AND t.score >= 8
    AND t.user_id IS DISTINCT FROM NEW.seller_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = t.user_id AND n.message_type = 'RECOMMANDATION'
        AND n.created_at > now() - interval '1 day');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.notify_matching_tastes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_matching_tastes ON public.products;
CREATE TRIGGER trg_notify_matching_tastes AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_matching_tastes();