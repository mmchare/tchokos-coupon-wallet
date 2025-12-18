-- Allow admins to update wallet transactions (for manual reconciliation)
CREATE POLICY "Admins can update wallet transactions"
ON public.wallet_transactions
FOR UPDATE
USING (is_admin());

-- Allow admins to update profiles (to credit wallet balances during reconciliation)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (is_admin());
