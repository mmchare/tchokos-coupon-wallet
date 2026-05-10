import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Package, DollarSign, TrendingUp, Loader2, Store, Clock, CheckCircle2, Eye, Trash2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatBalance } from '@/lib/formatBalance';
import { SellerStats } from '@/components/SellerStats';
import { WithdrawalsPanel } from '@/components/WithdrawalsPanel';
import SellerPromoCodesPanel from '@/components/SellerPromoCodesPanel';
import SponsorProductButton from '@/components/SponsorProductButton';
import SellerSubscriptionPanel from '@/components/SellerSubscriptionPanel';
import { Crown } from 'lucide-react';

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [escrows, setEscrows] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    source_link: '',
    images: [] as string[],
    category: '',
    stock_available: '1'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) loadData();
  }, [user, loading]);

  const loadData = async () => {
    // Fetch seller profile
    const { data: sp } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (!sp || sp.verification_status !== 'verified') {
      navigate('/become-seller');
      return;
    }
    setSellerProfile(sp);

    // Fetch wallet, products, escrows in parallel
    const [walletRes, productsRes, escrowRes] = await Promise.all([
      supabase.from('seller_wallets').select('*').eq('seller_id', sp.id).single(),
      supabase.from('products').select('*').eq('seller_id', sp.id).order('created_at', { ascending: false }),
      supabase.from('seller_escrow').select('*, orders(product_name, status, logistics_step)').eq('seller_id', sp.id).order('created_at', { ascending: false })
    ]);

    setWallet(walletRes.data);
    setProducts(productsRes.data || []);
    setEscrows(escrowRes.data || []);
    setLoadingData(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 5)) {
      const ext = file.name.split('.').pop();
      const path = `seller-products/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
    }
    setNewProduct(prev => ({ ...prev, images: [...prev.images, ...uploaded] }));
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({ title: 'Champs requis', description: 'Nom et prix sont obligatoires', variant: 'destructive' });
      return;
    }
    setAddingProduct(true);
    try {
      const { error } = await supabase.from('products').insert({
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        source_link: newProduct.source_link || null,
        images: newProduct.images.length > 0 ? newProduct.images : null,
        category: newProduct.category || null,
        stock_available: parseInt(newProduct.stock_available) || 1,
        seller_id: sellerProfile.id,
        is_verified: false
      });
      if (error) throw error;
      toast({ title: 'Produit ajouté ! 🎉' });
      setShowAddProduct(false);
      setNewProduct({ name: '', description: '', price: '', source_link: '', images: [], category: '', stock_available: '1' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast({ title: 'Produit supprimé' });
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            {sellerProfile?.shop_name || 'Ma Boutique'}
          </h1>
        </div>
        <Badge variant="outline" className="border-green-500 text-green-500 text-xs">Vérifié</Badge>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <Card className="border-primary/20">
          <CardContent className="p-3 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="font-bold text-sm">{formatBalance(wallet?.available_balance || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="font-bold text-sm">{formatBalance(wallet?.pending_balance || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total gagné</p>
            <p className="font-bold text-sm">{formatBalance(wallet?.total_earned || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="px-4">
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="promos">Promos</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="wallet">Retrait</TabsTrigger>
          <TabsTrigger value="escrow">Séquestre</TabsTrigger>
          <TabsTrigger value="premium" className="data-[state=active]:bg-jinbao-gold data-[state=active]:text-black">
            <Crown className="w-3 h-3 mr-1" />Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3 mt-3">
          <Button onClick={() => setShowAddProduct(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
          </Button>

          {products.map(product => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-3 flex gap-3">
                {product.images?.[0] && (
                  <img src={product.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    {product.sponsored_until && new Date(product.sponsored_until) > new Date() && (
                      <Badge className="text-[9px] bg-jinbao-gold text-black px-1.5 py-0">★ Sponso</Badge>
                    )}
                  </div>
                  <p className="text-primary font-bold text-sm">{formatBalance(product.price)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {product.is_verified ? (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-500">Vérifié</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">En révision</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">Stock: {product.stock_available}</span>
                  </div>
                  <div className="mt-2">
                    <SponsorProductButton
                      productId={product.id}
                      sponsoredUntil={product.sponsored_until}
                      onUpdated={loadData}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/product/${product.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun produit pour le moment</p>
              <p className="text-sm">Ajoutez votre premier article !</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="promos" className="mt-3">
          {sellerProfile && <SellerPromoCodesPanel sellerProfileId={sellerProfile.id} />}
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          {sellerProfile && <SellerStats sellerId={sellerProfile.id} />}
        </TabsContent>

        <TabsContent value="wallet" className="mt-3">
          {sellerProfile && (
            <WithdrawalsPanel
              sellerId={sellerProfile.id}
              availableBalance={Number(wallet?.available_balance || 0)}
              onSuccess={loadData}
            />
          )}
        </TabsContent>

        <TabsContent value="escrow" className="space-y-3 mt-3">
          {escrows.map(escrow => (
            <Card key={escrow.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{(escrow.orders as any)?.product_name || 'Commande'}</p>
                    <p className="text-xs text-muted-foreground">Étape {(escrow.orders as any)?.logistics_step || '?'}/6</p>
                  </div>
                  <Badge variant={escrow.status === 'released' ? 'default' : 'outline'}
                    className={escrow.status === 'released' ? 'bg-green-500' : escrow.status === 'held' ? 'border-yellow-500 text-yellow-500' : 'border-destructive text-destructive'}>
                    {escrow.status === 'held' ? 'Bloqué' : escrow.status === 'released' ? 'Débloqué' : 'Remboursé'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant brut</span>
                  <span>{formatBalance(escrow.gross_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission (20%)</span>
                  <span className="text-destructive">-{formatBalance(escrow.commission_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Net vendeur</span>
                  <span className="text-green-500">{formatBalance(escrow.net_amount)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {escrows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune transaction pour le moment</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Lien source (Xianyu, Taobao...)</label>
              <Input
                placeholder="https://..."
                value={newProduct.source_link}
                onChange={e => setNewProduct(prev => ({ ...prev, source_link: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Collez le lien pour auto-remplir (optionnel)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Nom du produit *</label>
              <Input
                placeholder="Ex: iPhone 14 Pro Max 256GB"
                value={newProduct.name}
                onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Décrivez le produit..."
                value={newProduct.description}
                onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prix (FCFA) *</label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={newProduct.price}
                  onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stock</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={newProduct.stock_available}
                  onChange={e => setNewProduct(prev => ({ ...prev, stock_available: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Photos (max 5)</label>
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors mt-1">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ajouter des photos</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
              </label>
              {newProduct.images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {newProduct.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
            <Button className="w-full" onClick={handleAddProduct} disabled={addingProduct}>
              {addingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Publier le produit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;
