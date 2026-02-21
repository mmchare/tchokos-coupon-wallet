
-- Create product_comments table with nested replies
CREATE TABLE public.product_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_name TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment_likes table for upvote system
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.product_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_comments
CREATE POLICY "Anyone can view comments" ON public.product_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.product_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.product_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.product_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment" ON public.product_comments
  FOR DELETE USING (is_admin());

-- RLS policies for comment_likes
CREATE POLICY "Anyone can view likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update likes_count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.product_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.product_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_comment_like_change
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- Trigger for updated_at
CREATE TRIGGER update_product_comments_updated_at
BEFORE UPDATE ON public.product_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX idx_product_comments_parent_id ON public.product_comments(parent_id);
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
