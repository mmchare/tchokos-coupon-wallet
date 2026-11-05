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
import { SellerReviewsSection } from '@/components/SellerReviewsSection';
import { ReportDialog } from '@/components/ReportDialog';
import { TrustScoreBadge, SellerAvatar } from '@/components/TrustScoreBadge';
import { SellerLevelBadge, SellerBadgesRow } from '@/components/SellerGamification';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { computeTrustScore, sellerToTrustInput } from '@/lib/trustScore';

const SellerPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(0);

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

    const [{ data: prods }, { count }] = await Promise.all([
      supabase.from('products').select('*').eq('seller_id', id).order('created_at', { ascending: false }),
      supabase.from('seller_reviews').select('id', { count: 'exact', head: true }).eq('seller_id', id),
    ]);
    setProducts(prods || []);
    setReviewsCount(count || 0);
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
  const trust = computeTrustScore(sellerToTrustInput(seller, reviewsCount));
  const joinedDays = Math.max(0, Math.floor((Date.now() - new Date(seller.created_at).getTime()) / 86400000));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold truncate flex-1">{seller.shop_name || 'Boutique'}</h1>
        {!isOwner && <ReportDialog targetType="seller" targetId={seller.id} />}
      </header>

      {/* Couverture + profil (style Xianyu) */}
      <div className="relative h-40 md:h-64 bg-gradient-to-br from-primary/30 via-accent/20 to-background">
        {seller.cover_url && <img src={seller.cover_url} alt="Couverture" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
      </div>
      <div className="px-4 md:px-8 max-w-5xl mx-auto -mt-12 relative">
        <div className="flex items-end gap-4">
          <SellerAvatar url={seller.avatar_url} name={seller.shop_name} className="w-24 h-24 text-4xl border-4 border-background shadow-lg flex-shrink-0" />
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold truncate">{seller.shop_name || 'Boutique JinBao'}</h2>
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              {Number(seller.rating || 0) >= 4.5 && (seller.total_sales || 0) >= 10 && (
                <Badge variant="secondary">⭐ Top Vendeur</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1 items-center"><SellerLevelBadge totalSales={seller.total_sales || 0} /><TrustScoreBadge score={trust} /></div>
          </div>
        </div>
        {seller.shop_description && <p className="text-sm text-muted-foreground mt-3">{seller.shop_description}</p>}

        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          {[
            { v: products.length, l: 'En vente' },
            { v: seller.total_sales || 0, l: 'Vendus' },
            { v: reviewsCount > 0 ? `${Math.round((Number(seller.rating || 0) / 5) * 100)}%` : '—', l: 'Satisfaction' },
            { v: joinedDays < 30 ? `${joinedDays} j` : `${Math.floor(joinedDays / 30)} mois`, l: 'Sur JinBao' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-muted/50 py-2">
              <div className="font-bold">{s.v}</div>
              <div className="text-[11px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-4"><SellerBadgesRow seller={seller} productsCount={products.length} reviewsCount={reviewsCount} showLocked={false} /></div>

        {!isOwner ? (
          <Button onClick={startChat} disabled={startingChat} className="w-full mt-4 gap-2">
            {startingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Contacter le vendeur
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate('/seller')} className="w-full mt-4">Modifier ma photo et ma couverture</Button>
        )}
      </div>


      <Tabs defaultValue="selling" className="px-3 mt-4 max-w-5xl mx-auto">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="selling">En vente ({products.length})</TabsTrigger>
          <TabsTrigger value="reviews">Avis ({reviewsCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="selling" className="mt-3">
          {products.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun produit pour le moment</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((p) => (
                <MasonryProductCard key={p.id} id={p.id} image={p.images?.[0] || ''} name={p.name}
                  price={Number(p.price)} originalPrice={p.original_price ? Number(p.original_price) : undefined}
                  rating={0} isAuction={p.is_auction} isVerified={p.is_verified} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="mt-3"><SellerReviewsSection sellerId={seller.id} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerPublicProfile;
