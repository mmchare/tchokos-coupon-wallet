-- Allow users to update their own activity (for duration tracking)
CREATE POLICY "Users can update their own activity"
ON public.user_activity
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);