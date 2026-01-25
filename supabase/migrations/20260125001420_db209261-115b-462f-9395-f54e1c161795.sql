-- Create table for JinBao chat history
CREATE TABLE public.jinbao_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jinbao_chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat history
CREATE POLICY "Users can view their own chat history"
ON public.jinbao_chat_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages"
ON public.jinbao_chat_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chat history
CREATE POLICY "Users can delete their own chat history"
ON public.jinbao_chat_history
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_jinbao_chat_user_created ON public.jinbao_chat_history(user_id, created_at DESC);