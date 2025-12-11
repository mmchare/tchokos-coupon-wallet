-- Create storage bucket for product media
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for product media bucket
CREATE POLICY "Anyone can view product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Admins can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media' AND is_admin());

CREATE POLICY "Admins can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND is_admin());

CREATE POLICY "Admins can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND is_admin());