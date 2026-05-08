
-- 1. seller_reviews
CREATE TABLE public.seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  reviewer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);
CREATE INDEX idx_seller_reviews_seller ON public.seller_reviews(seller_id);

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seller reviews"
  ON public.seller_reviews FOR SELECT USING (true);

CREATE POLICY "Buyers can post review for delivered own orders"
  ON public.seller_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.products p ON p.id = o.product_id
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
        AND p.seller_id = seller_reviews.seller_id
        AND (o.logistics_step >= 4 OR o.status IN ('delivered','completed'))
    )
  );

CREATE POLICY "Reviewers can update their own review"
  ON public.seller_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers or admins can delete"
  ON public.seller_reviews FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id OR is_admin());

-- 2. recalc rating
CREATE OR REPLACE FUNCTION public.recalc_seller_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller UUID;
BEGIN
  v_seller := COALESCE(NEW.seller_id, OLD.seller_id);
  UPDATE public.seller_profiles
    SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.seller_reviews WHERE seller_id = v_seller), 0)
  WHERE id = v_seller;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_seller_rating
AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
FOR EACH ROW EXECUTE FUNCTION public.recalc_seller_rating();

-- 3. notify seller of new review
CREATE OR REPLACE FUNCTION public.notify_seller_new_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID;
BEGIN
  SELECT user_id INTO v_user FROM public.seller_profiles WHERE id = NEW.seller_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, message_type, message_body)
    VALUES (v_user, 'NOUVEL_AVIS', 'Vous avez reçu un nouvel avis ' || NEW.rating || '★');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_seller_new_review
AFTER INSERT ON public.seller_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_seller_new_review();

-- Allow review notifications insert
CREATE POLICY "System can insert review notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (message_type IN ('NOUVEL_AVIS','SIGNALEMENT'));

-- 4. increment total_sales when order delivered
CREATE OR REPLACE FUNCTION public.increment_seller_sales()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller UUID;
BEGIN
  IF NEW.logistics_step >= 4 AND (OLD.logistics_step IS NULL OR OLD.logistics_step < 4) THEN
    SELECT seller_id INTO v_seller FROM public.products WHERE id = NEW.product_id;
    IF v_seller IS NOT NULL THEN
      UPDATE public.seller_profiles SET total_sales = total_sales + 1 WHERE id = v_seller;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_seller_sales
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_seller_sales();

-- 5. suspension flag
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- 6. reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('product','seller')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR is_admin());

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE USING (is_admin());

-- 7. auto-suspend sellers after 5 pending reports
CREATE OR REPLACE FUNCTION public.check_auto_suspend_seller()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller_profile_id UUID; v_count INTEGER;
BEGIN
  IF NEW.target_type = 'seller' THEN
    v_seller_profile_id := NEW.target_id;
  ELSIF NEW.target_type = 'product' THEN
    SELECT seller_id INTO v_seller_profile_id FROM public.products WHERE id = NEW.target_id;
  END IF;

  IF v_seller_profile_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count FROM public.reports r
  WHERE r.status = 'pending'
    AND ((r.target_type = 'seller' AND r.target_id = v_seller_profile_id)
      OR (r.target_type = 'product' AND r.target_id IN (SELECT id FROM public.products WHERE seller_id = v_seller_profile_id)));

  IF v_count >= 5 THEN
    UPDATE public.seller_profiles SET is_suspended = true WHERE id = v_seller_profile_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_suspend_seller
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.check_auto_suspend_seller();
