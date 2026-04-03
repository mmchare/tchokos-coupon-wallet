
-- 1. Fix wallet_transactions: only admins/service_role should insert (prevent self-crediting)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.wallet_transactions;
CREATE POLICY "Only admins can insert wallet transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- 2. Fix profiles INSERT: restrict to authenticated
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Fix orders INSERT: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix favorites: restrict write policies to authenticated
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix referrals: restrict to authenticated
DROP POLICY IF EXISTS "Users can be referred" ON public.referrals;
CREATE POLICY "Users can be referred"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING ((auth.uid() = referrer_id) OR (auth.uid() = referred_id));

-- 6. Fix referral_codes: restrict to authenticated
DROP POLICY IF EXISTS "Users can insert their own referral code" ON public.referral_codes;
CREATE POLICY "Users can insert their own referral code"
ON public.referral_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own referral code" ON public.referral_codes;
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. Fix bids: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can create bids" ON public.bids;
CREATE POLICY "Authenticated users can create bids"
ON public.bids
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own bids" ON public.bids;
CREATE POLICY "Users can view their own bids"
ON public.bids
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR is_admin());

-- 8. Fix notifications: restrict to authenticated
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 9. Fix price_alerts: restrict to authenticated
DROP POLICY IF EXISTS "Users can create price alerts" ON public.price_alerts;
CREATE POLICY "Users can create price alerts"
ON public.price_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own price alerts" ON public.price_alerts;
CREATE POLICY "Users can delete their own price alerts"
ON public.price_alerts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own price alerts" ON public.price_alerts;
CREATE POLICY "Users can update their own price alerts"
ON public.price_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own price alerts" ON public.price_alerts;
CREATE POLICY "Users can view their own price alerts"
ON public.price_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 10. Fix search_history: restrict to authenticated
DROP POLICY IF EXISTS "Users can add search history" ON public.search_history;
CREATE POLICY "Users can add search history"
ON public.search_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own search history" ON public.search_history;
CREATE POLICY "Users can delete their own search history"
ON public.search_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 11. Fix delivery_addresses: restrict to authenticated
DROP POLICY IF EXISTS "Users can add addresses" ON public.delivery_addresses;
CREATE POLICY "Users can add addresses"
ON public.delivery_addresses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can delete their own addresses"
ON public.delivery_addresses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can update their own addresses"
ON public.delivery_addresses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can view their own addresses"
ON public.delivery_addresses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 12. Fix jinbao_chat_history: restrict to authenticated
DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.jinbao_chat_history;
CREATE POLICY "Users can delete their own chat history"
ON public.jinbao_chat_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.jinbao_chat_history;
CREATE POLICY "Users can insert their own messages"
ON public.jinbao_chat_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own chat history" ON public.jinbao_chat_history;
CREATE POLICY "Users can view their own chat history"
ON public.jinbao_chat_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 13. Fix comment_likes: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can like" ON public.comment_likes;
CREATE POLICY "Authenticated users can like"
ON public.comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their likes" ON public.comment_likes;
CREATE POLICY "Users can remove their likes"
ON public.comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 14. Fix product_comments: restrict write to authenticated
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.product_comments;
CREATE POLICY "Authenticated users can create comments"
ON public.product_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.product_comments;
CREATE POLICY "Users can delete their own comments"
ON public.product_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.product_comments;
CREATE POLICY "Users can update their own comments"
ON public.product_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 15. Fix shared_coupons: restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can create shared coupons" ON public.shared_coupons;
CREATE POLICY "Authenticated users can create shared coupons"
ON public.shared_coupons
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own shared coupons" ON public.shared_coupons;
CREATE POLICY "Users can delete their own shared coupons"
ON public.shared_coupons
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- 16. Fix push_subscriptions: restrict to authenticated
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 17. Fix user_activity: restrict to authenticated
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.user_activity;
CREATE POLICY "Users can insert their own activity"
ON public.user_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own activity" ON public.user_activity;
CREATE POLICY "Users can update their own activity"
ON public.user_activity
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity;
CREATE POLICY "Users can view their own activity"
ON public.user_activity
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 18. Fix reviews: restrict write to authenticated
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 19. Fix custom_orders: restrict to authenticated
DROP POLICY IF EXISTS "Users can update their own pending orders" ON public.custom_orders;
CREATE POLICY "Users can update their own pending orders"
ON public.custom_orders
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND (status = 'pending'::text));

DROP POLICY IF EXISTS "Users can view their own custom orders" ON public.custom_orders;
CREATE POLICY "Users can view their own custom orders"
ON public.custom_orders
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR is_admin());

-- 20. Fix quick_sale_listings: restrict write to authenticated
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.quick_sale_listings;
CREATE POLICY "Users can delete their own listings"
ON public.quick_sale_listings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.quick_sale_listings;
CREATE POLICY "Users can update their own listings"
ON public.quick_sale_listings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
