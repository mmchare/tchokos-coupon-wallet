-- Ajouter une politique pour permettre aux admins de supprimer les avis
CREATE POLICY "Admins can delete any review" 
ON public.reviews 
FOR DELETE 
USING (is_admin());

-- Ajouter une politique pour permettre aux admins de mettre à jour les avis (vérification)
CREATE POLICY "Admins can update any review" 
ON public.reviews 
FOR UPDATE 
USING (is_admin());