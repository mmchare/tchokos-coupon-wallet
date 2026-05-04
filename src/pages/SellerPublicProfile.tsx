import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Store, Star, Package, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MasonryProductCard from '@/components/MasonryProductCard';

const SellerPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: sp } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('id', id)
      .eq('verification_status', 'verified')
      .maybeSingle();

    if (!sp) { setLoading(false); return; }
    setSeller(sp);

    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', id)
      .order('created_at', { ascending: false });
    setProducts(prods || []);
    setLoading(false);
  };

  const startChat = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!seller || seller.user_id === user.id) return;
    setStartingChat(true);

    // Find or create conversation (no product context here)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('seller_id', seller.user_id)
      .is('product_id', null)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ buyer_id: user.id, seller_id: seller.user_id })
        .select('id')
        .single();
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        setStartingChat(false);
        return;
      }
      convId = created.id;
    }
    navigate(`/messages?c=${convId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="font-semibold mb-1">Vendeur introuvable</h2>
        <p className="text-sm text-muted-foreground mb-4">Ce profil n'existe pas ou n'est pas encore vérifié.</p>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const isOwner = user?.id === seller.user_id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold truncate">{seller.shop_name || 'Boutique'}</h1>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
            {(seller.shop_name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold truncate">{seller.shop_name || 'Boutique JinBao'}</h2>
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
            </div>
            {seller.shop_description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{seller.shop_description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{Number(seller.rating || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span>{seller.total_sales || 0} ventes</span>
              </div>
            </div>
          </div>
        </div>

        {!isOwner && (
          <Button onClick={startChat} disabled={startingChat} className="w-full mt-4 gap-2">
            {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Contacter le vendeur
          </Button>
        )}
      </div>

      {/* Catalog */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold">Catalogue ({products.length})</h3>
        </div>
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucun produit pour le moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <MasonryProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPublicProfile;
