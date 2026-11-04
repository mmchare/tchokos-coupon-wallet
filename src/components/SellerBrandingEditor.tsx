import { useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SellerAvatar } from '@/components/TrustScoreBadge';

interface Props { seller: any; userId: string; onSaved: () => void }

export const SellerBrandingEditor = ({ seller, userId, onSaved }: Props) => {
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<string | null>(seller.avatar_url);
  const [cover, setCover] = useState<string | null>(seller.cover_url);
  const [desc, setDesc] = useState<string>(seller.shop_description || '');
  const [busy, setBusy] = useState<string | null>(null);

  const upload = async (file: File, kind: 'avatar' | 'cover') => {
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Image trop lourde (5 Mo max)', variant: 'destructive' }); return; }
    setBusy(kind);
    const ext = file.name.split('.').pop();
    const path = `seller-branding/${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-media').upload(path, file);
    setBusy(null);
    if (error) { toast({ title: 'Échec de l’envoi', description: error.message, variant: 'destructive' }); return; }
    const { data } = supabase.storage.from('product-media').getPublicUrl(path);
    kind === 'avatar' ? setAvatar(data.publicUrl) : setCover(data.publicUrl);
  };

  const save = async () => {
    setBusy('save');
    const { error } = await supabase.rpc('update_seller_branding', { p_avatar_url: avatar, p_cover_url: cover, p_shop_description: desc });
    setBusy(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Boutique mise à jour ✨' });
    onSaved();
  };

  return (
    <Card className="overflow-hidden">
      <label className="relative block h-36 md:h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-background cursor-pointer group">
        {cover && <img src={cover} alt="Couverture" className="absolute inset-0 w-full h-full object-cover" />}
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs font-medium">
          {busy === 'cover' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />} Changer la couverture
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'cover')} />
      </label>
      <div className="px-4 pb-4">
        <label className="relative -mt-10 inline-block cursor-pointer">
          <SellerAvatar url={avatar} name={seller.shop_name} className="w-20 h-20 text-3xl border-4 border-background" />
          <span className="absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground p-1.5">
            {busy === 'avatar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'avatar')} />
        </label>
        <p className="text-sm font-medium mt-3 mb-1">Présentation de la boutique</p>
        <Textarea value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder="Ce que vous vendez, depuis où, vos délais…" />
        <Button onClick={save} disabled={!!busy} className="w-full mt-3">
          {busy === 'save' && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Enregistrer
        </Button>
      </div>
    </Card>
  );
};
